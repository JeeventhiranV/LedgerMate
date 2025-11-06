/* =========================================================
   💼 LedgerMate - Investments Module (Clean Final Version)
   ========================================================= */

function getCompoundingFrequency(freq) {
  switch (freq) {
    case 'monthly': return 12;
    case 'quarterly': return 4;
    case 'yearly': return 1;
    default: return 12;
  }
}

function calculateMaturity(inv) {
  const P = Number(inv.principal) || 0;
  const r = (Number(inv.rate) || 0) / 100;
  const n = getCompoundingFrequency(inv.compounding);
  const t = (Number(inv.tenureMonths) || 0) / 12;
  const add = Number(inv.additionalDeposit) || 0;
  if (inv.type === 'FD') return P * Math.pow((1 + r / n), n * t);
  if (inv.type === 'RD') {
    const rp = r / n;
    const periods = n * t;
    return add * ((Math.pow(1 + rp, periods) - 1) / rp);
  }
  return 0;
}

function calculateMaturityDate(inv) {
  const start = new Date(inv.startDate);
  start.setMonth(start.getMonth() + Number(inv.tenureMonths || 0));
  return start.toISOString().split('T')[0];
}

function calculateDaysLeft(maturityDate) {
  const today = new Date();
  const matDate = new Date(maturityDate);
  const diff = Math.floor((matDate - today) / (1000 * 60 * 60 * 24));
  return diff >= 0 ? diff : 0;
}

function calculateInterestSoFar(inv) {
  const today = new Date();
  const start = new Date(inv.startDate);
  const diff = Math.floor((today - start) / (1000 * 60 * 60 * 24));
  if (diff < 0) return 0;
  const elapsed = Math.min(inv.tenureMonths, Math.floor(diff / 30));
  const r = inv.rate / 100;
  const n = getCompoundingFrequency(inv.compounding);
  const t = elapsed / 12;
  if (inv.type === 'FD') return inv.principal * Math.pow((1 + r / n), n * t) - inv.principal;
  if (inv.type === 'RD') {
    const rp = r / n;
    const periods = n * t;
    return inv.additionalDeposit * ((Math.pow(1 + rp, periods) - 1) / rp);
  }
  return 0;
}

