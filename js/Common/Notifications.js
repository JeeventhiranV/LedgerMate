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

  // ========== RENDER NOTIFICATIONS (glass style) ==========
  async function renderNotifications() {
    const listEl = document.getElementById('notifList');
    if (!listEl) return;

    const typeFilter = document.getElementById('notifTypeFilter')?.value || 'all';
    const prFilter = document.getElementById('notifPriorityFilter')?.value || 'all';
    const search = (document.getElementById('notifSearch')?.value || '').toLowerCase();

    try { state.reminders = await getAll('reminders'); } 
    catch (e) { console.warn('Failed to load reminders', e); }

    const now = new Date();
    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    const rows = (state.reminders || [])
      .slice()
      .sort((a, b) => {
        if (a.completed !== b.completed) return a.completed ? 1 : -1;
        const da = parseDateTime(a.dueDate, a.time) || new Date('2100-01-01');
        const db = parseDateTime(b.dueDate, b.time) || new Date('2100-01-01');
        return da - db;
      })
      .filter(r => {
        if (typeFilter !== 'all' && (r.tag || 'reminder').toLowerCase().indexOf(typeFilter) === -1) return false;
        if (prFilter !== 'all' && (r.priority || 'medium').toLowerCase() !== prFilter) return false;
        if (search) {
          const hay = `${r.title} ${r.note || ''} ${r.tag || ''} ${r.category || ''}`.toLowerCase();
          return hay.indexOf(search) !== -1;
        }
        return true;
      })
      .map(r => {
        const due = r.dueDate || 'N/A';
        const time = r.time ? ` • ${r.time}` : '';
        const dueDateObj = parseDateTime(r.dueDate, r.time);
        const isOverdue = !r.completed && dueDateObj && dueDateObj < now;
        const isDueToday = !r.completed && dueDateObj && dueDateObj.toDateString() === now.toDateString();

        let bg = isDark ? 'bg-gray-800/70 border-gray-700' : 'bg-white/90 border-gray-200';
        if (r.completed) bg += ' opacity-70 line-through';

        let barColor = 'bg-gray-400';
        if (isOverdue) barColor = 'bg-red-500';
        else if (isDueToday) barColor = 'bg-amber-400';
        else if (r.priority === 'high') barColor = 'bg-red-400';
        else if (r.priority === 'low') barColor = 'bg-green-400';

        const textColor = isDark ? 'text-gray-100' : 'text-gray-900';
        const subTextColor = isDark ? 'text-gray-400' : 'text-gray-600';
        const overdueColor = 'text-red-300';

        const left = `
          <div class="flex gap-3">
            <div class="w-1 rounded h-full ${barColor}"></div>
            <div class="space-y-1">
              <div class="font-semibold ${isOverdue ? overdueColor : textColor}">
                ${r.tag ? `<span class="px-1 py-0.5 rounded bg-gray-700/50 text-xs">${r.tag}</span>` : ''} ${r.title}
              </div>
              <div class="text-xs ${subTextColor}">
                ${due}${time}${r.category ? ' • ' + r.category : ''}
              </div>
              <div class="text-xs ${subTextColor}">${r.note || ''}</div>
            </div>
          </div>
        `;

        const buttonBase = `px-2 py-1 rounded text-xs font-medium transition-colors duration-200`;
        const actions = `
          <div class="flex gap-1 mt-2">
            <button class="markDone ${buttonBase} ${r.completed ? 'bg-green-500 hover:bg-green-600' : 'bg-blue-500 hover:bg-blue-600'}" data-id="${r.id}">${r.completed ? '✅' : '✓'}</button>
            <button class="snoozeBtn ${buttonBase} ${isDark ? 'bg-gray-700/60 hover:bg-gray-600' : 'bg-gray-100/60 hover:bg-gray-200'}" data-id="${r.id}">⏱</button>
            <button class="editRem ${buttonBase} ${isDark ? 'bg-gray-700/60 hover:bg-gray-600' : 'bg-gray-100/60 hover:bg-gray-200'}" data-id="${r.id}">✏️</button>
            <button class="delRem ${buttonBase} bg-red-500 hover:bg-red-600" data-id="${r.id}">🗑️</button>
          </div>
        `;

        return `<div class="p-3 rounded-lg border ${bg} flex justify-between items-start shadow-sm">${left}<div>${actions}</div></div>`;
      })
      .join('') || `<div class="text-center ${isDark ? 'text-gray-400' : 'text-gray-600'} text-sm">No notifications</div>`;

    listEl.innerHTML = rows;
    updateNotifCountBadge();

    // Event delegation
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
        if (!confirm('Delete reminder?')) return;
        await del('reminders', btn.dataset.id);
        state.reminders = state.reminders.filter(r => String(r.id) !== String(btn.dataset.id));
        autoBackup();
        showToast('Reminder deleted', 'success');
        renderNotifications();
      };
    });

    // Summary line
    const total = (state.reminders || []).length;
    const pending = (state.reminders || []).filter(r => !r.completed).length;
    const overdue = (state.reminders || []).filter(r => {
      const d = parseDateTime(r.dueDate, r.time);
      return !r.completed && d && d < now;
    }).length;
    const summaryEl = document.getElementById('notifFilterSummary');
    if (summaryEl) summaryEl.textContent = `${pending} pending • ${overdue} overdue • ${total} total`;
  }
  window.toggleNotifPanel = function (e) {
  if (e) e.stopPropagation();
  const panel = document.getElementById('notifPanel');
  if (!panel) return;

  const isOpen = panel.classList.contains('show');
  if (!isOpen) {
    panel.classList.add('show');
    panel.style.display = 'flex';          // override inline none
    window.renderNotifications?.();
  } else {
    panel.classList.remove('show');
    panel.style.display = 'none';
  }
};

