/**
 * StudyFileViewer.js — Universal Full-Screen File & PDF Viewer for LedgerMate Study Hub
 * 
 * Supports:
 * - PDF Rendering via Mozilla PDF.js (HTML5 Canvas — 0 blank screens on Android WebView & Mobile)
 * - Fallbacks to Android Native PDF View Intent & Google Docs Viewer
 * - Responsive Touch Zoom & Pan for High-Res Images
 * - Dark/Light Syntax Code Viewer with Copy Snippet
 * - Clean Distraction-Free Document / Markdown Reader
 * - Embedded Video & External Link Launcher
 * - In-Viewer Topic Progress & Status Controls (Pending / In Progress / Completed + % slider)
 */

(function () {
  'use strict';

  var _pdfDoc = null;
  var _pageNum = 1;
  var _pageRendering = false;
  var _pageNumPending = null;
  var _scale = 1.0;
  var _fitMode = 'width'; // 'width', 'page', 'custom'
  var _rotation = 0;
  var _currentOptions = null;
  var _pdfJsLoadingPromise = null;

  // ── 1. DYNAMIC PDF.JS LOADER ───────────────────────────────────────────────
  function ensurePdfJsLoaded() {
    if (window.pdfjsLib) {
      return Promise.resolve(window.pdfjsLib);
    }
    if (_pdfJsLoadingPromise) {
      return _pdfJsLoadingPromise;
    }

    _pdfJsLoadingPromise = new Promise(function (resolve, reject) {
      var script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
      script.async = true;
      script.onload = function () {
        if (window.pdfjsLib) {
          window.pdfjsLib.GlobalWorkerOptions.workerSrc =
            'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
          resolve(window.pdfjsLib);
        } else {
          reject(new Error('PDF.js failed to initialize'));
        }
      };
      script.onerror = function () {
        // Fallback CDN if cdnjs fails
        var fallbackScript = document.createElement('script');
        fallbackScript.src = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js';
        fallbackScript.async = true;
        fallbackScript.onload = function () {
          if (window.pdfjsLib) {
            window.pdfjsLib.GlobalWorkerOptions.workerSrc =
              'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js';
            resolve(window.pdfjsLib);
          } else {
            reject(new Error('PDF.js fallback failed to initialize'));
          }
        };
        fallbackScript.onerror = function (e) {
          reject(e);
        };
        document.head.appendChild(fallbackScript);
      };
      document.head.appendChild(script);
    });

    return _pdfJsLoadingPromise;
  }

  // ── 2. ESCAPE HELPER ────────────────────────────────────────────────────────
  function _esc(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // ── 3. CLOSE VIEWER ────────────────────────────────────────────────────────
  function close() {
    var modal = document.getElementById('studyFileViewerModal');
    if (modal) {
      modal.classList.add('sfv-closing');
      setTimeout(function () {
        modal.remove();
        document.body.classList.remove('sfv-modal-open');
      }, 200);
    }
    _pdfDoc = null;
    _currentOptions = null;
    _pageNum = 1;
    _scale = 1.0;
    _rotation = 0;
  }

  // ── 4. LAUNCH IN NATIVE APP / EXTERNAL ──────────────────────────────────────
  function openInNativeApp(url, title) {
    if (!url) return;
    if (window.AndroidBridge && typeof window.AndroidBridge.openPdfUrl === 'function') {
      window.AndroidBridge.openPdfUrl(url, title || 'Study Document');
      if (window.LMToast) window.LMToast.show('📱 Opening in device PDF reader...');
      return;
    }
    if (window.AndroidBridge && typeof window.AndroidBridge.openExternalUrl === 'function') {
      window.AndroidBridge.openExternalUrl(url);
      return;
    }
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  function openInGoogleDocs(url) {
    if (!url) return;
    var gUrl = 'https://docs.google.com/viewer?url=' + encodeURIComponent(url) + '&embedded=true';
    window.open(gUrl, '_blank', 'noopener,noreferrer');
  }

  function downloadFile(url, filename) {
    if (!url) return;
    var a = document.createElement('a');
    a.href = url;
    a.download = (filename || 'document') + (filename && filename.toLowerCase().endsWith('.pdf') ? '' : (url.toLowerCase().includes('.pdf') ? '.pdf' : ''));
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    if (window.LMToast) window.LMToast.show('⬇️ Starting download...');
  }

  // ── 5. MAIN OPEN ENTRY POINT ────────────────────────────────────────────────
  /**
   * @param {Object} opts
   * @param {string} opts.title
   * @param {string} opts.fileUrl
   * @param {string} [opts.type] 'pdf' | 'image' | 'code' | 'doc' | 'link' | 'video' | 'note'
   * @param {string} [opts.content]
   * @param {string} [opts.materialId]
   * @param {string} [opts.topicId]
   * @param {string} [opts.status] 'pending' | 'inprogress' | 'completed'
   * @param {number} [opts.progressPct]
   * @param {string} [opts.storagePath]
   * @param {number} [opts.fileSize]
   * @param {function} [opts.onStatusChange] function(materialId, newStatus, newPct)
   */
  function open(opts) {
    if (!opts) return;
    _currentOptions = opts;

    // Detect type from url extension if not provided
    var type = opts.type || '';
    var url = opts.fileUrl || '';
    if (!type && url) {
      var cleanUrl = url.split('?')[0].toLowerCase();
      if (cleanUrl.endsWith('.pdf')) type = 'pdf';
      else if (/\.(png|jpe?g|gif|webp|svg)$/i.test(cleanUrl)) type = 'image';
      else if (/\.(js|ts|java|py|cpp|c|html|css|json|sql|sh)$/i.test(cleanUrl)) type = 'code';
      else if (/\.(md|txt|doc|docx)$/i.test(cleanUrl)) type = 'doc';
      else type = 'link';
    }
    if (!type) type = 'doc';
    opts.type = type;

    // Remove existing
    var existing = document.getElementById('studyFileViewerModal');
    if (existing) existing.remove();

    document.body.classList.add('sfv-modal-open');

    var modal = document.createElement('div');
    modal.id = 'studyFileViewerModal';
    modal.className = 'sfv-overlay';

    var typeIcon = '📄';
    var typeLabel = 'Document';
    if (type === 'pdf') { typeIcon = '📄'; typeLabel = 'PDF'; }
    else if (type === 'image') { typeIcon = '🖼️'; typeLabel = 'Image'; }
    else if (type === 'code') { typeIcon = '💻'; typeLabel = 'Code'; }
    else if (type === 'video') { typeIcon = '🎥'; typeLabel = 'Video'; }
    else if (type === 'link') { typeIcon = '🔗'; typeLabel = 'Link'; }
    else if (type === 'note') { typeIcon = '📝'; typeLabel = 'Note'; }

    var matStatus = opts.status || 'pending';
    var matPct = opts.progressPct !== undefined ? opts.progressPct : (matStatus === 'completed' ? 100 : (matStatus === 'inprogress' ? 50 : 0));
    var isStudyTopic = !!(opts.materialId || opts.onStatusChange);

    modal.innerHTML = `
      <div class="sfv-container" id="sfvContainer">
        
        <!-- TOPBAR -->
        <header class="sfv-topbar">
          <div class="sfv-topbar-left">
            <span class="sfv-type-badge ${type}">${typeIcon} ${typeLabel}</span>
            <div class="sfv-title-wrap">
              <h2 class="sfv-title" title="${_esc(opts.title || 'Study Material')}">${_esc(opts.title || 'Study Material')}</h2>
              ${opts.fileSize ? `<span class="sfv-filesize">${Math.round(opts.fileSize / 1024)} KB</span>` : ''}
            </div>
          </div>

          <div class="sfv-topbar-actions" id="sfvHeaderActions">
            <!-- Dynamic Controls inserted by renderer -->
            ${url ? `
              <button class="sfv-btn sfv-btn-native" id="sfvNativeAppBtn" title="Open in Device Reader / App" onclick="window.StudyFileViewer.openInNativeApp('${_esc(url)}', '${_esc(opts.title)}')">
                <span class="sfv-btn-icon">📱</span>
                <span class="sfv-btn-text">Open in App</span>
              </button>
              <button class="sfv-btn" title="Download File" onclick="window.StudyFileViewer.downloadFile('${_esc(url)}', '${_esc(opts.title)}')">
                <span>⬇️</span>
              </button>
              <a href="${_esc(url)}" target="_blank" rel="noopener noreferrer" class="sfv-btn sfv-btn-link" title="Open in New Browser Tab">
                <span>↗</span>
              </a>
            ` : ''}
            <button class="sfv-btn sfv-btn-fullscreen" id="sfvFullscreenToggleBtn" title="Toggle Fullscreen" onclick="window.StudyFileViewer.toggleFullscreen()">
              <span id="sfvFullscreenIcon">⛶</span>
            </button>
            <button class="sfv-btn sfv-btn-close" title="Close Viewer (Esc)" onclick="window.StudyFileViewer.close()">
              ✕
            </button>
          </div>
        </header>

        <!-- VIEWER BODY -->
        <main class="sfv-body" id="sfvBody">
          <div class="sfv-loading-spinner" id="sfvLoading">
            <div class="sfv-spinner-ring"></div>
            <div class="sfv-loading-text">Loading ${typeLabel}...</div>
          </div>
          <div class="sfv-content-area" id="sfvContentArea"></div>
        </main>

        <!-- FOOTER: PROGRESS & TOPIC CONTROLS (IF ATTACHED TO STUDY MATERIAL) -->
        ${isStudyTopic ? `
          <footer class="sfv-footer">
            <div class="sfv-progress-group">
              <div class="sfv-status-buttons">
                <button class="sfv-st-btn ${matStatus === 'pending' ? 'active st-pending' : ''}" onclick="window.StudyFileViewer.updateStatus('pending', 0)">
                  ⚪ Pending
                </button>
                <button class="sfv-st-btn ${matStatus === 'inprogress' ? 'active st-inprogress' : ''}" onclick="window.StudyFileViewer.updateStatus('inprogress', 50)">
                  ⏳ In Progress
                </button>
                <button class="sfv-st-btn ${matStatus === 'completed' ? 'active st-completed' : ''}" onclick="window.StudyFileViewer.updateStatus('completed', 100)">
                  ✅ Completed
                </button>
              </div>
              <div class="sfv-slider-wrap">
                <input type="range" min="0" max="100" value="${matPct}" class="sfv-slider" id="sfvProgressSlider" oninput="window.StudyFileViewer.onSliderInput(this.value)" onchange="window.StudyFileViewer.onSliderChange(this.value)"/>
                <span class="sfv-pct-label" id="sfvPctLabel">${matPct}%</span>
              </div>
            </div>
            ${opts.storagePath ? `
              <div class="sfv-cloud-path" title="Supabase Cloud Storage Path">
                ☁️ ${_esc(opts.storagePath)}
              </div>
            ` : ''}
          </footer>
        ` : ''}

      </div>
    `;

    document.body.appendChild(modal);

    // Keyboard ESC listener
    modal.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') close();
    });

    // Render content based on type
    if (type === 'pdf') {
      renderPdf(url, opts);
    } else if (type === 'image') {
      renderImage(url, opts);
    } else if (type === 'code') {
      renderCode(opts.content || '', opts);
    } else if (type === 'video') {
      renderVideo(url, opts);
    } else if (type === 'link') {
      renderLink(url, opts);
    } else {
      renderDoc(opts.content || opts.title || '', opts);
    }
  }

  // ── 6. PDF RENDERER (MOZILLA PDF.JS + SMART FALLBACKS) ─────────────────────
  function renderPdf(url, opts) {
    var contentArea = document.getElementById('sfvContentArea');
    var loadingEl = document.getElementById('sfvLoading');
    if (!contentArea) return;

    if (!url) {
      if (loadingEl) loadingEl.style.display = 'none';
      contentArea.innerHTML = `
        <div class="sfv-empty-state">
          <div class="sfv-empty-icon">⚠️</div>
          <h3>PDF File Not Found</h3>
          <p>No file URL or cloud storage path was provided for this item.</p>
        </div>
      `;
      return;
    }

    // Insert PDF toolbar controls into header
    var headerActions = document.getElementById('sfvHeaderActions');
    if (headerActions) {
      var pdfControls = document.createElement('div');
      pdfControls.className = 'sfv-pdf-toolbar-group';
      pdfControls.id = 'sfvPdfControls';
      pdfControls.innerHTML = `
        <div class="sfv-nav-pagers">
          <button class="sfv-tool-btn" id="sfvPdfPrevBtn" title="Previous Page (Left Arrow)" onclick="window.StudyFileViewer.prevPage()">◀</button>
          <div class="sfv-page-indicator">
            <input type="number" id="sfvPageNumInput" value="1" min="1" max="1" onchange="window.StudyFileViewer.jumpToPage(this.value)" />
            <span>/ <span id="sfvPageCount">1</span></span>
          </div>
          <button class="sfv-tool-btn" id="sfvPdfNextBtn" title="Next Page (Right Arrow)" onclick="window.StudyFileViewer.nextPage()">▶</button>
        </div>
        <div class="sfv-zoom-group">
          <button class="sfv-tool-btn" title="Zoom Out (-)" onclick="window.StudyFileViewer.zoomOut()">－</button>
          <span class="sfv-zoom-label" id="sfvZoomLabel" onclick="window.StudyFileViewer.resetZoom()">100%</span>
          <button class="sfv-tool-btn" title="Zoom In (+)" onclick="window.StudyFileViewer.zoomIn()">＋</button>
          <button class="sfv-tool-btn" title="Fit to Width (↔)" onclick="window.StudyFileViewer.fitWidth()">↔</button>
        </div>
      `;
      headerActions.insertBefore(pdfControls, headerActions.firstChild);
    }

    // Set up canvas container
    contentArea.innerHTML = `
      <div class="sfv-pdf-viewport" id="sfvPdfViewport">
        <div class="sfv-pdf-pages-container" id="sfvPdfPagesContainer">
          <canvas id="sfvPdfCanvas" class="sfv-pdf-canvas"></canvas>
        </div>
      </div>
    `;

    // Load PDF via PDF.js
    ensurePdfJsLoaded()
      .then(function (pdfjsLib) {
        var loadingTask = pdfjsLib.getDocument({
          url: url,
          cMapUrl: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/cmaps/',
          cMapPacked: true,
          withCredentials: false
        });

        return loadingTask.promise;
      })
      .then(function (pdfDoc) {
        _pdfDoc = pdfDoc;
        _pageNum = 1;
        _scale = 1.0;

        var countEl = document.getElementById('sfvPageCount');
        var inputEl = document.getElementById('sfvPageNumInput');
        if (countEl) countEl.textContent = pdfDoc.numPages;
        if (inputEl) inputEl.max = pdfDoc.numPages;

        if (loadingEl) loadingEl.style.display = 'none';

        // Auto calculate fit width
        _fitMode = 'width';
        calculateFitScale().then(function () {
          renderPdfPage(_pageNum);
        });

        // Setup resize observer for responsive scaling
        var viewport = document.getElementById('sfvPdfViewport');
        if (viewport && window.ResizeObserver) {
          var ro = new ResizeObserver(function () {
            if (_fitMode === 'width') {
              calculateFitScale().then(function () {
                renderPdfPage(_pageNum);
              });
            }
          });
          ro.observe(viewport);
        }
      })
      .catch(function (err) {
        console.warn('[StudyFileViewer] PDF.js render failed, showing fallback options:', err);
        if (loadingEl) loadingEl.style.display = 'none';
        renderPdfFallback(url, opts, err);
      });
  }

  function calculateFitScale() {
    if (!_pdfDoc) return Promise.resolve();
    return _pdfDoc.getPage(_pageNum).then(function (page) {
      var viewport = document.getElementById('sfvPdfViewport');
      if (!viewport) return;
      var containerWidth = viewport.clientWidth - 32; // padding
      if (containerWidth <= 0) containerWidth = window.innerWidth - 32;

      var unscaledViewport = page.getViewport({ scale: 1.0 });
      var newScale = containerWidth / unscaledViewport.width;
      // Cap scale between 0.6 and 2.5
      _scale = Math.max(0.6, Math.min(2.5, newScale));
      updateZoomLabel();
    });
  }

  function renderPdfPage(num) {
    if (!_pdfDoc) return;
    _pageRendering = true;

    _pdfDoc.getPage(num).then(function (page) {
      var canvas = document.getElementById('sfvPdfCanvas');
      if (!canvas) {
        _pageRendering = false;
        return;
      }

      var ctx = canvas.getContext('2d');
      var viewport = page.getViewport({ scale: _scale, rotation: _rotation });

      // Support High-DPI displays (Retina, mobile screens)
      var outputScale = window.devicePixelRatio || 1;
      canvas.width = Math.floor(viewport.width * outputScale);
      canvas.height = Math.floor(viewport.height * outputScale);
      canvas.style.width = Math.floor(viewport.width) + 'px';
      canvas.style.height = Math.floor(viewport.height) + 'px';

      var transform = outputScale !== 1 ? [outputScale, 0, 0, outputScale, 0, 0] : null;

      var renderContext = {
        canvasContext: ctx,
        transform: transform,
        viewport: viewport
      };

      var renderTask = page.render(renderContext);
      renderTask.promise.then(function () {
        _pageRendering = false;
        if (_pageNumPending !== null) {
          renderPdfPage(_pageNumPending);
          _pageNumPending = null;
        }
      });
    });

    // Update page number UI
    var pageInput = document.getElementById('sfvPageNumInput');
    if (pageInput) pageInput.value = num;

    var prevBtn = document.getElementById('sfvPdfPrevBtn');
    var nextBtn = document.getElementById('sfvPdfNextBtn');
    if (prevBtn) prevBtn.disabled = num <= 1;
    if (nextBtn) nextBtn.disabled = _pdfDoc && num >= _pdfDoc.numPages;

    // Scroll viewport to top on page flip
    var vp = document.getElementById('sfvPdfViewport');
    if (vp) vp.scrollTop = 0;
  }

  function queueRenderPage(num) {
    if (_pageRendering) {
      _pageNumPending = num;
    } else {
      renderPdfPage(num);
    }
  }

  function prevPage() {
    if (!_pdfDoc || _pageNum <= 1) return;
    _pageNum--;
    queueRenderPage(_pageNum);
  }

  function nextPage() {
    if (!_pdfDoc || _pageNum >= _pdfDoc.numPages) return;
    _pageNum++;
    queueRenderPage(_pageNum);
  }

  function jumpToPage(val) {
    var p = parseInt(val, 10);
    if (isNaN(p) || !_pdfDoc) return;
    if (p < 1) p = 1;
    if (p > _pdfDoc.numPages) p = _pdfDoc.numPages;
    _pageNum = p;
    queueRenderPage(_pageNum);
  }

  function zoomIn() {
    _fitMode = 'custom';
    _scale = Math.min(3.0, _scale + 0.2);
    updateZoomLabel();
    queueRenderPage(_pageNum);
  }

  function zoomOut() {
    _fitMode = 'custom';
    _scale = Math.max(0.4, _scale - 0.2);
    updateZoomLabel();
    queueRenderPage(_pageNum);
  }

  function resetZoom() {
    _fitMode = 'custom';
    _scale = 1.0;
    updateZoomLabel();
    queueRenderPage(_pageNum);
  }

  function fitWidth() {
    _fitMode = 'width';
    calculateFitScale().then(function () {
      queueRenderPage(_pageNum);
    });
  }

  function updateZoomLabel() {
    var lbl = document.getElementById('sfvZoomLabel');
    if (lbl) lbl.textContent = Math.round(_scale * 100) + '%';
  }

  // ── 7. FALLBACK IF PDF.JS CANNOT LOAD CORS OR REMOTE BLOB ──────────────────
  function renderPdfFallback(url, opts, error) {
    var contentArea = document.getElementById('sfvContentArea');
    if (!contentArea) return;

    contentArea.innerHTML = `
      <div class="sfv-fallback-container">
        <div class="sfv-fallback-hero">
          <div class="sfv-fallback-icon">📄</div>
          <h3>${_esc(opts.title || 'PDF Document')}</h3>
          <p class="sfv-fallback-msg">Choose how you would like to view this PDF:</p>
          
          <div class="sfv-fallback-actions-grid">
            <button class="sfv-fallback-btn primary" onclick="window.StudyFileViewer.openInNativeApp('${_esc(url)}', '${_esc(opts.title)}')">
              <span class="sfv-fbtn-icon">📱</span>
              <div class="sfv-fbtn-content">
                <strong>Open in Device PDF Reader</strong>
                <small>Drive PDF Viewer, Adobe, or Samsung PDF</small>
              </div>
            </button>

            <button class="sfv-fallback-btn" onclick="window.StudyFileViewer.embedGoogleDocs('${_esc(url)}')">
              <span class="sfv-fbtn-icon">🌐</span>
              <div class="sfv-fbtn-content">
                <strong>Embedded Google Docs Viewer</strong>
                <small>View directly inside this screen</small>
              </div>
            </button>

            <button class="sfv-fallback-btn" onclick="window.StudyFileViewer.downloadFile('${_esc(url)}', '${_esc(opts.title)}')">
              <span class="sfv-fbtn-icon">⬇️</span>
              <div class="sfv-fbtn-content">
                <strong>Download PDF File</strong>
                <small>Save to device storage</small>
              </div>
            </button>

            <a href="${_esc(url)}" target="_blank" rel="noopener noreferrer" class="sfv-fallback-btn link">
              <span class="sfv-fbtn-icon">↗</span>
              <div class="sfv-fbtn-content">
                <strong>Open Direct Link</strong>
                <small>Open original URL in browser tab</small>
              </div>
            </a>
          </div>
        </div>

        <div class="sfv-fallback-preview-frame" id="sfvFallbackFrameWrap" style="display:none;">
          <iframe id="sfvFallbackIframe" src="" style="width:100%;height:100%;border:none;"></iframe>
        </div>
      </div>
    `;
  }

  function embedGoogleDocs(url) {
    var frameWrap = document.getElementById('sfvFallbackFrameWrap');
    var iframe = document.getElementById('sfvFallbackIframe');
    if (frameWrap && iframe) {
      frameWrap.style.display = 'block';
      iframe.src = 'https://docs.google.com/viewer?url=' + encodeURIComponent(url) + '&embedded=true';
      frameWrap.scrollIntoView({ behavior: 'smooth' });
    }
  }

  // ── 8. IMAGE RENDERER ──────────────────────────────────────────────────────
  function renderImage(url, opts) {
    var contentArea = document.getElementById('sfvContentArea');
    var loadingEl = document.getElementById('sfvLoading');
    if (!contentArea) return;

    var headerActions = document.getElementById('sfvHeaderActions');
    if (headerActions) {
      var imgControls = document.createElement('div');
      imgControls.className = 'sfv-img-toolbar-group';
      imgControls.innerHTML = `
        <button class="sfv-tool-btn" title="Rotate Image (90°)" onclick="window.StudyFileViewer.rotateImage()">🔄</button>
        <button class="sfv-tool-btn" title="Reset" onclick="window.StudyFileViewer.resetImage()">↺</button>
      `;
      headerActions.insertBefore(imgControls, headerActions.firstChild);
    }

    contentArea.innerHTML = `
      <div class="sfv-image-viewport" id="sfvImgViewport">
        <img src="${_esc(url)}" alt="${_esc(opts.title || 'Image')}" id="sfvImgTarget" class="sfv-image-target"/>
      </div>
    `;

    var img = document.getElementById('sfvImgTarget');
    if (img) {
      img.onload = function () {
        if (loadingEl) loadingEl.style.display = 'none';
      };
      img.onerror = function () {
        if (loadingEl) loadingEl.style.display = 'none';
        contentArea.innerHTML = `
          <div class="sfv-empty-state">
            <div class="sfv-empty-icon">⚠️</div>
            <h3>Image Could Not Be Loaded</h3>
            <p>The image URL may have expired or is blocked by network.</p>
            <a href="${_esc(url)}" target="_blank" rel="noopener" class="sfv-btn sfv-btn-native">Open Direct Link ↗</a>
          </div>
        `;
      };
    }
  }

  var _imgRotation = 0;
  function rotateImage() {
    _imgRotation = (_imgRotation + 90) % 360;
    var img = document.getElementById('sfvImgTarget');
    if (img) {
      img.style.transform = 'rotate(' + _imgRotation + 'deg)';
    }
  }

  function resetImage() {
    _imgRotation = 0;
    var img = document.getElementById('sfvImgTarget');
    if (img) {
      img.style.transform = 'rotate(0deg)';
    }
  }

  // ── 9. CODE RENDERER ───────────────────────────────────────────────────────
  function renderCode(codeContent, opts) {
    var contentArea = document.getElementById('sfvContentArea');
    var loadingEl = document.getElementById('sfvLoading');
    if (loadingEl) loadingEl.style.display = 'none';
    if (!contentArea) return;

    var headerActions = document.getElementById('sfvHeaderActions');
    if (headerActions) {
      var codeControls = document.createElement('div');
      codeControls.className = 'sfv-code-toolbar-group';
      codeControls.innerHTML = `
        <button class="sfv-btn" style="font-size:12px;padding:5px 12px;" onclick="window.StudyFileViewer.copyCode()">
          📋 Copy Code
        </button>
      `;
      headerActions.insertBefore(codeControls, headerActions.firstChild);
    }

    var lines = (codeContent || '').split('\n');
    var numberedCodeHtml = lines.map(function (line, idx) {
      return '<div class="sfv-code-line"><span class="sfv-line-num">' + (idx + 1) + '</span><span class="sfv-line-text">' + _esc(line) + '</span></div>';
    }).join('');

    contentArea.innerHTML = `
      <div class="sfv-code-viewport">
        <pre class="sfv-code-block"><code>${numberedCodeHtml}</code></pre>
      </div>
    `;
  }

  function copyCode() {
    if (_currentOptions && _currentOptions.content) {
      navigator.clipboard.writeText(_currentOptions.content).then(function () {
        if (window.LMToast) window.LMToast.show('📋 Code copied to clipboard!');
      });
    }
  }

  // ── 10. DOCUMENT / MARKDOWN RENDERER ───────────────────────────────────────
  function renderDoc(docContent, opts) {
    var contentArea = document.getElementById('sfvContentArea');
    var loadingEl = document.getElementById('sfvLoading');
    if (loadingEl) loadingEl.style.display = 'none';
    if (!contentArea) return;

    contentArea.innerHTML = `
      <div class="sfv-doc-viewport">
        <div class="sfv-doc-article">
          <h1 class="sfv-doc-heading">${_esc(opts.title || 'Document')}</h1>
          <div class="sfv-doc-body">${_esc(docContent)}</div>
        </div>
      </div>
    `;
  }

  // ── 11. VIDEO RENDERER ─────────────────────────────────────────────────────
  function renderVideo(url, opts) {
    var contentArea = document.getElementById('sfvContentArea');
    var loadingEl = document.getElementById('sfvLoading');
    if (loadingEl) loadingEl.style.display = 'none';
    if (!contentArea) return;

    var isYouTube = /youtu(\.be|be\.com)/i.test(url);
    var isVimeo = /vimeo\.com/i.test(url);
    var embedUrl = url;

    if (isYouTube) {
      var yId = (url.match(/(?:youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=)([^#&?]*)/) || [])[1];
      if (yId) embedUrl = 'https://www.youtube.com/embed/' + yId + '?autoplay=1';
    } else if (isVimeo) {
      var vId = (url.match(/vimeo\.com\/(\d+)/) || [])[1];
      if (vId) embedUrl = 'https://player.vimeo.com/video/' + vId + '?autoplay=1';
    }

    if (isYouTube || isVimeo) {
      contentArea.innerHTML = `
        <div class="sfv-video-viewport">
          <iframe src="${_esc(embedUrl)}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen class="sfv-video-iframe"></iframe>
        </div>
      `;
    } else {
      contentArea.innerHTML = `
        <div class="sfv-video-viewport">
          <video src="${_esc(url)}" controls autoplay class="sfv-video-native"></video>
        </div>
      `;
    }
  }

  // ── 12. LINK RENDERER ──────────────────────────────────────────────────────
  function renderLink(url, opts) {
    var contentArea = document.getElementById('sfvContentArea');
    var loadingEl = document.getElementById('sfvLoading');
    if (loadingEl) loadingEl.style.display = 'none';
    if (!contentArea) return;

    contentArea.innerHTML = `
      <div class="sfv-link-viewport">
        <div class="sfv-link-card">
          <div class="sfv-link-icon">🔗</div>
          <h2 class="sfv-link-title">${_esc(opts.title || 'External Reference')}</h2>
          <p class="sfv-link-desc">${_esc(opts.content || 'External web resource, article, or documentation link.')}</p>
          <code class="sfv-link-url">${_esc(url)}</code>
          <div class="sfv-link-actions">
            <a href="${_esc(url)}" target="_blank" rel="noopener noreferrer" class="sfv-btn sfv-btn-primary" style="padding:10px 24px;font-size:14px;text-decoration:none;">
              🚀 Open Link in New Tab ↗
            </a>
          </div>
        </div>
      </div>
    `;
  }

  // ── 13. FULLSCREEN TOGGLE ──────────────────────────────────────────────────
  function toggleFullscreen() {
    var container = document.getElementById('sfvContainer');
    var icon = document.getElementById('sfvFullscreenIcon');
    if (!container) return;

    if (!document.fullscreenElement) {
      if (container.requestFullscreen) {
        container.requestFullscreen().catch(function () {});
      } else if (container.webkitRequestFullscreen) {
        container.webkitRequestFullscreen();
      }
      if (icon) icon.textContent = '⤢';
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(function () {});
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      }
      if (icon) icon.textContent = '⛶';
    }
  }

  // ── 14. TOPIC STATUS & PROGRESS CONTROLS ───────────────────────────────────
  function updateStatus(status, pct) {
    if (!_currentOptions) return;
    _currentOptions.status = status;
    _currentOptions.progressPct = pct;

    var slider = document.getElementById('sfvProgressSlider');
    var label = document.getElementById('sfvPctLabel');
    if (slider) slider.value = pct;
    if (label) label.textContent = pct + '%';

    var btns = document.querySelectorAll('.sfv-st-btn');
    btns.forEach(function (btn) {
      btn.classList.remove('active', 'st-pending', 'st-inprogress', 'st-completed');
    });
    var targetBtn = document.querySelector('.sfv-st-btn.st-' + status) ||
      (status === 'pending' ? btns[0] : status === 'inprogress' ? btns[1] : btns[2]);
    if (targetBtn) targetBtn.classList.add('active', 'st-' + status);

    if (_currentOptions.materialId && window.StudyWorkspace && window.StudyWorkspace.setMaterialStatus) {
      window.StudyWorkspace.setMaterialStatus(_currentOptions.materialId, status, pct);
    }
    if (typeof _currentOptions.onStatusChange === 'function') {
      _currentOptions.onStatusChange(_currentOptions.materialId, status, pct);
    }
    if (window.LMToast) {
      var icon = status === 'completed' ? '✅' : (status === 'inprogress' ? '⏳' : '⚪');
      window.LMToast.show(icon + ' Status updated to ' + status + ' (' + pct + '%)');
    }
  }

  function onSliderInput(val) {
    var label = document.getElementById('sfvPctLabel');
    if (label) label.textContent = val + '%';
  }

  function onSliderChange(val) {
    var pct = parseInt(val, 10) || 0;
    var status = pct >= 100 ? 'completed' : (pct > 0 ? 'inprogress' : 'pending');
    updateStatus(status, pct);
  }

  // ── 15. OPEN STUDY MATERIAL HELPER ─────────────────────────────────────────
  function openMaterial(materialId, state, onStatusChange) {
    if (!materialId) return;
    var mat = null;
    if (state && state.materials) {
      mat = state.materials.find(function (m) { return m.id === materialId; });
    } else if (window.StudyWorkspace && window.StudyWorkspace.getState) {
      var s = window.StudyWorkspace.getState();
      mat = s.materials ? s.materials.find(function (m) { return m.id === materialId; }) : null;
    }
    if (!mat) return;

    var displayUrl = mat.file_url || mat.external_url || '';
    var matStatus = mat.status || 'pending';
    var matPct = mat.progress_pct !== undefined ? mat.progress_pct : (matStatus === 'completed' ? 100 : (matStatus === 'inprogress' ? 50 : 0));

    open({
      title: mat.title,
      fileUrl: displayUrl,
      type: mat.material_type,
      content: mat.content,
      materialId: mat.id,
      topicId: mat.topic_id,
      status: matStatus,
      progressPct: matPct,
      storagePath: mat.storage_path,
      fileSize: mat.file_size_bytes,
      onStatusChange: onStatusChange || function (id, st, pct) {
        if (window.StudyWorkspace && window.StudyWorkspace.setMaterialStatus) {
          window.StudyWorkspace.setMaterialStatus(id, st, pct);
        }
      }
    });
  }

  // ── 16. EXPOSE PUBLIC API ──────────────────────────────────────────────────
  window.StudyFileViewer = {
    open: open,
    close: close,
    openMaterial: openMaterial,
    openInNativeApp: openInNativeApp,
    openInGoogleDocs: openInGoogleDocs,
    downloadFile: downloadFile,
    embedGoogleDocs: embedGoogleDocs,
    toggleFullscreen: toggleFullscreen,
    prevPage: prevPage,
    nextPage: nextPage,
    jumpToPage: jumpToPage,
    zoomIn: zoomIn,
    zoomOut: zoomOut,
    resetZoom: resetZoom,
    fitWidth: fitWidth,
    rotateImage: rotateImage,
    resetImage: resetImage,
    copyCode: copyCode,
    updateStatus: updateStatus,
    onSliderInput: onSliderInput,
    onSliderChange: onSliderChange
  };

})();
