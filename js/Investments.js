/* =========================================================
   💼 LedgerMate - Investments Module (Fixed & Complete)
   - FD quarterly compounding default (bank-style)
   - RD monthly compounding
   - Add/Edit/Delete working
   - Interest so far accurate and rounded
   - Doughnut + per-card projection charts + toggle
   ========================================================= */

/* -------------------------
   Helpers & Calculations
   ------------------------- */
function getCompoundingFrequency(freq) {
  switch ((freq || '').toLowerCase()) {
    case 'monthly': return 12;
    case 'quarterly': return 4;
    case 'yearly': return 1;
    default: return 4; // bank default = quarterly
  }
}

function toNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

/* calculate maturity:
   FD -> P * (1 + r/n)^(n*t)
   RD -> monthly deposits (additionalDeposit) maturity (standard formula) * (1 + rp) to include last period interest
*/
function calculateMaturity(inv) {
  const P = toNum(inv.principal);
  const r = toNum(inv.rate) / 100;
  const t = toNum(inv.tenureMonths) / 12;
  const add = toNum(inv.additionalDeposit);

  if (inv.type === 'FD') {
    const n = getCompoundingFrequency(inv.compounding || 'quarterly');
    const mat = P * Math.pow(1 + r / n, n * t);
    return Number(mat.toFixed(2));
  }

  if (inv.type === 'RD') {
    // RD: monthly deposits (add) compounded monthly
    const n = 12;
    if (add <= 0) return 0;
    const rp = r / n;
    const periods = n * t;
    // standard RD maturity formula: deposit * [ ( (1+rp)^periods -1)/rp ] * (1+rp)
    const mat = add * ((Math.pow(1 + rp, periods) - 1) / rp) * (1 + rp);
    return Number(mat.toFixed(2));
  }

  return 0;
}

function calculateMaturityDate(inv) {
  const start = new Date(inv.startDate);
  start.setMonth(start.getMonth() + toNum(inv.tenureMonths));
  return start.toISOString().split('T')[0];
}

function calculateDaysLeft(maturityDate) {
  const today = new Date();
  const mat = new Date(maturityDate);
  const diffDays = Math.floor((mat - today) / (1000 * 60 * 60 * 24));
  return diffDays >= 0 ? diffDays : 0;
}

/* Interest so far:
   FD -> value at elapsed time - principal
   RD -> maturity of deposits made till now
*/
function calculateInterestSoFar(inv) {
  const start = new Date(inv.startDate);
  const today = new Date();
  if (isNaN(start.getTime())) return 0;
  const diffMs = today - start;
  if (diffMs <= 0) return 0;

  const elapsedMonths = Math.min(inv.tenureMonths, Math.floor(diffMs / (1000 * 60 * 60 * 24 * 30))); // approx months
  if (elapsedMonths <= 0) return 0;

  const r = toNum(inv.rate) / 100;
  const P = toNum(inv.principal);
  const add = toNum(inv.additionalDeposit);

  if (inv.type === 'FD') {
    const n = getCompoundingFrequency(inv.compounding || 'quarterly');
    const valElapsed = P * Math.pow(1 + r / n, n * (elapsedMonths / 12));
    const interest = valElapsed - P;
    return Number(interest.toFixed(2));
  }

  if (inv.type === 'RD') {
    // RD interest accumulated for deposits made so far (approx)
    const n = 12;
    const rp = r / n;
    // deposits have been made for elapsedMonths periods
    // maturity of those deposits (approx) = add * [ ( (1+rp)^elapsedMonths -1)/rp ] * (1+rp)
    if (add <= 0) return 0;
    const valElapsed = add * ((Math.pow(1 + rp, elapsedMonths) - 1) / rp) * (1 + rp);
    return Number(valElapsed.toFixed(2));
  }

  return 0;
}

