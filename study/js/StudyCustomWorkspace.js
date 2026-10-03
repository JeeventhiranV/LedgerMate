/* ══════════════════════════════════════════════════════════════════════════
   StudyCustomWorkspace.js — Personal Learning & Progress Management System
   ─────────────────────────────────────────────────────────────────────────
   Features:
   - Custom Domains, Categories, Topics, Subtopics & Materials CRUD
   - Manual File Uploads directly to Supabase Storage Buckets ('study-materials')
   - Complete Cascaded Deletion for Sections, Modules, Topics, and Materials
   - Interactive Modals: Add Language/Domain, Add Module, Add Topic, Add Materials
   - 4-State Status Engine (Pending / In Progress / Completed / On Hold)
   - Multi-Format Material Viewers (PDF Embed, Image, Markdown Notes, Code, Links)
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

  // ── 5. POMODORO FOCUS TIMER ENGINE ────────────────────────────────────────
  function initPomodoroWidget() {
    var wrap = document.getElementById('pomodoroWidgetWrap');
    if (!wrap) return;

    if (!_isWidgetVisible('timer')) {
      wrap.innerHTML = '';
      wrap.style.display = 'none';
      return;
    }

    wrap.style.display = 'block';
    _updatePomodoroUI();
  }

  function _updatePomodoroUI() {
    var wrap = document.getElementById('pomodoroWidgetWrap');
    if (!wrap) return;

    var mins = Math.floor(_pomoTimer.timeLeft / 60);
    var secs = _pomoTimer.timeLeft % 60;
    var timeStr = (mins < 10 ? '0' : '') + mins + ':' + (secs < 10 ? '0' : '') + secs;

    var topicOptions = `<option value="">-- Free / General Focus Session --</option>`;
    _state.topics.forEach(function (t) {
      var sel = _pomoTimer.activeTopicId === t.id ? 'selected' : '';
      topicOptions += `<option value="${t.id}" ${sel}>${_esc(t.title)}</option>`;
    });

    wrap.innerHTML = `
      <div class="pomodoro-widget-card">
        <div class="pomo-left">
          <div class="pomo-clock-circle">
            <div class="pomo-time-display" id="pomoTimeDisplay">${timeStr}</div>
            <div class="pomo-mode-label">${_pomoTimer.mode}</div>
          </div>
          <div class="pomo-controls">
            <div class="pomo-modes">
              <button class="pomo-mode-btn ${_pomoTimer.mode === 'pomodoro' ? 'active' : ''}" onclick="window.StudyWorkspace.setPomoMode('pomodoro')">25m Focus</button>
              <button class="pomo-mode-btn ${_pomoTimer.mode === 'short' ? 'active' : ''}" onclick="window.StudyWorkspace.setPomoMode('short')">5m Break</button>
              <button class="pomo-mode-btn ${_pomoTimer.mode === 'long' ? 'active' : ''}" onclick="window.StudyWorkspace.setPomoMode('long')">15m Long</button>
            </div>
            <div class="pomo-buttons">
              <button class="btn-pomo-action" onclick="window.StudyWorkspace.togglePomoTimer()">
                ${_pomoTimer.running ? '⏸️ Pause' : '▶️ Start Timer'}
              </button>
              <button class="btn-pomo-reset" onclick="window.StudyWorkspace.resetPomoTimer()">🔄 Reset</button>
            </div>
          </div>
        </div>
        <div class="pomo-topic-selector">
          <div class="pomo-select-label">🎯 Tag Study Topic:</div>
          <select class="pomo-topic-dropdown" onchange="window.StudyWorkspace.setPomoTopic(this.value)">
            ${topicOptions}
          </select>
        </div>
      </div>
    `;
  }

  function setPomoMode(mode) {
    if (_pomoTimer.running) togglePomoTimer();
    _pomoTimer.mode = mode;
    _pomoTimer.timeLeft = _pomoTimer.durations[mode];
    _updatePomodoroUI();
  }

  function setPomoTopic(topicId) {
    _pomoTimer.activeTopicId = topicId || null;
  }

  function togglePomoTimer() {
    if (_pomoTimer.running) {
      clearInterval(_pomoTimer.interval);
      _pomoTimer.running = false;
      _updatePomodoroUI();
    } else {
      _pomoTimer.running = true;
      _pomoTimer.sessionStart = Date.now();
      _pomoTimer.interval = setInterval(function () {
        if (_pomoTimer.timeLeft > 0) {
          _pomoTimer.timeLeft--;
          var el = document.getElementById('pomoTimeDisplay');
          if (el) {
            var mins = Math.floor(_pomoTimer.timeLeft / 60);
            var secs = _pomoTimer.timeLeft % 60;
            el.textContent = (mins < 10 ? '0' : '') + mins + ':' + (secs < 10 ? '0' : '') + secs;
          }
        } else {
          clearInterval(_pomoTimer.interval);
          _pomoTimer.running = false;
          _logStudySession(_pomoTimer.durations[_pomoTimer.mode]);
          if (window.LMToast) window.LMToast.show('🎉 Pomodoro Session Completed! Great job!');
          _updatePomodoroUI();
        }
      }, 1000);
      _updatePomodoroUI();
    }
  }

  function resetPomoTimer() {
    if (_pomoTimer.running) clearInterval(_pomoTimer.interval);
    _pomoTimer.running = false;
    _pomoTimer.timeLeft = _pomoTimer.durations[_pomoTimer.mode];
    _updatePomodoroUI();
  }

  function _logStudySession(durationSecs) {
    var topic = _state.topics.find(function (t) { return t.id === _pomoTimer.activeTopicId; });
    var logItem = {
      id: 'log_' + Date.now(),
      topic_id: topic ? topic.id : null,
      topic_title: topic ? topic.title : 'General Focus Session',
      duration_seconds: durationSecs,
      session_type: _pomoTimer.mode,
      logged_at: new Date().toISOString()
    };
    _state.timeLogs.unshift(logItem);
    _saveLocal();

    _getUid().then(function (uid) {
      if (uid && typeof _supabase !== 'undefined' && _supabase) {
        _supabase.from('study_time_logs').insert(Object.assign({ user_id: uid }, logItem)).then(function () {});
      }
    });
  }

  // ── 6. LEARNING GOALS & MILESTONES WIDGET ─────────────────────────────────
  function renderGoalsWidget() {
    var wrap = document.getElementById('studyGoalsWidgetWrap');
    if (!wrap) return;

    if (!_isWidgetVisible('milestones') || _state.goals.length === 0) {
      wrap.innerHTML = '';
      wrap.style.display = 'none';
      return;
    }

    wrap.style.display = 'block';

    var goalsHtml = _state.goals.map(function (g) {
      var targetCount = g.target_topics || 10;
      var doneM = (g.milestones || []).filter(function (m) { return m.completed; }).length;
      var totalM = (g.milestones || []).length || 1;
      var pct = Math.round((doneM / totalM) * 100);

      var targetDateStr = g.target_date ? `📅 Target: ${g.target_date}` : 'Ongoing Goal';

      return `
        <div class="goal-item-card">
          <div class="goal-top-row">
            <div class="goal-name">🎯 ${_esc(g.title)}</div>
            <div class="goal-target-countdown">${targetDateStr}</div>
          </div>
          <div class="goal-progress-bar">
            <div class="goal-progress-fill" style="width:${pct}%;"></div>
          </div>
          <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--text3);margin-bottom:6px;">
            <span>Milestones: ${doneM}/${totalM}</span>
            <span>${pct}% Complete</span>
          </div>
          <div class="goal-milestones-list">
            ${(g.milestones || []).slice(0, 3).map(function (m, idx) {
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

    wrap.innerHTML = `
      <div class="goals-widget-card">
        <div class="goals-header">
          <div class="goals-title">
            <span>🎯</span> Active Goals &amp; Target Milestones
          </div>
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
      if (uid && typeof _supabase !== 'undefined' && _supabase) {
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
      if (uid && typeof _supabase !== 'undefined' && _supabase) {
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
      if (uid && typeof _supabase !== 'undefined' && _supabase) {
        _supabase.from('study_custom_topics').insert(Object.assign({ user_id: uid }, newTop)).then(function () {});
      }
    });

    document.getElementById('addTopicModal')?.remove();
    if (window.LMToast) window.LMToast.show('✅ Topic added: ' + title);
    renderAllWidgets();
  }

  // ── 9. MANUAL FILE UPLOAD & SUPABASE STORAGE BUCKET INTEGRATION ───────────
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

    // Auto-populate title if empty
    if (titleInput && !titleInput.value.trim()) {
      var cleanName = file.name.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " ");
      titleInput.value = cleanName;
    }

    // Auto-detect material type
    if (typeSelect) {
      var ext = file.name.split('.').pop().toLowerCase();
      if (ext === 'pdf') {
        typeSelect.value = 'pdf';
      } else if (['png', 'jpg', 'jpeg', 'webp', 'svg', 'gif'].indexOf(ext) !== -1) {
        typeSelect.value = 'image';
      } else if (['js', 'ts', 'py', 'java', 'cpp', 'c', 'cs', 'go', 'rs', 'sql', 'html', 'css', 'json'].indexOf(ext) !== -1) {
        typeSelect.value = 'code';
      } else if (['doc', 'docx', 'txt', 'md'].indexOf(ext) !== -1) {
        typeSelect.value = 'document';
      }
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

  /**
   * Uploads file to Supabase Storage Bucket ('study-materials')
   * with fallback to Base64 / Local Blob URL if offline.
   */
  function uploadFileToStorage(file, topicId) {
    return _getUid().then(function (uid) {
      var uidPrefix = uid || 'guest';
      var sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      var storagePath = `${uidPrefix}/${topicId || 'general'}/${Date.now()}_${sanitizedName}`;

      var progressBar = document.getElementById('matUploadProgress');
      var progressFill = document.getElementById('matUploadProgressFill');
      if (progressBar) progressBar.style.display = 'block';
      if (progressFill) progressFill.style.width = '30%';

      // 1. Try Supabase Storage Bucket upload if online
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
            console.warn('[StudyWorkspace] Supabase storage upload failed, caching locally as DataURL:', err);
            return _readFileAsDataUrl(file, storagePath);
          });
      } else {
        // Fallback offline
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
          
          <!-- Manual Upload Dropzone -->
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

            <!-- Upload progress bar -->
            <div class="ws-upload-progress" id="matUploadProgress">
              <div class="ws-upload-progress-fill" id="matUploadProgressFill"></div>
            </div>

            <!-- File preview chip -->
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
      if (window.LMToast) window.LMToast.show('✅ Material successfully attached & synced!');
      openTopicExplorer(topicId);
    }).catch(function (e) {
      console.error('[StudyWorkspace] Material save error:', e);
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = '💾 Upload & Attach Material';
      }
      if (window.LMToast) window.LMToast.show('⚠️ Material saved locally');
    });
  }

  /**
   * Quick Upload Modal directly from customizer or toolbar
   */
  function openQuickUploadModal(targetDomainId) {
    var existing = document.getElementById('quickUploadModal');
    if (existing) existing.remove();

    if (_state.topics.length === 0) {
      if (window.LMToast) window.LMToast.show('ℹ️ Please create a section & topic first before uploading materials');
      openAddDomainModal();
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
            <span>📤</span> Quick File Upload to Supabase Storage
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
              <div class="dropzone-subtext">Will be stored in Supabase Storage Bucket ('study-materials')</div>
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

  // ── 10. MATERIAL VIEWER MODAL ──────────────────────────────────────────────
  function openMaterialViewer(materialId) {
    var mat = _state.materials.find(function (m) { return m.id === materialId; });
    if (!mat) return;

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
          <a href="${_esc(displayUrl)}" target="_blank" rel="noopener" class="ws-btn-secondary" style="font-size:11px;padding:4px 10px;text-decoration:none;">
            📄 Open in New Tab ↗
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
            <a href="${_esc(displayUrl)}" target="_blank" rel="noopener" class="ws-btn-secondary" style="font-size:11px;padding:4px 10px;text-decoration:none;">
              🔍 View Full Resolution Image ↗
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
    } else if (mat.material_type === 'link' || mat.material_type === 'video') {
      bodyHtml = `
        <div style="padding:20px;background:rgba(255,255,255,0.03);border-radius:10px;border:1px solid var(--border,#262f45);text-align:center;">
          <div style="font-size:32px;margin-bottom:10px;">${mat.material_type === 'video' ? '🎥' : '🔗'}</div>
          <p style="font-size:13px;color:var(--text);margin-bottom:16px;max-width:500px;margin-left:auto;margin-right:auto;">${_esc(mat.content || mat.title)}</p>
          <a href="${_esc(displayUrl)}" target="_blank" rel="noopener" class="ws-btn-primary" style="text-decoration:none;display:inline-flex;">
            🚀 Open ${mat.material_type === 'video' ? 'Video' : 'Documentation Link'} in New Tab ↗
          </a>
        </div>
      `;
    } else {
      bodyHtml = `
        <div style="font-size:13.5px;color:var(--text);line-height:1.75;white-space:pre-wrap;background:rgba(255,255,255,0.02);padding:18px;border-radius:10px;border:1px solid var(--border,#262f45);">${_esc(mat.content || mat.title)}</div>
        ${displayUrl ? `
          <div style="margin-top:14px;">
            <a href="${_esc(displayUrl)}" target="_blank" rel="noopener" class="ws-btn-secondary" style="text-decoration:none;font-size:12px;">
              📥 Download Document Attachment ↗
            </a>
          </div>
        ` : ''}
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

  // ── 11. CASCADED DELETION ENGINE (SECTIONS, MODULES, TOPICS, MATERIALS) ─────
  /**
   * Deletes a custom language/domain and all its cascaded items:
   * categories, topics, materials, storage files, time logs, and preferences.
   */
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

    // 1. Collect child IDs
    var domCats = _state.categories.filter(function (c) { return c.domain_id === domainId; });
    var catIds = new Set(domCats.map(function (c) { return c.id; }));
    var domTopics = _state.topics.filter(function (t) { return catIds.has(t.category_id); });
    var topIds = new Set(domTopics.map(function (t) { return t.id; }));
    var domMats = _state.materials.filter(function (m) { return topIds.has(m.topic_id); });

    // 2. Remove files from Supabase Storage bucket if any
    var storagePaths = domMats.map(function (m) { return m.storage_path; }).filter(Boolean);
    if (storagePaths.length > 0 && typeof _supabase !== 'undefined' && _supabase?.storage) {
      _supabase.storage.from(STORAGE_BUCKET).remove(storagePaths).catch(function () {});
    }

    // 3. Delete from Supabase Database tables
    _getUid().then(function (uid) {
      if (uid && typeof _supabase !== 'undefined' && _supabase) {
        _supabase.from('study_custom_domains').delete().eq('id', domainId).then(function () {});
        _supabase.from('study_time_logs').delete().eq('domain_id', domainId).then(function () {});
      }
    });

    // 4. Clean in-memory state
    _state.domains = _state.domains.filter(function (d) { return d.id !== domainId; });
    _state.categories = _state.categories.filter(function (c) { return c.domain_id !== domainId; });
    _state.topics = _state.topics.filter(function (t) { return !catIds.has(t.category_id); });
    _state.materials = _state.materials.filter(function (m) { return !topIds.has(m.topic_id); });
    _state.timeLogs = _state.timeLogs.filter(function (l) { return l.domain_id !== domainId && !topIds.has(l.topic_id); });

    // 5. Clear resume learning if pointed to this domain/topics
    if (_state.prefs.last_active_topic && (_state.prefs.last_active_topic.domainId === domainId || topIds.has(_state.prefs.last_active_topic.topicId))) {
      clearLastActiveTopic();
    }

    // 6. Clean localStorage
    try {
      localStorage.removeItem('lm_lang_sec_collapsed_' + domainId);
    } catch (e) {}

    _saveLocal();

    document.getElementById('deleteConfirmModal')?.remove();
    document.getElementById('widgetCustomizerDrawer')?.remove();

    if (window.LMToast) {
      window.LMToast.show('🗑️ Section "' + domTitle + '" and all associated data cleared!');
    }

    renderAllWidgets();
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
  }

  // ── 12. WIDGET CUSTOMIZER DRAWER ───────────────────────────────────────────
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

    // Custom sections list in drawer with delete option
    var customSecRows = _state.domains.length > 0 ? _state.domains.map(function (d) {
      var dCats = _state.categories.filter(function (c) { return c.domain_id === d.id; });
      var cIds = new Set(dCats.map(function (c) { return c.id; }));
      var dTops = _state.topics.filter(function (t) { return cIds.has(t.category_id); });
      return `
        <div class="customizer-section-item">
          <div class="customizer-section-left">
            <span class="customizer-section-icon" style="background:${d.color}20;color:${d.color};">${d.icon}</span>
            <div style="min-width:0;">
              <div class="customizer-section-title">${_esc(d.title)}</div>
              <div class="customizer-section-badge">${dTops.length} topic${dTops.length!==1?'s':''}</div>
            </div>
          </div>
          <div style="display:flex;gap:6px;align-items:center;">
            <button class="ws-btn-secondary" style="font-size:11px;padding:3px 7px;" onclick="window.StudyWorkspace.openAddTopicModal('${dCats[0]?dCats[0].id:''}')" title="Add topic">➕</button>
            <button class="ws-btn-danger" style="font-size:11px;padding:3px 7px;" onclick="window.StudyWorkspace.confirmDeleteDomain('${d.id}')" title="Delete entire section">🗑️</button>
          </div>
        </div>
      `;
    }).join('') : '<div style="font-size:11.5px;color:var(--text3);padding:10px;background:rgba(255,255,255,0.02);border-radius:8px;">No custom sections added yet.</div>';

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
          <button class="ws-btn-primary" onclick="window.StudyWorkspace.openQuickUploadModal();document.getElementById('widgetCustomizerDrawer')?.remove();" style="width:100%;justify-content:center;background:linear-gradient(135deg,#4f8ef7,#8b5cf6);">
            📤 Upload Material to Supabase
          </button>
          <button class="ws-btn-secondary" onclick="window.StudyWorkspace.openTemplateModal();document.getElementById('widgetCustomizerDrawer')?.remove();" style="width:100%;justify-content:center;">
            📦 Import Curriculum Blueprint
          </button>
          <button class="ws-btn-secondary" onclick="window.StudyWorkspace.openGoalModal();document.getElementById('widgetCustomizerDrawer')?.remove();" style="width:100%;justify-content:center;">
            🎯 Set Learning Goal &amp; Milestones
          </button>
        </div>

        <div style="font-size:11px;font-weight:700;text-transform:uppercase;color:var(--text3);margin-bottom:10px;letter-spacing:.05em;">Manage Added Sections</div>
        <div class="customizer-sections-list">
          ${customSecRows}
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
      if (uid && typeof _supabase !== 'undefined' && _supabase) {
        _supabase.from('study_custom_domains').insert(Object.assign({ user_id: uid }, newDomain)).then(function () {});
      }
    });

    if (window.LMToast) window.LMToast.show('🎉 Imported roadmap: ' + tpl.title);
    renderAllWidgets();
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
  }

  // ── 15. TOPIC EXPLORER & DETAIL MODAL ──────────────────────────────────────
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
            <div style="display:flex;align-items:center;gap:6px;">
              <span style="font-size:11px;color:var(--text3);">${m.file_size_bytes ? Math.round(m.file_size_bytes/1024) + ' KB' : 'Document'}</span>
              <button class="ws-modal-close" style="font-size:14px;padding:2px;" onclick="event.stopPropagation();window.StudyWorkspace.deleteMaterial('${m.id}')" title="Delete attachment">🗑️</button>
            </div>
          </div>
          <div class="material-title">${_esc(m.title)}</div>
        </div>
      `;
    }).join('') : '<div style="color:var(--text3);font-size:12px;padding:12px;background:rgba(255,255,255,0.02);border-radius:8px;">No attached materials yet. Click "+ Add Material" or drop a file to upload.</div>';

    modal.innerHTML = `
      <div class="ws-modal-dialog wide">
        <div class="ws-modal-header">
          <div class="ws-modal-title">
            <span>📖</span> ${_esc(t.title)}
          </div>
          <div style="display:flex;align-items:center;gap:8px;">
            <button class="ws-btn-danger" onclick="window.StudyWorkspace.deleteTopic('${t.id}')" title="Delete topic">🗑️ Delete Topic</button>
            <button class="ws-modal-close" onclick="document.getElementById('topicExplorerModal')?.remove()">✕</button>
          </div>
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
              <label class="ws-form-label" style="margin:0;">📚 Study Materials &amp; Uploaded Files</label>
              ${_state.canCustomize ? `<button class="ws-btn-secondary" style="font-size:11px;padding:3px 8px;" onclick="window.StudyWorkspace.openAddMaterialModal('${t.id}')">📤 + Add / Upload Material</button>` : ''}
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
      if (uid && typeof _supabase !== 'undefined' && _supabase) {
        _supabase.from('study_custom_topics').update({ notes: notes, updated_at: new Date().toISOString() }).eq('id', topicId).then(function () {});
      }
    });
  }

  // ── 16. RENDER ALL WIDGETS & CUSTOM SECTIONS ───────────────────────────────
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
      } catch (e) {}

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
              <div style="display:flex;gap:6px;align-items:center;" onclick="event.stopPropagation()">
                <button class="ws-btn-secondary" style="font-size:11px;padding:4px 8px;" onclick="event.stopPropagation();window.StudyWorkspace.openAddTopicModal('${domCats[0]?domCats[0].id:''}')">+ Add Topic</button>
                <button class="ws-btn-danger" style="font-size:11px;padding:4px 8px;" onclick="event.stopPropagation();window.StudyWorkspace.confirmDeleteDomain('${dom.id}')" title="Delete this section and all associated topics/materials">🗑️ Delete Section</button>
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

  // ── 17. PUBLIC API EXPORTS ─────────────────────────────────────────────────
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
    getState: function () { return _state; }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})(window);
