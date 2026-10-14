/**
 * LedgerMate – MediaCompressorService.js
 * ─────────────────────────────────────────────────────────────
 * High-performance, offline client-side photo & video compression engine.
 * Features:
 *   1. Lossless EXIF & Metadata Preservation (GPS, Camera, Author, Creation Date)
 *   2. Custom resolution scaling (1200px editable default, aspect-ratio lock)
 *   3. Client-side Video Transcoding (1080p, 720p, 480p, 360p) with bitrates
 *   4. Original modified/creation timestamp preservation on files
 *   5. Direct OS destination folder writing via File System Access API
 *   6. Lightweight zero-dependency ZIP archive generator fallback
 * 
 * Exposes: window.LM_MediaCompressorService
 * ─────────────────────────────────────────────────────────────
 */
(function () {
  'use strict';

  // ─────────────────────────────────────────────────────────────
  // ─────────────────────────────────────────────────────────────
  // 1. EXIF, GPS & METADATA PRESERVATION ENGINE
  // ─────────────────────────────────────────────────────────────

  // MP4 uses Mac Epoch (seconds since midnight Jan 1, 1904).
  // Offset between Jan 1, 1904 and Jan 1, 1970 is 2,082,844,800 seconds.
  var MAC_EPOCH_OFFSET = 2082844800;

  function unixToMacEpoch(unixMs) {
    return Math.floor(Number(unixMs) / 1000) + MAC_EPOCH_OFFSET;
  }

  /**
   * Normalizes EXIF Orientation tag (0x0112) in IFD0 to 1 (Normal).
   * Prevents browsers and gallery apps from double-rotating images whose
   * pixels have already been rendered upright by the HTML5 canvas.
   * 
   * @param {Uint8Array} segment - Extracted APP1 segment bytes
   */
  function normalizeExifOrientation(segment) {
    if (!segment || segment.length < 14) return;
    // Format: [0xFF, 0xE1, lenHigh, lenLow, 'E', 'x', 'i', 'f', 0x00, 0x00, ...]
    if (segment[4] !== 0x45 || segment[5] !== 0x78 || segment[6] !== 0x69 || segment[7] !== 0x66 || segment[8] !== 0x00 || segment[9] !== 0x00) {
      return; // Not standard Exif header (e.g. Adobe XMP)
    }

    var tiffStart = 10;
    var isLittleEndian = (segment[tiffStart] === 0x49 && segment[tiffStart + 1] === 0x49); // "II"
    var isBigEndian = (segment[tiffStart] === 0x4D && segment[tiffStart + 1] === 0x4D);    // "MM"
    if (!isLittleEndian && !isBigEndian) return;

    function getU16(pos) {
      if (pos + 2 > segment.length) return 0;
      return isLittleEndian
        ? (segment[pos] | (segment[pos + 1] << 8))
        : ((segment[pos] << 8) | segment[pos + 1]);
    }
    function getU32(pos) {
      if (pos + 4 > segment.length) return 0;
      return isLittleEndian
        ? ((segment[pos]) | (segment[pos + 1] << 8) | (segment[pos + 2] << 16) | (segment[pos + 3] << 24)) >>> 0
        : (((segment[pos] << 24) | (segment[pos + 1] << 16) | (segment[pos + 2] << 8) | segment[pos + 3])) >>> 0;
    }

    var ifd0Offset = getU32(tiffStart + 4);
    var ifd0Pos = tiffStart + ifd0Offset;
    if (ifd0Pos + 2 > segment.length) return;

    var numEntries = getU16(ifd0Pos);
    var entryPos = ifd0Pos + 2;

    for (var i = 0; i < numEntries && entryPos + 12 <= segment.length; i++) {
      var tag = getU16(entryPos);
      if (tag === 0x0112) { // Orientation tag
        var type = getU16(entryPos + 2);
        if (type === 3) { // SHORT
          if (isLittleEndian) {
            segment[entryPos + 8] = 0x01;
            segment[entryPos + 9] = 0x00;
            segment[entryPos + 10] = 0x00;
            segment[entryPos + 11] = 0x00;
          } else {
            segment[entryPos + 8] = 0x00;
            segment[entryPos + 9] = 0x01;
            segment[entryPos + 10] = 0x00;
            segment[entryPos + 11] = 0x00;
          }
        }
        break;
      }
      entryPos += 12;
    }
  }

  /**
   * Formats a Unix timestamp (ms) into standard EXIF date format "YYYY:MM:DD HH:MM:SS"
   */
  function formatExifDate(timestamp) {
    var d = timestamp ? new Date(timestamp) : new Date();
    var y = d.getFullYear();
    var m = String(d.getMonth() + 1).padStart(2, '0');
    var day = String(d.getDate()).padStart(2, '0');
    var h = String(d.getHours()).padStart(2, '0');
    var min = String(d.getMinutes()).padStart(2, '0');
    var s = String(d.getSeconds()).padStart(2, '0');
    return y + ':' + m + ':' + day + ' ' + h + ':' + min + ':' + s;
  }

  /**
   * Synthesizes a valid minimal APP1 EXIF segment containing DateTimeOriginal,
   * CreateDate, and ModifyDate from the file's original modified timestamp.
   * Ensures that photos without existing EXIF metadata preserve their dates.
   * 
   * @param {number} timestamp - Unix timestamp ms
   * @returns {Uint8Array} Standard APP1 segment bytes
   */
  function createMinimalExifSegment(timestamp) {
    var dateStr = formatExifDate(timestamp);
    var dateBytes;
    if (typeof TextEncoder !== 'undefined') {
      dateBytes = new TextEncoder().encode(dateStr + '\0');
    } else {
      dateBytes = new Uint8Array(20);
      for (var di = 0; di < dateStr.length && di < 19; di++) {
        dateBytes[di] = dateStr.charCodeAt(di);
      }
      dateBytes[19] = 0;
    }

    var ifd0Offset = 8;
    var ifd0Size = 2 + 12 * 2 + 4; // 30 bytes
    var exifIfdOffset = ifd0Offset + ifd0Size; // 38
    var exifIfdSize = 2 + 12 * 2 + 4; // 30 bytes
    var dateOffset = exifIfdOffset + exifIfdSize; // 68
    var tiffPayloadLen = dateOffset + 20; // 88 bytes
    var segmentLen = 2 + 6 + tiffPayloadLen; // 96 bytes

    var seg = new Uint8Array(2 + segmentLen);
    seg[0] = 0xFF;
    seg[1] = 0xE1;
    seg[2] = (segmentLen >> 8) & 0xFF;
    seg[3] = segmentLen & 0xFF;
    // "Exif\0\0"
    seg[4] = 0x45; seg[5] = 0x78; seg[6] = 0x69; seg[7] = 0x66; seg[8] = 0x00; seg[9] = 0x00;

    var t = 10;
    // TIFF header Little Endian
    seg[t] = 0x49; seg[t + 1] = 0x49; // "II"
    seg[t + 2] = 0x2A; seg[t + 3] = 0x00; // 42
    seg[t + 4] = 0x08; seg[t + 5] = 0x00; seg[t + 6] = 0x00; seg[t + 7] = 0x00; // IFD0 offset

    // IFD0
    var p = t + 8;
    seg[p] = 0x02; seg[p + 1] = 0x00; p += 2; // 2 entries
    // ModifyDate (0x0132)
    seg[p] = 0x32; seg[p + 1] = 0x01;
    seg[p + 2] = 0x02; seg[p + 3] = 0x00;
    seg[p + 4] = 0x14; seg[p + 5] = 0x00; seg[p + 6] = 0x00; seg[p + 7] = 0x00;
    seg[p + 8] = dateOffset & 0xFF; seg[p + 9] = (dateOffset >> 8) & 0xFF; seg[p + 10] = 0; seg[p + 11] = 0;
    p += 12;

    // ExifIFD pointer (0x8769)
    seg[p] = 0x69; seg[p + 1] = 0x87;
    seg[p + 2] = 0x04; seg[p + 3] = 0x00;
    seg[p + 4] = 0x01; seg[p + 5] = 0x00; seg[p + 6] = 0x00; seg[p + 7] = 0x00;
    seg[p + 8] = exifIfdOffset & 0xFF; seg[p + 9] = (exifIfdOffset >> 8) & 0xFF; seg[p + 10] = 0; seg[p + 11] = 0;
    p += 12;

    seg[p] = 0; seg[p + 1] = 0; seg[p + 2] = 0; seg[p + 3] = 0; p += 4;

    // ExifIFD
    seg[p] = 0x02; seg[p + 1] = 0x00; p += 2; // 2 entries
    // DateTimeOriginal (0x9003)
    seg[p] = 0x03; seg[p + 1] = 0x90;
    seg[p + 2] = 0x02; seg[p + 3] = 0x00;
    seg[p + 4] = 0x14; seg[p + 5] = 0x00; seg[p + 6] = 0x00; seg[p + 7] = 0x00;
    seg[p + 8] = dateOffset & 0xFF; seg[p + 9] = (dateOffset >> 8) & 0xFF; seg[p + 10] = 0; seg[p + 11] = 0;
    p += 12;

    // CreateDate (0x9004)
    seg[p] = 0x04; seg[p + 1] = 0x90;
    seg[p + 2] = 0x02; seg[p + 3] = 0x00;
    seg[p + 4] = 0x14; seg[p + 5] = 0x00; seg[p + 6] = 0x00; seg[p + 7] = 0x00;
    seg[p + 8] = dateOffset & 0xFF; seg[p + 9] = (dateOffset >> 8) & 0xFF; seg[p + 10] = 0; seg[p + 11] = 0;
    p += 12;

    seg[p] = 0; seg[p + 1] = 0; seg[p + 2] = 0; seg[p + 3] = 0; p += 4;

    // Write date bytes
    seg.set(dateBytes, t + dateOffset);

    return seg;
  }

  /**
   * Scans a JPEG ArrayBuffer and extracts all metadata APP segments
   * (APP1 Exif & XMP, APP2 ICC Profile, APP13 IPTC, etc.), robustly handling
   * consecutive 0xFF fill bytes and non-payload markers.
   * 
   * @param {ArrayBuffer} buffer - Original JPEG binary data
   * @returns {Array<Uint8Array>} Array of extracted segment byte blocks
   */
  function extractJpegMetadataSegments(buffer) {
    var segments = [];
    if (!buffer) return segments;

    var view;
    var rawBytes;
    if (buffer instanceof DataView) {
      view = buffer;
      rawBytes = new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
    } else if (buffer instanceof ArrayBuffer) {
      view = new DataView(buffer);
      rawBytes = new Uint8Array(buffer);
    } else if (buffer && buffer.buffer && typeof buffer.byteOffset === 'number') {
      view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
      rawBytes = new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
    } else {
      return segments;
    }

    var length = view.byteLength;
    if (length < 4) return segments;

    // Verify SOI (Start of Image) marker: 0xFFD8
    if (view.getUint16(0, false) !== 0xFFD8) {
      return segments; // Not a valid JPEG
    }

    try {
      var offset = 2;
      var maxIterations = 50000;

      while (offset < length && --maxIterations > 0) {
        // Find 0xFF marker prefix
        if (view.getUint8(offset) !== 0xFF) {
          offset++;
          continue;
        }

        // Skip consecutive 0xFF fill/padding bytes
        while (offset < length && view.getUint8(offset) === 0xFF) {
          offset++;
        }
        if (offset >= length) break;

        var marker = view.getUint8(offset);
        offset++;

        // Stop scanning once SOS (Start of Scan 0xFFDA) or EOI (0xFFD9) is reached
        if (marker === 0xDA || marker === 0xD9) {
          break;
        }

        // Stand-alone markers without payload: RST0-7 (0xD0-0xD7), TEM (0x01), Byte-stuffed 0x00
        if (marker === 0x00 || (marker >= 0xD0 && marker <= 0xD7) || marker === 0x01) {
          continue;
        }

        // Markers with variable length
        if (offset + 2 > length) break;
        var segmentLen = view.getUint16(offset, false);
        if (segmentLen < 2 || offset + segmentLen > length) break;

        // Extract APP segments (APP1-APP15: 0xE1-0xEF, IPTC: 0xED)
        if ((marker >= 0xE1 && marker <= 0xEF) || marker === 0xED) {
          var segmentTotalLen = 2 + segmentLen;
          var seg = new Uint8Array(segmentTotalLen);
          seg[0] = 0xFF;
          seg[1] = marker;
          seg.set(rawBytes.subarray(offset, offset + segmentLen), 2);

          // Normalize EXIF orientation to 1 in APP1
          if (marker === 0xE1) {
            try { normalizeExifOrientation(seg); } catch (e) {}
          }

          segments.push(seg);
        }

        offset += segmentLen;
      }
    } catch (parseErr) {
      console.warn('[LM MediaCompressor] extractJpegMetadataSegments error:', parseErr);
    }

    return segments;
  }

  /**
   * Injects extracted metadata segments (APP1 EXIF, etc.) into a freshly compressed
   * JPEG binary buffer, immediately following the SOI marker (0xFFD8) or APP0 (JFIF).
   * 
   * @param {ArrayBuffer|Uint8Array} compressedBuffer - Compressed JPEG data from canvas
   * @param {Array<Uint8Array>} segments - Extracted metadata segments
   * @returns {Uint8Array} Combined JPEG with full metadata preserved
   */
  function injectJpegMetadataSegments(compressedBuffer, segments) {
    if (!compressedBuffer) return new Uint8Array(0);

    var compBytes;
    if (compressedBuffer instanceof Uint8Array) {
      compBytes = compressedBuffer;
    } else if (compressedBuffer instanceof ArrayBuffer) {
      compBytes = new Uint8Array(compressedBuffer);
    } else if (compressedBuffer && compressedBuffer.buffer && typeof compressedBuffer.byteOffset === 'number') {
      compBytes = new Uint8Array(compressedBuffer.buffer, compressedBuffer.byteOffset, compressedBuffer.byteLength);
    } else {
      compBytes = new Uint8Array(compressedBuffer);
    }

    if (!segments || segments.length === 0) {
      return compBytes;
    }

    if (compBytes.length < 4 || compBytes[0] !== 0xFF || compBytes[1] !== 0xD8) {
      return compBytes; // Not valid JPEG
    }

    // Determine insertion position: insert right after APP0 (JFIF) if present
    var insertPos = 2;
    if (compBytes[2] === 0xFF && compBytes[3] === 0xE0) {
      var app0Len = (compBytes[4] << 8) | compBytes[5];
      insertPos = 2 + 2 + app0Len;
    }

    var totalSegmentsLen = 0;
    for (var i = 0; i < segments.length; i++) {
      totalSegmentsLen += segments[i].length;
    }

    var finalBytes = new Uint8Array(compBytes.length + totalSegmentsLen);

    // 1. Copy bytes up to insertion point
    finalBytes.set(compBytes.subarray(0, insertPos), 0);

    // 2. Inject all extracted metadata segments
    var currentOffset = insertPos;
    for (var j = 0; j < segments.length; j++) {
      finalBytes.set(segments[j], currentOffset);
      currentOffset += segments[j].length;
    }

    // 3. Copy the rest of the compressed JPEG stream
    finalBytes.set(compBytes.subarray(insertPos), currentOffset);

    return finalBytes;
  }

  // ─────────────────────────────────────────────────────────────
  // MP4 VIDEO CONTAINER ATOM DATE PARSER & PATCHER
  // ─────────────────────────────────────────────────────────────

  /**
   * Reads the creation and modification timestamps from an MP4/MOV container's mvhd atom.
   * 
   * @param {ArrayBuffer} arrayBuffer - Buffer of original MP4 file (or prefix)
   * @returns {{ creationTime: number, modTime: number }|null} Timestamps in Mac epoch seconds
   */
  function readMp4Timestamps(arrayBuffer) {
    if (!arrayBuffer) return null;
    var view = new DataView(arrayBuffer);
    var len = view.byteLength;
    if (len < 16) return null;

    for (var i = 0; i <= len - 16; i++) {
      if (view.getUint8(i) === 0x6D && view.getUint8(i + 1) === 0x76 &&
          view.getUint8(i + 2) === 0x68 && view.getUint8(i + 3) === 0x64) { // 'mvhd'
        var version = view.getUint8(i + 4);
        var creationTime = 0;
        var modTime = 0;
        if (version === 0 && i + 16 <= len) {
          creationTime = view.getUint32(i + 8, false);
          modTime = view.getUint32(i + 12, false);
        } else if (version === 1 && i + 24 <= len) {
          creationTime = view.getUint32(i + 12, false);
          modTime = view.getUint32(i + 20, false);
        }
        if (creationTime && creationTime > 0) {
          return { creationTime: creationTime, modTime: modTime };
        }
      }
    }
    return null;
  }

  /**
   * Patches the creation_time and modification_time fields inside all mvhd and tkhd atoms
   * of an MP4/MOV container with the specified Mac epoch timestamp.
   * 
   * @param {ArrayBuffer} arrayBuffer - Transcoded MP4 array buffer
   * @param {number} targetMacEpoch - Timestamp in Mac epoch seconds
   * @returns {ArrayBuffer} Modified array buffer
   */
  function patchMp4Timestamps(arrayBuffer, targetMacEpoch) {
    if (!arrayBuffer) return arrayBuffer;
    var view = new DataView(arrayBuffer);
    var len = view.byteLength;
    var macTime = targetMacEpoch || (Math.floor(Date.now() / 1000) + MAC_EPOCH_OFFSET);

    for (var i = 0; i <= len - 16; i++) {
      var isMvhd = (view.getUint8(i) === 0x6D && view.getUint8(i + 1) === 0x76 && view.getUint8(i + 2) === 0x68 && view.getUint8(i + 3) === 0x64);
      var isTkhd = (view.getUint8(i) === 0x74 && view.getUint8(i + 1) === 0x6B && view.getUint8(i + 2) === 0x68 && view.getUint8(i + 3) === 0x64);

      if (isMvhd || isTkhd) {
        var version = view.getUint8(i + 4);
        if (version === 0 && i + 16 <= len) {
          view.setUint32(i + 8, macTime, false);
          view.setUint32(i + 12, macTime, false);
        } else if (version === 1 && i + 24 <= len) {
          view.setUint32(i + 8, 0, false);
          view.setUint32(i + 12, macTime, false);
          view.setUint32(i + 16, 0, false);
          view.setUint32(i + 20, macTime, false);
        }
      }
    }
    return arrayBuffer;
  }

  // ─────────────────────────────────────────────────────────────
  // 2. DIMENSION & ASPECT RATIO CALCULATION
  // ─────────────────────────────────────────────────────────────

  /**
   * Computes target dimensions based on source dimensions and separate width/height controls.
   * Supports aspect ratio locking (bounding box fit) and unlocked custom dimensions.
   * 
   * @param {number} origWidth - Source width in pixels
   * @param {number} origHeight - Source height in pixels
   * @param {Object|string} options - Configuration object or legacy resizeMode string
   * @param {number} [legacyMaxDim] - Legacy max dimension
   * @returns {{ width: number, height: number, scaled: boolean }}
   */
  function calculateDimensions(origWidth, origHeight, options, legacyMaxDim) {
    if (typeof options === 'string') {
      var legacyMode = options;
      var dim = legacyMaxDim || 1200;
      options = { resizeMode: legacyMode, maxWidth: dim, maxHeight: dim, lockAspectRatio: true };
    }
    options = options || {};
    var resizeMode = options.resizeMode || 'custom';
    if (resizeMode === 'original' || !origWidth || !origHeight) {
      return { width: origWidth, height: origHeight, scaled: false };
    }

    var maxW = Math.max(50, Math.round(Number(options.maxWidth || options.maxDimension || 1200)));
    var maxH = Math.max(50, Math.round(Number(options.maxHeight || options.maxDimension || 1200)));
    var lockAspect = options.lockAspectRatio !== false;

    if (lockAspect) {
      // If image already fits inside bounding box, do not upscale
      if (origWidth <= maxW && origHeight <= maxH) {
        return { width: origWidth, height: origHeight, scaled: false };
      }
      var scale = Math.min(maxW / origWidth, maxH / origHeight);
      var targetW = Math.max(1, Math.round(origWidth * scale));
      var targetH = Math.max(1, Math.round(origHeight * scale));
      return { width: targetW, height: targetH, scaled: true };
    } else {
      var targetW = maxW;
      var targetH = maxH;
      return { width: targetW, height: targetH, scaled: (targetW !== origWidth || targetH !== origHeight) };
    }
  }

  // ─────────────────────────────────────────────────────────────
  // 3. PHOTO COMPRESSION ENGINE & ROBUST HELPERS
  // ─────────────────────────────────────────────────────────────

  /**
   * Safely reads an ArrayBuffer from a Blob or File across all browsers and Android WebViews.
   */
  async function readBlobAsArrayBuffer(blob) {
    if (!blob) return new ArrayBuffer(0);
    if (typeof blob.arrayBuffer === 'function') {
      try {
        return await blob.arrayBuffer();
      } catch (err) {
        // Fall back to FileReader
      }
    }
    return new Promise(function (resolve, reject) {
      if (typeof FileReader === 'undefined') {
        return reject(new Error('FileReader API unavailable'));
      }
      var reader = new FileReader();
      reader.onload = function () {
        resolve(reader.result || new ArrayBuffer(0));
      };
      reader.onerror = function (e) {
        reject(e || new Error('Failed to read blob data'));
      };
      reader.readAsArrayBuffer(blob);
    });
  }

  /**
   * Constructs a File object from a Blob, with robust fallback for Android WebViews
   * where the File constructor throws TypeError: Illegal constructor.
   */
  function createFileSafe(blob, fileName, lastModified) {
    var mime = blob.type || 'image/jpeg';
    var modTime = lastModified || Date.now();
    try {
      return new File([blob], fileName, {
        type: mime,
        lastModified: modTime
      });
    } catch (e) {
      var fallbackFile = blob;
      try {
        Object.defineProperty(fallbackFile, 'name', { value: fileName, configurable: true, writable: true });
        Object.defineProperty(fallbackFile, 'lastModified', { value: modTime, configurable: true, writable: true });
        Object.defineProperty(fallbackFile, 'lastModifiedDate', { value: new Date(modTime), configurable: true, writable: true });
      } catch (propErr) {
        fallbackFile.name = fileName;
        fallbackFile.lastModified = modTime;
      }
      return fallbackFile;
    }
  }

  function dataUrlToBlob(dataUrl, fallbackMime) {
    var parts = dataUrl.split(',');
    var byteString;
    try {
      byteString = atob(parts[1] || '');
    } catch (e) {
      return new Blob([], { type: fallbackMime || 'image/jpeg' });
    }
    var mime = (parts[0].split(':')[1] || '').split(';')[0] || fallbackMime || 'image/jpeg';
    var ab = new ArrayBuffer(byteString.length);
    var ia = new Uint8Array(ab);
    for (var i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    return new Blob([ab], { type: mime });
  }

  /**
   * Safely converts a canvas to Blob with timeout fallback to toDataURL.
   * Prevents hangs when canvas.toBlob callback is dropped by WebView or returns null.
   */
  function canvasToBlobSafe(canvas, mimeType, quality) {
    return new Promise(function (resolve, reject) {
      var settled = false;

      function fallbackToDataUrl() {
        if (settled) return;
        settled = true;
        try {
          var dataUrl = canvas.toDataURL(mimeType, quality);
          var blob = dataUrlToBlob(dataUrl, mimeType);
          resolve(blob);
        } catch (err) {
          reject(new Error('Canvas export failed: ' + (err.message || 'Unknown error')));
        }
      }

      if (typeof canvas.toBlob === 'function') {
        try {
          canvas.toBlob(function (blob) {
            if (settled) return;
            if (blob && blob.size > 0) {
              settled = true;
              resolve(blob);
            } else {
              fallbackToDataUrl();
            }
          }, mimeType, quality);
        } catch (toBlobErr) {
          fallbackToDataUrl();
          return;
        }

        // Safety timeout: 4 seconds
        setTimeout(function () {
          if (!settled) {
            fallbackToDataUrl();
          }
        }, 4000);
      } else {
        fallbackToDataUrl();
      }
    });
  }

  /**
   * Safely loads an image via createImageBitmap or Image element with timeout.
   */
  function loadImageSafe(file) {
    return new Promise(function (resolve, reject) {
      var settled = false;
      var objectUrl = null;

      function done(drawable, w, h, cleanup) {
        if (settled) return;
        settled = true;
        resolve({
          drawable: drawable,
          width: w,
          height: h,
          close: cleanup || function () {}
        });
      }

      function fail(err) {
        if (settled) return;
        settled = true;
        if (objectUrl) {
          try { URL.revokeObjectURL(objectUrl); } catch (e) {}
        }
        reject(err);
      }

      // Safety watchdog: 10 seconds
      var timeoutTimer = setTimeout(function () {
        fail(new Error('Image decode timed out after 10s'));
      }, 10000);

      // Fast path: createImageBitmap if available
      var bitmapFn = (typeof window !== 'undefined' && typeof window.createImageBitmap === 'function')
        ? window.createImageBitmap
        : (typeof createImageBitmap === 'function' ? createImageBitmap : null);

      if (bitmapFn) {
        bitmapFn(file).then(function (bitmap) {
          clearTimeout(timeoutTimer);
          done(bitmap, bitmap.width, bitmap.height, function () {
            if (typeof bitmap.close === 'function') bitmap.close();
          });
        }).catch(function () {
          // Fall back to Image element
          loadViaImage();
        });
      } else {
        loadViaImage();
      }

      function loadViaImage() {
        if (settled) return;
        try {
          var urlHelper = (typeof window !== 'undefined' && window.URL) ? window.URL : (typeof URL !== 'undefined' ? URL : null);
          if (urlHelper && typeof urlHelper.createObjectURL === 'function') {
            objectUrl = urlHelper.createObjectURL(file);
          }
          var ImgCtor = (typeof window !== 'undefined' && window.Image) ? window.Image : (typeof Image !== 'undefined' ? Image : null);
          if (!ImgCtor) {
            fail(new Error('Image constructor unavailable'));
            return;
          }
          var img = new ImgCtor();
          img.onload = function () {
            clearTimeout(timeoutTimer);
            var w = img.naturalWidth || img.width;
            var h = img.naturalHeight || img.height;
            done(img, w, h, function () {
              if (objectUrl && urlHelper && typeof urlHelper.revokeObjectURL === 'function') {
                try { urlHelper.revokeObjectURL(objectUrl); } catch (e) {}
              }
            });
          };
          img.onerror = function (err) {
            clearTimeout(timeoutTimer);
            fail(new Error('Failed to load image: format not supported or corrupted'));
          };
          img.src = objectUrl;
        } catch (e) {
          clearTimeout(timeoutTimer);
          fail(e);
        }
      }
    });
  }

  /**
   * Compresses an image file with custom quality and resolution controls,
   * preserving EXIF, GPS, author, creation date, and lastModified timestamps.
   * Emits granular progress events to prevent UI stalling.
   * 
   * @param {File} file - Original image file
   * @param {Object} options - Compression options
   * @param {number} [options.quality=0.75] - Quality from 0.1 to 1.0
   * @param {string} [options.resizeMode='custom'] - 'original' or 'custom'
   * @param {number} [options.maxDimension=1200] - Max bounding box px
   * @param {boolean} [options.preserveExif=true] - Retain EXIF & metadata
   * @param {string} [options.format='image/jpeg'] - Output mime type
   * @param {Function} [onProgress] - Callback (percent, statusText)
   * @returns {Promise<Object>} Compression result with file, sizes & metrics
   */
  async function compressImage(file, options, onProgress) {
    options = options || {};
    var quality = typeof options.quality === 'number' ? Math.max(0.1, Math.min(1.0, options.quality)) : 0.75;
    var resizeMode = options.resizeMode || 'custom';
    var maxDimension = typeof options.maxDimension !== 'undefined' ? options.maxDimension : 1200;
    var preserveExif = options.preserveExif !== false;
    var mimeType = options.format || 'image/jpeg';

    if (typeof onProgress === 'function') onProgress(15, 'Reading image metadata...');

    // 1. Read original binary buffer for EXIF extraction if JPEG
    var isJpeg = file.type === 'image/jpeg' || (file.name && file.name.match(/\.jpe?g$/i));
    var metadataSegments = [];

    if (isJpeg && preserveExif) {
      try {
        var origBuffer = await readBlobAsArrayBuffer(file);
        metadataSegments = extractJpegMetadataSegments(origBuffer);
      } catch (err) {
        console.warn('[LM MediaCompressor] Error reading EXIF segments:', err);
      }
    }

    if (typeof onProgress === 'function') onProgress(35, 'Decoding image pixels...');

    // 2. Load image element / bitmap safely with timeout
    var loaded = await loadImageSafe(file);

    try {
      var origW = loaded.width;
      var origH = loaded.height;

      if (typeof onProgress === 'function') onProgress(55, 'Rendering to canvas...');

      // 3. Compute target resolution using separate width/height controls
      var targetDims = calculateDimensions(origW, origH, options);
      var targetW = targetDims.width;
      var targetH = targetDims.height;

      // 4. Render onto high-quality canvas
      var canvas = document.createElement('canvas');
      canvas.width = targetW;
      canvas.height = targetH;
      var ctx = canvas.getContext('2d', { alpha: mimeType !== 'image/jpeg' });

      // Smooth scaling
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // If JPEG, fill white background to prevent transparency turning black
      if (mimeType === 'image/jpeg') {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, targetW, targetH);
      }

      ctx.drawImage(loaded.drawable, 0, 0, targetW, targetH);
      loaded.close(); // Free bitmap / revoke URL immediately

      if (typeof onProgress === 'function') onProgress(75, 'Compressing image bytes...');

      // 5. Convert canvas to Blob safely (with toDataURL fallback)
      var compressedBlob = await canvasToBlobSafe(canvas, mimeType, quality);
      if (!compressedBlob || compressedBlob.size === 0) {
        throw new Error('Canvas blob generation failed');
      }

      if (typeof onProgress === 'function') onProgress(88, 'Preserving EXIF metadata & dates...');

      var finalBytes;
      // 6. Re-inject EXIF metadata if applicable
      if (isJpeg && preserveExif) {
        if (metadataSegments.length === 0) {
          metadataSegments = [createMinimalExifSegment(file.lastModified || Date.now())];
        }
        try {
          var compBuffer = await readBlobAsArrayBuffer(compressedBlob);
          finalBytes = injectJpegMetadataSegments(compBuffer, metadataSegments);
        } catch (exifErr) {
          console.warn('[LM MediaCompressor] Failed to re-inject EXIF, using default blob:', exifErr);
          finalBytes = new Uint8Array(await readBlobAsArrayBuffer(compressedBlob));
        }
      } else {
        finalBytes = new Uint8Array(await readBlobAsArrayBuffer(compressedBlob));
      }

      // 7. Create output File preserving original name, creation and modified date
      var outputBlob = new Blob([finalBytes], { type: mimeType });
      var finalFile = createFileSafe(outputBlob, file.name, file.lastModified || Date.now());

      var origSize = file.size;
      var compSize = finalFile.size;
      var savedBytes = Math.max(0, origSize - compSize);
      var savedPercent = origSize > 0 ? ((origSize - compSize) / origSize) * 100 : 0;

      if (typeof onProgress === 'function') onProgress(100, 'Done!');

      return {
        file: finalFile,
        blob: outputBlob,
        originalFile: file,
        type: 'image',
        name: file.name,
        originalSize: origSize,
        compressedSize: compSize,
        savedBytes: savedBytes,
        savedPercent: savedPercent,
        originalDimensions: { width: origW, height: origH },
        compressedDimensions: { width: targetW, height: targetH },
        exifPreserved: isJpeg && preserveExif && metadataSegments.length > 0,
        previewUrl: URL.createObjectURL(outputBlob),
        originalPreviewUrl: URL.createObjectURL(file)
      };
    } finally {
      if (loaded && typeof loaded.close === 'function') {
        loaded.close();
      }
    }
  }

  // ─────────────────────────────────────────────────────────────
  // 4. VIDEO COMPRESSION ENGINE
  // ─────────────────────────────────────────────────────────────

  /**
   * Detects supported video MIME types for MediaRecorder in the current browser/webview.
   * @returns {string} Best supported video MIME type
   */
  function getSupportedVideoMimeType() {
    var candidates = [
      'video/mp4;codecs="avc1.42E01E,mp4a.40.2"',
      'video/mp4',
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm'
    ];

    if (typeof MediaRecorder === 'undefined') return 'video/webm';

    for (var i = 0; i < candidates.length; i++) {
      if (MediaRecorder.isTypeSupported(candidates[i])) {
        return candidates[i];
      }
    }
    return '';
  }

  /**
   * Computes target dimensions and bitrates for video compression presets.
   * 
   * @param {number} width - Source video width
   * @param {number} height - Source video height
   * @param {string} preset - 'source' | '1080p' | '720p' | '480p' | '360p'
   * @param {string} [qualityTier='balanced'] - 'high' | 'balanced' | 'aggressive'
   * @returns {{ width: number, height: number, bitrate: number }}
   */
  function calculateVideoParameters(width, height, preset, qualityTier) {
    var maxDim = 720;
    var baseBitrate = 1200000; // 1.2 Mbps for 720p

    switch (preset) {
      case '1080p':
        maxDim = 1080;
        baseBitrate = 2500000; // 2.5 Mbps
        break;
      case '720p':
        maxDim = 720;
        baseBitrate = 1200000; // 1.2 Mbps
        break;
      case '480p':
        maxDim = 480;
        baseBitrate = 600000;  // 600 kbps
        break;
      case '360p':
        maxDim = 360;
        baseBitrate = 350000;  // 350 kbps
        break;
      case 'source':
      default:
        maxDim = Math.min(width, height);
        baseBitrate = 1800000;
        break;
    }

    // Determine target width & height preserving aspect ratio
    var targetW = width;
    var targetH = height;
    var shortSide = Math.min(width, height);

    if (preset !== 'source' && shortSide > maxDim) {
      if (width >= height) {
        targetH = maxDim;
        targetW = Math.round((width * maxDim) / height);
      } else {
        targetW = maxDim;
        targetH = Math.round((height * maxDim) / width);
      }
    }

    // Ensure dimensions are even numbers (required by video encoders like H.264/VP9)
    targetW = targetW % 2 === 0 ? targetW : targetW - 1;
    targetH = targetH % 2 === 0 ? targetH : targetH - 1;

    // Adjust bitrate based on quality tier
    var bitrate = baseBitrate;
    if (qualityTier === 'high') bitrate = Math.round(baseBitrate * 1.5);
    if (qualityTier === 'aggressive') bitrate = Math.round(baseBitrate * 0.65);

    return {
      width: Math.max(160, targetW),
      height: Math.max(120, targetH),
      bitrate: bitrate
    };
  }

  /**
   * Compresses a video file via HTMLVideoElement + Canvas + MediaRecorder.
   * Runs 100% locally offline.
   * 
   * @param {File} file - Original video file
   * @param {Object} options - Video options
   * @param {string} [options.targetResolution='720p'] - 'source'|'1080p'|'720p'|'480p'|'360p'
   * @param {string} [options.qualityTier='balanced'] - 'high'|'balanced'|'aggressive'
   * @param {boolean} [options.includeAudio=true] - Audio retention
   * @param {Function} [onProgress] - Callback (percent, statusText)
   * @returns {Promise<Object>} Compression results and file object
   */
  async function compressVideo(file, options, onProgress) {
    options = options || {};
    var targetResolution = options.targetResolution || '720p';
    var qualityTier = options.qualityTier || 'balanced';
    var includeAudio = options.includeAudio !== false;

    var mimeType = getSupportedVideoMimeType();
    if (!mimeType) {
      throw new Error('Video compression is not supported on this browser (MediaRecorder API unavailable)');
    }

    return new Promise(function (resolve, reject) {
      var video = document.createElement('video');
      video.muted = true;
      video.playsInline = true;
      video.preload = 'auto';

      if (typeof document !== 'undefined' && document.body) {
        video.style.cssText = 'position:fixed;top:-9999px;left:-9999px;opacity:0;pointer-events:none;width:1px;height:1px;';
        document.body.appendChild(video);
      }

      var videoUrl = URL.createObjectURL(file);
      video.src = videoUrl;

      var isRecording = true;
      var watchdogTimer = null;
      var frameTimer = null;

      var cleanUp = function () {
        isRecording = false;
        if (watchdogTimer) clearTimeout(watchdogTimer);
        if (frameTimer) cancelAnimationFrame(frameTimer);
        try { video.pause(); } catch (e) {}
        if (video.parentNode) {
          try { video.parentNode.removeChild(video); } catch (e) {}
        }
        video.src = '';
        try { video.load(); } catch (e) {}
        URL.revokeObjectURL(videoUrl);
      };

      var origMacEpoch = unixToMacEpoch(file.lastModified || Date.now());
      if (file && typeof file.slice === 'function') {
        try {
          readBlobAsArrayBuffer(file.slice(0, 524288)).then(function (prefBuf) {
            var origTs = readMp4Timestamps(prefBuf);
            if (origTs && origTs.creationTime) {
              origMacEpoch = origTs.creationTime;
            }
          }).catch(function () {});
        } catch (ignored) {}
      }

      video.onloadedmetadata = function () {
        try {
          var origW = video.videoWidth || 1280;
          var origH = video.videoHeight || 720;
          var duration = video.duration || 1;

          var params = calculateVideoParameters(origW, origH, targetResolution, qualityTier);
          var targetW = params.width;
          var targetH = params.height;
          var targetBitrate = params.bitrate;

          var canvas = document.createElement('canvas');
          canvas.width = targetW;
          canvas.height = targetH;
          var ctx = canvas.getContext('2d');

          // Capture video stream from canvas at 30 fps
          var stream = canvas.captureStream ? canvas.captureStream(30) : (canvas.mozCaptureStream ? canvas.mozCaptureStream(30) : null);
          if (!stream) {
            cleanUp();
            return reject(new Error('Canvas captureStream is not supported in this browser.'));
          }

          // Retain audio if requested and supported
          if (includeAudio) {
            try {
              var audioStream = video.captureStream ? video.captureStream() : (video.mozCaptureStream ? video.mozCaptureStream() : null);
              if (audioStream && audioStream.getAudioTracks().length > 0) {
                var audioTrack = audioStream.getAudioTracks()[0];
                stream.addTrack(audioTrack);
              }
            } catch (audioErr) {
              console.warn('[LM MediaCompressor] Audio track capture not supported:', audioErr);
            }
          }

          var recorder;
          try {
            recorder = new MediaRecorder(stream, {
              mimeType: mimeType,
              videoBitsPerSecond: targetBitrate
            });
          } catch (recInitErr) {
            recorder = new MediaRecorder(stream);
          }

          var chunks = [];
          recorder.ondataavailable = function (e) {
            if (e.data && e.data.size > 0) {
              chunks.push(e.data);
            }
          };

          var isCancelled = false;

          recorder.onstop = async function () {
            cleanUp();

            if (isCancelled) {
              return reject(new Error('Video compression was cancelled'));
            }

            var rawBlob = new Blob(chunks, { type: mimeType.split(';')[0] });
            
            // Retain original filename with matched extension
            var ext = mimeType.includes('mp4') ? '.mp4' : '.webm';
            var baseName = file.name.replace(/\.[^/.]+$/, '');
            var outFileName = baseName + ext;

            var finalBlob = rawBlob;
            // Patch MP4 container atom creation & modification dates if MP4
            if (mimeType.includes('mp4')) {
              try {
                var rawBuffer = await readBlobAsArrayBuffer(rawBlob);
                var patchedBuffer = patchMp4Timestamps(rawBuffer, origMacEpoch);
                finalBlob = new Blob([patchedBuffer], { type: 'video/mp4' });
              } catch (patchErr) {
                console.warn('[LM MediaCompressor] MP4 timestamp patch error:', patchErr);
              }
            }

            var finalFile = createFileSafe(finalBlob, outFileName, file.lastModified || Date.now());

            var origSize = file.size;
            var compSize = finalFile.size;
            var savedBytes = Math.max(0, origSize - compSize);
            var savedPercent = origSize > 0 ? ((origSize - compSize) / origSize) * 100 : 0;

            resolve({
              file: finalFile,
              blob: finalBlob,
              type: 'video',
              name: outFileName,
              originalFile: file,
              originalSize: origSize,
              compressedSize: compSize,
              savedBytes: savedBytes,
              savedPercent: savedPercent,
              originalDimensions: { width: origW, height: origH },
              compressedDimensions: { width: targetW, height: targetH },
              exifPreserved: true,
              previewUrl: URL.createObjectURL(finalBlob),
              originalPreviewUrl: URL.createObjectURL(file)
            });
          };

          recorder.onerror = function (e) {
            cleanUp();
            reject(new Error('MediaRecorder error: ' + (e.error ? e.error.name : 'Unknown error')));
          };

          // Continuous Frame draw loop
          function renderLoop() {
            if (!isRecording) return;

            if (!video.paused && !video.ended) {
              try {
                ctx.drawImage(video, 0, 0, targetW, targetH);
                if (typeof onProgress === 'function' && duration > 0) {
                  var pct = Math.min(99, Math.round((video.currentTime / duration) * 100));
                  onProgress(pct, 'Transcoding video (' + pct + '%)...');
                }
              } catch (e) {}
            }

            if (!video.ended) {
              frameTimer = requestAnimationFrame(renderLoop);
            }
          }

          video.ontimeupdate = function () {
            if (typeof onProgress === 'function' && duration > 0) {
              var pct = Math.min(99, Math.round((video.currentTime / duration) * 100));
              onProgress(pct, 'Transcoding video (' + pct + '%)...');
            }
          };

          // Watchdog timeout to prevent indefinite hangs
          var maxDurationMs = Math.max(30000, Math.round((duration || 10) * 3500));
          watchdogTimer = setTimeout(function () {
            if (isRecording) {
              console.warn('[LM MediaCompressor] Video compression watchdog timer expired, stopping recorder');
              if (recorder && recorder.state === 'recording') {
                recorder.stop();
              }
            }
          }, maxDurationMs);

          recorder.start(100); // 100ms chunk intervals
          video.currentTime = 0;

          video.onended = function () {
            if (typeof onProgress === 'function') onProgress(100, 'Finalizing video...');
            setTimeout(function () {
              if (recorder.state === 'recording') recorder.stop();
            }, 300);
          };

          video.play().then(function () {
            renderLoop();
          }).catch(function (playErr) {
            cleanUp();
            reject(new Error('Cannot start video playback for compression: ' + playErr.message));
          });

        } catch (prepErr) {
          cleanUp();
          reject(prepErr);
        }
      };

      video.onerror = function (err) {
        cleanUp();
        reject(new Error('Failed to load video metadata: ' + (err.message || 'Format not supported')));
      };
    });
  }

  // ─────────────────────────────────────────────────────────────
  // 5. DESTINATION FOLDER & DIRECTORY WRITER
  // ─────────────────────────────────────────────────────────────

  function isNativeAndroid() {
    return typeof window.AndroidBridge !== 'undefined' &&
           typeof window.AndroidBridge.isNativeApp === 'function' &&
           window.AndroidBridge.isNativeApp();
  }

  function isFolderPickerSupported() {
    return isNativeAndroid() || typeof window.showDirectoryPicker === 'function';
  }

  /**
   * Prompts user to select a destination directory on their device.
   * Supports Android Storage Access Framework (SAF) in native app,
   * and Web File System Access API in desktop browsers.
   * 
   * @returns {Promise<{ type: string, handle?: any, uri?: string, name: string }|null>}
   */
  async function chooseDestinationDirectory() {
    // 1. Native Android Storage Access Framework (SAF)
    if (isNativeAndroid() && typeof window.AndroidBridge.selectMediaFolder === 'function') {
      return new Promise(function (resolve, reject) {
        var callbackId = 'cb_mc_folder_' + Date.now();
        window.LM_NativeBridgeCallbacks = window.LM_NativeBridgeCallbacks || {};
        window.LM_NativeBridgeCallbacks[callbackId] = function (res) {
          delete window.LM_NativeBridgeCallbacks[callbackId];
          if (res && res.status === 'success' && res.uri) {
            resolve({
              type: 'native',
              uri: res.uri,
              name: res.folderName || 'Selected Device Folder'
            });
          } else {
            resolve(null);
          }
        };

        try {
          window.AndroidBridge.selectMediaFolder(callbackId);
          // Set safety timeout if user closes without selecting
          setTimeout(function () {
            if (window.LM_NativeBridgeCallbacks[callbackId]) {
              delete window.LM_NativeBridgeCallbacks[callbackId];
              resolve(null);
            }
          }, 60000);
        } catch (e) {
          delete window.LM_NativeBridgeCallbacks[callbackId];
          reject(e);
        }
      });
    }

    // 2. Web File System Access API (Desktop Chrome, Edge, Opera)
    if (typeof window.showDirectoryPicker === 'function') {
      try {
        var dirHandle;
        try {
          dirHandle = await window.showDirectoryPicker({
            id: 'ledgermate_media_compressor',
            mode: 'readwrite'
          });
        } catch (optErr) {
          // If browser rejects specific options (e.g. id), fallback to standard invocation
          dirHandle = await window.showDirectoryPicker();
        }

        if (dirHandle) {
          return {
            type: 'fsa',
            handle: dirHandle,
            name: dirHandle.name
          };
        }
      } catch (err) {
        if (err.name === 'AbortError') return null; // User cancelled
        throw err;
      }
    }

    // 3. Fallback for mobile browsers (Chrome on Android, Safari on iOS)
    return null;
  }

  /**
   * Retrieves previously configured destination media folder if available.
   * 
   * @returns {Promise<{ type: string, uri?: string, handle?: any, name: string }|null>}
   */
  async function getSavedDestinationDirectory() {
    if (isNativeAndroid() && typeof window.AndroidBridge.getMediaFolder === 'function') {
      return new Promise(function (resolve) {
        var callbackId = 'cb_mc_getfolder_' + Date.now();
        window.LM_NativeBridgeCallbacks = window.LM_NativeBridgeCallbacks || {};
        window.LM_NativeBridgeCallbacks[callbackId] = function (res) {
          delete window.LM_NativeBridgeCallbacks[callbackId];
          if (res && res.status === 'success' && res.configured && res.uri) {
            resolve({
              type: 'native',
              uri: res.uri,
              name: res.folderName || 'Selected Device Folder'
            });
          } else {
            resolve(null);
          }
        };
        try {
          window.AndroidBridge.getMediaFolder(callbackId);
          setTimeout(function () {
            if (window.LM_NativeBridgeCallbacks[callbackId]) {
              delete window.LM_NativeBridgeCallbacks[callbackId];
              resolve(null);
            }
          }, 2000);
        } catch (e) {
          resolve(null);
        }
      });
    }

    return null;
  }

  async function blobToBase64(blob) {
    if (typeof FileReader !== 'undefined') {
      return new Promise(function (resolve, reject) {
        var reader = new FileReader();
        reader.onloadend = function () {
          var dataUrl = reader.result;
          var base64 = dataUrl ? dataUrl.split(',')[1] : '';
          resolve(base64 || '');
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    }

    try {
      var buffer = await (blob.arrayBuffer ? blob.arrayBuffer() : Promise.resolve(new ArrayBuffer(0)));
      var bytes = new Uint8Array(buffer);
      if (typeof Buffer !== 'undefined') {
        return Buffer.from(bytes).toString('base64');
      }
      var binary = '';
      for (var b = 0; b < bytes.length; b++) {
        binary += String.fromCharCode(bytes[b]);
      }
      return typeof btoa === 'function' ? btoa(binary) : '';
    } catch (e) {
      return '';
    }
  }

  /**
   * Saves an array of compressed result items to a selected directory.
   * Retains exact original names and timestamps.
   * 
   * @param {Object} destination - Destination descriptor ({ type, handle, uri, name })
   * @param {Array<Object>} items - Array of compression result objects
   * @param {Function} [onFileSaved] - Callback (index, total, name)
   * @returns {Promise<{ savedCount: number, errors: Array }>}
   */
  async function saveItemsToDirectory(destination, items, onFileSaved) {
    if (!destination) {
      throw new Error('No destination selected');
    }

    var savedCount = 0;
    var errors = [];

    // Case A: Native Android Bridge
    if (destination.type === 'native' && window.AndroidBridge && typeof window.AndroidBridge.writeMediaFile === 'function') {
      for (var i = 0; i < items.length; i++) {
        var itemNative = items[i];
        try {
          var fName = itemNative.name || itemNative.file.name;
          var blobNative = itemNative.blob || itemNative.file;
          var b64 = await blobToBase64(blobNative);
          var mType = blobNative.type || (itemNative.type === 'image' ? 'image/jpeg' : 'video/mp4');
          var lMod = itemNative.file && itemNative.file.lastModified ? itemNative.file.lastModified : Date.now();

          await new Promise(function (resolveWrite, rejectWrite) {
            var cbId = 'cb_mc_write_' + Date.now() + '_' + i;
            window.LM_NativeBridgeCallbacks = window.LM_NativeBridgeCallbacks || {};
            window.LM_NativeBridgeCallbacks[cbId] = function (res) {
              delete window.LM_NativeBridgeCallbacks[cbId];
              if (res && res.status === 'success') {
                resolveWrite(res);
              } else {
                rejectWrite(new Error((res && res.error) || 'Failed to save ' + fName));
              }
            };

            try {
              window.AndroidBridge.writeMediaFile(destination.uri, fName, b64, mType, lMod, cbId);
            } catch (err) {
              delete window.LM_NativeBridgeCallbacks[cbId];
              rejectWrite(err);
            }
          });

          savedCount++;
          if (typeof onFileSaved === 'function') {
            onFileSaved(i + 1, items.length, fName);
          }
        } catch (saveNativeErr) {
          console.error('[LM MediaCompressor] Native save error for ' + itemNative.name + ':', saveNativeErr);
          errors.push({ name: itemNative.name, error: saveNativeErr.message });
        }
      }
      return { savedCount: savedCount, errors: errors };
    }

    // Case B: Web File System Access API
    var dirHandle = destination.handle || destination;
    if (dirHandle && dirHandle.getFileHandle) {
      for (var j = 0; j < items.length; j++) {
        var itemFsa = items[j];
        try {
          var name = itemFsa.name || itemFsa.file.name;
          var fileHandle = await dirHandle.getFileHandle(name, { create: true });
          var writable = await fileHandle.createWritable();
          await writable.write(itemFsa.blob || itemFsa.file);
          await writable.close();

          savedCount++;
          if (typeof onFileSaved === 'function') {
            onFileSaved(j + 1, items.length, name);
          }
        } catch (saveErr) {
          console.error('[LM MediaCompressor] Failed to save file ' + itemFsa.name + ':', saveErr);
          errors.push({ name: itemFsa.name, error: saveErr.message });
        }
      }
      return { savedCount: savedCount, errors: errors };
    }

    throw new Error('Unsupported destination writer');
  }

  // ─────────────────────────────────────────────────────────────
  // 6. LIGHTWEIGHT CLIENT-SIDE ZIP BUILDER (STORE METHOD)
  // ─────────────────────────────────────────────────────────────

  /**
   * Generates a standard PKZip (.zip) file containing all compressed files,
   * retaining filenames and modified timestamps without external dependencies.
   * 
   * @param {Array<Object>} items - Array of compression result objects
   * @returns {Promise<Blob>} Standard zip blob
   */
  async function generateZipArchive(items) {
    var parts = [];
    var centralDirRecords = [];
    var offset = 0;

    function u16(val) {
      var b = new Uint8Array(2);
      b[0] = val & 0xFF;
      b[1] = (val >> 8) & 0xFF;
      return b;
    }

    function u32(val) {
      var b = new Uint8Array(4);
      b[0] = val & 0xFF;
      b[1] = (val >> 8) & 0xFF;
      b[2] = (val >> 16) & 0xFF;
      b[3] = (val >> 24) & 0xFF;
      return b;
    }

    var crcTable = (function () {
      var c, table = [];
      for (var n = 0; n < 256; n++) {
        c = n;
        for (var k = 0; k < 8; k++) {
          c = ((c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1));
        }
        table[n] = c;
      }
      return table;
    })();

    function crc32(uint8Array) {
      var crc = 0 ^ (-1);
      for (var i = 0; i < uint8Array.length; i++) {
        crc = (crc >>> 8) ^ crcTable[(crc ^ uint8Array[i]) & 0xFF];
      }
      return (crc ^ (-1)) >>> 0;
    }

    function dosDateTime(date) {
      var d = date || new Date();
      var dosTime = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1);
      var dosDate = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
      return { time: dosTime, date: dosDate };
    }

    var encoder = new TextEncoder();

    for (var i = 0; i < items.length; i++) {
      var item = items[i];
      var name = item.name || item.file.name;
      var fileData = new Uint8Array(await (item.blob || item.file).arrayBuffer());
      var nameBytes = encoder.encode(name);
      var fileCrc = crc32(fileData);
      var modDate = item.file && item.file.lastModified ? new Date(item.file.lastModified) : new Date();
      var dos = dosDateTime(modDate);
      var unixSeconds = Math.floor(modDate.getTime() / 1000);

      // Info-ZIP Extended Timestamp extra field (tag 0x5455 'UT'):
      // Tag (2), Size (2), Flag 0x01 (1), mtime uint32 (4) = 9 bytes total
      var extraField = new Uint8Array(9);
      extraField[0] = 0x55; extraField[1] = 0x54; // 'UT'
      extraField[2] = 0x05; extraField[3] = 0x00; // 5 bytes payload
      extraField[4] = 0x01; // flag: modification time present
      extraField.set(u32(unixSeconds), 5);

      var localHeaderOffset = offset;

      var localHeader = new Uint8Array(30);
      localHeader.set([0x50, 0x4B, 0x03, 0x04], 0);
      localHeader.set(u16(20), 4);
      localHeader.set(u16(0), 6);
      localHeader.set(u16(0), 8);
      localHeader.set(u16(dos.time), 10);
      localHeader.set(u16(dos.date), 12);
      localHeader.set(u32(fileCrc), 14);
      localHeader.set(u32(fileData.length), 18);
      localHeader.set(u32(fileData.length), 22);
      localHeader.set(u16(nameBytes.length), 26);
      localHeader.set(u16(extraField.length), 28);

      parts.push(localHeader);
      parts.push(nameBytes);
      parts.push(extraField);
      parts.push(fileData);

      offset += localHeader.length + nameBytes.length + extraField.length + fileData.length;

      var cdHeader = new Uint8Array(46);
      cdHeader.set([0x50, 0x4B, 0x01, 0x02], 0);
      cdHeader.set(u16(20), 4);
      cdHeader.set(u16(20), 6);
      cdHeader.set(u16(0), 8);
      cdHeader.set(u16(0), 10);
      cdHeader.set(u16(dos.time), 12);
      cdHeader.set(u16(dos.date), 14);
      cdHeader.set(u32(fileCrc), 16);
      cdHeader.set(u32(fileData.length), 20);
      cdHeader.set(u32(fileData.length), 24);
      cdHeader.set(u16(nameBytes.length), 28);
      cdHeader.set(u16(extraField.length), 30);
      cdHeader.set(u16(0), 32);
      cdHeader.set(u16(0), 34);
      cdHeader.set(u16(0), 36);
      cdHeader.set(u32(0), 38);
      cdHeader.set(u32(localHeaderOffset), 42);

      centralDirRecords.push(cdHeader);
      centralDirRecords.push(nameBytes);
      centralDirRecords.push(extraField);
    }

    var centralDirStartOffset = offset;
    var centralDirSize = 0;

    for (var k = 0; k < centralDirRecords.length; k++) {
      parts.push(centralDirRecords[k]);
      centralDirSize += centralDirRecords[k].length;
    }

    var eocd = new Uint8Array(22);
    eocd.set([0x50, 0x4B, 0x05, 0x06], 0);
    eocd.set(u16(0), 4);
    eocd.set(u16(0), 6);
    eocd.set(u16(items.length), 8);
    eocd.set(u16(items.length), 10);
    eocd.set(u32(centralDirSize), 12);
    eocd.set(u32(centralDirStartOffset), 16);
    eocd.set(u16(0), 20);

    parts.push(eocd);

    return new Blob(parts, { type: 'application/zip' });
  }

  /**
   * Triggers a browser download of a Blob with a specific filename.
   */
  function triggerDownload(blob, fileName) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 1000);
  }

  // ─────────────────────────────────────────────────────────────
  // PUBLIC API
  // ─────────────────────────────────────────────────────────────
  window.LM_MediaCompressorService = {
    extractJpegMetadataSegments: extractJpegMetadataSegments,
    injectJpegMetadataSegments: injectJpegMetadataSegments,
    createMinimalExifSegment: createMinimalExifSegment,
    readMp4Timestamps: readMp4Timestamps,
    patchMp4Timestamps: patchMp4Timestamps,
    calculateDimensions: calculateDimensions,
    compressImage: compressImage,
    compressVideo: compressVideo,
    calculateVideoParameters: calculateVideoParameters,
    chooseDestinationDirectory: chooseDestinationDirectory,
    getSavedDestinationDirectory: getSavedDestinationDirectory,
    saveItemsToDirectory: saveItemsToDirectory,
    generateZipArchive: generateZipArchive,
    triggerDownload: triggerDownload,
    isFolderPickerSupported: isFolderPickerSupported,
    isNativeAndroid: isNativeAndroid
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = window.LM_MediaCompressorService;
  }
})();
