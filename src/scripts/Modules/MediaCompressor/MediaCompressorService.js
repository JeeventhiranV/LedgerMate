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
  // 1. EXIF & JPEG METADATA EXTRACTION & RE-INJECTION
  // ─────────────────────────────────────────────────────────────

  /**
   * Scans a JPEG ArrayBuffer and extracts all metadata APP segments
   * (APP1 Exif & XMP, APP2 ICC Profile, APP13 IPTC).
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

    var offset = 2;

    while (offset < length - 1) {
      if (view.getUint8(offset) !== 0xFF) {
        break; // Malformed JPEG stream
      }

      var marker = view.getUint8(offset + 1);

      // Stop scanning once SOS (Start of Scan 0xFFDA) or EOI (0xFFD9) is reached
      if (marker === 0xDA || marker === 0xD9) {
        break;
      }

      // Variable-length markers have a 16-bit length immediately following
      if (offset + 4 > length) break;
      var segmentLen = view.getUint16(offset + 2, false);

      // Target markers:
      // 0xE1 = APP1 (Exif & Adobe XMP - Camera info, GPS, timestamps, author)
      // 0xE2 = APP2 (ICC Profile)
      // 0xED = APP13 (Photoshop IPTC)
      if (marker === 0xE1 || marker === 0xE2 || marker === 0xED) {
        var segmentTotalLen = 2 + segmentLen; // Marker (2 bytes) + Length field & payload
        if (offset + segmentTotalLen <= length) {
          var copy = new Uint8Array(segmentTotalLen);
          copy.set(rawBytes.subarray(offset, offset + segmentTotalLen));
          segments.push(copy);
        }
      }

      offset += 2 + segmentLen;
    }

    return segments;
  }

  /**
   * Injects extracted metadata segments (APP1 EXIF, etc.) into a freshly compressed
   * JPEG binary buffer, immediately following the SOI marker (0xFFD8).
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

    // Determine insertion position:
    // If the compressed JPEG has an APP0 (JFIF) marker at offset 2, we can insert right after APP0
    // so JFIF standard compatibility is strictly maintained.
    var insertPos = 2;
    if (compBytes[2] === 0xFF && compBytes[3] === 0xE0) {
      var app0Len = (compBytes[4] << 8) | compBytes[5];
      insertPos = 2 + 2 + app0Len;
    }

    // Calculate total output length
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
  // 2. DIMENSION & ASPECT RATIO CALCULATION
  // ─────────────────────────────────────────────────────────────

  /**
   * Computes target dimensions based on source dimensions and resize rules.
   * Preserves exact aspect ratio.
   * 
   * @param {number} origWidth - Source width in pixels
   * @param {number} origHeight - Source height in pixels
   * @param {string} resizeMode - 'original' | 'custom'
   * @param {number} maxDimension - Max width or height constraint (e.g. 1200)
   * @returns {{ width: number, height: number, scaled: boolean }}
   */
  function calculateDimensions(origWidth, origHeight, resizeMode, maxDimension) {
    if (resizeMode === 'original' || !maxDimension || maxDimension <= 0) {
      return { width: origWidth, height: origHeight, scaled: false };
    }

    var limit = Math.max(100, Math.round(Number(maxDimension) || 1200));

    // If source is already within limit, no downscaling needed
    if (origWidth <= limit && origHeight <= limit) {
      return { width: origWidth, height: origHeight, scaled: false };
    }

    var targetW = origWidth;
    var targetH = origHeight;

    if (origWidth >= origHeight) {
      targetW = limit;
      targetH = Math.max(1, Math.round((origHeight * limit) / origWidth));
    } else {
      targetH = limit;
      targetW = Math.max(1, Math.round((origWidth * limit) / origHeight));
    }

    return { width: targetW, height: targetH, scaled: true };
  }

  // ─────────────────────────────────────────────────────────────
  // 3. PHOTO COMPRESSION ENGINE
  // ─────────────────────────────────────────────────────────────

  /**
   * Compresses an image file with custom quality and resolution controls,
   * preserving EXIF, GPS, author, creation date, and lastModified timestamps.
   * 
   * @param {File} file - Original image file
   * @param {Object} options - Compression options
   * @param {number} [options.quality=0.75] - Quality from 0.1 to 1.0
   * @param {string} [options.resizeMode='custom'] - 'original' or 'custom'
   * @param {number} [options.maxDimension=1200] - Max bounding box px
   * @param {boolean} [options.preserveExif=true] - Retain EXIF & metadata
   * @param {string} [options.format='image/jpeg'] - Output mime type
   * @returns {Promise<Object>} Compression result with file, sizes & metrics
   */
  async function compressImage(file, options) {
    options = options || {};
    var quality = typeof options.quality === 'number' ? Math.max(0.1, Math.min(1.0, options.quality)) : 0.75;
    var resizeMode = options.resizeMode || 'custom';
    var maxDimension = typeof options.maxDimension !== 'undefined' ? options.maxDimension : 1200;
    var preserveExif = options.preserveExif !== false;
    var mimeType = options.format || 'image/jpeg';

    // 1. Read original binary buffer for EXIF extraction if JPEG
    var isJpeg = file.type === 'image/jpeg' || file.name.match(/\.jpe?g$/i);
    var metadataSegments = [];

    if (isJpeg && preserveExif) {
      try {
        var origBuffer = await file.arrayBuffer();
        metadataSegments = extractJpegMetadataSegments(origBuffer);
      } catch (err) {
        console.warn('[LM MediaCompressor] Error reading EXIF segments:', err);
      }
    }

    // 2. Load image element / bitmap to obtain dimensions
    return new Promise(function (resolve, reject) {
      var img = new Image();
      var objectUrl = URL.createObjectURL(file);

      img.onload = async function () {
        try {
          var origW = img.naturalWidth || img.width;
          var origH = img.naturalHeight || img.height;

          // 3. Compute target resolution
          var targetDims = calculateDimensions(origW, origH, resizeMode, maxDimension);
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

          ctx.drawImage(img, 0, 0, targetW, targetH);

          // 5. Convert canvas to Blob
          canvas.toBlob(async function (compressedBlob) {
            URL.revokeObjectURL(objectUrl);
            if (!compressedBlob) {
              return reject(new Error('Canvas blob generation failed'));
            }

            var finalBytes;
            // 6. Re-inject EXIF metadata if applicable
            if (isJpeg && preserveExif && metadataSegments.length > 0) {
              try {
                var compBuffer = await compressedBlob.arrayBuffer();
                finalBytes = injectJpegMetadataSegments(compBuffer, metadataSegments);
              } catch (exifErr) {
                console.warn('[LM MediaCompressor] Failed to re-inject EXIF, using default blob:', exifErr);
                finalBytes = new Uint8Array(await compressedBlob.arrayBuffer());
              }
            } else {
              finalBytes = new Uint8Array(await compressedBlob.arrayBuffer());
            }

            // 7. Create output File preserving original name, creation and modified date
            var outputBlob = new Blob([finalBytes], { type: mimeType });
            var finalFile = new File([outputBlob], file.name, {
              type: mimeType,
              lastModified: file.lastModified || Date.now()
            });

            var origSize = file.size;
            var compSize = finalFile.size;
            var savedBytes = Math.max(0, origSize - compSize);
            var savedPercent = origSize > 0 ? ((origSize - compSize) / origSize) * 100 : 0;

            resolve({
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
            });
          }, mimeType, quality);

        } catch (procErr) {
          URL.revokeObjectURL(objectUrl);
          reject(procErr);
        }
      };

      img.onerror = function (err) {
        URL.revokeObjectURL(objectUrl);
        reject(new Error('Failed to load image for compression: ' + (err.message || 'Image decode error')));
      };

      img.src = objectUrl;
    });
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

      var videoUrl = URL.createObjectURL(file);
      video.src = videoUrl;

      var cleanUp = function () {
        try { video.pause(); } catch (e) {}
        video.src = '';
        video.load();
        URL.revokeObjectURL(videoUrl);
      };

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
          var frameTimer = null;

          recorder.onstop = function () {
            cancelAnimationFrame(frameTimer);
            cleanUp();

            if (isCancelled) {
              return reject(new Error('Video compression was cancelled'));
            }

            var finalBlob = new Blob(chunks, { type: mimeType.split(';')[0] });
            
            // Retain original filename with matched extension
            var ext = mimeType.includes('mp4') ? '.mp4' : '.webm';
            var baseName = file.name.replace(/\.[^/.]+$/, '');
            var outFileName = baseName + ext;

            var finalFile = new File([finalBlob], outFileName, {
              type: finalBlob.type,
              lastModified: file.lastModified || Date.now()
            });

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
              exifPreserved: false,
              previewUrl: URL.createObjectURL(finalBlob),
              originalPreviewUrl: URL.createObjectURL(file)
            });
          };

          recorder.onerror = function (e) {
            cleanUp();
            reject(new Error('MediaRecorder error: ' + (e.error ? e.error.name : 'Unknown error')));
          };

          // Frame draw loop
          function renderFrame() {
            if (video.paused || video.ended) return;

            ctx.drawImage(video, 0, 0, targetW, targetH);

            if (typeof onProgress === 'function' && duration > 0) {
              var pct = Math.min(99, Math.round((video.currentTime / duration) * 100));
              onProgress(pct, 'Transcoding video (' + pct + '%)...');
            }

            frameTimer = requestAnimationFrame(renderFrame);
          }

          recorder.start(100); // 100ms chunk intervals
          video.currentTime = 0;

          video.onended = function () {
            if (typeof onProgress === 'function') onProgress(100, 'Finalizing video...');
            setTimeout(function () {
              if (recorder.state === 'recording') recorder.stop();
            }, 300);
          };

          video.play().then(function () {
            renderFrame();
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
    if (isNativeAndroid() && typeof window.AndroidBridge.selectBackupFolder === 'function') {
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
          window.AndroidBridge.selectBackupFolder(callbackId);
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
      localHeader.set(u16(0), 28);

      parts.push(localHeader);
      parts.push(nameBytes);
      parts.push(fileData);

      offset += localHeader.length + nameBytes.length + fileData.length;

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
      cdHeader.set(u16(0), 30);
      cdHeader.set(u16(0), 32);
      cdHeader.set(u16(0), 34);
      cdHeader.set(u16(0), 36);
      cdHeader.set(u32(0), 38);
      cdHeader.set(u32(localHeaderOffset), 42);

      centralDirRecords.push(cdHeader);
      centralDirRecords.push(nameBytes);
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
    calculateDimensions: calculateDimensions,
    compressImage: compressImage,
    compressVideo: compressVideo,
    calculateVideoParameters: calculateVideoParameters,
    chooseDestinationDirectory: chooseDestinationDirectory,
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