/* Projection data generator */
function getProjectionData(inv) {
  const months = Math.max(0, Math.floor(toNum(inv.tenureMonths)));
  const P = toNum(inv.principal);
  const r = toNum(inv.rate) / 100;
  const add = toNum(inv.additionalDeposit);
  const out = [];

  if (inv.type === 'FD') {
    const n = getCompoundingFrequency(inv.compounding || 'quarterly');
    for (let m = 1; m <= months; m++) {
      const t = m / 12;
      out.push(Number((P * Math.pow(1 + r / n, n * t)).toFixed(2)));
    }
  } else if (inv.type === 'RD') {
    const n = 12;
    const rp = r / n;
    let total = 0;
    for (let m = 1; m <= months; m++) {
      // maturity of contributions made up to month m
      const val = add * ((Math.pow(1 + rp, m) - 1) / rp) * (1 + rp);
      out.push(Number(val.toFixed(2)));
    }
  }

  return out;
}

/* -------------------------
   Main Modal: render + handlers
   ------------------------- */
function showInvestmentsModal() {
  const invs = Array.isArray(state.investments) ? state.investments : [];

  // Summary numbers
  const totalPrincipal = invs.reduce((s, i) => s + toNum(i.principal), 0);
  const totalMaturity = invs.reduce((s, i) => s + calculateMaturity(i), 0);
  const totalInterest = invs.reduce((s, i) => s + calculateInterestSoFar(i), 0);
  const avgROI = totalPrincipal > 0 ? (((totalMaturity - totalPrincipal) / totalPrincipal) * 100).toFixed(2) : '0.00';

  // summary HTML
  const summaryHTML = `
    <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3 text-center">
      <div class="glass p-3 rounded-xl">
        <p class="text-xs text-gray-500">Total Principal</p>
        <h2 class="text-lg font-semibold">₹${totalPrincipal.toLocaleString()}</h2>
      </div>
      <div class="glass p-3 rounded-xl">
        <p class="text-xs text-gray-500">Maturity Value</p>
        <h2 class="text-lg font-semibold text-emerald-500">₹${totalMaturity.toLocaleString(undefined, { maximumFractionDigits: 2 })}</h2>
      </div>
      <div class="glass p-3 rounded-xl">
        <p class="text-xs text-gray-500">Interest So Far</p>
        <h2 class="text-lg font-semibold text-amber-500">₹${totalInterest.toLocaleString(undefined, { maximumFractionDigits: 2 })}</h2>
      </div>
      <div class="glass p-3 rounded-xl">
        <p class="text-xs text-gray-500">Avg ROI</p>
        <h2 class="text-lg font-semibold text-indigo-500">${avgROI}%</h2>
      </div>
    </div>
  `;

  // chartHTML
  const chartHTML = `
    <div class="glass p-4 rounded-xl mb-3">
      <div class="flex justify-between items-center mb-2">
        <h3 class="text-sm font-semibold">📊 Investment Breakdown</h3>
        <div class="flex bg-gray-100 dark:bg-gray-800 rounded-md text-xs overflow-hidden border border-gray-200/30 dark:border-gray-700/30">
          <button id="chartTypeBtn" class="px-3 py-1 bg-indigo-500 text-white">Type</button>
          <button id="chartCompBtn" class="px-3 py-1 text-gray-600 dark:text-gray-300 hover:bg-indigo-500/10">Compounding</button>
        </div>
      </div>
      <canvas id="invChart" height="130"></canvas>
    </div>
  `;
    // 🕒 Date formatter helper
  const fmt = d => {
    if (!d) return '-';
    const date = new Date(d);
    if (isNaN(date)) return '-';
    return date.toLocaleString('en-IN', { 
      day: '2-digit', month: 'short', year: '2-digit',
      hour: '2-digit', minute: '2-digit', hour12: true 
    });
  };


  // rows (investment cards)
  const rows = invs.map(inv => {
    const maturity = calculateMaturity(inv);
    const maturityDate = calculateMaturityDate(inv);
    const daysLeft = calculateDaysLeft(maturityDate);
    const interest = calculateInterestSoFar(inv);
    const progress = inv.tenureMonths ? Math.min(100, Math.round(((inv.tenureMonths - (daysLeft / 30)) / inv.tenureMonths) * 100)) : 0;
    const chartId = `chart_${inv.id}`;

    return `
      <div class="glass p-4 rounded-xl mb-3 transition-all duration-300 hover:scale-[1.01]" data-inv-id="${inv.id}">
        <div class="flex justify-between items-start mb-1">
          <div>
            <h3 class="text-sm font-semibold flex items-center gap-2">${inv.name || 'Untitled'}</h3>
            <p class="text-xs text-gray-500 mt-0.5">${inv.type} • ₹${toNum(inv.principal).toLocaleString()} @ ${toNum(inv.rate)}% • ${inv.compounding || 'quarterly'}</p>
          </div>
          <div class="flex gap-1">
            <button class="editInv px-2 py-1 bg-yellow-400/70 text-xs rounded" data-id="${inv.id}">✏️</button>
            <button class="delInv px-2 py-1 bg-red-500/70 text-xs text-white rounded" data-id="${inv.id}">🗑️</button>
          </div>
        </div>

        <div class="text-xs grid grid-cols-2 gap-y-1 mt-2">
          <span>📅 ${inv.startDate}</span><span>⏳ ${inv.tenureMonths} mo</span>
          <span>💰 Maturity: ₹${maturity.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
          <span>📈 Interest: ₹${interest.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
        </div>

        <div class="mt-2">
          <div class="flex justify-between text-[10px] text-gray-500">
            <span>${daysLeft} days left</span><span>${progress}%</span>
          </div>
          <div class="w-full bg-gray-200/30 dark:bg-gray-700/30 rounded-full h-2 mt-1">
            <div class="bg-indigo-500 h-2 rounded-full transition-all" style="width:${progress}%"></div>
          </div>
        </div>
          <div class="mt-2 text-[10px] text-gray-500 italic">
          🕒 Modified: ${fmt(inv.modified || inv.createdAt)}${inv.createdAt ? ` | Created: ${fmt(inv.createdAt)}` : ''}
        </div>
        <div class="mt-3 text-center">
          <button class="toggleGrowth text-xs text-indigo-500 font-medium hover:underline transition-colors" data-id="${inv.id}">
            📈 Show Growth
          </button>
        </div>

        <div id="growth_${inv.id}" class="hidden overflow-hidden transition-all duration-500 ease-in-out mt-3">
          <canvas id="${chartId}" height="80"></canvas>
        </div>
      </div>
    `;
  }).join('');

  // add form
  const addForm = `
    <details class="glass rounded-xl">
      <summary class="px-3 py-2 font-semibold text-indigo-500 cursor-pointer">➕ Add / Edit Investment</summary>
      <form id="addInvestmentForm" class="p-3 space-y-2 text-sm">
        <input type="hidden" id="investmentId" />
        <input id="invName" placeholder="Name" class="w-full p-2 rounded border dark:border-gray-700 bg-transparent" required />
        <select id="invType" class="w-full p-2 rounded border dark:border-gray-700 bg-transparent">
          <option value="FD">Fixed Deposit</option>
          <option value="RD">Recurring Deposit</option>
        </select>
        <input id="invPrincipal" type="number" placeholder="Principal" class="w-full p-2 rounded border dark:border-gray-700 bg-transparent" required />
        <input id="invRate" type="number" step="0.01" placeholder="Rate (%)" class="w-full p-2 rounded border dark:border-gray-700 bg-transparent" required />
        <input id="invStartDate" type="date" class="w-full p-2 rounded border dark:border-gray-700 bg-transparent" required />
        <input id="invTenureMonths" type="number" placeholder="Tenure (Months)" class="w-full p-2 rounded border dark:border-gray-700 bg-transparent" required />
        <select id="invCompounding" class="w-full p-2 rounded border dark:border-gray-700 bg-transparent">
          <option value="quarterly">Quarterly (Default)</option>
          <option value="monthly">Monthly</option>
          <option value="yearly">Yearly</option>
        </select>
        <input id="invAdditionalDeposit" type="number" placeholder="Additional Deposit (For RD)" value="0" class="w-full p-2 rounded border dark:border-gray-700 bg-transparent" />
        <button class="w-full py-2 rounded bg-indigo-600 text-white font-semibold">💾 Save</button>
      </form>
    </details>
  `;

  // render modal
  showSimpleModal(
    '💼 Investments Overview',
    `<div class="max-h-[80vh] overflow-y-auto space-y-3 p-3">
       ${summaryHTML}
       ${chartHTML}
       ${rows || `<div class="text-center text-gray-500 py-4">No investments yet.</div>`}
       ${addForm}
     </div>`
  );

  /* -------------------------
     Bind handlers after modal renders
     ------------------------- */
  // safety helper for getting elements (may be inside modal)
  function $id(id) { return document.getElementById(id); }

  // form submit
  const addFormEl = $id('addInvestmentForm');
  if (addFormEl) {
    addFormEl.onsubmit = async (e) => {
      e.preventDefault();
      const invIdEl = $id('investmentId');
      const id = invIdEl ? invIdEl.value : '';
      const data = {
        id: id || uid('inv'),
        name: ($id('invName')?.value || '').trim(),
        type: $id('invType')?.value || 'FD',
        principal: toNum($id('invPrincipal')?.value),
        rate: toNum($id('invRate')?.value),
        startDate: $id('invStartDate')?.value,
        tenureMonths: Math.max(0, Math.floor(toNum($id('invTenureMonths')?.value))),
        compounding: $id('invCompounding')?.value || 'quarterly',
        additionalDeposit: toNum($id('invAdditionalDeposit')?.value),
        modified: nowISO1(),
        createdAt: id ? undefined : nowISO1(),
        modified: nowISO1(),
      };
      if (!data.createdAt && !id) data.createdAt = nowISO1();

      if (!data.name || !data.startDate) {
        showToast('Please fill required fields', 'error');
        return;
      }

      try {
        if (id) {
          const inv = state.investments.find(i => i.id === id);
          if (inv) {
            Object.assign(inv, data);
            await put('investments', inv);
            showToast('Investment updated!', 'success');
          }
        } else {
          await put('investments', data);
          state.investments.push(data);
          showToast('Investment added!', 'success');
        }
        autoBackup();
        showInvestmentsModal();
      } catch (err) {
        console.error('save inv err', err);
        showToast('Error saving investment', 'error');
      }
    };
  }

  // delete handlers
  setTimeout(() => {
    document.querySelectorAll('.delInv').forEach(btn => {
      btn.onclick = async () => {
        const id = btn.dataset.id;
        if (!id) return;
        if (!confirm('Delete this investment?')) return;
        try {
          await del('investments', id);
          state.investments = state.investments.filter(i => i.id !== id);
          autoBackup();
          showToast('Investment deleted', 'success');
          showInvestmentsModal();
        } catch (err) {
          console.error('delete inv err', err);
          showToast('Error deleting', 'error');
        }
      };
    });

    // edit handlers
    document.querySelectorAll('.editInv').forEach(btn => {
      btn.onclick = () => {
        const id = btn.dataset.id;
        const inv = state.investments.find(i => i.id === id);
        if (!inv) return;
        // populate form fields
        $id('investmentId').value = inv.id;
        $id('invName').value = inv.name || '';
        $id('invType').value = inv.type || 'FD';
        $id('invPrincipal').value = toNum(inv.principal) || '';
        $id('invRate').value = toNum(inv.rate) || '';
        $id('invStartDate').value = inv.startDate || '';
        $id('invTenureMonths').value = toNum(inv.tenureMonths) || '';
        $id('invCompounding').value = inv.compounding || 'quarterly';
        $id('invAdditionalDeposit').value = toNum(inv.additionalDeposit) || 0;

        // open details (if it's collapsible)
        const details = $id('addInvestmentForm')?.closest('details');
        if (details && typeof details.open !== 'undefined') details.open = true;
        showToast('Editing investment — make changes and Save', 'info');
        // scroll to form
        $id('addInvestmentForm')?.scrollIntoView({ behavior: 'smooth' });
      };
    });
  }, 80);

  /* -------------------------
     Main Doughnut Chart
     ------------------------- */
  const ctx = $id('invChart');
  if (!ctx) return;

  const fdCount = invs.filter(i => i.type === 'FD').length;
  const rdCount = invs.filter(i => i.type === 'RD').length;
  const monthlyCount = invs.filter(i => i.compounding === 'monthly').length;
  const quarterlyCount = invs.filter(i => i.compounding === 'quarterly').length;
  const yearlyCount = invs.filter(i => i.compounding === 'yearly').length;

  const centerTextPlugin = {
    id: 'centerText',
    afterDraw(chart) {
      const { ctx, chartArea: { width, height, left, top } } = chart;
      ctx.save();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const color = getComputedStyle(document.documentElement).getPropertyValue('--glass-text') || '#111';
      ctx.fillStyle = color;
      ctx.font = '600 14px Poppins, sans-serif';
      ctx.fillText('Total', left + width / 2, top + height / 2 - 10);
      ctx.font = 'bold 16px Poppins, sans-serif';
      ctx.fillText('₹' + totalPrincipal.toLocaleString(), left + width / 2, top + height / 2 + 10);
      ctx.restore();
    }
  };

  const typeData = { labels: ['FD', 'RD'], datasets: [{ data: [fdCount, rdCount], backgroundColor: ['#6366f1', '#10b981'], borderColor: '#fff', borderWidth: 2 }] };
  const compData = { labels: ['Monthly', 'Quarterly', 'Yearly'], datasets: [{ data: [monthlyCount, quarterlyCount, yearlyCount], backgroundColor: ['#f59e0b', '#8b5cf6', '#3b82f6'], borderColor: '#fff', borderWidth: 2 }] };

  const chart = new Chart(ctx, {
    type: 'doughnut',
    data: typeData,
    options: {
      plugins: { legend: { position: 'bottom', labels: { color: getComputedStyle(document.documentElement).getPropertyValue('--glass-text') || '#444' } } },
      cutout: '65%',
      animation: { animateRotate: true, animateScale: true }
    },
    plugins: [centerTextPlugin]
  });

  // chart toggle buttons
  setTimeout(() => {
    const btnType = $id('chartTypeBtn');
    const btnComp = $id('chartCompBtn');
    if (btnType && btnComp) {
      btnType.onclick = () => { chart.data = typeData; chart.update(); btnType.classList.add('bg-indigo-500','text-white'); btnComp.classList.remove('bg-indigo-500','text-white'); };
      btnComp.onclick = () => { chart.data = compData; chart.update(); btnComp.classList.add('bg-indigo-500','text-white'); btnType.classList.remove('bg-indigo-500','text-white'); };
    }
  }, 80);

  /* -------------------------
     Per-card Growth Toggle + Chart
     ------------------------- */
  setTimeout(() => {
    document.querySelectorAll('.toggleGrowth').forEach(btn => {
      btn.onclick = () => {
        const id = btn.dataset.id;
        if (!id) return;
        const section = $id(`growth_${id}`);
        const canvas = $id(`chart_${id}`);
        if (!section || !canvas) return;

        const hidden = section.classList.contains('hidden');
        if (hidden) {
          // expand
          section.classList.remove('hidden');
          // ensure max-height a bit larger (for CSS transition)
          section.style.maxHeight = '200px';
          btn.textContent = '📉 Hide Growth';

          if (!canvas.dataset.chartDone) {
            const inv = state.investments.find(i => i.id === id);
            if (!inv) return;
            const proj = getProjectionData(inv);
            // if no data or less than 2 points, don't create chart
            if (proj.length < 1) {
              canvas.dataset.chartDone = true;
              return;
            }
            new Chart(canvas, {
              type: 'line',
              data: {
                labels: proj.map((_, i) => `M${i+1}`),
                datasets: [{
                  data: proj,
                  borderWidth: 2,
                  borderColor: '#6366f1',
                  backgroundColor: 'rgba(99,102,241,0.12)',
                  tension: 0.32,
                  fill: true,
                  pointRadius: 0
                }]
              },
              options: {
                plugins: { legend: { display: false } },
                scales: {
                  x: { display: false },
                  y: { display: false, beginAtZero: true }
                },
                responsive: true,
                maintainAspectRatio: false
              }
            });
            canvas.dataset.chartDone = true;
          }
        } else {
          // collapse
          section.classList.add('hidden');
          section.style.maxHeight = '0';
          btn.textContent = '📈 Show Growth';
        }
      };
    });
  }, 200);
}

/* ========== End of investments module ========== */
