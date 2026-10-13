/**
 * StudySpotlight.js — Universal Spotlight Palette for LedgerMate Study Hub
 * ─────────────────────────────────────────────────────────────────────────
 * Trigger: Ctrl+K / Cmd+K or clicking any search bar
 * Features:
 *  • Keyboard navigation (↑ / ↓, Enter, Escape)
 *  • Category chip filters (All, Questions, DSA, Java, System Design, React, HR, Actions)
 *  • Instant search over 500+ topics with deep-linking
 *  • Smooth glassmorphic UI matching LedgerMate aesthetic
 * Exposes: window.StudySpotlight
 * ─────────────────────────────────────────────────────────────────────────
 */
(function (window) {
  'use strict';

  var _modal = null;
  var _selectedIndex = 0;
  var _currentResults = [];
  var _activeCategory = 'all';

  function _esc(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function _createModal() {
    if (_modal) return _modal;

    var overlay = document.createElement('div');
    overlay.id = 'study-spotlight-overlay';
    overlay.className = 'spotlight-overlay';
    overlay.innerHTML = `
      <style>
        .spotlight-overlay {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(4, 7, 13, 0.75);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          z-index: 99999;
          display: flex;
          align-items: flex-start;
          justify-content: center;
          padding: 80px 16px 20px;
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.2s cubic-bezier(0.16, 1, 0.3, 1);
          font-family: 'Plus Jakarta Sans', -apple-system, sans-serif;
        }
        .spotlight-overlay.open {
          opacity: 1;
          pointer-events: auto;
        }
        .spotlight-card {
          width: 100%;
          max-width: 680px;
          background: var(--bg2, #0d111a);
          border: 1px solid var(--border2, #2a334c);
          border-radius: 18px;
          box-shadow: 0 24px 64px rgba(0, 0, 0, 0.65), 0 0 0 1px rgba(255, 255, 255, 0.06);
          overflow: hidden;
          display: flex;
          flex-direction: column;
          max-height: 80vh;
          transform: translateY(-12px) scale(0.98);
          transition: transform 0.22s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .spotlight-overlay.open .spotlight-card {
          transform: translateY(0) scale(1);
        }
        .spotlight-search-row {
          display: flex;
          align-items: center;
          padding: 14px 18px;
          border-bottom: 1px solid var(--border, #1e2436);
          gap: 12px;
          background: var(--bg3, #131824);
        }
        .spotlight-icon {
          font-size: 20px;
          color: var(--text3, #5c688c);
        }
        .spotlight-input {
          flex: 1;
          background: transparent;
          border: none;
          outline: none;
          font-family: inherit;
          font-size: 16px;
          font-weight: 500;
          color: var(--text, #f0f4fc);
        }
        .spotlight-input::placeholder {
          color: var(--text3, #5c688c);
        }
        .spotlight-kbd-badge {
          background: var(--bg4, #1a2030);
          border: 1px solid var(--border, #1e2436);
          border-radius: 6px;
          padding: 3px 8px;
          font-family: 'JetBrains Mono', monospace;
          font-size: 11px;
          color: var(--text3, #5c688c);
          user-select: none;
        }
        .spotlight-categories {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 16px;
          background: var(--bg2, #0d111a);
          border-bottom: 1px solid var(--border, #1e2436);
          overflow-x: auto;
          scrollbar-width: none;
        }
        .spotlight-categories::-webkit-scrollbar { display: none; }
        .spotlight-cat-btn {
          background: transparent;
          border: 1px solid transparent;
          border-radius: 20px;
          padding: 3px 10px;
          font-size: 11.5px;
          font-weight: 600;
          color: var(--text3, #5c688c);
          cursor: pointer;
          white-space: nowrap;
          transition: all 0.15s ease;
        }
        .spotlight-cat-btn:hover {
          color: var(--text, #f0f4fc);
          background: rgba(255, 255, 255, 0.04);
        }
        .spotlight-cat-btn.active {
          color: var(--blue, #4f8ef7);
          background: rgba(79, 142, 247, 0.12);
          border-color: rgba(79, 142, 247, 0.35);
        }
        .spotlight-results {
          flex: 1;
          overflow-y: auto;
          padding: 8px 0;
          margin: 0;
          list-style: none;
        }
        .spotlight-item {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 10px 18px;
          cursor: pointer;
          border-left: 3px solid transparent;
          transition: background 0.12s ease, border-color 0.12s ease;
          text-decoration: none;
          color: inherit;
        }
        .spotlight-item:hover, .spotlight-item.active {
          background: rgba(79, 142, 247, 0.09);
          border-left-color: var(--blue, #4f8ef7);
        }
        .spotlight-item-icon {
          width: 36px;
          height: 36px;
          border-radius: 9px;
          background: var(--bg3, #131824);
          border: 1px solid var(--border, #1e2436);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
          flex-shrink: 0;
        }
        .spotlight-item-content {
          flex: 1;
          min-width: 0;
        }
        .spotlight-item-title {
          font-size: 13.5px;
          font-weight: 600;
          color: var(--text, #f0f4fc);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .spotlight-item-sub {
          font-size: 11.5px;
          color: var(--text3, #5c688c);
          margin-top: 1px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .spotlight-item-meta {
          display: flex;
          align-items: center;
          gap: 6px;
          flex-shrink: 0;
        }
        .spotlight-badge {
          font-size: 10px;
          font-weight: 700;
          padding: 2px 7px;
          border-radius: 6px;
          background: rgba(255, 255, 255, 0.05);
          color: var(--text2, #94a1c2);
          border: 1px solid var(--border, #1e2436);
        }
        .spotlight-enter-hint {
          font-size: 11px;
          color: var(--text3, #5c688c);
          opacity: 0;
          transition: opacity 0.15s ease;
          font-family: 'JetBrains Mono', monospace;
        }
        .spotlight-item.active .spotlight-enter-hint {
          opacity: 1;
          color: var(--blue, #4f8ef7);
        }
        .spotlight-empty {
          padding: 36px 20px;
          text-align: center;
          color: var(--text3, #5c688c);
          font-size: 13px;
        }
        .spotlight-empty-icon {
          font-size: 32px;
          margin-bottom: 8px;
        }
        .spotlight-footer {
          padding: 10px 18px;
          border-top: 1px solid var(--border, #1e2436);
          background: var(--bg3, #131824);
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 11.5px;
          color: var(--text3, #5c688c);
        }
        .spotlight-shortcuts {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .spotlight-shortcuts span {
          display: inline-flex;
          align-items: center;
          gap: 4px;
        }
      </style>
      <div class="spotlight-card" onclick="event.stopPropagation()">
        <div class="spotlight-search-row">
          <span class="spotlight-icon">🔍</span>
          <input type="text" id="spotlightInput" class="spotlight-input" placeholder="Search questions, DSA algorithms, system design, or actions..." autocomplete="off" />
          <kbd class="spotlight-kbd-badge">ESC to close</kbd>
        </div>
        <div class="spotlight-categories" id="spotlightCategories">
          <button class="spotlight-cat-btn active" data-cat="all">All</button>
          <button class="spotlight-cat-btn" data-cat="java">☕ Java</button>
          <button class="spotlight-cat-btn" data-cat="dsa">🧠 DSA</button>
          <button class="spotlight-cat-btn" data-cat="system_design">🏗️ System Design</button>
          <button class="spotlight-cat-btn" data-cat="react">⚛️ React</button>
          <button class="spotlight-cat-btn" data-cat="hr">🤝 HR</button>
          <button class="spotlight-cat-btn" data-cat="actions">⚡ Actions</button>
        </div>
        <ul class="spotlight-results" id="spotlightResults"></ul>
        <div class="spotlight-footer">
          <div class="spotlight-shortcuts">
            <span><kbd class="spotlight-kbd-badge">↑</kbd> <kbd class="spotlight-kbd-badge">↓</kbd> Navigate</span>
            <span><kbd class="spotlight-kbd-badge">↵</kbd> Select</span>
            <span><kbd class="spotlight-kbd-badge">ESC</kbd> Close</span>
          </div>
          <div id="spotlightCount">0 results</div>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    overlay.onclick = function () {
      close();
    };

    var input = overlay.querySelector('#spotlightInput');
    input.oninput = function () {
      _selectedIndex = 0;
      _renderResults();
    };

    input.onkeydown = function (e) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (_currentResults.length > 0) {
          _selectedIndex = (_selectedIndex + 1) % _currentResults.length;
          _updateActiveItem();
        }
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (_currentResults.length > 0) {
          _selectedIndex = (_selectedIndex - 1 + _currentResults.length) % _currentResults.length;
          _updateActiveItem();
        }
      } else if (e.key === 'Enter') {
        e.preventDefault();
        _selectItem(_selectedIndex);
      } else if (e.key === 'Escape') {
        close();
      }
    };

    // Category button clicks
    overlay.querySelectorAll('.spotlight-cat-btn').forEach(function (btn) {
      btn.onclick = function () {
        overlay.querySelectorAll('.spotlight-cat-btn').forEach(function (b) { b.classList.remove('active'); });
        this.classList.add('active');
        _activeCategory = this.dataset.cat || 'all';
        _selectedIndex = 0;
        _renderResults();
      };
    });

    _modal = overlay;
    return overlay;
  }

  function _renderResults() {
    var overlay = _createModal();
    var input = overlay.querySelector('#spotlightInput');
    var resultsUl = overlay.querySelector('#spotlightResults');
    var countEl = overlay.querySelector('#spotlightCount');

    var query = input.value || '';
    if (window.StudySearchIndex) {
      _currentResults = window.StudySearchIndex.search(query, _activeCategory, 35);
    } else {
      _currentResults = [];
    }

    if (countEl) {
      countEl.textContent = _currentResults.length + ' result' + (_currentResults.length === 1 ? '' : 's');
    }

    if (!_currentResults.length) {
      resultsUl.innerHTML = `
        <div class="spotlight-empty">
          <div class="spotlight-empty-icon">🔍</div>
          <div>No results found for "<strong>${_esc(query)}</strong>"</div>
          <div style="font-size:11px;color:var(--text3,#5c688c);margin-top:4px;">Try searching for "ConcurrentHashMap", "LRU", "Virtual Threads", or "Quiz"</div>
        </div>
      `;
      return;
    }

    resultsUl.innerHTML = _currentResults.map(function (item, idx) {
      var isAct = idx === _selectedIndex;
      var badgeHtml = item.badge ? `<span class="spotlight-badge">${_esc(item.badge)}</span>` : '';
      return `
        <li class="spotlight-item${isAct ? ' active' : ''}" data-idx="${idx}" onclick="window.StudySpotlight._onItemClick(${idx})">
          <div class="spotlight-item-icon">${item.icon || '📌'}</div>
          <div class="spotlight-item-content">
            <div class="spotlight-item-title">${_esc(item.title)}</div>
            <div class="spotlight-item-sub">${_esc(item.sub || '')}</div>
          </div>
          <div class="spotlight-item-meta">
            ${badgeHtml}
            <span class="spotlight-enter-hint">↵ Select</span>
          </div>
        </li>
      `;
    }).join('');

    _scrollActiveIntoView();
  }

  function _updateActiveItem() {
    if (!_modal) return;
    var items = _modal.querySelectorAll('.spotlight-item');
    items.forEach(function (el, idx) {
      el.classList.toggle('active', idx === _selectedIndex);
    });
    _scrollActiveIntoView();
  }

  function _scrollActiveIntoView() {
    if (!_modal) return;
    var activeEl = _modal.querySelector('.spotlight-item.active');
    if (activeEl) {
      activeEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }

  function _selectItem(idx) {
    var item = _currentResults[idx];
    if (!item) return;

    close();

    if (typeof item.action === 'function') {
      try { item.action(); } catch (e) { console.warn('Action error:', e); }
    } else if (item.url) {
      window.location.href = item.url;
    }
  }

  function open(initialQuery) {
    var overlay = _createModal();
    overlay.classList.add('open');
    var input = overlay.querySelector('#spotlightInput');
    if (initialQuery !== undefined) input.value = initialQuery;
    input.focus();
    input.select();
    _selectedIndex = 0;
    _renderResults();
  }

  function close() {
    if (_modal) {
      _modal.classList.remove('open');
    }
  }

  function toggle() {
    if (_modal && _modal.classList.contains('open')) {
      close();
    } else {
      open();
    }
  }

  // Global Keyboard Listener: Ctrl+K / Cmd+K
  window.addEventListener('keydown', function (e) {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      toggle();
    }
  });

  window.StudySpotlight = {
    open: open,
    close: close,
    toggle: toggle,
    _onItemClick: function (idx) {
      _selectItem(idx);
    }
  };

})(window);
