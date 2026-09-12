/**
 * LedgerMate – SpendingHeatmap.js
 * ─────────────────────────────────────────────────────────────
 * GitHub-style Daily Spending Activity Calendar Heatmap (365 days)
 * Visualizes daily spending intensity, streaks, and zero-spend days.
 * Exposes: window.LM_SpendingHeatmap
 * ─────────────────────────────────────────────────────────────
 */
(function () {
  'use strict';

  function buildDailyMap() {
    var txs = (window.state && window.state.transactions) ? window.state.transactions : [];
    var daily = {};

    txs.forEach(function (t) {
      if (t.type !== 'out') return;
      var d = t.date;
      if (!d) return;
      var amt = parseFloat(t.amount) || 0;
      if (amt <= 0) return;

      if (!daily[d]) {
        daily[d] = { total: 0, count: 0, items: [] };
      }
      daily[d].total += amt;
      daily[d].count += 1;
      daily[d].items.push(t);
    });

    return daily;
  }

  function renderHeatmap(containerId) {
    var container = document.getElementById(containerId);
    if (!container) return;

    var dailyMap = buildDailyMap();
    var today = new Date();
    var days = [];
    var maxDaily = 1;
    var zeroSpendDays = 0;

    // Generate last 52 weeks (364 days)
    for (var i = 363; i >= 0; i--) {
      var d = new Date(today);
      d.setDate(d.getDate() - i);
      var dateStr = d.toISOString().slice(0, 10);
      var data = dailyMap[dateStr] || { total: 0, count: 0, items: [] };

      if (data.total > maxDaily) maxDaily = data.total;
      if (data.total === 0) zeroSpendDays++;

      days.push({
        date: dateStr,
        dayOfWeek: d.getDay(),
        total: data.total,
        count: data.count,
        items: data.items
      });
    }

    // Color level calculator (0 to 4)
    function getColor(total) {
      if (total === 0) return 'rgba(255,255,255,0.04)';
      var ratio = total / maxDaily;
      if (ratio < 0.15) return 'rgba(79, 142, 247, 0.3)';
      if (ratio < 0.4)  return 'rgba(79, 142, 247, 0.6)';
      if (ratio < 0.75) return 'rgba(79, 142, 247, 0.85)';
      return '#00d4b4';
    }

    var fmt = (v) => '₹' + Math.round(v).toLocaleString('en-IN');

    // Group into 52 columns of 7 rows
    var weeks = [];
    var curWeek = [];
    // Pad first week with nulls to match day of week
    var firstDayOfWeek = days[0].dayOfWeek;
    for (var p = 0; p < firstDayOfWeek; p++) {
      curWeek.push(null);
    }

    days.forEach(function (day) {
      curWeek.push(day);
      if (curWeek.length === 7) {
        weeks.push(curWeek);
        curWeek = [];
      }
    });
    if (curWeek.length) {
      while (curWeek.length < 7) curWeek.push(null);
      weeks.push(curWeek);
    }

    container.innerHTML = `
      <div style="background:var(--card,#151922);border:1px solid var(--border,#262f45);border-radius:14px;padding:20px;color:var(--text,#e8eaf6);font-family:Inter,sans-serif;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;flex-wrap:wrap;gap:10px;">
          <div>
            <h4 style="font-size:15px;font-weight:700;display:flex;align-items:center;gap:6px;">📅 Daily Spending Intensity (Past 12 Months)</h4>
            <p style="font-size:11px;color:var(--text2,#8896b8);">Track your daily expense rhythm and zero-spend victory days.</p>
          </div>
          <div style="display:flex;gap:14px;font-size:12px;align-items:center;">
            <span style="color:#00d4b4;font-weight:600;">🌿 ${zeroSpendDays} Zero-Spend Days</span>
            <div style="display:flex;align-items:center;gap:4px;font-size:11px;color:var(--text3,#5a6688);">
              <span>Less</span>
              <span style="width:10px;height:10px;background:rgba(255,255,255,0.04);border-radius:2px;display:inline-block;"></span>
              <span style="width:10px;height:10px;background:rgba(79,142,247,0.3);border-radius:2px;display:inline-block;"></span>
              <span style="width:10px;height:10px;background:rgba(79,142,247,0.6);border-radius:2px;display:inline-block;"></span>
              <span style="width:10px;height:10px;background:rgba(79,142,247,0.85);border-radius:2px;display:inline-block;"></span>
              <span style="width:10px;height:10px;background:#00d4b4;border-radius:2px;display:inline-block;"></span>
              <span>More</span>
            </div>
          </div>
        </div>

        <div style="overflow-x:auto;padding-bottom:6px;">
          <div style="display:flex;gap:3px;min-width:700px;">
            ${weeks.map(week => `
              <div style="display:flex;flex-direction:column;gap:3px;">
                ${week.map(cell => {
                  if (!cell) return `<div style="width:11px;height:11px;opacity:0;"></div>`;
                  var tooltip = `${cell.date}: ${cell.total > 0 ? fmt(cell.total) + ' (' + cell.count + ' txs)' : 'No spending'}`;
                  return `
                    <div class="lm-heat-cell"
                         title="${tooltip}"
                         data-date="${cell.date}"
                         style="width:11px;height:11px;border-radius:2px;background:${getColor(cell.total)};cursor:pointer;transition:transform .1s;"
                         onmouseover="this.style.transform='scale(1.35)'"
                         onmouseout="this.style.transform='scale(1)'">
                    </div>
                  `;
                }).join('')}
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;
  }

  window.LM_SpendingHeatmap = {
    render: renderHeatmap,
    buildDailyMap: buildDailyMap
  };

  console.log('[LM] SpendingHeatmap module initialized.');
})();
