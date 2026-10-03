/* ══════════════════════════════════════════════════════════════════════════
   StudyCustomWorkspace.js — Personal Learning & Progress Management System
   ─────────────────────────────────────────────────────────────────────────
   Features:
   - Custom Domains, Categories, Topics, Subtopics & Materials CRUD
   - Interactive Modals: Add Language/Domain, Add Module, Add Topic, Add Materials
   - 4-State Status Engine (Pending / In Progress / Completed / On Hold)
   - Multi-Format Material Viewers (PDF Embed, Markdown Notes, Code Runner, Links)
   - Smart "Resume Learning" Engine & Breadcrumbs
   - Pomodoro Focus Timer & Study Time Session Logging
   - Learning Goals & Target Date Milestones Planner
   - Customizable Dashboard Widgets & Layout Persistence
   - Pre-Built Curriculum Roadmap Templates (1-Click Import)
   - Role & Admin Access Gating (Admin vs User Permissions)
   - Supabase ↔ localStorage Two-Way Offline Sync
   ══════════════════════════════════════════════════════════════════════════ */

(function (window) {
  'use strict';

  var STORAGE_KEY = 'lm_study_custom_workspace_v2';
  var PREFS_KEY   = 'lm_study_user_prefs_v2';

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
        if (results[0].data) _state.domains = results[0].data;
        if (results[1].data) _state.categories = results[1].data;
        if (results[2].data) _state.topics = results[2].data;
        if (results[3].data) _state.materials = results[3].data;
        if (results[4].data) _state.goals = results[4].data;
        if (results[5].data) _state.timeLogs = results[5].data;
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
      if (uid) {
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
      if (uid) {
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
    var container = document.getElementById('resumeHeroContainer');
    if (!container) return;

    var last = _state.prefs.last_active_topic;
    if (!last || !_isWidgetVisible('resume')) {
      container.style.display = 'none';
      container.innerHTML = '';
      return;
    }

    container.style.display = 'block';
    var timeAgo = window.StudySync ? window.StudySync.ago(last.timestamp) : 'recently';
    var statusClass = 'st-' + (last.status || 'inprogress');
    var statusLabel = last.status === 'completed' ? '✅ Completed' : last.status === 'onhold' ? '⏸️ On Hold' : '⏳ In Progress';

    container.innerHTML = `
      <div class="resume-hero-banner">
        <div class="resume-card">
          <div class="resume-left">
            <div class="resume-pulse-icon">
              🚀
              <div class="resume-pulse-dot"></div>
            </div>
            <div class="resume-info">
              <div class="resume-eyebrow">
                <span>Resume Learning</span> · <span style="color:var(--text3);font-weight:600;">${_esc(last.domainTitle)}</span>
              </div>
              <div class="resume-title">${_esc(last.title)}</div>
              <div class="resume-meta">
                <span class="st-badge ${statusClass}">${statusLabel}</span>
                <span>Last reviewed ${timeAgo}</span>
              </div>
            </div>
          </div>
          <div class="resume-actions">
            <button class="btn-resume-jump" onclick="window.StudyWorkspace.openTopicExplorer('${last.topicId}')">
              ▶ Resume Now
            </button>
            <button class="btn-resume-dismiss" onclick="window.StudyWorkspace.clearLastActiveTopic()" title="Dismiss">
              ✕
            </button>
          </div>
        </div>
      </div>
    `;
  }

  // ── 4. 4-STATE STATUS CONTROLLER ───────────────────────────────────────────
  var STATUS_FLOW = ['pending', 'inprogress', 'completed', 'onhold'];

  function cycleTopicStatus(topicId) {
    var t = _state.topics.find(function (x) { return x.id === topicId; });
    if (!t) return;

    var curIdx = STATUS_FLOW.indexOf(t.status || 'pending');
    var nextStatus = STATUS_FLOW[(curIdx + 1) % STATUS_FLOW.length];
    setTopicStatus(topicId, nextStatus);
  }

  function setTopicStatus(topicId, status) {
    var t = _state.topics.find(function (x) { return x.id === topicId; });
    if (!t) return;

    t.status = status;
    t.status_changed_at = new Date().toISOString();
    t.updated_at = new Date().toISOString();

    _saveLocal();
    _getUid().then(function (uid) {
      if (uid) {
        _supabase.from('study_custom_topics').update({
          status: status,
          status_changed_at: t.status_changed_at,
          updated_at: t.updated_at
        }).eq('id', topicId).then(function () {});
      }
    });

    if (window.LMToast) {
      var label = status === 'completed' ? '✅ Marked Completed' : status === 'inprogress' ? '⏳ Set to In Progress' : status === 'onhold' ? '⏸️ Set On Hold' : '⚪ Reset to Pending';
      window.LMToast.show(label);
    }

    renderAllWidgets();
  }

  // ── 5. FOCUS POMODORO & TIME TRACKER ───────────────────────────────────────
  function initPomodoroWidget() {
    var container = document.getElementById('pomodoroWidgetContainer');
    if (!container) return;

    if (!_isWidgetVisible('timer')) {
      container.style.display = 'none';
      return;
    }

    container.style.display = 'block';
    _updatePomodoroUI();
  }

  function _updatePomodoroUI() {
    var container = document.getElementById('pomodoroWidgetContainer');
    if (!container) return;

    var mins = Math.floor(_pomoTimer.timeLeft / 60);
    var secs = _pomoTimer.timeLeft % 60;
    var timeStr = String(mins).padStart(2, '0') + ':' + String(secs).padStart(2, '0');

    var topicsOptions = '<option value="">-- General Focus Sprint --</option>';
    _state.topics.forEach(function (t) {
      var sel = (_pomoTimer.activeTopicId === t.id) ? 'selected' : '';
      topicsOptions += `<option value="${t.id}" ${sel}>${_esc(t.title)} (${t.status})</option>`;
    });

    container.innerHTML = `
      <div class="pomodoro-widget-card">
        <div class="pomo-left">
          <div class="pomo-clock-circle">
            <div class="pomo-time-display">${timeStr}</div>
            <div class="pomo-mode-label">${_pomoTimer.mode}</div>
          </div>
          <div class="pomo-controls">
            <div class="pomo-modes">
              <button class="pomo-mode-btn ${_pomoTimer.mode==='pomodoro'?'active':''}" onclick="window.StudyWorkspace.setPomoMode('pomodoro')">25m Focus</button>
              <button class="pomo-mode-btn ${_pomoTimer.mode==='short'?'active':''}" onclick="window.StudyWorkspace.setPomoMode('short')">5m Rest</button>
              <button class="pomo-mode-btn ${_pomoTimer.mode==='long'?'active':''}" onclick="window.StudyWorkspace.setPomoMode('long')">15m Break</button>
              <button class="pomo-mode-btn ${_pomoTimer.mode==='stopwatch'?'active':''}" onclick="window.StudyWorkspace.setPomoMode('stopwatch')">⏱️ Stopwatch</button>
            </div>
            <div class="pomo-buttons">
              <button class="btn-pomo-action" onclick="window.StudyWorkspace.togglePomoTimer()">
                ${_pomoTimer.running ? '⏸️ Pause' : '▶ Start Focus'}
              </button>
              <button class="btn-pomo-reset" onclick="window.StudyWorkspace.resetPomoTimer()">↺ Reset</button>
            </div>
          </div>
        </div>
        <div class="pomo-topic-selector">
          <div class="pomo-select-label">🎯 Focus Topic to Log Duration</div>
          <select class="pomo-topic-dropdown" onchange="window.StudyWorkspace.setPomoTopic(this.value)">
            ${topicsOptions}
          </select>
        </div>
      </div>
    `;
  }

  function setPomoMode(mode) {
    _pomoTimer.mode = mode;
    _pomoTimer.running = false;
    clearInterval(_pomoTimer.interval);
    _pomoTimer.timeLeft = _pomoTimer.durations[mode] || 0;
    _updatePomodoroUI();
  }

  function setPomoTopic(topicId) {
    _pomoTimer.activeTopicId = topicId || null;
  }

  function togglePomoTimer() {
    if (_pomoTimer.running) {
      _pomoTimer.running = false;
      clearInterval(_pomoTimer.interval);
      _updatePomodoroUI();
    } else {
      _pomoTimer.running = true;
      _pomoTimer.sessionStart = Date.now();
      _pomoTimer.interval = setInterval(function () {
        if (_pomoTimer.mode === 'stopwatch') {
          _pomoTimer.timeLeft++;
        } else {
          _pomoTimer.timeLeft--;
          if (_pomoTimer.timeLeft <= 0) {
            clearInterval(_pomoTimer.interval);
            _pomoTimer.running = false;
            _logStudySession(_pomoTimer.durations[_pomoTimer.mode]);
            if (window.LMToast) window.LMToast.show('🎉 Focus session completed! Great work.');
            if (window.Haptic) window.Haptic.success();
            setPomoMode('short');
            return;
          }
        }
        _updatePomodoroUI();
      }, 1000);
      _updatePomodoroUI();
    }
  }

  function resetPomoTimer() {
    _pomoTimer.running = false;
    clearInterval(_pomoTimer.interval);
    _pomoTimer.timeLeft = _pomoTimer.durations[_pomoTimer.mode] || 0;
    _updatePomodoroUI();
  }

  function _logStudySession(durationSecs) {
    var topic = _state.topics.find(function (t) { return t.id === _pomoTimer.activeTopicId; });
    var logItem = {
      id: 'log_' + Date.now(),
      topic_id: topic ? topic.id : null,
      topic_title: topic ? topic.title : 'General Focus Sprint',
      duration_seconds: durationSecs || 1500,
      session_type: _pomoTimer.mode,
      notes: '',
      logged_at: new Date().toISOString()
    };

    _state.timeLogs.unshift(logItem);
    _saveLocal();

    _getUid().then(function (uid) {
      if (uid) {
        _supabase.from('study_time_logs').insert(Object.assign({ user_id: uid }, logItem)).then(function () {});
      }
    });
  }

  // ── 6. LEARNING GOALS & MILESTONES ─────────────────────────────────────────
  function renderGoalsWidget() {
    var container = document.getElementById('goalsWidgetContainer');
    if (!container) return;

    if (!_isWidgetVisible('milestones') || !_state.goals || _state.goals.length === 0) {
      container.style.display = 'none';
      return;
    }

    container.style.display = 'block';
    var goalsHtml = _state.goals.map(function (g) {
      var totalM = (g.milestones || []).length;
      var doneM = (g.milestones || []).filter(function (m) { return m.completed; }).length;
      var pct = totalM > 0 ? Math.round((doneM / totalM) * 100) : 0;
      var daysLeft = g.target_date ? Math.ceil((new Date(g.target_date) - new Date()) / (1000 * 60 * 60 * 24)) : null;
      var countdown = daysLeft !== null ? (daysLeft > 0 ? '⏳ ' + daysLeft + 'd left' : '⚠️ Due') : '🎯 Active';

      return `
        <div class="goal-item-card">
          <div class="goal-top-row">
            <div class="goal-name">${_esc(g.title)}</div>
            <span class="goal-target-countdown">${countdown}</span>
          </div>
          <div class="goal-progress-bar">
            <div class="goal-progress-fill" style="width:${pct}%"></div>
          </div>
          <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--text3);">
            <span>${doneM}/${totalM} milestones completed</span>
            <strong style="color:var(--teal);">${pct}%</strong>
          </div>
          <div class="goal-milestones-list">
            ${(g.milestones || []).slice(0, 3).map(function (m, idx) {
              return `
                <div class="milestone-row ${m.completed ? 'completed' : ''}" onclick="window.StudyWorkspace.toggleMilestone('${g.id}', ${idx})" style="cursor:pointer;">
                  <span>${m.completed ? '☑' : '☐'}</span>
                  <span>${_esc(m.title)}</span>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `;
    }).join('');

    container.innerHTML = `
      <div class="goals-widget-card">
        <div class="goals-header">
          <div class="goals-title">🎯 Learning Goals &amp; Target Milestones</div>
          ${_state.canCustomize ? `<button class="ws-btn-secondary" onclick="window.StudyWorkspace.openGoalModal()" style="font-size:11px;padding:4px 10px;">+ New Goal</button>` : ''}
        </div>
        <div class="goals-grid">
          ${goalsHtml}
        </div>
      </div>
    `;
  }

  function toggleMilestone(goalId, index) {
    var g = _state.goals.find(function (x) { return x.id === goalId; });
    if (!g || !g.milestones || !g.milestones[index]) return;

    g.milestones[index].completed = !g.milestones[index].completed;
    _saveLocal();

    _getUid().then(function (uid) {
      if (uid) {
        _supabase.from('study_learning_goals').update({
          milestones: g.milestones,
          updated_at: new Date().toISOString()
        }).eq('id', goalId).then(function () {});
      }
    });

    renderGoalsWidget();
  }

  // ── 7. ADD DOMAIN / SECTION MODAL ──────────────────────────────────────────
  function openAddDomainModal() {
    var existing = document.getElementById('addDomainModal');
    if (existing) existing.remove();

    var modal = document.createElement('div');
    modal.id = 'addDomainModal';
    modal.className = 'ws-modal-overlay';

    modal.innerHTML = `
      <div class="ws-modal-dialog">
        <div class="ws-modal-header">
          <div class="ws-modal-title">
            <span>✨</span> Create New Learning Language / Section
          </div>
          <button class="ws-modal-close" onclick="document.getElementById('addDomainModal')?.remove()">✕</button>
        </div>
        <div class="ws-modal-body">
          <div class="ws-form-group">
            <label class="ws-form-label">Language / Domain Title</label>
            <input type="text" id="domTitleInput" class="ws-form-input" placeholder="e.g. Python Ecosystem, Golang Microservices, AWS Solutions Architect..." required autofocus/>
          </div>

          <div class="ws-form-row">
            <div class="ws-form-group">
              <label class="ws-form-label">Icon / Emoji</label>
              <input type="text" id="domIconInput" class="ws-form-input" value="📘" maxlength="4"/>
            </div>
            <div class="ws-form-group">
              <label class="ws-form-label">Accent Theme Color</label>
              <select id="domColorInput" class="ws-form-select">
                <option value="#38bdf8" selected>🔵 Blue (#38bdf8)</option>
                <option value="#f59e0b">🟡 Amber Gold (#f59e0b)</option>
                <option value="#06d6a0">🟢 Emerald Teal (#06d6a0)</option>
                <option value="#8b5cf6">🟣 Purple Violet (#8b5cf6)</option>
                <option value="#ec4899">🌸 Rose Pink (#ec4899)</option>
                <option value="#22d3ee">🌊 Cyan (#22d3ee)</option>
              </select>
            </div>
          </div>

          <div class="ws-form-row">
            <div class="ws-form-group">
              <label class="ws-form-label">Track Badge</label>
              <input type="text" id="domBadgeInput" class="ws-form-input" placeholder="e.g. Backend Track, Cloud Cert, Senior Level" value="Custom Track"/>
            </div>
            <div class="ws-form-group">
              <label class="ws-form-label">Target Completion Date (Optional)</label>
              <input type="date" id="domDateInput" class="ws-form-input"/>
            </div>
          </div>

          <div class="ws-form-group">
            <label class="ws-form-label">Tagline &amp; Description</label>
            <textarea id="domTaglineInput" class="ws-form-textarea" rows="2" placeholder="Brief summary of skills, frameworks, and topics covered..."></textarea>
          </div>
        </div>
        <div class="ws-modal-footer">
          <button class="ws-btn-primary" onclick="window.StudyWorkspace.saveNewDomain()">
            💾 Create Language Section
          </button>
          <button class="ws-btn-secondary" onclick="document.getElementById('addDomainModal')?.remove()">Cancel</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
  }

  function saveNewDomain() {
    var title = document.getElementById('domTitleInput')?.value.trim();
    if (!title) {
      if (window.LMToast) window.LMToast.show('⚠️ Please enter a language or section title');
      return;
    }

    var icon = document.getElementById('domIconInput')?.value.trim() || '📘';
    var color = document.getElementById('domColorInput')?.value || '#38bdf8';
    var badge = document.getElementById('domBadgeInput')?.value.trim() || 'Custom Track';
    var date = document.getElementById('domDateInput')?.value || null;
    var tagline = document.getElementById('domTaglineInput')?.value.trim() || '';

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

    // Auto create default module
    var catId = 'cat_' + Date.now();
    _state.categories.push({
      id: catId,
      domain_id: domainId,
      title: 'Core Fundamentals & Topics',
      order_index: 0
    });

    _state.topics.push({
      id: 'top_' + Date.now(),
      category_id: catId,
      title: title + ' - Fundamentals & Core Concepts',
      status: 'pending',
      difficulty: 'Beginner',
      priority: 'High',
      order_index: 0
    });

    _saveLocal();

    _getUid().then(function (uid) {
      if (uid) {
        _supabase.from('study_custom_domains').insert(Object.assign({ user_id: uid }, newDomain)).then(function () {});
      }
    });

    document.getElementById('addDomainModal')?.remove();
    if (window.LMToast) window.LMToast.show('✅ New section created: ' + title);
    renderAllWidgets();
  }

  // ── 8. ADD CATEGORY & TOPIC MODALS ─────────────────────────────────────────
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
      if (uid) {
        _supabase.from('study_custom_topics').insert(Object.assign({ user_id: uid }, newTop)).then(function () {});
      }
    });

    document.getElementById('addTopicModal')?.remove();
    if (window.LMToast) window.LMToast.show('✅ Topic added: ' + title);
    renderAllWidgets();
  }

  // ── 9. ADD MATERIAL MODAL ──────────────────────────────────────────────────
  function openAddMaterialModal(topicId) {
    var existing = document.getElementById('addMaterialModal');
    if (existing) existing.remove();

    var modal = document.createElement('div');
    modal.id = 'addMaterialModal';
    modal.className = 'ws-modal-overlay';

    modal.innerHTML = `
      <div class="ws-modal-dialog">
        <div class="ws-modal-header">
          <div class="ws-modal-title">
            <span>📎</span> Attach Study Material
          </div>
          <button class="ws-modal-close" onclick="document.getElementById('addMaterialModal')?.remove()">✕</button>
        </div>
        <div class="ws-modal-body">
          <div class="ws-form-group">
            <label class="ws-form-label">Material Title</label>
            <input type="text" id="matTitleInput" class="ws-form-input" placeholder="e.g. Official Documentation Cheat Sheet, Architecture PDF, Solution Snippet..." required/>
          </div>

          <div class="ws-form-group">
            <label class="ws-form-label">Material Type</label>
            <select id="matTypeInput" class="ws-form-select">
              <option value="note">📝 Rich Markdown Note / Summary</option>
              <option value="code">💻 Code Snippet / Playground</option>
              <option value="link">🔗 Documentation / Web URL</option>
              <option value="video">🎥 YouTube / Video Walkthrough</option>
              <option value="pdf">📄 PDF / Document Link</option>
            </select>
          </div>

          <div class="ws-form-group">
            <label class="ws-form-label">External URL / Document Link (Optional)</label>
            <input type="url" id="matUrlInput" class="ws-form-input" placeholder="https://..."/>
          </div>

          <div class="ws-form-group">
            <label class="ws-form-label">Note Content / Code Body</label>
            <textarea id="matContentInput" class="ws-form-textarea" rows="5" placeholder="Write markdown content or paste code snippets here..."></textarea>
          </div>
        </div>
        <div class="ws-modal-footer">
          <button class="ws-btn-primary" onclick="window.StudyWorkspace.saveNewMaterial('${topicId}')">
            💾 Attach Material
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
    var url = document.getElementById('matUrlInput')?.value.trim() || '';
    var content = document.getElementById('matContentInput')?.value || '';

    var newMat = {
      id: 'mat_' + Date.now(),
      topic_id: topicId,
      title: title,
      material_type: type,
      external_url: url,
      content: content,
      created_at: new Date().toISOString()
    };

    _state.materials.unshift(newMat);
    _saveLocal();

    _getUid().then(function (uid) {
      if (uid) {
        _supabase.from('study_materials').insert(Object.assign({ user_id: uid }, newMat)).then(function () {});
      }
    });

    document.getElementById('addMaterialModal')?.remove();
    if (window.LMToast) window.LMToast.show('✅ Material attached!');
    openTopicExplorer(topicId);
  }

  function openMaterialViewer(materialId) {
    var mat = _state.materials.find(function (m) { return m.id === materialId; });
    if (!mat) return;

    var existing = document.getElementById('materialViewerModal');
    if (existing) existing.remove();

    var modal = document.createElement('div');
    modal.id = 'materialViewerModal';
    modal.className = 'ws-modal-overlay';

    var bodyHtml = '';
    if (mat.material_type === 'pdf' && mat.external_url) {
      bodyHtml = `
        <div style="height:480px;background:#000;border-radius:8px;overflow:hidden;">
          <iframe src="${_esc(mat.external_url)}" style="width:100%;height:100%;border:none;"></iframe>
        </div>
      `;
    } else if (mat.material_type === 'code') {
      bodyHtml = `
        <pre style="background:#0f172a;padding:16px;border-radius:10px;color:#38bdf8;font-family:'JetBrains Mono',monospace;font-size:13px;overflow-x:auto;max-height:450px;line-height:1.6;"><code>${_esc(mat.content)}</code></pre>
      `;
    } else if (mat.material_type === 'link' || mat.material_type === 'video') {
      bodyHtml = `
        <div style="padding:16px;background:rgba(255,255,255,0.03);border-radius:10px;">
          <p style="font-size:13px;color:var(--text);margin-bottom:12px;">${_esc(mat.content || mat.title)}</p>
          <a href="${_esc(mat.external_url)}" target="_blank" rel="noopener" class="ws-btn-primary" style="text-decoration:none;display:inline-flex;">
            🔗 Open Link in New Tab ↗
          </a>
        </div>
      `;
    } else {
      bodyHtml = `
        <div style="font-size:13px;color:var(--text);line-height:1.7;white-space:pre-wrap;background:rgba(255,255,255,0.02);padding:16px;border-radius:10px;">${_esc(mat.content)}</div>
      `;
    }

    modal.innerHTML = `
      <div class="ws-modal-dialog wide">
        <div class="ws-modal-header">
          <div class="ws-modal-title">
            <span class="material-type-tag ${mat.material_type}">${mat.material_type}</span>
            <span>${_esc(mat.title)}</span>
          </div>
          <button class="ws-modal-close" onclick="document.getElementById('materialViewerModal')?.remove()">✕</button>
        </div>
        <div class="ws-modal-body">
          ${bodyHtml}
        </div>
        <div class="ws-modal-footer">
          <button class="ws-btn-secondary" onclick="document.getElementById('materialViewerModal')?.remove()">Close</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
  }

  // ── 10. WIDGET CUSTOMIZER DRAWER ───────────────────────────────────────────
  function _isWidgetVisible(widgetKey) {
    return (_state.prefs.active_widgets || []).indexOf(widgetKey) !== -1;
  }

  function openWidgetCustomizer() {
    var existing = document.getElementById('widgetCustomizerDrawer');
    if (existing) existing.remove();

    var allWidgets = [
      { key: 'resume', title: '🚀 Resume Learning Hero', icon: '🚀' },
      { key: 'overall', title: '📊 Overall Velocity & Rings', icon: '📊' },
      { key: 'milestones', title: '🎯 Milestones & Goals', icon: '🎯' },
      { key: 'timer', title: '⏱️ Focus Pomodoro Timer', icon: '⏱️' },
      { key: 'heatmap', title: '🔥 365-Day Activity Heatmap', icon: '🔥' },
      { key: 'domains', title: '🌐 Custom & Curated Tracks', icon: '🌐' },
      { key: 'weak_topics', title: '🧠 Spaced Repetition Weak Topics', icon: '🧠' },
      { key: 'quiz_history', title: '📝 Practice Assessment History', icon: '📝' }
    ];

    var drawer = document.createElement('div');
    drawer.id = 'widgetCustomizerDrawer';
    drawer.className = 'widget-drawer-panel open';

    var rows = allWidgets.map(function (w) {
      var isChecked = _isWidgetVisible(w.key) ? 'checked' : '';
      return `
        <div class="widget-toggle-item">
          <div class="widget-toggle-info">
            <span class="widget-toggle-icon">${w.icon}</span>
            <span class="widget-toggle-title">${w.title}</span>
          </div>
          <label class="ws-switch">
            <input type="checkbox" data-widget-key="${w.key}" ${isChecked} onchange="window.StudyWorkspace.toggleWidgetVisibility('${w.key}', this.checked)">
            <span class="ws-slider"></span>
          </label>
        </div>
      `;
    }).join('');

    drawer.innerHTML = `
      <div class="drawer-header">
        <div style="font-family:'Syne',sans-serif;font-size:15px;font-weight:700;color:var(--text);">⚙️ Customize Workspace &amp; Dashboard</div>
        <button class="ws-modal-close" onclick="document.getElementById('widgetCustomizerDrawer')?.remove()">✕</button>
      </div>
      <div class="drawer-body">
        <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:20px;">
          <button class="ws-btn-primary" onclick="window.StudyWorkspace.openAddDomainModal();document.getElementById('widgetCustomizerDrawer')?.remove();" style="width:100%;justify-content:center;">
            ➕ Add New Language / Section
          </button>
          <button class="ws-btn-secondary" onclick="window.StudyWorkspace.openTemplateModal();document.getElementById('widgetCustomizerDrawer')?.remove();" style="width:100%;justify-content:center;">
            📦 Import Curriculum Blueprint
          </button>
          <button class="ws-btn-secondary" onclick="window.StudyWorkspace.openGoalModal();document.getElementById('widgetCustomizerDrawer')?.remove();" style="width:100%;justify-content:center;">
            🎯 Set Learning Goal &amp; Milestones
          </button>
        </div>

        <div style="font-size:11px;font-weight:700;text-transform:uppercase;color:var(--text3);margin-bottom:10px;letter-spacing:.05em;">Dashboard Widget Visibility</div>
        ${rows}
      </div>
    `;

    document.body.appendChild(drawer);
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
      if (uid) {
        _supabase.from('study_user_preferences').upsert({
          user_id: uid,
          active_widgets: list,
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id' }).then(function () {});
      }
    });

    renderAllWidgets();
  }

  // ── 11. PRE-BUILT ROADMAP TEMPLATES ────────────────────────────────────────
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
    var existing = document.getElementById('templateModal');
    if (existing) existing.remove();

    var modal = document.createElement('div');
    modal.id = 'templateModal';
    modal.className = 'ws-modal-overlay';

    var tplCards = TEMPLATES.map(function (tpl) {
      return `
        <div style="background:rgba(255,255,255,0.02);border:1px solid var(--border,#262f45);border-radius:12px;padding:16px;margin-bottom:12px;display:flex;align-items:center;justify-content:space-between;gap:14px;flex-wrap:wrap;">
          <div style="display:flex;align-items:center;gap:12px;min-width:0;flex:1;">
            <div style="width:40px;height:40px;border-radius:10px;background:${tpl.color}18;color:${tpl.color};display:grid;place-items:center;font-size:20px;flex-shrink:0;">${tpl.icon}</div>
            <div>
              <div style="font-size:14px;font-weight:700;color:var(--text);">${tpl.title}</div>
              <div style="font-size:11.5px;color:var(--text3);margin-top:2px;">${tpl.tagline}</div>
            </div>
          </div>
          <button class="ws-btn-primary" onclick="window.StudyWorkspace.importTemplate('${tpl.id}');document.getElementById('templateModal')?.remove();">
            📥 Import 1-Click
          </button>
        </div>
      `;
    }).join('');

    modal.innerHTML = `
      <div class="ws-modal-dialog">
        <div class="ws-modal-header">
          <div class="ws-modal-title">
            <span>📦</span> Ready-to-Learn Curriculum Blueprints
          </div>
          <button class="ws-modal-close" onclick="document.getElementById('templateModal')?.remove()">✕</button>
        </div>
        <div class="ws-modal-body">
          <p style="font-size:12px;color:var(--text3);margin-bottom:16px;">
            Choose a curated industry roadmap to instantly populate your workspace with structured modules, topics, and interview questions.
          </p>
          ${tplCards}
        </div>
      </div>
    `;

    document.body.appendChild(modal);
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
      if (uid) {
        _supabase.from('study_custom_domains').insert(Object.assign({ user_id: uid }, newDomain)).then(function () {});
      }
    });

    if (window.LMToast) window.LMToast.show('🎉 Imported roadmap: ' + tpl.title);
    renderAllWidgets();
  }

  // ── 12. GOAL MODAL ─────────────────────────────────────────────────────────
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
      if (uid) {
        _supabase.from('study_learning_goals').insert(Object.assign({ user_id: uid }, newGoal)).then(function () {});
      }
    });

    document.getElementById('addGoalModal')?.remove();
    if (window.LMToast) window.LMToast.show('✅ Goal created: ' + title);
    renderAllWidgets();
  }

  // ── 13. TOPIC EXPLORER & DETAIL MODAL ──────────────────────────────────────
  function openTopicExplorer(topicId) {
    var t = _state.topics.find(function (x) { return x.id === topicId; });
    if (!t) return;

    var cat = _state.categories.find(function (c) { return c.id === t.category_id; });
    var dom = cat ? _state.domains.find(function (d) { return d.id === cat.domain_id; }) : null;
    var mats = _state.materials.filter(function (m) { return m.topic_id === t.id; });

    setLastActiveTopic({
      id: t.id,
      title: t.title,
      domainId: dom ? dom.id : null,
      domainTitle: dom ? dom.title : 'Study Module',
      status: t.status
    });

    var existing = document.getElementById('topicExplorerModal');
    if (existing) existing.remove();

    var modal = document.createElement('div');
    modal.id = 'topicExplorerModal';
    modal.className = 'ws-modal-overlay';

    var statusOptions = STATUS_FLOW.map(function (s) {
      return `<option value="${s}" ${t.status === s ? 'selected' : ''}>${s.toUpperCase()}</option>`;
    }).join('');

    var matsHtml = mats.length > 0 ? mats.map(function (m) {
      return `
        <div class="material-card" onclick="window.StudyWorkspace.openMaterialViewer('${m.id}')">
          <div class="material-top">
            <span class="material-type-tag ${m.material_type}">${m.material_type}</span>
            <span style="font-size:11px;color:var(--text3);">${m.file_size_bytes ? Math.round(m.file_size_bytes/1024) + ' KB' : 'Document'}</span>
          </div>
          <div class="material-title">${_esc(m.title)}</div>
        </div>
      `;
    }).join('') : '<div style="color:var(--text3);font-size:12px;padding:12px;background:rgba(255,255,255,0.02);border-radius:8px;">No attached materials yet. Click "+ Add Material" to upload a PDF or note.</div>';

    modal.innerHTML = `
      <div class="ws-modal-dialog wide">
        <div class="ws-modal-header">
          <div class="ws-modal-title">
            <span>📖</span> ${_esc(t.title)}
          </div>
          <button class="ws-modal-close" onclick="document.getElementById('topicExplorerModal')?.remove()">✕</button>
        </div>
        <div class="ws-modal-body">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;flex-wrap:wrap;gap:10px;">
            <div style="font-size:12px;color:var(--text3);">
              Track: <strong style="color:var(--blue);">${_esc(dom ? dom.title : 'Custom Workspace')}</strong> · Module: <strong>${_esc(cat ? cat.title : 'General')}</strong>
            </div>
            <div style="display:flex;align-items:center;gap:8px;">
              <span style="font-size:12px;color:var(--text2);font-weight:600;">Status:</span>
              <select class="ws-form-select" style="width:auto;padding:4px 10px;font-size:12px;" onchange="window.StudyWorkspace.setTopicStatus('${t.id}', this.value)">
                ${statusOptions}
              </select>
            </div>
          </div>

          <div style="margin-bottom:20px;">
            <label class="ws-form-label">📝 Personal Study Notes &amp; Key Takeaways</label>
            <textarea class="ws-form-textarea" rows="4" placeholder="Add your summary, syntax tricks, edge cases, and personal takeaways..." onchange="window.StudyWorkspace.updateTopicNotes('${t.id}', this.value)">${_esc(t.notes || '')}</textarea>
          </div>

          <div>
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
              <label class="ws-form-label" style="margin:0;">📚 Study Materials &amp; Attachments</label>
              ${_state.canCustomize ? `<button class="ws-btn-secondary" style="font-size:11px;padding:3px 8px;" onclick="window.StudyWorkspace.openAddMaterialModal('${t.id}')">+ Add Material</button>` : ''}
            </div>
            <div class="materials-grid">
              ${matsHtml}
            </div>
          </div>
        </div>
        <div class="ws-modal-footer">
          <button class="btn-pomo-action" onclick="window.StudyWorkspace.setPomoTopic('${t.id}');window.StudyWorkspace.togglePomoTimer();document.getElementById('topicExplorerModal')?.remove();">
            ⏱️ Start Focus Session
          </button>
          <button class="ws-btn-secondary" onclick="document.getElementById('topicExplorerModal')?.remove()">Close</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
  }

  function updateTopicNotes(topicId, notes) {
    var t = _state.topics.find(function (x) { return x.id === topicId; });
    if (!t) return;
    t.notes = notes;
    _saveLocal();
    _getUid().then(function (uid) {
      if (uid) {
        _supabase.from('study_custom_topics').update({ notes: notes, updated_at: new Date().toISOString() }).eq('id', topicId).then(function () {});
      }
    });
  }

  // ── 14. RENDER ALL WIDGETS & CUSTOM SECTIONS ───────────────────────────────
  function renderAllWidgets() {
    renderResumeHero();
    initPomodoroWidget();
    renderGoalsWidget();
    renderCustomDomainSections();
  }

  function renderCustomDomainSections() {
    var container = document.getElementById('languageSectionsWrap');
    if (!container) return;

    var existingCustom = document.querySelectorAll('.custom-workspace-domain-section');
    existingCustom.forEach(function (el) { el.remove(); });

    if (!_state.domains || _state.domains.length === 0) return;

    var customHtml = _state.domains.map(function (dom) {
      var domCats = _state.categories.filter(function (c) { return c.domain_id === dom.id; });
      var domTopics = [];
      domCats.forEach(function (c) {
        var cTops = _state.topics.filter(function (t) { return t.category_id === c.id; });
        domTopics = domTopics.concat(cTops);
      });

      var doneCount = domTopics.filter(function (t) { return t.status === 'completed'; }).length;
      var inprogCount = domTopics.filter(function (t) { return t.status === 'inprogress'; }).length;
      var pct = domTopics.length > 0 ? Math.round((doneCount / domTopics.length) * 100) : 0;

      var topicsListHtml = domTopics.map(function (t) {
        var matsCount = _state.materials.filter(function (m) { return m.topic_id === t.id; }).length;
        var stClass = 'st-' + (t.status || 'pending');
        return `
          <div class="res-card" style="--c-accent:${dom.color};--c-bg:${dom.color}18;cursor:pointer;" onclick="window.StudyWorkspace.openTopicExplorer('${t.id}')">
            <div class="res-card-top">
              <div class="res-icon" style="background:${dom.color}18;">${dom.icon}</div>
              <div class="res-info">
                <div class="res-category">${dom.badge || 'Topic'}</div>
                <div class="res-title">${_esc(t.title)}</div>
              </div>
            </div>
            <div class="res-desc">${_esc(t.notes || 'Click to view notes, attachments & study timer...')}</div>
            <div class="res-tags">
              <span class="st-badge ${stClass}">${t.status || 'pending'}</span>
              <span class="res-tag">${t.difficulty || 'Intermediate'}</span>
              ${matsCount > 0 ? `<span class="res-notes-badge">📎 ${matsCount} material${matsCount>1?'s':''}</span>` : ''}
            </div>
            <div class="res-footer">
              <button class="btn-pomo-action" style="font-size:11px;padding:4px 10px;" onclick="event.stopPropagation();window.StudyWorkspace.cycleTopicStatus('${t.id}')">
                Cycle Status
              </button>
              <button class="ws-btn-secondary" style="font-size:11px;padding:4px 10px;" onclick="event.stopPropagation();window.StudyWorkspace.openTopicExplorer('${t.id}')">
                Open ↗
              </button>
            </div>
          </div>
        `;
      }).join('');

      var isSecCollapsed = false;
      try {
        isSecCollapsed = localStorage.getItem('lm_lang_sec_collapsed_' + dom.id) === 'true';
      } catch(e){}

      return `
        <section class="lang-section custom-workspace-domain-section" id="lang-section-${dom.id}" data-lang-id="${dom.id}">
          <div class="lang-section-header" onclick="window.toggleLangSection ? window.toggleLangSection(this) : null" role="button" tabindex="0" title="Click to collapse/expand section">
            <div class="lang-section-left">
              <div class="lang-section-icon" style="background:${dom.color}18;color:${dom.color};">${dom.icon}</div>
              <div class="lang-section-info">
                <div class="lang-section-title-row">
                  <h2 class="lang-section-title">${_esc(dom.title)}</h2>
                  <span class="lang-badge" style="background:${dom.color}18;color:${dom.color};">${_esc(dom.badge)}</span>
                  <span class="lang-count-badge">${domTopics.length} Topic${domTopics.length!==1?'s':''} · ${doneCount} Done (${pct}%)</span>
                  <span class="lang-section-arrow" style="${isSecCollapsed ? 'transform:rotate(-90deg)' : ''}">▼</span>
                </div>
                <p class="lang-section-tagline">${_esc(dom.tagline || 'Custom Personal Learning Workspace')}</p>
              </div>
            </div>
            ${_state.canCustomize ? `
              <div style="display:flex;gap:6px;" onclick="event.stopPropagation()">
                <button class="ws-btn-secondary" style="font-size:11px;padding:4px 8px;" onclick="event.stopPropagation();window.StudyWorkspace.openAddTopicModal('${domCats[0]?domCats[0].id:''}')">+ Add Topic</button>
              </div>
            ` : ''}
          </div>
          <div class="resource-grid" style="${isSecCollapsed ? 'display:none;' : ''}">
            ${topicsListHtml}
          </div>
        </section>
      `;
    }).join('');

    container.insertAdjacentHTML('beforeend', customHtml);
  }

  // ── Public API ──
  window.StudyWorkspace = {
    init: init,
    renderAllWidgets: renderAllWidgets,
    renderResumeHero: renderResumeHero,
    renderCustomDomainSections: renderCustomDomainSections,
    setLastActiveTopic: setLastActiveTopic,
    clearLastActiveTopic: clearLastActiveTopic,
    cycleTopicStatus: cycleTopicStatus,
    setTopicStatus: setTopicStatus,
    setPomoMode: setPomoMode,
    setPomoTopic: setPomoTopic,
    togglePomoTimer: togglePomoTimer,
    resetPomoTimer: resetPomoTimer,
    toggleMilestone: toggleMilestone,
    openWidgetCustomizer: openWidgetCustomizer,
    toggleWidgetVisibility: toggleWidgetVisibility,
    openAddDomainModal: openAddDomainModal,
    saveNewDomain: saveNewDomain,
    openAddTopicModal: openAddTopicModal,
    saveNewTopic: saveNewTopic,
    openAddMaterialModal: openAddMaterialModal,
    saveNewMaterial: saveNewMaterial,
    openMaterialViewer: openMaterialViewer,
    openTemplateModal: openTemplateModal,
    importTemplate: importTemplate,
    openGoalModal: openGoalModal,
    saveNewGoal: saveNewGoal,
    openTopicExplorer: openTopicExplorer,
    updateTopicNotes: updateTopicNotes,
    getState: function () { return _state; }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})(window);
