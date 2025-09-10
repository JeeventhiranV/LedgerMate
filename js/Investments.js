function calculateMaturity(inv) {
  const P = inv.principal;
  const r = inv.rate / 100;
  const n = getCompoundingFrequency(inv.compounding);
  const t = inv.tenureMonths / 12;
  const additional = inv.additionalDeposit;

  if (inv.type === 'FD') {
    return P * Math.pow((1 + r / n), n * t);
  } else if (inv.type === 'RD') {
    const ratePerPeriod = r / n;
    const periods = n * t;
    return additional * ((Math.pow(1 + ratePerPeriod, periods) - 1) / ratePerPeriod);
  }
  return 0;
}

function calculateMaturityDate(inv) {
  const start = new Date(inv.startDate);
  start.setMonth(start.getMonth() + inv.tenureMonths);
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

  if (diff < 0) return 0; // hasn't started yet

  const totalMonths = inv.tenureMonths;
  const elapsedMonths = Math.min(totalMonths, Math.floor(diff / 30));

  const P = inv.principal;
  const r = inv.rate / 100;
  const n = getCompoundingFrequency(inv.compounding);
  const t = elapsedMonths / 12;
  const additional = inv.additionalDeposit;

  if (inv.type === 'FD') {
    return P * Math.pow((1 + r / n), n * t) - P;
  } else if (inv.type === 'RD') {
    const ratePerPeriod = r / n;
    const periods = n * t;
    return additional * ((Math.pow(1 + ratePerPeriod, periods) - 1) / ratePerPeriod);
  }
  return 0;
}

function getCompoundingFrequency(freq) {
  switch (freq) {
    case 'monthly': return 12;
    case 'quarterly': return 4;
    case 'yearly': return 1;
    default: return 12;
  }
}

