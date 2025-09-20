function renderDoughnut() {
  const timeFilter = document.getElementById("timeFilter").value;
  const typeFilter = document.getElementById("typeFilter").value;
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
    startDate = startDateInput.value ? new Date(startDateInput.value) : null;
    endDate = endDateInput.value ? new Date(endDateInput.value) : null;
  }

  const byCat = {};
  state.transactions.forEach(t => {
    const d = new Date(t.date);

    // Time filter
    if (startDate && endDate && (d < startDate || d > endDate)) return;

    // Type filter
    if (typeFilter !== "all" && t.type !== typeFilter) return;

    // Group by category
    byCat[t.category] = (byCat[t.category] || 0) + Number(t.amount);
  });

  const labels = Object.keys(byCat);
  const data = labels.map(l => byCat[l]);
  const ctx = document.getElementById("categoryDoughnut").getContext("2d");

  if (doughnutChart instanceof Chart) doughnutChart.destroy();

  doughnutChart = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels,
      datasets: [
        {
          data,
          backgroundColor: labels.map((_, i) => `hsl(${i * 40 % 360} 70% 50%)`)
        }
      ]
    },
    options: {
      plugins: { legend: { position: "bottom" } }
    }
  });
}

// 🎯 Re-render chart whenever filter changes
document.getElementById("timeFilter").addEventListener("change", e => {
  const showCustom = e.target.value === "custom";
  document.getElementById("startDate").classList.toggle("hidden", !showCustom);
  document.getElementById("endDate").classList.toggle("hidden", !showCustom);
  renderDoughnut();
});
document.getElementById("typeFilter").addEventListener("change", renderDoughnut);
document.getElementById("startDate").addEventListener("change", renderDoughnut);
document.getElementById("endDate").addEventListener("change", renderDoughnut);
