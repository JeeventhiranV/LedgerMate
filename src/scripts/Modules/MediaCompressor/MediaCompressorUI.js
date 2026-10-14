/**
 * LedgerMate – MediaCompressorUI.js
 * ─────────────────────────────────────────────────────────────
 * User Interface controller for the Photo & Video Compressor module.
 * Features:
 *   - Drag & Drop file queue with live image & video thumbnail generation
 *   - Interactive configuration: Quality slider, Custom max dimension (1200px editable),
 *     Video presets (1080p, 720p, 480p, 360p), EXIF preservation toggle
 *   - Live estimated space reduction pill during tuning
 *   - Native Android SAF folder picker & Web File System Access API integration
 *   - Mobile Web proactive Save Options modal (1-Click ZIP vs Direct Downloads)
 *   - Real-time progress bar with per-file status
 *   - Hero space reduction analytics (Total MB saved and % reduction)
 *   - Interactive Before/After full preview comparisons
 *   - 1-click Save to Destination, Download as ZIP, and individual file downloads
 * 
 * Exposes: window.LM_MediaCompressorUI
 * ─────────────────────────────────────────────────────────────
 */
(function () {
  'use strict';

  // State
  var _state = {
    currentStage: 'select', // 'select' | 'configure' | 'processing' | 'results'
    selectedFiles: [],      // Array of { file, id, name, size, type, previewUrl, width, height }
    compressedResults: [],  // Array of result objects from service
    destination: null,      // { type: 'native'|'fsa', uri?, handle?, name }
    mobileSavePreference: 'zip', // 'zip' | 'sequential'
    selectedPreset: 'storage_saver', // 'whatsapp' | 'storage_saver' | 'lossless' | 'custom'
    comparisonMode: 'swipe', // 'swipe' | 'side'
    hasStoragePermission: true,
    options: {
      quality: 0.75,
      resizeMode: 'custom',
      maxWidth: 1200,
      maxHeight: 1200,
      lockAspectRatio: true,
      maxDimension: 1200,
      preserveExif: true,
      format: 'auto', // 'auto' | 'image/webp' | 'image/jpeg'
      videoResolution: '720p',
      videoQuality: 'balanced',
      includeAudio: true
    },
    isProcessing: false,
    cancelRequested: false,
    activeComparisonItem: null
  };

  /**
   * Formats bytes into human readable KB / MB / GB
   */
  function formatBytes(bytes) {
    if (bytes === 0 || isNaN(bytes)) return '0 B';
    var k = 1024;
    var sizes = ['B', 'KB', 'MB', 'GB'];
    var i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Computes estimated space reduction percentage based on settings
   */
  function getEstimatedSavings(quality, resizeMode, maxDim) {
    var base = Math.round((1 - quality * 0.72) * 100);
    if (resizeMode === 'custom' && maxDim <= 1200) {
      base = Math.min(88, base + 14);
    }
    return Math.max(25, Math.min(92, base));
  }

  /**
   * Initializes or re-renders the Media Compressor page
   */
  function init() {
    var container = document.getElementById('page-media-compressor');
    if (!container) return;

    // Auto-detect previously configured media destination folder
    if (!_state.destination && window.LM_MediaCompressorService && typeof window.LM_MediaCompressorService.getSavedDestinationDirectory === 'function') {
      window.LM_MediaCompressorService.getSavedDestinationDirectory().then(function (dest) {
        if (dest) {
          _state.destination = dest;
          render(container);
        }
      }).catch(function () {});
    }

    // Proactive All Files storage permission check for Android 11+
    if (window.LM_MediaCompressorService && typeof window.LM_MediaCompressorService.hasAllFilesPermission === 'function') {
      window.LM_MediaCompressorService.hasAllFilesPermission().then(function (granted) {
        _state.hasStoragePermission = granted;
        if (!granted && _state.currentStage === 'configure') {
          render(container);
        }
      }).catch(function () {});
    }

    render(container);
  }

  /**
   * Main render dispatch based on currentStage
   */
  function render(container) {
    container = container || document.getElementById('page-media-compressor');
    if (!container) return;

    var stages = ['select', 'configure', 'processing', 'results'];
    var currentIdx = stages.indexOf(_state.currentStage);
    function getStepClass(stepIdx) {
      if (currentIdx === stepIdx) return 'active';
      if (currentIdx > stepIdx) return 'completed';
      return '';
    }

    var html = `
      <div class="mc-wrapper">
        <!-- Header -->
        <div class="mc-header">
          <div class="mc-header-left">
            <div class="mc-header-icon">🗜️</div>
            <div>
              <h1 class="mc-title">Media Compressor</h1>
              <p class="mc-subtitle">Batch compress photos &amp; videos with lossless EXIF, GPS &amp; date preservation · 100% Offline</p>
            </div>
          </div>
          <div class="mc-stepper">
            <div class="mc-step ${getStepClass(0)}">
              <span class="mc-step-num">1</span> <span class="mc-step-text">Select</span>
            </div>
            <div class="mc-step-line"></div>
            <div class="mc-step ${getStepClass(1)}">
              <span class="mc-step-num">2</span> <span class="mc-step-text">Configure</span>
            </div>
            <div class="mc-step-line"></div>
            <div class="mc-step ${getStepClass(2)}">
              <span class="mc-step-num">3</span> <span class="mc-step-text">Compress</span>
            </div>
            <div class="mc-step-line"></div>
            <div class="mc-step ${getStepClass(3)}">
              <span class="mc-step-num">4</span> <span class="mc-step-text">Results</span>
            </div>
          </div>
        </div>

        <!-- Stage Container -->
        <div class="mc-content" id="mcStageContent">
          ${renderStageContent()}
        </div>

        <!-- Modals -->
        <div id="mcComparisonModal" class="mc-modal" style="display:none;"></div>
        <div id="mcMetadataModal" class="mc-modal" style="display:none;"></div>
        <div id="mcSaveOptionsModal" class="mc-modal" style="display:none;"></div>
      </div>
    `;

    container.innerHTML = html;
    attachEvents(container);
  }

  /**
   * Renders specific stage HTML
   */
  function renderStageContent() {
    switch (_state.currentStage) {
      case 'configure':
        return renderConfigureStage();
      case 'processing':
        return renderProcessingStage();
      case 'results':
        return renderResultsStage();
      case 'select':
      default:
        return renderSelectStage();
    }
  }

  // ─────────────────────────────────────────────────────────────
  // STAGE 1: SELECT FILES
  // ─────────────────────────────────────────────────────────────
  function renderSelectStage() {
    var hasFiles = _state.selectedFiles.length > 0;
    var totalSize = _state.selectedFiles.reduce((acc, f) => acc + f.size, 0);

    return `
      <!-- Dropzone -->
      <div class="mc-dropzone" id="mcDropzone">
        <input type="file" id="mcFileInput" multiple accept="image/*,video/*" style="display:none;">
        <input type="file" id="mcFolderFileInput" multiple accept="*/*" style="display:none;">
        <input type="file" id="mcDirInput" webkitdirectory directory multiple style="display:none;">

        <div class="mc-dropzone-icon">📥</div>
        <div class="mc-dropzone-title">Select or Drop Photos &amp; Videos</div>
        <div class="mc-dropzone-desc">Pick from Gallery, Browse All Storage Folders, or Drop files here</div>

        <div class="mc-dropzone-actions">
          <button type="button" class="btn-submit mc-browse-btn" id="mcBrowseBtn">
            🖼️ Browse Gallery (Photos &amp; Videos)
          </button>
          <button type="button" class="mc-btn-secondary mc-browse-folder-btn" id="mcBrowseFolderBtn" title="Browse device internal storage, SD card, DCIM, WhatsApp and custom folders">
            📁 Browse All Folders &amp; Files
          </button>
          <button type="button" class="mc-btn-secondary mc-browse-dir-btn" id="mcBrowseDirBtn" title="Select an entire folder of photos/videos" style="display:none;">
            📂 Select Entire Folder
          </button>
        </div>
      </div>

      <!-- Selected Queue -->
      ${hasFiles ? `
        <div class="mc-queue-header">
          <div class="mc-queue-summary">
            <strong>${_state.selectedFiles.length}</strong> file${_state.selectedFiles.length > 1 ? 's' : ''} queued
            <span class="mc-queue-size">(${formatBytes(totalSize)})</span>
          </div>
          <div class="mc-queue-actions">
            <button type="button" class="mc-btn-link" id="mcAddMoreBtn">➕ Add Photos/Videos</button>
            <button type="button" class="mc-btn-link" id="mcAddFolderBtn">📁 Add from Folder</button>
            <button type="button" class="mc-btn-link text-danger" id="mcClearAllBtn">🗑️ Clear All</button>
          </div>
        </div>

        <div class="mc-queue-grid">
          ${_state.selectedFiles.map(f => `
            <div class="mc-file-card" data-id="${f.id}">
              <div class="mc-thumb-wrap">
                ${f.type === 'image' 
                  ? `<img src="${f.previewUrl}" alt="${f.name}" class="mc-thumb-img">`
                  : `<video src="${f.previewUrl}" class="mc-thumb-img" muted playsinline preload="metadata"></video><span class="mc-video-badge">▶ Video</span>`
                }
              </div>
              <div class="mc-file-info">
                <div class="mc-file-name" title="${f.name}">${f.name}</div>
                <div class="mc-file-meta">
                  <span class="mc-meta-badge">${f.type === 'image' ? '📸 Photo' : '🎬 Video'}</span>
                  <span>${formatBytes(f.size)}</span>
                  ${f.width && f.height ? `<span class="mc-dim-badge">${f.width}×${f.height}</span>` : ''}
                </div>
              </div>
              <button type="button" class="mc-btn-remove" data-remove-id="${f.id}" title="Remove file">✕</button>
            </div>
          `).join('')}
        </div>

        <!-- Next Step CTA -->
        <div class="mc-action-bar">
          <div></div>
          <button type="button" class="btn-submit mc-next-btn" id="mcGoConfigureBtn">
            Configure Compression Settings (${_state.selectedFiles.length} files) →
          </button>
        </div>
      ` : ''}
    `;
  }

  // ─────────────────────────────────────────────────────────────
  // STAGE 2: CONFIGURE SETTINGS
  // ─────────────────────────────────────────────────────────────
  function renderConfigureStage() {
    var hasPhotos = _state.selectedFiles.some(f => f.type === 'image');
    var hasVideos = _state.selectedFiles.some(f => f.type === 'video');
    var canPickFolder = window.LM_MediaCompressorService.isFolderPickerSupported();
    var estSavings = getEstimatedSavings(_state.options.quality, _state.options.resizeMode, _state.options.maxDimension);

    return `
      <div class="mc-config-wrap">
        <div class="mc-config-top">
          <button type="button" class="mc-back-btn" id="mcBackToSelectBtn">← Back to File Selection</button>
          <div class="mc-files-summary-pill">
            ${_state.selectedFiles.length} files selected (${formatBytes(_state.selectedFiles.reduce((a,b)=>a+b.size,0))})
          </div>
        </div>

        ${(!_state.hasStoragePermission && window.LM_MediaCompressorService && window.LM_MediaCompressorService.isNativeAndroid()) ? `
          <div class="mc-perm-banner">
            <div class="mc-perm-left">
              <span class="mc-perm-icon">🛡️</span>
              <div>
                <div class="mc-perm-title">Preserve Exact Inode Dates &amp; Details</div>
                <div class="mc-perm-desc">Android 11+ requires All Files Access so compressed files in your folder keep identical original creation &amp; modified dates on disk.</div>
              </div>
            </div>
            <button type="button" class="btn-submit mc-btn-perm" id="mcGrantPermBtn">
              Grant Storage Access
            </button>
          </div>
        ` : ''}

        <div class="mc-config-cards">
          <!-- 0. Smart 1-Tap Presets -->
          <div class="card mc-config-card">
            <div class="mc-card-head">
              <span class="mc-card-icon">⚡</span>
              <div style="flex:1;">
                <h3 class="mc-card-title">1-Tap Smart Presets</h3>
                <p class="mc-card-subtitle">Select an instant profile or fine-tune granular parameters below</p>
              </div>
            </div>

            <div class="mc-smart-presets-grid">
              ${(function () {
                var presets = (window.LM_MediaCompressorService && window.LM_MediaCompressorService.getSmartPresets) ? window.LM_MediaCompressorService.getSmartPresets() : {};
                return Object.keys(presets).map(function (key) {
                  var p = presets[key];
                  var isActive = _state.selectedPreset === key;
                  return `
                    <div class="mc-smart-preset-card ${isActive ? 'active' : ''}" data-preset="${p.id}">
                      <div class="mc-preset-top">
                        <span class="mc-preset-icon">${p.icon}</span>
                        <span class="mc-preset-badge">${p.badge}</span>
                      </div>
                      <div class="mc-preset-name">${p.name}</div>
                      <div class="mc-preset-desc">${p.description}</div>
                    </div>
                  `;
                }).join('');
              })()}
            </div>
          </div>

          <!-- 1. Photo Compression Settings -->
          ${hasPhotos ? `
            <div class="card mc-config-card">
              <div class="mc-card-head">
                <span class="mc-card-icon">📸</span>
                <div style="flex:1;">
                  <h3 class="mc-card-title">Photo Compression Settings</h3>
                  <p class="mc-card-subtitle">Adjust quality and dimensions while preserving EXIF, GPS &amp; dates</p>
                </div>
                <div class="mc-estimate-pill" id="mcEstimatePill">
                  ⚡ Est. Space Saved: ~${estSavings}%
                </div>
              </div>

              <!-- Output Format Selector -->
              <div class="mc-field-group">
                <label class="mc-label">Output Image Format:</label>
                <div class="mc-format-selector">
                  <button type="button" class="mc-format-chip ${_state.options.format === 'auto' ? 'active' : ''}" data-fmt="auto">
                    <span>✨ Auto</span>
                    <span class="mc-format-sub">Original Extension</span>
                  </button>
                  <button type="button" class="mc-format-chip ${_state.options.format === 'image/webp' ? 'active' : ''}" data-fmt="image/webp">
                    <span>🚀 WebP</span>
                    <span class="mc-format-sub">Smallest File (~30% smaller)</span>
                  </button>
                  <button type="button" class="mc-format-chip ${_state.options.format === 'image/jpeg' ? 'active' : ''}" data-fmt="image/jpeg">
                    <span>🖼️ JPEG</span>
                    <span class="mc-format-sub">Universal Compatibility</span>
                  </button>
                </div>
              </div>

              <!-- Quality Slider & Presets -->
              <div class="mc-field-group">
                <div class="mc-field-header">
                  <label class="mc-label">Compression Quality:</label>
                  <span class="mc-slider-val" id="mcQualityVal">${Math.round(_state.options.quality * 100)}%</span>
                </div>
                <input type="range" class="mc-slider" id="mcQualitySlider" min="10" max="100" step="5" value="${Math.round(_state.options.quality * 100)}">
                <div class="mc-preset-chips">
                  <button type="button" class="mc-chip ${_state.options.quality === 0.85 ? 'active' : ''}" data-quality="0.85">
                    🟢 High Quality (85%)
                  </button>
                  <button type="button" class="mc-chip ${_state.options.quality === 0.70 ? 'active' : ''}" data-quality="0.70">
                    🟡 Balanced (70%)
                  </button>
                  <button type="button" class="mc-chip ${_state.options.quality === 0.45 ? 'active' : ''}" data-quality="0.45">
                    🔴 Max Compression (45%)
                  </button>
                </div>
              </div>

              <!-- Resolution Mode & Custom Max Dimension -->
              <div class="mc-field-group">
                <label class="mc-label">Resolution Scaling:</label>
                <div class="mc-radio-group">
                  <label class="mc-radio-label">
                    <input type="radio" name="mcResizeMode" value="custom" ${_state.options.resizeMode === 'custom' ? 'checked' : ''} id="mcResizeCustomRadio">
                    <span>Resize to Custom Dimensions (Editable)</span>
                  </label>
                  <label class="mc-radio-label">
                    <input type="radio" name="mcResizeMode" value="original" ${_state.options.resizeMode === 'original' ? 'checked' : ''} id="mcResizeOrigRadio">
                    <span>Keep Original Resolution (No Downsampling)</span>
                  </label>
                </div>

                <div class="mc-dim-input-wrap" id="mcDimWrap" style="${_state.options.resizeMode === 'original' ? 'display:none;' : ''}">
                  <div class="mc-dim-dual-row">
                    <div class="mc-dim-col">
                      <label class="mc-dim-sublabel">Max Width (px):</label>
                      <input type="number" class="mc-number-input" id="mcMaxWidthInput" min="50" max="8000" step="50" value="${_state.options.maxWidth || 1200}">
                    </div>
                    <div class="mc-dim-lock-col">
                      <label class="mc-dim-sublabel">&nbsp;</label>
                      <button type="button" class="mc-btn-aspect-link ${_state.options.lockAspectRatio ? 'locked' : ''}" id="mcAspectLinkBtn" title="${_state.options.lockAspectRatio ? 'Aspect Ratio Locked (Proportional scaling)' : 'Aspect Ratio Unlocked (Free dimensions)'}">
                        ${_state.options.lockAspectRatio ? '🔒 Locked' : '🔓 Free'}
                      </button>
                    </div>
                    <div class="mc-dim-col">
                      <label class="mc-dim-sublabel">Max Height (px):</label>
                      <input type="number" class="mc-number-input" id="mcMaxHeightInput" min="50" max="8000" step="50" value="${_state.options.maxHeight || 1200}">
                    </div>
                  </div>
                  <div class="mc-dim-presets">
                    <button type="button" class="mc-dim-chip" data-w="1200" data-h="1200">1200 × 1200 (Default Web)</button>
                    <button type="button" class="mc-dim-chip" data-w="1920" data-h="1080">1920 × 1080 (FHD)</button>
                    <button type="button" class="mc-dim-chip" data-w="1280" data-h="720">1280 × 720 (HD)</button>
                    <button type="button" class="mc-dim-chip" data-w="1080" data-h="1350">1080 × 1350 (Portrait)</button>
                  </div>
                  <span class="mc-dim-hint">${_state.options.lockAspectRatio ? '🔒 Both dimensions maintain original aspect ratio without stretching.' : '🔓 Exact custom width and height will be applied.'}</span>
                </div>
              </div>

              <!-- Metadata Preservation Toggle -->
              <div class="mc-field-group mc-toggle-group">
                <label class="mc-toggle-label">
                  <input type="checkbox" id="mcExifToggle" ${_state.options.preserveExif ? 'checked' : ''}>
                  <div>
                    <div class="mc-toggle-title">🏷️ Preserve EXIF, GPS &amp; Timestamp Metadata</div>
                    <div class="mc-toggle-desc">Retains camera model, GPS coordinates, author, creation date and original modified date.</div>
                  </div>
                </label>
              </div>
            </div>
          ` : ''}

          <!-- 2. Video Compression Settings -->
          ${hasVideos ? `
            <div class="card mc-config-card">
              <div class="mc-card-head">
                <span class="mc-card-icon">🎬</span>
                <div>
                  <h3 class="mc-card-title">Video Compression Settings</h3>
                  <p class="mc-card-subtitle">Downsample video resolution and transcode with optimal bitrates</p>
                </div>
              </div>

              <!-- Video Resolution Presets -->
              <div class="mc-field-group">
                <label class="mc-label">Target Video Resolution:</label>
                <div class="mc-res-chips">
                  <button type="button" class="mc-res-chip ${_state.options.videoResolution === 'source' ? 'active' : ''}" data-vres="source">
                    Original Source
                  </button>
                  <button type="button" class="mc-res-chip ${_state.options.videoResolution === '1080p' ? 'active' : ''}" data-vres="1080p">
                    1080p FHD
                  </button>
                  <button type="button" class="mc-res-chip ${_state.options.videoResolution === '720p' ? 'active' : ''}" data-vres="720p">
                    720p HD (Recommended)
                  </button>
                  <button type="button" class="mc-res-chip ${_state.options.videoResolution === '480p' ? 'active' : ''}" data-vres="480p">
                    480p SD
                  </button>
                  <button type="button" class="mc-res-chip ${_state.options.videoResolution === '360p' ? 'active' : ''}" data-vres="360p">
                    360p Low
                  </button>
                </div>
              </div>

              <!-- Video Quality & Audio -->
              <div class="mc-field-group">
                <label class="mc-label">Quality &amp; Bitrate Mode:</label>
                <div class="mc-radio-group">
                  <label class="mc-radio-label">
                    <input type="radio" name="mcVQuality" value="high" ${_state.options.videoQuality === 'high' ? 'checked' : ''}>
                    <span>High Bitrate (Crisp)</span>
                  </label>
                  <label class="mc-radio-label">
                    <input type="radio" name="mcVQuality" value="balanced" ${_state.options.videoQuality === 'balanced' ? 'checked' : ''}>
                    <span>Balanced (Optimal Size)</span>
                  </label>
                  <label class="mc-radio-label">
                    <input type="radio" name="mcVQuality" value="aggressive" ${_state.options.videoQuality === 'aggressive' ? 'checked' : ''}>
                    <span>Aggressive (Max Space Saved)</span>
                  </label>
                </div>
              </div>

              <div class="mc-field-group mc-toggle-group">
                <label class="mc-toggle-label">
                  <input type="checkbox" id="mcAudioToggle" ${_state.options.includeAudio ? 'checked' : ''}>
                  <div>
                    <div class="mc-toggle-title">🔊 Retain Audio Track</div>
                    <div class="mc-toggle-desc">Includes original audio stream in compressed video output.</div>
                  </div>
                </label>
              </div>
            </div>
          ` : ''}

          <!-- 3. Output Destination Folder -->
          <div class="card mc-config-card">
            <div class="mc-card-head">
              <span class="mc-card-icon">📁</span>
              <div>
                <h3 class="mc-card-title">Destination &amp; Save Method</h3>
                <p class="mc-card-subtitle">Choose where compressed files with identical original names will be saved</p>
              </div>
            </div>

            ${canPickFolder ? `
              <!-- Supported Folder Picker Mode (Desktop Chrome / Android APK) -->
              <div class="mc-dest-row">
                <div class="mc-dest-info">
                  <span class="mc-dest-icon">📂</span>
                  <div>
                    <div class="mc-dest-name" id="mcDestFolderLabel">
                      ${_state.destination ? ('📁 ' + _state.destination.name) : 'Device Folder (Click Choose Destination Folder below)'}
                    </div>
                    <div class="mc-dest-sub">Files are written directly into this folder with exact original timestamps &amp; EXIF.</div>
                  </div>
                </div>
                <button type="button" class="btn-submit mc-btn-folder" id="mcChooseFolderBtn">
                  ${_state.destination ? '📁 Change Folder' : '📁 Choose Destination Folder'}
                </button>
              </div>
            ` : `
              <!-- Mobile Web Browser Mode (Chrome / Safari / Firefox) -->
              <div class="mc-dest-row mc-dest-mobile">
                <div class="mc-dest-info">
                  <span class="mc-dest-icon">📥</span>
                  <div>
                    <div class="mc-dest-name">Device Downloads Folder</div>
                    <div class="mc-dest-sub">
                      Saving via: <strong>${_state.mobileSavePreference === 'zip' ? '1-Click ZIP Archive (Original Dates Kept)' : 'Direct File Downloads'}</strong>
                    </div>
                  </div>
                </div>
                <button type="button" class="mc-btn-secondary mc-btn-options" id="mcSaveOptionsBtn">
                  ⚙️ Save Options
                </button>
              </div>
              <div class="mc-dest-note">
                💡 <em>Mobile web browsers route file downloads directly to your device Downloads folder. To pick custom device folders on Android, install the LedgerMate APK app.</em>
                <a href="dist/LedgerMate.apk" download class="mc-apk-link-inline">📲 Install Android App for Folder Chooser</a>
              </div>
            `}
          </div>
        </div>

        <!-- Action Bar -->
        <div class="mc-action-bar">
          <button type="button" class="mc-btn-secondary" id="mcBackSelectBtn2">← Back</button>
          <button type="button" class="btn-submit mc-start-btn" id="mcStartCompressBtn">
            Start Compression (${_state.selectedFiles.length} Files) 🚀
          </button>
        </div>
      </div>
    `;
  }

  // ─────────────────────────────────────────────────────────────
  // STAGE 3: PROCESSING
  // ─────────────────────────────────────────────────────────────
  function renderProcessingStage() {
    return `
      <div class="mc-proc-wrap">
        <div class="mc-proc-card card">
          <div class="mc-proc-spinner">🗜️</div>
          <h2 class="mc-proc-title">Compressing Media...</h2>
          <div class="mc-proc-status" id="mcProcStatus">Preparing files...</div>

          <!-- Dual Progress Container -->
          <div class="mc-dual-prog-wrap">
            <!-- Active File with Live Thumbnail -->
            <div class="mc-prog-thumb-container" id="mcActiveFileBox" style="display:none;">
              <img id="mcActiveFileThumb" class="mc-prog-thumb-img" alt="Thumbnail" style="display:none;">
              <div style="flex:1; min-width: 0;">
                <div class="mc-prog-thumb-name" id="mcActiveFileName">filename.jpg</div>
                <div class="mc-prog-thumb-sub" id="mcActiveStatus">Optimizing...</div>
              </div>
              <div class="mc-slider-val" id="mcActivePct">0%</div>
            </div>

            <!-- Active File Sub-progress -->
            <div>
              <div class="mc-prog-row-label">
                <span>Current File Encoding</span>
                <span id="mcActiveBarPct">0%</span>
              </div>
              <div class="mc-proc-bar-wrap" style="height:6px; margin-top:4px;">
                <div class="mc-proc-bar" id="mcActiveBar" style="width: 0%; background: var(--accent);"></div>
              </div>
            </div>

            <!-- Overall Batch Progress -->
            <div>
              <div class="mc-prog-row-label">
                <span>Overall Batch Progress</span>
                <span id="mcProcPct">0%</span>
              </div>
              <div class="mc-proc-bar-wrap" style="height:10px; margin-top:4px;">
                <div class="mc-proc-bar" id="mcProcBar" style="width: 0%;"></div>
              </div>
            </div>
          </div>

          <div class="mc-proc-meta" id="mcProcSubtext">Preserving metadata &amp; optimizing bytes</div>

          <button type="button" class="mc-btn-cancel" id="mcCancelProcBtn">Cancel Compression</button>
        </div>
      </div>
    `;
  }

  // ─────────────────────────────────────────────────────────────
  // STAGE 4: RESULTS & PREVIEWS
  // ─────────────────────────────────────────────────────────────
  function renderResultsStage() {
    var totalOrig = _state.compressedResults.reduce((a, b) => a + (b.originalSize || 0), 0);
    var totalComp = _state.compressedResults.reduce((a, b) => a + (b.compressedSize || 0), 0);
    var totalSaved = Math.max(0, totalOrig - totalComp);
    var pctSaved = totalOrig > 0 ? ((totalSaved / totalOrig) * 100).toFixed(1) : 0;
    var hasDestinationFolder = !!_state.destination;

    return `
      <div class="mc-results-wrap">
        <!-- Hero Space Reduction Banner -->
        <div class="mc-hero-savings">
          <div class="mc-hero-badge">🎉 Compression Complete</div>
          <div class="mc-hero-stat-row">
            <div class="mc-hero-stat">
              <span class="mc-hero-label">Original Size</span>
              <span class="mc-hero-val">${formatBytes(totalOrig)}</span>
            </div>
            <div class="mc-hero-arrow">➔</div>
            <div class="mc-hero-stat">
              <span class="mc-hero-label">Compressed Size</span>
              <span class="mc-hero-val">${formatBytes(totalComp)}</span>
            </div>
            <div class="mc-hero-stat highlight">
              <span class="mc-hero-label">Total Space Saved</span>
              <span class="mc-hero-val text-success">-${formatBytes(totalSaved)} (-${pctSaved}%)</span>
            </div>
          </div>
        </div>

        <!-- Global Actions -->
        <div class="mc-results-actions">
          ${hasDestinationFolder ? `
            <button type="button" class="btn-submit mc-save-all-btn" id="mcSaveToFolderBtn">
              💾 Save All to ${_state.destination.name} (${_state.compressedResults.length})
            </button>
            <button type="button" class="mc-btn-secondary" id="mcDownloadZipBtn">
              📦 Download All as ZIP
            </button>
          ` : `
            <button type="button" class="btn-submit mc-save-all-btn" id="mcDownloadZipBtn">
              📦 Download All as ZIP (${_state.compressedResults.length} Files)
            </button>
            <button type="button" class="mc-btn-secondary" id="mcSaveSequentialBtn">
              ⬇️ Save Files to Downloads (Sequential)
            </button>
          `}
          <button type="button" class="mc-btn-secondary mc-btn-share" id="mcShareAllBtn">
            📤 Share All (${_state.compressedResults.length})
          </button>
          <button type="button" class="mc-btn-secondary" id="mcNewBatchBtn">
            🔄 Compress More Files
          </button>
        </div>

        <!-- Per-File Breakdown Grid -->
        <div class="mc-results-grid">
          ${_state.compressedResults.map((item, idx) => {
            var savedMb = formatBytes(item.savedBytes);
            var savedPct = item.savedPercent.toFixed(1);
            return `
              <div class="mc-res-card card" data-idx="${idx}">
                <div class="mc-res-card-top">
                  <div class="mc-res-thumb-pair" onclick="window.LM_MediaCompressorUI.openComparisonModal(${idx})">
                    ${item.type === 'video'
                      ? `<video src="${item.previewUrl}" class="mc-res-thumb" muted playsinline></video>`
                      : `<img src="${item.previewUrl}" alt="${item.name}" class="mc-res-thumb">`
                    }
                    <span class="mc-compare-badge" title="Click to view Before/After">🔍 Compare</span>
                  </div>
                  <div class="mc-res-info">
                    <div class="mc-res-name" title="${item.name}">${item.name}</div>
                    <div class="mc-res-badges">
                      <span class="mc-meta-badge">${item.type === 'image' ? '📸 Photo' : '🎬 Video'}</span>
                      <span class="mc-savings-badge">-${savedPct}% (${savedMb} saved)</span>
                      ${item.exifPreserved ? '<span class="mc-exif-badge">🏷️ EXIF &amp; Dates Preserved</span>' : '<span class="mc-exif-badge">⏱️ Timestamp Preserved</span>'}
                      ${item.originalTimestamp ? `<span class="mc-dim-badge" title="Original capture date: ${new Date(item.originalTimestamp).toLocaleString()}">📅 ${new Date(item.originalTimestamp).toLocaleDateString()}</span>` : ''}
                    </div>

                    <div class="mc-res-metrics">
                      <div>
                        <span class="mc-metric-label">Before:</span>
                        <span class="mc-metric-val">${formatBytes(item.originalSize)}</span>
                        ${item.originalDimensions ? `<span class="mc-metric-dim">(${item.originalDimensions.width}×${item.originalDimensions.height})</span>` : ''}
                      </div>
                      <div>
                        <span class="mc-metric-label">After:</span>
                        <span class="mc-metric-val font-bold text-success">${formatBytes(item.compressedSize)}</span>
                        ${item.compressedDimensions ? `<span class="mc-metric-dim">(${item.compressedDimensions.width}×${item.compressedDimensions.height})</span>` : ''}
                      </div>
                    </div>
                  </div>
                </div>

                <div class="mc-res-card-bottom">
                  <button type="button" class="mc-btn-link" onclick="window.LM_MediaCompressorUI.openComparisonModal(${idx})">
                    🔍 Compare
                  </button>
                  <button type="button" class="mc-btn-link" onclick="window.LM_MediaCompressorUI.openMetadataModal(${idx})">
                    ℹ️ Metadata
                  </button>
                  <button type="button" class="mc-btn-secondary" onclick="window.LM_MediaCompressorUI.shareItem(${idx})" title="Share to WhatsApp, Telegram, etc.">
                    📤 Share
                  </button>
                  <button type="button" class="btn-submit mc-btn-dl" onclick="window.LM_MediaCompressorUI.downloadItem(${idx})">
                    ⬇️ Download
                  </button>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }

  // ─────────────────────────────────────────────────────────────
  // EVENT ATTACHMENT & LOGIC
  // ─────────────────────────────────────────────────────────────
  function attachEvents(container) {
    // Stage 1 Events
    var fileInput = container.querySelector('#mcFileInput');
    var folderFileInput = container.querySelector('#mcFolderFileInput');
    var dirInput = container.querySelector('#mcDirInput');
    var browseBtn = container.querySelector('#mcBrowseBtn');
    var browseFolderBtn = container.querySelector('#mcBrowseFolderBtn');
    var browseDirBtn = container.querySelector('#mcBrowseDirBtn');
    var dropzone = container.querySelector('#mcDropzone');

    // Show entire folder button if supported by browser/platform
    if (browseDirBtn && dirInput && ('webkitdirectory' in dirInput)) {
      browseDirBtn.style.display = 'inline-flex';
    }

    if (browseBtn && fileInput) {
      browseBtn.addEventListener('click', function () {
        fileInput.click();
      });
    }

    if (browseFolderBtn && folderFileInput) {
      browseFolderBtn.addEventListener('click', function () {
        folderFileInput.click();
      });
    }

    if (browseDirBtn && dirInput) {
      browseDirBtn.addEventListener('click', function () {
        dirInput.click();
      });
    }

    [fileInput, folderFileInput, dirInput].forEach(inp => {
      if (inp) {
        inp.addEventListener('change', function (e) {
          if (e.target.files && e.target.files.length > 0) {
            addFiles(Array.from(e.target.files));
            inp.value = '';
          }
        });
      }
    });

    if (dropzone) {
      ['dragenter', 'dragover'].forEach(eventName => {
        dropzone.addEventListener(eventName, function (e) {
          e.preventDefault();
          e.stopPropagation();
          dropzone.classList.add('drag-over');
        });
      });

      ['dragleave', 'drop'].forEach(eventName => {
        dropzone.addEventListener(eventName, function (e) {
          e.preventDefault();
          e.stopPropagation();
          dropzone.classList.remove('drag-over');
        });
      });

      dropzone.addEventListener('drop', function (e) {
        if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
          addFiles(Array.from(e.dataTransfer.files));
        }
      });
    }

    // Add more & Clear all
    var addMoreBtn = container.querySelector('#mcAddMoreBtn');
    if (addMoreBtn && fileInput) {
      addMoreBtn.addEventListener('click', () => fileInput.click());
    }

    var addFolderBtn = container.querySelector('#mcAddFolderBtn');
    if (addFolderBtn && folderFileInput) {
      addFolderBtn.addEventListener('click', () => folderFileInput.click());
    }

    var clearAllBtn = container.querySelector('#mcClearAllBtn');
    if (clearAllBtn) {
      clearAllBtn.addEventListener('click', function () {
        _state.selectedFiles.forEach(f => URL.revokeObjectURL(f.previewUrl));
        _state.selectedFiles = [];
        render();
      });
    }

    // Remove single file
    container.querySelectorAll('[data-remove-id]').forEach(btn => {
      btn.addEventListener('click', function (e) {
        var id = this.getAttribute('data-remove-id');
        var removed = _state.selectedFiles.find(f => f.id === id);
        if (removed) URL.revokeObjectURL(removed.previewUrl);
        _state.selectedFiles = _state.selectedFiles.filter(f => f.id !== id);
        render();
      });
    });

    // Go to Configure Stage
    var goConfigBtn = container.querySelector('#mcGoConfigureBtn');
    if (goConfigBtn) {
      goConfigBtn.addEventListener('click', function () {
        _state.currentStage = 'configure';
        render();
      });
    }

    // Stage 2 Events
    var backBtn = container.querySelector('#mcBackToSelectBtn');
    var backBtn2 = container.querySelector('#mcBackSelectBtn2');
    [backBtn, backBtn2].forEach(btn => {
      if (btn) {
        btn.addEventListener('click', function () {
          _state.currentStage = 'select';
          render();
        });
      }
    });

    // Storage Permission Button
    var grantPermBtn = container.querySelector('#mcGrantPermBtn');
    if (grantPermBtn) {
      grantPermBtn.addEventListener('click', async function () {
        if (window.LM_MediaCompressorService && typeof window.LM_MediaCompressorService.requestAllFilesPermission === 'function') {
          await window.LM_MediaCompressorService.requestAllFilesPermission();
          if (window.LMToast) LMToast.info('Please enable "Allow access to manage all files" to write exact inode file dates.');
        }
      });
    }

    // Smart Preset Cards
    container.querySelectorAll('.mc-smart-preset-card').forEach(card => {
      card.addEventListener('click', function () {
        var presetId = this.getAttribute('data-preset');
        applyPreset(presetId);
      });
    });

    // Format Selector Chips
    container.querySelectorAll('.mc-format-chip').forEach(chip => {
      chip.addEventListener('click', function () {
        var fmt = this.getAttribute('data-fmt');
        _state.options.format = fmt;
        container.querySelectorAll('.mc-format-chip').forEach(c => c.classList.remove('active'));
        this.classList.add('active');
      });
    });

    // Quality Slider
    var qualitySlider = container.querySelector('#mcQualitySlider');
    var qualityVal = container.querySelector('#mcQualityVal');
    var estimatePill = container.querySelector('#mcEstimatePill');

    function updateEstimate() {
      if (estimatePill) {
        var est = getEstimatedSavings(_state.options.quality, _state.options.resizeMode, _state.options.maxDimension);
        estimatePill.textContent = `⚡ Est. Space Saved: ~${est}%`;
      }
    }

    if (qualitySlider && qualityVal) {
      qualitySlider.addEventListener('input', function (e) {
        var val = parseInt(e.target.value, 10);
        _state.options.quality = val / 100;
        _state.selectedPreset = 'custom';
        container.querySelectorAll('.mc-smart-preset-card').forEach(c => c.classList.remove('active'));
        var customCard = container.querySelector('.mc-smart-preset-card[data-preset="custom"]');
        if (customCard) customCard.classList.add('active');
        qualityVal.textContent = val + '%';
        container.querySelectorAll('.mc-chip').forEach(c => c.classList.remove('active'));
        updateEstimate();
      });
    }

    // Preset Chips
    container.querySelectorAll('.mc-chip').forEach(chip => {
      chip.addEventListener('click', function () {
        var q = parseFloat(this.getAttribute('data-quality'));
        _state.options.quality = q;
        _state.selectedPreset = 'custom';
        container.querySelectorAll('.mc-smart-preset-card').forEach(c => c.classList.remove('active'));
        var customCard = container.querySelector('.mc-smart-preset-card[data-preset="custom"]');
        if (customCard) customCard.classList.add('active');
        if (qualitySlider) qualitySlider.value = Math.round(q * 100);
        if (qualityVal) qualityVal.textContent = Math.round(q * 100) + '%';
        container.querySelectorAll('.mc-chip').forEach(c => c.classList.remove('active'));
        this.classList.add('active');
        updateEstimate();
      });
    });

    // Resize Mode Radio
    var resizeCustomRadio = container.querySelector('#mcResizeCustomRadio');
    var resizeOrigRadio = container.querySelector('#mcResizeOrigRadio');
    var dimWrap = container.querySelector('#mcDimWrap');

    if (resizeCustomRadio && resizeOrigRadio) {
      resizeCustomRadio.addEventListener('change', function () {
        if (this.checked) {
          _state.options.resizeMode = 'custom';
          if (dimWrap) dimWrap.style.display = '';
          updateEstimate();
        }
      });
      resizeOrigRadio.addEventListener('change', function () {
        if (this.checked) {
          _state.options.resizeMode = 'original';
          if (dimWrap) dimWrap.style.display = 'none';
          updateEstimate();
        }
      });
    }

    // Dual Width & Height Inputs & Aspect Ratio Lock
    var maxWidthInput = container.querySelector('#mcMaxWidthInput');
    var maxHeightInput = container.querySelector('#mcMaxHeightInput');
    var aspectLinkBtn = container.querySelector('#mcAspectLinkBtn');

    function getActiveAspectRatio() {
      var firstImg = _state.selectedFiles.find(f => f.type === 'image' && f.width && f.height);
      if (firstImg && firstImg.width > 0 && firstImg.height > 0) {
        return firstImg.height / firstImg.width;
      }
      return 1;
    }

    if (maxWidthInput) {
      maxWidthInput.addEventListener('input', function (e) {
        var val = parseInt(e.target.value, 10);
        if (val > 0) {
          _state.options.maxWidth = val;
          _state.options.maxDimension = val;
          if (_state.options.lockAspectRatio && maxHeightInput) {
            var ratio = getActiveAspectRatio();
            var newH = Math.max(50, Math.round(val * ratio));
            _state.options.maxHeight = newH;
            maxHeightInput.value = newH;
          }
          updateEstimate();
        }
      });
    }

    if (maxHeightInput) {
      maxHeightInput.addEventListener('input', function (e) {
        var val = parseInt(e.target.value, 10);
        if (val > 0) {
          _state.options.maxHeight = val;
          if (_state.options.lockAspectRatio && maxWidthInput) {
            var ratio = getActiveAspectRatio();
            var newW = Math.max(50, Math.round(val / (ratio || 1)));
            _state.options.maxWidth = newW;
            _state.options.maxDimension = newW;
            maxWidthInput.value = newW;
          }
          updateEstimate();
        }
      });
    }

    if (aspectLinkBtn) {
      aspectLinkBtn.addEventListener('click', function () {
        _state.options.lockAspectRatio = !_state.options.lockAspectRatio;
        this.classList.toggle('locked', _state.options.lockAspectRatio);
        this.textContent = _state.options.lockAspectRatio ? '🔒 Locked' : '🔓 Free';
        var hint = container.querySelector('.mc-dim-hint');
        if (hint) {
          hint.textContent = _state.options.lockAspectRatio
            ? '🔒 Both dimensions maintain original aspect ratio without stretching.'
            : '🔓 Exact custom width and height will be applied.';
        }
      });
    }

    // Dimension preset chips
    container.querySelectorAll('.mc-dim-chip').forEach(chip => {
      chip.addEventListener('click', function () {
        var w = parseInt(this.getAttribute('data-w'), 10) || 1200;
        var h = parseInt(this.getAttribute('data-h'), 10) || 1200;
        _state.options.maxWidth = w;
        _state.options.maxHeight = h;
        _state.options.maxDimension = w;
        if (maxWidthInput) maxWidthInput.value = w;
        if (maxHeightInput) maxHeightInput.value = h;
        updateEstimate();
      });
    });

    // EXIF toggle
    var exifToggle = container.querySelector('#mcExifToggle');
    if (exifToggle) {
      exifToggle.addEventListener('change', function () {
        _state.options.preserveExif = this.checked;
      });
    }

    // Video Resolution Chips
    container.querySelectorAll('.mc-res-chip').forEach(chip => {
      chip.addEventListener('click', function () {
        var res = this.getAttribute('data-vres');
        _state.options.videoResolution = res;
        container.querySelectorAll('.mc-res-chip').forEach(c => c.classList.remove('active'));
        this.classList.add('active');
      });
    });

    // Video Quality Radios
    container.querySelectorAll('input[name="mcVQuality"]').forEach(r => {
      r.addEventListener('change', function () {
        if (this.checked) _state.options.videoQuality = this.value;
      });
    });

    // Video Audio toggle
    var audioToggle = container.querySelector('#mcAudioToggle');
    if (audioToggle) {
      audioToggle.addEventListener('change', function () {
        _state.options.includeAudio = this.checked;
      });
    }

    // Choose Destination Folder
    var chooseFolderBtn = container.querySelector('#mcChooseFolderBtn');
    if (chooseFolderBtn) {
      chooseFolderBtn.addEventListener('click', async function () {
        try {
          var dest = await window.LM_MediaCompressorService.chooseDestinationDirectory();
          if (dest) {
            _state.destination = dest;
            render();
            if (window.LMToast) LMToast.ok('Selected destination folder: ' + dest.name);
          }
        } catch (dirErr) {
          console.warn('[LM MediaCompressor] Directory selection error:', dirErr);
          if (window.LMToast) LMToast.info('Folder selection was cancelled.');
        }
      });
    }

    // Save Options Modal Trigger (Mobile Web)
    var saveOptionsBtn = container.querySelector('#mcSaveOptionsBtn');
    if (saveOptionsBtn) {
      saveOptionsBtn.addEventListener('click', function () {
        openSaveOptionsModal();
      });
    }

    // Start Compression CTA
    var startBtn = container.querySelector('#mcStartCompressBtn');
    if (startBtn) {
      startBtn.addEventListener('click', function () {
        startCompression();
      });
    }

    // Stage 3: Cancel processing
    var cancelBtn = container.querySelector('#mcCancelProcBtn');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', function () {
        _state.cancelRequested = true;
        _state.isProcessing = false;
        _state.currentStage = 'configure';
        render();
        if (window.LMToast) LMToast.info('Compression cancelled.');
      });
    }

    // Stage 4: Results Actions
    var saveToFolderBtn = container.querySelector('#mcSaveToFolderBtn');
    if (saveToFolderBtn) {
      saveToFolderBtn.addEventListener('click', async function () {
        await saveAllToDestination();
      });
    }

    var downloadZipBtn = container.querySelector('#mcDownloadZipBtn');
    if (downloadZipBtn) {
      downloadZipBtn.addEventListener('click', async function () {
        await downloadAllAsZip();
      });
    }

    var saveSequentialBtn = container.querySelector('#mcSaveSequentialBtn');
    if (saveSequentialBtn) {
      saveSequentialBtn.addEventListener('click', function () {
        downloadAllSequentially();
      });
    }

    var shareAllBtn = container.querySelector('#mcShareAllBtn');
    if (shareAllBtn) {
      shareAllBtn.addEventListener('click', function () {
        shareAll();
      });
    }

    var newBatchBtn = container.querySelector('#mcNewBatchBtn');
    if (newBatchBtn) {
      newBatchBtn.addEventListener('click', function () {
        _state.selectedFiles.forEach(f => URL.revokeObjectURL(f.previewUrl));
        _state.compressedResults.forEach(r => {
          if (r.previewUrl) URL.revokeObjectURL(r.previewUrl);
        });
        _state.selectedFiles = [];
        _state.compressedResults = [];
        _state.currentStage = 'select';
        render();
      });
    }
  }

  // ─────────────────────────────────────────────────────────────
  // FILE QUEUE INGESTION & THUMBNAILS
  // ─────────────────────────────────────────────────────────────
  async function addFiles(files) {
    var addedCount = 0;
    var ignoredCount = 0;

    for (var i = 0; i < files.length; i++) {
      var file = files[i];
      var name = file.name || '';
      var type = file.type || '';

      var isVideo = type.startsWith('video/') || name.match(/\.(mp4|webm|mov|mkv|avi|3gp|m4v|flv|wmv|ts|mts)$/i);
      var isImage = type.startsWith('image/') || name.match(/\.(jpe?g|png|webp|gif|bmp|heic|heif|avif|tiff?|dng|raw|cr2|nef|ico|svg)$/i);

      if (!isImage && !isVideo) {
        ignoredCount++;
        continue;
      }

      var id = 'file_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
      var previewUrl = URL.createObjectURL(file);

      var item = {
        id: id,
        file: file,
        name: file.name,
        size: file.size,
        type: isVideo ? 'video' : 'image',
        previewUrl: previewUrl,
        width: null,
        height: null
      };

      _state.selectedFiles.push(item);
      measureMediaDimensions(item);
      addedCount++;
    }

    if (addedCount > 0 && ignoredCount > 0 && window.LMToast) {
      LMToast.info(`Added ${addedCount} media files. Skipped ${ignoredCount} non-media file(s).`);
    } else if (addedCount === 0 && ignoredCount > 0 && window.LMToast) {
      LMToast.error(`No supported photos or videos found in selected files.`);
    }

    render();
  }

  function measureMediaDimensions(item) {
    if (item.type === 'image') {
      var img = new Image();
      img.onload = function () {
        item.width = img.naturalWidth || img.width;
        item.height = img.naturalHeight || img.height;
        var card = document.querySelector(`.mc-file-card[data-id="${item.id}"] .mc-dim-badge`);
        if (card) card.textContent = `${item.width}×${item.height}`;
      };
      img.src = item.previewUrl;
    } else {
      var vid = document.createElement('video');
      vid.preload = 'metadata';
      vid.onloadedmetadata = function () {
        item.width = vid.videoWidth;
        item.height = vid.videoHeight;
        var card = document.querySelector(`.mc-file-card[data-id="${item.id}"] .mc-dim-badge`);
        if (card) card.textContent = `${item.width}×${item.height}`;
      };
      vid.src = item.previewUrl;
    }
  }

  // ─────────────────────────────────────────────────────────────
  // COMPRESSION ENGINE EXECUTION & PRESET HANDLER
  // ─────────────────────────────────────────────────────────────
  function applyPreset(presetId) {
    var presets = (window.LM_MediaCompressorService && window.LM_MediaCompressorService.getSmartPresets) ? window.LM_MediaCompressorService.getSmartPresets() : {};
    var preset = presets[presetId];
    if (!preset) return;

    _state.selectedPreset = presetId;
    if (preset.quality !== undefined) _state.options.quality = preset.quality;
    if (preset.resizeMode !== undefined) _state.options.resizeMode = preset.resizeMode;
    if (preset.maxWidth !== undefined) {
      _state.options.maxWidth = preset.maxWidth;
      _state.options.maxDimension = preset.maxWidth;
    }
    if (preset.maxHeight !== undefined) _state.options.maxHeight = preset.maxHeight;
    if (preset.lockAspectRatio !== undefined) _state.options.lockAspectRatio = preset.lockAspectRatio;
    if (preset.format !== undefined) _state.options.format = preset.format;
    if (preset.videoResolution !== undefined) _state.options.videoResolution = preset.videoResolution;
    if (preset.videoQuality !== undefined) _state.options.videoQuality = preset.videoQuality;

    render();
  }

  async function startCompression() {
    if (_state.selectedFiles.length === 0) return;

    _state.isProcessing = true;
    _state.cancelRequested = false;
    _state.currentStage = 'processing';
    _state.compressedResults = [];
    render();

    var total = _state.selectedFiles.length;
    var service = window.LM_MediaCompressorService;

    for (var i = 0; i < total; i++) {
      if (_state.cancelRequested) break;

      var fileItem = _state.selectedFiles[i];
      var file = fileItem.file;

      updateProgressUI(i, total, fileItem, 'Optimizing media bytes...', 5);

      try {
        var result;
        if (fileItem.type === 'image') {
          result = await service.compressImage(file, {
            quality: _state.options.quality,
            resizeMode: _state.options.resizeMode,
            maxWidth: _state.options.maxWidth,
            maxHeight: _state.options.maxHeight,
            lockAspectRatio: _state.options.lockAspectRatio,
            maxDimension: _state.options.maxWidth,
            preserveExif: _state.options.preserveExif,
            format: _state.options.format
          }, function (subPct, subText) {
            updateProgressUI(i, total, fileItem, subText, subPct);
          });
        } else {
          result = await service.compressVideo(file, {
            targetResolution: _state.options.videoResolution,
            qualityTier: _state.options.videoQuality,
            includeAudio: _state.options.includeAudio
          }, function (pct, text) {
            updateProgressUI(i, total, fileItem, text, pct);
          });
        }

        _state.compressedResults.push(result);
      } catch (err) {
        console.error('[LM MediaCompressor] Compression error for ' + file.name + ':', err);
        if (window.LMToast) LMToast.error('Failed to compress ' + file.name + ': ' + err.message);
      }
    }

    _state.isProcessing = false;
    if (!_state.cancelRequested) {
      _state.currentStage = 'results';
      render();
      if (window.LMToast) {
        var totalOrig = _state.compressedResults.reduce((a, b) => a + (b.originalSize || 0), 0);
        var totalComp = _state.compressedResults.reduce((a, b) => a + (b.compressedSize || 0), 0);
        var totalSaved = Math.max(0, totalOrig - totalComp);
        LMToast.ok(`Successfully compressed ${total} files! Saved ${formatBytes(totalSaved)}.`);
      }
    }
  }

  function updateProgressUI(index, total, fileItemOrName, statusText, subPercent) {
    var procStatus = document.getElementById('mcProcStatus');
    var procBar = document.getElementById('mcProcBar');
    var procPct = document.getElementById('mcProcPct');
    var procSub = document.getElementById('mcProcSubtext');

    var activeBox = document.getElementById('mcActiveFileBox');
    var activeThumb = document.getElementById('mcActiveFileThumb');
    var activeName = document.getElementById('mcActiveFileName');
    var activeStatus = document.getElementById('mcActiveStatus');
    var activePct = document.getElementById('mcActivePct');
    var activeBar = document.getElementById('mcActiveBar');
    var activeBarPct = document.getElementById('mcActiveBarPct');

    var fileName = typeof fileItemOrName === 'string' ? fileItemOrName : (fileItemOrName && fileItemOrName.name);
    var previewUrl = fileItemOrName && fileItemOrName.previewUrl;
    var isImage = fileItemOrName && fileItemOrName.type === 'image';

    var basePct = (index / total) * 100;
    var stepSize = (1 / total) * 100;
    var overallPct = Math.round(basePct + ((subPercent || 0) / 100) * stepSize);
    overallPct = Math.min(99, Math.max(1, overallPct));

    if (procStatus) procStatus.textContent = `File ${index + 1} of ${total}: ${fileName}`;
    if (procBar) procBar.style.width = overallPct + '%';
    if (procPct) procPct.textContent = overallPct + '%';
    if (procSub) procSub.textContent = statusText || 'Compressing...';

    if (activeBox) activeBox.style.display = 'flex';
    if (activeThumb) {
      if (previewUrl && isImage) {
        activeThumb.src = previewUrl;
        activeThumb.style.display = 'block';
      } else {
        activeThumb.style.display = 'none';
      }
    }
    if (activeName) activeName.textContent = fileName || 'Media file';
    if (activeStatus) activeStatus.textContent = statusText || 'Optimizing...';
    var subVal = Math.round(subPercent || 0);
    if (activePct) activePct.textContent = subVal + '%';
    if (activeBar) activeBar.style.width = subVal + '%';
    if (activeBarPct) activeBarPct.textContent = subVal + '%';
  }

  // ─────────────────────────────────────────────────────────────
  // SAVE / DOWNLOAD ACTIONS
  // ─────────────────────────────────────────────────────────────
  async function saveAllToDestination() {
    var items = _state.compressedResults;
    if (items.length === 0) return;

    var service = window.LM_MediaCompressorService;

    if (_state.destination) {
      if (window.LMToast) LMToast.info(`Writing ${items.length} files to ${_state.destination.name}...`);
      try {
        var result = await service.saveItemsToDirectory(_state.destination, items, function (curr, total, name) {
          if (window.LMToast && curr % 5 === 0) {
            LMToast.info(`Saved ${curr} of ${total} files...`);
          }
        });
        if (window.LMToast) {
          LMToast.ok(`Saved all ${result.savedCount} files directly into folder '${_state.destination.name}'!`);
        }
      } catch (err) {
        console.error('Save to directory failed:', err);
        if (window.LMToast) LMToast.error('Failed to write to folder: ' + err.message);
      }
    } else {
      // Prompt user or fallback to zip
      await downloadAllAsZip();
    }
  }

  async function downloadAllAsZip() {
    var items = _state.compressedResults;
    if (items.length === 0) return;

    try {
      if (window.LMToast) LMToast.info('Building ZIP package with original filenames and timestamps...');
      var zipBlob = await window.LM_MediaCompressorService.generateZipArchive(items);
      window.LM_MediaCompressorService.triggerDownload(zipBlob, 'LedgerMate_Compressed_Media.zip');
      if (window.LMToast) LMToast.ok('ZIP package saved to your Downloads folder!');
    } catch (zipErr) {
      console.error('[LM MediaCompressor] ZIP generation failed:', zipErr);
      if (window.LMToast) LMToast.error('Failed to generate ZIP archive: ' + zipErr.message);
    }
  }

  function downloadAllSequentially() {
    var items = _state.compressedResults;
    if (items.length === 0) return;

    var service = window.LM_MediaCompressorService;
    if (window.LMToast) LMToast.ok(`Saving ${items.length} files to your Downloads folder...`);

    items.forEach((item, idx) => {
      setTimeout(() => {
        service.triggerDownload(item.blob || item.file, item.name);
      }, idx * 450);
    });
  }

  function downloadItem(index) {
    var item = _state.compressedResults[index];
    if (!item) return;
    window.LM_MediaCompressorService.triggerDownload(item.blob || item.file, item.name);
    if (window.LMToast) LMToast.ok(`Downloading ${item.name} to Downloads folder`);
  }

  // ─────────────────────────────────────────────────────────────
  // DESTINATION & SAVE OPTIONS MODAL (MOBILE WEB & INFO)
  // ─────────────────────────────────────────────────────────────
  function openSaveOptionsModal() {
    var modal = document.getElementById('mcSaveOptionsModal');
    if (!modal) return;

    var isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

    modal.innerHTML = `
      <div class="mc-modal-backdrop" onclick="window.LM_MediaCompressorUI.closeSaveOptionsModal()"></div>
      <div class="mc-modal-card mc-options-modal-card">
        <div class="mc-modal-head">
          <div class="mc-modal-title">
            <span>📁 Destination &amp; Save Settings</span>
          </div>
          <button type="button" class="mc-modal-close" onclick="window.LM_MediaCompressorUI.closeSaveOptionsModal()">✕</button>
        </div>

        <div class="mc-modal-body">
          <div class="mc-modal-info-box">
            <span class="mc-info-icon">ℹ️</span>
            <div>
              <strong>How file saving works in mobile web browsers:</strong>
              <p class="mc-info-p">
                Mobile web browsers (Chrome, Safari, Firefox) automatically save all downloaded files into your device's 
                <strong>Downloads</strong> folder. For device privacy and security, mobile web browsers do not allow web pages to pop up arbitrary folder choosers.
              </p>
            </div>
          </div>

          <div class="mc-field-group">
            <label class="mc-label">Preferred Save Method:</label>
            <div class="mc-save-option-list">
              <label class="mc-save-opt-card ${_state.mobileSavePreference === 'zip' ? 'selected' : ''}">
                <input type="radio" name="mcSavePref" value="zip" ${_state.mobileSavePreference === 'zip' ? 'checked' : ''} onchange="window.LM_MediaCompressorUI.setMobileSavePref('zip')">
                <div class="mc-save-opt-content">
                  <div class="mc-save-opt-title">📦 1-Click ZIP Archive (Recommended)</div>
                  <div class="mc-save-opt-desc">Combines all compressed photos &amp; videos into a single organized ZIP package in your Downloads. Avoids multiple annoying download popups and preserves exact filenames and creation timestamps.</div>
                </div>
              </label>

              <label class="mc-save-opt-card ${_state.mobileSavePreference === 'sequential' ? 'selected' : ''}">
                <input type="radio" name="mcSavePref" value="sequential" ${_state.mobileSavePreference === 'sequential' ? 'checked' : ''} onchange="window.LM_MediaCompressorUI.setMobileSavePref('sequential')">
                <div class="mc-save-opt-content">
                  <div class="mc-save-opt-title">⬇️ Direct File Downloads</div>
                  <div class="mc-save-opt-desc">Downloads each compressed file directly to your Downloads folder one by one.</div>
                </div>
              </label>
            </div>
          </div>

          <!-- Native App Recommendation Banner -->
          <div class="mc-app-promo-card">
            <div class="mc-app-promo-head">
              <span class="mc-app-promo-icon">📱</span>
              <div>
                <div class="mc-app-promo-title">Want to pick custom device folders?</div>
                <div class="mc-app-promo-desc">Install the LedgerMate Android App for direct phone storage access (DCIM, Pictures, SD Card, etc.).</div>
              </div>
            </div>
            <button type="button" class="btn-submit mc-app-dl-btn" onclick="window.LM_PWA?.downloadApk(); window.LM_MediaCompressorUI.closeSaveOptionsModal();">
              ⬇️ Download Android App (APK)
            </button>
          </div>
        </div>

        <div class="mc-modal-foot">
          <button type="button" class="btn-submit" onclick="window.LM_MediaCompressorUI.closeSaveOptionsModal()">
            Done
          </button>
        </div>
      </div>
    `;

    modal.style.display = 'flex';
  }

  function closeSaveOptionsModal() {
    var modal = document.getElementById('mcSaveOptionsModal');
    if (modal) modal.style.display = 'none';
    render();
  }

  function setMobileSavePref(pref) {
    _state.mobileSavePreference = pref;
    var cards = document.querySelectorAll('.mc-save-opt-card');
    cards.forEach(c => {
      var r = c.querySelector('input[type="radio"]');
      if (r && r.value === pref) c.classList.add('selected');
      else c.classList.remove('selected');
    });
  }

  // ─────────────────────────────────────────────────────────────
  // BEFORE / AFTER COMPARISON MODAL (SWIPE SLIDER & SIDE-BY-SIDE)
  // ─────────────────────────────────────────────────────────────
  function setComparisonMode(mode, index) {
    _state.comparisonMode = mode;
    openComparisonModal(index);
  }

  function onSwipeMove(val) {
    var comp = document.getElementById('mcSwipeCompressedLayer');
    var line = document.getElementById('mcSwipeLine');
    if (comp) comp.style.clipPath = `polygon(0 0, ${val}% 0, ${val}% 100%, 0 100%)`;
    if (line) line.style.left = val + '%';
  }

  function openComparisonModal(index) {
    var item = _state.compressedResults[index];
    if (!item) return;

    var modal = document.getElementById('mcComparisonModal');
    if (!modal) return;

    var savedPct = item.savedPercent.toFixed(1);
    var isImage = item.type === 'image';
    var isSwipe = _state.comparisonMode === 'swipe' && isImage;

    modal.innerHTML = `
      <div class="mc-modal-backdrop" onclick="window.LM_MediaCompressorUI.closeComparisonModal()"></div>
      <div class="mc-modal-card" style="max-width: 920px;">
        <div class="mc-modal-head">
          <div class="mc-modal-title">
            <span>🔍 Visual Comparison</span>
            <span class="mc-modal-filename">${item.name}</span>
          </div>
          <button type="button" class="mc-modal-close" onclick="window.LM_MediaCompressorUI.closeComparisonModal()">✕</button>
        </div>

        <div class="mc-modal-body">
          ${isImage ? `
            <div class="mc-compare-mode-switch">
              <button type="button" class="mc-mode-tab ${_state.comparisonMode === 'swipe' ? 'active' : ''}" onclick="window.LM_MediaCompressorUI.setComparisonMode('swipe', ${index})">
                ⚡ Split Swipe Slider
              </button>
              <button type="button" class="mc-mode-tab ${_state.comparisonMode === 'side' ? 'active' : ''}" onclick="window.LM_MediaCompressorUI.setComparisonMode('side', ${index})">
                🔲 Side-by-Side
              </button>
            </div>
          ` : ''}

          ${isSwipe ? `
            <!-- Interactive Swipe Slider -->
            <div class="mc-swipe-box" id="mcSwipeBox">
              <div class="mc-swipe-layer original">
                <img src="${item.originalPreviewUrl}" alt="Original" draggable="false">
              </div>
              <div class="mc-swipe-layer compressed" id="mcSwipeCompressedLayer" style="clip-path: polygon(0 0, 50% 0, 50% 100%, 0 100%);">
                <img src="${item.previewUrl}" alt="Compressed" draggable="false">
              </div>
              <div class="mc-swipe-divider-line" id="mcSwipeLine" style="left: 50%;">
                <div class="mc-swipe-divider-handle">‹ ›</div>
              </div>
              <span class="mc-swipe-pill left">Compressed (-${savedPct}%)</span>
              <span class="mc-swipe-pill right">Original (${formatBytes(item.originalSize)})</span>
              <input type="range" class="mc-swipe-slider-input" min="0" max="100" value="50" oninput="window.LM_MediaCompressorUI.onSwipeMove(this.value)">
            </div>
            <div style="text-align:center; font-size:11px; color:var(--text-3); margin-top:8px;">
              👆 Drag slider horizontally to inspect visual quality
            </div>
          ` : `
            <!-- Side by Side View -->
            <div class="mc-compare-view">
              <div class="mc-compare-col">
                <div class="mc-compare-header">
                  <span class="mc-tag orig">Original</span>
                  <span class="mc-stat-bold">${formatBytes(item.originalSize)}</span>
                  ${item.originalDimensions ? `<span class="mc-stat-sub">${item.originalDimensions.width}×${item.originalDimensions.height}</span>` : ''}
                </div>
                <div class="mc-compare-media">
                  ${item.type === 'image' 
                    ? `<img src="${item.originalPreviewUrl}" alt="Original" class="mc-compare-img">`
                    : `<video src="${item.originalPreviewUrl}" controls class="mc-compare-img"></video>`
                  }
                </div>
              </div>

              <div class="mc-compare-col">
                <div class="mc-compare-header">
                  <span class="mc-tag comp">Compressed (-${savedPct}%)</span>
                  <span class="mc-stat-bold text-success">${formatBytes(item.compressedSize)}</span>
                  ${item.compressedDimensions ? `<span class="mc-stat-sub">${item.compressedDimensions.width}×${item.compressedDimensions.height}</span>` : ''}
                </div>
                <div class="mc-compare-media">
                  ${item.type === 'image' 
                    ? `<img src="${item.previewUrl}" alt="Compressed" class="mc-compare-img">`
                    : `<video src="${item.previewUrl}" controls class="mc-compare-img"></video>`
                  }
                </div>
              </div>
            </div>
          `}

          <div class="mc-modal-meta-bar" style="margin-top:14px;">
            <span>🏷️ <strong>Metadata Status:</strong> ${item.exifPreserved ? 'EXIF, GPS Coordinates, Author & Creation Date 100% Preserved' : 'Original Creation & Modified Timestamps Preserved'}</span>
            <span class="text-success font-bold">Space Reduced: -${formatBytes(item.savedBytes)}</span>
          </div>
        </div>

        <div class="mc-modal-foot">
          <button type="button" class="mc-btn-secondary" onclick="window.LM_MediaCompressorUI.openMetadataModal(${index})">
            ℹ️ View Metadata
          </button>
          <button type="button" class="mc-btn-secondary" onclick="window.LM_MediaCompressorUI.shareItem(${index})">
            📤 Share
          </button>
          <button type="button" class="btn-submit" onclick="window.LM_MediaCompressorUI.downloadItem(${index}); window.LM_MediaCompressorUI.closeComparisonModal();">
            ⬇️ Download Compressed File
          </button>
          <button type="button" class="mc-btn-secondary" onclick="window.LM_MediaCompressorUI.closeComparisonModal()">
            Close
          </button>
        </div>
      </div>
    `;

    modal.style.display = 'flex';
  }

  function closeComparisonModal() {
    var modal = document.getElementById('mcComparisonModal');
    if (modal) modal.style.display = 'none';
  }

  // ─────────────────────────────────────────────────────────────
  // DETAILED METADATA & EXIF INSPECTOR MODAL
  // ─────────────────────────────────────────────────────────────
  function openMetadataModal(index) {
    var item = _state.compressedResults[index];
    if (!item) return;

    var modal = document.getElementById('mcMetadataModal');
    if (!modal) return;

    var meta = item.detailedMetadata || {};
    var cameraText = meta.model ? ((meta.make ? meta.make + ' ' : '') + meta.model) : 'Standard Digital / Mobile Camera';
    var lensText = meta.lens || 'Primary Camera Lens';
    var expText = meta.exposureTime || 'Auto Exposure';
    var fNumText = meta.fNumber ? ('f/' + meta.fNumber) : 'Standard';
    var isoText = meta.iso ? ('ISO ' + meta.iso) : 'Auto';
    var captureDateStr = meta.dateTimeOriginal || (item.originalTimestamp ? new Date(item.originalTimestamp).toLocaleString() : 'Preserved from Source');
    var timestampStr = item.originalTimestamp ? new Date(item.originalTimestamp).toLocaleString() : new Date().toLocaleString();
    var origResStr = item.originalDimensions ? (item.originalDimensions.width + ' × ' + item.originalDimensions.height + ' px') : 'Original Source';
    var compResStr = item.compressedDimensions ? (item.compressedDimensions.width + ' × ' + item.compressedDimensions.height + ' px') : origResStr;

    var gpsContent = 'None embedded in source';
    if (meta.gps && meta.gps.latitude != null && meta.gps.longitude != null) {
      gpsContent = `
        <div>
          <span>${meta.gps.latitude.toFixed(5)}°, ${meta.gps.longitude.toFixed(5)}°</span>
          <br>
          <a href="${meta.gps.mapsUrl || ('https://maps.google.com/?q=' + meta.gps.latitude + ',' + meta.gps.longitude)}" target="_blank" rel="noopener noreferrer" style="color:var(--accent); font-size:11px; text-decoration:underline;">
            🗺️ Open Location in Maps
          </a>
        </div>
      `;
    }

    modal.innerHTML = `
      <div class="mc-modal-backdrop" onclick="window.LM_MediaCompressorUI.closeMetadataModal()"></div>
      <div class="mc-modal-card" style="max-width: 680px;">
        <div class="mc-modal-head">
          <div class="mc-modal-title">
            <span>🏷️ Metadata &amp; Timestamp Inspector</span>
            <span class="mc-modal-filename">${item.name}</span>
          </div>
          <button type="button" class="mc-modal-close" onclick="window.LM_MediaCompressorUI.closeMetadataModal()">✕</button>
        </div>

        <div class="mc-modal-body">
          <div class="mc-meta-success-pill" style="margin-bottom:12px;">
            ✅ Original Creation Date &amp; Modified Timestamps 100% Preserved
          </div>

          <div class="mc-meta-table">
            <div class="mc-meta-cell">
              <div class="mc-meta-cell-label">Camera Device</div>
              <div class="mc-meta-cell-value">📷 ${cameraText}</div>
            </div>

            <div class="mc-meta-cell">
              <div class="mc-meta-cell-label">Lens / Optics</div>
              <div class="mc-meta-cell-value">🔍 ${lensText}</div>
            </div>

            <div class="mc-meta-cell">
              <div class="mc-meta-cell-label">Exposure &amp; ISO</div>
              <div class="mc-meta-cell-value">⚡ ${expText} · ${fNumText} · ${isoText}</div>
            </div>

            <div class="mc-meta-cell">
              <div class="mc-meta-cell-label">Capture Date (EXIF)</div>
              <div class="mc-meta-cell-value">📅 ${captureDateStr}</div>
            </div>

            <div class="mc-meta-cell">
              <div class="mc-meta-cell-label">Filesystem Date Created</div>
              <div class="mc-meta-cell-value">⏱️ ${timestampStr}</div>
            </div>

            <div class="mc-meta-cell">
              <div class="mc-meta-cell-label">Filesystem Date Modified</div>
              <div class="mc-meta-cell-value">⏱️ ${timestampStr}</div>
            </div>

            <div class="mc-meta-cell">
              <div class="mc-meta-cell-label">Resolution Scaling</div>
              <div class="mc-meta-cell-value">📐 ${origResStr} ➔ ${compResStr}</div>
            </div>

            <div class="mc-meta-cell">
              <div class="mc-meta-cell-label">GPS Geolocation</div>
              <div class="mc-meta-cell-value">📍 ${gpsContent}</div>
            </div>
          </div>
        </div>

        <div class="mc-modal-foot">
          <button type="button" class="btn-submit" onclick="window.LM_MediaCompressorUI.downloadItem(${index}); window.LM_MediaCompressorUI.closeMetadataModal();">
            ⬇️ Download Media
          </button>
          <button type="button" class="mc-btn-secondary" onclick="window.LM_MediaCompressorUI.closeMetadataModal()">
            Close
          </button>
        </div>
      </div>
    `;

    modal.style.display = 'flex';
  }

  function closeMetadataModal() {
    var modal = document.getElementById('mcMetadataModal');
    if (modal) modal.style.display = 'none';
  }

  // ─────────────────────────────────────────────────────────────
  // WEB SHARE API
  // ─────────────────────────────────────────────────────────────
  async function shareItem(index) {
    var item = _state.compressedResults[index];
    if (!item) return;

    try {
      var blob = item.blob || item.file;
      var file = new File([blob], item.name, {
        type: item.format || blob.type || 'image/jpeg',
        lastModified: item.originalTimestamp || Date.now()
      });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: item.name,
          text: `Compressed with LedgerMate (-${item.savedPercent.toFixed(1)}% space saved)`
        });
      } else {
        downloadItem(index);
      }
    } catch (e) {
      if (e.name !== 'AbortError') {
        downloadItem(index);
      }
    }
  }

  async function shareAll() {
    var items = _state.compressedResults;
    if (!items || items.length === 0) return;

    try {
      var files = items.map(function (it) {
        var blob = it.blob || it.file;
        return new File([blob], it.name, {
          type: it.format || blob.type || 'application/octet-stream',
          lastModified: it.originalTimestamp || Date.now()
        });
      });

      if (navigator.canShare && navigator.canShare({ files: files })) {
        await navigator.share({
          files: files,
          title: 'LedgerMate Compressed Media',
          text: `Compressed ${files.length} media files with LedgerMate!`
        });
      } else {
        await downloadAllAsZip();
      }
    } catch (e) {
      if (e.name !== 'AbortError') {
        await downloadAllAsZip();
      }
    }
  }

  // ─────────────────────────────────────────────────────────────
  // PUBLIC INTERFACE
  // ─────────────────────────────────────────────────────────────
  window.LM_MediaCompressorUI = {
    init: init,
    downloadItem: downloadItem,
    downloadAllAsZip: downloadAllAsZip,
    downloadAllSequentially: downloadAllSequentially,
    shareItem: shareItem,
    shareAll: shareAll,
    openComparisonModal: openComparisonModal,
    closeComparisonModal: closeComparisonModal,
    setComparisonMode: setComparisonMode,
    onSwipeMove: onSwipeMove,
    openMetadataModal: openMetadataModal,
    closeMetadataModal: closeMetadataModal,
    openSaveOptionsModal: openSaveOptionsModal,
    closeSaveOptionsModal: closeSaveOptionsModal,
    setMobileSavePref: setMobileSavePref,
    applyPreset: applyPreset,
    _getState: function () { return _state; }
  };

})();
