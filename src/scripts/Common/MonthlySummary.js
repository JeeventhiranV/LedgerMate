/* =========================================================
   📆 LedgerMate - Monthly Summary Dashboard (Final Stable)
   ========================================================= */
async function showMonthlySummary(selectedMonth = null, selectedYear = null, compareMode = false) {
  const txs = state.transactions || [];
  const now = new Date();

  const monthNames = [
    'January','February','March','April','May','June',
    'July','August','September','October','November','December'
  ];

  // ✅ Auto select current month/year if not provided
  const month = selectedMonth ?? now.getMonth();
  const year = selectedYear ?? now.getFullYear();

  const compareMonth = month === 0 ? 11 : month - 1;
  const compareYear = month === 0 ? year - 1 : year;

  function getMonthData(m, y) {
    const monthTxs = txs.filter(t => {
      const d = new Date(t.date);
      return d.getMonth() === m && d.getFullYear() === y;
    });

    const totalIncome = monthTxs.filter(t => t.type === 'in').reduce((s, t) => s + Number(t.amount), 0);
    const totalExpense = monthTxs.filter(t => t.type === 'out').reduce((s, t) => s + Number(t.amount), 0);
    const savings = totalIncome - totalExpense;
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const avgDailyExpense = totalExpense ? (totalExpense / daysInMonth).toFixed(2) : 0;

    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    const incomeData = days.map(d => monthTxs.filter(t => t.type === 'in' && new Date(t.date).getDate() === d)
      .reduce((s, t) => s + Number(t.amount), 0));
    const expenseData = days.map(d => monthTxs.filter(t => t.type === 'out' && new Date(t.date).getDate() === d)
      .reduce((s, t) => s + Number(t.amount), 0));

    let cumulative = [];
    let balance = 0;
    for (let i = 0; i < daysInMonth; i++) {
      balance += incomeData[i] - expenseData[i];
      cumulative.push(balance);
    }

    return { month: m, year: y, totalIncome, totalExpense, savings, avgDailyExpense, days, incomeData, expenseData, cumulative };
  }

  const dataA = getMonthData(month, year);
  const dataB = compareMode ? getMonthData(compareMonth, compareYear) : null;

  // --- Dropdown setup ---
  const monthsOptions = monthNames.map((m, i) => `<option value="${i}" ${i === month ? 'selected' : ''}>${m}</option>`).join('');
  const yearsOptions = [year - 1, year, year + 1].map(y => `<option value="${y}" ${y === year ? 'selected' : ''}>${y}</option>`).join('');

  // --- UI controls ---
  const compareToggle = `
    <label class="flex items-center gap-2 text-sm font-medium">
      <input id="compareToggle" type="checkbox" class="accent-indigo-500" ${compareMode ? 'checked' : ''}/>
      Compare with previous month
    </label>
  `;

  const actionButtons = `
    <div class="flex flex-wrap gap-2">
      <button id="exportSummaryPDF" class="px-3 py-1 bg-[var(--btn-blue)] rounded text-white text-sm font-semibold hover:opacity-80">
        📄 Export PDF
      </button>
      <button id="shareWhatsapp" class="px-3 py-1 bg-emerald-500 rounded text-white text-sm font-semibold hover:opacity-80">
        📱 Share WhatsApp
      </button>
    </div>
  `;

  const headerControls = `
    <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-3">
      <div class="flex gap-2">
        <select id="monthSelect" class="p-2 rounded glass text-sm">${monthsOptions}</select>
        <select id="yearSelect" class="p-2 rounded glass text-sm">${yearsOptions}</select>
      </div>
      <div class="flex flex-col md:flex-row md:items-center gap-3">
        ${compareToggle}
        ${actionButtons}
      </div>
    </div>
  `;

  // --- Summary cards ---
  const summaryA = `
    <div class="glass p-3 rounded-xl text-center">
      <h3 class="font-semibold text-indigo-500">${monthNames[dataA.month]} ${dataA.year}</h3>
      <div class="text-xs text-gray-500 mb-2">Current Month Overview</div>
      <div class="text-sm text-gray-500">💰 Income:</div>
      <div class="font-semibold text-emerald-500 text-lg">₹${dataA.totalIncome.toLocaleString()}</div>
      <div class="text-sm text-gray-500">💸 Expense:</div>
      <div class="font-semibold text-rose-500 text-lg">₹${dataA.totalExpense.toLocaleString()}</div>
      <div class="text-sm text-gray-500">💼 Savings:</div>
      <div class="font-semibold ${dataA.savings >= 0 ? 'text-indigo-500' : 'text-rose-500'} text-lg">₹${dataA.savings.toLocaleString()}</div>
      <div class="text-sm text-gray-500">📅 Avg Daily Expense:</div>
      <div class="font-semibold text-amber-500 text-md">₹${dataA.avgDailyExpense}</div>
    </div>
  `;

  const summaryB = compareMode && dataB ? `
    <div class="glass p-3 rounded-xl text-center">
      <h3 class="font-semibold text-indigo-500">${monthNames[dataB.month]} ${dataB.year}</h3>
      <div class="text-xs text-gray-500 mb-2">Previous Month Overview</div>
      <div class="text-sm text-gray-500">💰 Income:</div>
      <div class="font-semibold text-emerald-500 text-lg">₹${dataB.totalIncome.toLocaleString()}</div>
      <div class="text-sm text-gray-500">💸 Expense:</div>
      <div class="font-semibold text-rose-500 text-lg">₹${dataB.totalExpense.toLocaleString()}</div>
      <div class="text-sm text-gray-500">💼 Savings:</div>
      <div class="font-semibold ${dataB.savings >= 0 ? 'text-indigo-500' : 'text-rose-500'} text-lg">₹${dataB.savings.toLocaleString()}</div>
      <div class="text-sm text-gray-500">📅 Avg Daily Expense:</div>
      <div class="font-semibold text-amber-500 text-md">₹${dataB.avgDailyExpense}</div>
    </div>
  ` : '';

  const chartHTML = `
    <div class="glass p-4 rounded-xl mt-3">
      <h3 class="text-sm font-semibold text-indigo-500 mb-2">
        📈 ${compareMode ? 'Comparison of Income, Expense & Savings Trend' : 'Income vs Expense + Cumulative Savings'}
      </h3>
      <canvas id="monthlySummaryChart" height="150"></canvas>
    </div>
  `;

  const compareText = compareMode && dataB ? `
    <div class="text-sm mt-3 p-3 rounded glass text-center">
      💡 You saved <span class="font-semibold text-indigo-500">₹${(dataA.savings - dataB.savings).toLocaleString()}</span> 
      ${dataA.savings >= dataB.savings ? 'more' : 'less'} than last month.
    </div>
  ` : '';

  showSimpleModal(
    '📆 Monthly Summary',
    `<div class="max-h-[80vh] overflow-y-auto space-y-3 p-3">
      ${headerControls}
      <div class="grid grid-cols-1 md:grid-cols-${compareMode ? '2' : '1'} gap-3">${summaryA}${summaryB}</div>
      ${chartHTML}
      ${compareText}
    </div>`
  );

  // --- Chart.js ---
  setTimeout(() => {
    const ctx = document.getElementById('monthlySummaryChart');
    if (!ctx) return;

    const datasets = [
      {
        label: `${monthNames[dataA.month]} Income`,
        data: dataA.incomeData,
        backgroundColor: 'rgba(16,185,129,0.4)',
        borderColor: '#10b981',
      },
      {
        label: `${monthNames[dataA.month]} Expense`,
        data: dataA.expenseData,
        backgroundColor: 'rgba(239,68,68,0.4)',
        borderColor: '#ef4444',
      },
      {
        type: 'line',
        label: 'Cumulative Savings',
        data: dataA.cumulative,
        borderColor: '#6366f1',
        borderWidth: 2,
        tension: 0.3,
        pointRadius: 0
      }
    ];

    if (compareMode && dataB) {
      datasets.push({
        type: 'line',
        label: `${monthNames[dataB.month]} Savings Trend`,
        data: dataB.cumulative,
        borderColor: '#f59e0b',
        borderWidth: 2,
        tension: 0.3,
        borderDash: [4, 2],
        pointRadius: 0
      });
    }

    new Chart(ctx, {
      type: 'bar',
      data: { labels: dataA.days, datasets },
      options: { responsive: true, plugins: { legend: { position: 'bottom' } }, scales: { y: { beginAtZero: true } } }
    });
  }, 200);

  // --- Interactions ---
  setTimeout(() => {
    const mSel = document.getElementById('monthSelect');
    const ySel = document.getElementById('yearSelect');
    const cmp = document.getElementById('compareToggle');

    if (mSel && ySel && cmp) {
      mSel.value = month;
      ySel.value = year;

      mSel.onchange = () => showMonthlySummary(Number(mSel.value), Number(ySel.value), cmp.checked);
      ySel.onchange = () => showMonthlySummary(Number(mSel.value), Number(ySel.value), cmp.checked);
      cmp.onchange = () => showMonthlySummary(Number(mSel.value), Number(ySel.value), cmp.checked);
    }

    // --- Executive Bank-Grade PDF Export ---
    const expBtn = document.getElementById('exportSummaryPDF');
    if (expBtn) {
      expBtn.onclick = () => {
        if (!window.jspdf || !window.jspdf.jsPDF) {
          showToast('PDF generator is initializing, please try in 1 second...', 'info');
          return;
        }
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({ unit: 'mm', format: 'a4' });

        // Primary Colors
        const primaryColor = [16, 185, 129]; // Emerald
        const darkBg = [15, 23, 42]; // Slate 900
        const textMuted = [100, 116, 139];

        // 1. Header Banner
        doc.setFillColor(darkBg[0], darkBg[1], darkBg[2]);
        doc.rect(0, 0, 210, 38, 'F');

        doc.setTextColor(255, 255, 255);
        doc.setFontSize(20);
        doc.setFont('helvetica', 'bold');
        doc.text('LedgerMate Executive Financial Statement', 14, 18);

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.text(`AUDIT PERIOD: ${monthNames[month].toUpperCase()} ${year}  |  CONFIDENTIAL`, 14, 26);

        doc.setTextColor(200, 200, 200);
        doc.text(`Generated on: ${new Date().toLocaleDateString('en-IN')}`, 140, 26);

        // 2. Executive Key Metrics Cards
        doc.setDrawColor(220, 226, 235);
        doc.setFillColor(248, 250, 252);
        
        // Income Box
        doc.roundedRect(14, 46, 56, 26, 2, 2, 'FD');
        doc.setFontSize(8);
        doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
        doc.text('TOTAL CASH INFLOW', 18, 54);
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(16, 185, 129);
        doc.text(`Rs. ${dataA.totalIncome.toLocaleString('en-IN')}`, 18, 65);

        // Expense Box
        doc.roundedRect(77, 46, 56, 26, 2, 2, 'FD');
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
        doc.text('TOTAL CASH OUTFLOW', 81, 54);
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(239, 68, 68);
        doc.text(`Rs. ${dataA.totalExpense.toLocaleString('en-IN')}`, 81, 65);

        // Net Savings Box
        doc.roundedRect(140, 46, 56, 26, 2, 2, 'FD');
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
        doc.text('NET CAPITAL SAVINGS', 144, 54);
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(dataA.savings >= 0 ? 59 : 239, dataA.savings >= 0 ? 130 : 68, dataA.savings >= 0 ? 246 : 68);
        doc.text(`Rs. ${dataA.savings.toLocaleString('en-IN')}`, 144, 65);

        // 3. Financial Performance Summary
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(darkBg[0], darkBg[1], darkBg[2]);
        doc.text('Monthly Financial Breakdown & KPIs', 14, 86);

        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(60, 60, 60);

        const savingsRate = dataA.totalIncome > 0 ? ((dataA.savings / dataA.totalIncome) * 100).toFixed(1) : 0;
        doc.text(`• Average Daily Expenditure: Rs. ${dataA.avgDailyExpense}`, 14, 94);
        doc.text(`• Net Savings Rate: ${savingsRate}% of gross income retained`, 14, 102);

        if (compareMode && dataB) {
          const delta = dataA.savings - dataB.savings;
          const deltaPct = dataB.savings !== 0 ? ((delta / Math.abs(dataB.savings)) * 100).toFixed(1) : 0;
          doc.text(`• Month-on-Month Comparison (${monthNames[dataB.month]} ${dataB.year}): ${delta >= 0 ? '+Rs. ' : '-Rs. '}${Math.abs(delta).toLocaleString('en-IN')} (${delta >= 0 ? '+' : ''}${deltaPct}%)`, 14, 110);
        }

        // 4. Top 5 Category Spending Audit
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(darkBg[0], darkBg[1], darkBg[2]);
        doc.text('Top Expenditure Categories', 14, 126);

        const monthTxs = (state.transactions || []).filter(t => {
          const d = new Date(t.date);
          return d.getMonth() === month && d.getFullYear() === year && t.type === 'out';
        });

        const catTotals = {};
        monthTxs.forEach(t => {
          const cat = t.category || 'Uncategorized';
          catTotals[cat] = (catTotals[cat] || 0) + Number(t.amount);
        });

        const sortedCats = Object.entries(catTotals).sort((a, b) => b[1] - a[1]).slice(0, 5);

        let yPos = 136;
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');

        if (sortedCats.length === 0) {
          doc.text('No recorded expenses for this statement period.', 14, yPos);
        } else {
          sortedCats.forEach(([cat, amt], idx) => {
            const pct = dataA.totalExpense > 0 ? ((amt / dataA.totalExpense) * 100).toFixed(1) : 0;
            doc.text(`${idx + 1}. ${cat}`, 16, yPos);
            doc.text(`Rs. ${amt.toLocaleString('en-IN')} (${pct}%)`, 130, yPos);
            yPos += 8;
          });
        }

        // 5. Footer & Authenticity Seal
        doc.setDrawColor(220, 226, 235);
        doc.line(14, 270, 196, 270);
        doc.setFontSize(8);
        doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
        doc.text('LedgerMate Personal Finance Vault · Zero-Knowledge Client Side Report', 14, 278);
        doc.text('Page 1 of 1', 178, 278);

        doc.save(`LedgerMate_Executive_Statement_${monthNames[month]}_${year}.pdf`);
        if (typeof showToast === 'function') showToast('📄 Executive Statement PDF generated successfully!', 'success');
      };
    }

    // --- WhatsApp Share ---
    const waBtn = document.getElementById('shareWhatsapp');
    if (waBtn) {
      waBtn.onclick = () => {
        let msg = `📊 *LedgerMate Summary*  
(${monthNames[month]} ${year})  
  
💰 *Income:* ₹${dataA.totalIncome.toLocaleString()}  
💸 *Expense:* ₹${dataA.totalExpense.toLocaleString()}  
💼 *Savings:* ₹${dataA.savings.toLocaleString()}  
📅 *Avg Daily:* ₹${dataA.avgDailyExpense}`;

        if (compareMode && dataB) {
          const diff = dataA.savings - dataB.savings;
          msg += `

⚖️ *Compared with ${monthNames[dataB.month]} ${dataB.year}:*  
💼 Savings: ₹${dataB.savings.toLocaleString()}  
${diff >= 0 ? '📈' : '📉'} You saved ₹${Math.abs(diff).toLocaleString()} ${diff >= 0 ? 'more' : 'less'} than last month.`;
        }

        msg += `

🧾 _Generated by LedgerMate_`;
        const encoded = encodeURIComponent(msg);
        window.open(`https://wa.me/?text=${encoded}`, '_blank');
      };
    }
  }, 400);
}
function openMonthlySummary() {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  showMonthlySummary(currentMonth, currentYear, false);
}
document.getElementById('openMonthlySummary').onclick = openMonthlySummary;