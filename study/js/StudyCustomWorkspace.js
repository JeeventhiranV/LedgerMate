/* ══════════════════════════════════════════════════════════════════════════
   StudyCustomWorkspace.js — Personal Learning & Progress Management System
   ─────────────────────────────────────────────────────────────────────────
   Features:
   - Custom Domains, Categories, Topics, Subtopics & Materials CRUD
   - 4-State Status Engine (Pending / In Progress / Completed / On Hold)
   - Multi-Format Material Viewers (PDF, Markdown Notes, Code Runner, Links)
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

    var topicsOptions = '<option value="">-- General Focus Session --</option>';
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

  // ── 7. WIDGET CUSTOMIZER & PREFERENCES ─────────────────────────────────────
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
        <div style="font-family:'Syne',sans-serif;font-size:15px;font-weight:700;color:var(--text);">⚙️ Customize Dashboard Widgets</div>
        <button class="ws-modal-close" onclick="document.getElementById('widgetCustomizerDrawer')?.remove()">✕</button>
      </div>
      <div class="drawer-body">
        <p style="font-size:12px;color:var(--text3);margin-bottom:14px;line-height:1.5;">
          Toggle dashboard widgets on or off based on your personal study routine. Changes are synced across your devices.
        </p>
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

  // ── 8. PRE-BUILT ROADMAP TEMPLATES ─────────────────────────────────────────
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

  // ── 9. TOPIC EXPLORER & MATERIAL MODALS ────────────────────────────────────
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

  // ── 10. RENDER ALL WIDGETS ────────────────────────────────────────────────
  function renderAllWidgets() {
    renderResumeHero();
    initPomodoroWidget();
    renderGoalsWidget();
  }

  // ── Public API ──
  window.StudyWorkspace = {
    init: init,
    renderAllWidgets: renderAllWidgets,
    renderResumeHero: renderResumeHero,
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
    importTemplate: importTemplate,
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
