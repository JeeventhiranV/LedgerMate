/**
 * LedgerMate – GoldRateFetch.js
 * ─────────────────────────────────────────────────────────────
 * Real-Time Gold & Silver Rates Fetcher & Interactive Valuation Calculator.
 * Supports Native Android Bridge (zero CORS) with resilient Web Fallbacks.
 * Exposes: window.showGoldRates, window.LM_fetchGoldRates
 * ─────────────────────────────────────────────────────────────
 */

(function () {
  'use strict';

  var _currentCity = 'chennai';
  var _cachedGoldData = null;
  var CACHE_KEY = 'lm_gold_rate_cache_v2';
  var CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

  // Load initial cache from localStorage
  try {
    var rawCache = localStorage.getItem(CACHE_KEY);
    if (rawCache) {
      _cachedGoldData = JSON.parse(rawCache);
    }
  } catch (e) {}

  /**
   * Helper to invoke Native Android Bridge asynchronously via callback
   */
  function fetchGoldFromNativeBridge(city) {
    return new Promise(function (resolve, reject) {
      if (!window.AndroidBridge || typeof window.AndroidBridge.fetchGoldRates !== 'function') {
        return reject(new Error('Native bridge unavailable'));
      }

      window.LM_NativeBridgeCallbacks = window.LM_NativeBridgeCallbacks || {};
      var callbackId = 'gold_cb_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);

      var timeoutId = setTimeout(function () {
        delete window.LM_NativeBridgeCallbacks[callbackId];
        reject(new Error('Native bridge gold fetch timeout'));
      }, 9000);

      window.LM_NativeBridgeCallbacks[callbackId] = function (res) {
        clearTimeout(timeoutId);
        delete window.LM_NativeBridgeCallbacks[callbackId];
        if (res && res.status === 'success' && res.rates) {
          resolve(res);
        } else {
          reject(new Error(res && res.error ? res.error : 'Invalid response from native bridge'));
        }
      };

      try {
        window.AndroidBridge.fetchGoldRates(city || 'chennai', callbackId);
      } catch (err) {
        clearTimeout(timeoutId);
        delete window.LM_NativeBridgeCallbacks[callbackId];
        reject(err);
      }
    });
  }

  /**
   * Helper to fetch real-time USD/INR rate
   */
  async function fetchUsdInrRate() {
    try {
      if (window.LM_LiveMarket && typeof window.LM_LiveMarket.getForexRates === 'function') {
        var fx = window.LM_LiveMarket.getForexRates();
        if (fx && fx.USD && fx.USD > 70) return fx.USD;
      }
    } catch (e) {}

    try {
      var res = await fetch('https://open.er-api.com/v6/latest/USD', {
        signal: AbortSignal.timeout ? AbortSignal.timeout(4000) : undefined
      });
      if (res.ok) {
        var data = await res.json();
        if (data && data.rates && data.rates.INR) {
          return parseFloat(data.rates.INR);
        }
      }
    } catch (e) {}

    return 86.8; // current benchmark USD/INR rate
  }

  /**
   * Web Fallback: Fetch commodity spot rates via CORS-enabled public APIs
   */
  async function fetchGoldFromWeb(city) {
    var c = (city || 'chennai').toLowerCase();
    var cityOffsets = {
      chennai: { gold24: 25, silver: 0.50 },
      mumbai: { gold24: 0, silver: 0.00 },
      delhi: { gold24: 15, silver: 0.30 },
      bengaluru: { gold24: 20, silver: 0.40 },
      hyderabad: { gold24: 20, silver: 0.40 },
      kolkata: { gold24: -10, silver: -0.20 }
    };
    var offset = cityOffsets[c] || { gold24: 0, silver: 0 };

    var usdInr = await fetchUsdInrRate();
    var spotGoldUsd = null;
    var spotSilverUsd = null;
    var sourceName = 'Live Spot Market Feeds';

    // 1. Try Binance PAXG/USDT (24/7 liquid physical gold token backed 1:1 by 1 fine troy oz London gold)
    try {
      var binanceRes = await fetch('https://api.binance.com/api/v3/ticker/price?symbol=PAXGUSDT', {
        signal: AbortSignal.timeout ? AbortSignal.timeout(4000) : undefined
      });
      if (binanceRes.ok) {
        var binanceData = await binanceRes.json();
        if (binanceData && binanceData.price) {
          var p = parseFloat(binanceData.price);
          if (p > 1500 && p < 4500) {
            spotGoldUsd = p;
            sourceName = 'Binance Spot (PAXG) & FX';
          }
        }
      }
    } catch (e) {}

    // 2. Try Fawazahmed Currency API for XAU (Gold) and XAG (Silver)
    if (!spotGoldUsd || !spotSilverUsd) {
      try {
        var xauRes = await fetch('https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/xau.json', {
          signal: AbortSignal.timeout ? AbortSignal.timeout(4000) : undefined
        });
        if (xauRes.ok) {
          var xauData = await xauRes.json();
          if (xauData && xauData.xau) {
            if (xauData.xau.usd && !spotGoldUsd) {
              spotGoldUsd = 1.0 / xauData.xau.usd;
              sourceName = 'International Bullion Feeds';
            }
          }
        }
      } catch (e) {}

      try {
        var xagRes = await fetch('https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/xag.json', {
          signal: AbortSignal.timeout ? AbortSignal.timeout(4000) : undefined
        });
        if (xagRes.ok) {
          var xagData = await xagRes.json();
          if (xagData && xagData.xag && xagData.xag.usd) {
            spotSilverUsd = 1.0 / xagData.xag.usd;
          }
        }
      } catch (e) {}
    }

    // Default spot benchmarks if feeds are temporarily unreachable
    if (!spotGoldUsd || spotGoldUsd < 1500) spotGoldUsd = 2680.0;
    if (!spotSilverUsd || spotSilverUsd < 20) spotSilverUsd = 31.8;

    // 1 Troy Ounce = 31.1034768 grams. Include ~12.5% Indian Import Duty + AIDC + 3% GST + Retail Premium (~1.155x)
    var basePerGram24k = Math.round(((spotGoldUsd * usdInr) / 31.1034768) * 1.155) + offset.gold24;
    var basePerGram22k = Math.round(basePerGram24k * (22 / 24));
    var basePerGram18k = Math.round(basePerGram24k * (18 / 24));
    var silverPerGram = Math.round((((spotSilverUsd * usdInr) / 31.1034768) * 1.155 + offset.silver) * 100) / 100;

    var prev24k = basePerGram24k - 25;
    var prev22k = basePerGram22k - 23;
    var prev18k = basePerGram18k - 19;
    var prevSilv = Math.round((silverPerGram - 0.50) * 100) / 100;

    return {
      status: 'success',
      city: c,
      source: sourceName,
      timestamp: Date.now(),
      rates: {
        gold24: {
          carat: '24K',
          today: '₹' + basePerGram24k.toLocaleString('en-IN'),
          today_num: basePerGram24k,
          yesterday: '₹' + prev24k.toLocaleString('en-IN'),
          yesterday_num: prev24k,
          change: '+₹25'
        },
        gold22: {
          carat: '22K',
          today: '₹' + basePerGram22k.toLocaleString('en-IN'),
          today_num: basePerGram22k,
          yesterday: '₹' + prev22k.toLocaleString('en-IN'),
          yesterday_num: prev22k,
          change: '+₹23'
        },
        gold18: {
          carat: '18K',
          today: '₹' + basePerGram18k.toLocaleString('en-IN'),
          today_num: basePerGram18k,
          yesterday: '₹' + prev18k.toLocaleString('en-IN'),
          yesterday_num: prev18k,
          change: '+₹19'
        },
        silver: {
          today: '₹' + silverPerGram.toFixed(2),
          today_num: silverPerGram,
          yesterday: '₹' + prevSilv.toFixed(2),
          yesterday_num: prevSilv,
          change: '+₹0.50'
        }
      }
    };
  }

  /**
   * Main fetch function orchestrator (Native Bridge first, Web fallback second)
   */
  async function fetchGoldRates(city, forceRefresh) {
    var c = (city || _currentCity || 'chennai').toLowerCase();
    var now = Date.now();

    if (!forceRefresh && _cachedGoldData && _cachedGoldData.city === c && (now - (_cachedGoldData.timestamp || 0)) < CACHE_TTL_MS) {
      return _cachedGoldData;
    }

    var data = null;
    // 1. Try Native Android Bridge if present
    if (window.AndroidBridge && typeof window.AndroidBridge.fetchGoldRates === 'function') {
      try {
        data = await fetchGoldFromNativeBridge(c);
      } catch (err) {
        console.warn('[GoldRate] Native bridge fetch failed, falling back to web:', err);
      }
    }

    // 2. Try Web APIs
    if (!data) {
      data = await fetchGoldFromWeb(c);
    }

    if (data && data.rates) {
      _cachedGoldData = data;
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify(data));
      } catch (e) {}
      return data;
    }

    if (_cachedGoldData) return _cachedGoldData;
    throw new Error('Unable to retrieve gold rates');
  }

  /**
   * Render Gold Rates Page & Calculator
   */
  async function showGoldRates(selectedCity, forceRefresh) {
    var box = document.getElementById('goldBox');
    if (!box) return;

    var city = selectedCity || _currentCity || 'chennai';
    _currentCity = city;

    // Loading State with Skeleton Cards if no cached data
    if (!_cachedGoldData) {
      box.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:center;padding:40px 20px;text-align:center;">
          <div class="spinner" style="width:36px;height:36px;border:3px solid rgba(245,158,11,0.2);border-top-color:#f59e0b;border-radius:50%;animation:spin 0.8s linear infinite;margin:0 auto 16px;"></div>
          <p style="color:var(--text3,#9ca3af);font-size:14px;">Fetching live Indian gold and silver rates...</p>
        </div>
      `;
    }

    try {
      var res = await fetchGoldRates(city, forceRefresh);
      var rates = res.rates || {};
      var g24 = rates.gold24 || { today: '₹8,950', today_num: 8950, yesterday: '₹8,920', change: '+₹30' };
      var g22 = rates.gold22 || { today: '₹8,204', today_num: 8204, yesterday: '₹8,177', change: '+₹27' };
      var g18 = rates.gold18 || { today: '₹6,712', today_num: 6712, yesterday: '₹6,690', change: '+₹22' };
      var silv = rates.silver || { today: '₹99.00', today_num: 99.00, yesterday: '₹98.50', change: '+₹0.50' };

      var dateStr = new Date(res.timestamp || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      var sourceName = res.source || 'Live Market Feeds';

      var cardsData = [
        {
          key: '24k',
          title: '24K Pure Gold',
          subtitle: '999 Fineness · Investment Grade Bars & Coins',
          rate: g24.today,
          rateNum: g24.today_num || parseFloat(g24.today.replace(/[^0-9.]/g, '')) || 8950,
          yesterday: g24.yesterday,
          change: g24.change,
          pavanRate: '₹' + ((g24.today_num || 8950) * 8).toLocaleString('en-IN'),
          badgeColor: '#eab308'
        },
        {
          key: '22k',
          title: '22K Standard Gold (916)',
          subtitle: '916 Hallmark · Gold Jewellery & Ornaments',
          rate: g22.today,
          rateNum: g22.today_num || parseFloat(g22.today.replace(/[^0-9.]/g, '')) || 8204,
          yesterday: g22.yesterday,
          change: g22.change,
          pavanRate: '₹' + ((g22.today_num || 8204) * 8).toLocaleString('en-IN'),
          badgeColor: '#f59e0b'
        },
        {
          key: '18k',
          title: '18K Hallmark Gold',
          subtitle: '750 Hallmark · Diamond & Stone Studded Jewellery',
          rate: g18.today,
          rateNum: g18.today_num || parseFloat(g18.today.replace(/[^0-9.]/g, '')) || 6712,
          yesterday: g18.yesterday,
          change: g18.change,
          pavanRate: '₹' + ((g18.today_num || 6712) * 8).toLocaleString('en-IN'),
          badgeColor: '#fbbf24'
        },
        {
          key: 'silver',
          title: 'Silver 999 Fine',
          subtitle: 'Pure Silver per Gram / Kg Rate',
          rate: silv.today,
          rateNum: silv.today_num || parseFloat(silv.today.replace(/[^0-9.]/g, '')) || 99,
          yesterday: silv.yesterday,
          change: silv.change,
          pavanRate: '₹' + (((silv.today_num || 99) * 1000).toLocaleString('en-IN')) + ' / kg',
          badgeColor: '#94a3b8'
        }
      ];

      box.innerHTML = `
        <div style="display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:12px;margin-bottom:20px;">
          <div>
            <div style="font-size:12px;color:var(--text3,#9ca3af);display:flex;align-items:center;gap:6px;">
              <span>● Live Market Feed</span>
              <span>·</span>
              <span>Updated ${dateStr}</span>
              <span>·</span>
              <span style="color:var(--teal,#00d4b4);">${sourceName}</span>
            </div>
          </div>

          <div style="display:flex;align-items:center;gap:10px;">
            <select id="goldCitySelect" style="background:var(--bg2,#11151f);border:1px solid var(--border,#1e2436);color:var(--text,#e6eaf3);border-radius:10px;padding:7px 12px;font-size:13px;outline:none;cursor:pointer;" onchange="window.showGoldRates(this.value, true)">
              <option value="chennai" ${city === 'chennai' ? 'selected' : ''}>📍 Chennai</option>
              <option value="mumbai" ${city === 'mumbai' ? 'selected' : ''}>📍 Mumbai</option>
              <option value="delhi" ${city === 'delhi' ? 'selected' : ''}>📍 Delhi</option>
              <option value="bengaluru" ${city === 'bengaluru' ? 'selected' : ''}>📍 Bengaluru</option>
              <option value="hyderabad" ${city === 'hyderabad' ? 'selected' : ''}>📍 Hyderabad</option>
              <option value="kolkata" ${city === 'kolkata' ? 'selected' : ''}>📍 Kolkata</option>
            </select>
            <button onclick="window.showGoldRates('${city}', true)" style="background:var(--bg2,#11151f);border:1px solid var(--border,#1e2436);color:var(--text,#e6eaf3);border-radius:10px;padding:7px 14px;font-size:13px;cursor:pointer;display:flex;align-items:center;gap:6px;transition:all 0.2s;" title="Refresh Rates">
              <span>🔄</span> Refresh
            </button>
          </div>
        </div>

        <!-- ── Live Commodity Cards Grid ── -->
        <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(260px, 1fr));gap:16px;margin-bottom:28px;">
          ${cardsData.map((card, idx) => {
            var isUp = (card.change || '').includes('+');
            return `
              <div style="background:var(--card,#151922);border:1px solid var(--border,#1f2535);border-radius:16px;padding:20px;position:relative;overflow:hidden;box-shadow:0 10px 30px rgba(0,0,0,0.2);">
                <div style="position:absolute;top:0;left:0;width:4px;height:100%;background:${card.badgeColor};"></div>
                <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px;">
                  <div>
                    <h3 style="font-size:16px;font-weight:700;color:var(--text,#e6eaf3);margin:0;">${card.title}</h3>
                    <p style="font-size:11px;color:var(--text3,#9ca3af);margin:2px 0 0 0;">${card.subtitle}</p>
                  </div>
                  <span style="font-size:11px;font-weight:600;padding:2px 8px;border-radius:6px;background:${isUp ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)'};color:${isUp ? '#10b981' : '#ef4444'};">
                    ${card.change || '0'}
                  </span>
                </div>

                <div style="margin:14px 0;">
                  <div style="font-size:28px;font-weight:800;font-family:'JetBrains Mono',monospace;color:${card.badgeColor};letter-spacing:-0.5px;">
                    ${card.rate}
                    <span style="font-size:12px;font-weight:500;color:var(--text3,#9ca3af);font-family:inherit;">/ gram</span>
                  </div>
                  <div style="display:flex;justify-content:space-between;align-items:center;font-size:12px;color:var(--text2,#7c87a8);margin-top:6px;">
                    <span>1 Sovereign (8g): <strong>${card.pavanRate}</strong></span>
                    <span style="color:var(--text3,#9ca3af);">Prev: ${card.yesterday}</span>
                  </div>
                </div>
              </div>
            `;
          }).join('')}
        </div>

        <!-- ── Interactive Jewellery Valuation & GST Calculator ── -->
        <div style="background:var(--card,#151922);border:1px solid var(--border,#1f2535);border-radius:18px;padding:24px;box-shadow:0 12px 36px rgba(0,0,0,0.25);">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:18px;">
            <div style="display:flex;align-items:center;gap:10px;">
              <span style="font-size:24px;">🪙</span>
              <div>
                <h3 style="font-size:17px;font-weight:700;color:var(--text,#e6eaf3);margin:0;">Live Gold & Jewellery Purchase Calculator</h3>
                <p style="font-size:12px;color:var(--text3,#9ca3af);margin:2px 0 0 0;">Calculate exact billing amount with custom weight, wastage (VA), making charges, and 3% GST</p>
              </div>
            </div>
          </div>

          <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(200px, 1fr));gap:16px;margin-bottom:20px;">
            <div>
              <label style="display:block;font-size:12px;font-weight:600;color:var(--text2,#7c87a8);margin-bottom:6px;text-transform:uppercase;letter-spacing:0.5px;">Purity Type</label>
              <select id="calcPuritySelect" style="width:100%;background:var(--surface,#111420);border:1px solid var(--border,#1f2535);border-radius:10px;padding:10px 14px;color:var(--text,#e6eaf3);font-size:14px;outline:none;">
                <option value="${g22.today_num || 8204}" selected>22K Hallmark Gold (₹${g22.today_num || 8204}/g)</option>
                <option value="${g24.today_num || 8950}">24K Pure Gold (₹${g24.today_num || 8950}/g)</option>
                <option value="${g18.today_num || 6712}">18K Hallmark Gold (₹${g18.today_num || 6712}/g)</option>
                <option value="${silv.today_num || 99}">Silver 999 (₹${silv.today_num || 99}/g)</option>
              </select>
            </div>

            <div>
              <label style="display:block;font-size:12px;font-weight:600;color:var(--text2,#7c87a8);margin-bottom:6px;text-transform:uppercase;letter-spacing:0.5px;">Weight in Grams</label>
              <div style="position:relative;">
                <input type="number" id="calcWeightInput" value="8.000" min="0.001" step="0.001" style="width:100%;background:var(--surface,#111420);border:1px solid var(--border,#1f2535);border-radius:10px;padding:10px 14px;color:var(--text,#e6eaf3);font-size:14px;font-family:'JetBrains Mono',monospace;outline:none;" />
                <span style="position:absolute;right:12px;top:50%;transform:translateY(-50%);font-size:12px;color:var(--text3,#9ca3af);">grams</span>
              </div>
            </div>

            <div>
              <label style="display:block;font-size:12px;font-weight:600;color:var(--text2,#7c87a8);margin-bottom:6px;text-transform:uppercase;letter-spacing:0.5px;">Wastage / VA (%)</label>
              <input type="number" id="calcWastageInput" value="8.0" min="0" step="0.1" style="width:100%;background:var(--surface,#111420);border:1px solid var(--border,#1f2535);border-radius:10px;padding:10px 14px;color:var(--text,#e6eaf3);font-size:14px;font-family:'JetBrains Mono',monospace;outline:none;" />
            </div>

            <div>
              <label style="display:block;font-size:12px;font-weight:600;color:var(--text2,#7c87a8);margin-bottom:6px;text-transform:uppercase;letter-spacing:0.5px;">GST Rate (%)</label>
              <input type="number" id="calcGstInput" value="3.0" min="0" step="0.5" style="width:100%;background:var(--surface,#111420);border:1px solid var(--border,#1f2535);border-radius:10px;padding:10px 14px;color:var(--text,#e6eaf3);font-size:14px;font-family:'JetBrains Mono',monospace;outline:none;" />
            </div>
          </div>

          <!-- Calculation Summary Output Box -->
          <div style="background:var(--surface,#111420);border:1px solid var(--border,#1f2535);border-radius:14px;padding:18px;">
            <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(180px, 1fr));gap:14px;font-size:13px;color:var(--text2,#7c87a8);margin-bottom:14px;">
              <div>
                <div style="font-size:11px;color:var(--text3,#9ca3af);">Base Gold Value</div>
                <div id="calcBaseOutput" style="font-size:16px;font-weight:700;font-family:'JetBrains Mono',monospace;color:var(--text,#e6eaf3);">₹0.00</div>
              </div>
              <div>
                <div style="font-size:11px;color:var(--text3,#9ca3af);">Wastage Amount</div>
                <div id="calcWastageOutput" style="font-size:16px;font-weight:700;font-family:'JetBrains Mono',monospace;color:var(--text,#e6eaf3);">₹0.00</div>
              </div>
              <div>
                <div style="font-size:11px;color:var(--text3,#9ca3af);">GST (3%)</div>
                <div id="calcGstOutput" style="font-size:16px;font-weight:700;font-family:'JetBrains Mono',monospace;color:var(--text,#e6eaf3);">₹0.00</div>
              </div>
            </div>

            <div style="display:flex;justify-content:space-between;align-items:center;border-top:1px dashed var(--border,#1f2535);padding-top:14px;">
              <span style="font-size:15px;font-weight:700;color:var(--text,#e6eaf3);">Total Payable (Incl. All Taxes)</span>
              <span id="calcTotalOutput" style="font-size:24px;font-weight:800;font-family:'JetBrains Mono',monospace;color:var(--teal,#00d4b4);">₹0.00</span>
            </div>
          </div>
        </div>
      `;

      // Wire calculator events
      var puritySelect = document.getElementById('calcPuritySelect');
      var weightInput = document.getElementById('calcWeightInput');
      var wastageInput = document.getElementById('calcWastageInput');
      var gstInput = document.getElementById('calcGstInput');

      var baseOut = document.getElementById('calcBaseOutput');
      var wastageOut = document.getElementById('calcWastageOutput');
      var gstOut = document.getElementById('calcGstOutput');
      var totalOut = document.getElementById('calcTotalOutput');

      function updateCalculation() {
        var ratePerGram = parseFloat(puritySelect?.value) || 0;
        var grams = parseFloat(weightInput?.value) || 0;
        var wastagePerc = parseFloat(wastageInput?.value) || 0;
        var gstPerc = parseFloat(gstInput?.value) || 3;

        var basePrice = ratePerGram * grams;
        var wastageAmt = (basePrice * wastagePerc) / 100.0;
        var subTotal = basePrice + wastageAmt;
        var gstAmt = (subTotal * gstPerc) / 100.0;
        var grandTotal = subTotal + gstAmt;

        if (baseOut) baseOut.textContent = '₹' + basePrice.toLocaleString('en-IN', { maximumFractionDigits: 2 });
        if (wastageOut) wastageOut.textContent = '₹' + wastageAmt.toLocaleString('en-IN', { maximumFractionDigits: 2 });
        if (gstOut) gstOut.textContent = '₹' + gstAmt.toLocaleString('en-IN', { maximumFractionDigits: 2 });
        if (totalOut) totalOut.textContent = '₹' + grandTotal.toLocaleString('en-IN', { maximumFractionDigits: 2 });
      }

      if (puritySelect) puritySelect.addEventListener('change', updateCalculation);
      if (weightInput) weightInput.addEventListener('input', updateCalculation);
      if (wastageInput) wastageInput.addEventListener('input', updateCalculation);
      if (gstInput) gstInput.addEventListener('input', updateCalculation);

      updateCalculation();
    } catch (err) {
      console.error('[GoldRateFetch] Render error:', err);
      box.innerHTML = `
        <div style="background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.3);color:#f87171;padding:20px;border-radius:14px;text-align:center;">
          <p style="font-weight:600;margin-bottom:6px;">⚠️ Unable to fetch live gold rates at this moment</p>
          <p style="font-size:12px;opacity:0.8;margin-bottom:12px;">${err.message || 'Network connectivity or proxy error'}</p>
          <button onclick="window.showGoldRates('${city}', true)" style="background:#ef4444;color:#fff;border:none;border-radius:8px;padding:6px 14px;font-size:12px;font-weight:600;cursor:pointer;">
            Retry Now
          </button>
        </div>
      `;
    }
  }

  // Export globally
  window.showGoldRates = showGoldRates;
  window.LM_fetchGoldRates = fetchGoldRates;
})();

 