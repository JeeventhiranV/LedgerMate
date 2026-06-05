/* ── Global Smart Search ─────────────────────────────────────────────────── */
(function () {

  const STORES = [
    {
      key: 'transactions', icon: '💳', label: 'Transactions', page: 'transactions',
      maxResults: 6,
      match: (r, q) => hit(r, q, ['category','note','type','payee','description','tag']),
      title: r => r.payee || r.description || r.category || r.type || 'Transaction',
      sub:   r => `₹${fmt(r.amount)} · ${r.category || ''} · ${r.date || ''}`,
    },
    {
      key: 'budgets', icon: '📊', label: 'Budgets', page: 'budgets',
      maxResults: 4,
      match: (r, q) => hit(r, q, ['category','name','label']),
      title: r => r.category || r.name || r.label || 'Budget',
      sub:   r => `Limit ₹${fmt(r.limit || r.amount)} · ${r.period || 'monthly'}`,
    },
    {
      key: 'loans', icon: '🏦', label: 'Loans', page: 'loans',
      maxResults: 4,
      match: (r, q) => hit(r, q, ['name','lender','purpose','type','bank']),
      title: r => r.name || r.lender || r.bank || 'Loan',
      sub:   r => `₹${fmt(r.principal || r.amount || r.totalAmount)} · ${r.lender || ''}`,
    },
    {
      key: 'goals', icon: '🎯', label: 'Savings Goals', page: 'savings-goals',
      maxResults: 4,
      match: (r, q) => hit(r, q, ['name','description','category','label']),
      title: r => r.name || r.label || 'Goal',
      sub:   r => `₹${fmt(r.saved || r.current || 0)} / ₹${fmt(r.target || r.amount || 0)}`,
    },
    {
      key: 'reminders', icon: '🔔', label: 'Reminders', page: 'notifications',
      maxResults: 4,
      match: (r, q) => hit(r, q, ['title','note','tag','category']),
      title: r => r.title || 'Reminder',
      sub:   r => `${r.dueDate || 'No date'} · ${r.priority || 'medium'}`,
    },
    {
      key: 'notes', icon: '📝', label: 'Notes', page: 'notes',
      maxResults: 4,
      match: (r, q) => hit(r, q, ['title','content','body','text','preview']),
      title: r => r.title || 'Note',
      sub:   r => ((r.content || r.body || r.text || r.preview || '').slice(0, 70)) || '',
    },
    {
      key: 'subscriptions', icon: '🔄', label: 'Subscriptions', page: 'subscriptions',
      maxResults: 4,
      match: (r, q) => hit(r, q, ['name','category','vendor','service']),
      title: r => r.name || r.vendor || r.service || 'Subscription',
      sub:   r => `₹${fmt(r.amount)} / ${r.cycle || r.frequency || 'month'}`,
    },
    {
      key: 'investments', icon: '📈', label: 'Investments', page: 'investments',
      maxResults: 4,
      match: (r, q) => hit(r, q, ['name','type','broker','symbol','scheme']),
      title: r => r.name || r.symbol || r.scheme || 'Investment',
      sub:   r => `${r.type || ''} · ₹${fmt(r.currentValue || r.invested || r.amount || 0)}`,
    },
    {
      key: 'fd_rd', icon: '🏛️', label: 'FD / RD', page: 'investments',
      maxResults: 3,
      match: (r, q) => hit(r, q, ['bankName','label','type','bank']),
      title: r => r.label || r.bankName || r.bank || 'FD/RD',
      sub:   r => `₹${fmt(r.principal || r.amount || 0)} · ${r.bankName || r.bank || ''}`,
    },
    {
      key: 'tx_templates', icon: '📋', label: 'Templates', page: 'templates',
      maxResults: 3,
      match: (r, q) => hit(r, q, ['name','category','note','description']),
      title: r => r.name || 'Template',
      sub:   r => `₹${fmt(r.amount || 0)} · ${r.category || ''}`,
    },
  ];

  /* ── helpers ── */
  function fmt(n) {
    const num = Number(n || 0);
    if (isNaN(num)) return '0';
    return num.toLocaleString('en-IN');
  }

  function hit(r, query, fields) {
    const q = query.toLowerCase();
    return fields.some(f => (r[f] || '').toString().toLowerCase().includes(q));
  }

  function hl(text, query) {
    if (!text || !query) return text || '';
    const esc = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return text.toString().replace(
      new RegExp(`(${esc})`, 'gi'),
      '<mark class="srch-mark">$1</mark>'
    );
  }

  /* ── state ── */
  let _activeIdx = -1;
  let _flatResults = [];

  /* ── open / close ── */
  function openSearch() {
    const ov = document.getElementById('searchOverlay');
    if (!ov) return;
    ov.style.display = 'block';
    _activeIdx = -1;
    _flatResults = [];
    const inp = document.getElementById('srchInput');
    if (inp) { inp.value = ''; inp.focus(); }
    const res = document.getElementById('srchResults');
    if (res) res.innerHTML = emptyState();
  }

  function closeSearch() {
    const ov = document.getElementById('searchOverlay');
    if (ov) ov.style.display = 'none';
  }

  function emptyState() {
    return `<div class="srch-empty">
      <div style="font-size:32px;margin-bottom:8px">🔍</div>
      <div>Search transactions, goals, loans, notes, reminders and more</div>
      <div style="margin-top:6px;font-size:11px;opacity:.6">Type at least 2 characters</div>
    </div>`;
  }

  /* ── search ── */
  async function runSearch(query) {
    const q = (query || '').trim();
    const res = document.getElementById('srchResults');
    if (!res) return;

    if (q.length < 2) {
      res.innerHTML = emptyState();
      _flatResults = []; _activeIdx = -1;
      return;
    }

    const groups = [];
    for (const store of STORES) {
      let records = [];
      try { records = await getAll(store.key); } catch (_) {
        records = state[store.key] || [];
      }
      const hits = records.filter(r => store.match(r, q)).slice(0, store.maxResults);
      if (hits.length) groups.push({ store, hits });
    }

    if (!groups.length) {
      res.innerHTML = `<div class="srch-empty">
        <div style="font-size:28px;margin-bottom:8px">😶</div>
        <div>No results for <strong style="color:var(--text)">"${q}"</strong></div>
      </div>`;
      _flatResults = []; _activeIdx = -1;
      return;
    }

    _flatResults = [];
    groups.forEach(g => g.hits.forEach(r => _flatResults.push({ store: g.store, record: r })));
    _activeIdx = -1;

    let idx = 0;
    res.innerHTML = groups.map(({ store, hits }) => `
      <div class="srch-group">
        <div class="srch-group-label">${store.icon} ${store.label} <span class="srch-group-count">${hits.length}</span></div>
        ${hits.map(r => {
          const i = idx++;
          const title = store.title(r) || '';
          const sub   = store.sub(r)   || '';
          return `<div class="srch-item" data-idx="${i}" data-page="${store.page}">
            <div class="srch-item-icon">${store.icon}</div>
            <div class="srch-item-body">
              <div class="srch-item-title">${hl(title, q)}</div>
              ${sub ? `<div class="srch-item-sub">${sub}</div>` : ''}
            </div>
            <span class="srch-item-badge">${store.label}</span>
          </div>`;
        }).join('')}
      </div>`
    ).join('');

    res.querySelectorAll('.srch-item').forEach(el => {
      el.addEventListener('click', () => selectItem(el.dataset.page));
      el.addEventListener('mouseover', () => {
        _activeIdx = Number(el.dataset.idx);
        updateActive();
      });
    });
  }

  /* ── keyboard nav ── */
  function updateActive() {
    document.querySelectorAll('#srchResults .srch-item').forEach((el, i) => {
      el.classList.toggle('active', i === _activeIdx);
      if (i === _activeIdx) el.scrollIntoView({ block: 'nearest' });
    });
  }

  function navigate(dir) {
    if (!_flatResults.length) return;
    _activeIdx = (_activeIdx + dir + _flatResults.length) % _flatResults.length;
    updateActive();
  }

  function selectActive() {
    if (_activeIdx < 0 || !_flatResults[_activeIdx]) return;
    selectItem(_flatResults[_activeIdx].store.page);
  }

  function selectItem(page) {
    closeSearch();
    if (page === 'notifications') {
      if (typeof toggleNotifPanel === 'function') toggleNotifPanel();
    } else {
      if (typeof showPage === 'function') showPage(page);
    }
  }

  /* ── INIT ── */
  if (!window.__searchInit) {
    window.__searchInit = true;
    window.openSearch  = openSearch;
    window.closeSearch = closeSearch;

    document.getElementById('srchBackdrop')
      ?.addEventListener('click', closeSearch);

    const inp = document.getElementById('srchInput');
    if (inp) {
      const debouncedSearch = typeof debounce === 'function'
        ? debounce(() => runSearch(inp.value), 180)
        : () => runSearch(inp.value);

      inp.addEventListener('input', debouncedSearch);
      inp.addEventListener('keydown', e => {
        if (e.key === 'ArrowDown')  { e.preventDefault(); navigate(1); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); navigate(-1); }
        else if (e.key === 'Enter')   { e.preventDefault(); selectActive(); }
        else if (e.key === 'Escape')  { closeSearch(); }
      });
    }

    /* global keyboard triggers */
    document.addEventListener('keydown', e => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault(); openSearch();
      } else if (e.key === '/' && !['INPUT','TEXTAREA'].includes(document.activeElement?.tagName)) {
        e.preventDefault(); openSearch();
      } else if (e.key === 'Escape') {
        const ov = document.getElementById('searchOverlay');
        if (ov && ov.style.display !== 'none') closeSearch();
      }
    });
  }

})();