function showInvestmentsModal() {
  const invs = state.investments || [];

  // Summary
  const totalPrincipal = invs.reduce((s, i) => s + +i.principal, 0);
  const totalMaturity = invs.reduce((s, i) => s + calculateMaturity(i), 0);
  const totalInterest = invs.reduce((s, i) => s + calculateInterestSoFar(i), 0);
  const avgROI = invs.length ? ((totalMaturity - totalPrincipal) / totalPrincipal * 100).toFixed(2) : 0;

  const summaryHTML = `
    <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
      <div class="glass p-3 rounded-xl text-center">
        <p class="text-xs text-gray-500">Total Principal</p>
        <h2 class="text-lg font-semibold">₹${totalPrincipal.toLocaleString()}</h2>
      </div>
      <div class="glass p-3 rounded-xl text-center">
        <p class="text-xs text-gray-500">Maturity Value</p>
        <h2 class="text-lg font-semibold text-emerald-500">₹${totalMaturity.toLocaleString(undefined, {maximumFractionDigits:2})}</h2>
      </div>
      <div class="glass p-3 rounded-xl text-center">
        <p class="text-xs text-gray-500">Interest So Far</p>
        <h2 class="text-lg font-semibold text-amber-500">₹${totalInterest.toLocaleString(undefined, {maximumFractionDigits:2})}</h2>
      </div>
      <div class="glass p-3 rounded-xl text-center">
        <p class="text-xs text-gray-500">Avg ROI</p>
        <h2 class="text-lg font-semibold text-indigo-500">${avgROI}%</h2>
      </div>
    </div>
  `;

  // Chart
  const chartHTML = `
    <div class="glass p-4 rounded-xl mb-3">
      <div class="flex justify-between items-center mb-2">
        <h3 class="text-sm font-semibold">📊 Breakdown</h3>
        <div class="flex bg-gray-100 dark:bg-gray-800 rounded-md text-xs overflow-hidden border border-gray-200/30 dark:border-gray-700/30">
          <button id="chartTypeBtn" class="px-3 py-1 bg-indigo-500 text-white">Type</button>
          <button id="chartCompBtn" class="px-3 py-1 text-gray-600 dark:text-gray-300 hover:bg-indigo-500/10">Compounding</button>
        </div>
      </div>
      <canvas id="invChart" height="130"></canvas>
    </div>
  `;

  // Cards
  const rows = invs.map(inv => {
    const maturity = calculateMaturity(inv);
    const maturityDate = calculateMaturityDate(inv);
    const daysLeft = calculateDaysLeft(maturityDate);
    const interest = calculateInterestSoFar(inv);
    const progress = Math.min(100, (inv.tenureMonths - (daysLeft / 30)) / inv.tenureMonths * 100);
    return `
      <div class="glass p-4 rounded-xl mb-3 transition-all">
        <div class="flex justify-between items-start mb-1">
          <h3 class="text-sm font-semibold">${inv.name}</h3>
          <div class="flex gap-1">
            <button class="editInv px-2 py-1 bg-yellow-400/70 text-xs rounded" data-id="${inv.id}">✏️</button>
            <button class="delInv px-2 py-1 bg-red-500/70 text-xs text-white rounded" data-id="${inv.id}">🗑️</button>
          </div>
        </div>
        <p class="text-xs text-gray-500 mb-1">${inv.type} • ₹${inv.principal.toLocaleString()} @ ${inv.rate}% • ${inv.compounding}</p>
        <div class="text-xs grid grid-cols-2 gap-y-1">
          <span>📅 ${inv.startDate}</span><span>⏳ ${inv.tenureMonths} mo</span>
          <span>💰 Maturity: ₹${maturity.toLocaleString(undefined, {maximumFractionDigits:2})}</span>
          <span>📈 Interest: ₹${interest.toLocaleString(undefined, {maximumFractionDigits:2})}</span>
        </div>
        <div class="mt-2">
          <div class="flex justify-between text-[10px] text-gray-500">
            <span>${daysLeft} days left</span><span>${Math.round(progress)}%</span>
          </div>
          <div class="w-full bg-gray-200/30 dark:bg-gray-700/30 rounded-full h-2 mt-1">
            <div class="bg-indigo-500 h-2 rounded-full" style="width:${progress}%"></div>
          </div>
        </div>
      </div>`;
  }).join('');

  // Add form
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
          <option value="monthly">Monthly</option>
          <option value="quarterly">Quarterly</option>
          <option value="yearly">Yearly</option>
        </select>
        <input id="invAdditionalDeposit" type="number" placeholder="Additional Deposit (For RD)" value="0" class="w-full p-2 rounded border dark:border-gray-700 bg-transparent" />
        <button class="w-full py-2 rounded bg-indigo-600 text-white font-semibold">💾 Save</button>
      </form>
    </details>
  `;

  // Modal render
  showSimpleModal(
    '💼 Investments Overview',
    `<div class="max-h-[80vh] overflow-y-auto space-y-3 p-3">
       ${summaryHTML}
       ${chartHTML}
       ${rows || `<div class="text-center text-gray-500 py-4">No investments yet.</div>`}
       ${addForm}
     </div>`
  );

  // === Form ===
  document.getElementById('addInvestmentForm').onsubmit = async (e) => {
    e.preventDefault();
    const id = investmentId.value;
    const data = {
      id: id || uid('inv'),
      name: invName.value.trim(),
      type: invType.value,
      principal: +invPrincipal.value,
      rate: +invRate.value,
      startDate: invStartDate.value,
      tenureMonths: +invTenureMonths.value,
      compounding: invCompounding.value,
      additionalDeposit: +invAdditionalDeposit.value,
      modified: nowISO1(),
      createdAt: id ? undefined : nowISO1(),
    };
    if (!data.name || !data.startDate) return showToast('Fill all fields!', 'error');
    if (id) {
      const inv = state.investments.find(i => i.id === id);
      Object.assign(inv, data);
      await put('investments', inv);
      showToast('Updated!', 'success');
    } else {
      await put('investments', data);
      state.investments.push(data);
      showToast('Added!', 'success');
    }
    autoBackup();
    showInvestmentsModal();
  };

  // === Delete ===
  document.querySelectorAll('.delInv').forEach(btn => btn.onclick = async () => {
    if (!confirm('Delete this investment?')) return;
    await del('investments', btn.dataset.id);
    state.investments = state.investments.filter(i => i.id !== btn.dataset.id);
    autoBackup();
    showToast('Deleted!', 'success');
    showInvestmentsModal();
  });

  // === Edit ===
  document.querySelectorAll('.editInv').forEach(btn => btn.onclick = () => {
    const inv = state.investments.find(i => i.id === btn.dataset.id);
    if (!inv) return;
    Object.entries(inv).forEach(([k, v]) => {
      const el = document.getElementById('inv' + k.charAt(0).toUpperCase() + k.slice(1));
      if (el) el.value = v;
    });
    investmentId.value = inv.id;
    showToast('Editing mode ✏️', 'info');
  });

  // === Chart.js ===
  const ctx = document.getElementById('invChart');
  if (!ctx || !invs.length) return;

  const fd = invs.filter(i => i.type === 'FD').length;
  const rd = invs.filter(i => i.type === 'RD').length;
  const monthly = invs.filter(i => i.compounding === 'monthly').length;
  const quarterly = invs.filter(i => i.compounding === 'quarterly').length;
  const yearly = invs.filter(i => i.compounding === 'yearly').length;

  const centerTextPlugin = {
    id: 'centerText',
    afterDraw(chart) {
      const { ctx, chartArea: { width, height, left, top } } = chart;
      ctx.save();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--glass-text');
      ctx.font = '600 14px Poppins, sans-serif';
      ctx.fillText('Total', left + width / 2, top + height / 2 - 10);
      ctx.font = 'bold 16px Poppins, sans-serif';
      ctx.fillText('₹' + totalPrincipal.toLocaleString(), left + width / 2, top + height / 2 + 10);
      ctx.restore();
    }
  };

  const typeData = { labels: ['FD', 'RD'], datasets: [{ data: [fd, rd], backgroundColor: ['#6366f1', '#10b981'], borderColor: '#fff', borderWidth: 2 }] };
  const compData = { labels: ['Monthly', 'Quarterly', 'Yearly'], datasets: [{ data: [monthly, quarterly, yearly], backgroundColor: ['#f59e0b', '#8b5cf6', '#3b82f6'], borderColor: '#fff', borderWidth: 2 }] };

  const chart = new Chart(ctx, { type: 'doughnut', data: typeData, options: { plugins: { legend: { position: 'bottom', labels: { color: getComputedStyle(document.documentElement).getPropertyValue('--glass-text') } } }, cutout: '65%' }, plugins: [centerTextPlugin] });

  chartTypeBtn.onclick = () => { chart.data = typeData; chart.update(); chartTypeBtn.classList.add('bg-indigo-500','text-white'); chartCompBtn.classList.remove('bg-indigo-500','text-white'); };
  chartCompBtn.onclick = () => { chart.data = compData; chart.update(); chartCompBtn.classList.add('bg-indigo-500','text-white'); chartTypeBtn.classList.remove('bg-indigo-500','text-white'); };
}
