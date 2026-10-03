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
    } catch (e) {}
    return false;
  }

  /* ══════════════════════════════════════════════════════
     ENTRY / EXIT
  ══════════════════════════════════════════════════════ */
  function showAdminPanel(initialTab) {
    if (!_isAdminUser()) {
      if (typeof showToast === 'function') showToast('Access denied: Admin role required.', 'error');
      else alert('Access denied: Admin role required.');
      return;
    }
    _renderPanel(initialTab || _activeTab || 'approvals');
  }

  function closeAdminPanel() {
    document.getElementById('adminPanelOverlay')?.remove();
  }

  /* ══════════════════════════════════════════════════════
     PANEL SHELL
  ══════════════════════════════════════════════════════ */
  function _renderPanel(defaultTab) {
    document.getElementById('adminPanelOverlay')?.remove();

    const overlay = document.createElement('div');
    overlay.id = 'adminPanelOverlay';
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeAdminPanel();
    });

    overlay.innerHTML = `
<div id="adminPanel">
  <div class="admin-header">
    <div style="display:flex;align-items:center;gap:12px;">
      <div style="width:38px;height:38px;border-radius:10px;background:linear-gradient(135deg,#6366f1,#8b5cf6);display:flex;align-items:center;justify-content:center;font-size:20px;box-shadow:0 4px 12px rgba(99,102,241,0.3);">⚙️</div>
      <div>
        <div class="admin-title" style="display:flex;align-items:center;gap:8px;">
          Admin Command Center
          <span style="font-size:10px;padding:2px 8px;border-radius:99px;background:rgba(99,102,241,0.15);color:#818cf8;border:1px solid rgba(99,102,241,0.3);font-weight:700;letter-spacing:0.5px;">UNIFIED</span>
        </div>
        <div class="admin-sub">User Approvals · Permissions · Study Hub · System Governance</div>
      </div>
    </div>
    <div style="display:flex;align-items:center;gap:8px;">
      <button onclick="window.LM_Admin.refreshCurrentTab()" class="admin-btn admin-btn-sm" title="Refresh data" style="display:flex;align-items:center;gap:4px;">🔄 Refresh</button>
      <button onclick="window.LM_Admin.close()" class="modal-close" title="Close">✕</button>
    </div>
  </div>

  <div class="admin-body">
    <nav class="admin-tabs">
      <button class="admin-nav-item ${defaultTab==='approvals'?'active':''}" data-tab="approvals" onclick="window.LM_Admin.switchTab('approvals')">
        ⏳ Approvals <span id="adminApprovalsTabBadge" class="admin-tab-count" style="${_pendingApprovalsCount>0?'':'display:none;'}">${_pendingApprovalsCount}</span>
      </button>
      <button class="admin-nav-item ${defaultTab==='users'?'active':''}" data-tab="users" onclick="window.LM_Admin.switchTab('users')">👥 Users &amp; Permissions</button>
      <button class="admin-nav-item ${defaultTab==='study'?'active':''}" data-tab="study" onclick="window.LM_Admin.switchTab('study')">📚 Study Hub</button>
      <button class="admin-nav-item ${defaultTab==='stats'?'active':''}" data-tab="stats" onclick="window.LM_Admin.switchTab('stats')">📊 Statistics</button>
      <button class="admin-nav-item ${defaultTab==='appsettings'?'active':''}" data-tab="appsettings" onclick="window.LM_Admin.switchTab('appsettings')">🔧 App Settings</button>
      <button class="admin-nav-item ${defaultTab==='backup'?'active':''}" data-tab="backup" onclick="window.LM_Admin.switchTab('backup')">🗄️ Backup &amp; Sync</button>
    </nav>
    <div class="admin-content" id="adminContent"></div>
  </div>
</div>`;

    document.body.appendChild(overlay);
    _switchTab(defaultTab || 'approvals');
  }

  /* ══════════════════════════════════════════════════════
     TAB SWITCHER
  ══════════════════════════════════════════════════════ */
  function _switchTab(tab) {
    _activeTab = tab;
    document.querySelectorAll('.admin-nav-item').forEach(b =>
      b.classList.toggle('active', b.dataset.tab === tab)
    );
    const content = document.getElementById('adminContent');
    if (!content) return;

    switch (tab) {
      case 'approvals':   _renderApprovalsTab(content);   break;
      case 'users':       _renderUsersTab(content);       break;
      case 'study':       _renderStudyTab(content);       break;
      case 'stats':       _renderStats(content);          break;
      case 'appsettings': content.innerHTML = _tabAppSettings(); _bindAppSettings(); break;
      case 'backup':      content.innerHTML = _tabBackup(); _bindBackupTab();        break;
    }
  }

  function _refreshCurrentTab() {
    _switchTab(_activeTab || 'approvals');
    _syncPendingCounts();
  }

  /* ══════════════════════════════════════════════════════
     TAB 1: APPROVALS HUB (access_requests + user_profiles)
  ══════════════════════════════════════════════════════ */
  async function _renderApprovalsTab(container) {
    container.innerHTML = `
<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;margin-bottom:16px;">
  <div>
    <div class="admin-section-title" style="margin:0;border:none;padding:0;">⏳ User Access &amp; Approvals Hub</div>
    <div style="font-size:12px;color:var(--text-3);margin-top:2px;">Review incoming self-registration requests and activate pending accounts.</div>
  </div>
  <div style="display:flex;gap:8px;align-items:center;">
    <button class="admin-btn admin-btn-sm admin-btn-success" onclick="window.LM_Admin.batchApproveAllPending()" style="display:flex;align-items:center;gap:6px;">
      ⚡ Approve All Pending
    </button>
  </div>
</div>

<!-- Sub Tabs & Status Filters -->
<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;background:var(--bg3,rgba(255,255,255,0.03));padding:10px 14px;border-radius:12px;border:1px solid var(--border);margin-bottom:18px;">
  <div style="display:flex;gap:6px;">
    <button class="admin-pill-btn ${_approvalsSubTab==='requests'?'active':''}" onclick="window.LM_Admin.setApprovalsSubTab('requests')">
      📝 Access Requests (Public)
    </button>
    <button class="admin-pill-btn ${_approvalsSubTab==='users'?'active':''}" onclick="window.LM_Admin.setApprovalsSubTab('users')">
      👥 Pending Accounts (DB)
    </button>
  </div>

  <div style="display:flex;gap:6px;align-items:center;">
    <span style="font-size:11px;font-weight:700;color:var(--text-3);text-transform:uppercase;">Filter:</span>
    <button class="admin-filter-btn ${_approvalsFilter==='pending'?'active':''}" onclick="window.LM_Admin.setApprovalsFilter('pending')">Pending</button>
    <button class="admin-filter-btn ${_approvalsFilter==='approved'?'active':''}" onclick="window.LM_Admin.setApprovalsFilter('approved')">Approved</button>
    <button class="admin-filter-btn ${_approvalsFilter==='rejected'?'active':''}" onclick="window.LM_Admin.setApprovalsFilter('rejected')">Rejected</button>
    <button class="admin-filter-btn ${_approvalsFilter==='all'?'active':''}" onclick="window.LM_Admin.setApprovalsFilter('all')">All</button>
  </div>
</div>

<div id="approvalsListArea">
  <div style="padding:40px;text-align:center;color:var(--text-3);">Loading approval records…</div>
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
      area.innerHTML = '<div style="padding:32px;text-align:center;color:#fb7185;">Database client not initialized.</div>';
      return;
    }

    if (_approvalsSubTab === 'requests') {
      /* Query access_requests */
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
        area.innerHTML = `<div style="padding:32px;text-align:center;color:#fb7185;">Failed to load access requests: ${_esc(err.message)}</div>`;
      }
    } else {
      /* Query user_profiles */
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
        area.innerHTML = `<div style="padding:32px;text-align:center;color:#fb7185;">Failed to load pending accounts: ${_esc(err.message)}</div>`;
      }
    }
  }

  function _renderAccessRequestsList(area, requests) {
    if (!requests || requests.length === 0) {
      area.innerHTML = `
<div style="text-align:center;padding:50px 20px;background:rgba(255,255,255,0.02);border:1px dashed var(--border);border-radius:14px;">
  <div style="font-size:36px;margin-bottom:8px;">🎉</div>
  <div style="font-size:14px;font-weight:700;color:var(--text);">No access requests found</div>
  <div style="font-size:12px;color:var(--text-3);margin-top:4px;">No incoming requests match the "${_approvalsFilter}" filter.</div>
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
        ? '<span class="admin-badge badge-inactive">⏳ Pending Review</span>'
        : isApproved
          ? '<span class="admin-badge badge-active">✅ Approved</span>'
          : '<span class="admin-badge" style="background:rgba(239,68,68,0.15);color:#f87171;">❌ Rejected</span>';

      return `
<div class="admin-approval-card" style="background:var(--bg3,rgba(255,255,255,0.03));border:1px solid ${isPending?'rgba(251,191,36,0.3)':'var(--border)'};border-radius:14px;padding:16px;margin-bottom:12px;display:flex;flex-direction:column;gap:12px;">
  <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:10px;">
    <div style="display:flex;gap:12px;align-items:center;">
      <div style="width:40px;height:40px;border-radius:50%;background:linear-gradient(135deg,rgba(99,102,241,0.2),rgba(139,92,246,0.2));border:1px solid rgba(139,92,246,0.3);display:flex;align-items:center;justify-content:center;font-weight:700;color:#c084fc;font-size:15px;flex-shrink:0;">
        ${initial}
      </div>
      <div>
        <div style="font-weight:700;color:var(--text);font-size:14px;display:flex;align-items:center;gap:8px;">
          ${_esc(req.name || (req.email ? req.email.split('@')[0] : 'Applicant'))}
          <span style="font-size:11px;font-weight:600;padding:2px 8px;border-radius:6px;background:rgba(255,255,255,0.06);color:var(--text-2);">${appBadge}</span>
        </div>
        <div style="font-size:12px;color:var(--text-3);margin-top:2px;">✉️ ${_esc(req.email)} · 🕒 ${timeStr}</div>
      </div>
    </div>
    <div>${statusBadge}</div>
  </div>

  ${req.message ? `<div style="background:rgba(0,0,0,0.2);border:1px solid rgba(255,255,255,0.05);border-radius:8px;padding:10px 12px;font-size:12px;color:var(--text-2);line-height:1.5;">💬 <em>"${_esc(req.message)}"</em></div>` : ''}

  <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;border-top:1px solid rgba(255,255,255,0.05);padding-top:10px;margin-top:2px;">
    <div style="font-size:11px;color:var(--text-3);">
      ${req.reviewed_at ? `Reviewed: ${new Date(req.reviewed_at).toLocaleDateString()}` : 'Awaiting admin decision'}
    </div>
    <div style="display:flex;gap:8px;">
      ${isPending ? `
        <button class="admin-btn admin-btn-success admin-btn-sm" onclick="window.LM_Admin.openApproveRequestModal('${req.id}')">
          ✨ Approve &amp; Configure
        </button>
        <button class="admin-btn admin-btn-danger admin-btn-sm" onclick="window.LM_Admin.rejectAccessRequest('${req.id}')">
          ❌ Reject
        </button>
      ` : ''}
      ${isApproved ? `
        <button class="admin-btn admin-btn-sm" onclick="window.LM_Admin.openApproveRequestModal('${req.id}')">
          ⚙️ Reconfigure Access
        </button>
      ` : ''}
      ${isRejected ? `
        <button class="admin-btn admin-btn-success admin-btn-sm" onclick="window.LM_Admin.openApproveRequestModal('${req.id}')">
          🔄 Re-Approve
        </button>
      ` : ''}
      <button class="admin-btn admin-btn-sm" style="color:#f87171;" onclick="window.LM_Admin.deleteAccessRequest('${req.id}')" title="Delete request record">
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
<div style="text-align:center;padding:50px 20px;background:rgba(255,255,255,0.02);border:1px dashed var(--border);border-radius:14px;">
  <div style="font-size:36px;margin-bottom:8px;">👥</div>
  <div style="font-size:14px;font-weight:700;color:var(--text);">No accounts match criteria</div>
  <div style="font-size:12px;color:var(--text-3);margin-top:4px;">No database user profiles found for filter "${_approvalsFilter}".</div>
</div>`;
      return;
    }

    const cards = profiles.map(u => {
      const initial = (u.display_name || u.email || '?').charAt(0).toUpperCase();
      const isPending = !u.active;

      return `
<div class="admin-approval-card" style="background:var(--bg3,rgba(255,255,255,0.03));border:1px solid ${isPending?'rgba(251,113,133,0.3)':'var(--border)'};border-radius:14px;padding:16px;margin-bottom:12px;display:flex;flex-direction:column;gap:12px;">
  <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:10px;">
    <div style="display:flex;gap:12px;align-items:center;">
      <div style="width:40px;height:40px;border-radius:50%;background:rgba(45,212,191,0.15);border:1px solid rgba(45,212,191,0.3);display:flex;align-items:center;justify-content:center;font-weight:700;color:var(--teal);font-size:15px;flex-shrink:0;">
        ${initial}
      </div>
      <div>
        <div style="font-weight:700;color:var(--text);font-size:14px;display:flex;align-items:center;gap:8px;">
          ${_esc(u.display_name || (u.email ? u.email.split('@')[0] : 'User'))}
          <span class="admin-badge ${u.role==='admin'?'badge-admin':'badge-user'}">${u.role || 'user'}</span>
        </div>
        <div style="font-size:12px;color:var(--text-3);margin-top:2px;">✉️ ${_esc(u.email)} · Joined: ${new Date(u.created_at).toLocaleDateString()}</div>
      </div>
    </div>
    <div>
      <span class="admin-badge ${u.active?'badge-active':'badge-inactive'}">${u.active ? '✅ Active' : '⏳ Pending Activation'}</span>
    </div>
  </div>

  <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;border-top:1px solid rgba(255,255,255,0.05);padding-top:10px;">
    <div style="font-size:11px;color:var(--text-3);">
      Study Modules: ${u.study_modules === null ? 'All' : (Array.isArray(u.study_modules) ? u.study_modules.length + ' allowed' : 'Default')}
    </div>
    <div style="display:flex;gap:8px;">
      ${!u.active ? `
        <button class="admin-btn admin-btn-success admin-btn-sm" onclick="window.LM_Admin.approveUser('${u.id}')">✅ Quick Activate</button>
        <button class="admin-btn admin-btn-sm" style="border-color:rgba(139,92,246,0.4);color:#8b5cf6;" onclick="window.LM_Admin.openConfigureUserModal('${u.id}')">
          ⚙️ Configure Access
        </button>
      ` : `
        <button class="admin-btn admin-btn-warn admin-btn-sm" onclick="window.LM_Admin.deactivateUser('${u.id}')">⏸ Pause Access</button>
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
<label style="display:flex;align-items:center;gap:6px;font-size:12px;cursor:pointer;padding:3px 0;">
  <input type="checkbox" id="req_fin_${m.key}" value="${m.key}" ${isLedgerPrechecked ? 'checked' : ''} style="accent-color:var(--teal);"> ${m.label}
</label>`).join('');

    const studyCheckboxes = STUDY_MODULES.map(m => `
<label style="display:flex;align-items:center;gap:6px;font-size:12px;cursor:pointer;padding:3px 0;">
  <input type="checkbox" id="req_std_${m.key}" value="${m.key}" ${isStudyPrechecked ? 'checked' : ''} style="accent-color:#8b5cf6;"> ${m.label}
</label>`).join('');

    const modal = document.createElement('div');
    modal.id = 'lm-approval-modal';
    modal.style.cssText = 'position:fixed;inset:0;z-index:2147483647;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.75);backdrop-filter:blur(6px);padding:20px;';
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.remove();
    });

    modal.innerHTML = `
<div style="background:var(--card,#151922);border:1px solid rgba(99,102,241,.3);border-radius:18px;padding:26px;max-width:540px;width:100%;box-shadow:0 24px 60px rgba(0,0,0,.9);max-height:90vh;overflow-y:auto;">
  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
    <div style="font-size:16px;font-weight:800;color:var(--text);">✨ Approve &amp; Configure User Access</div>
    <button onclick="document.getElementById('lm-approval-modal')?.remove()" style="background:none;border:none;color:var(--text-3);cursor:pointer;font-size:20px;">✕</button>
  </div>

  <div style="background:rgba(255,255,255,0.03);border:1px solid var(--border);border-radius:10px;padding:12px;margin-bottom:16px;">
    <div style="font-size:13px;font-weight:700;color:var(--text);">${_esc(name)}</div>
    ${email ? `<div style="font-size:12px;color:var(--text-3);">${_esc(email)}</div>` : ''}
  </div>

  <div style="margin-bottom:14px;">
    <label class="admin-label">Assign Role</label>
    <select id="req_role_select" class="form-input">
      <option value="user" selected>👤 Normal User (Restricted to granted modules)</option>
      <option value="admin">⭐ Full Administrator (Full System Access)</option>
    </select>
  </div>

  <div style="margin-bottom:16px;">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
      <label class="admin-label" style="margin:0;">💰 LedgerMate Finance Modules</label>
      <button class="admin-btn admin-btn-sm" style="font-size:10px;padding:2px 6px;" onclick="document.querySelectorAll('[id^=req_fin_]').forEach(c=>c.checked=true)">Select All</button>
    </div>
    <div class="admin-module-grid" style="max-height:130px;overflow-y:auto;background:rgba(0,0,0,0.15);padding:8px;border-radius:8px;">${financeCheckboxes}</div>
  </div>

  <div style="margin-bottom:18px;">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
      <label class="admin-label" style="margin:0;">📚 Study Hub Prep Modules</label>
      <button class="admin-btn admin-btn-sm" style="font-size:10px;padding:2px 6px;" onclick="document.querySelectorAll('[id^=req_std_]').forEach(c=>c.checked=true)">Select All</button>
    </div>
    <div class="admin-module-grid" style="max-height:130px;overflow-y:auto;background:rgba(0,0,0,0.15);padding:8px;border-radius:8px;">${studyCheckboxes}</div>
  </div>

  <div id="approveModalErr" style="display:none;color:#fb7185;font-size:12px;margin-bottom:12px;padding:8px 12px;background:rgba(251,113,133,0.1);border-radius:8px;"></div>

  <div style="display:flex;gap:10px;">
    <button class="btn-submit" id="submitApproveReqBtn" onclick="window.LM_Admin.commitApproveRequest('${requestId}')">
      ✅ Approve &amp; Activate
    </button>
    <button class="admin-btn" onclick="document.getElementById('lm-approval-modal')?.remove()">Cancel</button>
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
<label style="display:flex;align-items:center;gap:6px;font-size:12px;cursor:pointer;padding:3px 0;">
  <input type="checkbox" id="cfg_fin_${m.key}" value="${m.key}" ${finAllowed.includes(m.key) ? 'checked' : ''} style="accent-color:var(--teal);"> ${m.label}
</label>`).join('');

    const studyCheckboxes = STUDY_MODULES.map(m => `
<label style="display:flex;align-items:center;gap:6px;font-size:12px;cursor:pointer;padding:3px 0;">
  <input type="checkbox" id="cfg_std_${m.key}" value="${m.key}" ${stdAllowed.includes(m.key) ? 'checked' : ''} style="accent-color:#8b5cf6;"> ${m.label}
</label>`).join('');

    const modal = document.createElement('div');
    modal.id = 'lm-configure-user-modal';
    modal.style.cssText = 'position:fixed;inset:0;z-index:2147483647;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.75);backdrop-filter:blur(6px);padding:20px;';
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.remove();
    });

    modal.innerHTML = `
<div style="background:var(--card,#151922);border:1px solid rgba(139,92,246,.3);border-radius:18px;padding:26px;max-width:540px;width:100%;box-shadow:0 24px 60px rgba(0,0,0,.9);max-height:90vh;overflow-y:auto;">
  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
    <div style="font-size:16px;font-weight:800;color:var(--text);">⚙️ Configure User Account &amp; Access</div>
    <button onclick="document.getElementById('lm-configure-user-modal')?.remove()" style="background:none;border:none;color:var(--text-3);cursor:pointer;font-size:20px;">✕</button>
  </div>

  <div style="background:rgba(255,255,255,0.03);border:1px solid var(--border);border-radius:10px;padding:12px;margin-bottom:16px;">
    <div style="font-size:13px;font-weight:700;color:var(--text);">${_esc(name)}</div>
    ${email ? `<div style="font-size:12px;color:var(--text-3);">${_esc(email)}</div>` : ''}
  </div>

  <div style="margin-bottom:14px;">
    <label class="admin-label">Assign Role</label>
    <select id="cfg_role_select" class="form-input">
      <option value="user" ${role === 'user' ? 'selected' : ''}>👤 Normal User (Restricted to granted modules)</option>
      <option value="admin" ${role === 'admin' ? 'selected' : ''}>⭐ Full Administrator (Full System Access)</option>
    </select>
  </div>

  <div style="margin-bottom:16px;">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
      <label class="admin-label" style="margin:0;">💰 LedgerMate Finance Modules</label>
      <button class="admin-btn admin-btn-sm" style="font-size:10px;padding:2px 6px;" onclick="document.querySelectorAll('[id^=cfg_fin_]').forEach(c=>c.checked=true)">Select All</button>
    </div>
    <div class="admin-module-grid" style="max-height:130px;overflow-y:auto;background:rgba(0,0,0,0.15);padding:8px;border-radius:8px;">${financeCheckboxes}</div>
  </div>

  <div style="margin-bottom:18px;">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
      <label class="admin-label" style="margin:0;">📚 Study Hub Prep Modules</label>
      <button class="admin-btn admin-btn-sm" style="font-size:10px;padding:2px 6px;" onclick="document.querySelectorAll('[id^=cfg_std_]').forEach(c=>c.checked=true)">Select All</button>
    </div>
    <div class="admin-module-grid" style="max-height:130px;overflow-y:auto;background:rgba(0,0,0,0.15);padding:8px;border-radius:8px;">${studyCheckboxes}</div>
  </div>

  <!-- ✨ Personal Learning Workspace Customization Permission -->
  <label style="display:flex;align-items:flex-start;gap:10px;cursor:pointer;padding:12px;background:rgba(79,142,247,0.06);border:1px solid rgba(79,142,247,0.22);border-radius:10px;margin-bottom:18px;">
    <input type="checkbox" id="cfg_study_customizer" ${canCustomizeStudy ? 'checked' : ''} style="width:16px;height:16px;margin-top:2px;accent-color:#4f8ef7;cursor:pointer;">
    <div>
      <div style="font-size:12px;font-weight:700;color:var(--text);">✨ Allow Personal Learning Workspace Customization</div>
      <div style="font-size:11px;color:var(--text-3);margin-top:2px;">Allows user to add custom languages/topics, upload materials, customize dashboard widgets, and set personal milestones.</div>
    </div>
  </label>

  <div id="cfgModalErr" style="display:none;color:#fb7185;font-size:12px;margin-bottom:12px;padding:8px 12px;background:rgba(251,113,133,0.1);border-radius:8px;"></div>

  <div style="display:flex;gap:10px;">
    <button class="btn-submit" id="submitCfgUserBtn" onclick="window.LM_Admin.saveConfigureUser('${userId}')">
      💾 Save &amp; Activate
    </button>
    <button class="admin-btn" onclick="document.getElementById('lm-configure-user-modal')?.remove()">Cancel</button>
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
<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin-bottom:16px;">
  <div>
    <div class="admin-section-title" style="margin:0;border:none;padding:0;">👥 Users &amp; Permissions Directory</div>
    <div style="font-size:12px;color:var(--text-3);margin-top:2px;">Manage user accounts, administrative roles, and application module access.</div>
  </div>
  <button class="btn-submit" onclick="window.LM_Admin.showCreateUserForm()">➕ Create New User</button>
</div>

<!-- Search & Action Area -->
<div style="display:flex;gap:10px;align-items:center;margin-bottom:16px;">
  <input type="text" id="adminUserSearchInput" class="form-input" placeholder="🔍 Search by name or email…" value="${_esc(_userSearchQuery)}" oninput="window.LM_Admin.onUserSearch(this.value)" style="max-width:360px;">
</div>

<div id="userFormArea"></div>
<div id="userListArea"><div style="padding:40px;text-align:center;color:var(--text-3);">Loading users…</div></div>`;

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

    area.innerHTML = '<div style="padding:40px;text-align:center;color:var(--text-3);">Loading users…</div>';

    const sb = _getSb();
    if (!sb) {
      area.innerHTML = '<div style="padding:32px;text-align:center;color:#fb7185;">Database client not initialized.</div>';
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
      area.innerHTML = `<div style="padding:32px;text-align:center;color:#fb7185;">Failed to load users: ${_esc(loadErr)}</div>`;
      return;
    }

    const currentUid = (window.LM_Auth && typeof window.LM_Auth.getCurrentUser === 'function')
      ? window.LM_Auth.getCurrentUser()?.userId
      : null;

    const _row = (u) => {
      const initial = (u.display_name || u.email || '?').charAt(0).toUpperCase();

      return `
<tr>
  <td>
    <div style="display:flex;align-items:center;gap:10px;">
      <div style="width:34px;height:34px;border-radius:50%;background:rgba(45,212,191,0.15);border:1px solid rgba(45,212,191,0.25);
           display:flex;align-items:center;justify-content:center;font-weight:700;color:var(--teal);font-size:13px;flex-shrink:0;">
        ${initial}
      </div>
      <div>
        <div style="font-weight:600;color:var(--text);">${_esc(u.display_name || (u.email ? u.email.split('@')[0] : 'User'))}</div>
        <div style="font-size:11px;color:var(--text-3);">${_esc(u.email)}</div>
      </div>
    </div>
  </td>
  <td><span class="admin-badge ${u.role === 'admin' ? 'badge-admin' : 'badge-user'}">${u.role || 'user'}</span></td>
  <td><span class="admin-badge ${u.active ? 'badge-active' : 'badge-inactive'}">${u.active ? 'Active' : 'Pending'}</span></td>
  <td style="font-size:11px;color:var(--text-3);">${new Date(u.created_at).toLocaleDateString()}</td>
  <td>
    <div style="display:flex;gap:6px;flex-wrap:wrap;">
      ${!u.active ? `<button class="admin-btn admin-btn-success admin-btn-sm" onclick="window.LM_Admin.approveUser('${u.id}')">✅ Approve</button>` : ''}
      ${u.active  ? `<button class="admin-btn admin-btn-warn admin-btn-sm"    onclick="window.LM_Admin.deactivateUser('${u.id}')">⏸ Pause</button>` : ''}
      <button class="admin-btn admin-btn-sm" onclick="window.LM_Admin.toggleRole('${u.id}','${u.role === 'admin' ? 'user' : 'admin'}')">
        ${u.role === 'admin' ? '👤 Make User' : '⭐ Make Admin'}
      </button>
      <button class="admin-btn admin-btn-sm" style="border-color:rgba(45,212,191,.4);color:var(--teal);" onclick="window.LM_Admin.showFinanceAccess('${u.id}')">💰 Finance</button>
      <button class="admin-btn admin-btn-sm" style="border-color:rgba(139,92,246,.4);color:#8b5cf6;" onclick="window.LM_Admin.showStudyAccess('${u.id}')">📚 Study</button>
      ${u.id !== currentUid ? `<button class="admin-btn admin-btn-danger admin-btn-sm" onclick="window.LM_Admin.deleteUser('${u.id}')">🗑 Delete</button>` : ''}
    </div>
  </td>
</tr>`;
    };

    let html = `
<div class="admin-table-wrap">
  <table class="admin-table">
    <thead><tr><th>User</th><th>Role</th><th>Status</th><th>Joined</th><th>Actions</th></tr></thead>
    <tbody>
      ${profiles.length ? profiles.map(_row).join('') : '<tr><td colspan="5" style="text-align:center;padding:28px;color:var(--text-3);">No users found</td></tr>'}
    </tbody>
  </table>
</div>`;

    const totalPages = Math.max(1, Math.ceil(_userTotal / PAGE_SIZE));
    if (totalPages > 1) {
      html += `
<div style="display:flex;align-items:center;justify-content:space-between;margin-top:14px;padding:10px 14px;background:var(--surface-2,rgba(255,255,255,.04));border:1px solid var(--border);border-radius:10px;font-size:12px;color:var(--text-3);">
  <button class="admin-btn admin-btn-sm" ${_userPage === 0 ? 'disabled' : ''} onclick="window.LM_Admin._prevPage()">← Prev</button>
  <span>Page ${_userPage + 1} of ${totalPages} &nbsp;·&nbsp; ${_userTotal} users total</span>
  <button class="admin-btn admin-btn-sm" ${_userPage >= totalPages - 1 ? 'disabled' : ''} onclick="window.LM_Admin._nextPage()">Next →</button>
</div>`;
    }

    area.innerHTML = html;
  }

  /* ── Create User Form ──────────────────────────────── */
  function _showCreateUserForm() {
    const area = document.getElementById('userFormArea');
    if (!area) return;

    const moduleCheckboxes = ALL_MODULES.map(m => `
<label style="display:flex;align-items:center;gap:6px;font-size:12px;cursor:pointer;padding:3px 0;">
  <input type="checkbox" name="mod_${m.key}" value="${m.key}" checked> ${m.label}
</label>`).join('');

    const studyCheckboxes = STUDY_MODULES.map(m => `
<label style="display:flex;align-items:center;gap:6px;font-size:12px;cursor:pointer;padding:3px 0;">
  <input type="checkbox" name="stmod_${m.key}" value="${m.key}" checked> ${m.label}
</label>`).join('');

    area.innerHTML = `
<div class="admin-form-card" id="userFormCard" style="margin-bottom:16px;background:var(--bg3);border:1px solid var(--border);border-radius:14px;padding:20px;">
  <div class="admin-section-title" style="margin-bottom:16px;">➕ Create New User Account</div>
  <div class="admin-form-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:12px;">
    <div>
      <label class="admin-label">Email *</label>
      <input id="uf_email" class="form-input" type="email" placeholder="user@example.com">
    </div>
    <div>
      <label class="admin-label">Display Name</label>
      <input id="uf_displayName" class="form-input" placeholder="Full name">
    </div>
    <div>
      <label class="admin-label">Password *</label>
      <input id="uf_password" class="form-input" type="password" placeholder="min 6 characters">
    </div>
    <div>
      <label class="admin-label">Confirm Password *</label>
      <input id="uf_password2" class="form-input" type="password" placeholder="repeat password">
    </div>
    <div>
      <label class="admin-label">Role</label>
      <select id="uf_role" class="form-input">
        <option value="user">👤 Normal User</option>
        <option value="admin">⭐ Admin</option>
      </select>
    </div>
    <div>
      <label class="admin-label">Activate Immediately</label>
      <select id="uf_active" class="form-input">
        <option value="true">✅ Yes — active on first login</option>
        <option value="false">⏸ No — pending approval</option>
      </select>
    </div>
  </div>

  <div style="margin-top:16px;">
    <label class="admin-label">Finance Module Access</label>
    <div class="admin-module-grid">${moduleCheckboxes}</div>
  </div>

  <div style="margin-top:14px;">
    <label class="admin-label">Study Hub Module Access</label>
    <div class="admin-module-grid">${studyCheckboxes}</div>
  </div>

  <div id="userFormError" style="display:none;color:#fb7185;font-size:13px;margin-top:12px;padding:10px;background:rgba(251,113,133,0.1);border-radius:8px;"></div>

  <div style="display:flex;gap:10px;margin-top:18px;">
    <button class="btn-submit" onclick="window.LM_Admin.submitCreateUser()">✅ Create User</button>
    <button class="admin-btn" onclick="document.getElementById('userFormArea').innerHTML=''">Cancel</button>
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
      return `<label style="display:flex;align-items:center;gap:8px;font-size:12px;cursor:pointer;padding:5px 0;">
        <input type="checkbox" id="fin_mod_${m.key}" value="${m.key}" ${checked ? 'checked' : ''} style="width:15px;height:15px;accent-color:var(--teal);">
        ${m.label}
      </label>`;
    }).join('');

    const modal = document.createElement('div');
    modal.id = 'lm-finance-modal';
    modal.style.cssText = 'position:fixed;inset:0;z-index:2147483647;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.75);backdrop-filter:blur(6px);padding:20px;';
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.remove();
    });

    modal.innerHTML = `
<div style="background:var(--card,#151922);border:1px solid rgba(45,212,191,.3);border-radius:16px;padding:26px;max-width:460px;width:100%;box-shadow:0 24px 60px rgba(0,0,0,.9);max-height:90vh;overflow-y:auto;">
  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;">
    <div style="font-size:16px;font-weight:700;color:var(--text);">💰 Finance Module Permissions</div>
    <button onclick="document.getElementById('lm-finance-modal')?.remove()" style="background:none;border:none;color:var(--text-3);cursor:pointer;font-size:20px;">✕</button>
  </div>
  <div style="font-size:12px;color:var(--text-3);margin-bottom:14px;">${_esc(userName)}</div>
  <p style="font-size:13px;color:var(--text-2);line-height:1.55;margin-bottom:14px;">
    Choose which LedgerMate finance modules this user can access. Admins always have full access.
  </p>
  <div class="admin-module-grid" style="max-height:220px;overflow-y:auto;background:rgba(0,0,0,0.15);padding:10px;border-radius:8px;">${checkboxes}</div>
  <div style="display:flex;gap:10px;margin-top:20px;">
    <button class="btn-submit" onclick="window.LM_Admin.saveFinanceAccess('${userId}')">💾 Save Permissions</button>
    <button class="admin-btn" onclick="document.getElementById('lm-finance-modal')?.remove()">Cancel</button>
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
      return `<label style="display:flex;align-items:center;gap:8px;font-size:12px;cursor:pointer;padding:5px 0;">
        <input type="checkbox" id="study_mod_${m.key}" value="${m.key}" ${checked ? 'checked' : ''} style="width:15px;height:15px;cursor:pointer;accent-color:#8b5cf6;">
        ${m.label}
      </label>`;
    }).join('');

    const modal = document.createElement('div');
    modal.id = 'lm-study-modal';
    modal.style.cssText = 'position:fixed;inset:0;z-index:2147483647;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.75);backdrop-filter:blur(6px);padding:20px;';
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.remove();
    });

    modal.innerHTML = `
