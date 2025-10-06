// ❌ Remove or rename this — don't override global fetch()
async function proxyFetchHTML() {
  const response = await fetch("https://www.goodreturns.in/gold-rates/chennai.html");
  return new Response(await response.text(), {
    headers: { "Access-Control-Allow-Origin": "*" }
  });
}
async function showGoldRates() {
  try {
    const res = await fetch("https://www.goodreturns.in/gold-rates/chennai.html");
    const html = await res.text();

    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");

    function extractSection(title) {
      const section = Array.from(doc.querySelectorAll("section.section-sec4"))
        .find(sec => sec.querySelector("h2")?.textContent.includes(title));
      if (!section) return null;

      const row = section.querySelector("tbody tr");
      return {
        today: row?.querySelector("td:nth-child(2)")?.textContent.trim() || "N/A",
        yesterday: row?.querySelector("td:nth-child(3)")?.textContent.trim() || "N/A",
        change: row?.querySelector("td:nth-child(4)")?.textContent.trim() || "N/A",
      };
    }

    const gold24 = extractSection("24 Carat");
    const gold22 = extractSection("22 Carat");
    const gold18 = extractSection("18 Carat");

    function updateHistory(key, today) {
      let history = JSON.parse(localStorage.getItem(key) || "[]");
      const todayDate = new Date().toLocaleDateString();
      if (!history.some(e => e.date === todayDate)) {
        history.push({ date: todayDate, rate: today });
      }
      if (history.length > 3) history = history.slice(history.length - 3);
      localStorage.setItem(key, JSON.stringify(history));
      return history;
    }

    const history24 = updateHistory("gold24", gold24.today);
    const history22 = updateHistory("gold22", gold22.today);
    const history18 = updateHistory("gold18", gold18.today);

    const box = document.getElementById("goldBox");
    box.innerHTML = "";

    const cards = [
      { title: "24K Gold", data: gold24, history: history24 },
      { title: "22K Gold", data: gold22, history: history22 },
      { title: "18K Gold", data: gold18, history: history18 },
    ];

    // 🔽 Entire section collapsible
    const container = document.createElement("div");
    container.className = "glass rounded-xl overflow-hidden  shadow";

    container.innerHTML = `
      <button id="goldToggle" class="w-full flex justify-between items-center p-4 focus:outline-none hover:bg-white/10 transition-all">
        <h2 class="text-lg font-semibold flex items-center gap-2">
          📈 Today’s Gold Rates
        </h2>
        <span id="goldArrow" class="transform transition-transform">▼</span>
      </button>
      <div id="goldContent" class="hidden px-4 pb-4 pt-2 space-y-4"></div>
    `;

    const content = container.querySelector("#goldContent");

    // Create gold cards inside collapsible section
    const grid = document.createElement("div");
    grid.className = "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4";

    cards.forEach(card => {
      const todayNum = parseFloat(card.data.today.replace(/[^0-9.]/g, ""));
      const eightGram = todayNum * 8;
      const withGST = eightGram * 1.03;

      const historyHTML = card.history
        .map(h => `<div class="flex justify-between text-xs"style="background: var(--glass-bg); border-color: var(--glass-border);"><span>${h.date}</span><span>${h.rate}</span></div>`)
        .join("");

      const div = document.createElement("div");
      div.className = "glass p-4 rounded-lg hover:shadow-md transition-all";

      div.innerHTML = `
        <h3 class="text-base font-semibold mb-2">${card.title}</h3>
        <div class="text-xs text-green-500">Today: <span class="font-bold">${card.data.today}</span></div>
        <div class="text-xs text-red-500">Yesterday: <span>${card.data.yesterday}</span></div>
        <div class="text-xs text-blue-500">Change: <span>${card.data.change}</span></div>

        <div class="border-t border-white/10 dark:border-white/5 my-2"></div>

        <div class="text-xs flex justify-between"><span>💰 8g Base Price:</span><span>₹${eightGram.toFixed(2)}</span></div>
        <div class="text-xs flex justify-between font-semibold"><span>💸 8g + 3% GST:</span><span class="text-green-600 dark:text-green-400">₹${withGST.toFixed(2)}</span></div>

        <div class="bg-white/10 dark:bg-black/20 rounded-md p-2 mt-3">
          <h4 class="text-xs font-semibold opacity-80 mb-1">📅 Last 3 Days</h4>
          ${historyHTML}
        </div>
      `;

      grid.appendChild(div);
    });

    content.appendChild(grid);
    box.appendChild(container);

    // ✅ Collapse/Expand toggle logic
    const toggle = document.getElementById("goldToggle");
    const goldContent = document.getElementById("goldContent");
    const goldArrow = document.getElementById("goldArrow");

    toggle.addEventListener("click", () => {
      const isHidden = goldContent.classList.toggle("hidden");
      goldArrow.style.transform = isHidden ? "rotate(0deg)" : "rotate(180deg)";
    });
  } catch (err) {
    console.error("❌ Gold rate fetch failed:", err);
    document.getElementById("goldBox").innerHTML = `
      <div class="text-red-500 text-sm p-4 bg-red-50 dark:bg-red-900/20 rounded-md shadow">
        ⚠️ Unable to fetch gold rates. Please try again later.
      </div>
    `;
  }
}


// ✅ Call it only once
document.addEventListener("DOMContentLoaded", showGoldRates);
