async function openTripPlanner(onSave = null) {
  const STORE_NAME = "trips";
  let currentTripId = null;

  if (document.getElementById("tripPlannerPopup")) return;
const popup = document.createElement("div");
popup.id = "tripPlannerPopup";
popup.className = "fixed inset-0 z-[9999] bg-black/50 backdrop-blur-sm flex items-center justify-center animate-fadeIn p-2 overflow-auto";
popup.innerHTML = `
  <div class="glass w-full max-w-md md:max-w-2xl rounded-3xl p-4 md:p-6 relative flex flex-col gap-4" style="background: var(--glass-bg); border: 1px solid var(--glass-border);">
    <!-- Close button -->
    <button id="tp_close" class="absolute top-3 right-3 text-gray-600 dark:text-gray-300 text-xl hover:scale-110 transition">✕</button>

    <h2 class="text-xl md:text-2xl font-bold mb-2 flex items-center gap-2">🧳 Trip Planner</h2>

    <div class="flex flex-col md:flex-row gap-4">
      <!-- Left: Trip List -->
      <section class="flex-1 glass rounded-2xl p-3 md:p-4" style="background: var(--glass-bg); border: 1px solid var(--glass-border);">
        <div class="flex justify-between items-center mb-3">
          <h3 class="text-lg font-semibold">Trips</h3>
          <button id="tp_addTripBtn" class="py-1 px-3 md:py-2 md:px-4 rounded" style="background: var(--btn-green); color: var(--text); font-size: 0.85rem;">+ Add Trip</button>
        </div>
        <div id="tp_tripList" class="space-y-2 max-h-[300px] md:max-h-[400px] overflow-auto"></div>
      </section>

      <!-- Right: Trip Details -->
      <section id="tp_tripDetails" class="flex-1 glass rounded-2xl p-3 md:p-4 hidden flex-col" style="background: var(--glass-bg); border: 1px solid var(--glass-border);">
        <div class="flex justify-between items-start mb-2">
          <div class="flex-1">
            <h3 id="tp_tripTitle" class="text-lg font-semibold"></h3>
            <p id="tp_tripDates" class="text-sm text-gray-500"></p>
            <p id="tp_tripDays" class="text-xs text-gray-400 italic"></p>
            <p id="tp_tripNotes" class="text-xs text-gray-400 italic max-h-16 overflow-auto mt-1"></p>
            <p id="tp_tripCreated" class="text-xs text-gray-400 italic"></p>
            <p id="tp_tripUpdated" class="text-xs text-gray-400 italic"></p>
          </div>
          <div class="flex flex-col gap-1 ml-2">
            <button id="tp_editTripBtn" class="text-blue-400 text-sm hover:underline">Edit</button>
            <button id="tp_deleteTrip" class="text-red-400 text-sm hover:underline">Delete</button>
          </div>
        </div>

        <div id="tp_personList" class="flex flex-wrap gap-2 mb-2"></div>

        <div class="flex justify-between items-center mb-1">
          <h4 class="font-semibold">Expenses</h4>
          <button id="tp_addExpenseBtn" class="py-1 px-3 rounded" style="background: var(--btn-green); color: var(--text); font-size: 0.85rem;">+ Add</button>
        </div>
        <div id="tp_expenseList" class="space-y-2 mb-2 max-h-[200px] overflow-auto text-sm"></div>

        <h4 class="font-semibold mt-2 mb-1">💰 Settlement</h4>
        <div id="tp_settlementList" class="space-y-1 text-sm max-h-[150px] overflow-auto"></div>
      </section>
    </div>
  </div>

  <!-- Trip Modal -->
  <div id="tp_tripModal" class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center hidden z-[10000] p-2">
    <div class="glass w-full max-w-sm rounded-2xl p-4 flex flex-col gap-3" style="background: var(--glass-bg); border: 1px solid var(--glass-border);">
      <h3 id="tp_modalTitle" class="text-lg font-semibold mb-1">Add Trip</h3>
      <input id="tp_tripName" placeholder="Trip Name" class="input w-full p-2 rounded border" style="background: var(--input-bg); color: var(--input-text); border: 1px solid var(--input-border);">

      <div class="flex gap-2">
        <input id="tp_tripStart" type="date" class="input flex-1 p-2 rounded border" style="background: var(--input-bg); color: var(--input-text); border: 1px solid var(--input-border);">
        <input id="tp_tripEnd" type="date" class="input flex-1 p-2 rounded border" style="background: var(--input-bg); color: var(--input-text); border: 1px solid var(--input-border);">
      </div>

      <textarea id="tp_tripNotesInput" placeholder="Notes (optional)" class="input p-2 rounded border" style="background: var(--input-bg); color: var(--input-text); border: 1px solid var(--input-border);"></textarea>

      <h4 class="font-medium">Persons</h4>
      <div id="tp_personInputs" class="space-y-2"></div>
      <button id="tp_addPersonBtn" class="py-1 px-3 rounded" style="background: var(--btn-blue); color: var(--text);">+ Add Person</button>

      <div class="flex gap-2 mt-2">
        <button id="tp_cancelTripBtn" class="flex-1 py-2 rounded" style="background: var(--btn-red); color: var(--text);">Cancel</button>
        <button id="tp_saveTripBtn" class="flex-1 py-2 rounded" style="background: var(--btn-green); color: var(--text);">Save</button>
      </div>
    </div>
  </div>

  <!-- Expense Modal -->
  <div id="tp_expenseModal" class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center hidden z-[10000] p-2">
    <div class="glass w-full max-w-sm rounded-2xl p-4 flex flex-col gap-3" style="background: var(--glass-bg); border: 1px solid var(--glass-border);">
      <h3 id="tp_expModalTitle" class="text-lg font-semibold mb-1">Add Expense</h3>
      <input id="tp_expTitle" type="text" placeholder="Expense Title" class="input p-2 rounded border" style="background: var(--glass-bg); border: 1px solid var(--glass-border);">
      <input id="tp_expAmount" type="number" placeholder="Amount" class="input p-2 rounded border" style="background: var(--glass-bg); border: 1px solid var(--glass-border);">
      <select id="tp_expPaidBy" class="input p-2 rounded border" style="background: var(--glass-bg); border: 1px solid var(--glass-border);"></select>

      <div class="flex gap-2 mt-2">
        <button id="tp_cancelExpBtn" class="flex-1 py-2 rounded" style="background: var(--btn-red); color: var(--text);">Cancel</button>
        <button id="tp_saveExpBtn" class="flex-1 py-2 rounded" style="background: var(--btn-green); color: var(--text);">Save</button>
      </div>
    </div>
  </div>
`;

  document.body.appendChild(popup);

  const el = (id) => document.getElementById(id);

  // ---------- Events ----------
  el("tp_close").onclick = () => popup.remove();
  el("tp_addTripBtn").onclick = () => openTripModal();
  el("tp_cancelTripBtn").onclick = () => closeTripModal();

  el("tp_addPersonBtn").onclick = () => {
    const div = document.createElement("div");
    div.className = "flex gap-2 items-center";
    div.innerHTML = `<input type="text" placeholder="Person Name" class="input flex-1" style="background: var(--glass-bg); border: 1px solid var(--glass-border);">
                     <button class="text-red-400 text-sm" onclick="this.parentNode.remove()">✕</button>`;
    el("tp_personInputs").appendChild(div);
  };

  el("tp_saveTripBtn").onclick = saveTripData;
  el("tp_cancelExpBtn").onclick = () => el("tp_expenseModal").classList.add("hidden");
  el("tp_saveExpBtn").onclick = saveExpense;

  el("tp_deleteTrip").onclick = async () => {
    if (confirm("Delete this trip?")) {
      await del(STORE_NAME, currentTripId);
      state.trips = state.trips.filter((t) => t.id !== currentTripId);
      renderTrips();
      el("tp_tripDetails").classList.add("hidden");
    }
  };

  el("tp_editTripBtn").onclick = () => {
    const trip = state.trips.find((t) => t.id === currentTripId);
    openTripModal(trip);
  };

  // ---------- Render Functions ----------
function renderTrips() {
  const list = el("tp_tripList");
  if (!state.trips.length) {
    list.innerHTML = `<p class="text-gray-500 text-sm text-center">No trips yet.</p>`;
    return;
  }
  list.innerHTML = state.trips
    .map(
      (t) => `<div class="glass p-3 rounded-lg cursor-pointer hover:bg-white/60 dark:hover:bg-gray-700/60 transition" 
                   style="background: var(--glass-bg); border: 1px solid var(--glass-border);" 
                   onclick="window._openTrip('${t.id}')">
                <div class="font-semibold">${t.name} (${calculateTripDays(t.startDate, t.endDate)} days)</div>
                <div class="text-xs text-gray-500">${t.startDate || ""} → ${t.endDate || ""}</div>
                <div class="text-xs text-gray-400 italic">Created: ${formatDate(t.createdAt)}, Updated: ${formatDate(t.updatedAt)}</div>
              </div>`
    )
    .join("");
}


  window._openTrip = (id) => openTrip(id);

  function openTrip(id) {
    currentTripId = id;
    const trip = state.trips.find((t) => t.id === id);
    el("tp_tripDetails").classList.remove("hidden");
    el("tp_tripTitle").textContent = trip.name;
    el("tp_tripDates").textContent = `${trip.startDate} → ${trip.endDate}`;
  el("tp_tripNotes").innerHTML = `<div class="whitespace-pre-wrap overflow-auto max-h-28 p-2" style="background: var(--glass-bg); border: 1px solid var(--glass-border); border-radius: 8px;">${trip.notes || ""}</div>`;
    el("tp_tripCreated").textContent = `Created: ${formatDate(trip.createdAt)}`;
    el("tp_tripUpdated").textContent = `Last Modified: ${formatDate(trip.updatedAt)}`;
    const days = calculateTripDays(trip.startDate, trip.endDate);
el("tp_tripDays").textContent = `Days: ${days}`;
    el("tp_personList").innerHTML = trip.persons
      .map((p) => `<span class="glass px-2 py-1 rounded-full text-sm" style="background: var(--glass-bg); border: 1px solid var(--glass-border);">${p.name}</span>`)
      .join("");
    renderExpenses(trip);
  }
  function renderExpenses(trip) {
  const list = el("tp_expenseList");
  if (!trip.expenses.length) {
    list.innerHTML = `<p class="text-gray-500 text-sm">No expenses yet.</p>`;
  } else {
    list.innerHTML = trip.expenses
      .map(
        (e) => `<div class="glass p-2 rounded-lg flex justify-between items-center" style="background: var(--glass-bg); border: 1px solid var(--glass-border);">
                  <div>
                    <div class="font-medium">${e.title}</div>
                    <div class="text-xs text-gray-400">Paid by ${trip.persons.find((p) => p.id === e.paidBy)?.name}</div>
                  </div>
                  <div class="flex items-center gap-2">
                    <div class="font-semibold">₹${e.amount}</div>
                    <button class="text-blue-400 text-xs" onclick="window._editExp('${trip.id}','${e.id}')">✏️</button>
                    <button class="text-red-400 text-xs" onclick="window._delExp('${trip.id}','${e.id}')">🗑</button>
                  </div>
                </div>`
      )
      .join("");
    }
  // 🔹 Bind Add Expense button for this trip
  el("tp_addExpenseBtn").onclick = () => window.openExpenseModal(trip);

  renderSettlement(trip);
}



  window._delExp = async (tripId, expId) => {
    const trip = state.trips.find((t) => t.id === tripId);
    trip.expenses = trip.expenses.filter((e) => e.id !== expId);
    await put(STORE_NAME, trip);
    renderExpenses(trip);
  };

  window._editExp = (tripId, expId) => {
    const trip = state.trips.find((t) => t.id === tripId);
    const exp = trip.expenses.find((e) => e.id === expId);
    openExpenseModal(trip, exp);
  }; 
  function renderSettlement(trip) {
  const settlements = calculateSettlements(trip);
  const total = trip.expenses.reduce((a, e) => a + Number(e.amount), 0);
  const perHead = total / (trip.persons.length || 1);

  // Separate debtors and creditors
  const debtors = settlements.filter(s => s.balance < 0).map(s => ({ ...s, balance: -s.balance }));
  const creditors = settlements.filter(s => s.balance > 0);

  const payments = [];

  let i = 0, j = 0;
  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i];
    const creditor = creditors[j];
    const amount = Math.min(debtor.balance, creditor.balance);

    payments.push({
      from: debtor.name,
      to: creditor.name,
      amount
    });

    debtor.balance -= amount;
    creditor.balance -= amount;

    if (debtor.balance <= 0) i++;
    if (creditor.balance <= 0) j++;
  }

  // Render in UI
  el("tp_settlementList").innerHTML = `
    <p class="text-xs text-gray-400 mb-2">Total Trip Amount: ₹${total.toFixed(2)} | Per Head: ₹${perHead.toFixed(2)}</p>
    ${payments.length
      ? payments.map(p => `<div class="flex justify-between text-sm text-gray-300"><span>${p.from} ➡ ${p.to}</span><span>₹${p.amount.toFixed(2)}</span></div>`).join("")
      : `<div class="text-xs text-gray-400">All settled ✅</div>`
    }
  `;
}

