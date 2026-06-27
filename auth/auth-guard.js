// ─── Auth Guard ────────────────────────────────────────────────────────────────
// Protects every page it is included on.
// Load order in <head>:  supabase CDN → supabase-config.js → THIS FILE
// Body starts hidden (via <style>body{visibility:hidden}</style> injected below).
// Guard reveals it only after a valid session is confirmed.
//
// Sidebar behaviour:
//   Pages WITH  existing #sidebar  (Java / DSA / React) → appends auth footer to it.
//   Pages WITHOUT existing #sidebar (HR / IPK)          → creates #authNav + injects ☰.
// ──────────────────────────────────────────────────────────────────────────────

(function () {

  // ── 1. Hide body immediately ─────────────────────────────────────────────────
  var _hideStyle = document.createElement('style');
  _hideStyle.textContent = 'body{visibility:hidden!important}';
  document.head.appendChild(_hideStyle);

  // ── 2. Path helpers ──────────────────────────────────────────────────────────
  function _getLoginUrl() {
    var parts = window.location.pathname.split('/');
    var idx   = parts.lastIndexOf('study');
    var base  = idx >= 0 ? parts.slice(0, idx).join('/') : '';
    return (base || '') + '/login.html?action=logout&app=study';
  }

  function _getPendingUrl() {
    var parts = window.location.pathname.split('/');
    var idx   = parts.lastIndexOf('study');
    var base  = idx >= 0 ? parts.slice(0, idx).join('/') : '';
    return (base || '') + '/login.html?msg=pending&app=study';
  }

  function _getHubUrl() {
    var parts = window.location.pathname.split('/');
    var idx   = parts.lastIndexOf('study');
    if (idx >= 0) return parts.slice(0, idx + 1).join('/') + '/index.html';
    return '/study/index.html';
  }

  function _getMainAppUrl() {
    var parts = window.location.pathname.split('/');
    var idx   = parts.lastIndexOf('study');
    var base  = idx >= 0 ? parts.slice(0, idx).join('/') : '';
    return (base || '') + '/index.html';
  }

  function _getStudyJsBase() {
    var parts = window.location.pathname.split('/');
    var idx   = parts.lastIndexOf('study');
    if (idx >= 0) return parts.slice(0, idx + 1).join('/') + '/js';
    return '/study/js';
  }

  function _redirect(url) {
    window.location.replace(url);
  }

  // ── 3. Inject shared styles ──────────────────────────────────────────────────
  var _style = document.createElement('style');
  _style.textContent = [
    /* ── Auth sidebar footer (appended to existing #sidebar or #authNav) ── */
    '.agf{padding:14px 16px 22px;border-top:1px solid var(--border,#1e2436)}',

    '.agf-home{display:flex;align-items:center;gap:10px;font-size:13px;font-weight:500;',
      'color:var(--text2,#8a93b5);text-decoration:none;padding:9px 10px;border-radius:8px;',
      'transition:background .2s,color .2s;margin-bottom:4px}',
    '.agf-home:hover{background:rgba(79,142,247,.12);color:var(--blue,#4f8ef7)}',
    '.agf-home-icon{font-size:15px;flex-shrink:0}',

    '.agf-mainapp{display:flex;align-items:center;gap:10px;font-size:13px;font-weight:500;',
      'color:var(--text2,#8a93b5);text-decoration:none;padding:9px 10px;border-radius:8px;',
      'transition:background .2s,color .2s;margin-bottom:4px;cursor:pointer;border:none;',
      'background:none;width:100%;font-family:inherit;text-align:left}',
    '.agf-mainapp:hover{background:rgba(52,211,153,.12);color:var(--emerald,#34d399)}',

    '.agf-theme-row{display:flex;align-items:center;justify-content:space-between;',
      'padding:7px 10px;border-radius:8px;margin-bottom:10px;cursor:pointer;',
      'transition:background .2s}',
    '.agf-theme-row:hover{background:rgba(255,255,255,.04)}',
    '.agf-theme-label{font-size:12px;color:var(--text3,#535d7e)}',
    '.agf-theme-btn{background:none;border:1px solid var(--border,#1e2436);border-radius:7px;',
      'padding:4px 8px;cursor:pointer;font-size:14px;line-height:1;transition:border-color .2s}',
    '.agf-theme-btn:hover{border-color:var(--blue,#4f8ef7)}',

    '.agf-divider{height:1px;background:var(--border,#1e2436);margin:10px 0}',

    '.agf-profile{display:flex;align-items:center;gap:9px;padding:9px 10px;',
      'background:rgba(255,255,255,.03);border:1px solid var(--border,#1e2436);',
      'border-radius:10px;margin-bottom:9px}',
    '.agf-avatar{width:34px;height:34px;border-radius:9px;flex-shrink:0;',
      'background:linear-gradient(135deg,#4f8ef7,#8b5cf6);',
      'display:flex;align-items:center;justify-content:center;',
      'font-size:14px;font-weight:700;color:#fff;letter-spacing:0}',
    '.agf-info{min-width:0;flex:1}',
    '.agf-name{font-size:12px;font-weight:600;color:var(--text,#e4eaf8);',
      'overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
    '.agf-email{font-size:10px;color:var(--text3,#535d7e);',
      'overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin-top:1px}',

    '.agf-admin-btn{width:100%;background:rgba(139,92,246,.08);border:1px solid rgba(139,92,246,.25);',
      'border-radius:8px;padding:8px 12px;font-size:12px;font-weight:600;',
      'color:var(--purple,#8b5cf6);cursor:pointer;transition:all .2s;',
      'font-family:inherit;text-align:left;display:flex;align-items:center;gap:8px;margin-bottom:6px}',
    '.agf-admin-btn:hover{background:rgba(139,92,246,.15);border-color:rgba(139,92,246,.4)}',

    '.agf-signout{width:100%;background:none;border:1px solid var(--border,#1e2436);',
      'border-radius:8px;padding:8px 12px;font-size:12px;font-weight:500;',
      'color:var(--text2,#8a95b8);cursor:pointer;transition:border-color .2s,color .2s;',
      'font-family:inherit;text-align:left;display:flex;align-items:center;gap:8px}',
    '.agf-signout:hover{border-color:#f43f5e;color:#f43f5e}',

    /* ── New sidebar panel for pages without existing #sidebar (HR / IPK) ── */
    '#authNav{position:fixed;top:0;left:0;width:260px;height:100vh;',
      'background:var(--bg2,#0e1117);border-right:1px solid var(--border,#1e2436);',
      'z-index:600;transform:translateX(-100%);',
      'transition:transform .3s cubic-bezier(.4,0,.2,1);',
      'display:flex;flex-direction:column;overflow-y:auto}',
    '#authNav.open{transform:translateX(0)}',

    '#authNavOverlay{position:fixed;inset:0;background:rgba(0,0,0,.55);',
      'z-index:599;display:none;backdrop-filter:blur(2px);-webkit-backdrop-filter:blur(2px)}',
    '#authNavOverlay.show{display:block}',

    '.auth-nav-header{padding:20px 18px 16px;border-bottom:1px solid var(--border,#1e2436);',
      'flex-shrink:0;display:flex;align-items:center;gap:10px}',
    '.auth-nav-header-icon{width:36px;height:36px;border-radius:10px;flex-shrink:0;',
      'background:linear-gradient(135deg,#4f8ef7,#8b5cf6);',
      'display:flex;align-items:center;justify-content:center;font-size:18px}',
    '.auth-nav-header-text{font-size:14px;font-weight:700;color:var(--text,#e4eaf8);',
      'font-family:"Syne",sans-serif;line-height:1.2}',
    '.auth-nav-header-text small{display:block;font-size:10px;font-weight:400;',
      'color:var(--text3,#535d7e);font-family:"Inter","Outfit",sans-serif;margin-top:2px}',

    '.auth-nav-section-label{padding:14px 18px 6px;font-size:10px;font-weight:600;',
      'letter-spacing:.08em;color:var(--text3,#535d7e);text-transform:uppercase}',
    '.auth-nav-link{display:flex;align-items:center;gap:10px;',
      'padding:8px 18px;font-size:13px;color:var(--text2,#8a93b5);text-decoration:none;',
      'transition:background .15s,color .15s;border-left:2px solid transparent}',
    '.auth-nav-link:hover{background:rgba(79,142,247,.08);color:var(--text,#e4eaf8);',
      'border-left-color:var(--blue,#4f8ef7)}',
    '.auth-nav-link.active{background:rgba(79,142,247,.1);color:var(--blue,#4f8ef7);',
      'border-left-color:var(--blue,#4f8ef7);font-weight:500}',
    '.auth-nav-link-icon{font-size:15px;flex-shrink:0;width:20px;text-align:center}',

    '.auth-nav-spacer{flex:1;min-height:16px}',

    /* ── ☰ menu button injected into topbar for pages without sidebar ── */
    '.agf-menu-btn{background:none;border:1px solid var(--border,#1e2436);border-radius:8px;',
      'padding:6px 9px;cursor:pointer;color:var(--text2,#8a95b8);font-size:16px;',
      'flex-shrink:0;transition:border-color .2s,color .2s;line-height:1;',
      'font-family:inherit;margin-right:2px}',
    '.agf-menu-btn:hover{border-color:var(--blue,#4f8ef7);color:var(--blue,#4f8ef7)}',

    /* ── Timer chip (injected into topbar on all study pages) ── */
    '.st-chip{display:inline-flex;align-items:center;gap:6px;',
      'background:var(--bg3,#1a1f35);border:1px solid var(--border,#1e2436);',
      'border-radius:20px;padding:5px 12px;',
      'font-family:"JetBrains Mono",monospace;font-size:12px;font-weight:600;',
      'color:var(--text2,#8a93b5);cursor:pointer;',
      'transition:border-color .2s,color .2s;user-select:none;vertical-align:middle}',
    '.st-chip:hover{border-color:var(--teal,#06d6a0)}',
    '.st-chip-dot{width:7px;height:7px;border-radius:50%;',
      'background:var(--border,#1e2436);flex-shrink:0;transition:background .3s,box-shadow .3s}',
    '.st-chip.running{border-color:rgba(6,214,160,.4)}',
    '.st-chip.running .st-chip-dot{background:var(--teal,#06d6a0);',
      'box-shadow:0 0 6px var(--teal,#06d6a0);animation:st-blink 1.4s infinite}',
    '.st-chip.running .st-chip-time{color:var(--teal,#06d6a0)}',
    '@keyframes st-blink{0%,100%{opacity:1}50%{opacity:.3}}',
  ].join('');
  document.head.appendChild(_style);

  // ── 4. Inject user chip into sidebar (not topbar) ────────────────────────────
  function _injectChip(session) {
    var user    = session.user;
    var email   = user.email || '';
    var meta    = user.user_metadata || {};
    var name    = meta.full_name || meta.name || email.split('@')[0] || 'User';
    var initial = name.charAt(0).toUpperCase();
    var hubUrl  = _getHubUrl();

    // ── Build auth footer element ────────────────────────────────────────────
    var mainUrl = _getMainAppUrl();

    var footer = document.createElement('div');
    footer.className = 'agf';
    footer.innerHTML =
      '<a href="' + hubUrl + '" class="agf-home">' +
        '<span class="agf-home-icon">🏠</span>Study Hub' +
      '</a>' +
      '<button class="agf-mainapp" id="agfMainAppBtn">' +
        '<span class="agf-home-icon">💰</span>LedgerMate' +
      '</button>' +
      '<div class="agf-theme-row" id="agfThemeRow">' +
        '<span class="agf-theme-label">Theme</span>' +
        '<button class="agf-theme-btn" id="agfThemeBtn">🌙</button>' +
      '</div>' +
      '<div class="agf-divider"></div>' +
      '<div class="agf-profile">' +
        '<div class="agf-avatar">' + initial + '</div>' +
        '<div class="agf-info">' +
          '<div class="agf-name">' + name + '</div>' +
          '<div class="agf-email">' + email + '</div>' +
        '</div>' +
      '</div>' +
      '<button class="agf-admin-btn" id="agfAdminBtn">⚙ Admin Panel</button>' +
      '<button class="agf-signout" id="authLogoutBtn">↩ Sign out</button>';

    // ── Decide where to put it ───────────────────────────────────────────────
    var existingSidebar = document.getElementById('sidebar');

    if (existingSidebar) {
      // Pages with existing sidebar (Java / DSA / React) — append footer
      existingSidebar.appendChild(footer);
    } else {
      // Pages without sidebar (HR / IPK) — build a new one
      _buildAuthNav(footer);
    }

    // ── Wire LedgerMate nav ──────────────────────────────────────────────────
    document.getElementById('agfMainAppBtn').addEventListener('click', function () {
      try { localStorage.setItem('lm_last_page', 'main'); } catch (e) {}
      window.location.href = mainUrl;
    });

    // ── Wire sign out ────────────────────────────────────────────────────────
    document.getElementById('authLogoutBtn').addEventListener('click', function () {
      _supabase.auth.signOut().then(function () {
        _redirect(_getLoginUrl());
      });
    });

    // ── Wire admin panel button ──────────────────────────────────────────────
    var agfAdminBtn = document.getElementById('agfAdminBtn');
    if (agfAdminBtn) {
      agfAdminBtn.addEventListener('click', function () {
        // Close authNav sidebar before opening admin panel
        var nav = document.getElementById('authNav');
        var navOv = document.getElementById('authNavOverlay');
        if (nav) nav.classList.remove('open');
        if (navOv) navOv.classList.remove('show');

        if (window.StudyAdmin) {
          window.StudyAdmin.open();
        } else {
          window.location.href = hubUrl + '?admin=open';
        }
      });
    }

    // ── Wire theme toggle (proxies to the page's own #themeBtn) ─────────────
    var agfThemeBtn = document.getElementById('agfThemeBtn');
    var agfThemeRow = document.getElementById('agfThemeRow');

    // Sync initial icon from localStorage
    var savedTheme = localStorage.getItem('prep_theme') || 'dark';
    if (agfThemeBtn) {
      agfThemeBtn.textContent = savedTheme === 'light' ? '🌙' : '☀️';
    }

    function _toggleTheme() {
      var tb = document.getElementById('themeBtn');
      if (tb) {
        tb.click();
        // Sync icon after page theme handler runs
        setTimeout(function () {
          if (agfThemeBtn) agfThemeBtn.textContent = tb.textContent;
        }, 40);
      }
    }

    if (agfThemeBtn) {
      agfThemeBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        _toggleTheme();
      });
    }
    if (agfThemeRow) {
      agfThemeRow.addEventListener('click', function (e) {
        if (e.target !== agfThemeBtn) _toggleTheme();
      });
    }
  }

  // ── 5. Timer chip: injected into every study page topbar ────────────────────
  function _injectTimerChip() {
    /* Skip on study/index.html — it has its own FAB + card */
    if (document.getElementById('stFab')) return;

    var topbar = document.querySelector('.topbar');
    if (!topbar) return;

    var chip = document.createElement('div');
    chip.id        = 'stTimerChip';
    chip.className = 'st-chip';
    chip.title     = 'Study Timer — click to start / stop';
    chip.innerHTML = '<span class="st-chip-dot"></span><span class="st-chip-time">00:00:00</span>';

    var chipTime = chip.querySelector('.st-chip-time');

    function _updateChip(st) {
      chipTime.textContent = (st && st.display) || '00:00:00';
      chip.classList.toggle('running', !!(st && st.running));
    }

    if (window.StudyTimer) {
      StudyTimer.onTick(_updateChip);
      _updateChip(StudyTimer.getState());
    }

    chip.addEventListener('click', function () {
      if (!window.StudyTimer) return;
      StudyTimer.toggle().then(function () { _updateChip(StudyTimer.getState()); });
    });

    /* Insert as first item in topbar-right, or append to topbar */
    var right = topbar.querySelector('.topbar-right') || topbar;
    right.insertBefore(chip, right.firstChild);
  }

  function _loadTimer() {
    if (window.StudyTimer) { _injectTimerChip(); return; }
    var s   = document.createElement('script');
    s.src   = _getStudyJsBase() + '/StudyTimer.js';
    s.onload = _injectTimerChip;
    document.head.appendChild(s);
  }

  // ── 6. Build new sidebar for pages without one ──────────────────────────────
  function _buildAuthNav(footerEl) {
    var parts       = window.location.pathname.split('/');
    var currentPage = parts[parts.length - 1]; // just the filename
    // Prefix is 'prep/' when we're at study/index.html, empty when inside prep/
    var inPrep      = parts.indexOf('prep') !== -1;
    var prepPrefix  = inPrep ? '' : 'prep/';

    var modules = [
      { href: prepPrefix + 'Java-Prep-kit.html',          icon: '☕', label: 'Java Prep Kit'       },
      { href: prepPrefix + 'DSA-Prep-Hub.html',           icon: '🧠', label: 'DSA Master Hub'      },
      { href: prepPrefix + 'DSA_CodeBase.html',           icon: '📖', label: 'DSA Handbook'        },
      { href: prepPrefix + 'React-Prep.html',             icon: '⚛️', label: 'React Prep Hub'      },
      { href: prepPrefix + 'HR-Questions.html',           icon: '🤝', label: 'HR Questions'         },
      { href: prepPrefix + 'Interview-Prep-Kit.html',     icon: '📚', label: 'Interview Kit'        },
      { href: prepPrefix + 'Interview-Tracker.html',      icon: '🎯', label: 'Interview Tracker'    },
      { href: prepPrefix + 'Daily-Learning-Tracker.html', icon: '📊', label: 'Daily Tracker'        },
      { href: prepPrefix + 'Quick-Links-Manager.html',   icon: '🔗', label: 'Quick Links'           },
    ];

    // ── Overlay ──────────────────────────────────────────────────────────────
    var overlay = document.createElement('div');
    overlay.id = 'authNavOverlay';
    document.body.appendChild(overlay);

    // ── Sidebar ──────────────────────────────────────────────────────────────
    var nav = document.createElement('aside');
    nav.id = 'authNav';

    var mainAppUrl = _getMainAppUrl();

    var header = document.createElement('div');
    header.className = 'auth-nav-header';
    header.innerHTML =
      '<div class="auth-nav-header-icon">📚</div>' +
      '<div class="auth-nav-header-text">Study Hub<small>Learning Resources</small></div>';

    var sectionLabel = document.createElement('div');
    sectionLabel.className = 'auth-nav-section-label';
    sectionLabel.textContent = 'Modules';

    var linkList = document.createElement('div');
    modules.forEach(function (m) {
      var a = document.createElement('a');
      a.href = m.href;
      var fileName = m.href.split('/').pop();
      a.className = 'auth-nav-link' + (currentPage === fileName ? ' active' : '');
      a.innerHTML =
        '<span class="auth-nav-link-icon">' + m.icon + '</span>' +
        '<span>' + m.label + '</span>';
      linkList.appendChild(a);
    });

    // var appSection = document.createElement('div');
    // appSection.className = 'auth-nav-section-label';
    // appSection.textContent = 'Apps';

    // var mainAppLink = document.createElement('a');
    // mainAppLink.href      = '#';
    // mainAppLink.className = 'auth-nav-link';
    // mainAppLink.innerHTML = '<span class="auth-nav-link-icon">💰</span><span>LedgerMate</span>';
    // mainAppLink.addEventListener('click', function (e) {
    //   e.preventDefault();
    //   try { localStorage.setItem('lm_last_page', 'main'); } catch (err) {}
    //   window.location.href = mainAppUrl;
    // });

    var spacer = document.createElement('div');
    spacer.className = 'auth-nav-spacer';

    nav.appendChild(header);
    nav.appendChild(sectionLabel);
    nav.appendChild(linkList);
   // nav.appendChild(appSection);
   // nav.appendChild(mainAppLink);
    nav.appendChild(spacer);
    nav.appendChild(footerEl);
    document.body.appendChild(nav);

    // ── ☰ button → inject as first child of .topbar ─────────────────────────
    var topbar = document.querySelector('.topbar');
    if (topbar) {
      var menuBtn = document.createElement('button');
      menuBtn.className = 'agf-menu-btn';
      menuBtn.setAttribute('aria-label', 'Open navigation');
      menuBtn.textContent = '☰';
      topbar.insertBefore(menuBtn, topbar.firstChild);

      function _openNav()  { nav.classList.add('open');    overlay.classList.add('show'); }
      function _closeNav() { nav.classList.remove('open'); overlay.classList.remove('show'); }

      menuBtn.addEventListener('click', function () {
        nav.classList.contains('open') ? _closeNav() : _openNav();
      });
      overlay.addEventListener('click', _closeNav);
    }
  }

  // ── 6. Study module key detection ───────────────────────────────────────────
  var _PAGE_MOD = {
    'java-prep-kit.html':          'java',
    'dsa-prep-hub.html':           'dsa',
    'dsa_codebase.html':           'dsa',
    'react-prep.html':             'react',
    'hr-questions.html':           'hr',
    'interview-prep-kit.html':     'ipk',
    'interview-tracker.html':      'tracker',
    'daily-learning-tracker.html': 'dlt',
    'quick-links-manager.html':    'ql'
  };

  function _currentModule() {
    return _PAGE_MOD[window.location.pathname.split('/').pop().toLowerCase()] || null;
  }

  function _canAccess(study_modules, modKey) {
    if (!modKey) return true;                                         // hub page — no check
    if (study_modules === null || study_modules === undefined) return true; // null = all allowed
    if (study_modules.length === 0) return false;                     // [] = no access
    return study_modules.indexOf(modKey) !== -1;
  }

  // ── 7. Main guard logic ──────────────────────────────────────────────────────
  _supabase.auth.getSession().then(function (res) {
    var session = res && res.data && res.data.session;

    if (!session) {
      _redirect(_getLoginUrl());
      return;
    }

    function _doReveal() {
      // Dispatch before showing so hub page can lock cards without a flash
      document.dispatchEvent(new CustomEvent('studyAccessReady', {
        detail: { profile: window._studyProfile || null }
      }));
      _hideStyle.textContent = '';
      document.body.style.visibility = 'visible';
      _injectChip(session);
      _loadTimer();
    }

    function _revealWhenReady() {
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', _doReveal);
      } else {
        _doReveal();
      }
    }

    // Check active status + study module access on every page load
    _supabase.from('user_profiles')
      .select('active,role,study_modules')
      .eq('id', session.user.id)
      .single()
      .then(function (profRes) {
        var profile = profRes.data;

        // Inactive or missing profile → sign out + pending message
        if (!profile || !profile.active) {
          _supabase.auth.signOut().then(function () {
            _redirect(_getPendingUrl());
          });
          return;
        }

        // Module-level access check (admins always bypass)
        var modKey = _currentModule();
        if (profile.role !== 'admin' && !_canAccess(profile.study_modules, modKey)) {
          _redirect(_getHubUrl() + '?msg=noaccess');
          return;
        }

        // Expose profile so hub page can lock inaccessible resource cards
        window._studyProfile = {
          active:        profile.active,
          role:          profile.role,
          study_modules: profile.study_modules
        };

        _revealWhenReady();
      })
      .catch(function () {
        // Network error — fail-closed: sign out and redirect rather than grant access
        _supabase.auth.signOut().then(function () {
          _redirect(_getLoginUrl());
        }).catch(function () {
          _redirect(_getLoginUrl());
        });
      });

  }).catch(function () {
    _redirect(_getLoginUrl());
  });

  // ── 8. Cross-tab sign-out sync ────────────────────────────────────────────
  _supabase.auth.onAuthStateChange(function (event) {
    if (event === 'SIGNED_OUT') {
      _redirect(_getLoginUrl());
    }
  });

}());
