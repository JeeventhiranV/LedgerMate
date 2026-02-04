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

    // 🔽 Collapsible Section
    const container = document.createElement("div");
    container.className = "glass rounded-xl overflow-hidden shadow";

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
    const grid = document.createElement("div");
    grid.className = "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4";

    cards.forEach((card, idx) => {
      const todayNum = parseFloat(card.data.today.replace(/[^0-9.]/g, "")) || 0;

      const historyHTML = card.history
        .map(h => `<div class="flex justify-between text-xs" style="background: var(--glass-bg); border-color: var(--glass-border);"><span>${h.date}</span><span>${h.rate}</span></div>`)
        .join("");

      const div = document.createElement("div");
      div.className = "glass p-4 rounded-lg hover:shadow-md transition-all";

      div.innerHTML = `
        <h3 class="text-base font-semibold mb-2">${card.title}</h3>
        <div class="text-xs text-green-500">Today: <span class="font-bold">${card.data.today}</span></div>
        <div class="text-xs text-red-500">Yesterday: <span>${card.data.yesterday}</span></div>
        <div class="text-xs text-blue-500">Change: <span>${card.data.change}</span></div>

        <div class="border-t border-white/10 dark:border-white/5 my-2"></div>

        <div class="mt-2 flex gap-2 items-center">
          <div class="flex-1">
            <label class="text-xs font-medium block mb-1">Weight (g):</label>
            <input type="number" id="grams-${idx}" value="8.000" min="0.001" step="0.001" class="w-full text-sm p-1.5 rounded-md bg-white/20 dark:bg-black/20 border border-white/20 focus:outline-none" />
          </div>
          <div class="flex-1">
            <label class="text-xs font-medium block mb-1">GST %:</label>
            <input type="number" id="gst-${idx}" value="3" min="0" step="0.1" class="w-full text-sm p-1.5 rounded-md bg-white/20 dark:bg-black/20 border border-white/20 focus:outline-none" />
          </div>
        </div>

        <div class="mt-2">
          <label class="text-xs font-medium block mb-1">Wastage %:</label>
          <input type="number" id="wastage-${idx}" value="0" min="0" step="0.1" class="w-full text-sm p-1.5 rounded-md bg-white/20 dark:bg-black/20 border border-white/20 focus:outline-none" />
        </div>

        <div class="mt-2 text-xs flex justify-between"><span>💰 Base Price:</span><span id="basePrice-${idx}">₹0.00</span></div>
        <div class="text-xs flex justify-between"><span>💸 GST Amount:</span><span id="gstAmount-${idx}">₹0.00</span></div>
        <div class="text-xs flex justify-between"><span>🪙 Wastage Amount:</span><span id="wastageAmount-${idx}">₹0.00</span></div>
        <div class="text-xs flex justify-between font-bold text-green-600 dark:text-green-400"><span>✅ Final Total:</span><span id="totalAmount-${idx}">₹0.00</span></div>

        <div class="bg-white/10 dark:bg-black/20 rounded-md p-2 mt-3">
          <h4 class="text-xs font-semibold opacity-80 mb-1">📅 Last 3 Days</h4>
          ${historyHTML}
        </div>
      `;

      grid.appendChild(div);

      // 🔁 Update calculation dynamically
      const gramsInput = div.querySelector(`#grams-${idx}`);
      const gstInput = div.querySelector(`#gst-${idx}`);
      const wastageInput = div.querySelector(`#wastage-${idx}`);
      const baseEl = div.querySelector(`#basePrice-${idx}`);
      const gstEl = div.querySelector(`#gstAmount-${idx}`);
      const wastageEl = div.querySelector(`#wastageAmount-${idx}`);
      const totalEl = div.querySelector(`#totalAmount-${idx}`);

      
        function recalc() {
    const grams = parseFloat(gramsInput.value) || 0;
    const wastagePerc = parseFloat(wastageInput.value) || 0;
    const gstPerc = parseFloat(gstInput.value) || 3;

    // Step 1: Base price
    const basePrice = todayNum * grams;

    // Step 2: Add wastage
    const wastageAmt = (basePrice * wastagePerc) / 100;
    const priceWithWastage = basePrice + wastageAmt;

    // Step 3: Add GST
    const gstAmt = (priceWithWastage * gstPerc) / 100;

    // Total price
    const total = priceWithWastage + gstAmt;

    // Update UI
    baseEl.textContent = `₹${basePrice.toFixed(3)}`;
    wastageEl.textContent = `₹${wastageAmt.toFixed(3)}`;
    gstEl.textContent = `₹${gstAmt.toFixed(3)}`;
    totalEl.textContent = `₹${total.toFixed(3)}`;
    }

      gramsInput.addEventListener("input", recalc);
      gstInput.addEventListener("input", recalc);
      wastageInput.addEventListener("input", recalc);

      // 🔁 Initial calculation
      recalc();
    });

    content.appendChild(grid);
    box.appendChild(container);

    // ✅ Collapse toggle logic
    const toggle = document.getElementById("goldToggle");
    const goldContent = document.getElementById("goldContent");
    const goldArrow = document.getElementById("goldArrow");



    toggle.addEventListener("click", () => {
      const isHidden = goldContent.classList.toggle("hidden");
      goldArrow.style.transform = isHidden ? "rotate(0deg)" : "rotate(180deg)";
    }); 

    function initHeaderMarquee() {
  const source = doc.querySelector(".gd-stockmarket-data");
  const track = document.querySelector("#header-marquee .header-marquee-track");

  if (!source || !track) {
    console.warn("Source or target not found");
    return;
  }

  // clone twice for seamless loop
  const clone1 = source.cloneNode(true);
  const clone2 = source.cloneNode(true);

  track.innerHTML = "";
  track.appendChild(clone1);
  track.appendChild(clone2);

  formatTickerItems(track);
}
function formatTickerItems(root) {
  const allowedItems = [
    "gold",
    "silver",
    "petrol",
    "diesel",
    "nifty",
    "sensex",
    "usd"
  ];

  const commodityItems = [
    "gold",
    "silver",
    "petrol",
    "diesel"
  ];

  root.querySelectorAll("li").forEach(li => {
    const nameEl = li.querySelector(".gd-market-data span");
    const name = nameEl?.textContent.trim();

    if (!name) {
      li.remove();
      return;
    }

    const nameLower = name.toLowerCase();

    // ❌ REMOVE items not in your list
    if (!allowedItems.some(item => nameLower.includes(item))) {
      li.remove();
      return;
    }

    const price = li.querySelector(".gd-marketpts")?.textContent
      .replace(/\s+/g, " ")
      .trim();

    const changeEl = li.querySelector(".gd-marketupdown");
    let change = changeEl
      ? changeEl.textContent.replace(/\s+/g, " ").trim()
      : "";

    if (!price) return;

    // Hide % for commodities
    if (commodityItems.some(c => nameLower.includes(c))) {
      change = "";
    }

    let directionClass = "market-flat";
    let arrow = "";

    if (change.includes("+")) {
      directionClass = "market-up";
      arrow = "▲";
    } else if (change.includes("-")) {
      directionClass = "market-down";
      arrow = "▼";
    }

    change = change.replace("%", "");

    // === Build final block ===
    const block = document.createElement("div");
    block.className = "ticker-block";

    const nameDiv = document.createElement("div");
    nameDiv.className = "ticker-name";
    nameDiv.textContent = name;

    const valueDiv = document.createElement("div");
    valueDiv.className = `ticker-value ${directionClass}`;
    valueDiv.textContent = change
      ? `${price} ${arrow}${change}`
      : price;

    block.appendChild(nameDiv);
    block.appendChild(valueDiv);

    const link = li.querySelector("a");
    li.innerHTML = "";

    if (link) {
      link.innerHTML = "";
      link.appendChild(block);
      li.appendChild(link);
    } else {
      li.appendChild(block);
    }
  });
}

/* TOUCH PAUSE (MOBILE) */
const marquee = document.getElementById("header-marquee");

marquee.addEventListener("touchstart", () => {
  marquee.querySelector(".header-marquee-track").style.animationPlayState = "paused";
});

marquee.addEventListener("touchend", () => {
  marquee.querySelector(".header-marquee-track").style.animationPlayState = "running";
});
 initHeaderMarquee();


  } catch (err) {
    console.error("❌ Gold rate fetch failed:", err);
    document.getElementById("goldBox").innerHTML = `
      <div class="text-red-500 text-sm p-4 bg-red-50 dark:bg-red-900/20 rounded-md shadow">
        ⚠️ Unable to fetch gold rates. Please try again later.
      </div>
    `;
  }
}


document.addEventListener("DOMContentLoaded", showGoldRates);
 