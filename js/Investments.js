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

/* FD maturity:
   P * (1 + r/n)^(n*t)
   RD maturity:
   deposit * [((1+rp)^periods -1)/rp] * (1+rp)
   SIP maturity:
   monthly installment * [((1+i)^n -1)/i] * (1+i)
   STOCK maturity/current value:
   qty * currentPrice
*/
function calculateMaturity(inv) {
  const P = toNum(inv.principal);
  const r = toNum(inv.rate) / 100;
  const t = toNum(inv.tenureMonths) / 12;
  const add = toNum(inv.additionalDeposit);

  if (!inv || !inv.type) return 0;

  if (inv.type === 'FD') {
    const n = getCompoundingFrequency(inv.compounding || 'quarterly');
    const mat = P * Math.pow(1 + r / n, n * t);
    return Number(mat.toFixed(2));
  }

  if (inv.type === 'RD') {
    const n = 12;
    if (add <= 0) return 0;
    const rp = r / n;
    const periods = n * t;
    if (periods <= 0) return 0;
    const mat = add * ((Math.pow(1 + rp, periods) - 1) / rp) * (1 + rp);
    return Number(mat.toFixed(2));
  }

  if (inv.type === 'SIP') {
    const sip = toNum(inv.sipMonthly);
    const months = Math.max(0, Math.floor(toNum(inv.tenureMonths)));
    const i = toNum(inv.sipReturn) / 100 / 12;
    if (sip <= 0 || months <= 0) return 0;
    // FV = A * [((1+i)^n - 1)/i] * (1+i)
    const fv = sip * ((Math.pow(1 + i, months) - 1) / i) * (1 + i);
    return Number(fv.toFixed(2));
  }

  if (inv.type === 'STOCK') {
    // use current price if available else fallback to buy price * qty
    const qty = toNum(inv.stockQty);
    const cur = toNum(inv.stockCurrentPrice);
    const buy = toNum(inv.stockBuyPrice);
    const price = cur > 0 ? cur : buy;
    const val = qty * price;
    return Number(val.toFixed(2));
  }

  return 0;
}

function calculateMaturityDate(inv) {
  if (!inv || !inv.startDate || !inv.tenureMonths) return '';
  const start = new Date(inv.startDate);
  start.setMonth(start.getMonth() + toNum(inv.tenureMonths));
  return start.toISOString().split('T')[0];
}

function calculateDaysLeft(maturityDate) {
  if (!maturityDate) return 0;
  const today = new Date();
  const mat = new Date(maturityDate);
  const diffDays = Math.floor((mat - today) / (1000 * 60 * 60 * 24));
  return diffDays >= 0 ? diffDays : 0;
}

/* Interest / profit so far:
   FD -> value at elapsed time - principal
   RD -> maturity value of deposits made so far
   SIP -> value of SIP contributions so far - invested so far
   STOCK -> current value - invested
*/
function calculateInterestSoFar(inv) {
  if (!inv || !inv.startDate) return 0;
  const start = new Date(inv.startDate);
  const today = new Date();
  if (isNaN(start.getTime())) return 0;

  const diffMs = today - start;
  if (diffMs <= 0) return 0;

  // approximate elapsed months (use 30-day month approximation)
  const elapsedMonths = Math.min(toNum(inv.tenureMonths), Math.floor(diffMs / (1000 * 60 * 60 * 24 * 30)));
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
    const n = 12;
    const rp = r / n;
    if (add <= 0) return 0;
    const valElapsed = add * ((Math.pow(1 + rp, elapsedMonths) - 1) / rp) * (1 + rp);
    return Number(valElapsed.toFixed(2));
  }

  if (inv.type === 'SIP') {
    const sip = toNum(inv.sipMonthly);
    const ret = toNum(inv.sipReturn) / 100;
    if (sip <= 0 || elapsedMonths <= 0) return 0;
    const i = ret / 12;
    const fvElapsed = sip * ((Math.pow(1 + i, elapsedMonths) - 1) / i) * (1 + i);
    const invested = sip * elapsedMonths;
    return Number((fvElapsed - invested).toFixed(2));
  }

  if (inv.type === 'STOCK') {
    const qty = toNum(inv.stockQty);
    const cur = toNum(inv.stockCurrentPrice);
    const buy = toNum(inv.stockBuyPrice);
    const curVal = qty * (cur || buy);
    const invested = qty * buy;
    return Number((curVal - invested).toFixed(2));
  }

  return 0;
}

