/* ══════════════════════════════════════════════════════════════════════════
   StudyCustomWorkspace.js — Personal Learning & Progress Management System
   ─────────────────────────────────────────────────────────────────────────
   Features:
   - In-Page Workspace Customization Studio (Multi-Tab, Full-Width Responsive Hub)
   - Granular File & Material Progress Tracking (4-State & 0-100% completion)
   - Cloud Materials & File Vault Manager with Direct Supabase Storage Upload
   - Direct External Link Openers (In-Page, Card Previews, and Material Viewer)
   - Multi-Module Grouping with Section Metrics & Dual Progress Rollups
   - In-Section Live Text Search & Multi-State Filter Tabs
   - Complete Cascaded Deletion for Sections, Modules, Topics, and Materials
   - 4-State Status Engine (Pending / In Progress / Completed / On Hold)
   - Pomodoro Focus Timer & Study Time Session Logging
   - Learning Goals & Target Date Milestones Planner
   - Pre-Built Curriculum Roadmap Templates (1-Click Import)
   - Supabase ↔ localStorage Two-Way Offline Sync
   ══════════════════════════════════════════════════════════════════════════ */

(function (window) {
  'use strict';

  var STORAGE_KEY    = 'lm_study_custom_workspace_v2';
  var PREFS_KEY      = 'lm_study_user_prefs_v2';
  var STORAGE_BUCKET = 'study-materials';

  var _state = {
    domains: [],
    categories: [],
    topics: [],
    materials: [],
    goals: [],
    timeLogs: [],
    prefs: {
      active_widgets: ['resume', 'overall', 'milestones', 'timer', 'heatmap', 'domains', 'weak_topics', 'quiz_history'],
      last_active_topic: null,
      daily_target_count: 5,
      weekly_goal_count: 20
    },
    userRole: 'user',
    canCustomize: false,
    uid: null
  };

  // Section in-memory search and filter states
  var _secFilters = {};
  var _activeStudioTab = 'sections';
  var _vaultSearchQuery = '';

  // ── Pomodoro Timer State ──
  var _pomoTimer = {
    interval: null,
    mode: 'pomodoro', // 'pomodoro' | 'short' | 'long' | 'stopwatch'
    durations: { pomodoro: 25 * 60, short: 5 * 60, long: 15 * 60, stopwatch: 0 },
    timeLeft: 25 * 60,
    running: false,
    activeTopicId: null,
    sessionStart: null
  };

  function _esc(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function _getUid() {
    if (_state.uid) return Promise.resolve(_state.uid);
    if (typeof _supabase === 'undefined' || !_supabase) return Promise.resolve(null);
    return _supabase.auth.getSession().then(function (r) {
      _state.uid = r.data && r.data.session ? r.data.session.user.id : null;
      return _state.uid;
    }).catch(function () { return null; });
  }

  function _getUsernameFolder() {
    // 1. Try window.LM_Auth if available
    try {
      if (typeof window !== 'undefined' && window.LM_Auth && typeof window.LM_Auth.getCurrentUser === 'function') {
        var u = window.LM_Auth.getCurrentUser();
        if (u) {
          var name = u.username || u.displayName || (u.email ? u.email.split('@')[0] : '');
          if (name) {
            var clean = String(name).trim().toLowerCase().replace(/[^a-zA-Z0-9_-]/g, '_');
            if (clean) return Promise.resolve(clean);
          }
        }
      }
    } catch (e) {}

    // 2. Try localStorage 'lm_session'
    try {
      var sessRaw = localStorage.getItem('lm_session');
      if (sessRaw) {
        var sess = JSON.parse(sessRaw);
        var sName = sess.username || sess.displayName || sess.name || (sess.user && sess.user.email ? sess.user.email.split('@')[0] : (sess.email ? sess.email.split('@')[0] : ''));
        if (sName) {
          var cleanS = String(sName).trim().toLowerCase().replace(/[^a-zA-Z0-9_-]/g, '_');
          if (cleanS) return Promise.resolve(cleanS);
        }
      }
    } catch (e) {}

    // 3. Try Supabase session directly
    if (typeof _supabase !== 'undefined' && _supabase?.auth) {
      return _supabase.auth.getSession().then(function (r) {
        var user = r.data && r.data.session ? r.data.session.user : null;
        if (user) {
          var metaName = (user.user_metadata && (user.user_metadata.username || user.user_metadata.user_name || user.user_metadata.full_name || user.user_metadata.name)) ||
                         (user.email ? user.email.split('@')[0] : '') ||
                         user.id;
          if (metaName) {
            var cleanMeta = String(metaName).trim().toLowerCase().replace(/[^a-zA-Z0-9_-]/g, '_');
            if (cleanMeta) return cleanMeta;
          }
        }
        return _getUid().then(function (uid) {
          return uid ? String(uid).replace(/[^a-zA-Z0-9_-]/g, '_') : 'guest_user';
        });
      }).catch(function () {
        return 'guest_user';
      });
    }

    // 4. Fallback to UID or guest_user
    return _getUid().then(function (uid) {
      return uid ? String(uid).replace(/[^a-zA-Z0-9_-]/g, '_') : 'guest_user';
    });
  }

  // ── 1. INITIALIZATION & PERMISSION RESOLUTION ──────────────────────────────
  function init() {
    _loadLocal();
    _resolveUserPermissions().then(function () {
      _syncFromSupabase().then(function () {
        renderAllWidgets();
      });
    });
  }

  function _loadLocal() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        var parsed = JSON.parse(raw);
        _state.domains = parsed.domains || [];
        _state.categories = parsed.categories || [];
        _state.topics = parsed.topics || [];
        _state.materials = parsed.materials || [];
        _state.goals = parsed.goals || [];
        _state.timeLogs = parsed.timeLogs || [];
      }
      var pRaw = localStorage.getItem(PREFS_KEY);
      if (pRaw) {
        _state.prefs = Object.assign(_state.prefs, JSON.parse(pRaw));
      }
    } catch (e) {
      console.warn('[StudyWorkspace] Error reading localStorage:', e);
    }
  }

  function _saveLocal() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        domains: _state.domains,
        categories: _state.categories,
        topics: _state.topics,
        materials: _state.materials,
        goals: _state.goals,
        timeLogs: _state.timeLogs
      }));
      localStorage.setItem(PREFS_KEY, JSON.stringify(_state.prefs));
    } catch (e) {
      console.warn('[StudyWorkspace] Error saving localStorage:', e);
    }
  }

  function _resolveUserPermissions() {
    return _getUid().then(function (uid) {
      if (!uid) {
        _state.userRole = 'user';
        _state.canCustomize = true; // offline default
        return;
      }
      return _supabase.from('user_profiles').select('role, can_customize_study, active').eq('id', uid).single()
        .then(function (res) {
          if (res.data) {
            _state.userRole = res.data.role || 'user';
            _state.canCustomize = (_state.userRole === 'admin') || !!res.data.can_customize_study;
          }
        }).catch(function () {
          _state.canCustomize = true;
        });
    });
  }

  // ── 2. SUPABASE SYNC ───────────────────────────────────────────────────────
  function _syncFromSupabase() {
    return _getUid().then(function (uid) {
      if (!uid || typeof _supabase === 'undefined' || !_supabase) return;

      return Promise.all([
        _supabase.from('study_custom_domains').select('*').eq('user_id', uid).order('order_index', { ascending: true }),
        _supabase.from('study_custom_categories').select('*').eq('user_id', uid).order('order_index', { ascending: true }),
        _supabase.from('study_custom_topics').select('*').eq('user_id', uid).order('order_index', { ascending: true }),
        _supabase.from('study_materials').select('*').eq('user_id', uid).order('created_at', { ascending: false }),
        _supabase.from('study_learning_goals').select('*').eq('user_id', uid),
        _supabase.from('study_time_logs').select('*').eq('user_id', uid).order('logged_at', { ascending: false }).limit(50),
        _supabase.from('study_user_preferences').select('*').eq('user_id', uid).single()
      ]).then(function (results) {
        if (results[0].data && results[0].data.length > 0) _state.domains = results[0].data;
        if (results[1].data && results[1].data.length > 0) _state.categories = results[1].data;
        if (results[2].data && results[2].data.length > 0) _state.topics = results[2].data;
        if (results[3].data && results[3].data.length > 0) _state.materials = results[3].data;
        if (results[4].data && results[4].data.length > 0) _state.goals = results[4].data;
        if (results[5].data && results[5].data.length > 0) _state.timeLogs = results[5].data;
        if (results[6].data) {
          _state.prefs = Object.assign(_state.prefs, results[6].data);
        }
        _saveLocal();
      }).catch(function (e) {
        console.warn('[StudyWorkspace] Supabase sync fallback to local:', e);
      });
    });
  }

  // ── 3. RESUME LEARNING HERO COMPONENT ──────────────────────────────────────
  function setLastActiveTopic(topicData) {
    if (!topicData) return;
    _state.prefs.last_active_topic = Object.assign({
      topicId: topicData.id,
      title: topicData.title,
      domainId: topicData.domainId || null,
      domainTitle: topicData.domainTitle || 'Study Track',
      status: topicData.status || 'inprogress',
      timestamp: new Date().toISOString()
    }, topicData);

    _saveLocal();
    _getUid().then(function (uid) {
      if (uid && typeof _supabase !== 'undefined' && _supabase) {
        _supabase.from('study_user_preferences').upsert({
          user_id: uid,
          last_active_topic: _state.prefs.last_active_topic,
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id' }).then(function () {});
      }
    });

    renderResumeHero();
  }

  function clearLastActiveTopic() {
    _state.prefs.last_active_topic = null;
    _saveLocal();
    _getUid().then(function (uid) {
      if (uid && typeof _supabase !== 'undefined' && _supabase) {
        _supabase.from('study_user_preferences').upsert({
          user_id: uid,
          last_active_topic: null,
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id' }).then(function () {});
      }
    });
    renderResumeHero();
  }

  function renderResumeHero() {
    var container = document.getElementById('studyResumeHeroWrap');
    if (!container) return;

    var lastTopic = _state.prefs.last_active_topic;
    if (!lastTopic || !_isWidgetVisible('resume')) {
      container.innerHTML = '';
      container.style.display = 'none';
      return;
    }

    var stClass = 'st-' + (lastTopic.status || 'inprogress');

    container.style.display = 'block';
    container.innerHTML = `
      <div class="resume-hero-banner">
        <div class="resume-card">
          <div class="resume-left">
            <div class="resume-pulse-icon">
              <span>🎯</span>
              <span class="resume-pulse-dot"></span>
            </div>
            <div class="resume-info">
              <div class="resume-eyebrow">
                <span>Resume Active Session</span>
                <span class="st-badge ${stClass}">${lastTopic.status || 'in progress'}</span>
              </div>
              <div class="resume-title">${_esc(lastTopic.title)}</div>
              <div class="resume-meta">
                <span>📚 ${_esc(lastTopic.domainTitle || 'Custom Track')}</span>
                <span>⏱️ Ready to focus</span>
              </div>
            </div>
          </div>
          <div class="resume-actions">
            <button class="btn-resume-jump" onclick="window.StudyWorkspace.openTopicExplorer('${lastTopic.topicId}')">
              <span>Continue Learning</span>
              <span>➔</span>
            </button>
            <button class="btn-resume-dismiss" onclick="window.StudyWorkspace.clearLastActiveTopic()" title="Dismiss marker">
              ✕
            </button>
          </div>
        </div>
      </div>
    `;
  }

  // ── 4. 4-STATE STATUS FLOW ENGINE ──────────────────────────────────────────
  var STATUS_FLOW = ['pending', 'inprogress', 'completed', 'onhold'];

  function cycleTopicStatus(topicId) {
    var t = _state.topics.find(function (x) { return x.id === topicId; });
    if (!t) return;
    var curIdx = STATUS_FLOW.indexOf(t.status || 'pending');
    var nextIdx = (curIdx + 1) % STATUS_FLOW.length;
    setTopicStatus(topicId, STATUS_FLOW[nextIdx]);
  }

  function setTopicStatus(topicId, status) {
    var t = _state.topics.find(function (x) { return x.id === topicId; });
    if (!t) return;
    t.status = status;
    t.status_changed_at = new Date().toISOString();
    _saveLocal();

    _getUid().then(function (uid) {
      if (uid && typeof _supabase !== 'undefined' && _supabase) {
        _supabase.from('study_custom_topics').update({
          status: status,
          status_changed_at: t.status_changed_at,
          updated_at: new Date().toISOString()
        }).eq('id', topicId).then(function () {});
      }
    });

    if (window.LMToast) {
      window.LMToast.show('Status updated to ' + status.toUpperCase());
    }

    renderAllWidgets();
  }

  // ── 5. GRANULAR FILE & MATERIAL PROGRESS TRACKING ──────────────────────────
  function setMaterialStatus(materialId, status, progressPct) {
    var mat = _state.materials.find(function (m) { return m.id === materialId; });
    if (!mat) return;

    mat.status = status || 'pending';
    if (progressPct !== undefined && progressPct !== null) {
      mat.progress_pct = Math.min(100, Math.max(0, parseInt(progressPct, 10)));
    } else {
      if (mat.status === 'completed') mat.progress_pct = 100;
      else if (mat.status === 'pending') mat.progress_pct = 0;
      else if (mat.status === 'inprogress' && !mat.progress_pct) mat.progress_pct = 50;
    }

    mat.last_accessed_at = new Date().toISOString();
    _saveLocal();

    _getUid().then(function (uid) {
      if (uid && typeof _supabase !== 'undefined' && _supabase) {
        _supabase.from('study_materials').update({
          status: mat.status,
          progress_pct: mat.progress_pct,
          last_accessed_at: mat.last_accessed_at,
          updated_at: new Date().toISOString()
        }).eq('id', materialId).then(function () {});
      }
    });

    if (window.LMToast) {
      var icon = mat.status === 'completed' ? '✅' : (mat.status === 'inprogress' ? '⏳' : '⚪');
      window.LMToast.show(icon + ' File: ' + mat.status.toUpperCase() + ' (' + mat.progress_pct + '%)');
    }

    renderAllWidgets();
    if (document.getElementById('workspaceCustomizationStudio')?.classList.contains('open')) {
      renderActiveStudioTab();
    }
  }

  function cycleMaterialStatus(materialId) {
    var mat = _state.materials.find(function (m) { return m.id === materialId; });
    if (!mat) return;
    var curIdx = STATUS_FLOW.indexOf(mat.status || 'pending');
    var nextIdx = (curIdx + 1) % STATUS_FLOW.length;
    setMaterialStatus(materialId, STATUS_FLOW[nextIdx]);
  }

  function setMaterialProgress(materialId, progressPct) {
    var pct = Math.min(100, Math.max(0, parseInt(progressPct, 10)));
    var status = pct >= 100 ? 'completed' : (pct > 0 ? 'inprogress' : 'pending');
    setMaterialStatus(materialId, status, pct);
  }

  function updateMaterialNotes(materialId, notes) {
    var mat = _state.materials.find(function (m) { return m.id === materialId; });
    if (!mat) return;
    mat.content = notes;
    mat.updated_at = new Date().toISOString();
    _saveLocal();

    _getUid().then(function (uid) {
      if (uid && typeof _supabase !== 'undefined' && _supabase) {
        _supabase.from('study_materials').update({
          content: notes,
          updated_at: mat.updated_at
        }).eq('id', materialId).then(function () {});
      }
    });
  }

  // ── 6. IN-PAGE CUSTOMIZATION STUDIO ENGINE ─────────────────────────────────
  function openStudio(tabName) {
    var studioEl = document.getElementById('workspaceCustomizationStudio');
    if (!studioEl) return;
    studioEl.classList.add('open');
    switchStudioTab(tabName || 'sections');
    studioEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function toggleStudioView(forceOpen) {
    var studioEl = document.getElementById('workspaceCustomizationStudio');
    if (!studioEl) return;
    var shouldOpen = forceOpen !== undefined ? forceOpen : !studioEl.classList.contains('open');
    if (shouldOpen) {
      studioEl.classList.add('open');
      renderActiveStudioTab();
      studioEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      studioEl.classList.remove('open');
    }
  }

  function switchStudioTab(tabKey) {
    _activeStudioTab = tabKey;
    var tabBtns = document.querySelectorAll('.studio-tab-btn');
    tabBtns.forEach(function (btn) {
      btn.classList.toggle('active', btn.dataset.tab === tabKey);
    });

    var panes = document.querySelectorAll('.studio-tab-pane');
    panes.forEach(function (p) {
      p.classList.toggle('active', p.id === 'studioPane-' + tabKey);
    });

    renderActiveStudioTab();
  }

  function renderActiveStudioTab() {
    switch (_activeStudioTab) {
      case 'sections': renderStudioSectionsTab(); break;
      case 'vault': renderStudioVaultTab(); break;
      case 'hierarchy': renderStudioHierarchyTab(); break;
      case 'widgets': renderStudioWidgetsTab(); break;
      case 'blueprints': renderStudioBlueprintsTab(); break;
      case 'goals': renderStudioGoalsTab(); break;
    }
  }

  // Studio Tab 1: Custom Sections & Inline Creator
  function renderStudioSectionsTab() {
    var pane = document.getElementById('studioPane-sections');
    if (!pane) return;

    var secCardsHtml = _state.domains.map(function (d) {
      var dCats = _state.categories.filter(function (c) { return c.domain_id === d.id; });
      var cIds = new Set(dCats.map(function (c) { return c.id; }));
      var dTops = _state.topics.filter(function (t) { return cIds.has(t.category_id); });
      var tIds = new Set(dTops.map(function (t) { return t.id; }));
      var dMats = _state.materials.filter(function (m) { return tIds.has(m.topic_id); });
      var dDoneTops = dTops.filter(function (t) { return t.status === 'completed'; }).length;

      return `
        <div class="studio-section-card" style="border-top: 3px solid ${d.color};">
          <div>
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
              <span style="width:36px;height:36px;border-radius:10px;background:${d.color}20;color:${d.color};display:grid;place-items:center;font-size:18px;">${d.icon}</span>
              <span class="lang-badge" style="background:${d.color}18;color:${d.color};">${_esc(d.badge || 'Track')}</span>
            </div>
            <div style="font-size:15px;font-weight:700;color:var(--text);margin-bottom:4px;">${_esc(d.title)}</div>
            <div style="font-size:11.5px;color:var(--text3);line-height:1.4;">${_esc(d.tagline || 'Custom Personal Learning Domain')}</div>
          </div>
          <div style="font-size:11px;color:var(--text2);display:flex;gap:10px;flex-wrap:wrap;padding:8px 0;border-top:1px solid rgba(255,255,255,0.04);">
            <span>📦 <strong>${dCats.length}</strong> Modules</span>
            <span>🎯 <strong>${dTops.length}</strong> Topics (${dDoneTops} Done)</span>
            <span>📁 <strong>${dMats.length}</strong> Files</span>
          </div>
          <div style="display:flex;gap:6px;align-items:center;justify-content:space-between;">
            <div style="display:flex;gap:6px;">
              <button class="ws-btn-secondary" style="font-size:11px;padding:4px 8px;" onclick="window.StudyWorkspace.openEditDomainModal('${d.id}')">✏️ Edit</button>
              <button class="ws-btn-secondary" style="font-size:11px;padding:4px 8px;" onclick="window.StudyWorkspace.openAddCategoryModal('${d.id}')">➕ Module</button>
            </div>
            <button class="ws-btn-danger" style="font-size:11px;padding:4px 8px;" onclick="window.StudyWorkspace.confirmDeleteDomain('${d.id}')">🗑️ Delete</button>
          </div>
        </div>
      `;
    }).join('');

    pane.innerHTML = `
      <div class="studio-sections-layout">
        <div>
          <div style="font-size:13px;font-weight:700;color:var(--text);margin-bottom:12px;display:flex;align-items:center;justify-content:space-between;">
            <span>Active Tracks &amp; Sections (${_state.domains.length})</span>
            <span style="font-size:11.5px;color:var(--text3);">Click on any section to customize or delete</span>
          </div>
          <div class="studio-sections-grid">
            ${secCardsHtml || '<div style="font-size:12px;color:var(--text3);padding:20px;background:rgba(255,255,255,0.02);border-radius:12px;">No custom sections yet. Use the quick form on the right to create your first track!</div>'}
          </div>
        </div>

        <!-- Inline Section Creator Form -->
        <div class="studio-inline-form-card">
          <div style="font-family:'Syne',sans-serif;font-size:14px;font-weight:700;color:var(--text);margin-bottom:12px;">
            ✨ Quick Create New Track
          </div>
          <div class="ws-form-group">
            <label class="ws-form-label">Language / Domain Title</label>
            <input type="text" id="inpageDomTitle" class="ws-form-input" placeholder="e.g. Next.js 15 App Router, Kubernetes..." required/>
          </div>
          <div class="ws-form-row">
            <div class="ws-form-group">
              <label class="ws-form-label">Emoji Icon</label>
              <input type="text" id="inpageDomIcon" class="ws-form-input" value="📘" maxlength="4"/>
            </div>
            <div class="ws-form-group">
              <label class="ws-form-label">Theme Color</label>
              <select id="inpageDomColor" class="ws-form-select">
                <option value="#38bdf8" selected>🔵 Blue (#38bdf8)</option>
                <option value="#f59e0b">🟡 Gold (#f59e0b)</option>
                <option value="#06d6a0">🟢 Teal (#06d6a0)</option>
                <option value="#8b5cf6">🟣 Purple (#8b5cf6)</option>
                <option value="#ec4899">🌸 Pink (#ec4899)</option>
              </select>
            </div>
          </div>
          <div class="ws-form-group">
            <label class="ws-form-label">Track Badge</label>
            <input type="text" id="inpageDomBadge" class="ws-form-input" value="Custom Track"/>
          </div>
          <div class="ws-form-group">
            <label class="ws-form-label">Target Completion Date</label>
            <input type="date" id="inpageDomDate" class="ws-form-input"/>
          </div>
          <div class="ws-form-group">
            <label class="ws-form-label">Tagline Description</label>
            <textarea id="inpageDomTagline" class="ws-form-textarea" rows="2" placeholder="Brief outline of skills covered..."></textarea>
          </div>
          <button class="ws-btn-primary" style="width:100%;justify-content:center;margin-top:6px;" onclick="window.StudyWorkspace.saveInpageNewDomain()">
            💾 Create Language Section
          </button>
        </div>
      </div>
    `;
  }

  function saveInpageNewDomain() {
    var title = document.getElementById('inpageDomTitle')?.value.trim();
    if (!title) {
      if (window.LMToast) window.LMToast.show('⚠️ Please enter a track title');
      return;
    }
    var icon = document.getElementById('inpageDomIcon')?.value.trim() || '📘';
    var color = document.getElementById('inpageDomColor')?.value || '#38bdf8';
    var badge = document.getElementById('inpageDomBadge')?.value.trim() || 'Custom Track';
    var date = document.getElementById('inpageDomDate')?.value || null;
    var tagline = document.getElementById('inpageDomTagline')?.value.trim() || '';

    var domainId = 'dom_' + Date.now();
    var newDomain = {
      id: domainId,
      title: title,
      icon: icon,
      color: color,
      badge: badge,
      tagline: tagline,
      target_date: date,
      status: 'inprogress',
      order_index: _state.domains.length
    };
    _state.domains.push(newDomain);

    var catId = 'cat_' + Date.now();
    _state.categories.push({ id: catId, domain_id: domainId, title: 'Module 1: Core Fundamentals', order_index: 0 });
    _state.topics.push({ id: 'top_' + Date.now(), category_id: catId, title: title + ' - Core Concepts', status: 'pending', difficulty: 'Beginner', priority: 'High', order_index: 0 });

    _saveLocal();
    _getUid().then(function (uid) {
      if (uid && typeof _supabase !== 'undefined' && _supabase) {
        _supabase.from('study_custom_domains').insert(Object.assign({ user_id: uid }, newDomain)).then(function () {});
      }
    });

    if (window.LMToast) window.LMToast.show('✅ New track created: ' + title);
    renderAllWidgets();
    renderStudioSectionsTab();
  }

  // Studio Tab 2: Materials & File Vault
  function renderStudioVaultTab() {
    var pane = document.getElementById('studioPane-vault');
    if (!pane) return;

    var filteredMats = _state.materials.filter(function (m) {
      if (!_vaultSearchQuery) return true;
      var q = _vaultSearchQuery.toLowerCase();
      return (m.title || '').toLowerCase().includes(q) || (m.material_type || '').toLowerCase().includes(q) || (m.external_url || '').toLowerCase().includes(q);
    });

    var filesListHtml = filteredMats.map(function (m) {
      var top = _state.topics.find(function (t) { return t.id === m.topic_id; });
      var cat = top ? _state.categories.find(function (c) { return c.id === top.category_id; }) : null;
      var dom = cat ? _state.domains.find(function (d) { return d.id === cat.domain_id; }) : null;

      var mStatus = m.status || 'pending';
      var mIcon = mStatus === 'completed' ? '✅' : (mStatus === 'inprogress' ? '⏳' : '⚪');
      var mPct = m.progress_pct !== undefined ? m.progress_pct : (mStatus === 'completed' ? 100 : 0);
      var displayUrl = m.file_url || m.external_url || '';

      return `
        <div class="studio-file-card">
          <div class="studio-file-top">
            <div style="display:flex;align-items:center;gap:8px;min-width:0;flex:1;">
              <span class="material-type-tag ${m.material_type}">${m.material_type}</span>
              <span class="studio-file-title" title="${_esc(m.title)}">${_esc(m.title)}</span>
            </div>
            <button class="mat-chip-status-btn" onclick="window.StudyWorkspace.cycleMaterialStatus('${m.id}')" title="Cycle Status (${mStatus})">${mIcon}</button>
          </div>

          <div class="studio-file-meta">
            <span>📚 ${_esc(dom ? dom.title : 'Study Track')}</span>
            <span>🎯 ${_esc(top ? top.title : 'General Topic')}</span>
            <span>⚖️ ${m.file_size_bytes ? Math.round(m.file_size_bytes/1024) + ' KB' : 'Doc'}</span>
            ${m.storage_path ? `<span title="Supabase Cloud Path: ${m.storage_path}" style="color:var(--cyan,#38bdf8);font-family:monospace;font-size:10px;">📁 ${_esc(m.storage_path)}</span>` : ''}
            <span class="st-badge st-${mStatus}">${mStatus} (${mPct}%)</span>
          </div>

          <div class="studio-file-actions">
            <div style="display:flex;gap:6px;align-items:center;">
              <button class="ws-btn-secondary" style="font-size:11px;padding:3px 8px;" onclick="window.StudyWorkspace.openMaterialViewer('${m.id}')">
                👁️ View
              </button>
              ${displayUrl ? `
                <a href="${_esc(displayUrl)}" target="_blank" rel="noopener" class="ws-btn-extlink" title="Open in new tab">
                  🔗 Open Link ↗
                </a>
              ` : ''}
            </div>
            <button class="ws-btn-danger" style="font-size:11px;padding:3px 8px;" onclick="window.StudyWorkspace.deleteMaterial('${m.id}')" title="Delete file">
              🗑️ Delete
            </button>
          </div>
        </div>
      `;
    }).join('');

    pane.innerHTML = `
      <div class="studio-vault-wrap">
        <div class="studio-vault-header-row">
          <div>
            <div style="font-size:14px;font-weight:700;color:var(--text);">📁 Cloud Materials &amp; File Vault (${_state.materials.length} total)</div>
            <div style="font-size:11.5px;color:var(--text3);margin-top:2px;">All uploaded PDFs, source code files, documents, and external links in Supabase Storage</div>
          </div>
          <div style="display:flex;gap:8px;align-items:center;">
            <input type="text" class="section-search-input" placeholder="🔍 Search files or URLs..." value="${_esc(_vaultSearchQuery)}" oninput="window.StudyWorkspace.handleVaultSearch(this.value)"/>
            <button class="ws-btn-primary" onclick="window.StudyWorkspace.openQuickUploadModal()" style="font-size:11.5px;padding:6px 12px;background:linear-gradient(135deg,#4f8ef7,#8b5cf6);">
              📤 Upload File
            </button>
          </div>
        </div>

        <!-- Big Dropzone in Studio -->
        <div class="ws-file-dropzone" id="matDropzone"
             onclick="window.StudyWorkspace.openQuickUploadModal()"
             style="padding:28px 16px;background:rgba(255,255,255,0.02);">
          <span class="dropzone-icon">☁️</span>
          <div class="dropzone-text" style="font-size:14px;">Drop or Upload Materials directly to Supabase Storage Bucket ('study-materials')</div>
          <div class="dropzone-subtext">PDFs, Markdown notes, Code snippets, Documents, and External Documentation Links</div>
        </div>

        <div class="studio-files-grid">
          ${filesListHtml || '<div style="font-size:12px;color:var(--text3);padding:24px;background:rgba(255,255,255,0.02);border-radius:12px;grid-column:1/-1;text-align:center;">No files found matching your search. Click "Upload File" above.</div>'}
        </div>
      </div>
    `;
  }

  function handleVaultSearch(query) {
    _vaultSearchQuery = query || '';
    renderStudioVaultTab();
  }

  // Studio Tab 3: Modules & Topics Hierarchy
  function renderStudioHierarchyTab() {
    var pane = document.getElementById('studioPane-hierarchy');
    if (!pane) return;

    var hierarchyHtml = _state.domains.map(function (dom) {
      var domCats = _state.categories.filter(function (c) { return c.domain_id === dom.id; });

      var modulesListHtml = domCats.map(function (cat) {
        var catTopics = _state.topics.filter(function (t) { return t.category_id === cat.id; });

        var topicsRowsHtml = catTopics.map(function (t) {
          var tMats = _state.materials.filter(function (m) { return m.topic_id === t.id; });
          var stClass = 'st-' + (t.status || 'pending');

          return `
            <div class="studio-tree-topic-row">
              <div class="studio-tree-topic-left">
                <span class="st-badge ${stClass}">${t.status || 'pending'}</span>
                <span style="font-size:13px;font-weight:600;color:var(--text);">${_esc(t.title)}</span>
                <span style="font-size:11px;color:var(--text3);">(${t.difficulty || 'Intermediate'})</span>
                ${tMats.length > 0 ? `<span class="res-notes-badge" style="font-size:10px;">📎 ${tMats.length} file${tMats.length>1?'s':''}</span>` : ''}
              </div>
              <div style="display:flex;gap:6px;align-items:center;">
                <button class="ws-btn-secondary" style="font-size:10.5px;padding:3px 7px;" onclick="window.StudyWorkspace.cycleTopicStatus('${t.id}')">Cycle Status</button>
                <button class="ws-btn-secondary" style="font-size:10.5px;padding:3px 7px;" onclick="window.StudyWorkspace.openTopicExplorer('${t.id}')">Open ↗</button>
                <button class="ws-btn-danger" style="font-size:10.5px;padding:3px 7px;" onclick="window.StudyWorkspace.deleteTopic('${t.id}')">🗑️</button>
              </div>
            </div>
          `;
        }).join('');

        return `
          <div class="studio-tree-module">
            <div class="studio-tree-module-top">
              <div style="display:flex;align-items:center;gap:8px;">
                <span style="font-size:15px;color:${dom.color};">📦</span>
                <strong style="font-size:13.5px;color:var(--text);">${_esc(cat.title)}</strong>
                <span style="font-size:11px;color:var(--text3);font-family:'JetBrains Mono';">(${catTopics.length} topics)</span>
              </div>
              <div style="display:flex;gap:6px;">
                <button class="ws-btn-secondary" style="font-size:11px;padding:3px 8px;" onclick="window.StudyWorkspace.openAddTopicModal('${cat.id}')">+ Add Topic</button>
                <button class="ws-btn-danger" style="font-size:11px;padding:3px 8px;" onclick="window.StudyWorkspace.deleteCategory('${cat.id}')">🗑️</button>
              </div>
            </div>
            <div class="studio-tree-topics-list">
              ${topicsRowsHtml || '<div style="font-size:11.5px;color:var(--text3);padding:8px;">No topics in this module.</div>'}
            </div>
          </div>
        `;
      }).join('');

      return `
        <div style="background:rgba(0,0,0,0.22);border:1px solid var(--border,#262f45);border-radius:14px;padding:16px;margin-bottom:18px;">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;border-bottom:1px solid rgba(255,255,255,0.05);padding-bottom:10px;">
            <div style="display:flex;align-items:center;gap:10px;">
              <span style="font-size:20px;">${dom.icon}</span>
              <span style="font-size:16px;font-weight:800;color:var(--text);">${_esc(dom.title)}</span>
              <span class="lang-badge" style="background:${dom.color}18;color:${dom.color};">${_esc(dom.badge || 'Track')}</span>
            </div>
            <button class="ws-btn-secondary" style="font-size:11.5px;padding:4px 10px;" onclick="window.StudyWorkspace.openAddCategoryModal('${dom.id}')">
              ➕ Add Module
            </button>
          </div>
          <div class="studio-tree-wrap">
            ${modulesListHtml || '<div style="font-size:12px;color:var(--text3);">No modules.</div>'}
          </div>
        </div>
      `;
    }).join('');

    pane.innerHTML = hierarchyHtml || '<div style="font-size:12px;color:var(--text3);padding:20px;">No tracks created yet.</div>';
  }

  // Studio Tab 4: Dashboard Widgets
  function renderStudioWidgetsTab() {
    var pane = document.getElementById('studioPane-widgets');
    if (!pane) return;

    var allWidgets = [
      { key: 'resume', title: '🚀 Resume Learning Hero', icon: '🚀', desc: 'Prominent 1-click banner returning to your last active topic' },
      { key: 'overall', title: '📊 Velocity & Progress Rings', icon: '📊', desc: 'Overview of completed questions across curated & custom domains' },
      { key: 'milestones', title: '🎯 Goals & Milestones Planner', icon: '🎯', desc: 'Active learning targets, dates, and milestones checklist' },
      { key: 'timer', title: '⏱️ Pomodoro Focus Timer', icon: '⏱️', desc: 'Customizable 25m/5m study timer with automated session logging' },
      { key: 'heatmap', title: '🔥 365-Day Activity Heatmap', icon: '🔥', desc: 'GitHub-style study velocity calendar and streak tracker' },
      { key: 'domains', title: '🌐 Custom & Curated Tracks', icon: '🌐', desc: 'All languages, modules, topics, and personal study materials' },
      { key: 'weak_topics', title: '🧠 SRS Weak Topics & Due Review', icon: '🧠', desc: 'Spaced repetition flashcards prioritization engine' },
      { key: 'quiz_history', title: '📝 Practice Assessment History', icon: '📝', desc: 'Logs of previous quizzes, scores, and review answers' }
    ];

    var widgetCards = allWidgets.map(function (w) {
      var isChecked = _isWidgetVisible(w.key) ? 'checked' : '';
      return `
        <div class="widget-toggle-item" style="padding:14px 16px;">
          <div class="widget-toggle-info" style="gap:12px;">
            <span style="font-size:22px;">${w.icon}</span>
            <div>
              <div style="font-size:13.5px;font-weight:700;color:var(--text);">${w.title}</div>
              <div style="font-size:11px;color:var(--text3);margin-top:2px;">${w.desc}</div>
            </div>
          </div>
          <label class="ws-switch">
            <input type="checkbox" data-widget-key="${w.key}" ${isChecked} onchange="window.StudyWorkspace.toggleWidgetVisibility('${w.key}', this.checked)">
            <span class="ws-slider"></span>
          </label>
        </div>
      `;
    }).join('');

    pane.innerHTML = `
      <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(320px, 1fr));gap:14px;">
        ${widgetCards}
      </div>
    `;
  }

  // Studio Tab 5: Blueprints
  function renderStudioBlueprintsTab() {
    var pane = document.getElementById('studioPane-blueprints');
    if (!pane) return;

    var blueprintsHtml = TEMPLATES.map(function (tpl) {
      return `
        <div style="background:rgba(255,255,255,0.02);border:1px solid var(--border,#262f45);border-radius:14px;padding:18px;display:flex;flex-direction:column;justify-content:space-between;gap:14px;">
          <div>
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
              <div style="width:42px;height:42px;border-radius:12px;background:${tpl.color}20;color:${tpl.color};display:grid;place-items:center;font-size:22px;">${tpl.icon}</div>
              <span class="lang-badge" style="background:${tpl.color}18;color:${tpl.color};">${_esc(tpl.badge)}</span>
            </div>
            <div style="font-size:15px;font-weight:700;color:var(--text);margin-bottom:4px;">${tpl.title}</div>
            <div style="font-size:12px;color:var(--text3);line-height:1.5;">${tpl.tagline}</div>
          </div>
          <div style="font-size:11.5px;color:var(--text2);padding:8px 0;border-top:1px solid rgba(255,255,255,0.04);">
            Includes: <strong>${tpl.categories.length} Modules</strong> · <strong>${tpl.categories.reduce(function(acc,c){return acc+c.topics.length;},0)} Core Topics</strong>
          </div>
          <button class="ws-btn-primary" onclick="window.StudyWorkspace.importTemplate('${tpl.id}')" style="justify-content:center;">
            📥 Import 1-Click Blueprint
          </button>
        </div>
      `;
    }).join('');

    pane.innerHTML = `
      <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(300px, 1fr));gap:16px;">
        ${blueprintsHtml}
      </div>
    `;
  }

  // Studio Tab 6: Goals
  function renderStudioGoalsTab() {
    var pane = document.getElementById('studioPane-goals');
    if (!pane) return;

    var goalsList = _state.goals.map(function (g) {
      var doneM = (g.milestones || []).filter(function (m) { return m.completed; }).length;
      var totalM = (g.milestones || []).length || 1;
      var pct = Math.round((doneM / totalM) * 100);

      return `
        <div class="goal-item-card" style="padding:16px;">
          <div class="goal-top-row">
            <div class="goal-name" style="font-size:14px;">🎯 ${_esc(g.title)}</div>
            <div class="goal-target-countdown">${g.target_date ? '📅 ' + g.target_date : 'Ongoing'}</div>
          </div>
          <div class="goal-progress-bar" style="margin:12px 0 8px;">
            <div class="goal-progress-fill" style="width:${pct}%;"></div>
          </div>
          <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--text3);margin-bottom:10px;">
            <span>Milestones: ${doneM}/${totalM}</span>
            <span>${pct}% Complete</span>
          </div>
          <div class="goal-milestones-list">
            ${(g.milestones || []).map(function (m, idx) {
              return `
                <div class="milestone-row ${m.completed ? 'completed' : ''}">
                  <input type="checkbox" ${m.completed ? 'checked' : ''} onchange="window.StudyWorkspace.toggleMilestone('${g.id}', ${idx})" style="cursor:pointer;">
                  <span>${_esc(m.title)}</span>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `;
    }).join('');

    pane.innerHTML = `
      <div>
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">
          <div style="font-size:14px;font-weight:700;color:var(--text);">🎯 Learning Goals &amp; Milestones (${_state.goals.length})</div>
          <button class="ws-btn-primary" onclick="window.StudyWorkspace.openGoalModal()">+ Create Goal</button>
        </div>
        <div class="goals-grid">
          ${goalsList || '<div style="font-size:12px;color:var(--text3);padding:20px;">No goals set yet. Click "+ Create Goal" to add milestones.</div>'}
        </div>
      </div>
    `;
  }

  // ── 7. ADD & EDIT DOMAIN/SECTION MODALS ────────────────────────────────────
  function openAddDomainModal() {
    openStudio('sections');
  }

  function saveNewDomain() {
    saveInpageNewDomain();
  }

  function openEditDomainModal(domainId) {
    var dom = _state.domains.find(function (d) { return d.id === domainId; });
    if (!dom) return;

    var existing = document.getElementById('editDomainModal');
    if (existing) existing.remove();

    var modal = document.createElement('div');
    modal.id = 'editDomainModal';
    modal.className = 'ws-modal-overlay';

    modal.innerHTML = `
      <div class="ws-modal-dialog">
        <div class="ws-modal-header">
          <div class="ws-modal-title">
            <span>✏️</span> Edit Section: ${_esc(dom.title)}
          </div>
          <button class="ws-modal-close" onclick="document.getElementById('editDomainModal')?.remove()">✕</button>
        </div>
        <div class="ws-modal-body">
          <div class="ws-form-group">
            <label class="ws-form-label">Language / Domain Title</label>
            <input type="text" id="editDomTitleInput" class="ws-form-input" value="${_esc(dom.title)}" required/>
          </div>

          <div class="ws-form-row">
            <div class="ws-form-group">
              <label class="ws-form-label">Icon / Emoji</label>
              <input type="text" id="editDomIconInput" class="ws-form-input" value="${_esc(dom.icon)}" maxlength="4"/>
            </div>
            <div class="ws-form-group">
              <label class="ws-form-label">Accent Theme Color</label>
              <select id="editDomColorInput" class="ws-form-select">
                <option value="#38bdf8" ${dom.color==='#38bdf8'?'selected':''}>🔵 Blue (#38bdf8)</option>
                <option value="#f59e0b" ${dom.color==='#f59e0b'?'selected':''}>🟡 Amber Gold (#f59e0b)</option>
                <option value="#06d6a0" ${dom.color==='#06d6a0'?'selected':''}>🟢 Emerald Teal (#06d6a0)</option>
                <option value="#8b5cf6" ${dom.color==='#8b5cf6'?'selected':''}>🟣 Purple Violet (#8b5cf6)</option>
                <option value="#ec4899" ${dom.color==='#ec4899'?'selected':''}>🌸 Rose Pink (#ec4899)</option>
                <option value="#22d3ee" ${dom.color==='#22d3ee'?'selected':''}>🌊 Cyan (#22d3ee)</option>
              </select>
            </div>
          </div>

          <div class="ws-form-row">
            <div class="ws-form-group">
              <label class="ws-form-label">Track Badge</label>
              <input type="text" id="editDomBadgeInput" class="ws-form-input" value="${_esc(dom.badge || '')}"/>
            </div>
            <div class="ws-form-group">
              <label class="ws-form-label">Target Completion Date</label>
              <input type="date" id="editDomDateInput" class="ws-form-input" value="${dom.target_date || ''}"/>
            </div>
          </div>

          <div class="ws-form-group">
            <label class="ws-form-label">Tagline &amp; Description</label>
            <textarea id="editDomTaglineInput" class="ws-form-textarea" rows="2">${_esc(dom.tagline || '')}</textarea>
          </div>
        </div>
        <div class="ws-modal-footer">
          <button class="ws-btn-primary" onclick="window.StudyWorkspace.saveEditDomain('${domainId}')">
            💾 Save Changes
          </button>
          <button class="ws-btn-secondary" onclick="document.getElementById('editDomainModal')?.remove()">Cancel</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
  }

  function saveEditDomain(domainId) {
    var dom = _state.domains.find(function (d) { return d.id === domainId; });
    if (!dom) return;

    var title = document.getElementById('editDomTitleInput')?.value.trim();
    if (!title) {
      if (window.LMToast) window.LMToast.show('⚠️ Please enter a section title');
      return;
    }

    dom.title = title;
    dom.icon = document.getElementById('editDomIconInput')?.value.trim() || '📘';
    dom.color = document.getElementById('editDomColorInput')?.value || '#38bdf8';
    dom.badge = document.getElementById('editDomBadgeInput')?.value.trim() || 'Custom Track';
    dom.target_date = document.getElementById('editDomDateInput')?.value || null;
    dom.tagline = document.getElementById('editDomTaglineInput')?.value.trim() || '';
    dom.updated_at = new Date().toISOString();

    _saveLocal();

    _getUid().then(function (uid) {
      if (uid && typeof _supabase !== 'undefined' && _supabase) {
        _supabase.from('study_custom_domains').update(dom).eq('id', domainId).then(function () {});
      }
    });

    document.getElementById('editDomainModal')?.remove();
    if (window.LMToast) window.LMToast.show('✅ Section updated: ' + title);
    renderAllWidgets();
    renderActiveStudioTab();
  }

  // ── 8. ADD MODULE / CATEGORY & TOPIC MODALS ────────────────────────────────
  function openAddCategoryModal(domainId) {
    var existing = document.getElementById('addCategoryModal');
    if (existing) existing.remove();

    var dom = _state.domains.find(function (d) { return d.id === domainId; });

    var modal = document.createElement('div');
    modal.id = 'addCategoryModal';
    modal.className = 'ws-modal-overlay';

    modal.innerHTML = `
      <div class="ws-modal-dialog">
        <div class="ws-modal-header">
          <div class="ws-modal-title">
            <span>📦</span> Add Module to ${_esc(dom ? dom.title : 'Section')}
          </div>
          <button class="ws-modal-close" onclick="document.getElementById('addCategoryModal')?.remove()">✕</button>
        </div>
        <div class="ws-modal-body">
          <div class="ws-form-group">
            <label class="ws-form-label">Module / Category Name</label>
            <input type="text" id="catTitleInput" class="ws-form-input" placeholder="e.g. Module 2: Concurrency &amp; Async, Advanced Architecture..." required autofocus/>
          </div>
          <div class="ws-form-group">
            <label class="ws-form-label">Description (Optional)</label>
            <textarea id="catDescInput" class="ws-form-textarea" rows="2" placeholder="Brief outline of concepts covered in this module..."></textarea>
          </div>
        </div>
        <div class="ws-modal-footer">
          <button class="ws-btn-primary" onclick="window.StudyWorkspace.saveNewCategory('${domainId}')">
            💾 Create Module
          </button>
          <button class="ws-btn-secondary" onclick="document.getElementById('addCategoryModal')?.remove()">Cancel</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
  }

  function saveNewCategory(domainId) {
    var title = document.getElementById('catTitleInput')?.value.trim();
    if (!title) {
      if (window.LMToast) window.LMToast.show('⚠️ Please enter a module title');
      return;
    }

    var desc = document.getElementById('catDescInput')?.value.trim() || '';
    var catId = 'cat_' + Date.now();
    var newCat = {
      id: catId,
      domain_id: domainId,
      title: title,
      description: desc,
      order_index: _state.categories.length
    };

    _state.categories.push(newCat);
    _saveLocal();

    _getUid().then(function (uid) {
      if (uid && typeof _supabase !== 'undefined' && _supabase) {
        _supabase.from('study_custom_categories').insert(Object.assign({ user_id: uid }, newCat)).then(function () {});
      }
    });

    document.getElementById('addCategoryModal')?.remove();
    if (window.LMToast) window.LMToast.show('✅ Module created: ' + title);
    renderAllWidgets();
    renderActiveStudioTab();
  }

  function openAddTopicModal(categoryId) {
    var existing = document.getElementById('addTopicModal');
    if (existing) existing.remove();

    var cat = _state.categories.find(function (c) { return c.id === categoryId; });

    var modal = document.createElement('div');
    modal.id = 'addTopicModal';
    modal.className = 'ws-modal-overlay';

    modal.innerHTML = `
      <div class="ws-modal-dialog">
        <div class="ws-modal-header">
          <div class="ws-modal-title">
            <span>🎯</span> Add Topic to ${_esc(cat ? cat.title : 'Module')}
          </div>
          <button class="ws-modal-close" onclick="document.getElementById('addTopicModal')?.remove()">✕</button>
        </div>
        <div class="ws-modal-body">
          <div class="ws-form-group">
            <label class="ws-form-label">Topic / Question Title</label>
            <input type="text" id="topTitleInput" class="ws-form-input" placeholder="e.g. Asyncio Event Loop Internals, Goroutines vs OS Threads..." required autofocus/>
          </div>

          <div class="ws-form-row">
            <div class="ws-form-group">
              <label class="ws-form-label">Difficulty</label>
              <select id="topDiffInput" class="ws-form-select">
                <option value="Beginner">🟢 Beginner</option>
                <option value="Intermediate" selected>🟡 Intermediate</option>
                <option value="Advanced">🔴 Advanced</option>
              </select>
            </div>
            <div class="ws-form-group">
              <label class="ws-form-label">Priority</label>
              <select id="topPrioInput" class="ws-form-select">
                <option value="Low">Low</option>
                <option value="Medium" selected>Medium</option>
                <option value="High">High</option>
                <option value="Critical">Critical</option>
              </select>
            </div>
          </div>

          <div class="ws-form-group">
            <label class="ws-form-label">Initial Status</label>
            <select id="topStatusInput" class="ws-form-select">
              <option value="pending" selected>⚪ Pending</option>
              <option value="inprogress">⏳ In Progress</option>
              <option value="completed">✅ Completed</option>
              <option value="onhold">⏸️ On Hold</option>
            </select>
          </div>

          <div class="ws-form-group">
            <label class="ws-form-label">Key Notes / Takeaways</label>
            <textarea id="topNotesInput" class="ws-form-textarea" rows="3" placeholder="Key points, syntax patterns, edge cases..."></textarea>
          </div>
        </div>
        <div class="ws-modal-footer">
          <button class="ws-btn-primary" onclick="window.StudyWorkspace.saveNewTopic('${categoryId}')">
            💾 Save Topic
          </button>
          <button class="ws-btn-secondary" onclick="document.getElementById('addTopicModal')?.remove()">Cancel</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
  }

  function saveNewTopic(categoryId) {
    var title = document.getElementById('topTitleInput')?.value.trim();
    if (!title) {
      if (window.LMToast) window.LMToast.show('⚠️ Please enter a topic title');
      return;
    }

    var diff = document.getElementById('topDiffInput')?.value || 'Intermediate';
    var prio = document.getElementById('topPrioInput')?.value || 'Medium';
    var st = document.getElementById('topStatusInput')?.value || 'pending';
    var notes = document.getElementById('topNotesInput')?.value.trim() || '';

    var newTop = {
      id: 'top_' + Date.now(),
      category_id: categoryId,
      title: title,
      difficulty: diff,
      priority: prio,
      status: st,
      notes: notes,
      status_changed_at: st !== 'pending' ? new Date().toISOString() : null,
      order_index: _state.topics.length
    };

    _state.topics.push(newTop);
    _saveLocal();

    _getUid().then(function (uid) {
      if (uid && typeof _supabase !== 'undefined' && _supabase) {
        _supabase.from('study_custom_topics').insert(Object.assign({ user_id: uid }, newTop)).then(function () {});
      }
    });

    document.getElementById('addTopicModal')?.remove();
    if (window.LMToast) window.LMToast.show('✅ Topic added: ' + title);
    renderAllWidgets();
    renderActiveStudioTab();
  }

  // ── 9. MANUAL FILE UPLOAD & SUPABASE STORAGE BUCKET INTEGRATION ──────────
  var _selectedUploadFile = null;

  function handleFileSelected(inputEl) {
    var file = inputEl.files && inputEl.files[0];
    if (!file) return;
    _selectedUploadFile = file;

    var previewEl = document.getElementById('matFilePreview');
    var nameEl = document.getElementById('matFileName');
    var sizeEl = document.getElementById('matFileSize');
    var titleInput = document.getElementById('matTitleInput');
    var typeSelect = document.getElementById('matTypeInput');
    var dropzone = document.getElementById('matDropzone');

    if (previewEl) previewEl.style.display = 'flex';
    if (nameEl) nameEl.innerHTML = `📄 ${_esc(file.name)}`;
    if (sizeEl) sizeEl.textContent = Math.round(file.size / 1024) + ' KB';
    if (dropzone) dropzone.classList.add('has-file');

    if (titleInput && !titleInput.value.trim()) {
      var cleanName = file.name.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " ");
      titleInput.value = cleanName;
    }

    if (typeSelect) {
      var ext = file.name.split('.').pop().toLowerCase();
      if (ext === 'pdf') typeSelect.value = 'pdf';
      else if (['png', 'jpg', 'jpeg', 'webp', 'svg', 'gif'].indexOf(ext) !== -1) typeSelect.value = 'image';
      else if (['js', 'ts', 'py', 'java', 'cpp', 'c', 'cs', 'go', 'rs', 'sql', 'html', 'css', 'json'].indexOf(ext) !== -1) typeSelect.value = 'code';
      else if (['doc', 'docx', 'txt', 'md'].indexOf(ext) !== -1) typeSelect.value = 'document';
    }
  }

  function handleDropzoneDrop(event) {
    event.preventDefault();
    event.stopPropagation();
    var dropzone = document.getElementById('matDropzone');
    if (dropzone) dropzone.classList.remove('dropzone-active');

    if (event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files.length > 0) {
      var input = document.getElementById('matFileInput');
      if (input) {
        input.files = event.dataTransfer.files;
        handleFileSelected(input);
      }
    }
  }

  function handleDropzoneDragOver(event) {
    event.preventDefault();
    event.stopPropagation();
    var dropzone = document.getElementById('matDropzone');
    if (dropzone) dropzone.classList.add('dropzone-active');
  }

  function handleDropzoneDragLeave(event) {
    event.preventDefault();
    event.stopPropagation();
    var dropzone = document.getElementById('matDropzone');
    if (dropzone) dropzone.classList.remove('dropzone-active');
  }

  function uploadFileToStorage(file, topicId) {
    return _getUsernameFolder().then(function (userFolder) {
      var folderPrefix = userFolder || 'guest_user';
      var sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      var storagePath = `${folderPrefix}/${topicId || 'general'}/${Date.now()}_${sanitizedName}`;

      var progressBar = document.getElementById('matUploadProgress');
      var progressFill = document.getElementById('matUploadProgressFill');
      if (progressBar) progressBar.style.display = 'block';
      if (progressFill) progressFill.style.width = '30%';

      if (typeof _supabase !== 'undefined' && _supabase?.storage && navigator.onLine) {
        return _supabase.storage
          .from(STORAGE_BUCKET)
          .upload(storagePath, file, {
            contentType: file.type || 'application/octet-stream',
            upsert: true
          })
          .then(function (res) {
            if (progressFill) progressFill.style.width = '80%';
            if (res.error) throw res.error;

            var urlRes = _supabase.storage.from(STORAGE_BUCKET).getPublicUrl(storagePath);
            var publicUrl = urlRes?.data?.publicUrl || '';
            if (progressFill) progressFill.style.width = '100%';

            return {
              fileUrl: publicUrl,
              storagePath: storagePath,
              fileSize: file.size,
              mimeType: file.type || 'application/octet-stream',
              fileName: file.name
            };
          })
          .catch(function (err) {
            console.warn('[StudyWorkspace] Storage upload fallback to DataURL:', err);
            return _readFileAsDataUrl(file, storagePath);
          });
      } else {
        return _readFileAsDataUrl(file, storagePath);
      }
    });
  }

  function _readFileAsDataUrl(file, storagePath) {
    return new Promise(function (resolve) {
      var reader = new FileReader();
      reader.onload = function (e) {
        var progressFill = document.getElementById('matUploadProgressFill');
        if (progressFill) progressFill.style.width = '100%';
        resolve({
          fileUrl: e.target.result,
          storagePath: storagePath,
          fileSize: file.size,
          mimeType: file.type || 'application/octet-stream',
          fileName: file.name
        });
      };
      reader.onerror = function () {
        resolve({
          fileUrl: '',
          storagePath: storagePath,
          fileSize: file.size,
          mimeType: file.type || 'application/octet-stream',
          fileName: file.name
        });
      };
      reader.readAsDataURL(file);
    });
  }

  function openAddMaterialModal(topicId) {
    _selectedUploadFile = null;
    var existing = document.getElementById('addMaterialModal');
    if (existing) existing.remove();

    var modal = document.createElement('div');
    modal.id = 'addMaterialModal';
    modal.className = 'ws-modal-overlay';

    modal.innerHTML = `
      <div class="ws-modal-dialog">
        <div class="ws-modal-header">
          <div class="ws-modal-title">
            <span>📎</span> Attach Study Material / Manual File Upload
          </div>
          <button class="ws-modal-close" onclick="document.getElementById('addMaterialModal')?.remove()">✕</button>
        </div>
        <div class="ws-modal-body">
          
          <div class="ws-form-group">
            <label class="ws-form-label">📤 Manual File Upload (PDF, Docs, Code, Images, Notes)</label>
            <div class="ws-file-dropzone" id="matDropzone"
                 onclick="document.getElementById('matFileInput').click()"
                 ondragover="window.StudyWorkspace.handleDropzoneDragOver(event)"
                 ondragleave="window.StudyWorkspace.handleDropzoneDragLeave(event)"
                 ondrop="window.StudyWorkspace.handleDropzoneDrop(event)">
              <span class="dropzone-icon">📁</span>
              <div class="dropzone-text">Click or drag &amp; drop files here to upload</div>
              <div class="dropzone-subtext">Supports PDF, Markdown (.md), Code (.js,.py,.java,.sql), Documents (.docx,.txt), Images (PNG, JPG, WebP) up to 50MB</div>
              <input type="file" id="matFileInput" style="display:none;" onchange="window.StudyWorkspace.handleFileSelected(this)" accept=".pdf,.doc,.docx,.txt,.md,.png,.jpg,.jpeg,.webp,.svg,.js,.ts,.py,.java,.cpp,.sql,.html,.css,.json"/>
            </div>

            <div class="ws-upload-progress" id="matUploadProgress">
              <div class="ws-upload-progress-fill" id="matUploadProgressFill"></div>
            </div>

            <div class="file-preview-chip" id="matFilePreview" style="display:none;">
              <span class="file-preview-name" id="matFileName">📄 sample.pdf</span>
              <span class="file-preview-size" id="matFileSize">120 KB</span>
            </div>
          </div>

          <div class="ws-form-group">
            <label class="ws-form-label">Material Title</label>
            <input type="text" id="matTitleInput" class="ws-form-input" placeholder="e.g. Official Documentation Cheat Sheet, Architecture PDF, Solution Snippet..." required/>
          </div>

          <div class="ws-form-row">
            <div class="ws-form-group">
              <label class="ws-form-label">Material Type</label>
              <select id="matTypeInput" class="ws-form-select">
                <option value="pdf">📄 PDF / Document</option>
                <option value="note">📝 Rich Markdown Note / Summary</option>
                <option value="code">💻 Code Snippet / Playground</option>
                <option value="image">🖼️ Diagram / Architecture Image</option>
                <option value="link">🔗 Documentation / Web URL</option>
                <option value="video">🎥 YouTube / Video Walkthrough</option>
              </select>
            </div>
            <div class="ws-form-group">
              <label class="ws-form-label">External URL / Web Link (Optional)</label>
              <input type="url" id="matUrlInput" class="ws-form-input" placeholder="https://..."/>
            </div>
          </div>

          <div class="ws-form-group">
            <label class="ws-form-label">Note Content / Code Body (Optional)</label>
            <textarea id="matContentInput" class="ws-form-textarea" rows="4" placeholder="Write markdown notes or paste code snippets here..."></textarea>
          </div>
        </div>
        <div class="ws-modal-footer">
          <button class="ws-btn-primary" id="btnSaveMaterial" onclick="window.StudyWorkspace.saveNewMaterial('${topicId}')">
            💾 Upload &amp; Attach Material
          </button>
          <button class="ws-btn-secondary" onclick="document.getElementById('addMaterialModal')?.remove()">Cancel</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
  }

  function saveNewMaterial(topicId) {
    var title = document.getElementById('matTitleInput')?.value.trim();
    if (!title) {
      if (window.LMToast) window.LMToast.show('⚠️ Please enter a material title');
      return;
    }

    var type = document.getElementById('matTypeInput')?.value || 'note';
    var extUrl = document.getElementById('matUrlInput')?.value.trim() || '';
    var content = document.getElementById('matContentInput')?.value || '';
    var btn = document.getElementById('btnSaveMaterial');

    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '⏳ Uploading to Cloud...';
    }

    var uploadPromise = _selectedUploadFile ?
      uploadFileToStorage(_selectedUploadFile, topicId) :
      Promise.resolve({ fileUrl: extUrl, storagePath: null, fileSize: 0, mimeType: '', fileName: '' });

    uploadPromise.then(function (uploadRes) {
      var newMat = {
        id: 'mat_' + Date.now(),
        topic_id: topicId,
        title: title,
        material_type: type,
        external_url: extUrl || (uploadRes.fileUrl && (type === 'link' || type === 'video') ? uploadRes.fileUrl : ''),
        file_url: uploadRes.fileUrl || '',
        storage_path: uploadRes.storagePath || null,
        file_size_bytes: uploadRes.fileSize || 0,
        status: 'pending',
        progress_pct: 0,
        content: content,
        created_at: new Date().toISOString()
      };

      _state.materials.unshift(newMat);
      _saveLocal();

      _getUid().then(function (uid) {
        if (uid && typeof _supabase !== 'undefined' && _supabase) {
          _supabase.from('study_materials').insert(Object.assign({ user_id: uid }, newMat)).then(function () {});
        }
      });

      document.getElementById('addMaterialModal')?.remove();
      if (window.LMToast) window.LMToast.show('✅ Material attached!');
      openTopicExplorer(topicId);
      renderAllWidgets();
      renderActiveStudioTab();
    }).catch(function (e) {
      console.error('[StudyWorkspace] Material save error:', e);
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = '💾 Upload & Attach Material';
      }
      if (window.LMToast) window.LMToast.show('⚠️ Material saved locally');
    });
  }

  function openQuickUploadModal(targetDomainId) {
    var existing = document.getElementById('quickUploadModal');
    if (existing) existing.remove();

    if (_state.topics.length === 0) {
      if (window.LMToast) window.LMToast.show('ℹ️ Please create a section & topic first before uploading materials');
      openStudio('sections');
      return;
    }

    var topicOptions = _state.topics.map(function (t) {
      var cat = _state.categories.find(function (c) { return c.id === t.category_id; });
      var dom = cat ? _state.domains.find(function (d) { return d.id === cat.domain_id; }) : null;
      var label = (dom ? dom.title + ' ➔ ' : '') + t.title;
      return `<option value="${t.id}">${_esc(label)}</option>`;
    }).join('');

    var modal = document.createElement('div');
    modal.id = 'quickUploadModal';
    modal.className = 'ws-modal-overlay';

    modal.innerHTML = `
      <div class="ws-modal-dialog">
        <div class="ws-modal-header">
          <div class="ws-modal-title">
            <span>📤</span> Upload File / External Link to Cloud
          </div>
          <button class="ws-modal-close" onclick="document.getElementById('quickUploadModal')?.remove()">✕</button>
        </div>
        <div class="ws-modal-body">
          <div class="ws-form-group">
            <label class="ws-form-label">Target Track / Study Topic</label>
            <select id="quickTopicSelect" class="ws-form-select">
              ${topicOptions}
            </select>
          </div>

          <div class="ws-form-group">
            <label class="ws-form-label">Select File to Upload</label>
            <div class="ws-file-dropzone" id="matDropzone"
                 onclick="document.getElementById('matFileInput').click()"
                 ondragover="window.StudyWorkspace.handleDropzoneDragOver(event)"
                 ondragleave="window.StudyWorkspace.handleDropzoneDragLeave(event)"
                 ondrop="window.StudyWorkspace.handleDropzoneDrop(event)">
              <span class="dropzone-icon">☁️</span>
              <div class="dropzone-text">Click to choose PDF, Notes, Docs, Images or Code</div>
              <div class="dropzone-subtext">Stored in Supabase Storage Bucket ('study-materials')</div>
              <input type="file" id="matFileInput" style="display:none;" onchange="window.StudyWorkspace.handleFileSelected(this)" accept=".pdf,.doc,.docx,.txt,.md,.png,.jpg,.jpeg,.webp,.svg,.js,.ts,.py,.java,.cpp,.sql,.html,.css,.json"/>
            </div>

            <div class="ws-upload-progress" id="matUploadProgress">
              <div class="ws-upload-progress-fill" id="matUploadProgressFill"></div>
            </div>

            <div class="file-preview-chip" id="matFilePreview" style="display:none;">
              <span class="file-preview-name" id="matFileName">📄 file.pdf</span>
              <span class="file-preview-size" id="matFileSize">0 KB</span>
            </div>
          </div>

          <div class="ws-form-group">
            <label class="ws-form-label">Material Title</label>
            <input type="text" id="matTitleInput" class="ws-form-input" placeholder="e.g. Architecture Blueprint, Code Cheat Sheet..." required/>
          </div>

          <div class="ws-form-group">
            <label class="ws-form-label">Or External URL / Link (Optional)</label>
            <input type="url" id="matUrlInput" class="ws-form-input" placeholder="https://..."/>
          </div>
        </div>
        <div class="ws-modal-footer">
          <button class="ws-btn-primary" id="btnSaveMaterial" onclick="window.StudyWorkspace.saveQuickUpload()">
            ☁️ Upload to Supabase Storage
          </button>
          <button class="ws-btn-secondary" onclick="document.getElementById('quickUploadModal')?.remove()">Cancel</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
  }

  function saveQuickUpload() {
    var topicId = document.getElementById('quickTopicSelect')?.value;
    if (!topicId) {
      if (window.LMToast) window.LMToast.show('⚠️ Please select a target topic');
      return;
    }
    saveNewMaterial(topicId);
    document.getElementById('quickUploadModal')?.remove();
  }

  // ── 10. MATERIAL VIEWER MODAL WITH EXTERNAL LINK & PROGRESS CONTROLS ──────
  function openMaterialViewer(materialId) {
    var mat = _state.materials.find(function (m) { return m.id === materialId; });
    if (!mat) return;

    mat.last_accessed_at = new Date().toISOString();
    _saveLocal();

    var existing = document.getElementById('materialViewerModal');
    if (existing) existing.remove();

    var modal = document.createElement('div');
    modal.id = 'materialViewerModal';
    modal.className = 'ws-modal-overlay';

    var displayUrl = mat.file_url || mat.external_url || '';
    var bodyHtml = '';

    if (mat.material_type === 'pdf' && displayUrl) {
      bodyHtml = `
        <div style="margin-bottom:12px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">
          <span style="font-size:12px;color:var(--text3);">Embedded PDF Viewer:</span>
          <a href="${_esc(displayUrl)}" target="_blank" rel="noopener" class="ws-btn-extlink" style="font-size:11.5px;padding:5px 12px;">
            🔗 Open PDF in New Tab ↗
          </a>
        </div>
        <div style="height:520px;background:#000;border-radius:10px;overflow:hidden;border:1px solid var(--border,#262f45);">
          <iframe src="${_esc(displayUrl)}" style="width:100%;height:100%;border:none;"></iframe>
        </div>
      `;
    } else if (mat.material_type === 'image' && displayUrl) {
      bodyHtml = `
        <div style="text-align:center;background:rgba(0,0,0,0.3);border-radius:10px;padding:16px;border:1px solid var(--border,#262f45);">
          <img src="${_esc(displayUrl)}" alt="${_esc(mat.title)}" style="max-width:100%;max-height:480px;border-radius:8px;object-fit:contain;box-shadow:0 8px 24px rgba(0,0,0,0.5);"/>
          <div style="margin-top:12px;">
            <a href="${_esc(displayUrl)}" target="_blank" rel="noopener" class="ws-btn-extlink" style="font-size:11.5px;padding:5px 12px;">
              🔗 Open Full Resolution Image ↗
            </a>
          </div>
        </div>
      `;
    } else if (mat.material_type === 'code') {
      bodyHtml = `
        <div style="position:relative;">
          <button class="ws-btn-secondary" style="position:absolute;top:10px;right:10px;font-size:11px;padding:3px 8px;z-index:2;" onclick="navigator.clipboard.writeText(decodeURIComponent('${encodeURIComponent(mat.content)}'));if(window.LMToast)window.LMToast.show('📋 Code copied to clipboard!');">
            📋 Copy Code
          </button>
          <pre style="background:#0f172a;padding:16px;border-radius:10px;color:#38bdf8;font-family:'JetBrains Mono',monospace;font-size:13px;overflow-x:auto;max-height:450px;line-height:1.6;border:1px solid rgba(56,189,248,0.2);"><code>${_esc(mat.content)}</code></pre>
        </div>
      `;
    } else if (mat.material_type === 'link' || mat.material_type === 'video' || displayUrl) {
      bodyHtml = `
        <div style="padding:24px;background:rgba(255,255,255,0.03);border-radius:12px;border:1px solid var(--border,#262f45);text-align:center;">
          <div style="font-size:36px;margin-bottom:12px;">${mat.material_type === 'video' ? '🎥' : '🔗'}</div>
          <div style="font-size:15px;font-weight:700;color:var(--text);margin-bottom:6px;">${_esc(mat.title)}</div>
          <p style="font-size:13px;color:var(--text3);margin-bottom:18px;max-width:520px;margin-left:auto;margin-right:auto;">${_esc(mat.content || 'External documentation or learning link')}</p>
          <a href="${_esc(displayUrl)}" target="_blank" rel="noopener" class="ws-btn-primary" style="text-decoration:none;display:inline-flex;padding:9px 20px;font-size:13px;">
            🔗 Open Link in New Tab ↗
          </a>
        </div>
      `;
    } else {
      bodyHtml = `
        <div style="font-size:13.5px;color:var(--text);line-height:1.75;white-space:pre-wrap;background:rgba(255,255,255,0.02);padding:18px;border-radius:10px;border:1px solid var(--border,#262f45);">${_esc(mat.content || mat.title)}</div>
      `;
    }

    var matStatus = mat.status || 'pending';
    var matPct = mat.progress_pct !== undefined ? mat.progress_pct : (matStatus === 'completed' ? 100 : (matStatus === 'inprogress' ? 50 : 0));

    modal.innerHTML = `
      <div class="ws-modal-dialog wide">
        <div class="ws-modal-header">
          <div class="ws-modal-title">
            <span class="material-type-tag ${mat.material_type}">${mat.material_type}</span>
            <span>${_esc(mat.title)}</span>
          </div>
          <div style="display:flex;align-items:center;gap:8px;">
            ${displayUrl ? `
              <a href="${_esc(displayUrl)}" target="_blank" rel="noopener" class="ws-btn-extlink">
                🔗 Open Link ↗
              </a>
            ` : ''}
            <button class="ws-modal-close" onclick="document.getElementById('materialViewerModal')?.remove()">✕</button>
          </div>
        </div>
        <div class="ws-modal-body">
          
          <div class="mat-viewer-progress-box">
            <div style="display:flex;align-items:center;gap:10px;">
              <span style="font-size:12px;color:var(--text2);font-weight:700;">Material Progress:</span>
              <div class="mat-viewer-status-group">
                <button class="mat-viewer-status-btn ${matStatus==='pending'?'active st-pending':''}" onclick="window.StudyWorkspace.setMaterialStatus('${mat.id}', 'pending', 0);window.StudyWorkspace.openMaterialViewer('${mat.id}')">⚪ Pending</button>
                <button class="mat-viewer-status-btn ${matStatus==='inprogress'?'active st-inprogress':''}" onclick="window.StudyWorkspace.setMaterialStatus('${mat.id}', 'inprogress', 50);window.StudyWorkspace.openMaterialViewer('${mat.id}')">⏳ In Progress</button>
                <button class="mat-viewer-status-btn ${matStatus==='completed'?'active st-completed':''}" onclick="window.StudyWorkspace.setMaterialStatus('${mat.id}', 'completed', 100);window.StudyWorkspace.openMaterialViewer('${mat.id}')">✅ Completed</button>
              </div>
            </div>
            <div style="display:flex;align-items:center;gap:8px;min-width:180px;">
              <input type="range" min="0" max="100" value="${matPct}" onchange="window.StudyWorkspace.setMaterialProgress('${mat.id}', this.value);document.getElementById('matPctLabel').textContent=this.value+'%';" style="flex:1;accent-color:#06d6a0;cursor:pointer;"/>
              <span id="matPctLabel" style="font-family:'JetBrains Mono',monospace;font-size:12px;color:#06d6a0;font-weight:700;">${matPct}%</span>
            </div>
          </div>

          ${bodyHtml}

          ${mat.storage_path ? `
            <div style="margin-top:14px;font-size:11px;color:var(--text3);display:flex;align-items:center;gap:6px;background:rgba(255,255,255,0.02);padding:6px 12px;border-radius:6px;border:1px solid rgba(255,255,255,0.05);">
              <span>☁️ Cloud Storage:</span>
              <code style="color:var(--cyan,#38bdf8);font-family:monospace;font-size:11px;">study-materials/${_esc(mat.storage_path)}</code>
            </div>
          ` : ''}

          <div style="margin-top:20px;border-top:1px solid rgba(255,255,255,0.06);padding-top:16px;">
            <label class="ws-form-label">📝 Study Notes &amp; Observations on this File</label>
            <textarea class="ws-form-textarea" rows="3" placeholder="Add observations, takeaways, or formulas..." onchange="window.StudyWorkspace.updateMaterialNotes('${mat.id}', this.value)">${_esc(mat.content || '')}</textarea>
          </div>
        </div>
        <div class="ws-modal-footer" style="justify-content:space-between;">
          <button class="ws-btn-danger" onclick="window.StudyWorkspace.deleteMaterial('${mat.id}');document.getElementById('materialViewerModal')?.remove();">
            🗑️ Delete Material
          </button>
          <button class="ws-btn-secondary" onclick="document.getElementById('materialViewerModal')?.remove()">Close</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
  }

  // ── 11. CASCADED DELETION ENGINE ──────────────────────────────────────────
  function confirmDeleteDomain(domainId) {
    var dom = _state.domains.find(function (d) { return d.id === domainId; });
    if (!dom) return;

    var existing = document.getElementById('deleteConfirmModal');
    if (existing) existing.remove();

    var domCats = _state.categories.filter(function (c) { return c.domain_id === domainId; });
    var catIds = new Set(domCats.map(function (c) { return c.id; }));
    var domTopics = _state.topics.filter(function (t) { return catIds.has(t.category_id); });
    var topIds = new Set(domTopics.map(function (t) { return t.id; }));
    var domMats = _state.materials.filter(function (m) { return topIds.has(m.topic_id); });

    var modal = document.createElement('div');
    modal.id = 'deleteConfirmModal';
    modal.className = 'ws-modal-overlay';

    modal.innerHTML = `
      <div class="ws-modal-dialog" style="max-width:500px;">
        <div class="ws-modal-header">
          <div class="ws-modal-title" style="color:#fb7185;">
            <span>⚠️</span> Delete Custom Section
          </div>
          <button class="ws-modal-close" onclick="document.getElementById('deleteConfirmModal')?.remove()">✕</button>
        </div>
        <div class="ws-modal-body">
          <div class="danger-warning-box">
            <div class="danger-warning-title">🚨 Permanent Action Warning</div>
            Are you sure you want to completely delete the section <strong>"${_esc(dom.title)}"</strong>?
          </div>
          <p style="font-size:12.5px;color:var(--text2);margin-bottom:12px;">
            This will permanently erase all associated data across the workspace and database:
          </p>
          <ul style="font-size:12px;color:var(--text3);padding-left:18px;line-height:1.6;margin-bottom:16px;">
            <li><strong>${domCats.length}</strong> Modules / Categories</li>
            <li><strong>${domTopics.length}</strong> Study Topics &amp; Practice Questions</li>
            <li><strong>${domMats.length}</strong> Study Materials, Notes &amp; Attached Files</li>
            <li>All study focus time logs and session tracking</li>
          </ul>
        </div>
        <div class="ws-modal-footer">
          <button class="ws-btn-danger-solid" onclick="window.StudyWorkspace.deleteDomain('${domainId}')">
            🗑️ Yes, Delete Section &amp; All Data
          </button>
          <button class="ws-btn-secondary" onclick="document.getElementById('deleteConfirmModal')?.remove()">
            Cancel
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
  }

  function deleteDomain(domainId) {
    var dom = _state.domains.find(function (d) { return d.id === domainId; });
    var domTitle = dom ? dom.title : 'Section';

    var domCats = _state.categories.filter(function (c) { return c.domain_id === domainId; });
    var catIds = new Set(domCats.map(function (c) { return c.id; }));
    var domTopics = _state.topics.filter(function (t) { return catIds.has(t.category_id); });
    var topIds = new Set(domTopics.map(function (t) { return t.id; }));
    var domMats = _state.materials.filter(function (m) { return topIds.has(m.topic_id); });

    var storagePaths = domMats.map(function (m) { return m.storage_path; }).filter(Boolean);
    if (storagePaths.length > 0 && typeof _supabase !== 'undefined' && _supabase?.storage) {
      _supabase.storage.from(STORAGE_BUCKET).remove(storagePaths).catch(function () {});
    }

    _getUid().then(function (uid) {
      if (uid && typeof _supabase !== 'undefined' && _supabase) {
        _supabase.from('study_custom_domains').delete().eq('id', domainId).then(function () {});
        _supabase.from('study_time_logs').delete().eq('domain_id', domainId).then(function () {});
      }
    });

    _state.domains = _state.domains.filter(function (d) { return d.id !== domainId; });
    _state.categories = _state.categories.filter(function (c) { return c.domain_id !== domainId; });
    _state.topics = _state.topics.filter(function (t) { return !catIds.has(t.category_id); });
    _state.materials = _state.materials.filter(function (m) { return !topIds.has(m.topic_id); });
    _state.timeLogs = _state.timeLogs.filter(function (l) { return l.domain_id !== domainId && !topIds.has(l.topic_id); });

    if (_state.prefs.last_active_topic && (_state.prefs.last_active_topic.domainId === domainId || topIds.has(_state.prefs.last_active_topic.topicId))) {
      clearLastActiveTopic();
    }

    try {
      localStorage.removeItem('lm_lang_sec_collapsed_' + domainId);
    } catch (e) {}

    _saveLocal();

    document.getElementById('deleteConfirmModal')?.remove();

    if (window.LMToast) {
      window.LMToast.show('🗑️ Section "' + domTitle + '" and all associated data cleared!');
    }

    renderAllWidgets();
    renderActiveStudioTab();
  }

  function deleteCategory(categoryId) {
    var cat = _state.categories.find(function (c) { return c.id === categoryId; });
    if (!cat) return;
    if (!confirm('Delete module "' + cat.title + '" and its topics/materials?')) return;

    var cTopics = _state.topics.filter(function (t) { return t.category_id === categoryId; });
    var tIds = new Set(cTopics.map(function (t) { return t.id; }));
    var cMats = _state.materials.filter(function (m) { return tIds.has(m.topic_id); });
    var storagePaths = cMats.map(function (m) { return m.storage_path; }).filter(Boolean);

    if (storagePaths.length > 0 && typeof _supabase !== 'undefined' && _supabase?.storage) {
      _supabase.storage.from(STORAGE_BUCKET).remove(storagePaths).catch(function () {});
    }

    _getUid().then(function (uid) {
      if (uid && typeof _supabase !== 'undefined' && _supabase) {
        _supabase.from('study_custom_categories').delete().eq('id', categoryId).then(function () {});
      }
    });

    _state.categories = _state.categories.filter(function (c) { return c.id !== categoryId; });
    _state.topics = _state.topics.filter(function (t) { return t.category_id !== categoryId; });
    _state.materials = _state.materials.filter(function (m) { return !tIds.has(m.topic_id); });

    _saveLocal();
    if (window.LMToast) window.LMToast.show('🗑️ Module deleted');
    renderAllWidgets();
    renderActiveStudioTab();
  }

  function deleteTopic(topicId) {
    var t = _state.topics.find(function (x) { return x.id === topicId; });
    if (!t) return;
    if (!confirm('Are you sure you want to delete topic "' + t.title + '" and its attached materials?')) return;

    var mats = _state.materials.filter(function (m) { return m.topic_id === topicId; });
    var storagePaths = mats.map(function (m) { return m.storage_path; }).filter(Boolean);
    if (storagePaths.length > 0 && typeof _supabase !== 'undefined' && _supabase?.storage) {
      _supabase.storage.from(STORAGE_BUCKET).remove(storagePaths).catch(function () {});
    }

    _getUid().then(function (uid) {
      if (uid && typeof _supabase !== 'undefined' && _supabase) {
        _supabase.from('study_custom_topics').delete().eq('id', topicId).then(function () {});
        _supabase.from('study_materials').delete().eq('topic_id', topicId).then(function () {});
      }
    });

    _state.topics = _state.topics.filter(function (x) { return x.id !== topicId; });
    _state.materials = _state.materials.filter(function (m) { return m.topic_id !== topicId; });
    if (_state.prefs.last_active_topic && _state.prefs.last_active_topic.topicId === topicId) {
      clearLastActiveTopic();
    }

    _saveLocal();
    document.getElementById('topicExplorerModal')?.remove();

    if (window.LMToast) window.LMToast.show('🗑️ Topic deleted');
    renderAllWidgets();
    renderActiveStudioTab();
  }

  function deleteMaterial(materialId) {
    var mat = _state.materials.find(function (m) { return m.id === materialId; });
    if (!mat) return;

    if (mat.storage_path && typeof _supabase !== 'undefined' && _supabase?.storage) {
      _supabase.storage.from(STORAGE_BUCKET).remove([mat.storage_path]).catch(function () {});
    }

    _getUid().then(function (uid) {
      if (uid && typeof _supabase !== 'undefined' && _supabase) {
        _supabase.from('study_materials').delete().eq('id', materialId).then(function () {});
      }
    });

    _state.materials = _state.materials.filter(function (m) { return m.id !== materialId; });
    _saveLocal();

    if (window.LMToast) window.LMToast.show('🗑️ Material removed');
    if (mat.topic_id) openTopicExplorer(mat.topic_id);
    renderAllWidgets();
    renderActiveStudioTab();
  }

  // ── 12. WIDGET CUSTOMIZER CONTROLS ─────────────────────────────────────────
  function _isWidgetVisible(widgetKey) {
    return (_state.prefs.active_widgets || []).indexOf(widgetKey) !== -1;
  }

  function openWidgetCustomizer() {
    openStudio('widgets');
  }

  function toggleWidgetVisibility(key, visible) {
    var list = _state.prefs.active_widgets || [];
    var idx = list.indexOf(key);
    if (visible && idx === -1) {
      list.push(key);
    } else if (!visible && idx !== -1) {
      list.splice(idx, 1);
    }
    _state.prefs.active_widgets = list;
    _saveLocal();

    _getUid().then(function (uid) {
      if (uid && typeof _supabase !== 'undefined' && _supabase) {
        _supabase.from('study_user_preferences').upsert({
          user_id: uid,
          active_widgets: list,
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id' }).then(function () {});
      }
    });

    renderAllWidgets();
  }

  // ── 13. PRE-BUILT ROADMAP TEMPLATES ────────────────────────────────────────
  var TEMPLATES = [
    {
      id: 'tpl_python',
      title: 'Python Full-Stack & FastAPI Masterclass',
      icon: '🐍',
      color: '#38bdf8',
      badge: 'Backend Track',
      tagline: 'Python 3.12, Asyncio, FastAPI, SQLAlchemy 2.0, Pydantic & Pytest',
      categories: [
        { title: 'Python Core & Concurrency', topics: ['Asyncio Event Loop & Coroutines', 'Generators & Context Managers', 'GIL & Multiprocessing'] },
        { title: 'FastAPI & Microservices', topics: ['Dependency Injection & OAuth2', 'Pydantic V2 Validation & Serialization', 'Background Tasks & Celery'] }
      ]
    },
    {
      id: 'tpl_aws',
      title: 'AWS Certified Solutions Architect',
      icon: '☁️',
      color: '#f59e0b',
      badge: 'Cloud Certification',
      tagline: 'Compute, S3/EFS Storage, VPC Networking, IAM & Disaster Recovery',
      categories: [
        { title: 'Compute & Networking', topics: ['VPC Peering, Transit Gateway & NAT', 'EC2 Auto-scaling & ALB Routing', 'AWS Lambda & API Gateway'] },
        { title: 'Storage & Resilience', topics: ['S3 Storage Tiers & Replication', 'Aurora Multi-AZ & Read Replicas', 'Route53 Failover & CloudFront'] }
      ]
    },
    {
      id: 'tpl_golang',
      title: 'Golang Distributed Systems',
      icon: '🔷',
      color: '#06d6a0',
      badge: 'Systems Track',
      tagline: 'Goroutines, Channels, gRPC, Protobuf & Distributed Consensus',
      categories: [
        { title: 'Go Concurrency Engine', topics: ['Goroutine Leak Prevention & Channels', 'sync.WaitGroup & Mutex Patterns', 'Context Cancellation & Deadlines'] },
        { title: 'Distributed Microservices', topics: ['gRPC Interceptors & Streaming', 'Kafka Event Sourcing in Go', 'Raft Consensus Simulation'] }
      ]
    }
  ];

  function openTemplateModal() {
    openStudio('blueprints');
  }

  function importTemplate(templateId) {
    var tpl = TEMPLATES.find(function (t) { return t.id === templateId; });
    if (!tpl) return;

    var domainId = 'dom_' + Date.now();
    var newDomain = {
      id: domainId,
      title: tpl.title,
      icon: tpl.icon,
      color: tpl.color,
      badge: tpl.badge,
      tagline: tpl.tagline,
      status: 'inprogress',
      order_index: _state.domains.length
    };
    _state.domains.push(newDomain);

    tpl.categories.forEach(function (c, cIdx) {
      var catId = 'cat_' + Date.now() + '_' + cIdx;
      _state.categories.push({
        id: catId,
        domain_id: domainId,
        title: c.title,
        order_index: cIdx
      });

      c.topics.forEach(function (topTitle, tIdx) {
        _state.topics.push({
          id: 'top_' + Date.now() + '_' + cIdx + '_' + tIdx,
          category_id: catId,
          title: topTitle,
          status: 'pending',
          difficulty: 'Intermediate',
          priority: 'High',
          order_index: tIdx
        });
      });
    });

    _saveLocal();
    _getUid().then(function (uid) {
      if (uid && typeof _supabase !== 'undefined' && _supabase) {
        _supabase.from('study_custom_domains').insert(Object.assign({ user_id: uid }, newDomain)).then(function () {});
      }
    });

    if (window.LMToast) window.LMToast.show('🎉 Imported roadmap: ' + tpl.title);
    renderAllWidgets();
    renderActiveStudioTab();
  }

  // ── 14. GOAL MODAL ─────────────────────────────────────────────────────────
  function openGoalModal() {
    var existing = document.getElementById('addGoalModal');
    if (existing) existing.remove();

    var modal = document.createElement('div');
    modal.id = 'addGoalModal';
    modal.className = 'ws-modal-overlay';

    modal.innerHTML = `
      <div class="ws-modal-dialog">
        <div class="ws-modal-header">
          <div class="ws-modal-title">
            <span>🎯</span> Create Learning Goal &amp; Milestones
          </div>
          <button class="ws-modal-close" onclick="document.getElementById('addGoalModal')?.remove()">✕</button>
        </div>
        <div class="ws-modal-body">
          <div class="ws-form-group">
            <label class="ws-form-label">Goal Title</label>
            <input type="text" id="goalTitleInput" class="ws-form-input" placeholder="e.g. Master Spring Boot Microservices, Clear AWS Exam, Complete 100 DSA..." required autofocus/>
          </div>

          <div class="ws-form-row">
            <div class="ws-form-group">
              <label class="ws-form-label">Target Completion Date</label>
              <input type="date" id="goalDateInput" class="ws-form-input"/>
            </div>
            <div class="ws-form-group">
              <label class="ws-form-label">Target Questions / Topics</label>
              <input type="number" id="goalTargetCountInput" class="ws-form-input" value="30" min="1"/>
            </div>
          </div>

          <div class="ws-form-group">
            <label class="ws-form-label">Milestones (comma-separated)</label>
            <textarea id="goalMilestonesInput" class="ws-form-textarea" rows="3" placeholder="Milestone 1: Complete 10 Core Topics, Milestone 2: Build Hands-on Project, Milestone 3: Mock Exam"></textarea>
          </div>
        </div>
        <div class="ws-modal-footer">
          <button class="ws-btn-primary" onclick="window.StudyWorkspace.saveNewGoal()">
            💾 Save Goal
          </button>
          <button class="ws-btn-secondary" onclick="document.getElementById('addGoalModal')?.remove()">Cancel</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
  }

  function saveNewGoal() {
    var title = document.getElementById('goalTitleInput')?.value.trim();
    if (!title) {
      if (window.LMToast) window.LMToast.show('⚠️ Please enter a goal title');
      return;
    }

    var date = document.getElementById('goalDateInput')?.value || null;
    var targetCount = parseInt(document.getElementById('goalTargetCountInput')?.value || '30', 10);
    var rawMilestones = document.getElementById('goalMilestonesInput')?.value.trim() || '';

    var ms = rawMilestones.split(',').map(function (s) { return s.trim(); }).filter(Boolean).map(function (t) {
      return { id: 'ms_' + Math.random().toString(36).substr(2, 6), title: t, completed: false };
    });

    if (ms.length === 0) {
      ms = [
        { id: 'ms_1', title: 'Complete first 10 topics', completed: false },
        { id: 'ms_2', title: 'Hands-on practice & notes review', completed: false },
        { id: 'ms_3', title: 'Mock assessment clearance', completed: false }
      ];
    }

    var newGoal = {
      id: 'goal_' + Date.now(),
      title: title,
      target_date: date,
      target_topics: targetCount,
      milestones: ms,
      status: 'active'
    };

    _state.goals.unshift(newGoal);
    _saveLocal();

    _getUid().then(function (uid) {
      if (uid && typeof _supabase !== 'undefined' && _supabase) {
        _supabase.from('study_learning_goals').insert(Object.assign({ user_id: uid }, newGoal)).then(function () {});
      }
    });

    document.getElementById('addGoalModal')?.remove();
    if (window.LMToast) window.LMToast.show('✅ Goal created: ' + title);
    renderAllWidgets();
    renderActiveStudioTab();
  }

  // ── 15. TOPIC EXPLORER & DEDICATED PAGE NAVIGATION ───────────────────────
  function openTopicExplorer(topicId) {
    if (!topicId) return;

    var t = _state.topics.find(function (x) { return x.id === topicId; });
    var cat = t ? _state.categories.find(function (c) { return c.id === t.category_id; }) : null;
    var dom = cat ? _state.domains.find(function (d) { return d.id === cat.domain_id; }) : null;

    if (t) {
      setLastActiveTopic({
        id: t.id,
        title: t.title,
        domainId: dom ? dom.id : null,
        domainTitle: dom ? dom.title : 'Study Module',
        status: t.status
      });
    }

    // If currently on topic.html, update in-page seamlessly
    if (typeof window !== 'undefined' && window.location.pathname.includes('topic.html')) {
      if (window.StudyTopicPage && typeof window.StudyTopicPage.loadTopic === 'function') {
        window.StudyTopicPage.loadTopic(topicId);
        return;
      }
    }

    // Otherwise, navigate directly to dedicated full-page topic workspace
    var targetUrl = 'topic.html?id=' + encodeURIComponent(topicId);
    window.location.href = targetUrl;
  }

  function updateTopicNotes(topicId, notes) {
    var t = _state.topics.find(function (x) { return x.id === topicId; });
    if (!t) return;
    t.notes = notes;
    _saveLocal();
    _getUid().then(function (uid) {
      if (uid && typeof _supabase !== 'undefined' && _supabase) {
        _supabase.from('study_custom_topics').update({ notes: notes, updated_at: new Date().toISOString() }).eq('id', topicId).then(function () {});
      }
    });
  }

  // ── 16. IN-SECTION SEARCH & FILTER HANDLERS ────────────────────────────────
  function handleSectionSearch(domainId, query) {
    if (!_secFilters[domainId]) _secFilters[domainId] = { query: '', tab: 'all' };
    _secFilters[domainId].query = (query || '').toLowerCase().trim();
    if (_secFilters[domainId].query.length > 0) {
      try { localStorage.setItem('lm_lang_sec_collapsed_' + domainId, 'false'); } catch(e){}
    }
    renderCustomDomainSections();
  }

  function handleSectionFilterTab(domainId, tabKey) {
    if (!_secFilters[domainId]) _secFilters[domainId] = { query: '', tab: 'all' };
    _secFilters[domainId].tab = tabKey;
    if (tabKey !== 'all') {
      try { localStorage.setItem('lm_lang_sec_collapsed_' + domainId, 'false'); } catch(e){}
    }
    renderCustomDomainSections();
  }

  // ── 16B. POMODORO FOCUS TIMER & GOALS WIDGET ENGINE ────────────────────────
  function _getDomainIdForTopic(topicId) {
    if (!topicId) return null;
    var top = _state.topics.find(function (t) { return t.id === topicId; });
    if (!top) return null;
    var cat = _state.categories.find(function (c) { return c.id === top.category_id; });
    return cat ? cat.domain_id : null;
  }

  function _formatPomoTime(secs) {
    var m = Math.floor(secs / 60);
    var s = secs % 60;
    return (m < 10 ? '0' + m : m) + ':' + (s < 10 ? '0' + s : s);
  }

  function _updatePomoDisplay() {
    var displayEl = document.getElementById('pomoTimeDisplay');
    if (displayEl) {
      displayEl.textContent = _formatPomoTime(_pomoTimer.timeLeft);
    }
    var modeLabel = document.getElementById('pomoModeLabel');
    if (modeLabel) {
      modeLabel.textContent = _pomoTimer.mode === 'pomodoro' ? '🎯 Focus' :
                              _pomoTimer.mode === 'short' ? '☕ Short Break' :
                              _pomoTimer.mode === 'long' ? '🌴 Long Break' : '⏱️ Stopwatch';
    }
    var toggleBtn = document.getElementById('btnPomoToggle');
    if (toggleBtn) {
      toggleBtn.textContent = _pomoTimer.running ? '⏸️ Pause' : '▶️ Start Focus';
      toggleBtn.style.background = _pomoTimer.running ? 'linear-gradient(135deg, #f59e0b, #d97706)' : 'linear-gradient(135deg, var(--teal, #06d6a0), #10b981)';
    }
    var modeBtns = document.querySelectorAll('.pomo-mode-btn');
    modeBtns.forEach(function (btn) {
      if (btn.getAttribute('data-mode') === _pomoTimer.mode) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }

  function initPomodoroWidget() {
    var container = document.getElementById('pomodoroWidgetContainer');
    if (!container) return;

    if (_state.prefs && _state.prefs.widgets && _state.prefs.widgets.timer === false) {
      container.innerHTML = '';
      return;
    }

    var topicOptions = _state.topics.map(function (t) {
      var cat = _state.categories.find(function (c) { return c.id === t.category_id; });
      var dom = cat ? _state.domains.find(function (d) { return d.id === cat.domain_id; }) : null;
      var trackName = dom ? dom.title : 'Topic';
      var isSelected = _pomoTimer.activeTopicId === t.id ? 'selected' : '';
      return `<option value="${t.id}" ${isSelected}>${_esc(trackName)} ➔ ${_esc(t.title)}</option>`;
    }).join('');

    container.innerHTML = `
      <div class="pomodoro-widget-card">
        <div class="pomo-left">
          <div class="pomo-clock-circle">
            <div class="pomo-time-display" id="pomoTimeDisplay">${_formatPomoTime(_pomoTimer.timeLeft)}</div>
            <div class="pomo-mode-label" id="pomoModeLabel">🎯 Focus</div>
          </div>
          <div class="pomo-controls">
            <div class="pomo-modes">
              <button class="pomo-mode-btn ${_pomoTimer.mode==='pomodoro'?'active':''}" data-mode="pomodoro" onclick="window.StudyWorkspace.setPomoMode('pomodoro')">25m Focus</button>
              <button class="pomo-mode-btn ${_pomoTimer.mode==='short'?'active':''}" data-mode="short" onclick="window.StudyWorkspace.setPomoMode('short')">5m Break</button>
              <button class="pomo-mode-btn ${_pomoTimer.mode==='long'?'active':''}" data-mode="long" onclick="window.StudyWorkspace.setPomoMode('long')">15m Break</button>
              <button class="pomo-mode-btn ${_pomoTimer.mode==='stopwatch'?'active':''}" data-mode="stopwatch" onclick="window.StudyWorkspace.setPomoMode('stopwatch')">⏱️ Count</button>
            </div>
            <div class="pomo-buttons">
              <button class="btn-pomo-action" id="btnPomoToggle" onclick="window.StudyWorkspace.togglePomoTimer()">
                ${_pomoTimer.running ? '⏸️ Pause' : '▶️ Start Focus'}
              </button>
              <button class="btn-pomo-reset" onclick="window.StudyWorkspace.resetPomoTimer()">
                🔄 Reset
              </button>
            </div>
          </div>
        </div>

        <div class="pomo-topic-selector">
          <div class="pomo-select-label">🎯 Active Focus Target / Study Topic:</div>
          <select class="pomo-topic-dropdown" id="pomoTopicSelect" onchange="window.StudyWorkspace.setPomoTopic(this.value)">
            <option value="">-- General Learning / No Topic --</option>
            ${topicOptions}
          </select>
        </div>
      </div>
    `;

    _updatePomoDisplay();
  }

  function setPomoMode(mode) {
    if (_pomoTimer.interval) clearInterval(_pomoTimer.interval);
    _pomoTimer.running = false;
    _pomoTimer.sessionStart = null;
    _pomoTimer.mode = mode;
    _pomoTimer.timeLeft = _pomoTimer.durations[mode] !== undefined ? _pomoTimer.durations[mode] : 25 * 60;
    _updatePomoDisplay();
  }

  function setPomoTopic(topicId) {
    _pomoTimer.activeTopicId = topicId || null;
    var sel = document.getElementById('pomoTopicSelect');
    if (sel && topicId) sel.value = topicId;
  }

  function _logPomoSession(seconds) {
    if (!seconds || seconds <= 0) return;
    var domId = _getDomainIdForTopic(_pomoTimer.activeTopicId);
    var log = {
      id: 'log_' + Date.now(),
      topic_id: _pomoTimer.activeTopicId || null,
      domain_id: domId || null,
      duration_seconds: seconds,
      mode: _pomoTimer.mode,
      created_at: new Date().toISOString()
    };
    _state.timeLogs.push(log);
    _saveLocal();

    _getUid().then(function (uid) {
      if (uid && typeof _supabase !== 'undefined' && _supabase) {
        _supabase.from('study_time_logs').insert(Object.assign({ user_id: uid }, log)).then(function () {});
      }
    });
  }

  function togglePomoTimer() {
    if (_pomoTimer.running) {
      // Pause
      clearInterval(_pomoTimer.interval);
      _pomoTimer.running = false;
      if (_pomoTimer.sessionStart) {
        var elapsed = Math.round((Date.now() - _pomoTimer.sessionStart) / 1000);
        if (elapsed >= 10) {
          _logPomoSession(elapsed);
        }
        _pomoTimer.sessionStart = null;
      }
      _updatePomoDisplay();
    } else {
      // Start
      _pomoTimer.running = true;
      _pomoTimer.sessionStart = Date.now();
      _updatePomoDisplay();

      _pomoTimer.interval = setInterval(function () {
        if (_pomoTimer.mode === 'stopwatch') {
          _pomoTimer.timeLeft++;
          _updatePomoDisplay();
        } else {
          if (_pomoTimer.timeLeft > 0) {
            _pomoTimer.timeLeft--;
            _updatePomoDisplay();
          } else {
            clearInterval(_pomoTimer.interval);
            _pomoTimer.running = false;
            var loggedSecs = _pomoTimer.durations[_pomoTimer.mode] || (25 * 60);
            _logPomoSession(loggedSecs);
            if (window.LMToast) window.LMToast.show('🎉 Focus session completed! Outstanding focus!');
            resetPomoTimer();
            renderCustomDomainSections();
          }
        }
      }, 1000);
    }
  }

  function resetPomoTimer() {
    if (_pomoTimer.interval) clearInterval(_pomoTimer.interval);
    _pomoTimer.running = false;
    _pomoTimer.sessionStart = null;
    _pomoTimer.timeLeft = _pomoTimer.durations[_pomoTimer.mode] !== undefined ? _pomoTimer.durations[_pomoTimer.mode] : 25 * 60;
    _updatePomoDisplay();
  }

  function renderGoalsWidget() {
    var container = document.getElementById('goalsWidgetContainer');
    if (!container) return;

    if (_state.prefs && _state.prefs.widgets && _state.prefs.widgets.goals === false) {
      container.innerHTML = '';
      return;
    }

    if (!_state.goals || _state.goals.length === 0) {
      container.innerHTML = '';
      return;
    }

    var goalsHtml = _state.goals.map(function (g) {
      var daysLeft = g.target_date ? Math.ceil((new Date(g.target_date) - new Date()) / (1000 * 60 * 60 * 24)) : null;
      var daysBadge = daysLeft !== null ? (daysLeft > 0 ? `⏳ ${daysLeft} days remaining` : (daysLeft === 0 ? '⚠️ Due Today' : '⚠️ Overdue')) : '';
      var mCount = g.milestones ? g.milestones.length : 0;
      var mDone = g.milestones ? g.milestones.filter(function (m) { return m.completed; }).length : 0;
      var pct = mCount > 0 ? Math.round((mDone / mCount) * 100) : (g.progress_pct || 0);

      var milestonesList = (g.milestones || []).map(function (m, idx) {
        return `
          <div style="display:flex;align-items:center;gap:6px;font-size:11.5px;color:${m.completed ? 'var(--text3)' : 'var(--text)'};margin-top:4px;">
            <input type="checkbox" ${m.completed ? 'checked' : ''} onchange="window.StudyWorkspace.toggleMilestone('${g.id}', ${idx})" style="cursor:pointer;"/>
            <span style="${m.completed ? 'text-decoration:line-through;' : ''}">${_esc(m.title)}</span>
          </div>
        `;
      }).join('');

      return `
        <div class="goal-item-card">
          <div class="goal-top-row">
            <span class="goal-item-title">${_esc(g.title)}</span>
            ${daysBadge ? `<span class="goal-target-countdown">${daysBadge}</span>` : ''}
          </div>
          <div class="metric-progress-track" style="margin:8px 0;">
            <div class="metric-progress-fill" style="width:${pct}%;background:linear-gradient(90deg,#06d6a0,#4f8ef7);"></div>
          </div>
          <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--text3);margin-bottom:6px;">
            <span>Milestones (${mDone}/${mCount})</span>
            <span style="font-weight:700;color:var(--teal);">${pct}%</span>
          </div>
          ${milestonesList}
        </div>
      `;
    }).join('');

    container.innerHTML = `
      <div class="goals-widget-card">
        <div class="goals-header">
          <div class="goals-title">
            <span>🎯</span> Active Learning Goals &amp; Milestones (${_state.goals.length})
          </div>
          <button class="ws-btn-primary" style="font-size:11px;padding:4px 10px;" onclick="window.StudyWorkspace.openGoalModal()">
            + New Goal
          </button>
        </div>
        <div class="goals-grid">
          ${goalsHtml}
        </div>
      </div>
    `;
  }

  function toggleMilestone(goalId, milestoneIdx) {
    var g = _state.goals.find(function (x) { return x.id === goalId; });
    if (!g || !g.milestones || !g.milestones[milestoneIdx]) return;

    g.milestones[milestoneIdx].completed = !g.milestones[milestoneIdx].completed;
    var doneCount = g.milestones.filter(function (m) { return m.completed; }).length;
    g.progress_pct = Math.round((doneCount / g.milestones.length) * 100);

    _saveLocal();
    _getUid().then(function (uid) {
      if (uid && typeof _supabase !== 'undefined' && _supabase) {
        _supabase.from('study_goals').update({
          milestones: g.milestones,
          progress_pct: g.progress_pct,
          updated_at: new Date().toISOString()
        }).eq('id', goalId).then(function () {});
      }
    });

    renderGoalsWidget();
    renderActiveStudioTab();
  }

  // ── 17. RENDER ALL WIDGETS & MODERNIZED CUSTOM DOMAIN SECTIONS ─────────────
  function renderAllWidgets() {
    renderResumeHero();
    initPomodoroWidget();
    renderGoalsWidget();
    renderCustomDomainSections();
  }

  function renderCustomDomainSections() {
    var container = document.getElementById('customSectionsWrap') || document.getElementById('languageSectionsWrap');
    if (!container) return;

    var existingCustom = document.querySelectorAll('.custom-workspace-domain-section');
    existingCustom.forEach(function (el) { el.remove(); });

    if (!_state.domains || _state.domains.length === 0) {
      if (document.getElementById('customSectionsWrap')) {
        document.getElementById('customSectionsWrap').innerHTML = `
          <div class="custom-track-empty-hero" style="background:var(--bg2,#11141c);border:1px dashed var(--border,#262f45);border-radius:16px;padding:24px 20px;text-align:center;margin-bottom:28px;">
            <div style="font-size:28px;margin-bottom:6px;">🚀</div>
            <div style="font-family:'Syne',sans-serif;font-size:16px;font-weight:800;color:var(--text,#fff);margin-bottom:4px;">Custom Learning Tracks &amp; Workspaces</div>
            <p style="font-size:12.5px;color:var(--text3,#8a95b8);max-width:520px;margin:0 auto 14px;line-height:1.5;">
              Create customized learning domains, attach PDFs/docs/links, set target goals, and launch dedicated full-page topic workspaces.
            </p>
            <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap;">
              <button class="ws-btn-primary" onclick="window.StudyWorkspace.openAddDomainModal()" style="font-size:12px;padding:7px 14px;">
                ➕ Create First Custom Track
              </button>
              <button class="ws-btn-secondary" onclick="window.StudyWorkspace.openStudio('blueprints')" style="font-size:12px;padding:7px 14px;">
                📦 Import Roadmap
              </button>
            </div>
          </div>
        `;
      }
      return;
    }

    var customHtml = _state.domains.map(function (dom) {
      var domCats = _state.categories.filter(function (c) { return c.domain_id === dom.id; });
      if (domCats.length === 0) {
        domCats = [{ id: 'cat_gen_' + dom.id, domain_id: dom.id, title: 'Core Fundamentals & Modules' }];
      }

      var filterState = _secFilters[dom.id] || { query: '', tab: 'all' };

      var allDomTopics = [];
      domCats.forEach(function (c) {
        var cTops = _state.topics.filter(function (t) { return t.category_id === c.id; });
        allDomTopics = allDomTopics.concat(cTops);
      });
      var allDomTopIds = new Set(allDomTopics.map(function (t) { return t.id; }));
      var allDomMats = _state.materials.filter(function (m) { return allDomTopIds.has(m.topic_id); });

      var doneTopicsCount = allDomTopics.filter(function (t) { return t.status === 'completed'; }).length;
      var topicPct = allDomTopics.length > 0 ? Math.round((doneTopicsCount / allDomTopics.length) * 100) : 0;

      var doneMatsCount = allDomMats.filter(function (m) { return m.status === 'completed' || m.progress_pct === 100; }).length;
      var matPct = allDomMats.length > 0 ? Math.round((doneMatsCount / allDomMats.length) * 100) : 0;

      var domLogs = _state.timeLogs.filter(function (l) { return l.domain_id === dom.id || allDomTopIds.has(l.topic_id); });
      var totalStudyMins = Math.round(domLogs.reduce(function (acc, l) { return acc + (l.duration_seconds || 0); }, 0) / 60);

      var dateBadgeHtml = '';
      if (dom.target_date) {
        var daysLeft = Math.ceil((new Date(dom.target_date) - new Date()) / (1000 * 60 * 60 * 24));
        var daysLabel = daysLeft > 0 ? `⏳ ${daysLeft}d left` : (daysLeft === 0 ? '⚠️ Due Today' : '⚠️ Past Due');
        dateBadgeHtml = `<span class="goal-target-countdown">${daysLabel} (${dom.target_date})</span>`;
      }

      var modulesHtml = domCats.map(function (cat) {
        var catTopics = _state.topics.filter(function (t) { return t.category_id === cat.id; });

        var filteredTopics = catTopics.filter(function (t) {
          var tMats = _state.materials.filter(function (m) { return m.topic_id === t.id; });

          if (filterState.tab === 'completed' && t.status !== 'completed') return false;
          if (filterState.tab === 'inprogress' && t.status !== 'inprogress') return false;
          if (filterState.tab === 'pending' && t.status !== 'pending') return false;
          if (filterState.tab === 'has_materials' && tMats.length === 0) return false;

          if (filterState.query) {
            var inTitle = (t.title || '').toLowerCase().includes(filterState.query);
            var inNotes = (t.notes || '').toLowerCase().includes(filterState.query);
            var inMats = tMats.some(function (m) { return (m.title || '').toLowerCase().includes(filterState.query); });
            if (!inTitle && !inNotes && !inMats) return false;
          }

          return true;
        });

        if (catTopics.length > 0 && filteredTopics.length === 0 && (filterState.query || filterState.tab !== 'all')) {
          return '';
        }

        var catDone = catTopics.filter(function (t) { return t.status === 'completed'; }).length;

        var topicCardsHtml = filteredTopics.map(function (t) {
          var tMats = _state.materials.filter(function (m) { return m.topic_id === t.id; });
          var tDoneMats = tMats.filter(function (m) { return m.status === 'completed' || m.progress_pct === 100; }).length;
          var stClass = 'st-' + (t.status || 'pending');

          var matsChecklistHtml = tMats.length > 0 ? `
            <div class="card-materials-container" onclick="event.stopPropagation()">
              <div class="card-materials-header">
                <span>Attached Files (${tDoneMats}/${tMats.length} Done)</span>
                <span style="font-family:'JetBrains Mono';">${tMats.length > 0 ? Math.round((tDoneMats/tMats.length)*100) : 0}%</span>
              </div>
              <div class="card-materials-list">
                ${tMats.slice(0, 3).map(function (m) {
                  var mSt = m.status || 'pending';
                  var mIcon = mSt === 'completed' ? '✅' : (mSt === 'inprogress' ? '⏳' : '⚪');
                  var typeIcon = m.material_type === 'pdf' ? '📄' : (m.material_type === 'image' ? '🖼️' : (m.material_type === 'code' ? '💻' : '📝'));
                  var displayUrl = m.file_url || m.external_url || '';
                  return `
                    <div class="mat-chip-row">
                      <div class="mat-chip-left" onclick="window.StudyWorkspace.openMaterialViewer('${m.id}')" title="Click to open file viewer">
                        <span>${typeIcon}</span>
                        <span class="mat-chip-title">${_esc(m.title)}</span>
                      </div>
                      <div style="display:flex;align-items:center;gap:4px;">
                        ${displayUrl ? `
                          <a href="${_esc(displayUrl)}" target="_blank" rel="noopener" class="ws-btn-extlink" style="font-size:9.5px;padding:1px 5px;" title="Open link in new tab">
                            🔗
                          </a>
                        ` : ''}
                        <button class="mat-chip-status-btn" onclick="window.StudyWorkspace.cycleMaterialStatus('${m.id}')" title="Click to cycle file status (${mSt})">${mIcon}</button>
                      </div>
                    </div>
                  `;
                }).join('')}
                ${tMats.length > 3 ? `<div style="font-size:10px;color:var(--blue);cursor:pointer;margin-top:2px;" onclick="window.StudyWorkspace.openTopicExplorer('${t.id}')">+ ${tMats.length - 3} more files...</div>` : ''}
              </div>
            </div>
          ` : '';

          return `
            <div class="res-card" data-cat="${dom.id}" data-tags="${_esc((t.title || '') + ' ' + (t.notes || '') + ' ' + (cat.title || ''))}" data-status="${t.status || 'pending'}" style="--c-accent:${dom.color};--c-bg:${dom.color}18;cursor:pointer;" onclick="window.StudyWorkspace.openTopicExplorer('${t.id}')">
              <div class="res-card-top">
                <div class="res-icon" style="background:${dom.color}18;">${dom.icon}</div>
                <div class="res-info">
                  <div class="res-category">${_esc(cat.title)}</div>
                  <div class="res-title">${_esc(t.title)}</div>
                </div>
              </div>
              <div class="res-desc">${_esc(t.notes || 'Click to view notes, attachments & study timer...')}</div>
              
              ${matsChecklistHtml}

              <div class="res-tags">
                <span class="st-badge ${stClass}">${t.status || 'pending'}</span>
                <span class="res-tag">${t.difficulty || 'Intermediate'}</span>
              </div>
              <div class="res-footer">
                <button class="btn-pomo-action" style="font-size:11px;padding:4px 8px;" onclick="event.stopPropagation();window.StudyWorkspace.setPomoTopic('${t.id}');window.StudyWorkspace.togglePomoTimer();" title="Start Focus Session">
                  ⏱️ Focus
                </button>
                <button class="ws-btn-secondary" style="font-size:11px;padding:4px 8px;" onclick="event.stopPropagation();window.StudyWorkspace.cycleTopicStatus('${t.id}')">
                  Cycle Status
                </button>
                <button class="ws-btn-secondary" style="font-size:11px;padding:4px 8px;" onclick="event.stopPropagation();window.StudyWorkspace.openTopicExplorer('${t.id}')">
                  Open ↗
                </button>
              </div>
            </div>
          `;
        }).join('');

        return `
          <div class="ws-module-group">
            <div class="ws-module-header">
              <div class="ws-module-title-left">
                <span style="font-size:14px;color:${dom.color};">📦</span>
                <span class="ws-module-title">${_esc(cat.title)}</span>
                <span class="ws-module-count-badge">${catTopics.length} Topic${catTopics.length!==1?'s':''} · ${catDone} Done</span>
              </div>
              ${_state.canCustomize ? `
                <div class="ws-module-actions" onclick="event.stopPropagation()">
                  <button class="ws-btn-secondary" style="font-size:11px;padding:3px 8px;" onclick="window.StudyWorkspace.openAddTopicModal('${cat.id}')">+ Add Topic</button>
                  <button class="ws-btn-danger" style="font-size:11px;padding:3px 8px;" onclick="window.StudyWorkspace.deleteCategory('${cat.id}')" title="Delete Module">🗑️</button>
                </div>
              ` : ''}
            </div>
            <div class="ws-module-grid">
              ${topicCardsHtml || '<div style="font-size:12px;color:var(--text3);padding:10px;">No topics match the filter. Click "+ Add Topic" to create one.</div>'}
            </div>
          </div>
        `;
      }).join('');

      var isSecCollapsed = true;
      try {
        var stored = localStorage.getItem('lm_lang_sec_collapsed_' + dom.id);
        if (stored === 'false') {
          isSecCollapsed = false;
        }
      } catch (e) {}

      return `
        <section class="lang-section custom-workspace-domain-section" id="lang-section-${dom.id}" data-lang-id="${dom.id}" style="margin-bottom:28px;">
          
          <div class="lang-section-header" onclick="window.toggleLangSection ? window.toggleLangSection(this) : null" role="button" tabindex="0" title="Click to collapse/expand section">
            <div class="lang-section-left">
              <div class="lang-section-icon" style="background:${dom.color}18;color:${dom.color};">${dom.icon}</div>
              <div class="lang-section-info">
                <div class="lang-section-title-row">
                  <h2 class="lang-section-title">${_esc(dom.title)}</h2>
                  <span class="lang-badge" style="background:${dom.color}18;color:${dom.color};">${_esc(dom.badge || 'Custom Track')}</span>
                  ${dateBadgeHtml}
                  <span class="lang-count-badge">${allDomTopics.length} Topic${allDomTopics.length !== 1 ? 's' : ''} · ${doneTopicsCount} Solved</span>
                  <span class="lang-section-arrow" style="${isSecCollapsed ? 'transform:rotate(-90deg)' : ''}">▼</span>
                </div>
                <p class="lang-section-tagline">${_esc(dom.tagline || 'Personal Customizable Learning Domain & Materials')}</p>
              </div>
            </div>
            
            ${_state.canCustomize ? `
              <div class="lang-section-actions" onclick="event.stopPropagation()">
                <button class="ws-btn-secondary" style="font-size:11px;padding:4px 8px;" onclick="window.StudyWorkspace.openAddCategoryModal('${dom.id}')" title="Add a module under this section">➕ Module</button>
                <button class="ws-btn-primary" style="font-size:11px;padding:4px 8px;" onclick="window.StudyWorkspace.openAddTopicModal('${domCats[0]?domCats[0].id:''}')" title="Add new topic">🎯 Topic</button>
                <button class="ws-btn-primary" style="font-size:11px;padding:4px 8px;background:linear-gradient(135deg,#4f8ef7,#8b5cf6);" onclick="window.StudyWorkspace.openQuickUploadModal('${dom.id}')" title="Upload Material">📤 Upload</button>
                <button class="ws-btn-secondary" style="font-size:11px;padding:4px 8px;" onclick="window.StudyWorkspace.openEditDomainModal('${dom.id}')" title="Edit Section Properties">✏️</button>
                <button class="ws-btn-danger" style="font-size:11px;padding:4px 8px;" onclick="window.StudyWorkspace.confirmDeleteDomain('${dom.id}')" title="Delete entire section">🗑️</button>
              </div>
            ` : ''}
          </div>

          <div class="section-modules-wrapper" style="${isSecCollapsed ? 'display:none;' : ''}">
            <div class="custom-section-metrics-row" style="margin-bottom:14px;">
              <div class="metric-mini-card">
                <div class="metric-mini-top">
                  <span>🎯 TOPIC VELOCITY</span>
                  <span class="metric-mini-val">${doneTopicsCount}/${allDomTopics.length} (${topicPct}%)</span>
                </div>
                <div class="metric-progress-track">
                  <div class="metric-progress-fill" style="width:${topicPct}%;background:linear-gradient(90deg,${dom.color},#06d6a0);"></div>
                </div>
              </div>

              <div class="metric-mini-card">
                <div class="metric-mini-top">
                  <span>📂 MATERIALS / FILES PROGRESS</span>
                  <span class="metric-mini-val">${doneMatsCount}/${allDomMats.length} (${matPct}%)</span>
                </div>
                <div class="metric-progress-track">
                  <div class="metric-progress-fill" style="width:${matPct}%;background:linear-gradient(90deg,#8b5cf6,#06d6a0);"></div>
                </div>
              </div>

              <div class="metric-mini-card">
                <div class="metric-mini-top">
                  <span>⏱️ FOCUS TIME LOGGED</span>
                  <span class="metric-mini-val">${totalStudyMins} mins</span>
                </div>
                <div style="font-size:11px;color:var(--teal);margin-top:2px;">🔥 Continuous Learning</div>
              </div>
            </div>

            <div class="section-filter-bar" style="margin-bottom:14px;">
              <div class="section-filter-tabs">
                <button class="sec-tab-btn ${filterState.tab==='all'?'active':''}" onclick="window.StudyWorkspace.handleSectionFilterTab('${dom.id}', 'all')">All (${allDomTopics.length})</button>
                <button class="sec-tab-btn ${filterState.tab==='completed'?'active':''}" onclick="window.StudyWorkspace.handleSectionFilterTab('${dom.id}', 'completed')">✅ Completed (${doneTopicsCount})</button>
                <button class="sec-tab-btn ${filterState.tab==='inprogress'?'active':''}" onclick="window.StudyWorkspace.handleSectionFilterTab('${dom.id}', 'inprogress')">⏳ In Progress</button>
                <button class="sec-tab-btn ${filterState.tab==='pending'?'active':''}" onclick="window.StudyWorkspace.handleSectionFilterTab('${dom.id}', 'pending')">⚪ Pending</button>
                <button class="sec-tab-btn ${filterState.tab==='has_materials'?'active':''}" onclick="window.StudyWorkspace.handleSectionFilterTab('${dom.id}', 'has_materials')">📂 Has Files (${allDomMats.length})</button>
              </div>
              <input type="text" class="section-search-input" placeholder="🔍 Search ${dom.title}..." value="${_esc(filterState.query)}" oninput="window.StudyWorkspace.handleSectionSearch('${dom.id}', this.value)"/>
            </div>

            ${modulesHtml}
          </div>
        </section>
      `;
    }).join('');

    if (document.getElementById('customSectionsWrap')) {
      container.innerHTML = customHtml;
    } else {
      container.insertAdjacentHTML('afterbegin', customHtml);
    }
  }

  // ── 18. PUBLIC API EXPORTS ─────────────────────────────────────────────────
  window.StudyWorkspace = {
    init: init,
    renderAllWidgets: renderAllWidgets,
    renderResumeHero: renderResumeHero,
    renderCustomDomainSections: renderCustomDomainSections,
    setLastActiveTopic: setLastActiveTopic,
    clearLastActiveTopic: clearLastActiveTopic,
    cycleTopicStatus: cycleTopicStatus,
    setTopicStatus: setTopicStatus,
    setMaterialStatus: setMaterialStatus,
    cycleMaterialStatus: cycleMaterialStatus,
    setMaterialProgress: setMaterialProgress,
    updateMaterialNotes: updateMaterialNotes,
    setPomoMode: setPomoMode,
    setPomoTopic: setPomoTopic,
    togglePomoTimer: togglePomoTimer,
    resetPomoTimer: resetPomoTimer,
    toggleMilestone: toggleMilestone,
    openStudio: openStudio,
    toggleStudioView: toggleStudioView,
    switchStudioTab: switchStudioTab,
    renderActiveStudioTab: renderActiveStudioTab,
    saveInpageNewDomain: saveInpageNewDomain,
    handleVaultSearch: handleVaultSearch,
    openWidgetCustomizer: openWidgetCustomizer,
    toggleWidgetVisibility: toggleWidgetVisibility,
    openAddDomainModal: openAddDomainModal,
    saveNewDomain: saveNewDomain,
    openEditDomainModal: openEditDomainModal,
    saveEditDomain: saveEditDomain,
    openAddCategoryModal: openAddCategoryModal,
    saveNewCategory: saveNewCategory,
    deleteCategory: deleteCategory,
    openAddTopicModal: openAddTopicModal,
    saveNewTopic: saveNewTopic,
    openAddMaterialModal: openAddMaterialModal,
    saveNewMaterial: saveNewMaterial,
    openQuickUploadModal: openQuickUploadModal,
    saveQuickUpload: saveQuickUpload,
    handleFileSelected: handleFileSelected,
    handleDropzoneDrop: handleDropzoneDrop,
    handleDropzoneDragOver: handleDropzoneDragOver,
    handleDropzoneDragLeave: handleDropzoneDragLeave,
    uploadFileToStorage: uploadFileToStorage,
    openMaterialViewer: openMaterialViewer,
    openTemplateModal: openTemplateModal,
    importTemplate: importTemplate,
    openGoalModal: openGoalModal,
    saveNewGoal: saveNewGoal,
    openTopicExplorer: openTopicExplorer,
    updateTopicNotes: updateTopicNotes,
    confirmDeleteDomain: confirmDeleteDomain,
    deleteDomain: deleteDomain,
    deleteTopic: deleteTopic,
    deleteMaterial: deleteMaterial,
    handleSectionSearch: handleSectionSearch,
    handleSectionFilterTab: handleSectionFilterTab,
    getState: function () { return _state; }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})(window);
