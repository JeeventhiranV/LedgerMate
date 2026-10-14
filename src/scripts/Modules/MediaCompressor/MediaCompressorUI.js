/**
 * LedgerMate – MediaCompressorUI.js
 * ─────────────────────────────────────────────────────────────
 * User Interface controller for the Photo & Video Compressor module.
 * Features:
 *   - Drag & Drop file queue with live image & video thumbnail generation
 *   - Interactive configuration: Quality slider, Custom max dimension (1200px editable),
 *     Video presets (1080p, 720p, 480p, 360p), EXIF preservation toggle
 *   - Destination folder selector via File System Access API
 *   - Real-time progress bar with per-file status
 *   - Space reduction analytics (Total MB saved and % reduction)
 *   - Before/After interactive preview comparisons
 *   - 1-click Save to Destination, Download as ZIP, and individual file download
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
    destinationHandle: null,
    destinationFolderName: 'Device Downloads / Default',
    options: {
      quality: 0.75,
      resizeMode: 'custom',
      maxDimension: 1200,
      preserveExif: true,
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
   * Initializes or re-renders the Media Compressor page
   */
  function init() {
    var container = document.getElementById('page-media-compressor');
    if (!container) return;

    render(container);
  }

  /**
   * Main render dispatch based on currentStage
   */
  function render(container) {
    container = container || document.getElementById('page-media-compressor');
    if (!container) return;

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
            <div class="mc-step ${_state.currentStage === 'select' ? 'active' : (_state.selectedFiles.length > 0 ? 'completed' : '')}">
              <span class="mc-step-num">1</span> <span class="mc-step-text">Select</span>
            </div>
            <div class="mc-step-line"></div>
            <div class="mc-step ${_state.currentStage === 'configure' ? 'active' : (_state.compressedResults.length > 0 ? 'completed' : '')}">
              <span class="mc-step-num">2</span> <span class="mc-step-text">Configure</span>
            </div>
            <div class="mc-step-line"></div>
            <div class="mc-step ${_state.currentStage === 'processing' ? 'active' : ''}">
              <span class="mc-step-num">3</span> <span class="mc-step-text">Compress</span>
            </div>
            <div class="mc-step-line"></div>
            <div class="mc-step ${_state.currentStage === 'results' ? 'active' : ''}">
              <span class="mc-step-num">4</span> <span class="mc-step-text">Results</span>
            </div>
          </div>
        </div>

        <!-- Stage Container -->
        <div class="mc-content" id="mcStageContent">
          ${renderStageContent()}
        </div>

        <!-- Comparison Modal Placeholder -->
        <div id="mcComparisonModal" class="mc-modal" style="display:none;"></div>
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
        <div class="mc-dropzone-icon">📥</div>
        <div class="mc-dropzone-title">Drag &amp; Drop photos or videos here</div>
        <div class="mc-dropzone-desc">Supports JPEG, PNG, WEBP, MP4, MOV, WEBM · Multiple files supported</div>
        <button type="button" class="btn-submit mc-browse-btn" id="mcBrowseBtn">
          Browse Photos &amp; Videos
        </button>
      </div>

      <!-- Selected Queue -->
      ${hasFiles ? `
        <div class="mc-queue-header">
          <div class="mc-queue-summary">
            <strong>${_state.selectedFiles.length}</strong> file${_state.selectedFiles.length > 1 ? 's' : ''} queued
            <span class="mc-queue-size">(${formatBytes(totalSize)})</span>
          </div>
          <div class="mc-queue-actions">
            <button type="button" class="mc-btn-link" id="mcAddMoreBtn">➕ Add More</button>
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

    return `
      <div class="mc-config-wrap">
        <div class="mc-config-top">
          <button type="button" class="mc-back-btn" id="mcBackToSelectBtn">← Back to File Selection</button>
          <div class="mc-files-summary-pill">
            ${_state.selectedFiles.length} files selected (${formatBytes(_state.selectedFiles.reduce((a,b)=>a+b.size,0))})
          </div>
        </div>

        <div class="mc-config-cards">
          <!-- 1. Photo Compression Settings -->
          ${hasPhotos ? `
            <div class="card mc-config-card">
              <div class="mc-card-head">
                <span class="mc-card-icon">📸</span>
                <div>
                  <h3 class="mc-card-title">Photo Compression Settings</h3>
                  <p class="mc-card-subtitle">Adjust quality and dimensions while preserving EXIF, GPS &amp; dates</p>
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
                    <span>Resize to Max Dimension</span>
                  </label>
                  <label class="mc-radio-label">
                    <input type="radio" name="mcResizeMode" value="original" ${_state.options.resizeMode === 'original' ? 'checked' : ''} id="mcResizeOrigRadio">
                    <span>Original Resolution (No Downsampling)</span>
                  </label>
                </div>

                <div class="mc-dim-input-wrap" id="mcDimWrap" style="${_state.options.resizeMode === 'original' ? 'display:none;' : ''}">
                  <span class="mc-dim-label">Max Width / Height (px):</span>
                  <input type="number" class="mc-number-input" id="mcMaxDimInput" min="100" max="8000" step="50" value="${_state.options.maxDimension}">
                  <span class="mc-dim-hint">Default 1200px · Maintains original aspect ratio</span>
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
                <h3 class="mc-card-title">Destination Folder</h3>
                <p class="mc-card-subtitle">Choose where compressed files with identical original names will be saved</p>
              </div>
            </div>

            <div class="mc-dest-row">
              <div class="mc-dest-info">
                <span class="mc-dest-icon">📂</span>
                <div>
                  <div class="mc-dest-name" id="mcDestFolderLabel">${_state.destinationFolderName}</div>
                  <div class="mc-dest-sub">Compressed files will be written with their exact original names &amp; timestamps.</div>
                </div>
              </div>
              <button type="button" class="btn-submit mc-btn-folder" id="mcChooseFolderBtn">
                📁 Choose Folder
              </button>
            </div>
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

          <div class="mc-proc-bar-wrap">
            <div class="mc-proc-bar" id="mcProcBar" style="width: 0%;"></div>
          </div>
          <div class="mc-proc-pct" id="mcProcPct">0%</div>

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
          <button type="button" class="btn-submit mc-save-all-btn" id="mcSaveAllBtn">
            💾 Save All to Destination Folder (${_state.compressedResults.length})
          </button>
          <button type="button" class="mc-btn-secondary" id="mcDownloadZipBtn">
            📦 Download All as ZIP
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
                    <img src="${item.previewUrl}" alt="${item.name}" class="mc-res-thumb">
                    <span class="mc-compare-badge" title="Click to view Before/After">🔍 Compare</span>
                  </div>
                  <div class="mc-res-info">
                    <div class="mc-res-name" title="${item.name}">${item.name}</div>
                    <div class="mc-res-badges">
                      <span class="mc-meta-badge">${item.type === 'image' ? '📸 Photo' : '🎬 Video'}</span>
                      <span class="mc-savings-badge">-${savedPct}% (${savedMb} saved)</span>
                      ${item.exifPreserved ? '<span class="mc-exif-badge">🏷️ EXIF &amp; Dates Preserved</span>' : '<span class="mc-exif-badge">⏱️ Timestamp Preserved</span>'}
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
                    👁️ Full Preview
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
    var browseBtn = container.querySelector('#mcBrowseBtn');
    var dropzone = container.querySelector('#mcDropzone');

    if (browseBtn && fileInput) {
      browseBtn.addEventListener('click', function () {
        fileInput.click();
      });
    }

    if (fileInput) {
      fileInput.addEventListener('change', function (e) {
        if (e.target.files && e.target.files.length > 0) {
          addFiles(Array.from(e.target.files));
          fileInput.value = '';
        }
      });
    }

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

    // Quality Slider
    var qualitySlider = container.querySelector('#mcQualitySlider');
    var qualityVal = container.querySelector('#mcQualityVal');
    if (qualitySlider && qualityVal) {
      qualitySlider.addEventListener('input', function (e) {
        var val = parseInt(e.target.value, 10);
        _state.options.quality = val / 100;
        qualityVal.textContent = val + '%';
        container.querySelectorAll('.mc-chip').forEach(c => c.classList.remove('active'));
      });
    }

    // Preset Chips
    container.querySelectorAll('.mc-chip').forEach(chip => {
      chip.addEventListener('click', function () {
        var q = parseFloat(this.getAttribute('data-quality'));
        _state.options.quality = q;
        if (qualitySlider) qualitySlider.value = Math.round(q * 100);
        if (qualityVal) qualityVal.textContent = Math.round(q * 100) + '%';
        container.querySelectorAll('.mc-chip').forEach(c => c.classList.remove('active'));
        this.classList.add('active');
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
        }
      });
      resizeOrigRadio.addEventListener('change', function () {
        if (this.checked) {
          _state.options.resizeMode = 'original';
          if (dimWrap) dimWrap.style.display = 'none';
        }
      });
    }

    // Max Dimension input
    var maxDimInput = container.querySelector('#mcMaxDimInput');
    if (maxDimInput) {
      maxDimInput.addEventListener('input', function (e) {
        _state.options.maxDimension = parseInt(e.target.value, 10) || 1200;
      });
    }

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
          var handle = await window.LM_MediaCompressorService.chooseDestinationDirectory();
          if (handle) {
            _state.destinationHandle = handle;
            _state.destinationFolderName = '📁 ' + handle.name;
            var label = container.querySelector('#mcDestFolderLabel');
            if (label) label.textContent = _state.destinationFolderName;
            if (window.LMToast) LMToast.ok('Selected folder: ' + handle.name);
          }
        } catch (dirErr) {
          console.warn('[LM MediaCompressor] Directory selection error:', dirErr);
          if (window.LMToast) LMToast.info('Folder picker cancelled or unsupported. Files can also be saved via direct download.');
        }
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
    var saveAllBtn = container.querySelector('#mcSaveAllBtn');
    if (saveAllBtn) {
      saveAllBtn.addEventListener('click', async function () {
        await saveAllToDestination();
      });
    }

    var downloadZipBtn = container.querySelector('#mcDownloadZipBtn');
    if (downloadZipBtn) {
      downloadZipBtn.addEventListener('click', async function () {
        try {
          if (window.LMToast) LMToast.info('Building ZIP package with original timestamps...');
          var zipBlob = await window.LM_MediaCompressorService.generateZipArchive(_state.compressedResults);
          window.LM_MediaCompressorService.triggerDownload(zipBlob, 'LedgerMate_Compressed_Media.zip');
          if (window.LMToast) LMToast.ok('ZIP downloaded successfully!');
        } catch (zipErr) {
          console.error('[LM MediaCompressor] ZIP generation failed:', zipErr);
          if (window.LMToast) LMToast.error('Failed to generate ZIP archive: ' + zipErr.message);
        }
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
    for (var i = 0; i < files.length; i++) {
      var file = files[i];
      var isVideo = file.type.startsWith('video/') || file.name.match(/\.(mp4|webm|mov|mkv|avi)$/i);
      var isImage = file.type.startsWith('image/') || file.name.match(/\.(jpe?g|png|webp|gif|bmp)$/i);

      if (!isImage && !isVideo) continue; // Skip unsupported documents

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

      // Async measure dimensions
      measureMediaDimensions(item);
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
  // COMPRESSION ENGINE EXECUTION
  // ─────────────────────────────────────────────────────────────
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

      updateProgressUI(i, total, file.name, 'Optimizing media bytes...');

      try {
        var result;
        if (fileItem.type === 'image') {
          result = await service.compressImage(file, {
            quality: _state.options.quality,
            resizeMode: _state.options.resizeMode,
            maxDimension: _state.options.maxDimension,
            preserveExif: _state.options.preserveExif
          });
        } else {
          result = await service.compressVideo(file, {
            targetResolution: _state.options.videoResolution,
            qualityTier: _state.options.videoQuality,
            includeAudio: _state.options.includeAudio
          }, function (pct, text) {
            updateProgressUI(i, total, file.name, text, pct);
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

  function updateProgressUI(index, total, fileName, statusText, subPercent) {
    var procStatus = document.getElementById('mcProcStatus');
    var procBar = document.getElementById('mcProcBar');
    var procPct = document.getElementById('mcProcPct');
    var procSub = document.getElementById('mcProcSubtext');

    var basePct = (index / total) * 100;
    var stepSize = (1 / total) * 100;
    var overallPct = Math.round(basePct + ((subPercent || 0) / 100) * stepSize);
    overallPct = Math.min(99, Math.max(1, overallPct));

    if (procStatus) procStatus.textContent = `File ${index + 1} of ${total}: ${fileName}`;
    if (procBar) procBar.style.width = overallPct + '%';
    if (procPct) procPct.textContent = overallPct + '%';
    if (procSub) procSub.textContent = statusText || 'Compressing...';
  }

  // ─────────────────────────────────────────────────────────────
  // SAVE / DOWNLOAD ACTIONS
  // ─────────────────────────────────────────────────────────────
  async function saveAllToDestination() {
    var items = _state.compressedResults;
    if (items.length === 0) return;

    var service = window.LM_MediaCompressorService;

    // If destination folder not yet selected, prompt user
    if (!_state.destinationHandle) {
      try {
        _state.destinationHandle = await service.chooseDestinationDirectory();
      } catch (e) {
        console.warn('Folder selection aborted:', e);
      }
    }

    if (_state.destinationHandle) {
      if (window.LMToast) LMToast.info(`Writing ${items.length} files to ${_state.destinationHandle.name}...`);
      var result = await service.saveItemsToDirectory(_state.destinationHandle, items, function (curr, total, name) {
        if (window.LMToast && curr % 5 === 0) {
          LMToast.info(`Saved ${curr} of ${total} files...`);
        }
      });
      if (window.LMToast) {
        LMToast.ok(`Saved all ${result.savedCount} files directly into folder '${_state.destinationHandle.name}'!`);
      }
    } else {
      // Fallback: batch sequential downloads or ZIP
      if (window.LMToast) LMToast.info('Direct folder access unavailable on this browser. Downloading files individually...');
      items.forEach((item, idx) => {
        setTimeout(() => {
          service.triggerDownload(item.blob || item.file, item.name);
        }, idx * 400);
      });
    }
  }

  function downloadItem(index) {
    var item = _state.compressedResults[index];
    if (!item) return;
    window.LM_MediaCompressorService.triggerDownload(item.blob || item.file, item.name);
    if (window.LMToast) LMToast.ok(`Downloading ${item.name}`);
  }

  // ─────────────────────────────────────────────────────────────
  // BEFORE / AFTER COMPARISON MODAL
  // ─────────────────────────────────────────────────────────────
  function openComparisonModal(index) {
    var item = _state.compressedResults[index];
    if (!item) return;

    var modal = document.getElementById('mcComparisonModal');
    if (!modal) return;

    var savedPct = item.savedPercent.toFixed(1);

    modal.innerHTML = `
      <div class="mc-modal-backdrop" onclick="window.LM_MediaCompressorUI.closeComparisonModal()"></div>
      <div class="mc-modal-card">
        <div class="mc-modal-head">
          <div class="mc-modal-title">
            <span>🔍 Before / After Comparison</span>
            <span class="mc-modal-filename">${item.name}</span>
          </div>
          <button type="button" class="mc-modal-close" onclick="window.LM_MediaCompressorUI.closeComparisonModal()">✕</button>
        </div>

        <div class="mc-modal-body">
          <div class="mc-compare-view">
            <!-- Before Column -->
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

            <!-- After Column -->
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

          <div class="mc-modal-meta-bar">
            <span>🏷️ <strong>Metadata Status:</strong> ${item.exifPreserved ? 'EXIF, GPS Coordinates, Author & Creation Date 100% Preserved' : 'Original Creation & Modified Timestamps Preserved'}</span>
            <span class="text-success font-bold">Space Reduced: -${formatBytes(item.savedBytes)}</span>
          </div>
        </div>

        <div class="mc-modal-foot">
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
  // PUBLIC INTERFACE
  // ─────────────────────────────────────────────────────────────
  window.LM_MediaCompressorUI = {
    init: init,
    downloadItem: downloadItem,
    openComparisonModal: openComparisonModal,
    closeComparisonModal: closeComparisonModal,
    _getState: function () { return _state; } // For unit testing
  };

})();