function calculateSettlements(trip) {
  const total = trip.expenses.reduce((a, e) => a + Number(e.amount), 0);
  const perHead = total / (trip.persons.length || 1);
  const paid = {};

  trip.expenses.forEach(e => {
    paid[e.paidBy] = (paid[e.paidBy] || 0) + Number(e.amount);
  });

  return trip.persons.map(p => ({
    personId: p.id,
    name: p.name,
    paid: paid[p.id] || 0,
    balance: (paid[p.id] || 0) - perHead  // +ve = receives, -ve = pays
  }));
}


  // ---------- Modals ----------
  function openTripModal(existing = null) {
    el("tp_tripModal").classList.remove("hidden");
    el("tp_modalTitle").textContent = existing ? "Edit Trip" : "Add Trip";
    el("tp_tripName").value = existing?.name || "";
    el("tp_tripStart").value = existing?.startDate || "";
    el("tp_tripEnd").value = existing?.endDate || "";
    el("tp_tripNotesInput").value = existing?.notes || "";
    el("tp_personInputs").innerHTML = "";
    (existing?.persons || []).forEach((p) => {
      const div = document.createElement("div");
      div.className = "flex gap-2 items-center";
      div.innerHTML = `<input type="text" value="${p.name}" class="input flex-1" style="background: var(--glass-bg); border: 1px solid var(--glass-border);">
                       <button class="text-red-400 text-sm" onclick="this.parentNode.remove()">✕</button>`;
      el("tp_personInputs").appendChild(div);
    });
    el("tp_saveTripBtn").dataset.editing = existing ? existing.id : "";
  }

  function closeTripModal() {
    el("tp_tripModal").classList.add("hidden");
  }
  function formatDate(iso) {
  if (!iso) return "-";
  const d = new Date(iso);
  return `${d.getFullYear()}-${(d.getMonth()+1).toString().padStart(2,'0')}-${d.getDate().toString().padStart(2,'0')} ${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`;
}
async function saveTripData() {
  const name = el("tp_tripName").value.trim();
  if (!name) return alert("Trip name required");
  const persons = Array.from(el("tp_personInputs").querySelectorAll("input"))
    .map((el, i) => ({ id: "p" + (i + 1), name: el.value.trim() }))
    .filter((p) => p.name);
  if (!persons.length) return alert("Add at least one person");

  const now = new Date().toISOString();
  const tripId = el("tp_saveTripBtn").dataset.editing || "trip_" + Date.now();

  const trip = {
    id: tripId,
    name,
    startDate: el("tp_tripStart").value,
    endDate: el("tp_tripEnd").value,
    notes: el("tp_tripNotesInput").value.trim(),
    persons,
    expenses: [],
    createdAt: state.trips.find(t => t.id === tripId)?.createdAt || now,
    updatedAt: now
  };

  const existingIdx = state.trips.findIndex((t) => t.id === trip.id);
  if (existingIdx > -1) trip.expenses = state.trips[existingIdx].expenses;
  if (existingIdx > -1) state.trips[existingIdx] = trip;
  else state.trips.push(trip);

  await put(STORE_NAME, trip);
  renderTrips();
  closeTripModal();
}


  function openExpenseModal(trip, existing = null) {
    el("tp_expenseModal").classList.remove("hidden");
    el("tp_expModalTitle").textContent = existing ? "Edit Expense" : "Add Expense";
    el("tp_expTitle").value = existing?.title || "";
    el("tp_expAmount").value = existing?.amount || "";
    el("tp_expPaidBy").innerHTML = trip.persons
      .map((p) => `<option value="${p.id}" ${existing?.paidBy === p.id ? "selected" : ""}>${p.name}</option>`)
      .join("");
    el("tp_saveExpBtn").dataset.trip = trip.id;
    el("tp_saveExpBtn").dataset.editing = existing?.id || "";
  }

  async function saveExpense() {
    const title = el("tp_expTitle").value.trim();
    const amount = Number(el("tp_expAmount").value);
    const paidBy = el("tp_expPaidBy").value;
    const trip = state.trips.find((t) => t.id === el("tp_saveExpBtn").dataset.trip);
    if (!title || !amount || !paidBy) return alert("All fields required");

    const expId = el("tp_saveExpBtn").dataset.editing || "e" + Date.now();
    const existingIdx = trip.expenses.findIndex((e) => e.id === expId);
    const newExp = { id: expId, title, amount, paidBy };

    if (existingIdx > -1) trip.expenses[existingIdx] = newExp;
    else trip.expenses.push(newExp);

    await put(STORE_NAME, trip);
    renderExpenses(trip);
    el("tp_expenseModal").classList.add("hidden");
  }
  function calculateTripDays(start, end) {
    if (!start || !end) return 0;
    const startDate = new Date(start);
    const endDate = new Date(end);
    const diffTime = endDate - startDate;
    return diffTime >= 0 ? Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1 : 0; // +1 to include start day
}
 
  renderTrips();
}
function openExpenseModal(trip, existing = null) {
    const el = (id) => document.getElementById(id);
    el("tp_expenseModal").classList.remove("hidden");
    el("tp_expModalTitle").textContent = existing ? "Edit Expense" : "Add Expense";
    el("tp_expTitle").value = existing?.title || "";
    el("tp_expAmount").value = existing?.amount || "";
    el("tp_expPaidBy").innerHTML = trip.persons
      .map((p) => `<option value="${p.id}" ${existing?.paidBy === p.id ? "selected" : ""}>${p.name}</option>`)
      .join("");
    el("tp_saveExpBtn").dataset.trip = trip.id;
    el("tp_saveExpBtn").dataset.editing = existing?.id || "";
}
window.openTripPlanner = openTripPlanner;
window.openExpenseModal = openExpenseModal;