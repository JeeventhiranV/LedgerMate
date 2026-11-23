/**
 * LedgerMate & Study Hub – AdminPanel.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Unified Admin Command Center:
 * - ⏳ Approvals Hub (access_requests table & inactive user_profiles)
 * - 👥 Users & Permissions Management (Role & Module Granular Access)
 * - 📚 Study Hub Administration (Weekly Goals, Module Permissions, SRS)
 * - 📊 Statistics & System Diagnostics
 * - 🔧 App Settings & Personalization
 * - 🗄️ Backup, Cloud Sync & Restore
 * - 🔔 Real-time Admin Notification Engine with Supabase Subscriptions & Topbar Badges
 * ─────────────────────────────────────────────────────────────────────────────
 */

(function () {
  'use strict';

  /* ══════════════════════════════════════════════════════
     MODULE DEFINITIONS
  ══════════════════════════════════════════════════════ */
  const ALL_MODULES = [
    { key: 'transactions', label: '↕️ Transactions' },
    { key: 'analytics',    label: '📈 Analytics'    },
    { key: 'gold',         label: '🏅 Gold Rates'   },
    { key: 'wealth',       label: '📊 Wealth'       },
    { key: 'essentials',   label: '🛡️ Essentials'  },
    { key: 'loans',        label: '💰 Loans'        },
    { key: 'investments',  label: '📈 Investments'  },
    { key: 'budgets',      label: '🎯 Budgets'      },
    { key: 'trips',        label: '✈️ Trips'        },
    { key: 'notes',        label: '📝 Notes'        },
    { key: 'credentials',  label: '🔐 Vault'        },
  ];

  const STUDY_MODULES = [
    { key: 'java',    label: '☕ Java Prep Kit'         },
    { key: 'dsa',     label: '🧠 DSA Master Hub'        },
    { key: 'react',   label: '⚛️ React Prep Hub'        },
    { key: 'hr',      label: '🤝 HR Questions'           },
    { key: 'ipk',     label: '📚 Interview Prep Kit'     },
    { key: 'tracker', label: '🎯 Interview Tracker'      },
    { key: 'dlt',     label: '📊 Daily Learning Tracker' },
    { key: 'ql',      label: '🔗 Quick Links Manager'    },
  ];

  /* ── State & Pagination ────────────────────────────── */
  let _activeTab       = 'approvals';
  let _approvalsSubTab = 'requests'; // 'requests' | 'users'
  let _approvalsFilter = 'pending';  // 'pending' | 'approved' | 'rejected' | 'all'
  let _userSearchQuery = '';
  let _userPage        = 0;
  let _userTotal       = 0;
  const PAGE_SIZE      = 10;

  let _requestsCache   = {};
  let _profilesCache   = {};
  let _realtimeChannel = null;
  let _pendingApprovalsCount = 0;

  function _getSb() {
    if (typeof window._supabase !== 'undefined' && window._supabase && typeof window._supabase.from === 'function') {
      return window._supabase;
    }
    if (typeof window.supabase !== 'undefined' && window.supabase && typeof window.supabase.from === 'function') {
      return window.supabase;
    }
    if (window.LM_Auth && typeof window.LM_Auth.getSupabaseClient === 'function') {
      return window.LM_Auth.getSupabaseClient();
    }
    return null;
  }

  function _notify(msg, type) {
    if (typeof showToast === 'function') {
      showToast(msg, type);
      return;
    }
    let toast = document.getElementById('lmAdminToast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'lmAdminToast';
      toast.style.cssText = 'position:fixed;bottom:24px;right:24px;z-index:2147483647;padding:12px 18px;border-radius:10px;font-size:13px;font-weight:600;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;box-shadow:0 8px 30px rgba(0,0,0,0.5);transition:all .3s cubic-bezier(.16,1,.3,1);transform:translateY(20px);opacity:0;pointer-events:none;';
      document.body.appendChild(toast);
    }
    const isErr = type === 'error';
    const isSucc = type === 'success';
    toast.style.background = isErr ? '#e11d48' : (isSucc ? '#059669' : '#1e293b');
    toast.style.color = '#ffffff';
    toast.style.border = isErr ? '1px solid rgba(255,255,255,0.2)' : (isSucc ? '1px solid rgba(255,255,255,0.2)' : '1px solid rgba(255,255,255,0.1)');
    toast.textContent = msg;
    toast.style.transform = 'translateY(0)';
    toast.style.opacity = '1';
    clearTimeout(toast._tm);
    toast._tm = setTimeout(() => {
      toast.style.transform = 'translateY(20px)';
      toast.style.opacity = '0';
    }, 3200);
  }

  function ensureAdminStyles() {
    // Styles are centralized in responsive-upgrades.css
    return;
  }

  function _isAdminUser() {
    if (window.LM_Auth && typeof window.LM_Auth.isAdmin === 'function') {
      return window.LM_Auth.isAdmin();
    }
    try {
      const sess = JSON.parse(localStorage.getItem('lm_session') || '{}');
      if (sess.role === 'admin' || (sess.user && sess.user.role === 'admin')) return true;
      const studyMeta = JSON.parse(localStorage.getItem('study_user_meta') || '{}');
      if (studyMeta.role === 'admin') return true;
      if (window._studyProfile && window._studyProfile.role === 'admin') return true;
      if (window._studyUser && window._studyUser.role === 'admin') return true;
      const email = (sess && (sess.email || sess.username)) ||
                    (studyMeta && studyMeta.email) ||
                    (window._studyUser && window._studyUser.email) ||
                    (window.LM_Auth && typeof window.LM_Auth.getCurrentUser === 'function' && window.LM_Auth.getCurrentUser()?.email) || '';
      if (email && email.toLowerCase() === 'vjeeventhiran01@gmail.com') return true;
    } catch (e) {}
    return false;
  }

  /* ══════════════════════════════════════════════════════
     ENTRY / EXIT
  ══════════════════════════════════════════════════════ */
  function showAdminPanel(initialTab) {
    if (!_isAdminUser()) {
      _notify('Access denied: Admin role required.', 'error');
      return;
    }
    ensureAdminStyles();
    _renderPanel(initialTab || _activeTab || 'approvals');
  }

  function closeAdminPanel() {
    document.getElementById('adminPanelOverlay')?.remove();
  }

  /* ══════════════════════════════════════════════════════
     PANEL SHELL (Accessible ARIA Container & Semantic Rail)
  ══════════════════════════════════════════════════════ */
  function _renderPanel(defaultTab) {
    document.getElementById('adminPanelOverlay')?.remove();

    const overlay = document.createElement('div');
    overlay.id = 'adminPanelOverlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'Admin Command Center');
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeAdminPanel();
    });

    overlay.innerHTML = `
<div id="adminPanel">
  <!-- Enterprise Header -->
  <header class="adm-header">
    <div class="adm-brand-group">
      <div class="adm-header-icon" aria-hidden="true">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="3"></circle>
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
        </svg>
      </div>
      <div class="adm-title-block">
        <div class="adm-title-row">
          <span class="adm-title">Admin Command Center</span>
          <span class="adm-env-pill">Unified Control</span>
        </div>
        <div class="adm-sub">Governance · Access Approvals · RBAC Permissions · System Telemetry</div>
      </div>
    </div>
    <div class="adm-header-actions">
      <button onclick="window.LM_Admin.refreshCurrentTab()" class="adm-btn adm-btn-sm" title="Refresh current view" aria-label="Refresh Data">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <polyline points="23 4 23 10 17 10"></polyline>
          <polyline points="1 20 1 14 7 14"></polyline>
          <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
        </svg>
        <span>Refresh</span>
      </button>
      <button onclick="window.LM_Admin.close()" class="adm-btn adm-btn-icon" title="Close console (Esc)" aria-label="Close Admin Panel">✕</button>
    </div>
  </header>

  <!-- Navigation Tab Rail -->
  <div class="adm-body">
    <nav class="adm-nav-rail" role="tablist" aria-label="Admin Navigation Tabs">
      <button class="adm-tab-btn ${defaultTab==='approvals'?'active':''}" id="tab-btn-approvals" data-tab="approvals" role="tab" aria-selected="${defaultTab==='approvals'}" aria-controls="adminContent" onclick="window.LM_Admin.switchTab('approvals')">
        <span>⏳ Approvals</span>
        <span id="adminApprovalsTabBadge" class="adm-tab-badge" style="${_pendingApprovalsCount>0?'':'display:none;'}">${_pendingApprovalsCount}</span>
      </button>
      <button class="adm-tab-btn ${defaultTab==='users'?'active':''}" id="tab-btn-users" data-tab="users" role="tab" aria-selected="${defaultTab==='users'}" aria-controls="adminContent" onclick="window.LM_Admin.switchTab('users')">
        <span>👥 Users &amp; Permissions</span>
      </button>
      <button class="adm-tab-btn ${defaultTab==='study'?'active':''}" id="tab-btn-study" data-tab="study" role="tab" aria-selected="${defaultTab==='study'}" aria-controls="adminContent" onclick="window.LM_Admin.switchTab('study')">
        <span>📚 Study Hub</span>
      </button>
      <button class="adm-tab-btn ${defaultTab==='stats'?'active':''}" id="tab-btn-stats" data-tab="stats" role="tab" aria-selected="${defaultTab==='stats'}" aria-controls="adminContent" onclick="window.LM_Admin.switchTab('stats')">
        <span>📊 Statistics</span>
      </button>
      <button class="adm-tab-btn ${defaultTab==='appsettings'?'active':''}" id="tab-btn-appsettings" data-tab="appsettings" role="tab" aria-selected="${defaultTab==='appsettings'}" aria-controls="adminContent" onclick="window.LM_Admin.switchTab('appsettings')">
        <span>🔧 App Settings</span>
      </button>
      <button class="adm-tab-btn ${defaultTab==='backup'?'active':''}" id="tab-btn-backup" data-tab="backup" role="tab" aria-selected="${defaultTab==='backup'}" aria-controls="adminContent" onclick="window.LM_Admin.switchTab('backup')">
        <span>🗄️ Backup &amp; Sync</span>
      </button>
    </nav>

    <!-- Main Viewport Area -->
    <main class="adm-content" id="adminContent" role="tabpanel" aria-labelledby="tab-btn-${defaultTab || 'approvals'}"></main>
  </div>
</div>`;

    document.body.appendChild(overlay);
    _switchTab(defaultTab || 'approvals');
    _bindTabKeyNav();
  }

  /* ── Tab Keyboard Navigation (Left/Right Arrow Keys) ───── */
  function _bindTabKeyNav() {
    const tabs = Array.from(document.querySelectorAll('.adm-tab-btn'));
    tabs.forEach((tab, index) => {
      tab.addEventListener('keydown', (e) => {
        let targetIndex = -1;
        if (e.key === 'ArrowRight') targetIndex = (index + 1) % tabs.length;
        if (e.key === 'ArrowLeft')  targetIndex = (index - 1 + tabs.length) % tabs.length;
        if (targetIndex !== -1) {
          e.preventDefault();
          tabs[targetIndex].focus();
          tabs[targetIndex].click();
        }
      });
    });
  }

  /* ══════════════════════════════════════════════════════
     TAB SWITCHER
  ══════════════════════════════════════════════════════ */
  function _switchTab(tab) {
    _activeTab = tab;
    document.querySelectorAll('.adm-tab-btn').forEach(b => {
      const isTarget = b.dataset.tab === tab || b.id === `tab-btn-${tab}`;
      b.classList.toggle('active', isTarget);
      b.setAttribute('aria-selected', isTarget ? 'true' : 'false');
    });

    const content = document.getElementById('adminContent');
    if (!content) return;
    content.setAttribute('aria-labelledby', `tab-btn-${tab}`);

    switch (tab) {
      case 'approvals':   _renderApprovalsTab(content);   break;
      case 'users':       _renderUsersTab(content);       break;
      case 'study':       _renderStudyTab(content);       break;
      case 'stats':       _renderStats(content);          break;
      case 'appsettings': content.innerHTML = _tabAppSettings(); break;
      case 'backup':      content.innerHTML = _tabBackup(); break;
    }
  }

  function _refreshCurrentTab() {
    _switchTab(_activeTab || 'approvals');
    _syncPendingCounts();
  }

  /* ══════════════════════════════════════════════════════
     TAB 1: APPROVALS HUB (access_requests & user_profiles)
  ══════════════════════════════════════════════════════ */
  async function _renderApprovalsTab(container) {
    container.innerHTML = `
<div class="adm-section-header">
  <div>
    <div class="adm-section-title">User Access &amp; Approvals Hub</div>
    <div class="adm-section-sub">Review incoming registration requests and grant granular module access.</div>
  </div>
  <div style="display:flex;gap:8px;align-items:center;">
    <button class="adm-btn adm-btn-success" onclick="window.LM_Admin.batchApproveAllPending()">
      <span>⚡ Approve All Pending</span>
    </button>
  </div>
</div>

<!-- Toolbar: Sub-tabs & Filter Controls -->
<div class="adm-toolbar">
  <div class="adm-filter-group" role="group" aria-label="Approvals Directory Type">
    <button class="adm-filter-pill ${_approvalsSubTab==='requests'?'active':''}" onclick="window.LM_Admin.setApprovalsSubTab('requests')">
      📝 Access Requests (Public)
    </button>
    <button class="adm-filter-pill ${_approvalsSubTab==='users'?'active':''}" onclick="window.LM_Admin.setApprovalsSubTab('users')">
      👥 Pending Accounts (DB)
    </button>
  </div>

  <div class="adm-filter-group" role="group" aria-label="Status Filters">
    <span style="font-size:11px;font-weight:700;color:var(--adm-text-muted);text-transform:uppercase;">Filter:</span>
    <button class="adm-filter-pill ${_approvalsFilter==='pending'?'active':''}" onclick="window.LM_Admin.setApprovalsFilter('pending')">Pending</button>
    <button class="adm-filter-pill ${_approvalsFilter==='approved'?'active':''}" onclick="window.LM_Admin.setApprovalsFilter('approved')">Approved</button>
    <button class="adm-filter-pill ${_approvalsFilter==='rejected'?'active':''}" onclick="window.LM_Admin.setApprovalsFilter('rejected')">Rejected</button>
    <button class="adm-filter-pill ${_approvalsFilter==='all'?'active':''}" onclick="window.LM_Admin.setApprovalsFilter('all')">All</button>
  </div>
</div>

<div id="approvalsListArea" aria-live="polite">
  <div class="adm-skeleton-row"></div>
  <div class="adm-skeleton-row"></div>
  <div class="adm-skeleton-row"></div>
</div>`;

    await _loadApprovalsData();
  }

  function _setApprovalsSubTab(subTab) {
    _approvalsSubTab = subTab;
    const content = document.getElementById('adminContent');
    if (content) _renderApprovalsTab(content);
  }

  function _setApprovalsFilter(filter) {
    _approvalsFilter = filter;
    const content = document.getElementById('adminContent');
    if (content) _renderApprovalsTab(content);
  }

  async function _loadApprovalsData() {
    const area = document.getElementById('approvalsListArea');
    if (!area) return;

    const sb = _getSb();
    if (!sb) {
      area.innerHTML = `
<div class="adm-empty-state">
  <div class="adm-empty-icon">⚠️</div>
  <div class="adm-empty-title">Database Client Unavailable</div>
  <div class="adm-empty-desc">Could not connect to Supabase backend service. Please check configuration.</div>
</div>`;
      return;
    }

    if (_approvalsSubTab === 'requests') {
      try {
        let query = sb.from('access_requests').select('*').order('created_at', { ascending: false });
        if (_approvalsFilter !== 'all') {
          query = query.eq('status', _approvalsFilter);
        }
        const { data, error } = await query;
        if (error) throw error;
        _requestsCache = {};
        (data || []).forEach(r => { if (r && r.id) _requestsCache[r.id] = r; });
        _renderAccessRequestsList(area, data || []);
      } catch (err) {
        area.innerHTML = `
<div class="adm-empty-state">
  <div class="adm-empty-icon">❌</div>
  <div class="adm-empty-title">Failed to Load Access Requests</div>
  <div class="adm-empty-desc">${_esc(err.message)}</div>
  <button class="adm-btn adm-btn-sm" onclick="window.LM_Admin.refreshCurrentTab()" style="margin-top:12px;">Retry</button>
</div>`;
      }
    } else {
      try {
        let query = sb.from('user_profiles').select('*').order('created_at', { ascending: false });
        if (_approvalsFilter === 'pending') {
          query = query.eq('active', false);
        } else if (_approvalsFilter === 'approved') {
          query = query.eq('active', true);
        }
        const { data, error } = await query;
        if (error) throw error;
        _profilesCache = {};
        (data || []).forEach(p => { if (p && p.id) _profilesCache[p.id] = p; });
        _renderPendingUserProfilesList(area, data || []);
      } catch (err) {
        area.innerHTML = `
<div class="adm-empty-state">
  <div class="adm-empty-icon">❌</div>
  <div class="adm-empty-title">Failed to Load Pending Accounts</div>
  <div class="adm-empty-desc">${_esc(err.message)}</div>
  <button class="adm-btn adm-btn-sm" onclick="window.LM_Admin.refreshCurrentTab()" style="margin-top:12px;">Retry</button>
</div>`;
      }
    }
  }

  function _renderAccessRequestsList(area, requests) {
    if (!requests || requests.length === 0) {
      area.innerHTML = `
<div class="adm-empty-state">
  <div class="adm-empty-icon">📋</div>
  <div class="adm-empty-title">No Access Requests Found</div>
  <div class="adm-empty-desc">No incoming registration requests match the active filter "${_esc(_approvalsFilter)}".</div>
</div>`;
      return;
    }

    const cards = requests.map(req => {
      const isPending  = req.status === 'pending';
      const isApproved = req.status === 'approved';
      const isRejected = req.status === 'rejected';

      const initial = (req.name || req.email || '?').charAt(0).toUpperCase();
      const appBadge = req.app === 'study' ? '📚 Study Hub' : (req.app === 'ledger' || req.app === 'finance' ? '💰 LedgerMate' : '🌐 All Modules');
      const timeStr  = req.created_at ? new Date(req.created_at).toLocaleString() : 'Recent';

      const statusBadge = isPending
        ? '<span class="adm-badge adm-badge-pending">⏳ Pending Review</span>'
        : isApproved
          ? '<span class="adm-badge adm-badge-active">✅ Approved</span>'
          : '<span class="adm-badge adm-badge-danger">❌ Rejected</span>';

      return `
<div class="adm-data-card" style="border-left: 3px solid ${isPending ? 'var(--adm-warning)' : (isApproved ? 'var(--adm-success)' : 'var(--adm-danger)')};">
  <div class="adm-card-header">
    <div style="display:flex;gap:12px;align-items:center;min-width:0;">
      <div style="width:38px;height:38px;border-radius:50%;background:var(--adm-brand-subtle);border:1px solid var(--adm-brand-border);display:flex;align-items:center;justify-content:center;font-weight:700;color:var(--adm-brand);font-size:14px;flex-shrink:0;">
        ${initial}
      </div>
      <div style="min-width:0;">
        <div style="font-weight:700;color:var(--adm-text-primary);font-size:13.5px;display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
          <span>${_esc(req.name || (req.email ? req.email.split('@')[0] : 'Applicant'))}</span>
          <span class="adm-badge" style="background:var(--adm-surface-3);color:var(--adm-text-secondary);">${appBadge}</span>
        </div>
        <div class="adm-card-meta" style="margin-top:2px;">
          <span>✉️ ${_esc(req.email)}</span>
          <span>🕒 ${timeStr}</span>
        </div>
      </div>
    </div>
    <div>${statusBadge}</div>
  </div>

  ${req.message ? `<div style="background:var(--adm-surface-3);border:1px solid var(--adm-border);border-radius:8px;padding:9px 12px;font-size:12px;color:var(--adm-text-secondary);line-height:1.5;">💬 <em>"${_esc(req.message)}"</em></div>` : ''}

  <div class="adm-card-actions">
    <div style="font-size:11.5px;color:var(--adm-text-muted);flex:1 1 180px;">
      ${req.reviewed_at ? `Reviewed: ${new Date(req.reviewed_at).toLocaleDateString()}` : 'Awaiting admin decision'}
    </div>
    <div style="display:flex;gap:6px;flex-wrap:wrap;">
      ${isPending ? `
        <button class="adm-btn adm-btn-success adm-btn-sm" onclick="window.LM_Admin.openApproveRequestModal('${req.id}')">
          ✨ Approve &amp; Configure
        </button>
        <button class="adm-btn adm-btn-danger adm-btn-sm" onclick="window.LM_Admin.rejectAccessRequest('${req.id}')">
          ❌ Reject
        </button>
      ` : ''}
      ${isApproved ? `
        <button class="adm-btn adm-btn-sm" onclick="window.LM_Admin.openApproveRequestModal('${req.id}')">
          ⚙️ Reconfigure Access
        </button>
      ` : ''}
      ${isRejected ? `
        <button class="adm-btn adm-btn-success adm-btn-sm" onclick="window.LM_Admin.openApproveRequestModal('${req.id}')">
          🔄 Re-Approve
        </button>
      ` : ''}
      <button class="adm-btn adm-btn-sm" style="color:var(--adm-danger);" onclick="window.LM_Admin.deleteAccessRequest('${req.id}')" title="Delete request record">
        🗑
      </button>
    </div>
  </div>
</div>`;
    }).join('');

    area.innerHTML = cards;
  }

  function _renderPendingUserProfilesList(area, profiles) {
    if (!profiles || profiles.length === 0) {
      area.innerHTML = `
<div class="adm-empty-state">
  <div class="adm-empty-icon">👥</div>
  <div class="adm-empty-title">No Database Accounts Match Filter</div>
  <div class="adm-empty-desc">No registered user profiles found for filter "${_esc(_approvalsFilter)}".</div>
</div>`;
      return;
    }

    const cards = profiles.map(u => {
      const initial = (u.display_name || u.email || '?').charAt(0).toUpperCase();
      const isPending = !u.active;

      return `
<div class="adm-data-card" style="border-left: 3px solid ${isPending ? 'var(--adm-warning)' : 'var(--adm-success)'};">
  <div class="adm-card-header">
    <div style="display:flex;gap:12px;align-items:center;min-width:0;">
      <div style="width:38px;height:38px;border-radius:50%;background:var(--adm-brand-subtle);border:1px solid var(--adm-brand-border);display:flex;align-items:center;justify-content:center;font-weight:700;color:var(--adm-brand);font-size:14px;flex-shrink:0;">
        ${initial}
      </div>
      <div style="min-width:0;">
        <div style="font-weight:700;color:var(--adm-text-primary);font-size:13.5px;display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
          <span>${_esc(u.display_name || (u.email ? u.email.split('@')[0] : 'User'))}</span>
          <span class="adm-badge ${u.role==='admin'?'adm-badge-admin':'adm-badge-user'}">${u.role || 'user'}</span>
        </div>
        <div class="adm-card-meta" style="margin-top:2px;">
          <span>✉️ ${_esc(u.email)}</span>
          <span>Joined: ${new Date(u.created_at).toLocaleDateString()}</span>
        </div>
      </div>
    </div>
    <div>
      <span class="adm-badge ${u.active?'adm-badge-active':'adm-badge-pending'}">${u.active ? 'Active' : 'Pending Activation'}</span>
    </div>
  </div>

  <div class="adm-card-actions">
    <div style="font-size:11.5px;color:var(--adm-text-muted);flex:1 1 180px;">
      Study Modules: ${u.study_modules === null ? 'All' : (Array.isArray(u.study_modules) ? u.study_modules.length + ' allowed' : 'Default')}
    </div>
    <div style="display:flex;gap:6px;flex-wrap:wrap;">
      ${!u.active ? `
        <button class="adm-btn adm-btn-success adm-btn-sm" onclick="window.LM_Admin.approveUser('${u.id}')">✅ Quick Activate</button>
        <button class="adm-btn adm-btn-sm" onclick="window.LM_Admin.openConfigureUserModal('${u.id}')">
          ⚙️ Configure Access
        </button>
      ` : `
        <button class="adm-btn adm-btn-warning adm-btn-sm" onclick="window.LM_Admin.deactivateUser('${u.id}')">⏸ Pause Access</button>
      `}
    </div>
  </div>
</div>`;
    }).join('');

    area.innerHTML = cards;
  }

  /* ── Approve Access Request Modal ──────────────────── */
  function _openApproveRequestModal(requestId, fallbackName, fallbackEmail, fallbackApp) {
    document.getElementById('lm-approval-modal')?.remove();

    const req = _requestsCache[requestId] || {};
    const name = req.name || fallbackName || 'Applicant';
    const email = req.email || fallbackEmail || '';
    const appType = req.app || fallbackApp || 'all';

    const isStudyPrechecked = appType === 'study' || appType === 'all';
    const isLedgerPrechecked = appType === 'ledger' || appType === 'finance' || appType === 'all';

    const financeCheckboxes = ALL_MODULES.map(m => `
<label class="adm-checkbox-item">
  <input type="checkbox" id="req_fin_${m.key}" value="${m.key}" ${isLedgerPrechecked ? 'checked' : ''}>
  <span>${m.label}</span>
</label>`).join('');

    const studyCheckboxes = STUDY_MODULES.map(m => `
<label class="adm-checkbox-item">
  <input type="checkbox" id="req_std_${m.key}" value="${m.key}" ${isStudyPrechecked ? 'checked' : ''}>
  <span>${m.label}</span>
</label>`).join('');

    const modal = document.createElement('div');
    modal.id = 'lm-approval-modal';
    modal.className = 'adm-submodal-overlay';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-label', 'Approve Access Request');
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.remove();
    });

    modal.innerHTML = `
<div class="adm-submodal-panel" style="max-width:540px;">
  <div class="adm-submodal-header">
    <div class="adm-submodal-title">✨ Approve &amp; Configure User Access</div>
    <button class="adm-btn adm-btn-icon adm-btn-sm" onclick="document.getElementById('lm-approval-modal')?.remove()" aria-label="Close dialog">✕</button>
  </div>

  <div style="background:var(--adm-surface-2);border:1px solid var(--adm-border);border-radius:10px;padding:12px;margin-bottom:16px;">
    <div style="font-size:13.5px;font-weight:700;color:var(--adm-text-primary);">${_esc(name)}</div>
    ${email ? `<div style="font-size:12px;color:var(--adm-text-muted);margin-top:2px;">${_esc(email)}</div>` : ''}
  </div>

  <div class="adm-form-group" style="margin-bottom:14px;">
    <label class="adm-label">Assign Role</label>
    <select id="req_role_select" class="adm-input">
      <option value="user" selected>👤 Normal User (Restricted to granted modules)</option>
      <option value="admin">⭐ Full Administrator (Full System Access)</option>
    </select>
  </div>

  <div style="margin-bottom:16px;">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
      <label class="adm-label" style="margin:0;">💰 LedgerMate Finance Modules</label>
      <button class="adm-btn adm-btn-sm" style="font-size:11px;padding:3px 8px;" onclick="document.querySelectorAll('[id^=req_fin_]').forEach(c=>c.checked=true)">Select All</button>
    </div>
    <div class="adm-checkbox-grid" style="max-height:130px;">${financeCheckboxes}</div>
  </div>

  <div style="margin-bottom:18px;">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
      <label class="adm-label" style="margin:0;">📚 Study Hub Prep Modules</label>
      <button class="adm-btn adm-btn-sm" style="font-size:11px;padding:3px 8px;" onclick="document.querySelectorAll('[id^=req_std_]').forEach(c=>c.checked=true)">Select All</button>
    </div>
    <div class="adm-checkbox-grid" style="max-height:130px;">${studyCheckboxes}</div>
  </div>

  <div id="approveModalErr" style="display:none;color:var(--adm-danger);font-size:12px;margin-bottom:12px;padding:8px 12px;background:var(--adm-danger-subtle);border:1px solid var(--adm-danger-border);border-radius:8px;"></div>

  <div class="adm-submodal-actions">
    <button class="adm-btn" onclick="document.getElementById('lm-approval-modal')?.remove()">Cancel</button>
    <button class="adm-btn adm-btn-primary" id="submitApproveReqBtn" onclick="window.LM_Admin.commitApproveRequest('${requestId}')">
      ✅ Approve &amp; Activate
    </button>
  </div>
</div>`;

    document.body.appendChild(modal);
  }

  async function _commitApproveRequest(requestId, fallbackName, fallbackEmail) {
    const btn = document.getElementById('submitApproveReqBtn');
    const errEl = document.getElementById('approveModalErr');
    const showErr = (m) => { if (errEl) { errEl.textContent = m; errEl.style.display = 'block'; } };

    const sb = _getSb();
    if (!sb) { showErr('Supabase client unavailable'); return; }

    const req = _requestsCache[requestId] || {};
    const email = req.email || fallbackEmail || '';
    const role = document.getElementById('req_role_select')?.value || 'user';
    const finMods = ALL_MODULES.filter(m => document.getElementById('req_fin_' + m.key)?.checked).map(m => m.key);
    const stdMods = STUDY_MODULES.filter(m => document.getElementById('req_std_' + m.key)?.checked).map(m => m.key);

    const allowedFinance = finMods.length === ALL_MODULES.length ? [] : finMods;
    const allowedStudy   = stdMods.length === STUDY_MODULES.length ? null : stdMods;

    if (btn) { btn.disabled = true; btn.textContent = '⏳ Approving…'; }

    try {
      /* 1. Update access_requests status */
      const { error: reqErr } = await sb
        .from('access_requests')
        .update({ status: 'approved', reviewed_at: new Date().toISOString() })
        .eq('id', requestId);
      if (reqErr) throw reqErr;

      /* 2. Check if user profile exists for this email and activate it */
      if (email) {
        const { data: profs } = await sb.from('user_profiles').select('id').ilike('email', email);
        if (profs && profs.length > 0) {
          for (const p of profs) {
            await sb.from('user_profiles').update({
              active: true,
              role: role,
              allowed_modules: allowedFinance,
              study_modules: allowedStudy,
              updated_at: new Date().toISOString()
            }).eq('id', p.id);
          }
        }
      }

      if (typeof showToast === 'function') showToast(`✅ Access approved for ${email || 'user'}!`, 'success');
      document.getElementById('lm-approval-modal')?.remove();
      _loadApprovalsData();
      _syncPendingCounts();
    } catch (e) {
      showErr(e.message || String(e));
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = '✅ Approve & Activate'; }
    }
  }

  async function _rejectAccessRequest(requestId, fallbackEmail) {
    const req = _requestsCache[requestId] || {};
    const email = req.email || fallbackEmail || 'this user';
    if (!confirm(`Reject access request for "${email}"?`)) return;
    const sb = _getSb();
    if (!sb) return;

    try {
      const { error } = await sb
        .from('access_requests')
        .update({ status: 'rejected', reviewed_at: new Date().toISOString() })
        .eq('id', requestId);
      if (error) throw error;
      if (typeof showToast === 'function') showToast(`Request for ${email} marked rejected.`, 'info');
      _loadApprovalsData();
      _syncPendingCounts();
    } catch (e) {
      if (typeof showToast === 'function') showToast(`Error: ${e.message}`, 'error');
    }
  }

  async function _deleteAccessRequest(requestId) {
    if (!confirm('Permanently delete this request record?')) return;
    const sb = _getSb();
    if (!sb) return;

    try {
      const { error } = await sb.from('access_requests').delete().eq('id', requestId);
      if (error) throw error;
      if (typeof showToast === 'function') showToast('Request record deleted', 'success');
      _loadApprovalsData();
      _syncPendingCounts();
    } catch (e) {
      if (typeof showToast === 'function') showToast(`Error: ${e.message}`, 'error');
    }
  }

  async function _batchApproveAllPending() {
    if (!confirm('Approve and activate ALL pending access requests and user accounts immediately?')) return;
    const sb = _getSb();
    if (!sb) return;

    try {
      /* Batch update access_requests */
      await sb.from('access_requests').update({
        status: 'approved',
        reviewed_at: new Date().toISOString()
      }).eq('status', 'pending');

      /* Batch update user_profiles */
      await sb.from('user_profiles').update({
        active: true,
        updated_at: new Date().toISOString()
      }).eq('active', false);

      if (typeof showToast === 'function') showToast('⚡ All pending users & requests approved!', 'success');
      _loadApprovalsData();
      _syncPendingCounts();
    } catch (e) {
      if (typeof showToast === 'function') showToast(`Batch approval error: ${e.message}`, 'error');
    }
  }

  /* ── Configure User Account Modal (user_profiles) ─── */
  function _openConfigureUserModal(userId, fallbackName, fallbackRole, fallbackAllowed, fallbackStudy) {
    document.getElementById('lm-configure-user-modal')?.remove();

    const u = _profilesCache[userId] || {};
    const name = u.display_name || (u.email ? u.email.split('@')[0] : '') || fallbackName || 'User';
    const email = u.email || '';
    const role = u.role || fallbackRole || 'user';
    const allowedMods = u.allowed_modules !== undefined ? u.allowed_modules : fallbackAllowed;
    const studyMods = u.study_modules !== undefined ? u.study_modules : fallbackStudy;
    const canCustomizeStudy = u.can_customize_study !== undefined ? !!u.can_customize_study : (role === 'admin');

    let finAllowed = [];
    if (allowedMods === null || allowedMods === undefined || (Array.isArray(allowedMods) && allowedMods.length === 0)) {
      finAllowed = ALL_MODULES.map(m => m.key);
    } else if (Array.isArray(allowedMods)) {
      finAllowed = allowedMods;
    }

    let stdAllowed = [];
    if (studyMods === null || studyMods === undefined) {
      stdAllowed = STUDY_MODULES.map(m => m.key);
    } else if (Array.isArray(studyMods)) {
      stdAllowed = studyMods;
    }

    const financeCheckboxes = ALL_MODULES.map(m => `
<label class="adm-checkbox-item">
  <input type="checkbox" id="cfg_fin_${m.key}" value="${m.key}" ${finAllowed.includes(m.key) ? 'checked' : ''}>
  <span>${m.label}</span>
</label>`).join('');

    const studyCheckboxes = STUDY_MODULES.map(m => `
<label class="adm-checkbox-item">
  <input type="checkbox" id="cfg_std_${m.key}" value="${m.key}" ${stdAllowed.includes(m.key) ? 'checked' : ''}>
  <span>${m.label}</span>
</label>`).join('');

    const modal = document.createElement('div');
    modal.id = 'lm-configure-user-modal';
    modal.className = 'adm-submodal-overlay';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-label', 'Configure User Account');
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.remove();
    });

    modal.innerHTML = `
<div class="adm-submodal-panel" style="max-width:540px;">
  <div class="adm-submodal-header">
    <div class="adm-submodal-title">⚙️ Configure User Account &amp; Access</div>
    <button class="adm-btn adm-btn-icon adm-btn-sm" onclick="document.getElementById('lm-configure-user-modal')?.remove()" aria-label="Close dialog">✕</button>
  </div>

  <div style="background:var(--adm-surface-2);border:1px solid var(--adm-border);border-radius:10px;padding:12px;margin-bottom:16px;">
    <div style="font-size:13.5px;font-weight:700;color:var(--adm-text-primary);">${_esc(name)}</div>
    ${email ? `<div style="font-size:12px;color:var(--adm-text-muted);margin-top:2px;">${_esc(email)}</div>` : ''}
  </div>

  <div class="adm-form-group" style="margin-bottom:14px;">
    <label class="adm-label">Assign Role</label>
    <select id="cfg_role_select" class="adm-input">
      <option value="user" ${role === 'user' ? 'selected' : ''}>👤 Normal User (Restricted to granted modules)</option>
      <option value="admin" ${role === 'admin' ? 'selected' : ''}>⭐ Full Administrator (Full System Access)</option>
    </select>
  </div>

  <div style="margin-bottom:16px;">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
      <label class="adm-label" style="margin:0;">💰 LedgerMate Finance Modules</label>
      <button class="adm-btn adm-btn-sm" style="font-size:11px;padding:3px 8px;" onclick="document.querySelectorAll('[id^=cfg_fin_]').forEach(c=>c.checked=true)">Select All</button>
    </div>
    <div class="adm-checkbox-grid" style="max-height:130px;">${financeCheckboxes}</div>
  </div>

  <div style="margin-bottom:18px;">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
      <label class="adm-label" style="margin:0;">📚 Study Hub Prep Modules</label>
      <button class="adm-btn adm-btn-sm" style="font-size:11px;padding:3px 8px;" onclick="document.querySelectorAll('[id^=cfg_std_]').forEach(c=>c.checked=true)">Select All</button>
    </div>
    <div class="adm-checkbox-grid" style="max-height:130px;">${studyCheckboxes}</div>
  </div>

  <!-- ✨ Personal Learning Workspace Customization Permission -->
  <label style="display:flex;align-items:flex-start;gap:10px;cursor:pointer;padding:12px;background:var(--adm-surface-2);border:1px solid var(--adm-border);border-radius:10px;margin-bottom:18px;">
    <input type="checkbox" id="cfg_study_customizer" ${canCustomizeStudy ? 'checked' : ''} style="width:16px;height:16px;margin-top:2px;accent-color:var(--adm-brand);cursor:pointer;">
    <div>
      <div style="font-size:12px;font-weight:700;color:var(--adm-text-primary);">✨ Allow Personal Learning Workspace Customization</div>
      <div style="font-size:11.5px;color:var(--adm-text-muted);margin-top:2px;">Allows user to add custom languages/topics, upload materials, customize dashboard widgets, and set personal milestones.</div>
    </div>
  </label>

  <div id="cfgModalErr" style="display:none;color:var(--adm-danger);font-size:12px;margin-bottom:12px;padding:8px 12px;background:var(--adm-danger-subtle);border:1px solid var(--adm-danger-border);border-radius:8px;"></div>

  <div class="adm-submodal-actions">
    <button class="adm-btn" onclick="document.getElementById('lm-configure-user-modal')?.remove()">Cancel</button>
    <button class="adm-btn adm-btn-primary" id="submitCfgUserBtn" onclick="window.LM_Admin.saveConfigureUser('${userId}')">
      💾 Save &amp; Activate
    </button>
  </div>
</div>`;

    document.body.appendChild(modal);
  }

  async function _saveConfigureUser(userId) {
    const btn = document.getElementById('submitCfgUserBtn');
    const errEl = document.getElementById('cfgModalErr');
    const showErr = (m) => { if (errEl) { errEl.textContent = m; errEl.style.display = 'block'; } };

    const sb = _getSb();
    if (!sb) { showErr('Supabase client unavailable'); return; }

    const role = document.getElementById('cfg_role_select')?.value || 'user';
    const finMods = ALL_MODULES.filter(m => document.getElementById('cfg_fin_' + m.key)?.checked).map(m => m.key);
    const stdMods = STUDY_MODULES.filter(m => document.getElementById('cfg_std_' + m.key)?.checked).map(m => m.key);
    const canCustomize = document.getElementById('cfg_study_customizer')?.checked || (role === 'admin');

    const allowedFinance = finMods.length === ALL_MODULES.length ? [] : finMods;
    const allowedStudy   = stdMods.length === STUDY_MODULES.length ? null : stdMods;

    if (btn) { btn.disabled = true; btn.textContent = '⏳ Saving…'; }

    try {
      const { error } = await sb.from('user_profiles').update({
        active: true,
        role: role,
        allowed_modules: allowedFinance,
        study_modules: allowedStudy,
        can_customize_study: canCustomize,
        updated_at: new Date().toISOString()
      }).eq('id', userId);
      if (error) throw error;

      if (typeof showToast === 'function') showToast('✅ User access settings saved!', 'success');
      document.getElementById('lm-configure-user-modal')?.remove();
      _loadApprovalsData();
      _refreshUserList();
      _syncPendingCounts();
    } catch (e) {
      showErr(e.message || String(e));
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = '💾 Save & Activate'; }
    }
  }

  /* ══════════════════════════════════════════════════════
     TAB 2: USERS & PERMISSIONS (user_profiles)
  ══════════════════════════════════════════════════════ */
  async function _renderUsersTab(container) {
    container.innerHTML = `
<div class="adm-section-header">
  <div>
    <h2 class="adm-section-title">👥 Users &amp; Permissions Directory</h2>
    <div class="adm-section-desc">Manage tenant accounts, administrative privileges, and fine-grained application access.</div>
  </div>
  <button class="adm-btn adm-btn-primary" onclick="window.LM_Admin.showCreateUserForm()">➕ Create New User</button>
</div>

<!-- Search & Action Toolbar -->
<div class="adm-toolbar">
  <div class="adm-toolbar-search" style="flex:1 1 300px;max-width:400px;">
    <input type="text" id="adminUserSearchInput" class="adm-input" placeholder="🔍 Search by name or email…" value="${_esc(_userSearchQuery)}" oninput="window.LM_Admin.onUserSearch(this.value)">
  </div>
</div>

<div id="userFormArea"></div>
<div id="userListArea"><div style="padding:40px;text-align:center;color:var(--adm-text-muted);">Loading users…</div></div>`;

    await _refreshUserList();
  }

  function _onUserSearch(val) {
    _userSearchQuery = val || '';
    _userPage = 0;
    _refreshUserList();
  }

  async function _refreshUserList(page) {
    if (page !== undefined) _userPage = page;
    const area = document.getElementById('userListArea');
    if (!area) return;

    area.innerHTML = `
<div style="display:flex;flex-direction:column;gap:10px;padding:12px 0;">
  <div class="adm-skeleton-row" style="border-radius:10px;"></div>
  <div class="adm-skeleton-row" style="border-radius:10px;"></div>
  <div class="adm-skeleton-row" style="border-radius:10px;"></div>
</div>`;

    const sb = _getSb();
    if (!sb) {
      area.innerHTML = '<div style="padding:32px;text-align:center;color:var(--adm-danger);">Database client not initialized.</div>';
      return;
    }

    const from = _userPage * PAGE_SIZE;
    const to   = from + PAGE_SIZE - 1;

    let profiles = [];
    let loadErr  = null;
    try {
      let query = sb
        .from('user_profiles')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false });

      if (_userSearchQuery.trim()) {
        query = query.or(`email.ilike.%${_userSearchQuery.trim()}%,display_name.ilike.%${_userSearchQuery.trim()}%`);
      }

      const { data, error, count } = await query.range(from, to);
      if (error) throw error;
      profiles   = data  || [];
      _userTotal = count || 0;
      _profilesCache = _profilesCache || {};
      (profiles || []).forEach(p => { if (p && p.id) _profilesCache[p.id] = p; });
    } catch (e) {
      loadErr = e.message || String(e);
    }

    if (loadErr) {
      area.innerHTML = `<div style="padding:32px;text-align:center;color:var(--adm-danger);">Failed to load users: ${_esc(loadErr)}</div>`;
      return;
    }

    if (!profiles || profiles.length === 0) {
      area.innerHTML = `
<div class="adm-empty-state">
  <div class="adm-empty-icon">👥</div>
  <div class="adm-empty-title">No Users Found</div>
  <div class="adm-empty-desc">No registered user profiles matched your search "${_esc(_userSearchQuery)}".</div>
</div>`;
      return;
    }

    const currentUid = (window.LM_Auth && typeof window.LM_Auth.getCurrentUser === 'function')
      ? window.LM_Auth.getCurrentUser()?.userId
      : null;

    const _tableRow = (u) => {
      const initial = (u.display_name || u.email || '?').charAt(0).toUpperCase();

      return `
<tr>
  <td>
    <div style="display:flex;align-items:center;gap:10px;">
      <div style="width:34px;height:34px;border-radius:50%;background:var(--adm-brand-subtle);border:1px solid var(--adm-brand-border);
           display:flex;align-items:center;justify-content:center;font-weight:700;color:var(--adm-brand);font-size:13px;flex-shrink:0;">
        ${initial}
      </div>
      <div>
        <div style="font-weight:600;color:var(--adm-text-primary);">${_esc(u.display_name || (u.email ? u.email.split('@')[0] : 'User'))}</div>
        <div style="font-size:11.5px;color:var(--adm-text-muted);">${_esc(u.email)}</div>
      </div>
    </div>
  </td>
  <td><span class="adm-badge ${u.role === 'admin' ? 'adm-badge-admin' : 'adm-badge-user'}">${u.role || 'user'}</span></td>
  <td><span class="adm-badge ${u.active ? 'adm-badge-active' : 'adm-badge-pending'}">${u.active ? 'Active' : 'Pending'}</span></td>
  <td style="font-size:12px;color:var(--adm-text-muted);">${new Date(u.created_at).toLocaleDateString()}</td>
  <td style="text-align:right;">
    <div style="display:inline-flex;gap:6px;flex-wrap:wrap;justify-content:flex-end;">
      ${!u.active ? `<button class="adm-btn adm-btn-success adm-btn-sm" onclick="window.LM_Admin.approveUser('${u.id}')">✅ Approve</button>` : ''}
      ${u.active  ? `<button class="adm-btn adm-btn-warning adm-btn-sm" onclick="window.LM_Admin.deactivateUser('${u.id}')">⏸ Pause</button>` : ''}
      <button class="adm-btn adm-btn-sm" onclick="window.LM_Admin.toggleRole('${u.id}','${u.role === 'admin' ? 'user' : 'admin'}')">
        ${u.role === 'admin' ? '👤 User' : '⭐ Admin'}
      </button>
      <button class="adm-btn adm-btn-sm" onclick="window.LM_Admin.showFinanceAccess('${u.id}')">💰 Finance</button>
      <button class="adm-btn adm-btn-sm" onclick="window.LM_Admin.showStudyAccess('${u.id}')">📚 Study</button>
      ${u.id !== currentUid ? `<button class="adm-btn adm-btn-danger adm-btn-sm" onclick="window.LM_Admin.deleteUser('${u.id}')">🗑 Delete</button>` : ''}
    </div>
  </td>
</tr>`;
    };

    const _mobileCard = (u) => {
      const initial = (u.display_name || u.email || '?').charAt(0).toUpperCase();

      return `
<div class="adm-data-card" style="border-left: 3px solid ${u.active ? 'var(--adm-success)' : 'var(--adm-warning)'};">
  <div class="adm-card-header">
    <div style="display:flex;gap:12px;align-items:center;min-width:0;">
      <div style="width:38px;height:38px;border-radius:50%;background:var(--adm-brand-subtle);border:1px solid var(--adm-brand-border);display:flex;align-items:center;justify-content:center;font-weight:700;color:var(--adm-brand);font-size:14px;flex-shrink:0;">
        ${initial}
      </div>
      <div style="min-width:0;">
        <div style="font-weight:700;color:var(--adm-text-primary);font-size:13.5px;display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
          <span>${_esc(u.display_name || (u.email ? u.email.split('@')[0] : 'User'))}</span>
          <span class="adm-badge ${u.role === 'admin' ? 'adm-badge-admin' : 'adm-badge-user'}">${u.role || 'user'}</span>
        </div>
        <div class="adm-card-meta" style="margin-top:2px;">
          <span>✉️ ${_esc(u.email)}</span>
          <span>Joined: ${new Date(u.created_at).toLocaleDateString()}</span>
        </div>
      </div>
    </div>
    <div>
      <span class="adm-badge ${u.active ? 'adm-badge-active' : 'adm-badge-pending'}">${u.active ? 'Active' : 'Pending'}</span>
    </div>
  </div>

  <div class="adm-card-actions">
    ${!u.active ? `<button class="adm-btn adm-btn-success adm-btn-sm" onclick="window.LM_Admin.approveUser('${u.id}')">✅ Approve</button>` : ''}
    ${u.active  ? `<button class="adm-btn adm-btn-warning adm-btn-sm" onclick="window.LM_Admin.deactivateUser('${u.id}')">⏸ Pause</button>` : ''}
    <button class="adm-btn adm-btn-sm" onclick="window.LM_Admin.toggleRole('${u.id}','${u.role === 'admin' ? 'user' : 'admin'}')">
      ${u.role === 'admin' ? '👤 Make User' : '⭐ Make Admin'}
    </button>
    <button class="adm-btn adm-btn-sm" onclick="window.LM_Admin.showFinanceAccess('${u.id}')">💰 Finance</button>
    <button class="adm-btn adm-btn-sm" onclick="window.LM_Admin.showStudyAccess('${u.id}')">📚 Study</button>
    ${u.id !== currentUid ? `<button class="adm-btn adm-btn-danger adm-btn-sm" onclick="window.LM_Admin.deleteUser('${u.id}')">🗑 Delete</button>` : ''}
  </div>
</div>`;
    };

    let html = `
<!-- Desktop Table View -->
<div class="adm-table-container">
  <table class="adm-table">
    <thead>
      <tr>
        <th scope="col">User</th>
        <th scope="col">Role</th>
        <th scope="col">Status</th>
        <th scope="col">Joined</th>
        <th scope="col" style="text-align:right;">Actions</th>
      </tr>
    </thead>
    <tbody>
      ${profiles.map(_tableRow).join('')}
    </tbody>
  </table>
</div>

<!-- Mobile Data Cards View -->
<div class="adm-data-cards-grid">
  ${profiles.map(_mobileCard).join('')}
</div>`;

    const totalPages = Math.max(1, Math.ceil(_userTotal / PAGE_SIZE));
    if (totalPages > 1) {
      html += `
<div style="display:flex;align-items:center;justify-content:space-between;margin-top:14px;padding:12px 16px;background:var(--adm-surface-2);border:1px solid var(--adm-border);border-radius:10px;font-size:12.5px;color:var(--adm-text-muted);flex-wrap:wrap;gap:10px;">
  <button class="adm-btn adm-btn-sm" ${_userPage === 0 ? 'disabled' : ''} onclick="window.LM_Admin._prevPage()">← Prev</button>
  <span>Page ${_userPage + 1} of ${totalPages} &nbsp;·&nbsp; ${_userTotal} users total</span>
  <button class="adm-btn adm-btn-sm" ${_userPage >= totalPages - 1 ? 'disabled' : ''} onclick="window.LM_Admin._nextPage()">Next →</button>
</div>`;
    }

    area.innerHTML = html;
  }

  /* ── Create User Form ──────────────────────────────── */
  function _showCreateUserForm() {
    const area = document.getElementById('userFormArea');
    if (!area) return;

    const moduleCheckboxes = ALL_MODULES.map(m => `
<label class="adm-checkbox-item">
  <input type="checkbox" name="mod_${m.key}" value="${m.key}" checked>
  <span>${m.label}</span>
</label>`).join('');

    const studyCheckboxes = STUDY_MODULES.map(m => `
<label class="adm-checkbox-item">
  <input type="checkbox" name="stmod_${m.key}" value="${m.key}" checked>
  <span>${m.label}</span>
</label>`).join('');

    area.innerHTML = `
<div class="adm-form-card" id="userFormCard">
  <div style="font-size:15px;font-weight:700;color:var(--adm-text-primary);margin-bottom:16px;">➕ Create New User Account</div>
  <div class="adm-form-grid">
    <div class="adm-form-group">
      <label class="adm-label">Email *</label>
      <input id="uf_email" class="adm-input" type="email" placeholder="user@example.com">
    </div>
    <div class="adm-form-group">
      <label class="adm-label">Display Name</label>
      <input id="uf_displayName" class="adm-input" placeholder="Full name">
    </div>
    <div class="adm-form-group">
      <label class="adm-label">Password *</label>
      <input id="uf_password" class="adm-input" type="password" placeholder="min 6 characters">
    </div>
    <div class="adm-form-group">
      <label class="adm-label">Confirm Password *</label>
      <input id="uf_password2" class="adm-input" type="password" placeholder="repeat password">
    </div>
    <div class="adm-form-group">
      <label class="adm-label">Role</label>
      <select id="uf_role" class="adm-input">
        <option value="user">👤 Normal User</option>
        <option value="admin">⭐ Admin</option>
      </select>
    </div>
    <div class="adm-form-group">
      <label class="adm-label">Activate Immediately</label>
      <select id="uf_active" class="adm-input">
        <option value="true">✅ Yes — active on first login</option>
        <option value="false">⏸ No — pending approval</option>
      </select>
    </div>
  </div>

  <div style="margin-top:16px;">
    <label class="adm-label" style="margin-bottom:6px;display:block;">Finance Module Access</label>
    <div class="adm-checkbox-grid">${moduleCheckboxes}</div>
  </div>

  <div style="margin-top:14px;">
    <label class="adm-label" style="margin-bottom:6px;display:block;">Study Hub Module Access</label>
    <div class="adm-checkbox-grid">${studyCheckboxes}</div>
  </div>

  <div id="userFormError" style="display:none;color:var(--adm-danger);font-size:12.5px;margin-top:12px;padding:10px 14px;background:var(--adm-danger-subtle);border:1px solid var(--adm-danger-border);border-radius:8px;"></div>

  <div style="display:flex;gap:10px;margin-top:18px;">
    <button class="adm-btn adm-btn-primary" onclick="window.LM_Admin.submitCreateUser()">✅ Create User</button>
    <button class="adm-btn" onclick="document.getElementById('userFormArea').innerHTML=''">Cancel</button>
  </div>
</div>`;

    area.scrollIntoView({ behavior: 'smooth' });
  }

  async function _submitCreateUser() {
    const errEl   = document.getElementById('userFormError');
    const showErr = (msg) => { if (errEl) { errEl.textContent = msg; errEl.style.display = 'block'; } };

    const email       = document.getElementById('uf_email')?.value.trim();
    const displayName = document.getElementById('uf_displayName')?.value.trim();
    const password    = document.getElementById('uf_password')?.value;
    const password2   = document.getElementById('uf_password2')?.value;
    const role        = document.getElementById('uf_role')?.value || 'user';
    const active      = document.getElementById('uf_active')?.value === 'true';
    const modules     = Array.from(document.querySelectorAll('[name^="mod_"]:checked')).map(c => c.value);
    const studyMods   = Array.from(document.querySelectorAll('[name^="stmod_"]:checked')).map(c => c.value);

    if (!email)                       { showErr('Email is required.'); return; }
    if (!password || password.length < 6) { showErr('Password must be at least 6 characters.'); return; }
    if (password !== password2)       { showErr('Passwords do not match.'); return; }

    const sb = _getSb();
    if (!sb) { showErr('Supabase client unavailable.'); return; }

    const btn = document.querySelector('[onclick="window.LM_Admin.submitCreateUser()"]');
    if (btn) { btn.disabled = true; btn.textContent = '⏳ Creating…'; }

    try {
      const { data, error } = await sb.auth.signUp({
        email,
        password,
        options: { data: { full_name: displayName || email.split('@')[0] } }
      });
      if (error) throw new Error(error.message);

      const newUserId = data.user?.id;
      if (!newUserId) throw new Error('User created but ID missing.');

      const { error: profErr } = await sb.from('user_profiles').upsert({
        id             : newUserId,
        email          : email,
        display_name   : displayName || email.split('@')[0],
        role           : role,
        active         : active,
        allowed_modules: modules.length === ALL_MODULES.length ? [] : modules,
        study_modules  : studyMods.length === STUDY_MODULES.length ? null : studyMods,
        updated_at     : new Date().toISOString()
      }, { onConflict: 'id' });

      if (profErr) throw new Error('User auth created, but profile update failed: ' + profErr.message);

      if (typeof showToast === 'function') showToast('✅ User created successfully!', 'success');
      document.getElementById('userFormArea').innerHTML = '';
      await _refreshUserList();
      _syncPendingCounts();
    } catch (err) {
      showErr(err.message || String(err));
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = '✅ Create User'; }
    }
  }

  /* ── User Actions ──────────────────────────────────── */
  async function _approveUser(id) {
    await _updateProfile(id, { active: true, updated_at: new Date().toISOString() }, 'User account activated ✓');
    _syncPendingCounts();
  }

  async function _deactivateUser(id) {
    if (!confirm('Deactivate / pause this user account?')) return;
    await _updateProfile(id, { active: false, updated_at: new Date().toISOString() }, 'User account deactivated');
    _syncPendingCounts();
  }

  async function _toggleRole(id, newRole, fallbackName) {
    const u = _profilesCache[id] || {};
    const name = u.display_name || u.email || fallbackName || 'User';
    if (!confirm(`Change ${name}'s role to "${newRole}"?`)) return;
    await _updateProfile(id, { role: newRole, updated_at: new Date().toISOString() }, `Role set to ${newRole}`);
  }

  /* ── Finance Module Access Modal ───────────────────── */
  function _showFinanceAccess(userId, fallbackName, fallbackModules) {
    document.getElementById('lm-finance-modal')?.remove();

    const u = _profilesCache[userId] || {};
    const userName = u.display_name || u.email || fallbackName || 'User';
    const modulesJson = u.allowed_modules !== undefined ? u.allowed_modules : fallbackModules;

    let allowed = [];
    if (modulesJson === null || modulesJson === undefined || (Array.isArray(modulesJson) && modulesJson.length === 0)) {
      allowed = ALL_MODULES.map(m => m.key);
    } else if (Array.isArray(modulesJson)) {
      allowed = modulesJson;
    }

    const checkboxes = ALL_MODULES.map(m => {
      const checked = allowed.indexOf(m.key) !== -1;
      return `<label class="adm-checkbox-item">
        <input type="checkbox" id="fin_mod_${m.key}" value="${m.key}" ${checked ? 'checked' : ''}>
        <span>${m.label}</span>
      </label>`;
    }).join('');

    const modal = document.createElement('div');
    modal.id = 'lm-finance-modal';
    modal.className = 'adm-submodal-overlay';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-label', 'Finance Module Permissions');
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.remove();
    });

    modal.innerHTML = `
<div class="adm-submodal-panel" style="max-width:480px;">
  <div class="adm-submodal-header">
    <div>
      <div class="adm-submodal-title">💰 Finance Module Permissions</div>
      <div style="font-size:12px;color:var(--adm-text-muted);margin-top:2px;">${_esc(userName)}</div>
    </div>
    <button class="adm-btn adm-btn-icon adm-btn-sm" onclick="document.getElementById('lm-finance-modal')?.remove()" aria-label="Close dialog">✕</button>
  </div>
  <p style="font-size:12.5px;color:var(--adm-text-secondary);line-height:1.5;margin-bottom:14px;">
    Configure granted LedgerMate financial engine access for this user account. Administrators always retain unrestricted full access.
  </p>
  <div class="adm-checkbox-grid" style="max-height:220px;">${checkboxes}</div>
  <div class="adm-submodal-actions">
    <button class="adm-btn" onclick="document.getElementById('lm-finance-modal')?.remove()">Cancel</button>
    <button class="adm-btn adm-btn-primary" onclick="window.LM_Admin.saveFinanceAccess('${userId}')">💾 Save Permissions</button>
  </div>
</div>`;
    document.body.appendChild(modal);
  }

  async function _saveFinanceAccess(userId) {
    const checked = ALL_MODULES.filter(m => document.getElementById('fin_mod_' + m.key)?.checked).map(m => m.key);
    const allowed = checked.length === ALL_MODULES.length ? [] : checked;
    document.getElementById('lm-finance-modal')?.remove();
    await _updateProfile(userId, { allowed_modules: allowed, updated_at: new Date().toISOString() }, 'Finance module access saved');
  }

  /* ── Study Module Access Modal ─────────────────────── */
  function _showStudyAccess(userId, fallbackName, fallbackModules) {
    document.getElementById('lm-study-modal')?.remove();

    const u = _profilesCache[userId] || {};
    const userName = u.display_name || u.email || fallbackName || 'User';
    const modulesJson = u.study_modules !== undefined ? u.study_modules : fallbackModules;

    let currentModules;
    try {
      currentModules = typeof modulesJson === 'string' ? JSON.parse(modulesJson) : modulesJson;
    } catch { currentModules = null; }

    const hasAccess = currentModules === null || (Array.isArray(currentModules) && currentModules.length > 0);
    const allowedKeys = currentModules === null
      ? STUDY_MODULES.map(m => m.key)
      : (Array.isArray(currentModules) ? currentModules : []);

    const canCustomize = u.can_customize_study !== undefined ? !!u.can_customize_study : (u.role === 'admin');

    const moduleCheckboxes = STUDY_MODULES.map(m => {
      const checked = currentModules === null || allowedKeys.indexOf(m.key) !== -1;
      return `<label class="adm-checkbox-item">
        <input type="checkbox" id="study_mod_${m.key}" value="${m.key}" ${checked ? 'checked' : ''}>
        <span>${m.label}</span>
      </label>`;
    }).join('');

    const modal = document.createElement('div');
    modal.id = 'lm-study-modal';
    modal.className = 'adm-submodal-overlay';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-label', 'Study Module Access');
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.remove();
    });

    modal.innerHTML = `
<div class="adm-submodal-panel" style="max-width:480px;">
  <div class="adm-submodal-header">
    <div>
      <div class="adm-submodal-title">📚 Study Module Access</div>
      <div style="font-size:12px;color:var(--adm-text-muted);margin-top:2px;">${_esc(userName)}</div>
    </div>
    <button class="adm-btn adm-btn-icon adm-btn-sm" onclick="document.getElementById('lm-study-modal')?.remove()" aria-label="Close dialog">✕</button>
  </div>
  <p style="font-size:12.5px;color:var(--adm-text-secondary);line-height:1.5;margin-bottom:14px;">
    Select which learning tracks and interview question banks are enabled.
  </p>

  <label style="display:flex;align-items:center;gap:12px;cursor:pointer;padding:12px;background:var(--adm-surface-2);border:1px solid var(--adm-border);border-radius:10px;margin-bottom:12px;">
    <input type="checkbox" id="study_access_enabled" ${hasAccess ? 'checked' : ''} style="width:17px;height:17px;accent-color:var(--adm-brand);flex-shrink:0;">
    <div>
      <div style="font-size:13px;font-weight:600;color:var(--adm-text-primary);">Enable Study Hub access</div>
      <div style="font-size:11.5px;color:var(--adm-text-muted);">Uncheck to suspend all study module access for this user</div>
    </div>
  </label>

  <label style="display:flex;align-items:flex-start;gap:10px;cursor:pointer;padding:12px;background:var(--adm-surface-2);border:1px solid var(--adm-border);border-radius:10px;margin-bottom:14px;">
    <input type="checkbox" id="study_modal_customizer" ${canCustomize ? 'checked' : ''} style="width:16px;height:16px;margin-top:2px;accent-color:var(--adm-brand);flex-shrink:0;">
    <div>
      <div style="font-size:12.5px;font-weight:700;color:var(--adm-text-primary);">✨ Personal Workspace Customization</div>
      <div style="font-size:11.5px;color:var(--adm-text-muted);margin-top:2px;">Allows adding custom languages, uploading study materials, and custom widgets.</div>
    </div>
  </label>

  <div id="study_module_section" style="transition:opacity .2s;${hasAccess ? '' : 'opacity:.35;pointer-events:none'}">
    <div style="font-size:11px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:var(--adm-text-muted);margin-bottom:8px;">Module Permissions</div>
    <div class="adm-checkbox-grid" style="max-height:180px;">${moduleCheckboxes}</div>
  </div>

  <div class="adm-submodal-actions">
    <button class="adm-btn" onclick="document.getElementById('lm-study-modal')?.remove()">Cancel</button>
    <button class="adm-btn adm-btn-primary" onclick="window.LM_Admin.saveStudyAccess('${userId}')">💾 Save Access</button>
  </div>
</div>`;

    document.body.appendChild(modal);

    document.getElementById('study_access_enabled')?.addEventListener('change', function() {
      const sec = document.getElementById('study_module_section');
      if (sec) { sec.style.opacity = this.checked ? '1' : '.35'; sec.style.pointerEvents = this.checked ? '' : 'none'; }
    });
  }

  async function _saveStudyAccess(userId) {
    const enabled = document.getElementById('study_access_enabled')?.checked;
    const canCust = document.getElementById('study_modal_customizer')?.checked;
    let studyModules;
    if (!enabled) {
      studyModules = [];
    } else {
      const checked = STUDY_MODULES.filter(m => document.getElementById('study_mod_' + m.key)?.checked).map(m => m.key);
      studyModules = checked.length === STUDY_MODULES.length ? null : checked;
    }

    document.getElementById('lm-study-modal')?.remove();
    await _updateProfile(userId, { study_modules: studyModules, can_customize_study: !!canCust, updated_at: new Date().toISOString() }, 'Study access updated ✓');
  }

  /* ── Delete User Permanently ───────────────────────── */
  function _deleteUser(id, fallbackName) {
    _showDeleteModal(id, fallbackName);
  }

  function _showDeleteModal(id, fallbackName) {
    document.getElementById('lm-del-modal')?.remove();

    const u = _profilesCache[id] || {};
    const name = u.display_name || u.email || fallbackName || 'User';

    const modal = document.createElement('div');
    modal.id = 'lm-del-modal';
    modal.className = 'adm-submodal-overlay';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-label', 'Confirm User Account Deletion');
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.remove();
    });

    modal.innerHTML = `
<div class="adm-submodal-panel" style="max-width:440px;border-color:var(--adm-danger-border);">
  <div style="font-size:32px;text-align:center;margin-bottom:8px;">⚠️</div>
  <div style="font-size:16px;font-weight:700;color:var(--adm-text-primary);text-align:center;margin-bottom:4px;">Delete User Permanently</div>
  <div style="font-size:13px;color:var(--adm-text-muted);text-align:center;margin-bottom:16px;">
    Deleting <strong style="color:var(--adm-danger);">${_esc(name)}</strong>
  </div>
  <div style="background:var(--adm-danger-subtle);border:1px solid var(--adm-danger-border);border-radius:10px;padding:12px 14px;margin-bottom:18px;font-size:12px;color:var(--adm-text-secondary);line-height:1.8;">
    <div>✗ &nbsp;LedgerMate transactions, budgets, loans, savings</div>
    <div>✗ &nbsp;Notes, credentials vault, investments, trips</div>
    <div>✗ &nbsp;Study Resources account access &amp; progress</div>
    <div>✗ &nbsp;Supabase cloud records &amp; authentication account</div>
    <div style="margin-top:6px;color:var(--adm-danger);font-weight:700;">⚠️ This action cannot be reversed.</div>
  </div>
  <div id="lm-del-progress" style="display:none;font-size:12px;color:var(--adm-text-secondary);margin-bottom:14px;line-height:1.9;padding:10px 12px;background:var(--adm-surface-3);border-radius:8px;border:1px solid var(--adm-border);"></div>
  <div class="adm-submodal-actions">
    <button id="lm-del-cancel" onclick="document.getElementById('lm-del-modal')?.remove()" class="adm-btn" style="flex:1;">Cancel</button>
    <button id="lm-del-confirm-btn" onclick="window.LM_Admin.executeDelete('${id}')" class="adm-btn adm-btn-danger" style="flex:1;">🗑 Delete Permanently</button>
  </div>
</div>`;

    document.body.appendChild(modal);
  }

  async function _executeDelete(id, fallbackName) {
    const btn = document.getElementById('lm-del-confirm-btn');
    const cancelBtn = document.getElementById('lm-del-cancel');
    const progress = document.getElementById('lm-del-progress');

    const u = _profilesCache[id] || {};
    const name = u.display_name || u.email || fallbackName || 'User';

    if (btn) { btn.disabled = true; btn.textContent = '⏳ Deleting…'; }
    if (cancelBtn) cancelBtn.disabled = true;
    if (progress) { progress.style.display = 'block'; progress.textContent = ''; }

    const log = (line) => { if (progress) progress.innerHTML += line + '<br>'; };

    const sb = _getSb();
    let allOk = true;

    if (typeof window.LM_delByProfile === 'function') {
      try {
        await window.LM_delByProfile('all', id);
        log('✅ Local cache cleared');
      } catch {
        log('⚠️ Local cache clear skipped');
      }
    }

    try {
      if (sb) {
        const { error } = await sb.rpc('delete_user', { user_id: id });
        if (error) throw error;
        log('✅ Cloud data &amp; auth profile deleted');
      }
    } catch (e) {
      log('❌ Account deletion: ' + _esc(e.message || String(e)));
      allOk = false;
    }

    await new Promise(r => setTimeout(r, 800));
    document.getElementById('lm-del-modal')?.remove();

    if (allOk) {
      if (typeof showToast === 'function') showToast(`🗑 "${name}" deleted`, 'success');
    } else {
      if (typeof showToast === 'function') showToast('⚠️ Deletion check: see Supabase logs', 'error');
    }
    await _refreshUserList();
    _syncPendingCounts();
  }

  async function _updateProfile(id, patch, successMsg) {
    const sb = _getSb();
    if (!sb) return;
    try {
      const { error } = await sb.from('user_profiles').update(patch).eq('id', id);
      if (error) throw error;
      if (typeof showToast === 'function') showToast('✅ ' + successMsg, 'success');
      await _refreshUserList();
    } catch (e) {
      if (typeof showToast === 'function') showToast('❌ ' + (e.message || String(e)), 'error');
    }
  }

  /* ══════════════════════════════════════════════════════
     TAB 3: STUDY HUB MANAGEMENT
  ══════════════════════════════════════════════════════ */
  function _renderStudyTab(container) {
    const wkGoal = parseInt(localStorage.getItem('sr_wk_goal') || '20');
    container.innerHTML = `
<div class="adm-section-header">
  <div>
    <h2 class="adm-section-title">📚 Study Hub Administration &amp; Settings</h2>
    <div class="adm-section-desc">Manage curriculum defaults, weekly question targets, and spaced repetition (SRS) tracks.</div>
  </div>
</div>

<div class="adm-form-card">
  <div style="font-size:14px;font-weight:700;color:var(--adm-text-primary);margin-bottom:4px;">🎯 Weekly Study Question Goal</div>
  <div style="font-size:12px;color:var(--adm-text-muted);margin-bottom:14px;">Set the global target number of interview practice questions per week.</div>
  <div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap;">
    <input id="adminWkGoalInput" type="number" min="1" max="500" value="${wkGoal}" class="adm-input" style="max-width:140px;font-family:monospace;">
    <span style="font-size:13px;color:var(--adm-text-secondary);">questions / week</span>
    <button onclick="window.LM_Admin.saveWeeklyGoal()" class="adm-btn adm-btn-primary" style="margin-left:auto;">💾 Save Goal</button>
  </div>
</div>

<div class="adm-form-card">
  <div style="font-size:14px;font-weight:700;color:var(--adm-text-primary);margin-bottom:4px;">🧠 Spaced Repetition (SRS) &amp; Question Banks</div>
  <div style="font-size:12px;color:var(--adm-text-muted);margin-bottom:14px;">Study Hub active question banks: 538+ questions across 8 curated tracks.</div>
  <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:10px;">
    ${STUDY_MODULES.map(m => `
      <div style="padding:12px 14px;background:var(--adm-surface-3);border:1px solid var(--adm-border);border-radius:8px;display:flex;align-items:center;justify-content:space-between;">
        <span style="font-size:12.5px;font-weight:600;color:var(--adm-text-primary);">${m.label}</span>
        <span class="adm-badge adm-badge-active">ACTIVE</span>
      </div>
    `).join('')}
  </div>
</div>`;
  }

  function _saveWeeklyGoal() {
    const val = parseInt(document.getElementById('adminWkGoalInput')?.value || '20') || 20;
    localStorage.setItem('sr_wk_goal', String(val));
    if (typeof window.renderWeeklyGoal === 'function' && window._lastRawProgress) {
      window.renderWeeklyGoal(window._lastRawProgress);
    }
    if (typeof showToast === 'function') showToast(`✅ Weekly question goal set to ${val}`, 'success');
  }

  /* ══════════════════════════════════════════════════════
     TAB 4: STATISTICS
  ══════════════════════════════════════════════════════ */
  async function _renderStats(container) {
    container.innerHTML = `
<div style="display:flex;flex-direction:column;gap:10px;padding:12px 0;">
  <div class="adm-skeleton-row" style="border-radius:10px;"></div>
  <div class="adm-skeleton-row" style="border-radius:10px;"></div>
  <div class="adm-skeleton-row" style="border-radius:10px;"></div>
</div>`;

    const sb = _getSb();
    let profiles = [], statsErr = null;
    let pendingReqCount = 0;

    if (sb) {
      try {
        const { data, error } = await sb.from('user_profiles').select('role,active,created_at');
        if (error) throw error;
        profiles = data || [];

        const { count } = await sb.from('access_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending');
        pendingReqCount = count || 0;
      } catch (e) {
        statsErr = e.message;
      }
    }

    const totalUsers    = profiles.length;
    const activeUsers   = profiles.filter(u => u.active).length;
    const pendingUsers  = profiles.filter(u => !u.active).length;
    const adminCount    = profiles.filter(u => u.role === 'admin').length;

    let txCount = 0, budgetCount = 0, loanCount = 0, noteCount = 0;
    try {
      if (window.state) {
        txCount     = (window.state.transactions   || []).length;
        budgetCount = (window.state.budgets        || []).length;
        loanCount   = (window.state.loans          || []).length;
        noteCount   = (window.state.notes          || []).length;
      }
    } catch {}

    const stat = (icon, val, label, trend) =>
      `<div class="adm-kpi-card">
        <div class="adm-kpi-top">
          <span class="adm-kpi-label">${label}</span>
          <span class="adm-kpi-icon">${icon}</span>
        </div>
        <div class="adm-kpi-value">${val}</div>
        ${trend ? `<div class="adm-kpi-trend">${trend}</div>` : ''}
       </div>`;

    container.innerHTML = `
<div class="adm-section-header">
  <div>
    <h2 class="adm-section-title">📊 Application &amp; Tenant Telemetry</h2>
    <div class="adm-section-desc">Real-time indicators across user access, database records, and system health.</div>
  </div>
</div>
${statsErr ? `<div style="color:var(--adm-danger);font-size:12.5px;margin-bottom:12px;padding:8px 12px;background:var(--adm-danger-subtle);border:1px solid var(--adm-danger-border);border-radius:8px;">⚠️ User stats notice: ${_esc(statsErr)}</div>` : ''}
<div class="adm-kpi-grid">
  ${stat('👥', totalUsers,      'Total Registered',  'Supabase auth records')}
  ${stat('✅', activeUsers,     'Active Accounts',   'Access enabled')}
  ${stat('⏳', pendingUsers,    'Pending Activation',pendingUsers > 0 ? 'Requires attention' : 'All clear')}
  ${stat('📝', pendingReqCount, 'Pending Requests',  pendingReqCount > 0 ? 'Review approvals' : 'Zero queued')}
  ${stat('⭐', adminCount,      'Administrators',    'Full permissions')}
  ${stat('↕️', txCount,         'Transactions',      'Active profile')}
  ${stat('🎯', budgetCount,     'Active Budgets',    'Configured')}
  ${stat('📝', noteCount,       'Saved Notes',       'Encrypted notes')}
</div>`;
  }

  /* ══════════════════════════════════════════════════════
     TAB 5: APP SETTINGS
  ══════════════════════════════════════════════════════ */
  function _tabAppSettings() {
    const s = _loadAppSettings();
    return `
<div class="adm-section-header">
  <div>
    <h2 class="adm-section-title">🔧 Application Settings</h2>
    <div class="adm-section-desc">Configure global instance identity, currency localization, themes, and session security.</div>
  </div>
</div>
<div class="adm-form-card">
  <div class="adm-form-grid">
    <div class="adm-form-group">
      <label class="adm-label">App Name</label>
      <input id="as_appName" class="adm-input" value="${_esc(s.appName||'LedgerMate')}">
    </div>
    <div class="adm-form-group">
      <label class="adm-label">Default Currency</label>
      <select id="as_currency" class="adm-input">
        <option value="INR" ${s.currency==='INR'?'selected':''}>₹ INR</option>
        <option value="USD" ${s.currency==='USD'?'selected':''}>$ USD</option>
        <option value="EUR" ${s.currency==='EUR'?'selected':''}>€ EUR</option>
        <option value="GBP" ${s.currency==='GBP'?'selected':''}>£ GBP</option>
      </select>
    </div>
    <div class="adm-form-group">
      <label class="adm-label">Default Theme</label>
      <select id="as_theme" class="adm-input">
        <option value="dark"  ${s.theme!=='light'?'selected':''}>🌙 Dark</option>
        <option value="light" ${s.theme==='light'?'selected':''}>☀️ Light</option>
      </select>
    </div>
    <div class="adm-form-group">
      <label class="adm-label">Session Timeout (minutes, 0=never)</label>
      <input id="as_sessionTTL" class="adm-input" type="number" min="0" max="10080" value="${s.sessionTTL||0}">
    </div>
  </div>
  <div style="margin-top:18px;">
    <button class="adm-btn adm-btn-primary" onclick="window.LM_Admin.saveAppSettings()">💾 Save Settings</button>
  </div>
</div>`;
  }

  function _bindAppSettings() {}

  function _loadAppSettings() {
    try { return JSON.parse(localStorage.getItem('lm_app_settings') || '{}'); }
    catch { return {}; }
  }

  function _saveAppSettings() {
    const settings = {
      appName   : document.getElementById('as_appName')?.value.trim() || 'LedgerMate',
      currency  : document.getElementById('as_currency')?.value || 'INR',
      theme     : document.getElementById('as_theme')?.value || 'dark',
      sessionTTL: parseInt(document.getElementById('as_sessionTTL')?.value || '0') || 0
    };

    localStorage.setItem('lm_app_settings', JSON.stringify(settings));

    const newTheme = settings.theme;
    document.documentElement.setAttribute('data-theme', newTheme);
    document.body.setAttribute('data-theme', newTheme);
    if (window.state) window.state.settings = { ...(window.state.settings || {}), ...settings };

    ['themeIcon', 'themeBtn'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.textContent = newTheme === 'dark' ? '🌙' : '☀️';
    });

    if (typeof showToast === 'function') showToast('✅ Settings saved!', 'success');
  }

  /* ══════════════════════════════════════════════════════
     TAB 6: BACKUP & CLOUD SYNC
  ══════════════════════════════════════════════════════ */
  function _tabBackup() {
    return `
<div class="adm-section-header">
  <div>
    <h2 class="adm-section-title">🗄️ Data Backup, Cloud Sync &amp; Recovery</h2>
    <div class="adm-section-desc">Manage encrypted cloud synchronization, offline snapshots, and disaster recovery.</div>
  </div>
</div>

<div class="adm-form-card">
  <div style="font-size:14px;font-weight:700;color:var(--adm-text-primary);margin-bottom:6px;">📤 Export Database Backup</div>
  <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;">
    <button class="adm-btn adm-btn-primary" onclick="window.LM_Admin.exportBackup()">📤 Download JSON Backup</button>
    <button class="adm-btn" onclick="window.LM_Admin.syncToCloud()">☁️ Sync to Cloud Now</button>
  </div>
  <div style="font-size:12px;color:var(--adm-text-muted);margin-top:8px;">Exports all IndexedDB stores as JSON. Cloud sync non-destructively reconciles records to Supabase.</div>
</div>

<div class="adm-form-card">
  <div style="font-size:14px;font-weight:700;color:var(--adm-text-primary);margin-bottom:6px;">📥 Restore / Import</div>
  <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;">
    <input type="file" id="restoreFile" accept=".json,.gz,.gzip,.json.gz,application/json,application/gzip,application/x-gzip,application/octet-stream,*/*" class="adm-input" style="max-width:320px;">
    <button id="adminImportBtn" class="adm-btn adm-btn-primary" onclick="window.LM_Admin.importBackup()">📥 Restore Backup</button>
  </div>
  <div style="font-size:12px;color:var(--adm-text-muted);margin-top:8px;">Merges backup records into the database with automatic deduplication.</div>
</div>

<div class="adm-form-card" style="border-color:var(--adm-danger-border);">
  <div style="font-size:14px;font-weight:700;color:var(--adm-danger);margin-bottom:6px;">⚠️ Danger Zone</div>
  <div style="display:flex;gap:10px;flex-wrap:wrap;">
    <button class="adm-btn adm-btn-danger" onclick="window.LM_Admin.clearUserData()">🗑 Clear My Data</button>
    <button class="adm-btn adm-btn-danger" onclick="window.LM_Admin.resetFactory()">⚠️ Factory Reset (All Local Data)</button>
  </div>
</div>`;
  }

  function _bindBackupTab() {}

  async function _exportBackup() {
    let payload = {};
    try {
      if (typeof window.FinalJson === 'function') payload = JSON.parse(await window.FinalJson());
    } catch {}
    payload._exportedBy = (window.LM_Auth && typeof window.LM_Auth.getCurrentUser === 'function')
      ? window.LM_Auth.getCurrentUser()?.username
      : 'admin';
    payload._exportedAt = new Date().toISOString();

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `ledgermate_backup_${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    if (typeof showToast === 'function') showToast('✅ Backup downloaded!', 'success');
  }

  async function _syncToCloud() {
    if (!window.LM_CloudSync) {
      if (typeof showToast === 'function') showToast('Cloud sync not available', 'error');
      return;
    }
    try {
      await window.LM_CloudSync.save();
      if (typeof showToast === 'function') showToast('☁️ Synced to cloud!', 'success');
    } catch (e) {
      if (typeof showToast === 'function') showToast('❌ Sync failed: ' + e.message, 'error');
    }
  }

  async function _importBackup() {
    const file = document.getElementById('restoreFile')?.files[0];
    if (!file) {
      if (typeof showToast === 'function') showToast('Please select a backup file first.', 'error');
      return;
    }
    const btn = document.getElementById('adminImportBtn');
    if (btn) { btn.disabled = true; btn.textContent = '⏳ Restoring…'; }
    try {
      let text;
      if (typeof window.LM_readFileTextOrGzip === 'function') {
        text = await window.LM_readFileTextOrGzip(file);
      } else {
        const lowerName = (file.name || '').toLowerCase();
        const isGz = lowerName.endsWith('.gz') || lowerName.endsWith('.gzip') || file.type === 'application/gzip' || file.type === 'application/x-gzip';
        if (isGz) {
          if (typeof DecompressionStream !== 'undefined') {
            const ds = new DecompressionStream('gzip');
            const stream = (typeof file.stream === 'function') ? file.stream() : new Response(file).body;
            text = await new Response(stream.pipeThrough(ds)).text();
          } else {
            throw new Error('GZIP decompression not supported in this browser.');
          }
        } else {
          text = await file.text();
        }
      }
      let payload;
      try { payload = JSON.parse(text); } catch (e) { throw new Error('Not valid JSON: ' + e.message); }
      if (!payload || typeof payload !== 'object') throw new Error('Empty or unreadable file.');
      if (typeof window.fullImportJSONText === 'function') {
        await window.fullImportJSONText(text, 'AdminPanel');
      } else if (typeof window.mergeRestore === 'function') {
        await window.mergeRestore(payload);
      } else {
        throw new Error('No restore function available.');
      }
      if (typeof showToast === 'function') showToast('✅ Backup restored!', 'success');
      const fi = document.getElementById('restoreFile');
      if (fi) fi.value = '';
    } catch (err) {
      if (typeof showToast === 'function') showToast('❌ Restore failed: ' + (err.message || String(err)), 'error');
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = '📥 Restore Backup'; }
    }
  }

  function _clearUserData() {
    if (!confirm('Delete all YOUR local records?')) return;
    if (typeof clearAllData === 'function') clearAllData();
    if (typeof showToast === 'function') showToast('✅ User data cleared', 'success');
  }

  function _resetFactory() {
    if (!confirm('⚠️ FACTORY RESET — Clear all local database storage?')) return;
    localStorage.clear();
    if (window.db) {
      Array.from(window.db.objectStoreNames).forEach(s => {
        try { window.db.transaction(s, 'readwrite').objectStore(s).clear(); } catch {}
      });
    }
    if (typeof showToast === 'function') showToast('Factory reset complete. Reloading…', 'info');
    setTimeout(() => location.reload(), 1500);
  }

  /* ══════════════════════════════════════════════════════
     REAL-TIME NOTIFICATIONS & BADGE SYNC
  ══════════════════════════════════════════════════════ */
  async function _syncPendingCounts() {
    if (!_isAdminUser()) return;
    const sb = _getSb();
    if (!sb) return;

    try {
      let arCount = 0;
      let upCount = 0;

      const { count: c1 } = await sb.from('access_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending');
      arCount = c1 || 0;

      const { count: c2 } = await sb.from('user_profiles').select('*', { count: 'exact', head: true }).eq('active', false);
      upCount = c2 || 0;

      _pendingApprovalsCount = arCount + upCount;

      /* Update tab badge in Admin Panel if open */
      const tabBadge = document.getElementById('adminApprovalsTabBadge');
      if (tabBadge) {
        tabBadge.textContent = _pendingApprovalsCount;
        tabBadge.style.display = _pendingApprovalsCount > 0 ? 'inline-block' : 'none';
      }

      /* Update Topbar Badges */
      _updateTopbarBadges(_pendingApprovalsCount);

      /* Update Profile Modal Admin Row Badge */
      const bpmBadge = document.getElementById('bpmAdminPendingBadge');
      if (bpmBadge) {
        if (_pendingApprovalsCount > 0) {
          bpmBadge.textContent = `⏳ ${_pendingApprovalsCount} Pending`;
          bpmBadge.style.display = 'inline-block';
        } else {
          bpmBadge.style.display = 'none';
        }
      }
    } catch (e) {}
  }

  function _updateTopbarBadges(count) {
    // 1. Ledger topbar
    const userChip = document.getElementById('topbarUserChip') || document.querySelector('.topbar-user-chip') || document.getElementById('topbarUserChipWrap');
    if (userChip) {
      let badge = userChip.querySelector('#topbarAdminBadge');
      if (!badge) {
        badge = document.createElement('span');
        badge.id = 'topbarAdminBadge';
        badge.className = 'topbar-admin-badge';
        userChip.style.position = 'relative';
        userChip.appendChild(badge);
      }
      if (count > 0) {
        badge.textContent = count;
        badge.style.display = 'inline-flex';
      } else {
        badge.style.display = 'none';
      }
    }

    // 2. Study Hub topbar / user cards
    const studyChip = document.getElementById('studyUserChip') || document.querySelector('.study-topbar-profile') || document.getElementById('agfProfileCard');
    if (studyChip) {
      let badge = studyChip.querySelector('#topbarAdminBadge');
      if (!badge) {
        badge = document.createElement('span');
        badge.id = 'topbarAdminBadge';
        badge.className = 'topbar-admin-badge';
        studyChip.style.position = 'relative';
        studyChip.appendChild(badge);
      }
      if (count > 0) {
        badge.textContent = count;
        badge.style.display = 'inline-flex';
      } else {
        badge.style.display = 'none';
      }
    }
  }

  function _showApprovalToast(title, message, isNewRequest) {
    document.getElementById('lm-admin-rt-toast')?.remove();

    const toast = document.createElement('div');
    toast.id = 'lm-admin-rt-toast';
    toast.style.cssText = `
      position: fixed;
      top: 24px;
      right: 24px;
      z-index: 2147483647;
      background: var(--adm-surface-1, #131720);
      border: 1px solid var(--adm-warning-border, rgba(245,158,11,0.35));
      box-shadow: 0 16px 40px rgba(0,0,0,0.7), 0 0 16px rgba(245,158,11,0.15);
      border-radius: 12px;
      padding: 16px 18px;
      max-width: 380px;
      width: calc(100% - 48px);
      display: flex;
      flex-direction: column;
      gap: 10px;
      animation: admSlideUp 0.22s ease-out;
      font-family: var(--font-m, inherit);
      box-sizing: border-box;
    `;

    toast.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;">
        <div style="display:flex;align-items:center;gap:8px;">
          <span style="font-size:18px;">🔔</span>
          <span style="font-weight:700;color:var(--adm-warning, #f59e0b);font-size:13px;">${_esc(title)}</span>
        </div>
        <button class="adm-btn adm-btn-icon adm-btn-sm" onclick="document.getElementById('lm-admin-rt-toast')?.remove()" aria-label="Close notification">✕</button>
      </div>
      <div style="font-size:12px;color:var(--adm-text-secondary, #94a3b8);line-height:1.45;">${_esc(message)}</div>
      <div style="display:flex;gap:8px;margin-top:2px;">
        <button class="adm-btn adm-btn-primary adm-btn-sm" onclick="window.LM_Admin.show('approvals'); document.getElementById('lm-admin-rt-toast')?.remove();" style="flex:1;">
          Review &amp; Approve
        </button>
        <button class="adm-btn adm-btn-sm" onclick="document.getElementById('lm-admin-rt-toast')?.remove()">
          Dismiss
        </button>
      </div>
    `;

    document.body.appendChild(toast);
    setTimeout(() => { toast?.remove(); }, 9000);
  }

  function initRealtimeNotifications() {
    if (!_isAdminUser()) return;
    const sb = _getSb();
    if (!sb || _realtimeChannel) return;

    _syncPendingCounts();

    try {
      _realtimeChannel = sb.channel('lm-admin-approvals-feed')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'access_requests' }, (payload) => {
          _syncPendingCounts();
          if (payload.eventType === 'INSERT' && payload.new?.status === 'pending') {
            _showApprovalToast('New Access Request', `${payload.new.name || payload.new.email} requested access for ${payload.new.app || 'the application'}.`, true);
          }
          if (document.getElementById('adminPanelOverlay') && _activeTab === 'approvals') {
            _loadApprovalsData();
          }
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'user_profiles' }, (payload) => {
          _syncPendingCounts();
          if (payload.eventType === 'INSERT' && !payload.new?.active) {
            _showApprovalToast('New User Pending Activation', `${payload.new.display_name || payload.new.email} signed up and requires admin activation.`, true);
          }
          if (document.getElementById('adminPanelOverlay') && (_activeTab === 'approvals' || _activeTab === 'users')) {
            if (_activeTab === 'approvals') _loadApprovalsData();
            if (_activeTab === 'users') _refreshUserList();
          }
        })
        .subscribe();
    } catch (e) {}
  }

  /* ── Helper ────────────────────────────────────────── */
  function _esc(str) {
    return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  /* ── Keyboard & Escape Modal Dismissal ─────────────── */
  if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
    window.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape') return;
      const subModals = ['#lm-approval-modal', '#lm-configure-user-modal', '#lm-finance-modal', '#lm-study-modal', '#lm-del-modal'];
      for (const sel of subModals) {
        const el = document.querySelector(sel);
        if (el) {
          el.remove();
          e.stopImmediatePropagation();
          return;
        }
      }
      if (document.getElementById('adminPanelOverlay')) {
        closeAdminPanel();
      }
    });
  }

  /* ══════════════════════════════════════════════════════
     PUBLIC API
  ══════════════════════════════════════════════════════ */
  window.LM_Admin = {
    show                    : showAdminPanel,
    close                   : closeAdminPanel,
    switchTab               : _switchTab,
    refreshCurrentTab       : _refreshCurrentTab,
    setApprovalsSubTab      : _setApprovalsSubTab,
    setApprovalsFilter      : _setApprovalsFilter,
    openApproveRequestModal : _openApproveRequestModal,
    commitApproveRequest    : _commitApproveRequest,
    rejectAccessRequest     : _rejectAccessRequest,
    deleteAccessRequest     : _deleteAccessRequest,
    batchApproveAllPending  : _batchApproveAllPending,
    showCreateUserForm      : _showCreateUserForm,
    submitCreateUser        : _submitCreateUser,
    onUserSearch            : _onUserSearch,
    approveUser             : _approveUser,
    deactivateUser          : _deactivateUser,
    toggleRole              : _toggleRole,
    showFinanceAccess       : _showFinanceAccess,
    saveFinanceAccess       : _saveFinanceAccess,
    showStudyAccess         : _showStudyAccess,
    saveStudyAccess         : _saveStudyAccess,
    openConfigureUserModal  : _openConfigureUserModal,
    saveConfigureUser       : _saveConfigureUser,
    saveWeeklyGoal          : _saveWeeklyGoal,
    deleteUser              : _deleteUser,
    executeDelete           : _executeDelete,
    saveAppSettings         : _saveAppSettings,
    exportBackup            : _exportBackup,
    syncToCloud             : _syncToCloud,
    importBackup            : _importBackup,
    clearUserData           : _clearUserData,
    resetFactory            : _resetFactory,
    initRealtimeNotifications: initRealtimeNotifications,
    syncPendingCounts       : _syncPendingCounts,
    _prevPage               : () => { if (_userPage > 0) _refreshUserList(_userPage - 1); },
    _nextPage               : () => { const tp = Math.ceil(_userTotal / PAGE_SIZE); if (_userPage < tp - 1) _refreshUserList(_userPage + 1); }
  };

  /* StudyAdmin proxy for backwards compatibility across study pages */
  window.StudyAdmin = {
    open       : () => showAdminPanel('study'),
    close      : closeAdminPanel,
    switchTab  : _switchTab,
    approve    : _approveUser,
    deactivate : _deactivateUser,
    modAccess  : (userId) => _showStudyAccess(userId, 'User', null),
    saveWkGoal : _saveWeeklyGoal,
  };

  /* Auto-initialize realtime notification engine when DOM is ready */
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading' && typeof document.addEventListener === 'function') {
      document.addEventListener('DOMContentLoaded', () => {
        setTimeout(initRealtimeNotifications, 1000);
      });
    } else {
      setTimeout(initRealtimeNotifications, 1000);
    }
  }

})();