function showInvestmentsModal() {
 const rows = (state.investments || []).map(inv => {
    const maturityAmount = calculateMaturity(inv);
    const maturityDate = calculateMaturityDate(inv);
    const daysLeft = calculateDaysLeft(maturityDate);
    const interestSoFar = calculateInterestSoFar(inv);

    return `
      <div class="glass rounded-xl shadow-md border border-gray-200 p-4 mb-4 hover:shadow-lg transition-shadow duration-200">
        <div class="flex justify-between items-start mb-3">
          <div>
            <h3 class="text-lg font-bold text-indigo-700">${inv.name}</h3>
            <p class="text-sm mt-1">${inv.type} • ₹${inv.principal.toLocaleString()} @ ${inv.rate}%</p>
          </div>
          <div class="flex gap-2">
            <button class="px-3 py-1 bg-yellow-500 text-xs text-muted rounded   editInv" data-id="${inv.id}">
              ✏️ Edit
            </button>
            <button class="px-3 py-1 bg-red-500 rounded   text-xs text-muted delInv" data-id="${inv.id}">
              🗑️ Delete
            </button>
          </div>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm ">
          <div class="flex items-center gap-1"><span>📅</span> <span>Start: ${inv.startDate}</span></div>
          <div class="flex items-center gap-1"><span>⏳</span> <span>Tenure: ${inv.tenureMonths} months</span></div>
          <div class="flex items-center gap-1"><span>🏦</span> <span>Compounding: ${inv.compounding}</span></div>
          <div class="flex items-center gap-1"><span>➕</span> <span>Additional: ₹${inv.additionalDeposit.toLocaleString()}</span></div>
          <div class="flex items-center gap-1"><span>✅</span> <span>Maturity: ${maturityDate}</span></div>
          <div class="flex items-center gap-1"><span>⏳</span> <span>${daysLeft} days left</span></div>
          <div class="flex items-center gap-1"><span>💰</span> <span>Maturity Amt: ₹${Number(maturityAmount).toLocaleString(undefined, {maximumFractionDigits:2})}</span></div>
          <div class="flex items-center gap-1"><span>📈</span> <span>Interest So Far: ₹${Number(interestSoFar).toLocaleString(undefined, {maximumFractionDigits:2})}</span></div>
        </div>
      </div>
    `;
  }).join('');

  const addForm = `
    <form id="addInvestmentForm" class="mt-6 space-y-4   p-4 rounded-xl border  shadow-sm glass">
      <input type="hidden" id="investmentId" />
      <input id="invName" placeholder="Name" class="w-full p-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-300" required />
      <select id="invType" class="w-full p-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-300">
        <option value="FD">Fixed Deposit</option>
        <option value="RD">Recurring Deposit</option>
      </select>
      <input id="invPrincipal" type="number" placeholder="Principal Amount" class="w-full p-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-300" required />
      <input id="invRate" type="number" step="0.01" placeholder="Interest Rate (%)" class="w-full p-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-300" required />
      <input id="invStartDate" type="date" class="w-full p-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-300" required />
      <input id="invTenureMonths" type="number" placeholder="Tenure (Months)" class="w-full p-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-300" required />
      <select id="invCompounding" class="w-full p-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-300">
        <option value="monthly">Monthly</option>
        <option value="quarterly">Quarterly</option>
        <option value="yearly">Yearly</option>
      </select>
      <input id="invAdditionalDeposit" type="number" placeholder="Additional Deposit (For RD)" class="w-full p-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-300" value="0" />
      <button class="w-full py-3 rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-700 transition duration-200" type="submit">
        ➕ Save Investment
      </button>
    </form>
  `;

  showSimpleModal(
    '💼 Investments',
    `<div class="space-y-6 max-h-[80vh] overflow-y-auto p-4">${rows || `<div class="text-center text-gray-500 py-4">No investments yet</div>`}${addForm}</div>`
  );
  // Form submission (Add/Edit logic here)
  document.getElementById('addInvestmentForm').onsubmit = async (e) => {
    e.preventDefault();
    const id = document.getElementById('investmentId').value;
    const name = document.getElementById('invName').value.trim();
    const type = document.getElementById('invType').value;
    const principal = Number(document.getElementById('invPrincipal').value);
    const rate = Number(document.getElementById('invRate').value);
    const startDate = document.getElementById('invStartDate').value;
    const tenureMonths = Number(document.getElementById('invTenureMonths').value);
    const compounding = document.getElementById('invCompounding').value;
    const additionalDeposit = Number(document.getElementById('invAdditionalDeposit').value);

    if (!name || !startDate) {
      showToast('Please fill all required fields!', 'error');
      return;
    }

    if (id) {
      const inv = state.investments.find(i => i.id === id);
      if (inv) {
        inv.name = name;
        inv.type = type;
        inv.principal = principal;
        inv.rate = rate;
        inv.startDate = startDate;
        inv.tenureMonths = tenureMonths;
        inv.compounding = compounding;
        inv.additionalDeposit = additionalDeposit;
        inv.modified=nowISO1();
        await put('investments', inv);
        showToast('Investment updated!', 'success');
      }
    } else {
      const newInv = {
        id: uid('inv'),
        name,
        type,
        principal,
        rate,
        startDate,
        tenureMonths,
        compounding,
        additionalDeposit,
        createdAt: nowISO1()
      };
      await put('investments', newInv);
      state.investments.push(newInv);
      showToast('Investment added!', 'success');
    }

    autoBackup();
    showInvestmentsModal();
  };

  // Delete Investment
  document.querySelectorAll('.delInv').forEach(btn => btn.onclick = async () => {
    const id = btn.dataset.id;
    if (!confirm('Are you sure you want to delete this investment?')) return;
    await del('investments', id);
    state.investments = state.investments.filter(i => i.id !== id);
    showInvestmentsModal();
    autoBackup();
    showToast('Investment deleted!', 'success');
  });

  // Edit Investment
 document.querySelectorAll('.editInv').forEach(btn => btn.onclick = () => {
  const id = btn.dataset.id;
  const inv = state.investments.find(i => i.id === id);
  if (!inv) return;

  const populatedForm = `
    <form id="addInvestmentForm" class="mt-4 space-y-3 bg-gray-50 p-4 rounded-lg border border-gray-200">
      <input type="hidden" id="investmentId" value="${inv.id}" />
      <input id="invName" placeholder="Name" value="${inv.name}" class="w-full p-2 rounded-lg border border-gray-300" required />
      <select id="invType" class="w-full p-2 rounded-lg border border-gray-300">
        <option value="FD" ${inv.type === 'FD' ? 'selected' : ''}>Fixed Deposit</option>
        <option value="RD" ${inv.type === 'RD' ? 'selected' : ''}>Recurring Deposit</option>
      </select>
      <input id="invPrincipal" type="number" value="${inv.principal}" placeholder="Principal Amount" class="w-full p-2 rounded-lg border border-gray-300" required />
      <input id="invRate" type="number" step="0.01" value="${inv.rate}" placeholder="Interest Rate (%)" class="w-full p-2 rounded-lg border border-gray-300" required />
      <input id="invStartDate" type="date" value="${inv.startDate}" class="w-full p-2 rounded-lg border border-gray-300" required />
      <input id="invTenureMonths" type="number" value="${inv.tenureMonths}" placeholder="Tenure (Months)" class="w-full p-2 rounded-lg border border-gray-300" required />
      <select id="invCompounding" class="w-full p-2 rounded-lg border border-gray-300">
        <option value="monthly" ${inv.compounding === 'monthly' ? 'selected' : ''}>Monthly</option>
        <option value="quarterly" ${inv.compounding === 'quarterly' ? 'selected' : ''}>Quarterly</option>
        <option value="yearly" ${inv.compounding === 'yearly' ? 'selected' : ''}>Yearly</option>
      </select>
      <input id="invAdditionalDeposit" type="number" value="${inv.additionalDeposit}" placeholder="Additional Deposit (For RD)" class="w-full p-2 rounded-lg border border-gray-300" />
      <button class="w-full py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition" type="submit">
        ➕ Update Investment
      </button>
    </form>
  `;

  showSimpleModal('✏️ Edit Investment', populatedForm);
});
}