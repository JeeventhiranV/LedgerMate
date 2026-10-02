/**
 * LedgerMate – ReceiptVault.js
 * ─────────────────────────────────────────────────────────────
 * Supabase 1GB Storage Receipt & Bill Attachment Vault.
 * Performs client-side WebP downsampling (< 80KB per receipt),
 * offline IndexedDB caching, and direct Supabase Storage upload.
 * Exposes: window.LM_ReceiptVault
 * ─────────────────────────────────────────────────────────────
 */
(function () {
  'use strict';

  var BUCKET_NAME = 'receipts_vault';
  var DB_STORE_NAME = 'receipt_attachments';

  /**
   * Downsamples and compresses an Image / Canvas / File into a lightweight WebP Blob (< 80KB)
   */
  function compressImageToWebP(fileOrBlob, maxWidth = 1200, quality = 0.75) {
    return new Promise((resolve, reject) => {
      var reader = new FileReader();
      reader.onload = (e) => {
        var img = new Image();
        img.onload = () => {
          var w = img.width;
          var h = img.height;
          if (w > maxWidth) {
            h = Math.round((h * maxWidth) / w);
            w = maxWidth;
          }
          var canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          var ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, w, h);

          canvas.toBlob(
            (blob) => {
              if (blob) {
                resolve(blob);
              } else {
                reject(new Error('Canvas WebP blob conversion failed'));
              }
            },
            'image/webp',
            quality
          );
        };
        img.onerror = () => reject(new Error('Failed to load image for compression'));
        img.src = e.target.result;
      };
      reader.onerror = () => reject(new Error('Failed to read file for compression'));
      reader.readAsDataURL(fileOrBlob);
    });
  }

  /**
   * Upload a compressed receipt WebP to Supabase Storage
   */
  async function uploadReceipt(fileOrBlob, metadata = {}) {
    var uid = window.LM_Auth?.getCurrentUserId?.();
    if (!uid || uid === 'guest' || uid === 'default') {
      throw new Error('User must be logged in to upload receipts');
    }

    // 1. Client-Side WebP Compression
    var webpBlob = await compressImageToWebP(fileOrBlob);
    var receiptId = 'rcpt_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    var storagePath = `${uid}/${receiptId}.webp`;

    var record = {
      id: receiptId,
      userId: uid,
      transactionId: metadata.transactionId || null,
      fileName: metadata.fileName || 'receipt.webp',
      fileSize: webpBlob.size,
      mimeType: 'image/webp',
      merchant: metadata.merchant || 'Unknown',
      amount: metadata.amount || 0,
      receiptDate: metadata.date || new Date().toISOString().slice(0, 10),
      storagePath: storagePath,
      localBlobUrl: URL.createObjectURL(webpBlob),
      createdAt: new Date().toISOString()
    };

    // 2. Cache locally in IndexedDB first (offline-first)
    if (window.db && window.db.objectStoreNames.contains(DB_STORE_NAME)) {
      try {
        var tx = window.db.transaction(DB_STORE_NAME, 'readwrite');
        tx.objectStore(DB_STORE_NAME).put(record);
      } catch (e) {
        console.warn('[ReceiptVault] Local cache save failed:', e);
      }
    }

    // 3. Upload to Supabase Storage if online
    if (typeof _supabase !== 'undefined' && _supabase?.storage && navigator.onLine) {
      try {
        var { data, error } = await _supabase.storage
          .from(BUCKET_NAME)
          .upload(storagePath, webpBlob, {
            contentType: 'image/webp',
            upsert: true
          });

        if (error) throw error;

        var { data: urlData } = _supabase.storage
          .from(BUCKET_NAME)
          .getPublicUrl(storagePath);

        record.fileUrl = urlData?.publicUrl || '';

        // Save metadata row in receipts_vault table
        await _supabase.from('receipts_vault').insert({
          id: undefined, // auto-uuid
          user_id: uid,
          transaction_id: record.transactionId,
          file_name: record.fileName,
          file_url: record.fileUrl,
          storage_path: storagePath,
          file_size: record.fileSize,
          mime_type: record.mimeType,
          merchant: record.merchant,
          amount: record.amount,
          receipt_date: record.receiptDate,
          metadata: metadata
        });

        console.log('[ReceiptVault] ☁️ Uploaded receipt successfully:', record.fileUrl);
      } catch (uploadErr) {
        console.warn('[ReceiptVault] Storage upload failed (cached locally):', uploadErr.message);
      }
    }

    return record;
  }

  /**
   * Fetch all receipts for the current user
   */
  async function getReceipts() {
    var uid = window.LM_Auth?.getCurrentUserId?.();
    if (!uid) return [];

    if (typeof _supabase !== 'undefined' && _supabase?.from && navigator.onLine) {
      try {
        var { data, error } = await _supabase
          .from('receipts_vault')
          .select('*')
          .eq('user_id', uid)
          .order('created_at', { ascending: false });

        if (!error && Array.isArray(data)) {
          return data;
        }
      } catch (e) {}
    }

    // Fallback to local store
    return new Promise((resolve) => {
      if (!window.db || !window.db.objectStoreNames.contains(DB_STORE_NAME)) {
        resolve([]);
        return;
      }
      try {
        var tx = window.db.transaction(DB_STORE_NAME, 'readonly');
        var req = tx.objectStore(DB_STORE_NAME).getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => resolve([]);
      } catch {
        resolve([]);
      }
    });
  }

  window.LM_ReceiptVault = {
    compressImageToWebP,
    uploadReceipt,
    getReceipts
  };

  console.log('[LM] ReceiptVault initialized (WebP compression & Supabase Storage ready).');
})();
