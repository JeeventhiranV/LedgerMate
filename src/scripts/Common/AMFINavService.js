/**
 * LedgerMate – AMFINavService.js
 * ─────────────────────────────────────────────────────────────
 * Live Net Asset Value (NAV) auto-fetch & auto-refresh engine
 * for Indian Mutual Funds & SIPs using official AMFI scheme codes
 * and the public mfapi.in API with 24-hour intelligent rate caching.
 * Exposes: window.LM_AMFINavService
 * ─────────────────────────────────────────────────────────────
 */
(function () {
  'use strict';

  var CACHE_PREFIX = 'lm_amfi_nav_';
  var CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

  /**
   * Fetch live NAV for an AMFI Scheme Code
   * @param {string|number} schemeCode (e.g. 120503 for Axis Bluechip)
   * @param {boolean} forceRefresh bypass local cache
   */
  async function fetchNav(schemeCode, forceRefresh = false) {
    if (!schemeCode) return null;
    var code = String(schemeCode).trim();
    if (!/^\d{5,7}$/.test(code)) return null;

    // Check cache
    if (!forceRefresh) {
      try {
        var rawCache = localStorage.getItem(CACHE_PREFIX + code);
        if (rawCache) {
          var parsed = JSON.parse(rawCache);
          if (Date.now() - (parsed.cachedAt || 0) < CACHE_TTL_MS) {
            return parsed;
          }
        }
      } catch (e) {}
    }

    try {
      var url = 'https://api.mfapi.in/mf/' + code;
      var resp = await fetch(url, { headers: { 'Accept': 'application/json' } });
      if (!resp.ok) throw new Error('AMFI HTTP ' + resp.status);
      var json = await resp.json();

      if (json && json.status === 'SUCCESS' && Array.isArray(json.data) && json.data.length > 0) {
        var latest = json.data[0];
        var navVal = parseFloat(latest.nav);
        if (isNaN(navVal) || navVal <= 0) throw new Error('Invalid NAV value');

        var result = {
          schemeCode: code,
          schemeName: json.meta?.scheme_name || 'Mutual Fund',
          fundHouse: json.meta?.fund_house || '',
          category: json.meta?.scheme_category || '',
          nav: navVal,
          navDate: latest.date,
          cachedAt: Date.now()
        };

        try {
          localStorage.setItem(CACHE_PREFIX + code, JSON.stringify(result));
        } catch (e) {}

        return result;
      }
    } catch (err) {
      console.warn('[AMFINavService] Live fetch failed for ' + code + ':', err);
    }
    return null;
  }

  /**
   * Search AMFI Mutual Fund schemes by keyword
   * @param {string} query (e.g. "Parag Parikh Flexi Cap" or "Nifty 50")
   */
  async function searchSchemes(query) {
    if (!query || query.trim().length < 2) return [];
    try {
      var url = 'https://api.mfapi.in/mf/search?q=' + encodeURIComponent(query.trim());
      var resp = await fetch(url);
      if (!resp.ok) return [];
      var list = await resp.json();
      return Array.isArray(list) ? list.slice(0, 15) : [];
    } catch (e) {
      console.warn('[AMFINavService] Search failed:', e);
      return [];
    }
  }

  /**
   * Auto-refresh all active Mutual Fund & SIP investments in state
   */
  async function refreshAllMutualFunds() {
    if (!window.state || !Array.isArray(window.state.investments)) {
      if (typeof showToast === 'function') showToast('No investments found to update', 'info');
      return { updated: 0, total: 0 };
    }

    var mfList = window.state.investments.filter(function (inv) {
      var t = String(inv.type || '').toUpperCase();
      return (t === 'MUTUAL_FUND' || t === 'SIP') && (inv.schemeCode || inv.amfiCode);
    });

    if (!mfList.length) {
      if (typeof showToast === 'function') {
        showToast('💡 Add AMFI scheme codes to your mutual funds to enable live NAV auto-refresh.', 'info');
      }
      return { updated: 0, total: 0 };
    }

    if (typeof showToast === 'function') {
      showToast('🔄 Refreshing live AMFI NAVs for ' + mfList.length + ' mutual fund(s)...', 'info');
    }

    var updatedCount = 0;
    for (var i = 0; i < mfList.length; i++) {
      var inv = mfList[i];
      var code = inv.schemeCode || inv.amfiCode;
      var data = await fetchNav(code, true);

      if (data && data.nav > 0) {
        inv.currentPrice = data.nav;
        inv.nav = data.nav;
        inv.navDate = data.navDate;
        inv.updatedAt = new Date().toISOString();

        var qty = parseFloat(inv.qty || inv.units || inv.stockQty || 0);
        if (qty > 0) {
          inv.currentValue = Number((qty * data.nav).toFixed(2));
        }

        if (typeof window.put === 'function') {
          try { await window.put('investments', inv); } catch (e) {}
        }
        updatedCount++;
      }
    }

    if (window.LM_Bus) {
      window.LM_Bus.emit('lm:data:changed', { store: 'investments' });
    }

    if (typeof renderAll === 'function') renderAll();
    if (typeof renderWealthModule === 'function') renderWealthModule();

    if (typeof showToast === 'function') {
      showToast('✅ Updated ' + updatedCount + ' mutual fund NAV(s) via AMFI India!', 'success');
    }

    return { updated: updatedCount, total: mfList.length };
  }

  window.LM_AMFINavService = {
    fetchNav: fetchNav,
    searchSchemes: searchSchemes,
    refreshAllMutualFunds: refreshAllMutualFunds
  };

  // Run a quiet background refresh once per session if online
  if (typeof window !== 'undefined' && typeof navigator !== 'undefined') {
    setTimeout(function () {
      if (navigator.onLine) {
        refreshAllMutualFunds().catch(function () {});
      }
    }, 5000);
  }

})();