/* Projection data generator (per-month series) */
function getProjectionData(inv) {
  const months = Math.max(0, Math.floor(toNum(inv.tenureMonths)));
  const out = [];

  if (!inv || months <= 0) return out;

  if (inv.type === 'FD') {
    const P = toNum(inv.principal);
    const r = toNum(inv.rate) / 100;
    const n = getCompoundingFrequency(inv.compounding || 'quarterly');
    for (let m = 1; m <= months; m++) {
      const t = m / 12;
      out.push(Number((P * Math.pow(1 + r / n, n * t)).toFixed(2)));
    }
  } else if (inv.type === 'RD') {
    const add = toNum(inv.additionalDeposit);
    const r = toNum(inv.rate) / 100;
    if (add <= 0) return out;
    const n = 12;
    const rp = r / n;
    for (let m = 1; m <= months; m++) {
      const val = add * ((Math.pow(1 + rp, m) - 1) / rp) * (1 + rp);
      out.push(Number(val.toFixed(2)));
    }
  } else if (inv.type === 'SIP') {
    const sip = toNum(inv.sipMonthly);
    const r = toNum(inv.sipReturn) / 100;
    if (sip <= 0) return out;
    const i = r / 12;
    for (let m = 1; m <= months; m++) {
      const fv = sip * ((Math.pow(1 + i, m) - 1) / i) * (1 + i);
      out.push(Number(fv.toFixed(2)));
    }
  } else if (inv.type === 'STOCK') {
    // For stocks simple projection: running invested vs current value (we'll push cumulative current value)
    const qty = toNum(inv.stockQty);
    const buy = toNum(inv.stockBuyPrice);
    const cur = toNum(inv.stockCurrentPrice) || buy;
    // create an array with flat value = qty * cur for each month (or linear purchase assumptions could be added)
    for (let m = 1; m <= months; m++) {
      out.push(Number((qty * cur).toFixed(2)));
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
  let totalPrincipal = 0;
  let totalMaturity = 0;
  let totalInterest = 0;

  invs.forEach(i => {
    // principal/ invested interpretation:
    if (i.type === 'FD') totalPrincipal += toNum(i.principal);
    else if (i.type === 'RD') totalPrincipal += toNum(i.additionalDeposit) * toNum(i.tenureMonths);
    else if (i.type === 'SIP') totalPrincipal += toNum(i.sipMonthly) * toNum(i.tenureMonths);
    else if (i.type === 'STOCK') totalPrincipal += toNum(i.stockQty) * toNum(i.stockBuyPrice);

    const mat = calculateMaturity(i);
    const interest = calculateInterestSoFar(i);

    totalMaturity += mat;
    totalInterest += interest;
  });

  const avgROI = totalPrincipal > 0 ? (((totalMaturity - totalPrincipal) / totalPrincipal) * 100).toFixed(2) : '0.00';

  // summary HTML
  const summaryHTML = `
    <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3 text-center">
      <div class="glass p-3 rounded-xl">
        <p class="text-xs text-gray-500">Total Invested</p>
        <h2 class="text-lg font-semibold">₹${totalPrincipal.toLocaleString()}</h2>
      </div>
      <div class="glass p-3 rounded-xl">
        <p class="text-xs text-gray-500">Maturity Value</p>
        <h2 class="text-lg font-semibold text-emerald-500">₹${totalMaturity.toLocaleString(undefined, { maximumFractionDigits: 2 })}</h2>
      </div>
      <div class="glass p-3 rounded-xl">
        <p class="text-xs text-gray-500">Profit / Interest So Far</p>
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

  // date formatter helper
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

    // progress: based on months elapsed vs tenure
    let progress = 0;
    if (inv.tenureMonths) {
      const start = new Date(inv.startDate);
      const today = new Date();
      if (!isNaN(start.getTime())) {
        const elapsedMonths = Math.floor((today - start) / (1000 * 60 * 60 * 24 * 30));
        progress = Math.min(100, Math.max(0, Math.round((elapsedMonths / inv.tenureMonths) * 100)));
      }
    }

    const chartId = `chart_${inv.id}`;

    // secondary info per type
    let typeInfo = '';
    if (inv.type === 'FD') {
      typeInfo = `${inv.type} • ₹${toNum(inv.principal).toLocaleString()} @ ${toNum(inv.rate)}% • ${inv.compounding || 'quarterly'}`;
    } else if (inv.type === 'RD') {
      typeInfo = `${inv.type} • ₹${toNum(inv.additionalDeposit).toLocaleString()}/mo @ ${toNum(inv.rate)}%`;
    } else if (inv.type === 'SIP') {
      typeInfo = `SIP • ₹${toNum(inv.sipMonthly).toLocaleString()}/mo • ExpRet: ${toNum(inv.sipReturn)}%`;
    } else if (inv.type === 'STOCK') {
      typeInfo = `Stock • Qty: ${toNum(inv.stockQty)} • Buy: ₹${toNum(inv.stockBuyPrice).toLocaleString()} • Cur: ₹${toNum(inv.stockCurrentPrice).toLocaleString() || '-'}`;
    }

    return `
      <div class="glass p-4 rounded-xl mb-3 transition-all duration-300 hover:scale-[1.01]" data-inv-id="${inv.id}">
        <div class="flex justify-between items-start mb-1">
          <div>
            <h3 class="text-sm font-semibold flex items-center gap-2">${inv.name || 'Untitled'}</h3>
            <p class="text-xs text-gray-500 mt-0.5">${typeInfo}</p>
          </div>
          <div class="flex gap-1">
            <button class="editInv px-2 py-1 bg-yellow-400/70 text-xs rounded" data-id="${inv.id}">✏️</button>
            <button class="delInv px-2 py-1 bg-red-500/70 text-xs text-white rounded" data-id="${inv.id}">🗑️</button>
          </div>
        </div>

        <div class="text-xs grid grid-cols-2 gap-y-1 mt-2">
          <span>📅 ${inv.startDate || '-'}</span><span>⏳ ${inv.tenureMonths || 0} mo</span>
          <span>💰 Maturity: ₹${maturity.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
          <span>📈 Profit: ₹${interest.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
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

  // add form (extended with SIP and STOCK fields)
  const addForm = `
    <details class="glass rounded-xl">
      <summary class="px-3 py-2 font-semibold text-indigo-500 cursor-pointer">➕ Add / Edit Investment</summary>
      <form id="addInvestmentForm" class="p-3 space-y-2 text-sm">
        <input type="hidden" id="investmentId" />
        <input id="invName" placeholder="Name" class="w-full p-2 rounded border dark:border-gray-700 bg-transparent" required />
        <select id="invType" class="w-full p-2 rounded border dark:border-gray-700 bg-transparent">
          <option value="FD">Fixed Deposit</option>
          <option value="RD">Recurring Deposit</option>
          <option value="SIP">SIP (Mutual Fund)</option>
          <option value="STOCK">Stock</option>
        </select>

        <!-- Common for FD / FD-like -->
        <input id="invPrincipal" type="number" placeholder="Principal (FD)" class="w-full p-2 rounded border dark:border-gray-700 bg-transparent" />
        <input id="invRate" type="number" step="0.01" placeholder="Rate (%)" class="w-full p-2 rounded border dark:border-gray-700 bg-transparent" />
        <input id="invStartDate" type="date" class="w-full p-2 rounded border dark:border-gray-700 bg-transparent" required />
        <input id="invTenureMonths" type="number" placeholder="Tenure (Months)" class="w-full p-2 rounded border dark:border-gray-700 bg-transparent" required />
        <select id="invCompounding" class="w-full p-2 rounded border dark:border-gray-700 bg-transparent">
          <option value="quarterly">Quarterly (Default)</option>
          <option value="monthly">Monthly</option>
          <option value="yearly">Yearly</option>
        </select>

        <!-- RD -->
        <input id="invAdditionalDeposit" type="number" placeholder="Additional Deposit (For RD)" value="0" class="w-full p-2 rounded border dark:border-gray-700 bg-transparent" />

        <!-- SIP specific -->
        <input id="sipMonthly" type="number" placeholder="Monthly SIP Amount" class="w-full p-2 rounded border dark:border-gray-700 bg-transparent hidden" />
        <input id="sipReturn" type="number" step="0.01" placeholder="Expected Return (%)" class="w-full p-2 rounded border dark:border-gray-700 bg-transparent hidden" />

        <!-- Stock specific -->
        <input id="stockQty" type="number" placeholder="Stock Quantity" class="w-full p-2 rounded border dark:border-gray-700 bg-transparent hidden" />
        <input id="stockBuyPrice" type="number" step="0.01" placeholder="Buy Price" class="w-full p-2 rounded border dark:border-gray-700 bg-transparent hidden" />
        <input id="stockCurrentPrice" type="number" step="0.01" placeholder="Current Market Price (for valuation)" class="w-full p-2 rounded border dark:border-gray-700 bg-transparent hidden" />

        <div class="flex gap-2">
          <button type="submit" class="flex-1 py-2 rounded bg-indigo-600 text-white font-semibold">💾 Save</button>
          <button type="button" id="clearInvForm" class="flex-1 py-2 rounded border border-gray-300">Clear</button>
        </div>
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
  function $id(id) { return document.getElementById(id); }

  // Setup type-driven field show/hide
  function updateFormVisibility() {
    const type = $id('invType')?.value;
    // hide all special fields first
    ['invPrincipal','invRate','invCompounding','invAdditionalDeposit','sipMonthly','sipReturn','stockQty','stockBuyPrice','stockCurrentPrice'].forEach(id => {
      const el = $id(id);
      if (!el) return;
      el.classList.add('hidden');
      // For principal/rate/compounding we still want to show for FD and SIP to allow rate field
    });

    // Show fields selectively
    if (type === 'FD') {
      $id('invPrincipal')?.classList.remove('hidden');
      $id('invRate')?.classList.remove('hidden');
      $id('invCompounding')?.classList.remove('hidden');
    } else if (type === 'RD') {
      $id('invRate')?.classList.remove('hidden');
      $id('invAdditionalDeposit')?.classList.remove('hidden');
      $id('invCompounding')?.classList.remove('hidden');
    } else if (type === 'SIP') {
      $id('sipMonthly')?.classList.remove('hidden');
      $id('sipReturn')?.classList.remove('hidden');
      $id('invCompounding')?.classList.remove('hidden'); // compounding kept visible maybe
    } else if (type === 'STOCK') {
      $id('stockQty')?.classList.remove('hidden');
      $id('stockBuyPrice')?.classList.remove('hidden');
      $id('stockCurrentPrice')?.classList.remove('hidden');
    }
  }

  const invTypeEl = $id('invType');
  if (invTypeEl) {
    invTypeEl.onchange = updateFormVisibility;
    // initialize
    setTimeout(updateFormVisibility, 40);
  }

  // Clear form
  $id('clearInvForm')?.addEventListener('click', () => {
    ['investmentId','invName','invType','invPrincipal','invRate','invStartDate','invTenureMonths','invCompounding','invAdditionalDeposit','sipMonthly','sipReturn','stockQty','stockBuyPrice','stockCurrentPrice'].forEach(id => {
      const el = $id(id);
      if (!el) return;
      if (el.tagName === 'SELECT') el.selectedIndex = 0;
      else el.value = '';
    });
    setTimeout(updateFormVisibility, 40);
  });

  // form submit
  const addFormEl = $id('addInvestmentForm');
  if (addFormEl) {
    addFormEl.onsubmit = async (e) => {
      e.preventDefault();
      const invIdEl = $id('investmentId');
      const id = invIdEl ? invIdEl.value : '';
      const type = $id('invType')?.value || 'FD';

      const data = {
        id: id || uid('inv'),
        name: ($id('invName')?.value || '').trim(),
        type,
        principal: toNum($id('invPrincipal')?.value),
        rate: toNum($id('invRate')?.value),
        startDate: $id('invStartDate')?.value,
        tenureMonths: Math.max(0, Math.floor(toNum($id('invTenureMonths')?.value))),
        compounding: $id('invCompounding')?.value || 'quarterly',
        additionalDeposit: toNum($id('invAdditionalDeposit')?.value),
        // SIP
        sipMonthly: toNum($id('sipMonthly')?.value),
        sipReturn: toNum($id('sipReturn')?.value),
        // STOCK
        stockQty: toNum($id('stockQty')?.value),
        stockBuyPrice: toNum($id('stockBuyPrice')?.value),
        stockCurrentPrice: toNum($id('stockCurrentPrice')?.value),
        modified: nowISO1(),
      };

      if (!id) data.createdAt = nowISO1();

      // Basic validation per type
      if (!data.name) { showToast('Please provide a name', 'error'); return; }
      if (!data.startDate) { showToast('Please provide a start date', 'error'); return; }
      if (!data.tenureMonths || data.tenureMonths <= 0) { showToast('Please provide tenure in months', 'error'); return; }

      // Per-type required checks
      if (type === 'FD' && data.principal <= 0) { showToast('FD principal is required', 'error'); return; }
      if (type === 'RD' && data.additionalDeposit <= 0) { showToast('RD monthly deposit is required', 'error'); return; }
      if (type === 'SIP' && data.sipMonthly <= 0) { showToast('SIP monthly amount is required', 'error'); return; }
      if (type === 'STOCK' && (data.stockQty <= 0 || data.stockBuyPrice <= 0)) { showToast('Stock quantity and buy price required', 'error'); return; }

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

  // delete & edit handlers (delegated after render)
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
        $id('sipMonthly').value = toNum(inv.sipMonthly) || '';
        $id('sipReturn').value = toNum(inv.sipReturn) || '';
        $id('stockQty').value = toNum(inv.stockQty) || '';
        $id('stockBuyPrice').value = toNum(inv.stockBuyPrice) || '';
        $id('stockCurrentPrice').value = toNum(inv.stockCurrentPrice) || '';

        // open details and show proper fields
        const details = $id('addInvestmentForm')?.closest('details');
        if (details && typeof details.open !== 'undefined') details.open = true;
        setTimeout(updateFormVisibility, 40);
        showToast('Editing investment — make changes and Save', 'info');
        $id('addInvestmentForm')?.scrollIntoView({ behavior: 'smooth' });
      };
    });
  }, 80);

  /* -------------------------
     Main Doughnut Chart (includes SIP & STOCK)
     ------------------------- */
  const ctx = $id('invChart');
  if (!ctx) return;

  const fdCount = invs.filter(i => i.type === 'FD').length;
  const rdCount = invs.filter(i => i.type === 'RD').length;
  const sipCount = invs.filter(i => i.type === 'SIP').length;
  const stockCount = invs.filter(i => i.type === 'STOCK').length;

  // compounding distribution
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

  const typeData = {
    labels: ['FD', 'RD', 'SIP', 'STOCK'],
    datasets: [{ data: [fdCount, rdCount, sipCount, stockCount], backgroundColor: ['#6366f1', '#10b981', '#f59e0b', '#ef4444'], borderColor: '#fff', borderWidth: 2 }]
  };
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
     Per-card Growth Toggle + Chart (SIP/FD/RD/Stock)
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
          section.style.maxHeight = '200px';
          btn.textContent = '📉 Hide Growth';

          if (!canvas.dataset.chartDone) {
            const inv = state.investments.find(i => i.id === id);
            if (!inv) return;
            const proj = getProjectionData(inv);
            if (!proj || proj.length < 1) {
              // show simple single-value for STOCK (if no projection)
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
