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
        if (typeFilter !== 'all' && !(r.tag || 'reminder').toLowerCase().includes(typeFilter)) return false;
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
        linkedTransactionId: document.getElementById('remLinkedTx').value || null,
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

  // ========== CRITICAL: Loan cooldown & time gate ==========
  const LOAN_ALERT_COOLDOWN_MS = 8 * 60 * 60 * 1000; // 8 hours

  function canAlertLoanGroup(key) {
    const storeKey = `loanAlert_${key}`;
    const last = localStorage.getItem(storeKey);
    if (!last) return true;
    return (Date.now() - parseInt(last)) > LOAN_ALERT_COOLDOWN_MS;
  }

  function markLoanGroupAlerted(key) {
    const storeKey = `loanAlert_${key}`;
    localStorage.setItem(storeKey, Date.now().toString());
  }

  function isAllowedAlertTime() {
    const hour = new Date().getHours();
    return (hour >= 8 && hour <= 10) || (hour >= 18 && hour <= 21);
  }

  function sendBrowserNotification(title, message, opts) {
    /* Prefer LMPush if loaded (handles Edge Function + local fallback) */
    if (window.LMPush) {
      LMPush.notify(title, message, opts || {});
      return;
    }
    if (Notification.permission !== 'granted') return;
    navigator.serviceWorker.ready.then(function (reg) {
      reg.showNotification(title, {
        body : message,
        icon : './assets/icons/icon-512.png',
        badge: './assets/icons/icon-512.png',
        tag  : (opts && opts.tag) || 'lm-notif',
        data : { url: (opts && opts.url) || './' }
      });
    }).catch(function () { new Notification(title, { body: message }); });
  }

  function enableNotifications() {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') console.log('Notifications enabled.');
      });
    }
  }

  async function scheduleLocalNotification(timestamp, title, body, data = {}) {
    if (!('serviceWorker' in navigator)) return false;
    const reg = await navigator.serviceWorker.ready;
    reg.active.postMessage({ type: 'schedule-notification', timestamp, title, body, data });
    return true;
  }

  // ========== CHECK ALL NOTIFICATIONS (time‑gated, cooldown applied) ==========
    async function checkAllNotifications() {
    /* ── Guards: don't run before login or DB is ready ── */
    if (window.LM_Auth && !window.LM_Auth.isLoggedIn()) return;
    if (!window.db) {
      /* DB not open yet – retry; this path is rare post-login */
      setTimeout(checkAllNotifications, 1000);
      return;
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

    // 1. Reminders (existing logic)
    for (const r of state.reminders) {
      if (r.completed) continue;
      const dueDateObj = parseDateTime(r.dueDate, r.time);
      if (!dueDateObj) continue;
      const lastAlerted = r.lastAlerted ? new Date(r.lastAlerted) : null;
      const alreadyAlertedRecently = lastAlerted && ((now - lastAlerted) < (24 * 60 * 60 * 1000));
      const isToday = dueDateObj.toDateString() === now.toDateString();
      const isOverdue = dueDateObj < now;

      if ((isOverdue || isToday) && !alreadyAlertedRecently) {
        const label = isOverdue ? 'Overdue' : 'Due Today';
        const timePart = r.time ? ` at ${r.time}` : '';
        const msg = `🔔 ${label}: ${r.title} • ${r.dueDate}${timePart}`;
        notifications.push({ title: 'Reminder Due Soon!', message: msg, type: 'info', timestamp: dueDateObj.getTime() });
        r.lastAlerted = new Date().toISOString();
        await put('reminders', r);
      }
    }

    // 2. Loan due‑soon (with cooldown)
    const isDueSoon = (dueDate) => {
      if (!dueDate) return false;
      const due = new Date(dueDate);
      const diffDays = Math.floor((due - now) / (1000 * 60 * 60 * 24));
      return diffDays <= 3;
    };

    const loanGroups = {};
    (state.loans || []).forEach((loan) => {
      if (!loan.collected && loan.dueDate && isDueSoon(loan.dueDate)) {
        const key = `${loan.person}__${loan.type}__${loan.dueDate}`;
        if (!loanGroups[key]) {
          loanGroups[key] = { person: loan.person, type: loan.type, dueDate: loan.dueDate, total: 0 };
        }
        loanGroups[key].total += Number(loan.amount);
      }
    });

    Object.values(loanGroups).forEach((g) => {
      const groupKey = `${g.person}__${g.type}__${g.dueDate}`;
      if (!canAlertLoanGroup(groupKey)) return; // cooldown active

      const msg = `⚠️ Loan ${g.type === 'given' ? 'to Collect' : 'to Pay'}: ${fmtINR(g.total)} ${g.type === 'given' ? 'from' : 'to'} ${g.person} (Due: ${g.dueDate})`;
      notifications.push({ title: 'Loan Due Soon!', message: msg, type: 'error', timestamp: parseDateTime(g.dueDate)?.getTime() || Date.now() });
      markLoanGroupAlerted(groupKey);
    });

    // 3. Process notifications in batches, but only within allowed time window
    function processNotifications() {
      if (!isAllowedAlertTime()) return;   // ⛔ silent outside morning/evening

      enableNotifications();
      const batch = notifications.splice(0, 2);
      batch.forEach((n) => {
        showToast(n.message, n.type);
        if (n.title === "Loan Due Soon!" && canTriggerBrowserNotification("loan")) {
          sendBrowserNotification(n.title, n.message, { tag: 'lm-loan', url: './' });
        }
        if (n.title === "Reminder Due Soon!" && canTriggerBrowserNotification("reminder")) {
          sendBrowserNotification(n.title, n.message, { tag: 'lm-reminder', url: './' });
        }
        scheduleLocalNotification(n.timestamp, n.title, n.message);
      });
      if (notifications.length > 0) {
        setTimeout(processNotifications, 3500);
      }
    }

    if (notifications.length > 0) {
      processNotifications();
    }

    renderNotifications();
  }

  function canTriggerBrowserNotification(type) {
    const key = `lastNotif_${type}`;
    const last = localStorage.getItem(key);
    const now = Date.now();
    const TWELVE_HOURS = 12 * 60 * 60 * 1000; // 12 hours
    if (!last || now - parseInt(last, 10) > TWELVE_HOURS) {
      localStorage.setItem(key, now.toString());
      return true;
    }
    return false;
  }

  function debounce(fn, ms) {
    let t;
    return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
  }

  // ========== INIT ==========
  if (!window.__notifInit) {
    window.__notifInit = true;

    // Expose globals first so inline onclick handlers work
    window.toggleNotifPanel    = toggleNotifPanel;
    window.renderNotifications = renderNotifications;
    window.showRemindersModal  = showRemindersModal;
    window.snoozeReminder      = snoozeReminder;
    window.toggleReminderCompleted = toggleReminderCompleted;
    window.checkAllNotifications   = checkAllNotifications;

    // Wire UI — Notifications.js loads at bottom of body so DOM is ready
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

    document.addEventListener('lm:app:ready', () => checkAllNotifications());
  }

})();