<div style="background:var(--card,#151922);border:1px solid rgba(139,92,246,.3);border-radius:16px;padding:26px;max-width:460px;width:100%;box-shadow:0 24px 60px rgba(0,0,0,.9);max-height:90vh;overflow-y:auto;">
  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;">
    <div style="font-size:16px;font-weight:700;color:var(--text);">📚 Study Module Access</div>
    <button onclick="document.getElementById('lm-study-modal')?.remove()" style="background:none;border:none;color:var(--text-3);cursor:pointer;font-size:20px;">✕</button>
  </div>
  <div style="font-size:12px;color:var(--text-3);margin-bottom:14px;">${_esc(userName)}</div>
  <p style="font-size:13px;color:var(--text-2);line-height:1.55;margin-bottom:14px;">
    Choose which Study Hub modules this user can open. Admins always have full access.
  </p>

  <label style="display:flex;align-items:center;gap:12px;cursor:pointer;padding:12px 14px;background:rgba(139,92,246,.06);border:1px solid rgba(139,92,246,.2);border-radius:10px;margin-bottom:14px;">
    <input type="checkbox" id="study_access_enabled" ${hasAccess ? 'checked' : ''} style="width:17px;height:17px;cursor:pointer;accent-color:#8b5cf6;flex-shrink:0;">
    <div>
      <div style="font-size:13px;font-weight:600;color:var(--text);">Enable Study Hub access</div>
      <div style="font-size:11px;color:var(--text-3);">Uncheck to block all study modules for this user</div>
    </div>
  </label>

  <label style="display:flex;align-items:flex-start;gap:10px;cursor:pointer;padding:10px 12px;background:rgba(79,142,247,0.06);border:1px solid rgba(79,142,247,0.2);border-radius:10px;margin-bottom:16px;">
    <input type="checkbox" id="study_modal_customizer" ${canCustomize ? 'checked' : ''} style="width:16px;height:16px;margin-top:2px;accent-color:#4f8ef7;cursor:pointer;">
    <div>
      <div style="font-size:12px;font-weight:700;color:var(--text);">✨ Personal Workspace Customization</div>
      <div style="font-size:11px;color:var(--text-3);margin-top:1px;">Allows adding custom languages, uploading materials, and custom widgets.</div>
    </div>
  </label>

  <div id="study_module_section" style="transition:opacity .2s;${hasAccess ? '' : 'opacity:.35;pointer-events:none'}">
    <div style="font-size:10px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--text-3);margin-bottom:8px;">Module Permissions</div>
    <div class="admin-module-grid" style="max-height:180px;overflow-y:auto;background:rgba(0,0,0,0.15);padding:8px;border-radius:8px;">${moduleCheckboxes}</div>
  </div>

  <div style="display:flex;gap:10px;margin-top:20px;">
    <button class="btn-submit" onclick="window.LM_Admin.saveStudyAccess('${userId}')">💾 Save Access</button>
    <button class="admin-btn" onclick="document.getElementById('lm-study-modal')?.remove()">Cancel</button>
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
    modal.style.cssText = 'position:fixed;inset:0;z-index:2147483647;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.75);backdrop-filter:blur(6px);padding:20px;';
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.remove();
    });

    modal.innerHTML = `
<div style="background:var(--card,#151922);border:1px solid rgba(244,63,94,.3);border-radius:16px;padding:26px;max-width:440px;width:100%;box-shadow:0 24px 60px rgba(0,0,0,.9);">
  <div style="font-size:32px;text-align:center;margin-bottom:8px;">⚠️</div>
  <div style="font-size:16px;font-weight:700;color:var(--text);text-align:center;margin-bottom:4px;">Delete User Permanently</div>
  <div style="font-size:13px;color:var(--text-3);text-align:center;margin-bottom:16px;">
    Deleting <strong style="color:#f87171;">${_esc(name)}</strong>
  </div>
  <div style="background:rgba(244,63,94,.06);border:1px solid rgba(244,63,94,.15);border-radius:10px;padding:12px;margin-bottom:18px;font-size:12px;color:var(--text-2);line-height:1.9;">
    <div>✗ &nbsp;LedgerMate transactions, budgets, loans, savings</div>
    <div>✗ &nbsp;Notes, credentials vault, investments, trips</div>
    <div>✗ &nbsp;Study Resources account access &amp; progress</div>
    <div>✗ &nbsp;Supabase cloud records &amp; authentication account</div>
    <div style="margin-top:6px;color:#fb7185;font-weight:700;">⚠️ This cannot be undone.</div>
  </div>
  <div id="lm-del-progress" style="display:none;font-size:12px;color:var(--text-2);margin-bottom:14px;line-height:1.9;padding:10px 12px;background:rgba(0,0,0,0.3);border-radius:8px;border:1px solid var(--border);"></div>
  <div style="display:flex;gap:10px;">
    <button id="lm-del-cancel" onclick="document.getElementById('lm-del-modal')?.remove()" class="admin-btn" style="flex:1;">Cancel</button>
    <button id="lm-del-confirm-btn" onclick="window.LM_Admin.executeDelete('${id}')" class="admin-btn admin-btn-danger" style="flex:1;">🗑 Delete Permanently</button>
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
<div class="admin-section-title">📚 Study Hub Administration &amp; Settings</div>

<div class="admin-form-card" style="margin-bottom:16px;background:var(--bg3);border:1px solid var(--border);border-radius:14px;padding:20px;">
  <div style="font-size:14px;font-weight:700;color:var(--text);margin-bottom:4px;">🎯 Weekly Study Question Goal</div>
  <div style="font-size:12px;color:var(--text-3);margin-bottom:14px;">Set the global or default target number of interview practice questions per week.</div>
  <div style="display:flex;gap:10px;align-items:center;">
    <input id="adminWkGoalInput" type="number" min="1" max="500" value="${wkGoal}" class="form-input" style="max-width:140px;font-family:var(--font-m,monospace);">
    <span style="font-size:13px;color:var(--text-2);">questions / week</span>
    <button onclick="window.LM_Admin.saveWeeklyGoal()" class="btn-submit" style="margin-left:auto;">💾 Save Goal</button>
  </div>
</div>

<div class="admin-form-card" style="background:var(--bg3);border:1px solid var(--border);border-radius:14px;padding:20px;">
  <div style="font-size:14px;font-weight:700;color:var(--text);margin-bottom:4px;">🧠 Spaced Repetition (SRS) &amp; Question Banks</div>
  <div style="font-size:12px;color:var(--text-3);margin-bottom:14px;">Study Hub active question banks: 538+ questions across 8 curated tracks.</div>
  <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:10px;">
    ${STUDY_MODULES.map(m => `
      <div style="padding:10px 12px;background:rgba(255,255,255,0.02);border:1px solid var(--border);border-radius:8px;display:flex;align-items:center;justify-content:space-between;">
        <span style="font-size:12px;font-weight:600;color:var(--text);">${m.label}</span>
        <span style="font-size:11px;color:var(--teal);font-weight:700;">ACTIVE</span>
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
    container.innerHTML = '<div style="padding:40px;text-align:center;color:var(--text-3);">Loading statistics…</div>';

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

    const stat = (icon, val, label, cls) =>
      `<div class="kpi-card ${cls||''}">
        <div style="font-size:22px;margin-bottom:8px;">${icon}</div>
        <div class="kpi-value">${val}</div>
        <div class="kpi-label">${label}</div>
       </div>`;

    container.innerHTML = `
<div class="admin-section-title">📊 Application &amp; Tenant Statistics</div>
${statsErr ? `<div style="color:#fb7185;font-size:13px;margin-bottom:12px;">⚠️ User stats notice: ${_esc(statsErr)}</div>` : ''}
<div class="kpi-grid" style="margin-bottom:24px;">
  ${stat('👥', totalUsers,      'Total Registered',  'teal')}
  ${stat('✅', activeUsers,     'Active Users',      'emerald')}
  ${stat('⏳', pendingUsers,    'Inactive Accounts', pendingUsers > 0 ? 'rose' : '')}
  ${stat('📝', pendingReqCount, 'Pending Requests',  pendingReqCount > 0 ? 'gold' : '')}
  ${stat('⭐', adminCount,      'Administrators',    'violet')}
  ${stat('↕️', txCount,         'Transactions (You)','')}
  ${stat('🎯', budgetCount,     'Budgets (You)',     '')}
  ${stat('📝', noteCount,       'Notes (You)',       '')}
</div>`;
  }

  /* ══════════════════════════════════════════════════════
     TAB 5: APP SETTINGS
  ══════════════════════════════════════════════════════ */
  function _tabAppSettings() {
    const s = _loadAppSettings();
    return `
<div class="admin-section-title">🔧 Application Settings</div>
<div class="admin-form-card" style="background:var(--bg3);border:1px solid var(--border);border-radius:14px;padding:20px;">
  <div class="admin-form-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:14px;">
    <div>
      <label class="admin-label">App Name</label>
      <input id="as_appName" class="form-input" value="${_esc(s.appName||'LedgerMate')}">
    </div>
    <div>
      <label class="admin-label">Default Currency</label>
      <select id="as_currency" class="form-input">
        <option value="INR" ${s.currency==='INR'?'selected':''}>₹ INR</option>
        <option value="USD" ${s.currency==='USD'?'selected':''}>$ USD</option>
        <option value="EUR" ${s.currency==='EUR'?'selected':''}>€ EUR</option>
        <option value="GBP" ${s.currency==='GBP'?'selected':''}>£ GBP</option>
      </select>
    </div>
    <div>
      <label class="admin-label">Default Theme</label>
      <select id="as_theme" class="form-input">
        <option value="dark"  ${s.theme!=='light'?'selected':''}>🌙 Dark</option>
        <option value="light" ${s.theme==='light'?'selected':''}>☀️ Light</option>
      </select>
    </div>
    <div>
      <label class="admin-label">Session Timeout (minutes, 0=never)</label>
      <input id="as_sessionTTL" class="form-input" type="number" min="0" max="10080" value="${s.sessionTTL||0}">
    </div>
  </div>
  <div style="margin-top:18px;">
    <button class="btn-submit" onclick="window.LM_Admin.saveAppSettings()">💾 Save Settings</button>
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
<div class="admin-section-title">🗄️ Data Backup, Cloud Sync &amp; Recovery</div>

<div class="admin-form-card" style="margin-bottom:16px;background:var(--bg3);border:1px solid var(--border);border-radius:14px;padding:20px;">
  <div class="admin-section-title" style="font-size:13px;margin-bottom:12px;border:none;">📤 Export Database Backup</div>
  <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;">
    <button class="btn-submit" onclick="window.LM_Admin.exportBackup()">📤 Download JSON Backup</button>
    <button class="admin-btn" onclick="window.LM_Admin.syncToCloud()" style="gap:6px;">☁️ Sync to Cloud Now</button>
  </div>
  <div style="font-size:11px;color:var(--text-3);margin-top:8px;">Exports all IndexedDB stores as JSON. Cloud sync pushes records to Supabase.</div>
</div>

<div class="admin-form-card" style="margin-bottom:16px;background:var(--bg3);border:1px solid var(--border);border-radius:14px;padding:20px;">
  <div class="admin-section-title" style="font-size:13px;margin-bottom:12px;border:none;">📥 Restore / Import</div>
  <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;">
    <input type="file" id="restoreFile" accept=".json" class="form-input" style="max-width:320px;">
    <button id="adminImportBtn" class="btn-submit" onclick="window.LM_Admin.importBackup()">📥 Restore Backup</button>
  </div>
  <div style="font-size:11px;color:var(--text-3);margin-top:8px;">Merges backup records into the database.</div>
</div>

<div class="admin-form-card" style="background:var(--bg3);border:1px solid var(--border);border-radius:14px;padding:20px;">
  <div class="admin-section-title" style="font-size:13px;margin-bottom:12px;border:none;color:#fb7185;">⚠️ Danger Zone</div>
  <div style="display:flex;gap:10px;flex-wrap:wrap;">
    <button class="admin-btn admin-btn-danger" onclick="window.LM_Admin.clearUserData()">🗑 Clear My Data</button>
    <button class="admin-btn admin-btn-danger" onclick="window.LM_Admin.resetFactory()">⚠️ Factory Reset (All Local Data)</button>
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
      const text = await file.text();
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
      background: #111420;
      border: 1px solid rgba(251,191,36,0.5);
      box-shadow: 0 16px 40px rgba(0,0,0,0.8), 0 0 20px rgba(251,191,36,0.2);
      border-radius: 14px;
      padding: 16px 18px;
      max-width: 380px;
      width: calc(100% - 48px);
      display: flex;
      flex-direction: column;
      gap: 10px;
      animation: adminSlide 0.25s ease-out;
      font-family: Inter, sans-serif;
    `;

    toast.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;">
        <div style="display:flex;align-items:center;gap:8px;">
          <span style="font-size:20px;">🔔</span>
          <span style="font-weight:700;color:#fbbf24;font-size:13px;">${_esc(title)}</span>
        </div>
        <button onclick="document.getElementById('lm-admin-rt-toast')?.remove()" style="background:none;border:none;color:var(--text-3);cursor:pointer;font-size:16px;">✕</button>
      </div>
      <div style="font-size:12px;color:var(--text);line-height:1.45;">${_esc(message)}</div>
      <div style="display:flex;gap:8px;margin-top:2px;">
        <button onclick="window.LM_Admin.show('approvals'); document.getElementById('lm-admin-rt-toast')?.remove();" style="flex:1;padding:7px 12px;background:linear-gradient(135deg,#f59e0b,#d97706);border:none;border-radius:8px;color:#fff;font-size:12px;font-weight:700;cursor:pointer;">
          Review &amp; Approve
        </button>
        <button onclick="document.getElementById('lm-admin-rt-toast')?.remove()" style="padding:7px 12px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);border-radius:8px;color:var(--text-2);font-size:12px;cursor:pointer;">
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
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(initRealtimeNotifications, 1000);
    });
  } else {
    setTimeout(initRealtimeNotifications, 1000);
  }

})();
