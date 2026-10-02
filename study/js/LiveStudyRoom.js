/**
 * LedgerMate Study Hub – LiveStudyRoom.js
 * ─────────────────────────────────────────────────────────────
 * Synchronized Live Study Room & Virtual Pomodoro Focus Hub.
 * Leverages Supabase Realtime Presence & Broadcast channels (500 free connections)
 * to sync focus timers, active study topics, and peer motivation.
 * Exposes: window.LiveStudyRoom
 * ─────────────────────────────────────────────────────────────
 */
(function () {
  'use strict';

  var _channel = null;
  var _roomId = 'global-prep-focus';
  var _onlineUsers = [];
  var _pomodoroTimer = null;
  var _pomodoroState = {
    mode: 'focus', // focus (25m) or break (5m)
    secondsLeft: 25 * 60,
    isRunning: false,
    cycle: 1
  };

  function initLiveRoom(roomId = 'global-prep-focus') {
    if (typeof _supabase === 'undefined' || !_supabase || typeof _supabase.channel !== 'function') {
      console.warn('[LiveStudyRoom] Supabase realtime unavailable');
      return;
    }

    _roomId = roomId;
    var user = null;
    try {
      user = JSON.parse(localStorage.getItem('study_user_meta') || localStorage.getItem('lm_session') || '{}');
    } catch (e) {}

    var userName = user.displayName || user.username || 'Learner ' + Math.floor(Math.random() * 1000);
    var userId = user.userId || 'u_' + Math.random().toString(36).substr(2, 7);

    try {
      if (_channel) _supabase.removeChannel(_channel);

      _channel = _supabase.channel('study_room_' + _roomId, {
        config: { presence: { key: userId } }
      });

      // Track peer presence in room
      _channel
        .on('presence', { event: 'sync' }, function () {
          var state = _channel.presenceState();
          _onlineUsers = Object.values(state).flat();
          _updateRoomPresenceUI();
        })
        .on('broadcast', { event: 'pomodoro_tick' }, function (payload) {
          if (payload && payload.state) {
            _pomodoroState = payload.state;
            _updatePomodoroUI();
          }
        })
        .subscribe(async function (status) {
          if (status === 'SUBSCRIBED') {
            await _channel.track({
              userId: userId,
              name: userName,
              onlineAt: new Date().toISOString(),
              topic: document.title || 'Interview Prep'
            });
            console.log('[LiveStudyRoom] 🟢 Connected to live room:', _roomId);
          }
        });
    } catch (err) {
      console.warn('[LiveStudyRoom] Connection failed:', err);
    }
  }

  function _updateRoomPresenceUI() {
    var countEl = document.getElementById('liveRoomUserCount');
    if (countEl) countEl.textContent = _onlineUsers.length;

    var listEl = document.getElementById('liveRoomUsersList');
    if (listEl) {
      listEl.innerHTML = _onlineUsers.map(u => `
        <div style="display:flex;align-items:center;gap:6px;background:rgba(255,255,255,0.03);padding:4px 8px;border-radius:6px;font-size:11px;">
          <span style="width:6px;height:6px;border-radius:50%;background:#10b981;display:inline-block;"></span>
          <span style="color:#e8eaf6;font-weight:600;">${u.name}</span>
          <span style="color:#7b88aa;font-size:10px;">(${u.topic?.slice(0, 15) || 'Study'})</span>
        </div>
      `).join('');
    }
  }

  function _updatePomodoroUI() {
    var timerEl = document.getElementById('livePomodoroDisplay');
    if (timerEl) {
      var mins = Math.floor(_pomodoroState.secondsLeft / 60);
      var secs = _pomodoroState.secondsLeft % 60;
      timerEl.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
      timerEl.style.color = _pomodoroState.mode === 'focus' ? '#10b981' : '#f59e0b';
    }
    var statusEl = document.getElementById('livePomodoroModeText');
    if (statusEl) {
      statusEl.textContent = _pomodoroState.mode === 'focus' ? '🎯 Focus Sprint' : '☕ Rest Break';
    }
  }

  function togglePomodoro() {
    _pomodoroState.isRunning = !_pomodoroState.isRunning;

    if (_pomodoroState.isRunning) {
      _pomodoroTimer = setInterval(() => {
        if (_pomodoroState.secondsLeft > 0) {
          _pomodoroState.secondsLeft--;
        } else {
          // Switch mode
          if (_pomodoroState.mode === 'focus') {
            _pomodoroState.mode = 'break';
            _pomodoroState.secondsLeft = 5 * 60;
          } else {
            _pomodoroState.mode = 'focus';
            _pomodoroState.secondsLeft = 25 * 60;
            _pomodoroState.cycle++;
          }
        }
        _updatePomodoroUI();

        // Broadcast to peers if channel active
        if (_channel && _channel.state === 'joined') {
          _channel.send({
            type: 'broadcast',
            event: 'pomodoro_tick',
            payload: { state: _pomodoroState }
          });
        }
      }, 1000);
    } else {
      clearInterval(_pomodoroTimer);
    }
  }

  /**
   * UI Modal for Live Study Room & Synchronized Pomodoro
   */
  function openLiveStudyRoomModal() {
    var existing = document.getElementById('study-live-room-modal');
    if (existing) existing.remove();

    var modal = document.createElement('div');
    modal.id = 'study-live-room-modal';
    modal.className = 'modal-overlay show';
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.85);z-index:99999;display:flex;align-items:center;justify-content:center;padding:16px;backdrop-filter:blur(8px);font-family:Inter,sans-serif;color:#e8eaf6;';

    modal.innerHTML = `
      <div style="background:#111420;border:1px solid #262f45;border-radius:20px;max-width:560px;width:100%;box-shadow:0 24px 60px rgba(0,0,0,0.8);overflow:hidden;">
        <!-- Header -->
        <div style="padding:16px 20px;border-bottom:1px solid #262f45;display:flex;justify-content:space-between;align-items:center;background:#0d101a;">
          <div style="display:flex;align-items:center;gap:10px;">
            <span style="font-size:22px;">🏛️</span>
            <div>
              <div style="font-size:15px;font-weight:700;">Live Peer Study Room</div>
              <div style="font-size:11px;color:#7b88aa;">Synchronized Pomodoro Focus & Presence</div>
            </div>
          </div>
          <button id="liveRoomCloseBtn" style="background:none;border:none;color:#8896b8;font-size:22px;cursor:pointer;">&times;</button>
        </div>

        <!-- Body -->
        <div style="padding:20px;display:flex;flex-direction:column;gap:16px;">
          <!-- Big Pomodoro Widget -->
          <div style="background:radial-gradient(circle at center,rgba(16,185,129,0.1) 0%,rgba(0,0,0,0.4) 100%);border:1px solid rgba(16,185,129,0.25);border-radius:16px;padding:24px;text-align:center;">
            <div id="livePomodoroModeText" style="font-size:13px;font-weight:700;color:#10b981;letter-spacing:1px;text-transform:uppercase;">🎯 Focus Sprint</div>
            <div id="livePomodoroDisplay" style="font-size:48px;font-weight:800;color:#10b981;font-family:'JetBrains Mono',monospace;margin:8px 0;">25:00</div>
            <button id="livePomodoroToggleBtn" style="padding:8px 24px;background:linear-gradient(135deg,#10b981,#059669);border:none;border-radius:8px;color:#fff;font-weight:700;font-size:13px;cursor:pointer;">
              ▶️ Start Focus Sprint
            </button>
          </div>

          <!-- Peer Presence -->
          <div>
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
              <span style="font-size:12px;font-weight:700;">Active Peers Online (<span id="liveRoomUserCount">1</span>)</span>
              <span style="font-size:10px;color:#10b981;">● Supabase Realtime Active</span>
            </div>
            <div id="liveRoomUsersList" style="display:flex;flex-wrap:wrap;gap:6px;max-height:120px;overflow-y:auto;">
              <div style="font-size:11px;color:#7b88aa;">Connecting to peer mesh...</div>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    document.getElementById('liveRoomCloseBtn').onclick = () => modal.remove();
    var toggleBtn = document.getElementById('livePomodoroToggleBtn');
    toggleBtn.onclick = () => {
      togglePomodoro();
      toggleBtn.textContent = _pomodoroState.isRunning ? '⏸️ Pause Sprint' : '▶️ Resume Sprint';
    };

    initLiveRoom();
    _updatePomodoroUI();
  }

  window.LiveStudyRoom = {
    initLiveRoom,
    openLiveStudyRoomModal,
    togglePomodoro
  };

  console.log('[Study] LiveStudyRoom module initialized.');
})();
