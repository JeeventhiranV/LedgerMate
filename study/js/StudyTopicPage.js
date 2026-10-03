/* ══════════════════════════════════════════════════════════════════════════
   StudyTopicPage.js — Standalone Topic Workspace Controller
   ─────────────────────────────────────────────────────────────────────────
   Dedicated full-page workspace for custom learning topics, rich notes,
   attached materials vault, in-page previewer, and direct external link openers.
   ══════════════════════════════════════════════════════════════════════════ */

(function (window) {
  'use strict';

  var _currentTopicId = null;
  var _activePreviewMaterialId = null;
  var _sidebarSearchQuery = '';
  var _materialFilter = 'all'; // 'all' | 'pdf' | 'link' | 'image' | 'code' | 'doc'
  var _noteSaveTimeout = null;

  function _esc(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function init() {
    // 1. Sync user avatar
    _syncUserAvatar();

    // 2. Resolve target topic ID from URL
    var params = new URLSearchParams(window.location.search);
    var topicId = params.get('id');

    // Wait for StudyWorkspace state or local storage
    if (window.StudyWorkspace) {
      var state = window.StudyWorkspace.getState();
      if (!topicId && state && state.topics && state.topics.length > 0) {
        var last = state.prefs && state.prefs.last_active_topic ? state.prefs.last_active_topic.id : null;
        topicId = last || state.topics[0].id;
      }
    }

    _currentTopicId = topicId;

    // Render immediately from local, and listen for Supabase sync
    renderAll();

    // Setup dropzones
    _initDropzones();
  }

  function _syncUserAvatar() {
    var av = document.getElementById('studyUserAvatar');
    if (!av) return;
    try {
      var sess = JSON.parse(localStorage.getItem('lm_session') || '{}');
      var name = sess.displayName || sess.name || (sess.username ? sess.username.split('@')[0] : '') || (sess.user && sess.user.email ? sess.user.email.split('@')[0] : 'U');
      av.textContent = (name || 'U').charAt(0).toUpperCase();
    } catch (e) {
      av.textContent = 'U';
    }
  }

  var _sidebarToggling = false;
  function toggleSidebar(forceState, e) {
    if (e && typeof e.stopPropagation === 'function') {
      e.stopPropagation();
    }
    if (_sidebarToggling && typeof forceState !== 'boolean') return;
    _sidebarToggling = true;
    setTimeout(function() { _sidebarToggling = false; }, 250);

    var sidebar = document.getElementById('sidebar');
    var overlay = document.getElementById('sidebarOverlay');
    if (!sidebar) return;
    var isOpen = sidebar.classList.contains('open');
    var next = typeof forceState === 'boolean' ? forceState : !isOpen;
    if (next) {
      sidebar.classList.add('open');
      if (overlay) overlay.classList.add('open');
    } else {
      sidebar.classList.remove('open');
      if (overlay) overlay.classList.remove('open');
    }
  }

  function getCurrentTopicId() {
    return _currentTopicId;
  }

  function loadTopic(topicId) {
    if (!topicId) return;
    _currentTopicId = topicId;
    _activePreviewMaterialId = null;

    try {
      var newUrl = new URL(window.location.href);
      newUrl.searchParams.set('id', topicId);
      window.history.pushState({ topicId: topicId }, '', newUrl.toString());
    } catch (e) {}

    // Auto-close drawer so topic workspace has 100% full view
    toggleSidebar(false);

    renderAll();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function renderAll() {
    renderSidebar();
    renderMainWorkspace();
  }

  // ── SIDEBAR RENDERER ───────────────────────────────────────────────────────
  function renderSidebar() {
    var container = document.getElementById('sidebarTopicTree');
    if (!container) return;

    if (!window.StudyWorkspace) {
      container.innerHTML = '<div style="padding:16px;color:var(--text3);font-size:12px;">Loading topics...</div>';
      return;
    }

    var state = window.StudyWorkspace.getState();
    var domains = state.domains || [];
    var categories = state.categories || [];
    var topics = state.topics || [];
    var materials = state.materials || [];

    if (domains.length === 0 && topics.length === 0) {
      container.innerHTML = `
        <div style="padding:20px;text-align:center;color:var(--text3);font-size:12px;">
          <div>No custom tracks yet.</div>
          <a href="index.html" class="ws-btn-primary" style="margin-top:10px;font-size:11px;display:inline-flex;">
            ➕ Create Track in Hub
          </a>
        </div>
      `;
      return;
    }

    var q = (_sidebarSearchQuery || '').toLowerCase().trim();

    var sidebarHtml = domains.map(function (dom) {
      var domCats = categories.filter(function (c) { return c.domain_id === dom.id; });
      if (domCats.length === 0) {
        domCats = [{ id: 'cat_gen_' + dom.id, domain_id: dom.id, title: 'Core Modules' }];
      }

      var hasMatchingTopics = false;

      var modulesHtml = domCats.map(function (cat) {
        var catTopics = topics.filter(function (t) { return t.category_id === cat.id; });
        var filteredTopics = catTopics.filter(function (t) {
          if (!q) return true;
          return (t.title || '').toLowerCase().includes(q) || (t.notes || '').toLowerCase().includes(q);
        });

        if (filteredTopics.length > 0) hasMatchingTopics = true;
        if (filteredTopics.length === 0 && q) return '';

        var topicsListHtml = filteredTopics.map(function (t) {
          var isActive = t.id === _currentTopicId;
          var tMats = materials.filter(function (m) { return m.topic_id === t.id; });
          var st = t.status || 'pending';
          var stIcon = st === 'completed' ? '✅' : (st === 'inprogress' ? '⏳' : '⚪');

          return `
            <a class="sidebar-topic-item ${isActive ? 'active' : ''}" 
               href="javascript:void(0)" 
               onclick="window.StudyTopicPage.loadTopic('${t.id}')"
               title="${_esc(t.title)}">
              <span class="sidebar-topic-icon">${stIcon}</span>
              <span class="sidebar-topic-title">${_esc(t.title)}</span>
              ${tMats.length > 0 ? `<span class="sidebar-topic-badge">📎 ${tMats.length}</span>` : ''}
            </a>
          `;
        }).join('');

        return `
          <div class="sidebar-module-group">
            <div class="sidebar-module-label">
              <span>📦 ${_esc(cat.title)}</span>
              <button class="sidebar-mini-add-btn" onclick="window.StudyWorkspace.openAddTopicModal('${cat.id}')" title="Add Topic to Module">+</button>
            </div>
            <div class="sidebar-topics-list">
              ${topicsListHtml || '<div style="font-size:11px;color:var(--text3);padding:4px 8px;">No topics in module</div>'}
            </div>
          </div>
        `;
      }).join('');

      if (q && !hasMatchingTopics) return '';

      return `
        <div class="nav-section" style="margin-bottom:12px;border-bottom:1px solid rgba(255,255,255,0.04);padding-bottom:10px;">
          <div class="sidebar-track-header" style="--track-color:${dom.color || '#38bdf8'};">
            <span class="sidebar-track-icon">${_esc(dom.icon || '📘')}</span>
            <span class="sidebar-track-name">${_esc(dom.title)}</span>
            <button class="sidebar-mini-add-btn" onclick="window.StudyWorkspace.openAddCategoryModal('${dom.id}')" title="Add Module">➕</button>
          </div>
          ${modulesHtml}
        </div>
      `;
    }).join('');

    container.innerHTML = sidebarHtml || '<div style="padding:16px;color:var(--text3);font-size:12px;text-align:center;">No matching topics found</div>';
  }

  function handleSidebarSearch(query) {
    _sidebarSearchQuery = query || '';
    renderSidebar();
  }

  // ── MAIN WORKSPACE RENDERER ────────────────────────────────────────────────
  function renderMainWorkspace() {
    var container = document.getElementById('topicWorkspaceContent');
    if (!container) return;

    if (!window.StudyWorkspace) {
      container.innerHTML = '<div style="padding:40px;text-align:center;color:var(--text3);">Loading topic details...</div>';
      return;
    }

    var state = window.StudyWorkspace.getState();
    var t = (state.topics || []).find(function (x) { return x.id === _currentTopicId; });

    if (!t) {
      if (state.topics && state.topics.length > 0) {
        _currentTopicId = state.topics[0].id;
        t = state.topics[0];
      } else {
        container.innerHTML = `
          <div class="empty-topic-state">
            <div style="font-size:48px;margin-bottom:12px;">📚</div>
            <h2>No Custom Topic Selected</h2>
            <p>Select a topic from the sidebar or create a new section track from the Study Hub.</p>
            <div style="display:flex;gap:10px;margin-top:16px;justify-content:center;">
              <a href="index.html" class="ws-btn-primary">⬅️ Back to Study Hub</a>
              <button class="ws-btn-secondary" onclick="window.StudyWorkspace.openStudio('sections')">⚙️ Open Custom Studio</button>
            </div>
          </div>
        `;
        return;
      }
    }

    var cat = (state.categories || []).find(function (c) { return c.id === t.category_id; });
    var dom = cat ? (state.domains || []).find(function (d) { return d.id === cat.domain_id; }) : null;
    var mats = (state.materials || []).filter(function (m) { return m.topic_id === t.id; });

    if (window.StudyWorkspace.setLastActiveTopic) {
      window.StudyWorkspace.setLastActiveTopic({
        id: t.id,
        title: t.title,
        domainId: dom ? dom.id : null,
        domainTitle: dom ? dom.title : 'Study Module',
        status: t.status
      });
    }

    var filteredMats = mats.filter(function (m) {
      if (_materialFilter === 'all') return true;
      if (_materialFilter === 'pdf') return m.material_type === 'pdf';
      if (_materialFilter === 'link') return m.material_type === 'link' || m.material_type === 'video' || (m.external_url && !m.file_url);
      if (_materialFilter === 'image') return m.material_type === 'image';
      if (_materialFilter === 'code') return m.material_type === 'code';
      if (_materialFilter === 'doc') return m.material_type === 'doc' || m.material_type === 'note' || m.material_type === 'article';
      return true;
    });

    var tStatus = t.status || 'pending';

    var matsGridHtml = filteredMats.map(function (m) {
      var mStatus = m.status || 'pending';
      var mIcon = mStatus === 'completed' ? '✅' : (mStatus === 'inprogress' ? '⏳' : '⚪');
      var mPct = m.progress_pct !== undefined ? m.progress_pct : (mStatus === 'completed' ? 100 : 0);
      var displayUrl = m.file_url || m.external_url || '';
      var isDirectLink = !!(m.external_url || (displayUrl && (m.material_type === 'link' || m.material_type === 'video')));

      return `
        <div class="topic-page-mat-card ${m.id === _activePreviewMaterialId ? 'preview-active' : ''}">
          <div class="mat-card-header">
            <div style="display:flex;align-items:center;gap:6px;min-width:0;">
              <span class="material-type-tag ${m.material_type}">${m.material_type}</span>
              <span class="mat-card-size">${m.file_size_bytes ? Math.round(m.file_size_bytes/1024) + ' KB' : (isDirectLink ? 'External Link' : 'Document')}</span>
            </div>
            <div style="display:flex;align-items:center;gap:4px;">
              <button class="mat-chip-status-btn" onclick="window.StudyTopicPage.cycleMaterialStatus('${m.id}')" title="Cycle Status (${mStatus})">${mIcon}</button>
              <button class="ws-btn-danger-icon" onclick="window.StudyTopicPage.deleteMaterial('${m.id}')" title="Delete file">🗑️</button>
            </div>
          </div>

          <div class="mat-card-body">
            <h4 class="mat-card-title" title="${_esc(m.title)}">${_esc(m.title)}</h4>
            ${m.content && m.material_type !== 'code' ? `<p class="mat-card-desc">${_esc(m.content)}</p>` : ''}
            ${m.storage_path ? `<div class="mat-card-storage-badge" title="Supabase Cloud Path">☁️ ${_esc(m.storage_path)}</div>` : ''}
          </div>

          <div class="mat-card-progress-row">
            <div class="metric-progress-track" style="flex:1;">
              <div class="metric-progress-fill" style="width:${mPct}%;background:linear-gradient(90deg,#8b5cf6,#06d6a0);"></div>
            </div>
            <span class="st-badge st-${mStatus}" style="font-size:10px;">${mStatus} (${mPct}%)</span>
          </div>

          <div class="mat-card-actions">
            ${displayUrl ? `
              <a href="${_esc(displayUrl)}" target="_blank" rel="noopener noreferrer" class="ws-btn-extlink" style="font-weight:700;font-size:12px;padding:6px 14px;">
                🔗 Open Link ↗
              </a>
            ` : ''}

            <button class="ws-btn-secondary" onclick="window.StudyTopicPage.openMaterialPreview('${m.id}')" style="font-size:11.5px;padding:5px 10px;">
              👁️ View in Page
            </button>
          </div>
        </div>
      `;
    }).join('');

    var previewPaneHtml = '';
    if (_activePreviewMaterialId) {
      var activeMat = mats.find(function (m) { return m.id === _activePreviewMaterialId; });
      if (activeMat) {
        var pUrl = activeMat.file_url || activeMat.external_url || '';
        var pBody = '';

        if (activeMat.material_type === 'pdf' && pUrl) {
          pBody = `
            <div class="inpage-preview-topbar">
              <div style="font-size:13px;font-weight:700;color:var(--text);display:flex;align-items:center;gap:8px;">
                <span>📄 Embedded PDF Viewer:</span>
                <span style="color:var(--blue,#4f8ef7);">${_esc(activeMat.title)}</span>
              </div>
              <a href="${_esc(pUrl)}" target="_blank" rel="noopener noreferrer" class="ws-btn-extlink" style="font-size:12px;padding:6px 14px;">
                🔗 Open PDF in New Tab ↗
              </a>
            </div>
            <div class="inpage-pdf-frame-wrap">
              <iframe src="${_esc(pUrl)}" style="width:100%;height:650px;border:none;border-radius:10px;"></iframe>
            </div>
          `;
        } else if (activeMat.material_type === 'image' && pUrl) {
          pBody = `
            <div class="inpage-preview-topbar">
              <div style="font-size:13px;font-weight:700;color:var(--text);">🖼️ Image Preview: ${_esc(activeMat.title)}</div>
              <a href="${_esc(pUrl)}" target="_blank" rel="noopener noreferrer" class="ws-btn-extlink">
                🔗 Open Full Resolution ↗
              </a>
            </div>
            <div style="text-align:center;padding:20px;background:rgba(0,0,0,0.3);border-radius:10px;">
              <img src="${_esc(pUrl)}" alt="${_esc(activeMat.title)}" style="max-width:100%;max-height:550px;border-radius:8px;box-shadow:0 8px 30px rgba(0,0,0,0.6);"/>
            </div>
          `;
        } else if (activeMat.material_type === 'code') {
          pBody = `
            <div class="inpage-preview-topbar">
              <div style="font-size:13px;font-weight:700;color:var(--text);">💻 Source Code: ${_esc(activeMat.title)}</div>
              <button class="ws-btn-secondary" onclick="navigator.clipboard.writeText(decodeURIComponent('${encodeURIComponent(activeMat.content)}'));if(window.LMToast)window.LMToast.show('📋 Code copied to clipboard!');">
                📋 Copy Code Snippet
              </button>
            </div>
            <pre class="inpage-code-block"><code>${_esc(activeMat.content)}</code></pre>
          `;
        } else if (activeMat.material_type === 'link' || activeMat.material_type === 'video' || pUrl) {
          pBody = `
            <div class="inpage-link-hero-box">
              <div style="font-size:44px;margin-bottom:10px;">${activeMat.material_type === 'video' ? '🎥' : '🔗'}</div>
              <h3 style="font-size:18px;font-weight:700;color:var(--text);margin-bottom:8px;">${_esc(activeMat.title)}</h3>
              <p style="font-size:13px;color:var(--text3);max-width:600px;margin:0 auto 18px;">${_esc(activeMat.content || 'External documentation, video lecture, or cloud resource link.')}</p>
              
              <div style="margin-bottom:16px;">
                <code style="background:rgba(0,0,0,0.4);padding:6px 14px;border-radius:6px;font-size:12px;color:var(--cyan,#38bdf8);border:1px solid rgba(56,189,248,0.2);word-break:break-all;">
                  ${_esc(pUrl)}
                </code>
              </div>

              <a href="${_esc(pUrl)}" target="_blank" rel="noopener noreferrer" class="ws-btn-primary" style="font-size:14px;padding:10px 24px;text-decoration:none;display:inline-flex;">
                🔗 Open External Link in New Tab ↗
              </a>
            </div>
          `;
        } else {
          pBody = `
            <div style="padding:20px;background:rgba(255,255,255,0.02);border-radius:10px;font-size:14px;line-height:1.7;white-space:pre-wrap;">
              ${_esc(activeMat.content || activeMat.title)}
            </div>
          `;
        }

        previewPaneHtml = `
          <div class="inpage-material-previewer-card" id="inpageMaterialPreviewer">
            <div class="inpage-preview-header-main">
              <div style="display:flex;align-items:center;gap:8px;">
                <span class="material-type-tag ${activeMat.material_type}">${activeMat.material_type}</span>
                <span style="font-weight:700;font-size:15px;color:var(--text);">${_esc(activeMat.title)}</span>
              </div>
              <button class="ws-btn-secondary" style="font-size:11px;padding:4px 8px;" onclick="window.StudyTopicPage.closeMaterialPreview()">✕ Close Preview</button>
            </div>
            ${pBody}
          </div>
        `;
      }
    }

    container.innerHTML = `
      <!-- TOPIC HERO HEADER -->
      <div class="topic-workspace-hero">
        <div class="topic-breadcrumb-bar">
          <a href="index.html" class="breadcrumb-link">📚 Study Hub</a>
          <span class="breadcrumb-sep">➔</span>
          <span class="breadcrumb-item" style="color:${dom ? dom.color : 'var(--blue,#4f8ef7)'};">${_esc(dom ? dom.title : 'Track')}</span>
          <span class="breadcrumb-sep">➔</span>
          <span class="breadcrumb-item">${_esc(cat ? cat.title : 'Module')}</span>
          <span class="breadcrumb-sep">➔</span>
          <span class="breadcrumb-current">${_esc(t.title)}</span>
        </div>

        <div class="topic-hero-main-row">
          <div class="topic-hero-title-group">
            <span class="topic-hero-icon">📖</span>
            <div>
              <h1 class="topic-hero-title">${_esc(t.title)}</h1>
              <div class="topic-hero-meta">
                <span>🎯 Track: <strong style="color:var(--blue,#4f8ef7);">${_esc(dom ? dom.title : 'Custom Track')}</strong></span>
                <span>📦 Module: <strong>${_esc(cat ? cat.title : 'Core Module')}</strong></span>
                <span>📎 <strong>${mats.length}</strong> attached files</span>
              </div>
            </div>
          </div>

          <div class="topic-hero-actions">
            <div class="topic-status-picker">
              <label style="font-size:11px;font-weight:700;color:var(--text3);text-transform:uppercase;">Topic Status:</label>
              <select class="ws-form-select topic-status-dropdown" onchange="window.StudyTopicPage.setTopicStatus('${t.id}', this.value)">
                <option value="pending" ${tStatus==='pending'?'selected':''}>⚪ PENDING</option>
                <option value="inprogress" ${tStatus==='inprogress'?'selected':''}>⏳ IN PROGRESS</option>
                <option value="completed" ${tStatus==='completed'?'selected':''}>✅ COMPLETED</option>
                <option value="onhold" ${tStatus==='onhold'?'selected':''}>⏸️ ON HOLD</option>
              </select>
            </div>

            <button class="btn-pomo-action" onclick="window.StudyTopicPage.startFocusOnTopic('${t.id}')" title="Start 25-minute Pomodoro focus session">
              ⏱️ Focus Sprint (25m)
            </button>

            <button class="ws-btn-danger" onclick="window.StudyTopicPage.deleteCurrentTopic('${t.id}')" title="Delete this topic">
              🗑️ Delete
            </button>
          </div>
        </div>
      </div>

      <!-- WORKSPACE 2-COLUMN / STACKED CONTENT -->
      <div class="topic-workspace-grid">
        
        <!-- COLUMN 1: STUDY NOTES & OBSERVATIONS -->
        <div class="topic-notes-card">
          <div class="topic-card-header">
            <div class="topic-card-title">
              <span>📝</span> Personal Study Notes &amp; Key Takeaways
            </div>
            <div style="display:flex;align-items:center;gap:8px;">
              <span id="noteSaveIndicator" class="note-save-badge">☁️ Saved</span>
              <button class="ws-btn-secondary" style="font-size:11px;padding:3px 8px;" onclick="window.StudyTopicPage.copyNotes()">📋 Copy</button>
              <button class="ws-btn-secondary" style="font-size:11px;padding:3px 8px;" onclick="window.StudyTopicPage.clearNotes('${t.id}')">🧹 Clear</button>
            </div>
          </div>
          <p style="font-size:12px;color:var(--text3);margin-bottom:10px;">
            Document syntax patterns, interview edge cases, algorithmic formulas, and personal learnings. Automatically saved to cloud.
          </p>
          <textarea id="topicNotesEditor" 
                    class="topic-notes-textarea" 
                    placeholder="Type your notes, code snippets, takeaways, and memory tricks here..."
                    oninput="window.StudyTopicPage.handleNoteInput('${t.id}', this.value)">${_esc(t.notes || '')}</textarea>
        </div>

        <!-- COLUMN 2: QUICK ATTACH & DROPZONE -->
        <div class="topic-upload-card">
          <div class="topic-card-header">
            <div class="topic-card-title">
              <span>☁️</span> Upload &amp; Attach Learning Materials
            </div>
          </div>
          <p style="font-size:12px;color:var(--text3);margin-bottom:12px;">
            Drop PDFs, docs, code files or enter external documentation URLs directly into this topic.
          </p>

          <div class="ws-file-dropzone" id="topicPageDropzone"
               onclick="document.getElementById('topicPageFileInput').click()"
               ondragover="window.StudyTopicPage.handleDropOver(event)"
               ondragleave="window.StudyTopicPage.handleDropLeave(event)"
               ondrop="window.StudyTopicPage.handleDrop(event)">
            <span class="dropzone-icon">📁</span>
            <div class="dropzone-text" style="font-size:13px;">Click or Drag &amp; Drop Files to Upload</div>
            <div class="dropzone-subtext">PDFs, Code, Images, Notes stored in Supabase Bucket</div>
            <input type="file" id="topicPageFileInput" style="display:none;" onchange="window.StudyTopicPage.handleFileSelect(this)" accept=".pdf,.doc,.docx,.txt,.md,.png,.jpg,.jpeg,.webp,.svg,.js,.ts,.py,.java,.cpp,.sql,.html,.css,.json"/>
          </div>

          <div class="ws-upload-progress" id="topicPageProgress" style="display:none;margin-top:8px;">
            <div class="ws-upload-progress-fill" id="topicPageProgressFill" style="width:0%;"></div>
          </div>

          <div style="margin-top:14px;border-top:1px solid rgba(255,255,255,0.06);padding-top:12px;">
            <label class="ws-form-label" style="font-size:11.5px;">🔗 Or Attach External Link / Documentation URL</label>
            <div style="display:flex;gap:6px;margin-bottom:6px;">
              <input type="text" id="quickLinkTitle" class="ws-form-input" placeholder="Link Title (e.g. Official Docs)" style="font-size:12px;padding:6px 10px;"/>
              <input type="url" id="quickLinkUrl" class="ws-form-input" placeholder="https://..." style="font-size:12px;padding:6px 10px;"/>
            </div>
            <button class="ws-btn-primary" onclick="window.StudyTopicPage.saveQuickLink('${t.id}')" style="font-size:11.5px;padding:5px 12px;width:100%;justify-content:center;">
              🔗 Attach External Link
            </button>
          </div>
        </div>

      </div>

      <!-- IN-PAGE PREVIEWER CONTAINER (IF ACTIVE) -->
      ${previewPaneHtml}

      <!-- ATTACHED MATERIALS & FILE VAULT SECTION -->
      <div class="topic-materials-section">
        <div class="topic-materials-header-row">
          <div>
            <div class="topic-materials-title">
              <span>📂</span> Topic Attached Materials &amp; Vault (${mats.length} total)
            </div>
            <div style="font-size:12px;color:var(--text3);margin-top:2px;">
              All files and documentation links attached to this topic
            </div>
          </div>

          <div class="topic-mat-filter-tabs">
            <button class="mat-filter-btn ${_materialFilter==='all'?'active':''}" onclick="window.StudyTopicPage.setMaterialFilter('all')">All (${mats.length})</button>
            <button class="mat-filter-btn ${_materialFilter==='pdf'?'active':''}" onclick="window.StudyTopicPage.setMaterialFilter('pdf')">📄 PDFs</button>
            <button class="mat-filter-btn ${_materialFilter==='link'?'active':''}" onclick="window.StudyTopicPage.setMaterialFilter('link')">🔗 Links</button>
            <button class="mat-filter-btn ${_materialFilter==='image'?'active':''}" onclick="window.StudyTopicPage.setMaterialFilter('image')">🖼️ Images</button>
            <button class="mat-filter-btn ${_materialFilter==='code'?'active':''}" onclick="window.StudyTopicPage.setMaterialFilter('code')">💻 Code</button>
          </div>
        </div>

        <div class="topic-materials-grid">
          ${matsGridHtml || '<div class="empty-mats-box">No materials matching this filter yet. Drop a file or enter an external link above.</div>'}
        </div>
      </div>
    `;
  }

  // ── USER INTERACTIONS & EVENT HANDLERS ─────────────────────────────────────
  function setTopicStatus(topicId, status) {
    if (window.StudyWorkspace && window.StudyWorkspace.setTopicStatus) {
      window.StudyWorkspace.setTopicStatus(topicId, status);
      renderAll();
      if (window.LMToast) window.LMToast.show('✅ Topic status: ' + status.toUpperCase());
    }
  }

  function handleNoteInput(topicId, notes) {
    var ind = document.getElementById('noteSaveIndicator');
    if (ind) {
      ind.textContent = '⏳ Saving...';
      ind.style.color = 'var(--gold,#f59e0b)';
    }

    if (_noteSaveTimeout) clearTimeout(_noteSaveTimeout);
    _noteSaveTimeout = setTimeout(function () {
      if (window.StudyWorkspace && window.StudyWorkspace.updateTopicNotes) {
        window.StudyWorkspace.updateTopicNotes(topicId, notes);
        if (ind) {
          ind.textContent = '☁️ Saved';
          ind.style.color = 'var(--teal,#06d6a0)';
        }
      }
    }, 600);
  }

  function copyNotes() {
    var ed = document.getElementById('topicNotesEditor');
    if (!ed || !ed.value) {
      if (window.LMToast) window.LMToast.show('⚠️ Notes are empty');
      return;
    }
    navigator.clipboard.writeText(ed.value);
    if (window.LMToast) window.LMToast.show('📋 Notes copied to clipboard!');
  }

  function clearNotes(topicId) {
    if (!confirm('Are you sure you want to clear your notes for this topic?')) return;
    var ed = document.getElementById('topicNotesEditor');
    if (ed) ed.value = '';
    handleNoteInput(topicId, '');
  }

  function setMaterialFilter(filterKey) {
    _materialFilter = filterKey;
    renderMainWorkspace();
  }

  function openMaterialPreview(materialId) {
    _activePreviewMaterialId = materialId;
    renderMainWorkspace();
    var el = document.getElementById('inpageMaterialPreviewer');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }

  function closeMaterialPreview() {
    _activePreviewMaterialId = null;
    renderMainWorkspace();
  }

  function cycleMaterialStatus(materialId) {
    if (window.StudyWorkspace && window.StudyWorkspace.cycleMaterialStatus) {
      window.StudyWorkspace.cycleMaterialStatus(materialId);
      renderMainWorkspace();
      renderSidebar();
    }
  }

  function deleteMaterial(materialId) {
    if (!confirm('Delete this material attachment from workspace & cloud storage?')) return;
    if (window.StudyWorkspace && window.StudyWorkspace.deleteMaterial) {
      window.StudyWorkspace.deleteMaterial(materialId);
      if (_activePreviewMaterialId === materialId) _activePreviewMaterialId = null;
      renderMainWorkspace();
      renderSidebar();
    }
  }

  function deleteCurrentTopic(topicId) {
    if (!confirm('Are you sure you want to delete this topic and all its attached files?')) return;
    if (window.StudyWorkspace && window.StudyWorkspace.deleteTopic) {
      window.StudyWorkspace.deleteTopic(topicId);
      if (window.LMToast) window.LMToast.show('🗑️ Topic deleted');
      var state = window.StudyWorkspace.getState();
      if (state.topics && state.topics.length > 0) {
        _currentTopicId = state.topics[0].id;
        renderAll();
      } else {
        window.location.href = 'index.html';
      }
    }
  }

  function startFocusOnTopic(topicId) {
    if (window.StudyWorkspace && window.StudyWorkspace.setPomoTopic) {
      window.StudyWorkspace.setPomoTopic(topicId);
      window.StudyWorkspace.togglePomoTimer();
      if (window.LMToast) window.LMToast.show('⏱️ 25m Focus Sprint Started!');
    }
  }

  function saveQuickLink(topicId) {
    var title = document.getElementById('quickLinkTitle')?.value.trim();
    var url = document.getElementById('quickLinkUrl')?.value.trim();

    if (!title || !url) {
      if (window.LMToast) window.LMToast.show('⚠️ Please enter both link title and URL');
      return;
    }

    var newMat = {
      id: 'mat_' + Date.now(),
      topic_id: topicId,
      title: title,
      material_type: 'link',
      external_url: url,
      file_url: url,
      storage_path: null,
      file_size_bytes: 0,
      status: 'pending',
      progress_pct: 0,
      content: 'Documentation link: ' + url,
      created_at: new Date().toISOString()
    };

    if (window.StudyWorkspace) {
      var state = window.StudyWorkspace.getState();
      state.materials.unshift(newMat);
      localStorage.setItem('lm_study_custom_workspace_v2', JSON.stringify({
        domains: state.domains,
        categories: state.categories,
        topics: state.topics,
        materials: state.materials,
        goals: state.goals,
        timeLogs: state.timeLogs
      }));

      if (window.StudyWorkspace.uploadFileToStorage) {
        var uid = state.uid;
        if (uid && typeof _supabase !== 'undefined' && _supabase) {
          _supabase.from('study_materials').insert(Object.assign({ user_id: uid }, newMat)).then(function () {});
        }
      }
    }

    if (window.LMToast) window.LMToast.show('✅ External link attached!');
    renderAll();
  }

  // ── DROPZONE & FILE UPLOADER ───────────────────────────────────────────────
  function _initDropzones() {}

  function handleDropOver(e) {
    e.preventDefault();
    e.stopPropagation();
    var el = document.getElementById('topicPageDropzone');
    if (el) el.classList.add('dropzone-active');
  }

  function handleDropLeave(e) {
    e.preventDefault();
    e.stopPropagation();
    var el = document.getElementById('topicPageDropzone');
    if (el) el.classList.remove('dropzone-active');
  }

  function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    var el = document.getElementById('topicPageDropzone');
    if (el) el.classList.remove('dropzone-active');

    if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      _uploadFile(e.dataTransfer.files[0]);
    }
  }

  function handleFileSelect(input) {
    if (input && input.files && input.files.length > 0) {
      _uploadFile(input.files[0]);
    }
  }

  function _uploadFile(file) {
    if (!_currentTopicId) return;

    var prog = document.getElementById('topicPageProgress');
    var fill = document.getElementById('topicPageProgressFill');
    if (prog) prog.style.display = 'block';
    if (fill) fill.style.width = '30%';

    var ext = (file.name.split('.').pop() || '').toLowerCase();
    var matType = 'doc';
    if (['pdf'].includes(ext)) matType = 'pdf';
    else if (['png', 'jpg', 'jpeg', 'webp', 'svg'].includes(ext)) matType = 'image';
    else if (['js', 'ts', 'py', 'java', 'cpp', 'sql', 'html', 'css', 'json'].includes(ext)) matType = 'code';

    if (window.StudyWorkspace && window.StudyWorkspace.uploadFileToStorage) {
      window.StudyWorkspace.uploadFileToStorage(file, _currentTopicId).then(function (res) {
        if (fill) fill.style.width = '100%';

        var newMat = {
          id: 'mat_' + Date.now(),
          topic_id: _currentTopicId,
          title: file.name.replace(/\.[^/.]+$/, ''),
          material_type: matType,
          external_url: res.fileUrl || '',
          file_url: res.fileUrl || '',
          storage_path: res.storagePath || null,
          file_size_bytes: file.size,
          status: 'pending',
          progress_pct: 0,
          content: '',
          created_at: new Date().toISOString()
        };

        var state = window.StudyWorkspace.getState();
        state.materials.unshift(newMat);
        localStorage.setItem('lm_study_custom_workspace_v2', JSON.stringify({
          domains: state.domains,
          categories: state.categories,
          topics: state.topics,
          materials: state.materials,
          goals: state.goals,
          timeLogs: state.timeLogs
        }));

        var uid = state.uid;
        if (uid && typeof _supabase !== 'undefined' && _supabase) {
          _supabase.from('study_materials').insert(Object.assign({ user_id: uid }, newMat)).then(function () {});
        }

        setTimeout(function () {
          if (prog) prog.style.display = 'none';
          if (window.LMToast) window.LMToast.show('✅ File uploaded & attached to topic!');
          renderAll();
        }, 500);
      }).catch(function (err) {
        console.error('[TopicPage] Upload error:', err);
        if (prog) prog.style.display = 'none';
        if (window.LMToast) window.LMToast.show('⚠️ Upload failed, please try again');
      });
    }
  }

  // ── PUBLIC API EXPORT ──────────────────────────────────────────────────────
  window.StudyTopicPage = {
    init: init,
    loadTopic: loadTopic,
    toggleSidebar: toggleSidebar,
    getCurrentTopicId: getCurrentTopicId,
    renderAll: renderAll,
    renderSidebar: renderSidebar,
    renderMainWorkspace: renderMainWorkspace,
    handleSidebarSearch: handleSidebarSearch,
    setTopicStatus: setTopicStatus,
    handleNoteInput: handleNoteInput,
    copyNotes: copyNotes,
    clearNotes: clearNotes,
    setMaterialFilter: setMaterialFilter,
    openMaterialPreview: openMaterialPreview,
    closeMaterialPreview: closeMaterialPreview,
    cycleMaterialStatus: cycleMaterialStatus,
    deleteMaterial: deleteMaterial,
    deleteCurrentTopic: deleteCurrentTopic,
    startFocusOnTopic: startFocusOnTopic,
    saveQuickLink: saveQuickLink,
    handleDropOver: handleDropOver,
    handleDropLeave: handleDropLeave,
    handleDrop: handleDrop,
    handleFileSelect: handleFileSelect
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})(window);
