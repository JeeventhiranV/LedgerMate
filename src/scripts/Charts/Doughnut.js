const FINTECH_DOUGHNUT_PALETTE = [
  '#00d4b4', // Teal/Cyan
  '#10b981', // Emerald
  '#6366f1', // Indigo
  '#8b5cf6', // Violet
  '#f43f5e', // Rose
  '#f59e0b', // Amber
  '#3b82f6', // Blue
  '#ec4899', // Pink
  '#14b8a6', // Teal
  '#eab308', // Yellow
  '#06b6d4', // Sky
  '#a855f7'  // Purple
];

function renderDoughnut() {
  const timeFilterEl = document.getElementById("timeFilter");
  const typeFilterEl = document.getElementById("typeFilter");
  const timeFilter = timeFilterEl ? timeFilterEl.value : "thisMonth";
  const typeFilter = typeFilterEl ? typeFilterEl.value : "out";
  const startDateInput = document.getElementById("startDate");
  const endDateInput = document.getElementById("endDate");

  let startDate, endDate;
  const now = new Date();

  if (timeFilter === "thisMonth") {
    startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  } else if (timeFilter === "lastMonth") {
    startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    endDate = new Date(now.getFullYear(), now.getMonth(), 0);
  } else if (timeFilter === "custom") {
    startDate = startDateInput && startDateInput.value ? new Date(startDateInput.value) : null;
    endDate = endDateInput && endDateInput.value ? new Date(endDateInput.value) : null;
  }

  const byCat = {};
  (state.transactions || []).forEach(t => {
    if (!t || !t.date) return;
    const d = new Date(t.date);

    // Time filter
    if (startDate && endDate && (d < startDate || d > endDate)) return;

    // Type filter
    if (typeFilter !== "all" && t.type !== typeFilter) return;

    // Group by category
    const cat = t.category || 'Other';
    byCat[cat] = (byCat[cat] || 0) + Number(t.amount || 0);
  });

  const sortedCats = Object.entries(byCat).sort((a, b) => b[1] - a[1]);
  const labels = sortedCats.map(([cat]) => cat);
  const data = sortedCats.map(([, amt]) => amt);
  const total = data.reduce((a, b) => a + b, 0);

  const canvasEl = document.getElementById("categoryDoughnut");
  if (!canvasEl) return;
  const ctx = canvasEl.getContext("2d");

  function updateCenter(valText, lblText) {
    const vEl = document.getElementById('doughnutCenterVal');
    const lEl = document.getElementById('doughnutCenterLbl');
    if (vEl) {
      vEl.textContent = valText;
      vEl.title = valText;
    }
    if (lEl) {
      lEl.textContent = lblText;
      lEl.title = lblText;
    }
  }

  const defaultLbl = typeFilter === 'in' ? 'Total Income' : typeFilter === 'all' ? 'Total Cashflow' : 'Total Spend';

  if (labels.length === 0) {
    updateCenter('₹0', 'No Data');
    if (doughnutChart instanceof Chart) doughnutChart.destroy();
    doughnutChart = new Chart(ctx, {
      type: "doughnut",
      data: {
        labels: ['No Activity'],
        datasets: [{
          data: [1],
          backgroundColor: ['rgba(255, 255, 255, 0.08)'],
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '72%',
        plugins: {
          legend: { display: false },
          tooltip: { enabled: false }
        }
      }
    });
    return;
  }

  updateCenter(typeof fmtINR === 'function' ? fmtINR(total) : ('₹' + total.toLocaleString('en-IN')), defaultLbl);

  if (doughnutChart instanceof Chart) doughnutChart.destroy();

  const backgroundColors = labels.map((_, i) => FINTECH_DOUGHNUT_PALETTE[i % FINTECH_DOUGHNUT_PALETTE.length]);

  doughnutChart = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels,
      datasets: [
        {
          data,
          backgroundColor: backgroundColors,
          borderWidth: 2,
          borderColor: 'var(--surface-card, #0f172a)'
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '72%',
      plugins: {
        legend: {
          position: "bottom",
          labels: {
            boxWidth: 8,
            padding: 10,
            color: 'rgba(232, 234, 246, 0.75)',
            font: { size: 10.5, family: 'Inter, sans-serif' }
          }
        },
        tooltip: {
          backgroundColor: 'rgba(13, 17, 40, 0.95)',
          titleColor: '#00d4b4',
          bodyColor: '#e8eaf6',
          borderColor: 'rgba(255, 255, 255, 0.1)',
          borderWidth: 1,
          padding: 8,
          cornerRadius: 8,
          callbacks: {
            label: function(context) {
              const val = context.raw || 0;
              const pct = total > 0 ? ((val / total) * 100).toFixed(1) : 0;
              const formatted = typeof fmtINR === 'function' ? fmtINR(val) : ('₹' + val.toLocaleString('en-IN'));
              return ` ${context.label}: ${formatted} (${pct}%)`;
            }
          }
        }
      },
      onHover: (event, activeElements) => {
        if (activeElements && activeElements.length > 0) {
          const idx = activeElements[0].index;
          const cat = labels[idx];
          const val = data[idx];
          const pct = total > 0 ? ((val / total) * 100).toFixed(1) : 0;
          const formatted = typeof fmtINR === 'function' ? fmtINR(val) : ('₹' + val.toLocaleString('en-IN'));
          updateCenter(formatted, `${cat} (${pct}%)`);
        } else {
          updateCenter(typeof fmtINR === 'function' ? fmtINR(total) : ('₹' + total.toLocaleString('en-IN')), defaultLbl);
        }
      }
    }
  });
}

// 🎯 Re-render chart whenever filter changes
document.addEventListener("DOMContentLoaded", () => {
  const tf = document.getElementById("timeFilter");
  if (tf) {
    tf.addEventListener("change", e => {
      const showCustom = e.target.value === "custom";
      const s = document.getElementById("startDate");
      const en = document.getElementById("endDate");
      if (s) s.classList.toggle("hidden", !showCustom);
      if (en) en.classList.toggle("hidden", !showCustom);
      renderDoughnut();
    });
  }

  const ty = document.getElementById("typeFilter");
  if (ty) ty.addEventListener("change", renderDoughnut);

  const sd = document.getElementById("startDate");
  if (sd) sd.addEventListener("change", renderDoughnut);

  const ed = document.getElementById("endDate");
  if (ed) ed.addEventListener("change", renderDoughnut);
});

