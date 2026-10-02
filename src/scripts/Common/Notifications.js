/* ----------------------------
   Enhanced Notifications & Reminders (Detailed Dashboard)
   Features:
   - Rich notif panel with filters, search, groups
   - Reminders modal (summary cards, timeline, add/edit form)
   - Fields: linkedTransactionId, category, priority, tag, recurrence, time, autoRepeat
   - Actions: Mark Done, Snooze (1 day / custom), Edit, Delete
   - Inline + Toast alerts for due reminders (today/overdue) with lastAlerted tracking
   - Loan due‑soon alerts with cooldown & time‑gated push
   - Night‑mode compatible with glass UI
   ----------------------------*/

(function () {
  // Ensure reminders array exists
  if (!Array.isArray(state.reminders)) state.reminders = [];

  // --- Local helpers ---
  function parseDateTime(dateStr, timeStr) {
    if (!dateStr) return null;
    if (!timeStr) return new Date(dateStr);
    const [h, m] = (timeStr || '00:00').split(':').map(Number);
    const d = new Date(dateStr + 'T00:00:00');
    d.setHours(h, m, 0, 0);
    return d;
  }

  // Update badge count
  function updateNotifCountBadge() {
    const cnt = state.reminders.filter(r => !r.completed).length || 0;
    const el = document.getElementById('notifCount');
    if (el) el.textContent = cnt;
  }

  // ========== RENDER NOTIFICATIONS ==========
  async function renderNotifications() {
    const listEl = document.getElementById('notifList');
    if (!listEl) return;

    const typeFilter = document.getElementById('notifTypeFilter')?.value || 'all';
    const prFilter   = document.getElementById('notifPriorityFilter')?.value || 'all';
    const search     = (document.getElementById('notifSearch')?.value || '').toLowerCase();

    try { state.reminders = await getAll('reminders'); }
    catch (e) { console.warn('Failed to load reminders', e); }

    const now = new Date();

    const filtered = (state.reminders || [])
      .slice()
      .sort((a, b) => {
        if (a.completed !== b.completed) return a.completed ? 1 : -1;
        const da = parseDateTime(a.dueDate, a.time) || new Date('2100-01-01');
        const db = parseDateTime(b.dueDate, b.time) || new Date('2100-01-01');
        return da - db;
      })
      .filter(r => {
        if (typeFilter !== 'all') {
          if (typeFilter === 'credit card') {
            if ((r.tag || '').toLowerCase() !== 'credit card' && !r.cardId && !(r.id && String(r.id).startsWith('rem_cc_'))) return false;
          } else if (!(r.tag || 'reminder').toLowerCase().includes(typeFilter)) {
            return false;
          }
        }
        if (prFilter  !== 'all' && (r.priority || 'medium').toLowerCase() !== prFilter) return false;
        if (search) {
          const hay = `${r.title} ${r.note||''} ${r.tag||''} ${r.category||''}`.toLowerCase();
          return hay.includes(search);
        }
        return true;
      });

    const PRIORITY_COLORS = { high: 'var(--rose)', medium: 'var(--gold)', low: 'var(--emerald)' };
    const PRIORITY_LABELS = { high: '🔴 High', medium: '🟡 Medium', low: '🟢 Low' };

    listEl.innerHTML = filtered.length ? filtered.map(r => {
      const dueDateObj  = parseDateTime(r.dueDate, r.time);
      const isOverdue   = !r.completed && dueDateObj && dueDateObj < now;
      const isDueToday  = !r.completed && dueDateObj && dueDateObj?.toDateString() === now.toDateString();
      const priority    = r.priority || 'medium';
      const accentColor = isOverdue ? 'var(--rose)' : isDueToday ? 'var(--gold)' : PRIORITY_COLORS[priority];

      const dueLabel = !r.dueDate ? '' : isOverdue
        ? `<span class="nr-badge overdue">Overdue</span>`
        : isDueToday
          ? `<span class="nr-badge today">Today</span>`
          : '';

      const dateStr = r.dueDate ? `${r.dueDate}${r.time ? ' ' + r.time : ''}` : '';
      const cardId = r.cardId || (r.id && String(r.id).startsWith('rem_cc_') ? String(r.id).replace('rem_cc_', '') : null);

      return `
        <div class="nr-item ${r.completed ? 'nr-done' : ''}" style="--accent:${accentColor}">
          <div class="nr-accent-bar"></div>
          <div class="nr-body">
            <div class="nr-top">
              <div class="nr-title-wrap">
                ${r.tag ? `<span class="nr-tag">${r.tag}</span>` : ''}
                <span class="nr-title">${r.title}</span>
                ${dueLabel}
              </div>
              <span class="nr-priority" style="color:${accentColor}">${PRIORITY_LABELS[priority]}</span>
            </div>
            ${dateStr || r.category ? `<div class="nr-meta">
              ${dateStr ? `<span>📅 ${dateStr}</span>` : ''}
              ${r.category ? `<span>🏷️ ${r.category}</span>` : ''}
            </div>` : ''}
            ${r.note ? `<div class="nr-note">${r.note}</div>` : ''}
            <div class="nr-actions">
              ${cardId && !r.completed ? `
                <button class="nr-btn payCcBillBtn" data-card-id="${cardId}" style="background:var(--teal);color:#fff;border-color:var(--teal);font-weight:600;" title="Pay Credit Card Bill">💳 Pay Bill</button>
              ` : ''}
              <button class="nr-btn markDone ${r.completed ? 'active' : ''}" data-id="${r.id}" title="${r.completed ? 'Mark pending' : 'Mark done'}">
                ${r.completed ? '↩ Undo' : '✓ Done'}
              </button>
              <button class="nr-btn snoozeBtn" data-id="${r.id}" title="Snooze 1 day">⏱ Snooze</button>
              <button class="nr-btn editRem" data-id="${r.id}" title="Edit">✏️</button>
              <button class="nr-btn danger delRem" data-id="${r.id}" title="Delete">🗑️</button>
            </div>
          </div>
        </div>`;
    }).join('') : `
      <div class="nr-empty">
        <div style="font-size:36px;margin-bottom:8px;">🔕</div>
        <div style="font-size:14px;font-weight:700;color:var(--text);margin-bottom:4px;">All clear!</div>
        <div style="font-size:12px;">No notifications match your filters.</div>
      </div>`;

    updateNotifCountBadge();

    // Summary
    const total   = (state.reminders || []).length;
    const pending = (state.reminders || []).filter(r => !r.completed).length;
    const overdue = (state.reminders || []).filter(r => {
      const d = parseDateTime(r.dueDate, r.time);
      return !r.completed && d && d < now;
    }).length;
    const summaryEl = document.getElementById('notifFilterSummary');
    if (summaryEl) {
      summaryEl.innerHTML = `<span style="color:var(--rose);font-weight:700;">${overdue} overdue</span> · ${pending} pending · ${total} total`;
    }

    // Events
    listEl.querySelectorAll('.payCcBillBtn').forEach(btn => {
      btn.onclick = () => {
        closeNotifPanel();
        if (window.LM_CreditCardsUI) {
          window.LM_CreditCardsUI.showPayBillModal(btn.dataset.cardId);
        }
      };
    });
    listEl.querySelectorAll('.markDone').forEach(btn => {
      btn.onclick = async () => { await toggleReminderCompleted(btn.dataset.id); renderNotifications(); };
    });
    listEl.querySelectorAll('.snoozeBtn').forEach(btn => {
      btn.onclick = async () => { await snoozeReminder(btn.dataset.id, 1); renderNotifications(); };
    });
    listEl.querySelectorAll('.editRem').forEach(btn => {
      btn.onclick = () => openEditReminderModal(btn.dataset.id);
    });
    listEl.querySelectorAll('.delRem').forEach(btn => {
      btn.onclick = async () => {
        if (!confirm('Delete this reminder?')) return;
        await del('reminders', btn.dataset.id);
        state.reminders = state.reminders.filter(r => String(r.id) !== String(btn.dataset.id));
        autoBackup();
        showToast('Reminder deleted', 'success');
        renderNotifications();
      };
    });
  }
  function closeNotifPanel() {
    const panel = document.getElementById('notifPanel');
    if (panel) panel.style.display = 'none';
  }

  function toggleNotifPanel() {
    const panel = document.getElementById('notifPanel');
    if (!panel) return;
    if (panel.style.display === 'none' || !panel.style.display) {
      panel.style.display = 'block';
      renderNotifications();
    } else {
      panel.style.display = 'none';
    }
  }


  // Mark all seen
  async function markAllNotificationsSeen() {
    const now = new Date().toISOString();
    for (const r of state.reminders) {
      r.lastSeen = now;
      await put('reminders', r);
    }
    showToast('Marked all notifications as seen', 'info');
    renderNotifications();
  }

  // Toggle completed
  async function toggleReminderCompleted(id) {
    const rem = state.reminders.find(r => String(r.id) === String(id));
    if (!rem) return;
    rem.completed = !rem.completed;
    rem.completedAt = rem.completed ? new Date().toISOString() : null;
    await put('reminders', rem);
    autoBackup();
    renderNotifications();
    showToast(rem.completed ? 'Marked done' : 'Marked pending', 'success');
  }

  // Snooze
  async function snoozeReminder(id, days = 1) {
    const rem = state.reminders.find(r => String(r.id) === String(id));
    if (!rem) return;
    try {
      const d = new Date(rem.dueDate || new Date().toISOString().slice(0,10));
      d.setDate(d.getDate() + Number(days));
      rem.dueDate = d.toISOString().slice(0,10);
      delete rem.lastAlerted;
      await put('reminders', rem);
      autoBackup();
      renderNotifications();
      showToast(`Snoozed ${rem.title} by ${days} day(s)`, 'info');
    } catch (e) {
      showToast('Failed to snooze', 'error');
    }
  }

  // Open edit modal for a single reminder
  function openEditReminderModal(id) {
    const r = state.reminders.find(x => String(x.id) === String(id));
    showRemindersModal(r);
  }

  // ========== SHOW REMINDERS MODAL ==========
  async function showRemindersModal(prefill = null) {
    state.reminders = await getAll('reminders');

    const reminders = (state.reminders || []).slice().sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1;
      const da = parseDateTime(a.dueDate, a.time) || new Date('2100-01-01');
      const db = parseDateTime(b.dueDate, b.time) || new Date('2100-01-01');
      return da - db;
    });

    const now = new Date();
    const overdueCount  = reminders.filter(r => !r.completed && parseDateTime(r.dueDate, r.time) < now).length;
    const upcomingCount = reminders.filter(r => !r.completed && parseDateTime(r.dueDate, r.time) >= now).length;
    const completedCount = reminders.filter(r => r.completed).length;

    const listHtml = reminders.length ? reminders.map(r => {
      const p = r.priority || 'medium';
      const dueDateObj = parseDateTime(r.dueDate, r.time);
      const isOverdue  = !r.completed && dueDateObj && dueDateObj < now;
      const accentColor = isOverdue ? 'var(--rose)' : p === 'high' ? 'var(--rose)' : p === 'low' ? 'var(--emerald)' : 'var(--gold)';
      const cardId = r.cardId || (r.id && String(r.id).startsWith('rem_cc_') ? String(r.id).replace('rem_cc_', '') : null);

      return `
        <div class="rm-item ${r.completed ? 'rm-done' : ''}" style="--accent:${accentColor}">
          <div class="rm-accent"></div>
          <div class="rm-content">
            <div class="rm-row">
              <span class="rm-title">${r.tag ? `<span class="nr-tag">${r.tag}</span> ` : ''}${r.title}</span>
              <span class="rm-pri" style="color:${accentColor}">${p.charAt(0).toUpperCase()+p.slice(1)}</span>
            </div>
            ${r.dueDate ? `<div class="rm-date">📅 ${r.dueDate}${r.time ? ' · ' + r.time : ''}${r.category ? ' · ' + r.category : ''}${isOverdue ? ' <span style="color:var(--rose);font-weight:700;">· Overdue</span>' : ''}</div>` : ''}
            ${r.note ? `<div class="rm-note">${r.note}</div>` : ''}
            <div class="rm-btns">
              ${cardId && !r.completed ? `
                <button class="rm-btn payCcBillBtn" data-card-id="${cardId}" style="background:var(--teal);color:#fff;border-color:var(--teal);font-weight:600;">💳 Pay</button>
              ` : ''}
              <button class="rm-btn markDone ${r.completed?'active':''}" data-id="${r.id}">${r.completed ? '↩ Undo' : '✓ Done'}</button>
              <button class="rm-btn snoozeBtn" data-id="${r.id}">⏱ Snooze</button>
              <button class="rm-btn editRem" data-id="${r.id}">✏️ Edit</button>
              <button class="rm-btn danger delRem" data-id="${r.id}">🗑️</button>
            </div>
          </div>
        </div>`;
    }).join('') : `<div class="nr-empty" style="padding:20px 0;"><div style="font-size:30px">🔕</div><div>No reminders yet</div></div>`;

    const pre = prefill || {};
    const formTitle = pre.id ? '✏️ Edit Reminder' : '➕ New Reminder';
    const addForm = `
      <div style="font-size:14px;font-weight:700;color:var(--text);margin-bottom:12px;">${formTitle}</div>
      <form id="addReminderForm">
        <div class="rem-form-grid">
          <div class="rem-field rem-field-2">
            <label class="form-label">Title *</label>
            <input id="remTitle" class="form-input" required placeholder="e.g. Pay electricity bill" value="${pre.title || ''}">
          </div>
          <div class="rem-field">
            <label class="form-label">Tag</label>
            <select id="remTag" class="form-input">
              <option ${!pre.tag||pre.tag==='General'?'selected':''}>General</option>
              <option ${pre.tag==='Credit Card'?'selected':''}>Credit Card</option>
              <option ${pre.tag==='Bills'?'selected':''}>Bills</option>
              <option ${pre.tag==='Loan'?'selected':''}>Loan</option>
              <option ${pre.tag==='Personal'?'selected':''}>Personal</option>
            </select>
          </div>
          <div class="rem-field">
            <label class="form-label">Due Date *</label>
            <input id="remDate" class="form-input" type="date" required value="${pre.dueDate || ''}">
          </div>
          <div class="rem-field">
            <label class="form-label">Time</label>
            <input id="remTime" class="form-input" type="time" value="${pre.time || ''}">
          </div>
          <div class="rem-field">
            <label class="form-label">Priority</label>
            <select id="remPriority" class="form-input">
              <option value="high" ${pre.priority==='high'?'selected':''}>🔴 High</option>
              <option value="medium" ${!pre.priority||pre.priority==='medium'?'selected':''}>🟡 Medium</option>
              <option value="low" ${pre.priority==='low'?'selected':''}>🟢 Low</option>
            </select>
          </div>
          <div class="rem-field">
            <label class="form-label">Category</label>
            <input id="remCategory" class="form-input" placeholder="e.g. Bills" value="${pre.category || ''}">
          </div>
          <div class="rem-field">
            <label class="form-label">Repeat</label>
            <select id="remRecurrence" class="form-input">
              <option value="none" ${!pre.recurrence||pre.recurrence==='none'?'selected':''}>No repeat</option>
              <option value="daily"   ${pre.recurrence==='daily'?'selected':''}>Daily</option>
              <option value="weekly"  ${pre.recurrence==='weekly'?'selected':''}>Weekly</option>
              <option value="monthly" ${pre.recurrence==='monthly'?'selected':''}>Monthly</option>
              <option value="yearly"  ${pre.recurrence==='yearly'?'selected':''}>Yearly</option>
            </select>
          </div>
          <div class="rem-field" style="display:flex;align-items:flex-end;">
            <label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:13px;color:var(--text-2);padding-bottom:2px;">
              <input type="checkbox" id="remAutoRepeat" ${pre.autoRepeat?'checked':''} style="width:16px;height:16px;accent-color:var(--teal);">
              Auto-repeat
            </label>
          </div>
          <div class="rem-field rem-field-2">
            <label class="form-label">Note</label>
            <textarea id="remNote" class="form-input form-textarea" placeholder="Optional note…">${pre.note || ''}</textarea>
          </div>
        </div>
        <div style="display:flex;gap:8px;margin-top:14px;">
          <button type="submit" class="btn-submit" style="flex:1;">${pre.id ? 'Update' : 'Save'} Reminder</button>
          <button id="cancelRemBtn" type="button" class="btn-cancel" style="flex:0 0 auto;padding:0 20px;">Cancel</button>
        </div>
      </form>`;

    const modalContent = `
      <div>
        <!-- Stats -->
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:16px;">
          <div style="background:rgba(251,113,133,0.1);border:1px solid rgba(251,113,133,0.2);border-radius:12px;padding:12px;text-align:center;">
            <div style="font-size:24px;font-weight:800;color:var(--rose);font-family:var(--font-m);">${overdueCount}</div>
            <div style="font-size:10px;color:var(--text-3);font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">Overdue</div>
          </div>
          <div style="background:rgba(251,191,36,0.1);border:1px solid rgba(251,191,36,0.2);border-radius:12px;padding:12px;text-align:center;">
            <div style="font-size:24px;font-weight:800;color:var(--gold);font-family:var(--font-m);">${upcomingCount}</div>
            <div style="font-size:10px;color:var(--text-3);font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">Upcoming</div>
          </div>
          <div style="background:rgba(52,211,153,0.1);border:1px solid rgba(52,211,153,0.2);border-radius:12px;padding:12px;text-align:center;">
            <div style="font-size:24px;font-weight:800;color:var(--emerald);font-family:var(--font-m);">${completedCount}</div>
            <div style="font-size:10px;color:var(--text-3);font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">Completed</div>
          </div>
        </div>
        <!-- List -->
        <div style="max-height:260px;overflow-y:auto;display:flex;flex-direction:column;gap:8px;margin-bottom:16px;">${listHtml}</div>
        <!-- Form -->
        <div style="border-top:1px solid var(--border);padding-top:16px;">${addForm}</div>
      </div>`;

    showSimpleModal('⏰ Reminders', modalContent);

    // Hook form handlers
    document.getElementById('cancelRemBtn').onclick = () => { document.getElementById('modals').innerHTML=''; renderNotifications(); };

    document.getElementById('addReminderForm').onsubmit = async (ev) => {
      ev.preventDefault();
      const id = pre.id || uid('rem');
      const obj = {
        id,
        title: document.getElementById('remTitle').value.trim(),
        dueDate: document.getElementById('remDate').value,
        time: document.getElementById('remTime').value || null,
        priority: document.getElementById('remPriority').value,
        tag: document.getElementById('remTag').value,
        category: document.getElementById('remCategory').value || '',
        linkedTransactionId: document.getElementById('remLinkedTx')?.value || null,
        recurrence: document.getElementById('remRecurrence').value,
        autoRepeat: document.getElementById('remAutoRepeat').checked,
        note: document.getElementById('remNote').value || '',
        completed: pre && pre.id ? (pre.completed || false) : false,
        lastAlerted: pre && pre.lastAlerted ? pre.lastAlerted : null,
        createdAt: pre && pre.createdAt ? pre.createdAt : new Date().toISOString()
      };
      await put('reminders', obj);
      state.reminders = state.reminders.filter(r => String(r.id) !== String(id));
      state.reminders.push(obj);
      await handleRecurringForReminder(obj);
      autoBackup();
      showToast('Reminder saved', 'success');
      renderNotifications();
      document.getElementById('modalCloseBtn')?.click?.();
    };

    // Delegated handlers inside modal
    const modalBody = document.querySelector('.modal-body') || document.body;
    modalBody.querySelectorAll('.payCcBillBtn').forEach(b => b.onclick = () => {
      document.getElementById('modalCloseBtn')?.click?.();
      if (window.LM_CreditCardsUI) {
        window.LM_CreditCardsUI.showPayBillModal(b.dataset.cardId);
      }
    });
    modalBody.querySelectorAll('.markDone').forEach(b => b.onclick = async () => { await toggleReminderCompleted(b.dataset.id); renderNotifications(); });
    modalBody.querySelectorAll('.snoozeBtn').forEach(b => b.onclick = async () => { await snoozeReminder(b.dataset.id, 1); renderNotifications(); });
    modalBody.querySelectorAll('.editRem').forEach(b => b.onclick = () => openEditReminderModal(b.dataset.id));
    modalBody.querySelectorAll('.delRem').forEach(b => b.onclick = async () => {
      if (!confirm('Delete reminder?')) return;
      await del('reminders', b.dataset.id);
      state.reminders = state.reminders.filter(r => String(r.id) !== String(b.dataset.id));
      autoBackup();
      showToast('Reminder deleted', 'success');
      showRemindersModal();
    });
  }

  // Recurring handling
  async function handleRecurringForReminder(rem) {
    if (!rem.autoRepeat || !rem.recurrence || rem.recurrence === 'none') return;
    const advance = (dateStr, recurrence) => {
      const d = new Date(dateStr + 'T00:00:00');
      switch (recurrence) {
        case 'daily': d.setDate(d.getDate() + 1); break;
        case 'weekly': d.setDate(d.getDate() + 7); break;
        case 'monthly': d.setMonth(d.getMonth() + 1); break;
        case 'yearly': d.setFullYear(d.getFullYear() + 1); break;
        default: return null;
      }
      return d.toISOString().slice(0,10);
    };
    const nextDate = advance(rem.dueDate, rem.recurrence);
    if (!nextDate) return;
    const exists = (state.reminders || []).some(r => r.title === rem.title && r.dueDate === nextDate && r.recurrence === rem.recurrence);
    if (!exists) {
      const newRem = { ...rem, id: uid('rem'), dueDate: nextDate, completed: false, createdAt: new Date().toISOString(), lastAlerted: null };
      await put('reminders', newRem);
      state.reminders.push(newRem);
    }
  }

  // ========== CRITICAL: Canonical Alert Cooldown & Time Gating ==========
  const DEFAULT_COOLDOWN_MS = 6 * 60 * 60 * 1000; // 6 hours default cooldown

  function canAlertTag(tag, cooldownMs = DEFAULT_COOLDOWN_MS) {
    if (!tag) return true;
    const storeKey = `lm_alert_${tag}`;
    const last = localStorage.getItem(storeKey);
    if (!last) return true;
    const diff = Date.now() - parseInt(last, 10);
    return diff > cooldownMs;
  }

  function markAlertTag(tag) {
    if (!tag) return;
    const storeKey = `lm_alert_${tag}`;
    localStorage.setItem(storeKey, Date.now().toString());
  }

  function isAllowedAlertTime(isUrgent = false) {
    const hour = new Date().getHours();
    if (isUrgent) return (hour >= 7 && hour <= 23); // Urgent dues can alert anytime 7 AM - 11 PM
    return (hour >= 8 && hour <= 22); // Normal alerts 8 AM - 10 PM
  }

  function sendBrowserNotification(title, message, opts) {
    /* Prefer LMPush if loaded (handles AndroidBridge, Edge Function + local fallback) */
    if (window.LMPush) {
      LMPush.notify(title, message, opts || {});
      return;
    }
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
    navigator.serviceWorker.ready.then(function (reg) {
      reg.showNotification(title, {
        body : message,
        icon : './assets/icons/icon-512.png',
        badge: './assets/icons/icon-512.png',
        tag  : (opts && opts.tag) || 'lm-notif',
        vibrate: [200, 100, 200],
        data : { url: (opts && opts.url) || './' }
      });
    }).catch(function () { new Notification(title, { body: message }); });
  }

  function enableNotifications() {
    if (window.LMPush) {
      LMPush.request();
      return;
    }
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') console.log('Notifications enabled.');
      });
    }
  }

  async function scheduleLocalNotification(timestamp, title, body, opts = {}) {
    if (!('serviceWorker' in navigator)) return false;
    try {
      const reg    = await navigator.serviceWorker.ready;
      const target = reg.active || reg.installing || reg.waiting;
      if (!target) return false;
      target.postMessage({
        type     : 'schedule-notification',
        timestamp: timestamp,
        title    : title,
        body     : body,
        tag      : opts.tag  || 'lm-notif',
        url      : opts.url  || './'
      });
      return true;
    } catch (e) { return false; }
  }

  // ========== CHECK ALL NOTIFICATIONS (Realtime Engine) ==========
  let _isCheckingNotifs = false;
  async function checkAllNotifications() {
    /* ── Guards: prevent concurrent checks & don't run before login or DB is ready ── */
    if (_isCheckingNotifs) return;
    if (window.LM_Auth && !window.LM_Auth.isLoggedIn()) return;
    if (!window.db) {
      setTimeout(checkAllNotifications, 1000);
      return;
    }

    _isCheckingNotifs = true;
    try {
      if (window.LM_CreditCardsService && typeof window.LM_CreditCardsService.syncReminders === 'function') {
        try {
          await window.LM_CreditCardsService.syncReminders();
        } catch (e) {
          console.warn('Notifications: syncReminders failed', e);
        }
      }

      try {
        const result = await getAll('reminders');
        state.reminders = Array.isArray(result) ? result.filter(r => r && typeof r === "object") : [];
      } catch (e) {
        console.warn('Notifications: DB read failed, retrying in 5s', e);
        setTimeout(checkAllNotifications, 5000);
        return;
      }

      const now = new Date();
      const notifications = [];

      // 1. Reminders & Bill Dues (Generic/Bills)
      for (const r of state.reminders) {
        if (r.completed) continue;

        // Filter out loan reminders so they are handled exclusively by the dedicated Loan section below
        const tagLower = (r.tag || '').toLowerCase();
        const titleLower = (r.title || '').toLowerCase();
        if (tagLower === 'loan' || titleLower.startsWith('loan due:') || titleLower.startsWith('loan:')) {
          continue;
        }

        const dueDateObj = parseDateTime(r.dueDate, r.time);
        if (!dueDateObj) continue;

        const isToday = dueDateObj.toDateString() === now.toDateString();
        const isOverdue = dueDateObj < now;
        const isUrgent = isOverdue || isToday || (r.priority === 'high');
        const canonicalTag = `lm_rem_${r.id}_${r.dueDate}`;

        if ((isOverdue || isToday) && canAlertTag(canonicalTag, 8 * 60 * 60 * 1000)) {
          const label = isOverdue ? '🚨 Overdue' : '🔔 Due Today';
          const timePart = r.time ? ` at ${r.time}` : '';
          const msg = `${label}: ${r.title} • ${r.dueDate}${timePart}`;
          const targetUrl = r.tag === 'Credit Card' ? './#page-credit-cards' : './#page-dashboard';

          notifications.push({
            title    : isOverdue ? 'Bill/Reminder Overdue!' : 'Reminder Due Today!',
            message  : msg,
            type     : isOverdue ? 'error' : 'warning',
            tag      : canonicalTag,
            url      : targetUrl,
            isOverdue: isOverdue,
            isUrgent : isUrgent,
            timestamp: dueDateObj.getTime()
          });

          markAlertTag(canonicalTag);
          r.lastAlerted = new Date().toISOString();
          await put('reminders', r);
        }
      }

      // 2. Personal Loans Due & Collection Alerts (Single canonical engine for loans)
      const loanGroups = {};
      (state.loans || []).forEach((loan) => {
        if (loan.collected || !loan.dueDate) return;
        const due      = new Date(loan.dueDate + 'T00:00:00');
        const diffDays = Math.floor((due - now) / (1000 * 60 * 60 * 24));
        if (diffDays > 3) return; // more than 3 days away — skip
        const personSlug = (loan.person || 'Contact').trim().replace(/\s+/g, '_');
        const key = `${personSlug}__${loan.type || 'given'}__${loan.dueDate}`;
        if (!loanGroups[key]) {
          loanGroups[key] = {
            person: loan.person || 'Contact',
            personSlug: personSlug,
            type: loan.type || 'given',
            dueDate: loan.dueDate,
            total: 0,
            diffDays
          };
        }
        loanGroups[key].total += Number(loan.amount || 0);
      });

      Object.values(loanGroups).forEach((g) => {
        const canonicalTag = `lm_loan_${g.type}_${g.personSlug}_${g.dueDate}`;
        if (!canAlertTag(canonicalTag, 8 * 60 * 60 * 1000)) return;

        const isOverdue  = g.diffDays < 0;
        const isToday    = g.diffDays === 0;
        const isTomorrow = g.diffDays === 1;
        const isCollect  = g.type === 'given';
        const direction  = isCollect ? 'Collect from' : 'Repay to';

        const statusLabel = isOverdue
          ? `${Math.abs(g.diffDays)} day(s) OVERDUE`
          : isToday    ? 'Due TODAY'
          : isTomorrow ? 'Due TOMORROW'
          : `Due in ${g.diffDays} days`;

        const alertTitle = isOverdue
          ? `🚨 Loan Overdue — ${direction} ${g.person}`
          : `🤝 Loan Due ${isToday ? 'Today' : 'Soon'} — ${direction} ${g.person}`;

        const msg = `${direction} ${g.person} · ${fmtINR(g.total)} ${statusLabel} (${g.dueDate})`;

        notifications.push({
          title    : alertTitle,
          message  : msg,
          type     : isOverdue ? 'error' : 'warning',
          tag      : canonicalTag,
          url      : './#page-wealth',
          isOverdue: isOverdue,
          isUrgent : isOverdue || isToday,
          timestamp: new Date(g.dueDate + 'T00:00:00').getTime()
        });
        markAlertTag(canonicalTag);
      });

      // 3. Credit Card Bill Due Alerts
      let cards = [];
      if (window.LM_CreditCardsService && typeof window.LM_CreditCardsService.getAllCards === 'function') {
        try { cards = window.LM_CreditCardsService.getAllCards(); } catch(e) {}
      } else if (Array.isArray(state.credit_cards)) {
        cards = state.credit_cards;
      }

      cards.forEach((card) => {
        const currentDue = Number(card.current_due || 0);
        if (currentDue <= 0) return;

        const dueInfo = window.LM_CreditCardsService?.getDueCountdown?.(card);
        if (!dueInfo || dueInfo.daysUntilDue === 999 || !dueInfo.nextDueDate) return;

        if (dueInfo.daysUntilDue <= 3) {
          const canonicalTag = `lm_cc_${card.id}_${dueInfo.nextDueDate}`;
          if (canAlertTag(canonicalTag, 8 * 60 * 60 * 1000)) {
            const isOverdue = dueInfo.daysUntilDue < 0;
            const isToday = dueInfo.daysUntilDue === 0;
            const isTomorrow = dueInfo.daysUntilDue === 1;
            const statusLabel = isOverdue
              ? `${Math.abs(dueInfo.daysUntilDue)} day(s) OVERDUE`
              : isToday ? 'Due TODAY'
              : isTomorrow ? 'Due TOMORROW'
              : `Due in ${dueInfo.daysUntilDue} days`;

            const alertTitle = isOverdue
              ? `🚨 Credit Card Bill Overdue — ${card.card_name || 'Card'}`
              : `💳 Credit Card Bill Due ${isToday ? 'Today' : 'Soon'} — ${card.card_name || 'Card'}`;

            const msg = `${card.card_name || 'Card'} (${card.bank_name || 'Bank'}) · ${fmtINR(currentDue)} ${statusLabel} (${dueInfo.nextDueDate})`;

            notifications.push({
              title    : alertTitle,
              message  : msg,
              type     : isOverdue ? 'error' : 'warning',
              tag      : canonicalTag,
              url      : './#page-credit-cards',
              isOverdue: isOverdue,
              isUrgent : isOverdue || isToday,
              timestamp: new Date(dueInfo.nextDueDate + 'T00:00:00').getTime()
            });

            markAlertTag(canonicalTag);
          }
        }
      });

      // 4. Budget Threshold Alerts (85% warning, 100% exceeded)
      try {
        const currentMonth = now.toISOString().slice(0, 7);
        const budgets = Array.isArray(state.budgets) ? state.budgets.filter(b => b.month === currentMonth) : [];
        budgets.forEach(b => {
          const limit = Number(b.amount || 0);
          if (limit <= 0) return;

          const spent = (state.transactions || [])
            .filter(t => t.type === 'expense' && t.date && t.date.startsWith(currentMonth) && t.category === b.category)
            .reduce((sum, t) => sum + Number(t.amount || 0), 0);

          const pct = Math.round((spent / limit) * 100);
          const catSlug = (b.category || 'General').replace(/\s+/g, '_');
          const tag100 = `lm_bgt_${catSlug}_100_${currentMonth}`;
          const tag85 = `lm_bgt_${catSlug}_85_${currentMonth}`;

          if (pct >= 100 && canAlertTag(tag100, 24 * 60 * 60 * 1000)) {
            notifications.push({
              title    : `🚨 Budget Exceeded: ${b.category}`,
              message  : `You have spent ${pct}% (${fmtINR(spent)} / ${fmtINR(limit)}) of your monthly ${b.category} budget!`,
              type     : 'error',
              tag      : tag100,
              url      : './#page-budgets',
              isOverdue: true,
              isUrgent : true,
              timestamp: now.getTime()
            });
            markAlertTag(tag100);
          } else if (pct >= 85 && pct < 100 && canAlertTag(tag85, 24 * 60 * 60 * 1000) && canAlertTag(tag100, 24 * 60 * 60 * 1000)) {
            notifications.push({
              title    : `⚠️ Budget Warning: ${b.category}`,
              message  : `You have reached ${pct}% (${fmtINR(spent)} / ${fmtINR(limit)}) of your monthly ${b.category} budget.`,
              type     : 'warning',
              tag      : tag85,
              url      : './#page-budgets',
              isOverdue: false,
              isUrgent : false,
              timestamp: now.getTime()
            });
            markAlertTag(tag85);
          }
        });
      } catch (e) {
        console.warn('Budget alert check failed:', e);
      }

      // 5. Sync active dues to Native AndroidBridge (for background workers & daily alarms when app is killed)
      try {
        if (window.AndroidBridge && typeof window.AndroidBridge.syncRemindersToNative === 'function') {
          const currentMonth = now.toISOString().slice(0, 7);
          const compiledBudgets = (Array.isArray(state.budgets) ? state.budgets.filter(b => b.month === currentMonth) : []).map(b => {
            const limit = Number(b.amount || 0);
            const spent = (state.transactions || [])
              .filter(t => t.type === 'expense' && t.date && t.date.startsWith(currentMonth) && t.category === b.category)
              .reduce((sum, t) => sum + Number(t.amount || 0), 0);
            const pct = limit > 0 ? Math.round((spent / limit) * 100) : 0;
            return {
              category: b.category,
              pct: pct,
              spent: spent,
              limit: limit,
              month: currentMonth
            };
          }).filter(b => b.pct >= 85);

          const compiledCards = (cards || []).map(card => {
            const dueInfo = window.LM_CreditCardsService?.getDueCountdown?.(card) || {};
            return {
              id: card.id,
              card_name: card.card_name || 'Credit Card',
              bank_name: card.bank_name || 'Bank',
              current_due: Number(card.current_due || 0),
              daysUntilDue: dueInfo.daysUntilDue ?? 999,
              nextDueDate: dueInfo.nextDueDate || ''
            };
          }).filter(c => c.current_due > 0 && c.daysUntilDue <= 3);

          const compiledLoans = Object.values(loanGroups).map((g) => ({
            id: `${g.type}_${g.personSlug}_${g.dueDate}`,
            person: g.person,
            type: g.type,
            total: g.total,
            diffDays: g.diffDays,
            dueDate: g.dueDate
          }));

          const filteredReminders = (state.reminders || [])
            .filter(r => !r.completed)
            .filter(r => {
              const tagLower = (r.tag || '').toLowerCase();
              const titleLower = (r.title || '').toLowerCase();
              return tagLower !== 'loan' && !titleLower.startsWith('loan due:') && !titleLower.startsWith('loan:');
            });

          const activeDuesPayload = {
            reminders: filteredReminders,
            creditCards: compiledCards,
            loans: compiledLoans,
            budgets: compiledBudgets
          };

          window.AndroidBridge.syncRemindersToNative(JSON.stringify(activeDuesPayload));
        }
      } catch (e) {
        console.warn('Native background sync failed:', e);
      }

      // 6. Process and Dispatch Notifications
      function processNotifications() {
        enableNotifications();
        const batch = notifications.splice(0, 2);
        batch.forEach((n) => {
          showToast(n.message, n.type);

          const pushAllowed = n.isUrgent || isAllowedAlertTime(n.isUrgent);
          if (!pushAllowed) return;

          const pushTag = n.tag || 'lm-notif';
          sendBrowserNotification(n.title, n.message, { tag: pushTag, url: n.url || './' });
          scheduleLocalNotification(n.timestamp, n.title, n.message, { tag: pushTag, url: n.url || './' });
        });
        if (notifications.length > 0) {
          setTimeout(processNotifications, 3500);
        }
      }

      if (notifications.length > 0) {
        processNotifications();
      }

      renderNotifications();
    } finally {
      _isCheckingNotifs = false;
    }
  }

  function debounce(fn, ms) {
    let t;
    return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
  }

  const throttledCheckNotifications = debounce(checkAllNotifications, 300);

  // ========== INIT & REALTIME LISTENERS ==========
  if (!window.__notifInit) {
    window.__notifInit = true;

    // Expose globals
    window.toggleNotifPanel    = toggleNotifPanel;
    window.renderNotifications = renderNotifications;
    window.showRemindersModal  = showRemindersModal;
    window.snoozeReminder      = snoozeReminder;
    window.toggleReminderCompleted = toggleReminderCompleted;
    window.checkAllNotifications   = checkAllNotifications;

    // Wire UI
    const bell = document.getElementById('notifBell');
    if (bell) bell.onclick = (e) => { e.stopPropagation(); toggleNotifPanel(); };

    document.getElementById('notifCloseBtn')?.addEventListener('click', closeNotifPanel);
    document.getElementById('notifBackdrop')?.addEventListener('click', closeNotifPanel);
    document.getElementById('markAllRead')?.addEventListener('click', markAllNotificationsSeen);
    document.getElementById('openRemindersBtn')?.addEventListener('click', () => {
      closeNotifPanel();
      showRemindersModal();
    });
    document.getElementById('notifTypeFilter')?.addEventListener('change', renderNotifications);
    document.getElementById('notifPriorityFilter')?.addEventListener('change', renderNotifications);
    document.getElementById('notifSearch')?.addEventListener('input', debounce(renderNotifications, 200));

    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeNotifPanel(); });

    // Initial check on app ready
    document.addEventListener('lm:app:ready', () => throttledCheckNotifications());

    // ── Realtime triggers ──
    // 1. Check every 5 minutes in background
    setInterval(throttledCheckNotifications, 5 * 60 * 1000);

    // 2. Check when user returns to app/tab
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        throttledCheckNotifications();
      }
    });
    window.addEventListener('focus', () => throttledCheckNotifications());

    // 3. Event-driven immediate updates from AppBus (throttled to prevent duplicate bursts)
    if (window.LM_Bus) {
      LM_Bus.on('lm:cloud:synced', () => throttledCheckNotifications());
      LM_Bus.on('lm:tx:added', () => throttledCheckNotifications());
      LM_Bus.on('lm:tx:deleted', () => throttledCheckNotifications());
      LM_Bus.on('lm:cc:paid', () => throttledCheckNotifications());
      LM_Bus.on('lm:card:updated', () => throttledCheckNotifications());
      LM_Bus.on('lm:loan:updated', () => throttledCheckNotifications());
      LM_Bus.on('lm:budget:updated', () => throttledCheckNotifications());
    }
  }

})();