// Close button
document.getElementById('notifCloseBtn')?.addEventListener('click', (e) => {
  e.stopPropagation();
  const panel = document.getElementById('notifPanel');
  panel.classList.remove('show');
  panel.style.display = 'none';
});

// Close on backdrop click
document.getElementById('notifPanel')?.addEventListener('click', function(e) {
  if (e.target === this) {
    this.classList.remove('show');
    this.style.display = 'none';
  }
});

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
      const da = parseDateTime(a.dueDate, a.time) || new Date('2100-01-01');
      const db = parseDateTime(b.dueDate, b.time) || new Date('2100-01-01');
      if (a.completed !== b.completed) return a.completed ? 1 : -1;
      return da - db;
    });

    const now = new Date();
    const overdueCount = reminders.filter(r => !r.completed && parseDateTime(r.dueDate, r.time) && parseDateTime(r.dueDate, r.time) < now).length;
    const upcomingCount = reminders.filter(r => !r.completed && parseDateTime(r.dueDate, r.time) && parseDateTime(r.dueDate, r.time) >= now).length;
    const completedCount = reminders.filter(r => r.completed).length;

    const listHtml = reminders.map(r => {
      const due = r.dueDate || 'N/A';
      const time = r.time ? ` • ${r.time}` : '';
      const p = r.priority || 'medium';
      const priorityColor = p === 'high' ? 'text-rose-400' : p === 'low' ? 'text-emerald-400' : 'text-amber-300';
      const doneClass = r.completed ? 'opacity-60 line-through' : '';
      const linked = r.linkedTransactionId ? `<div class="text-xs text-[var(--text-muted)]">Linked TX: ${r.linkedTransactionId}</div>` : '';

      return `
        <div class="p-3 rounded-lg border" style="background: var(--glass-bg); border-color: var(--glass-border); ${doneClass}">
          <div class="flex justify-between items-start">
            <div>
              <div class="font-semibold text-[var(--text)]">
                ${r.title} ${r.tag ? `<span class="text-xs ml-2 rounded px-1 bg-[var(--glass-border)]">${r.tag}</span>` : ''}
              </div>
              <div class="text-xs text-[var(--text-muted)]">${due}${time} • ${r.category || 'No category'}</div>
              <div class="text-xs text-[var(--text-muted)]">${r.note || ''}</div>
              ${linked}
            </div>
            <div class="flex flex-col gap-2 items-end">
              <div class="text-xs ${priorityColor}">${p.charAt(0).toUpperCase() + p.slice(1)}</div>
              <div class="flex gap-1">
                <button class="markDone px-2 py-1 rounded ${r.completed ? 'bg-[var(--btn-green)]' : 'bg-[var(--btn-blue)]'} text-[var(--text)]" data-id="${r.id}">${r.completed ? '✅' : '✓'}</button>
                <button class="snoozeBtn px-2 py-1 rounded" style="background: var(--glass-bg); border: 1px solid var(--glass-border); color: var(--text);" data-id="${r.id}">⏱</button>
                <button class="editRem px-2 py-1 rounded" style="background: var(--glass-bg); border: 1px solid var(--glass-border); color: var(--text);" data-id="${r.id}">✏️</button>
                <button class="delRem px-2 py-1 rounded" style="background: var(--btn-red); color: var(--text);" data-id="${r.id}">🗑️</button>
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('') || `<div class="text-center text-[var(--text-muted)]">No reminders</div>`;

    const pre = prefill || {};
    const addForm = `
      <form id="addReminderForm" class="space-y-2 pt-3">
        <div class="grid grid-cols-2 gap-2">
          <input id="remTitle" required placeholder="Title" value="${pre.title || ''}" class="p-2 rounded border" style="background: var(--input-bg); color: var(--input-text); border-color: var(--input-border)"/>
          <select id="remTag" class="p-2 rounded border" style="background: var(--input-bg); color: var(--input-text); border-color: var(--input-border)">
            <option ${(!pre.tag)?'selected':''}>General</option>
            <option ${pre.tag==='Bills'?'selected':''}>Bills</option>
            <option ${pre.tag==='Loan'?'selected':''}>Loan</option>
            <option ${pre.tag==='Personal'?'selected':''}>Personal</option>
          </select>
        </div>
        <div class="grid grid-cols-3 gap-2">
          <input id="remDate" required type="date" value="${pre.dueDate || ''}" class="p-2 rounded border" style="background: var(--input-bg); color: var(--input-text); border-color: var(--input-border)"/>
          <input id="remTime" type="time" value="${pre.time || ''}" class="p-2 rounded border" style="background: var(--input-bg); color: var(--input-text); border-color: var(--input-border)"/>
          <select id="remPriority" class="p-2 rounded border" style="background: var(--input-bg); color: var(--input-text); border-color: var(--input-border)">
            <option value="high" ${pre.priority==='high'?'selected':''}>High</option>
            <option value="medium" ${(!pre.priority || pre.priority==='medium')?'selected':''}>Medium</option>
            <option value="low" ${pre.priority==='low'?'selected':''}>Low</option>
          </select>
        </div>
        <div class="grid grid-cols-2 gap-2">
          <input id="remCategory" placeholder="Category" value="${pre.category||''}" class="p-2 rounded border" style="background: var(--input-bg); color: var(--input-text); border-color: var(--input-border)"/>
          <input id="remLinkedTx" placeholder="Linked TX ID (optional)" value="${pre.linkedTransactionId||''}" class="p-2 rounded border" style="background: var(--input-bg); color: var(--input-text); border-color: var(--input-border)"/>
        </div>
        <div class="grid grid-cols-2 gap-2">
          <select id="remRecurrence" class="p-2 rounded border" style="background: var(--input-bg); color: var(--input-text); border-color: var(--input-border)">
            <option value="none" ${(!pre.recurrence || pre.recurrence==='none')?'selected':''}>No repeat</option>
            <option value="daily" ${pre.recurrence==='daily'?'selected':''}>Daily</option>
            <option value="weekly" ${pre.recurrence==='weekly'?'selected':''}>Weekly</option>
            <option value="monthly" ${pre.recurrence==='monthly'?'selected':''}>Monthly</option>
            <option value="yearly" ${pre.recurrence==='yearly'?'selected':''}>Yearly</option>
          </select>
          <label class="flex items-center gap-2 p-2 rounded border" style="background: var(--input-bg); color: var(--input-text); border-color: var(--input-border)">
            <input type="checkbox" id="remAutoRepeat" ${pre.autoRepeat ? 'checked' : ''}/>
            <span class="text-sm">Auto-repeat</span>
          </label>
        </div>
        <textarea id="remNote" placeholder="Note" class="w-full p-2 rounded border" style="background: var(--input-bg); color: var(--input-text); border-color: var(--input-border)">${pre.note||''}</textarea>
        <div class="flex gap-2">
          <button id="saveRemBtn" class="w-full py-2 rounded" style="background: var(--btn-green); color: var(--text);">Save Reminder</button>
          <button id="cancelRemBtn" type="button" class="w-full py-2 rounded" style="background: var(--glass-bg); border: 1px solid var(--glass-border); color: var(--text)">Close</button>
        </div>
      </form>
    `;

    const modalContent = `
      <div class="space-y-4">
        <div class="grid grid-cols-3 gap-2 text-center">
          <div class="p-3 rounded-lg" style="background: rgba(239, 68, 68, 0.2)"><div class="text-2xl font-bold text-rose-400">${overdueCount}</div><div class="text-xs text-[var(--text-muted)]">Overdue</div></div>
          <div class="p-3 rounded-lg" style="background: rgba(245, 158, 11, 0.2)"><div class="text-2xl font-bold text-amber-300">${upcomingCount}</div><div class="text-xs text-[var(--text-muted)]">Upcoming</div></div>
          <div class="p-3 rounded-lg" style="background: rgba(5, 150, 105, 0.2)"><div class="text-2xl font-bold text-emerald-400">${completedCount}</div><div class="text-xs text-[var(--text-muted)]">Completed</div></div>
        </div>
        <div class="space-y-2 max-h-80 overflow-y-auto">${listHtml}</div>
        <div class="pt-2 border-t border-[var(--glass-border)]">${addForm}</div>
      </div>
    `;

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

  function sendBrowserNotification(title, message) {
    if (Notification.permission === 'granted') {
      navigator.serviceWorker.ready.then(registration => {
        registration.showNotification(title, { body: message, icon: 'icons/icon-512.png' });
      });
    }
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
    try {
      const result = await getAll('reminders');
      state.reminders = Array.isArray(result) ? result.filter(r => r && typeof r === "object") : [];
    } catch (e) {
      console.warn('DB not ready, retrying in 1s', e);
      setTimeout(checkAllNotifications, 1000);
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
          sendBrowserNotification(n.title, n.message);
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

  // ========== UI wiring ==========
  function wireNotifUIonce() {
    const bell = document.getElementById('notifBell');
    if (bell) bell.onclick = toggleNotifPanel;

    document.getElementById('notifTypeFilter')?.addEventListener('change', renderNotifications);
    document.getElementById('notifPriorityFilter')?.addEventListener('change', renderNotifications);
    document.getElementById('notifSearch')?.addEventListener('input', debounce(renderNotifications, 250));

    document.getElementById('markAllRead')?.addEventListener('click', markAllNotificationsSeen);
    document.getElementById('openRemindersBtn')?.addEventListener('click', () => { 
      document.getElementById('notifPanel')?.classList.add('hidden'); 
      showRemindersModal(); 
    });
    document.getElementById('openAllReminders')?.addEventListener('click', showRemindersModal);
    document.getElementById('openAllNotifications')?.addEventListener('click', renderNotifications);

    // Close panel when clicking outside
    document.addEventListener('click', function(e) {
      const panel = document.getElementById('notifPanel');
      const drawer = panel?.children[0];
      const bell = document.getElementById('notifBell');
      if (!panel || !drawer || !bell) return;
      if (panel.style.display === 'flex') {
        if (!drawer.contains(e.target) && !bell.contains(e.target)) {
          panel.style.display = 'none';
        }
      }
    });
  }

  function debounce(fn, ms) {
    let t;
    return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
  }

  // ========== INIT ==========
  // Idempotent initialisation
  if (!window.__notifInit) {
    wireNotifUIonce();
    window.checkAllNotifications = checkAllNotifications;
    setTimeout(checkAllNotifications, 1500);
    window.__notifInit = true;
  }

  // Expose for external use
  window.renderNotifications = renderNotifications;
  window.showRemindersModal = showRemindersModal;
  window.snoozeReminder = snoozeReminder;
  window.toggleReminderCompleted = toggleReminderCompleted;

})();