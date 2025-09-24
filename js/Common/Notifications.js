/* ----------------------------
   Enhanced Notifications & Reminders (Detailed Dashboard)
   Features:
   - Rich notif panel with filters, search, groups
   - Reminders modal (summary cards, timeline, add/edit form)
   - Fields: linkedTransactionId, category, priority, tag, recurrence, time, autoRepeat
   - Actions: Mark Done, Snooze (1 day / custom), Edit, Delete
   - Inline + Toast alerts for due reminders (today/overdue) with lastAlerted tracking
   - Integrates with state.reminders, put/del, autoBackup()
   ----------------------------*/

(function () {
  // Ensure reminders array exists
  if (!Array.isArray(state.reminders)) state.reminders = [];

  // Utility: parse date+time into Date object (local)
  function parseDateTime(dateStr, timeStr) {
    if (!dateStr) return null;
    if (!timeStr) return new Date(dateStr);
    // timeStr expected "HH:MM" (24h)
    const [h, m] = (timeStr || '00:00').split(':').map(Number);
    const d = new Date(dateStr + 'T00:00:00');
    d.setHours(h, m, 0, 0);
    return d;
  }

  // Render notif count badge
  function updateNotifCountBadge() {
    const cnt = state.reminders.filter(r => !r.completed).length || 0;
    const el = document.getElementById('notifCount');
    if (el) el.textContent = cnt;
  }

  // Render notifications inside notifPanel
  /*async function renderNotifications() {
    const listEl = document.getElementById('notifList');
    if (!listEl) return;
    const typeFilter = document.getElementById('notifTypeFilter')?.value || 'all';
    const prFilter = document.getElementById('notifPriorityFilter')?.value || 'all';
    const search = (document.getElementById('notifSearch')?.value || '').toLowerCase();

    // Refresh state from DB to be safe
    try {
      state.reminders = await getAll('reminders');
    } catch (e) {
      console.warn('Failed to load reminders for notifications', e);
    }

    const now = new Date();
    // sort: overdue -> today -> upcoming -> completed
    const rows = (state.reminders || []).slice().sort((a,b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1;
      const da = parseDateTime(a.dueDate, a.time) || new Date('2100-01-01');
      const db = parseDateTime(b.dueDate, b.time) || new Date('2100-01-01');
      return da - db;
    }).filter(r => {
      if (typeFilter !== 'all' && (r.tag || 'reminder').toLowerCase().indexOf(typeFilter) === -1) return false;
      if (prFilter !== 'all' && (r.priority || 'medium').toLowerCase() !== prFilter) return false;
      if (search) {
        const hay = `${r.title} ${r.note || ''} ${r.tag || ''} ${r.category || ''}`.toLowerCase();
        if (hay.indexOf(search) === -1) return false;
      }
      return true;
    }).map(r => {
      const due = r.dueDate || 'N/A';
      const time = r.time ? ` • ${r.time}` : '';
      const dueDateObj = parseDateTime(r.dueDate, r.time);
      const isOverdue = !r.completed && dueDateObj && dueDateObj < now;
      const isDueToday = !r.completed && dueDateObj && (dueDateObj.toDateString() === now.toDateString());
      let bgClass = 'bg-slate-800/30';
      if (isOverdue) bgClass = 'bg-rose-900/30 border-rose-600';
      else if (isDueToday) bgClass = 'bg-amber-900/25 border-amber-600';
      else if (r.priority === 'high') bgClass = 'bg-rose-800/20 border-rose-500';
      else if (r.priority === 'low') bgClass = 'bg-slate-800/20 border-slate-600';
      const left = `
        <div>
          <div class="font-semibold ${isOverdue ? 'text-rose-300' : 'text-slate-100'}">${r.tag ? ' ' + r.tag + ' ' : ''} ${r.title}</div>
          <div class="text-xs text-slate-400">${due}${time} ${r.category? ' • ' + r.category : ''}</div>
          <div class="text-xs text-slate-400">${r.note || ''}</div>
        </div>
      `;
      const actions = `
        <div class="flex gap-1">
          <button class="markDone px-2 py-1 rounded text-xs ${r.completed ? 'bg-emerald-500' : 'bg-sky-600'}" data-id="${r.id}">${r.completed ? '✅' : '✓'}</button>
          <button class="snoozeBtn px-2 py-1 rounded text-xs glass/60" data-id="${r.id}">⏱</button>
          <button class="editRem px-2 py-1 rounded text-xs glass/60" data-id="${r.id}">✏️</button>
          <button class="delRem px-2 py-1 rounded text-xs bg-rose-500" data-id="${r.id}">🗑️</button>
        </div>
      `;
      return `<div class="p-3 rounded-lg border ${bgClass} flex justify-between items-start">${left}<div>${actions}</div></div>`;
    }).join('') || `<div class="text-center text-slate-400 text-sm">No notifications</div>`;

    listEl.innerHTML = rows;
    updateNotifCountBadge();

    // wire up delegated handlers
    listEl.querySelectorAll('.markDone').forEach(btn => {
      btn.onclick = async (ev) => {
        const id = btn.dataset.id;
        await toggleReminderCompleted(id);
      };
    });
    listEl.querySelectorAll('.snoozeBtn').forEach(btn => {
      btn.onclick = async (ev) => {
        const id = btn.dataset.id;
        await snoozeReminder(id, 1); // default 1 day; modal allows custom snooze later
      };
    });
    listEl.querySelectorAll('.editRem').forEach(btn => {
      btn.onclick = (ev) => {
        const id = btn.dataset.id;
        openEditReminderModal(id);
      };
    });
    listEl.querySelectorAll('.delRem').forEach(btn => {
      btn.onclick = async (ev) => {
        const id = btn.dataset.id;
        if (!confirm('Delete reminder?')) return;
        await del('reminders', id);
        state.reminders = state.reminders.filter(r => String(r.id) !== String(id));
        autoBackup();
        showToast('Reminder deleted', 'success');
        renderNotifications();
      };
    });

    // update summary
    const total = (state.reminders || []).length;
    const pending = (state.reminders || []).filter(r => !r.completed).length;
    const overdue = (state.reminders || []).filter(r => {
      const d = parseDateTime(r.dueDate, r.time);
      return !r.completed && d && d < now;
    }).length;
    document.getElementById('notifFilterSummary').textContent = `${pending} pending • ${overdue} overdue • ${total} total`;
  }*/ async function renderNotifications() {
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

      // Theme-aware card
      let bg = isDark ? 'bg-gray-800/70 border-gray-700' : 'bg-white/90 border-gray-200';
      if (r.completed) bg += ' opacity-70 line-through';

      // Determine left bar color (progressive indicator)
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
          <!-- left bar -->
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

  // Event handlers
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

  // Summary
  const total = (state.reminders || []).length;
  const pending = (state.reminders || []).filter(r => !r.completed).length;
  const overdue = (state.reminders || []).filter(r => {
    const d = parseDateTime(r.dueDate, r.time);
    return !r.completed && d && d < now;
  }).length;
  const summaryEl = document.getElementById('notifFilterSummary');
  if (summaryEl) summaryEl.textContent = `${pending} pending • ${overdue} overdue • ${total} total`;
}


  // Toggle panel visibility
  function toggleNotifPanel() {
    const p = document.getElementById('notifPanel');
    if (!p) return;
    if (p.classList.contains('hidden')) {
      p.classList.remove('hidden');
      renderNotifications();
    } else {
      p.classList.add('hidden');
    }
  }

  // Mark all read (we interpret as mark all reminders completed? Or mark all "seen" by adding lastAlerted — we'll mark seen)
  async function markAllNotificationsSeen() {
    const now = new Date().toISOString();
    for (const r of state.reminders) {
      r.lastSeen = now;
      await put('reminders', r);
    }
    showToast('Marked all notifications as seen', 'info');
    renderNotifications();
  }

  // Toggle completed for reminder
  async function toggleReminderCompleted(id) {
    const rem = state.reminders.find(r => String(r.id) === String(id));
    if (!rem) return;
    rem.completed = !rem.completed;
    rem.completedAt = rem.completed ? new Date().toISOString() : null;
    await put('reminders', rem);
    // If completed and had linked transaction logic optional — leave to user flows
    autoBackup();
    renderNotifications();
    showToast(rem.completed ? 'Marked done' : 'Marked pending', 'success');
  }

  // Snooze: shift dueDate by days (default 1)
  async function snoozeReminder(id, days = 1) {
    const rem = state.reminders.find(r => String(r.id) === String(id));
    if (!rem) return;
    try {
      const d = new Date(rem.dueDate || new Date().toISOString().slice(0,10));
      d.setDate(d.getDate() + Number(days));
      rem.dueDate = d.toISOString().slice(0,10);
      // clear lastAlerted so toast can re-fire later
      delete rem.lastAlerted;
      await put('reminders', rem);
      autoBackup();
      renderNotifications();
      showToast(`Snoozed ${rem.title} by ${days} day(s)`, 'info');
    } catch (e) {
      console.warn('snooze failed', e);
      showToast('Failed to snooze', 'error');
    }
  }

  // Open edit modal for a single reminder
  function openEditReminderModal(id) {
    const r = state.reminders.find(x => String(x.id) === String(id));
    showRemindersModal(r);
  }

  // Show Reminders Modal (Detailed Dashboard)
 async function showRemindersModal(prefill = null) {
  // Refresh state
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

  // Build HTML for reminders list
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

  // Prefill for edit
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


  // Basic recurring handling for a reminder (if autoRepeat true and recurrence set)
  async function handleRecurringForReminder(rem) {
    if (!rem.autoRepeat || !rem.recurrence || rem.recurrence === 'none') return;
    // ensure we have next future instance if missing
    // compute next date from rem.dueDate
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

  // Check and show toast alerts for due reminders
  async function checkAllNotifications() {
    // Load latest reminders
  try {
    const result = await getAll('reminders');
    state.reminders = Array.isArray(result) ? result.filter(r => r && typeof r === "object") : [];
  } catch (e) {
    console.warn('DB not ready, retrying in 1s', e);
    setTimeout(checkAllNotifications, 1000); // retry after 1s
    return;
  }
    const now = new Date();
    for (const r of state.reminders) {
      if (r.completed) continue;
      const dueDateObj = parseDateTime(r.dueDate, r.time);
      if (!dueDateObj) continue;
      // if overdue OR due today within hours, and not alerted in last 24h -> toast
      const lastAlerted = r.lastAlerted ? new Date(r.lastAlerted) : null;
      const alreadyAlertedRecently = lastAlerted && ((now - lastAlerted) < (24 * 60 * 60 * 1000)); // 24h
      const isToday = dueDateObj.toDateString() === now.toDateString();
      const isOverdue = dueDateObj < now;
      // Show toasts for overdue or due today (if not alerted recently)
      if ((isOverdue || isToday) && !alreadyAlertedRecently) {
        // Compose message
        const label = isOverdue ? 'Overdue' : 'Due Today';
        const timePart = r.time ? ` at ${r.time}` : '';
        showToast(`🔔 ${label}: ${r.title} • ${r.dueDate}${timePart}`, 'info', 8000);
        // update lastAlerted
        r.lastAlerted = new Date().toISOString();
        await put('reminders', r);
      }
    }
    renderNotifications();
  }

  // Wire header buttons / listeners (attach once)
  function wireNotifUIonce() {
    const bell = document.getElementById('notifBell');
    if (bell) bell.onclick = toggleNotifPanel;

    document.getElementById('notifTypeFilter')?.addEventListener('change', renderNotifications);
    document.getElementById('notifPriorityFilter')?.addEventListener('change', renderNotifications);
    document.getElementById('notifSearch')?.addEventListener('input', debounce(renderNotifications, 250));

    document.getElementById('markAllRead')?.addEventListener('click', markAllNotificationsSeen);
    document.getElementById('openRemindersBtn')?.addEventListener('click', () => { document.getElementById('notifPanel')?.classList.add('hidden'); showRemindersModal(); });
    document.getElementById('openAllReminders')?.addEventListener('click', showRemindersModal);
    document.getElementById('openAllNotifications')?.addEventListener('click', renderNotifications);

    // global click outside to close panel
    document.addEventListener('click', function (e) {
      const panel = document.getElementById('notifPanel');
      const bell = document.getElementById('notifBell');
      if (!panel || !bell) return;
      if (!panel.classList.contains('hidden')) {
        if (!panel.contains(e.target) && !bell.contains(e.target)) {
          panel.classList.add('hidden');
        }
      }
    });
  }

  // Small debounce helper
  function debounce(fn, ms) {
    let t;
    return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
  }

  // Initialize wiring and first render
  // Ensure we only attach once (idempotent)
  if (!window.__notifInit) {
    wireNotifUIonce();
    // hook into existing checkAllNotifications scheduling by replacing or calling original
    // Your init() already calls checkAllNotifications periodically — ensure our version is used
    window.checkAllNotifications = checkAllNotifications;
    // call once now
    //checkAllNotifications().catch(err => console.warn(err));
    setTimeout(checkAllNotifications, 1500);
    window.__notifInit = true;
  }

  // Expose for debug if needed
  window.renderNotifications = renderNotifications;
  window.showRemindersModal = showRemindersModal;
  window.snoozeReminder = snoozeReminder;
  window.toggleReminderCompleted = toggleReminderCompleted;

})();
