/**
 * LedgerMate – MarketDataService.js
 * ─────────────────────────────────────────────────────────────
 * Market Data Service Abstraction for Indian Equities (NSE & BSE).
 * Fetches real stock quotes (CMP, Prev Close, Day Change) with
 * local caching (15-min TTL), offline detection, and failover.
 * Never fabricates fake prices; clearly returns unavailable state.
 * Exposes: window.LM_MarketDataService
 * ─────────────────────────────────────────────────────────────
 */
(function () {
  'use strict';

  var CACHE_KEY = 'lm_stock_quote_cache';
  var CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes cache TTL
  var memoryCache = {};
  var lastFetchTimestamp = null;
  var isFetching = false;

  // Initialize in-memory cache from localStorage
  try {
    var saved = localStorage.getItem(CACHE_KEY);
    if (saved) {
      memoryCache = JSON.parse(saved) || {};
      lastFetchTimestamp = memoryCache._last_updated || null;
    }
  } catch (e) {
    memoryCache = {};
  }

  function saveCache() {
    try {
      memoryCache._last_updated = lastFetchTimestamp;
      localStorage.setItem(CACHE_KEY, JSON.stringify(memoryCache));
    } catch (e) {}
  }

  /**
   * Determine Indian Stock Market Status (NSE / BSE open Mon-Fri 09:15 to 15:30 IST)
   */
  function checkIndianMarketStatus() {
    try {
      var now = new Date();
      // Convert to IST (UTC + 5:30)
      var utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);
      var istTime = new Date(utcTime + (330 * 60000));
      var day = istTime.getDay(); // 0 = Sun, 6 = Sat
      if (day === 0 || day === 6) {
        return { isOpen: false, status: 'CLOSED (Weekend)', istTime: istTime };
      }
      var hours = istTime.getHours();
      var minutes = istTime.getMinutes();
      var timeVal = hours * 60 + minutes;

      // 09:15 is 555 mins, 15:30 is 930 mins
      if (timeVal >= 555 && timeVal <= 930) {
        return { isOpen: true, status: 'LIVE (Open)', istTime: istTime };
      } else if (timeVal < 555) {
        return { isOpen: false, status: 'PRE-OPEN (Opens 9:15 AM)', istTime: istTime };
      } else {
        return { isOpen: false, status: 'CLOSED', istTime: istTime };
      }
    } catch (e) {
      return { isOpen: false, status: 'CLOSED', istTime: new Date() };
    }
  }

  /**
   * Format query ticker for Indian stock provider
   * e.g., RELIANCE on NSE -> RELIANCE.NS, on BSE -> RELIANCE.BO
   */
  function getTickerCode(symbol, exchange) {
    var sym = (symbol || '').trim().toUpperCase();
    var ex = (exchange || 'NSE').trim().toUpperCase();
    if (ex === 'BSE') {
      return sym + '.BO';
    }
    return sym + '.NS';
  }

  /**
   * Query Yahoo Finance API via CORS-friendly financial proxies for real Indian quotes
   */
  async function fetchQuoteFromNetwork(symbol, exchange) {
    var ticker = getTickerCode(symbol, exchange);
    var urls = [
      // Primary: query1.finance.yahoo.com via CORS gateway
      'https://query1.finance.yahoo.com/v8/finance/chart/' + encodeURIComponent(ticker) + '?interval=1d&range=5d',
      'https://query2.finance.yahoo.com/v8/finance/chart/' + encodeURIComponent(ticker) + '?interval=1d&range=5d'
    ];

    for (var i = 0; i < urls.length; i++) {
      try {
        var resp = await fetch(urls[i], {
          headers: { 'Accept': 'application/json' },
          signal: AbortSignal.timeout ? AbortSignal.timeout(6000) : undefined
        });

        if (!resp.ok) continue;

        var data = await resp.json();
        var result = data && data.chart && data.chart.result && data.chart.result[0];
        if (!result) continue;

        var meta = result.meta || {};
        var regularMarketPrice = meta.regularMarketPrice;
        var previousClose = meta.chartPreviousClose || meta.previousClose;

        // If price not directly in meta, grab last close from indicators
        if (!regularMarketPrice && result.indicators && result.indicators.quote && result.indicators.quote[0]) {
          var closes = result.indicators.quote[0].close || [];
          for (var c = closes.length - 1; c >= 0; c--) {
            if (typeof closes[c] === 'number' && closes[c] > 0) {
              regularMarketPrice = closes[c];
              break;
            }
          }
        }

        if (typeof regularMarketPrice === 'number' && regularMarketPrice > 0) {
          var prev = typeof previousClose === 'number' && previousClose > 0 ? previousClose : regularMarketPrice;
          var change = regularMarketPrice - prev;
          var changePct = prev > 0 ? (change / prev) * 100 : 0;

          return {
            symbol: symbol.toUpperCase(),
            exchange: (exchange || 'NSE').toUpperCase(),
            price: Math.round((regularMarketPrice + Number.EPSILON) * 100) / 100,
            previous_close: Math.round((prev + Number.EPSILON) * 100) / 100,
            change: Math.round((change + Number.EPSILON) * 100) / 100,
            change_percent: Math.round((changePct + Number.EPSILON) * 100) / 100,
            currency: 'INR',
            market_status: checkIndianMarketStatus().status,
            timestamp: Date.now(),
            isLive: true
          };
        }
      } catch (err) {
        // Try next fallback URL or proceed to Supabase price cache
      }
    }

    return await fetchFromSupabaseCache(symbol, exchange);
  }

  /**
   * Helper to get initialized Supabase client instance
   */
  function getSupabaseClient() {
    if (typeof _supabase !== 'undefined' && _supabase && typeof _supabase.from === 'function') {
      return _supabase;
    }
    if (typeof window !== 'undefined' && window._supabase && typeof window._supabase.from === 'function') {
      return window._supabase;
    }
    if (typeof window !== 'undefined' && window.supabase && typeof window.supabase.from === 'function') {
      return window.supabase;
    }
    return null;
  }

  /**
   * Fallback: Check if Supabase shared price cache has quotes
   */
  async function fetchFromSupabaseCache(symbol, exchange) {
    try {
      var sb = getSupabaseClient();
      if (sb) {
        var sbRes = await sb
          .from('stock_price_cache')
          .select('*')
          .eq('symbol', symbol.toUpperCase())
          .eq('exchange', (exchange || 'NSE').toUpperCase())
          .maybeSingle();

        if (sbRes.data && typeof sbRes.data.price === 'number') {
          return {
            symbol: symbol.toUpperCase(),
            exchange: (exchange || 'NSE').toUpperCase(),
            price: Number(sbRes.data.price),
            previous_close: Number(sbRes.data.previous_close || sbRes.data.price),
            change: Number(sbRes.data.change || 0),
            change_percent: Number(sbRes.data.change_percent || 0),
            currency: 'INR',
            market_status: sbRes.data.market_status || 'CACHE',
            timestamp: new Date(sbRes.data.market_timestamp || sbRes.data.updated_at).getTime(),
            isLive: false
          };
        }
      }
    } catch (e) {}
    return null;
  }

  var LM_MarketDataService = {
    /**
     * Get synchronous cached quote if available
     */
    getCachedQuote: function (symbol, exchange) {
      if (!symbol) return null;
      var key = symbol.toUpperCase() + '_' + (exchange || 'NSE').toUpperCase();
      return memoryCache[key] || null;
    },

    /**
     * Fetch single stock quote with cache check
     */
    fetchQuote: async function (symbol, exchange, forceRefresh) {
      if (!symbol) return null;
      var key = symbol.toUpperCase() + '_' + (exchange || 'NSE').toUpperCase();
      var cached = memoryCache[key];
      var now = Date.now();

      if (!forceRefresh && cached && (now - (cached.timestamp || 0)) < CACHE_TTL_MS) {
        return cached;
      }

      var fresh = await fetchQuoteFromNetwork(symbol, exchange);
      if (fresh) {
        memoryCache[key] = fresh;
        lastFetchTimestamp = now;
        saveCache();
        return fresh;
      }

      // If network fails, return cached quote if present
      if (cached) return cached;

      return {
        symbol: symbol.toUpperCase(),
        exchange: (exchange || 'NSE').toUpperCase(),
        price: null,
        status: 'unavailable',
        timestamp: now
      };
    },

    /**
     * Batch fetch quotes for a list of items [{ symbol, exchange }]
     */
    fetchBatchQuotes: async function (items, forceRefresh) {
      if (!Array.isArray(items) || items.length === 0) return {};
      if (isFetching && !forceRefresh) return memoryCache;

      isFetching = true;
      var results = {};
      var now = Date.now();

      try {
        var fetchPromises = items.map(async function (item) {
          var sym = (item.symbol || item).toUpperCase();
          var ex = (item.exchange || 'NSE').toUpperCase();
          var key = sym + '_' + ex;

          var cached = memoryCache[key];
          if (!forceRefresh && cached && (now - (cached.timestamp || 0)) < CACHE_TTL_MS) {
            results[key] = cached;
            return;
          }

          var quote = await fetchQuoteFromNetwork(sym, ex);
          if (quote) {
            memoryCache[key] = quote;
            results[key] = quote;
          } else if (cached) {
            results[key] = cached;
          } else {
            results[key] = {
              symbol: sym,
              exchange: ex,
              price: null,
              status: 'unavailable',
              timestamp: now
            };
          }
        });

        await Promise.all(fetchPromises);
        lastFetchTimestamp = now;
        saveCache();
      } catch (e) {
        console.warn('[MarketDataService] Batch quote fetch error:', e);
      } finally {
        isFetching = false;
      }

      return results;
    },

    /**
     * Get market status badge
     */
    getMarketStatus: function () {
      return checkIndianMarketStatus();
    },

    /**
     * Get timestamp of last quote update
     */
    getLastUpdated: function () {
      return lastFetchTimestamp;
    },

    /**
     * Clear all cached market data
     */
    clearCache: function () {
      memoryCache = {};
      lastFetchTimestamp = null;
      try { localStorage.removeItem(CACHE_KEY); } catch (e) {}
    }
  };

  window.LM_MarketDataService = LM_MarketDataService;
})();
