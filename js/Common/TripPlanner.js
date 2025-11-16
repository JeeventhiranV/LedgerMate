  const STORE_NAME = "trips";
async function openTripPlanner(onSave = null) {

  let currentTripId = null;

  if (document.getElementById("tripPlannerPopup")) return;
  const popup = document.createElement("div");
  popup.id = "tripPlannerPopup";
  popup.className =
    "fixed inset-0 z-[9999] bg-black/50 backdrop-blur-sm flex items-center justify-center animate-fadeIn p-2 overflow-auto";
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
        <input id="tp_searchTrips" placeholder="Search trips or people" class="input w-full p-2 rounded border"> 
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
            <button id="tp_completeTripBtn" class="text-green-400 text-sm hover:underline">Complete</button>
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
         <!-- SHARE / EXPORT BUTTONS will appear here -->
         <h4 class="font-semibold mt-2 mb-1">Share</h4>
        <div id="tp_shareBtns" class="flex gap-2 mt-4"></div>
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
      <div>
        <label class="text-xs">Paid By:</label>
        <select id="tp_expPaidBy" class="input p-2 rounded border w-full" style="background: var(--glass-bg); border: 1px solid var(--glass-border);"></select>
      </div>
      <div>
        <label class="text-xs">Shared With:</label>
        <div id="tp_expSharedWith" class="flex flex-wrap gap-2 max-h-32 overflow-auto border rounded p-1"></div>
      </div>

      <div class="flex gap-2 mt-2">
        <button id="tp_cancelExpBtn" class="flex-1 py-2 rounded" style="background: var(--btn-red); color: var(--text);">Cancel</button>
        <button id="tp_saveExpBtn" class="flex-1 py-2 rounded" style="background: var(--btn-green); color: var(--text);">Save</button>
      </div>
    </div>
  </div>
  <!-- Settlement Summary Modal -->
<div id="tp_summaryModal" class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center hidden z-[10000]">
  <div class="glass p-6 rounded-2xl w-[95%] md:w-[400px] max-h-[80vh] overflow-y-auto" 
    style="background: var(--glass-bg); border: 1px solid var(--glass-border);">
    <h3 class="text-lg font-semibold mb-3">💰 Settlement Summary</h3>
    <div id="tp_summaryContent" class="space-y-2 text-sm text-gray-300"></div>
    <div class="flex justify-between mt-4">
      <button id="tp_closeSummaryBtn" class="text-sm px-3 py-2 rounded" 
        style="background: var(--btn-red); color: var(--text);">Close</button>
      <button id="tp_completeTripBtn" class="text-sm px-3 py-2 rounded" 
        style="background: var(--btn-green); color: var(--text);">Mark All Completed ✅</button>
    </div>
  </div>
</div>
<!-- Confirm Settlement Modal -->
<div id="tp_confirmModal" class="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center hidden z-[10001]">
  <div class="glass p-6 rounded-2xl w-80"
       style="background: var(--glass-bg); border: 1px solid var(--glass-border);">
    <h3 class="text-lg font-semibold mb-2">💸 Confirm Settlement</h3>
    <p id="tp_confirmText" class="text-sm text-gray-300 mb-2"></p>
    <input id="tp_confirmAmount" type="number" step="0.01" placeholder="Enter amount collected"
      class="w-full p-2 rounded border mb-3" 
      style="background: var(--input-bg); color: var(--input-text); border-color: var(--input-border);" />
    <div class="flex justify-between gap-2">
      <button id="tp_cancelConfirm" class="w-1/2 py-2 rounded" 
        style="background: var(--btn-red); color: var(--text);">Cancel</button>
      <button id="tp_saveConfirm" class="w-1/2 py-2 rounded" 
        style="background: var(--btn-green); color: var(--text);">Save</button>
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
  if (!confirm("Are you sure you want to delete this trip?")) return;
  await del(STORE_NAME, currentTripId);
  state.trips = state.trips.filter((t) => t.id !== currentTripId);
  renderTrips();
  el("tp_tripDetails").classList.add("hidden");
};

el("tp_completeTripBtn").onclick = async () => {
  const trip = state.trips.find((t) => t.id === currentTripId);
  if (!confirm("Mark this trip as " + (trip.completed ? "incomplete" : "complete") + "?")) return;
  trip.completed = trip.completed ? false : true;
  trip.updatedAt = new Date().toISOString();
  await put(STORE_NAME, trip);
  renderTrips();
  el("tp_tripDetails").classList.add("hidden");
};

  el("tp_editTripBtn").onclick = () => {
    const trip = state.trips.find((t) => t.id === currentTripId);
    openTripModal(trip);
  };
el("tp_searchTrips").oninput = (e) => {
  const query = e.target.value.toLowerCase();
  const filtered = state.trips.filter(
    t => t.name.toLowerCase().includes(query) || 
         t.persons.some(p => p.name.toLowerCase().includes(query))
  );
  renderTrips(filtered);
};
  // ---------- Functions ----------
  window._openTrip = (id) => openTrip(id);

  function openTrip(id) {
    currentTripId = id;
    const trip = state.trips.find((t) => t.id === id);
    el("tp_tripDetails").classList.remove("hidden");
    el("tp_tripTitle").textContent = trip.name;
    el("tp_tripDates").textContent = `${trip.startDate} → ${trip.endDate}`;
    el(
      "tp_tripNotes"
    ).innerHTML = `<div class="whitespace-pre-wrap overflow-auto max-h-28 p-2" style="background: var(--glass-bg); border: 1px solid var(--glass-border); border-radius: 8px;">${
      trip.notes || ""
    }</div>`;
    el("tp_tripCreated").textContent = `Created: ${formatDate(trip.createdAt)}`;
    el("tp_tripUpdated").textContent = `Last Modified: ${formatDate(trip.updatedAt)}`;
    el("tp_completeTripBtn").textContent = `${trip.completed ? "Incomplete" : "Complete"}`;
    const days = calculateTripDays(trip.startDate, trip.endDate);
    el("tp_tripDays").textContent = `Days: ${days}`;
    el("tp_personList").innerHTML = trip.persons
      .map(
        (p) =>
          `<span class="glass px-2 py-1 rounded-full text-sm" style="background: var(--glass-bg); border: 1px solid var(--glass-border);">${p.name}</span>`
      )
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
          (e) => `<div class="glass p-2 rounded-lg" style="background: var(--glass-bg); border: 1px solid var(--glass-border);">
                    <div class="font-medium">${e.title} — ₹${e.amount}</div>
                    <div class="text-xs text-gray-400">Paid by: ${trip.persons.find((p) => p.id === e.paidBy)?.name}</div>
                    <div class="text-xs text-gray-400">Shared with: ${e.sharedWith
                      .map((id) => trip.persons.find((p) => p.id === id)?.name)
                      .join(", ")}</div>
                    <div class="flex items-center gap-2 mt-1">
                      <button class="text-blue-400 text-xs" onclick="window._editExp('${trip.id}','${e.id}')">✏️</button>
                      <button class="text-red-400 text-xs" onclick="window._delExp('${trip.id}','${e.id}')">🗑</button>
                    </div>
                  </div>`
        )
        .join("");
    }
    el("tp_addExpenseBtn").onclick = () => window.openExpenseModal(trip);
    renderSettlement(trip);
    injectShareButtons(trip);

  // ADD ONE OF THESE:
  injectRoutePlannerButton(trip);   // Adds button next to share buttons
  // OR
  addRoutePlannerSection(trip);      // Adds dedicated section with description
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
 async function saveTripData() {
  const name = el("tp_tripName").value.trim();
  if (!name) return alert("Trip name required");

  const persons = Array.from(el("tp_personInputs").querySelectorAll("input"))
    .map((el, i) => ({ id: "p" + (i + 1), name: el.value.trim() }))
    .filter((p) => p.name);

  if (!persons.length) return alert("Add at least one person");

  const now = new Date().toISOString();
  const tripId = el("tp_saveTripBtn").dataset.editing || "trip_" + Date.now();
  const existingTrip = state.trips.find(t => t.id === tripId);

  const trip = {
    id: tripId,
    name,
    startDate: el("tp_tripStart").value,
    endDate: el("tp_tripEnd").value,
    notes: el("tp_tripNotesInput").value.trim(),
    persons,
    expenses: existingTrip?.expenses || [],
    createdAt: existingTrip?.createdAt || now,
    updatedAt: now,
    completed: existingTrip?.completed || false
  };

  if (existingTrip) {
    const idx = state.trips.findIndex(t => t.id === tripId);
    state.trips[idx] = trip;
  } else {
    state.trips.push(trip);
  }

  await put(STORE_NAME, trip);
  renderTrips();
  closeTripModal();
}



  async function saveExpense() {
    const title = el("tp_expTitle").value.trim();
    const amount = Number(el("tp_expAmount").value);
    const paidBy = el("tp_expPaidBy").value;
    const trip = state.trips.find((t) => t.id === el("tp_saveExpBtn").dataset.trip);
    if (!title || !amount || !paidBy) return alert("All fields required");
    const sharedWith = Array.from(el("tp_expSharedWith").querySelectorAll("input:checked")).map((i) => i.value);
    if (!sharedWith.length) return alert("Select at least one person for sharing");

    const expId = el("tp_saveExpBtn").dataset.editing || "e" + Date.now();
    const existingIdx = trip.expenses.findIndex((e) => e.id === expId);
    const newExp = { id: expId, title, amount, paidBy, sharedWith };

    if (existingIdx > -1) trip.expenses[existingIdx] = newExp;
    else trip.expenses.push(newExp);

    await put(STORE_NAME, trip);
    renderExpenses(trip);
    el("tp_expenseModal").classList.add("hidden");
  }
 
  renderTrips();
}
const el = (id) => document.getElementById(id);
  function openExpenseModal(trip, existing = null) {
 
    el("tp_expenseModal").classList.remove("hidden");
    el("tp_expModalTitle").textContent = existing ? "Edit Expense" : "Add Expense";
    el("tp_expTitle").value = existing?.title || "";
    el("tp_expAmount").value = existing?.amount || "";
    el("tp_expPaidBy").innerHTML = trip.persons
      .map((p) => `<option value="${p.id}" ${existing?.paidBy === p.id ? "selected" : ""}>${p.name}</option>`)
      .join("");
    el("tp_expSharedWith").innerHTML = "";
    trip.persons.forEach((p) => {
      const chk = document.createElement("label");
      chk.className = "flex items-center gap-1";
      chk.innerHTML = `<input type="checkbox" value="${p.id}" ${
        existing ? (existing.sharedWith.includes(p.id) ? "checked" : "") : "checked"
      }> ${p.name}`;
      el("tp_expSharedWith").appendChild(chk);
    });
    el("tp_saveExpBtn").dataset.trip = trip.id;
    el("tp_saveExpBtn").dataset.editing = existing?.id || "";
  }
  function openSettlementSummary(trip) {
  const modal = el("tp_summaryModal");
  const content = el("tp_summaryContent");
  modal.classList.remove("hidden");

  const totalPaid = {};
  const totalReceived = {};
  const totalPending = {};

  trip.persons.forEach(p => {
    totalPaid[p.id] = 0;
    totalReceived[p.id] = 0;
    totalPending[p.id] = 0;
  });

  trip.settlements = trip.settlements || [];
  trip.settlements.forEach(s => {
    const amount = s.amount || s.confirmedAmount || 0;
    if (s.confirmed) {
      totalPaid[s.from] += amount;
      totalReceived[s.to] += amount;
    } else {
      totalPending[s.from] += (s.amount || amount);
    }
  });

  const personSummary = trip.persons.map(p => {
    const paid = totalPaid[p.id] || 0;
    const received = totalReceived[p.id] || 0;
    const pending = totalPending[p.id] || 0;
    return `
      <div class="rounded-lg p-2 border border-gray-700/40">
        <div class="flex justify-between"><span class="text-gray-300">${p.name}</span>
        <span class="text-xs text-gray-400">${paid ? "Paid ₹" + paid.toFixed(2) : ""}</span></div>
        ${received ? `<div class="text-green-400 text-xs">Received ₹${received.toFixed(2)}</div>` : ""}
        ${pending ? `<div class="text-yellow-400 text-xs">Pending ₹${pending.toFixed(2)}</div>` : ""}
      </div>`;
  }).join("");

  const pendingCount = trip.settlements.filter(s => !s.confirmed).length;
  const confirmText = pendingCount > 0 
    ? `Confirm remaining ${pendingCount} settlements?`
    : "All settlements completed ✅";

  content.innerHTML = `
    ${personSummary}
    <div class="mt-3 text-center text-xs text-gray-400">${confirmText}</div>
  `;

  el("tp_closeSummaryBtn").onclick = () => modal.classList.add("hidden");
  el("tp_completeTripBtn").onclick = async () => {
    trip.settlements.forEach(s => {
      s.confirmed = true;
      s.confirmedAmount = s.amount || s.confirmedAmount || 0;
      s.confirmedAt = new Date().toISOString();
    });
    trip.completed = true;
    trip.updatedAt = new Date().toISOString();
    await put(STORE_NAME, trip);
    modal.classList.add("hidden");
    renderTrips();
    renderSettlement(trip);
    injectShareButtons(trip);
  };
} 
async function confirmSettlement(tripId, from, to, isCollected) {
  const trip = state.trips.find(t => t.id === tripId);
  if (!trip) return;

  const s = trip.settlements.find(x => x.from === from && x.to === to);
  if (!s) return;

  if (isCollected) {
    const input = el(`tp_addAmt_${from}_${to}`);
    let addAmt = parseFloat(input?.value || s.amount);
    if (isNaN(addAmt) || addAmt <= 0) return alert("Enter valid amount");

    s.confirmedAmount = Math.min((s.confirmedAmount || 0) + addAmt, s.amount);
    s.status = s.confirmedAmount >= s.amount ? "collected" : "partial";
  } else {
    s.status = "uncollected";
    s.confirmedAmount = 0;
  } 
  await put(STORE_NAME, trip);
  renderSettlement(trip);
  injectShareButtons(trip);
}



async function checkTripCompletion(trip) {
  if (!trip.settlements?.length) return;
  const allConfirmed = trip.settlements.every(
    (s) => s.confirmed || s.confirmedAmount >= s.amount
  );
  if (allConfirmed && !trip.completed) {
    trip.completed = true;
    trip.updatedAt = new Date().toISOString();
    await put(STORE_NAME, trip);
    renderTrips();
  }
}

function renderSettlement(trip) {
  const totals = {};
  trip.persons.forEach(p => (totals[p.id] = 0));

  // Calculate net balances
  trip.expenses.forEach(e => {
    const perPerson = e.amount / e.sharedWith.length;
    e.sharedWith.forEach(pid => (totals[pid] -= perPerson));
    totals[e.paidBy] += e.amount;
  });

  const debtors = [], creditors = [];
  trip.persons.forEach(p => {
    const bal = totals[p.id];
    if (bal < 0) debtors.push({ id: p.id, name: p.name, balance: -bal });
    else if (bal > 0) creditors.push({ id: p.id, name: p.name, balance: bal });
  });

  // Pairwise settlements
  const payments = [];
  let i = 0, j = 0;
  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i];
    const creditor = creditors[j];
    const amt = Math.min(debtor.balance, creditor.balance);
    payments.push({ from: debtor.id, to: creditor.id, amount: amt });
    debtor.balance -= amt;
    creditor.balance -= amt;
    if (debtor.balance <= 0) i++;
    if (creditor.balance <= 0) j++;
  }

  const totalAmount = trip.expenses.reduce((a, e) => a + Number(e.amount), 0);
  const perHead = totalAmount / trip.persons.length;

  // Ensure settlements array exists
  trip.settlements = trip.settlements || [];

  el("tp_settlementList").innerHTML = `
    <div class="flex justify-between items-center mb-2">
      <p class="text-xs text-gray-400">
        Total Trip Amount: ₹${totalAmount.toFixed(2)} | Per Head: ₹${perHead.toFixed(2)}
      </p>
      <button id="tp_viewSummaryBtn" 
        class="text-xs px-2 py-1 rounded" 
        style="background: var(--btn-green); color: var(--text);">
        💰 View Summary
      </button>
    </div>

    ${
      payments.length
        ? payments.map((p) => {
            const fromPerson = trip.persons.find(x => x.id === p.from);
            const toPerson = trip.persons.find(x => x.id === p.to);

            // Find existing settlement record or create new
            let existing = trip.settlements.find(s => s.from === p.from && s.to === p.to);
            if (!existing) {
              existing = { from: p.from, to: p.to, amount: p.amount, confirmedAmount: 0, status: "uncollected" };
              trip.settlements.push(existing);
            }

            const collected = existing.confirmedAmount || 0;
            const remaining = Math.max(0, p.amount - collected);

            let statusHTML = "";
            if (remaining <= 0) {
              statusHTML = `<span class="text-green-400 text-xs">✅ Fully Collected (₹${p.amount.toFixed(2)})</span>`;
            } else if (collected > 0 && remaining > 0) {
              statusHTML = `
                <span class="text-yellow-400 text-xs">
                  ⚠️ Partially Collected (₹${collected.toFixed(2)} / ₹${p.amount.toFixed(2)})
                </span>
                <div class="flex items-center gap-2 mt-1">
                  <input type="number" id="tp_addAmt_${p.from}_${p.to}" 
                         class="w-20 text-xs px-1 py-0.5 rounded bg-gray-700 border border-gray-600 text-gray-100" 
                         placeholder="Amt" min="1" max="${remaining}" />
                  <button class="text-xs px-2 py-1 rounded bg-green-600 text-white" 
                    onclick="confirmSettlement('${trip.id}','${p.from}','${p.to}',true)">
                    ➕ Collected
                  </button>
                  <button class="text-xs px-2 py-1 rounded bg-red-600 text-white" 
                    onclick="confirmSettlement('${trip.id}','${p.from}','${p.to}',false)">
                    ❌ Uncollected
                  </button>
                </div>`;
            } else {
              statusHTML = `<div class="flex items-center gap-2 mt-1">
                  <input type="number" id="tp_addAmt_${p.from}_${p.to}" 
                         class="w-20 text-xs px-1 py-0.5 rounded bg-gray-700 border border-gray-600 text-gray-100" 
                         placeholder="Amt" min="1" max="${remaining}" />
                <button class="text-xs px-2 py-1 rounded bg-green-600 text-white" 
                  onclick="confirmSettlement('${trip.id}','${p.from}','${p.to}',true)">
                  ➕ Collected
                </button>
                <button class="text-xs px-2 py-1 rounded bg-red-600 text-white" 
                  onclick="confirmSettlement('${trip.id}','${p.from}','${p.to}',false)">
                  ❌ Uncollected
                </button></div>`;
            }

            return `
              <div class="flex flex-col rounded-lg p-2 mb-2" 
                   style="background: var(--glass-bg); border: 1px solid var(--glass-border);">
                <div class="flex justify-between text-sm text-gray-200">
                  <span>${fromPerson?.name || "?"} ➡ ${toPerson?.name || "?"}</span>
                  <span>₹${p.amount.toFixed(2)}</span>
                </div>
                <div class="mt-1">${statusHTML}</div>
              </div>`;
          }).join("")
        : `<div class="text-xs text-gray-400">All settled ✅</div>`
    }
  `; 
  el("tp_viewSummaryBtn").onclick = () => openSettlementSummary(trip);

  checkTripCompletion(trip);
}


  // ---------- Render Functions ----------
  function renderTrips(tripsToRender = state.trips) {
  const list = el("tp_tripList");
  if (!tripsToRender.length) {
    list.innerHTML = `<p class="text-gray-500 text-sm text-center">No trips yet.</p>`;
    return;
  }
  list.innerHTML = tripsToRender
    .sort((a, b) => {
      // Sort by startDate ascending, completed trips last
      if (a.completed && !b.completed) return 1;
      if (!a.completed && b.completed) return -1;
      return new Date(a.startDate) - new Date(b.startDate);
    })
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

  function calculateTripDays(start, end) {
    if (!start || !end) return 0;
    const startDate = new Date(start);
    const endDate = new Date(end);
    const diffTime = endDate - startDate;
    return diffTime >= 0 ? Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1 : 0;
  }
  
  function formatDate(iso) {
    if (!iso) return "-";
    const d = new Date(iso);
    return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, "0")}-${d
      .getDate()
      .toString()
      .padStart(2, "0")} ${d.getHours().toString().padStart(2, "0")}:${d
      .getMinutes()
      .toString()
      .padStart(2, "0")}`;
  }
/* ---------- Sharing, PDF export, WhatsApp text & GPay/UPI pay ---------- */

// Helper to build human-readable trip summary (used by WhatsApp/email/pdf)
function buildTripSummaryText(trip) {
  const total = (trip.expenses || []).reduce((s,e)=>s + Number(e.amount||0),0);
  const persons = trip.persons || [];
  // compute paid / owed with sharedWith fallback
  const paid = {}; const owed = {};
  persons.forEach(p => { paid[p.id]=0; owed[p.id]=0; });
  (trip.expenses||[]).forEach(exp => {
    const participants = (exp.sharedWith && exp.sharedWith.length) ? exp.sharedWith : persons.map(p=>p.id);
    const perHead = Number(exp.amount || 0) / Math.max(1, participants.length);
    paid[exp.paidBy] = (paid[exp.paidBy] || 0) + Number(exp.amount || 0);
    participants.forEach(pid => { owed[pid] = (owed[pid] || 0) + perHead; });
  });
  const balances = persons.map(p => ({
    id: p.id, name: p.name,
    paid: paid[p.id] || 0,
    owed: owed[p.id] || 0,
    balance: (paid[p.id] || 0) - (owed[p.id] || 0)
  }));

  // pairwise payments (greedy)
  const debtors = balances.filter(b=>b.balance < 0).map(b=>({ ...b, amount: -b.balance }));
  const creditors = balances.filter(b=>b.balance > 0).map(b=>({ ...b }));
  const payments = [];
  let i=0,j=0;
  while(i<debtors.length && j<creditors.length){
    const d = debtors[i], c = creditors[j];
    const amt = Math.min(d.amount, c.balance);
    payments.push({ from: d.name, to: c.name, amount: amt });
    d.amount -= amt; c.balance -= amt;
    if (d.amount <= 0) i++;
    if (c.balance <= 0) j++;
  }

  // build text
  let txt = `Trip: ${trip.name}\nDates: ${trip.startDate || '-'} → ${trip.endDate || '-'}\n\n`;
  txt += `Total Spent: ₹${total.toFixed(2)}\n\nExpenses:\n`;
  (trip.expenses || []).forEach(e=>{
    const payer = (trip.persons.find(p=>p.id===e.paidBy)||{}).name || e.paidBy;
    const shared = (e.sharedWith && e.sharedWith.length) ? e.sharedWith.map(id => (trip.persons.find(p=>p.id===id)||{}).name||id).join(", ") : "All";
    txt += ` - ${e.title}: ₹${Number(e.amount).toFixed(2)} (Paid: ${payer}; Shared: ${shared})\n`;
  });

  txt += `\nPer person summary:\n`;
  balances.forEach(b=>{
    txt += ` - ${b.name}: Paid ₹${b.paid.toFixed(2)}, Share ₹${b.owed.toFixed(2)}, ${b.balance > 0 ? `Receives ₹${b.balance.toFixed(2)}` : b.balance < 0 ? `Pays ₹${Math.abs(b.balance).toFixed(2)}` : "Settled"}\n`;
  });

  if (payments.length) {
    txt += `\nSuggested settlements:\n`;
    payments.forEach(p=> txt += ` - ${p.from} → ${p.to}: ₹${p.amount.toFixed(2)}\n`);
  } else {
    txt += `\nAll settled ✅\n`;
  }

  return { text: txt, payments, balances, total };
}

// WhatsApp share (opens wa.me)
function shareTripWhatsApp(trip) {
  const { text } = buildTripSummaryText(trip);
  // keep reasonably sized for mobile
  const maxLen = 15000;
  const payload = encodeURIComponent(text.length > maxLen ? text.slice(0, maxLen) + '\n...(truncated)' : text);
  const url = `https://wa.me/?text=${payload}`;
  window.open(url, '_blank');
}
 
// Dynamic load of jsPDF (UMD build) and return promise that resolves to jsPDF constructor
async function loadJsPDF() {
  return new Promise((resolve, reject) => {
    if (window.jspdf && window.jspdf.jsPDF && window.jspdf.autoTable) {
      return resolve({ jsPDF: window.jspdf.jsPDF, autoTable: window.jspdf.autoTable });
    }

    const src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
    const autoTableSrc = "https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.28/jspdf.plugin.autotable.min.js";

    // Load jsPDF first
    const s1 = document.createElement("script");
    s1.src = src;
    s1.onload = () => {
      // Patch jsPDF to window for autoTable
      if (window.jspdf && window.jspdf.jsPDF) window.jsPDF = window.jspdf.jsPDF;
      
      const s2 = document.createElement("script");
      s2.src = autoTableSrc;
      s2.onload = () => {
        if (window.jsPDF && window.jspdf && window.jspdf.jsPDF) {
          resolve({ jsPDF: window.jsPDF, autoTable: window.jspdf.autoTable });
        } else {
          reject(new Error("jsPDF or autoTable not available"));
        }
      };
      s2.onerror = () => reject(new Error("Failed to load autoTable plugin"));
      document.head.appendChild(s2);
    };
    s1.onerror = () => reject(new Error("Failed to load jsPDF"));
    document.head.appendChild(s1);
  });
}


// Export PDF (uses jsPDF). Creates a simple multi-line PDF containing the trip summary.
async function exportTripPDF(trip) {
  try {
    const { jsPDF } = await loadJsPDF(); // make sure loadJsPDF loads both jsPDF + autoTable
    const doc = new jsPDF();

    const pageWidth = doc.internal.pageSize.getWidth();

    // Optional: background color or image
    doc.setFillColor(245, 245, 245); // light grey
    doc.rect(0, 0, pageWidth, 297, "F");

    // Header
    doc.setFontSize(18);
    doc.setTextColor(40, 40, 40);
    doc.setFont("helvetica", "bold");
    doc.text(`Trip Summary: ${trip.name}`, pageWidth / 2, 20, { align: "center" });

    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(80);
    doc.text(`Dates: ${trip.startDate} → ${trip.endDate}`, 14, 30);
    doc.text(`Notes: ${trip.notes || "-"}`, 14, 36);

    // Prepare table data
    const tableColumns = ["#", "Expense", "Amount", "Paid By", "Shared With"];
    const tableRows = trip.expenses.map((e, idx) => [
      idx + 1,
      e.title,
      `₹${Number(e.amount).toFixed(2)}`,
      trip.persons.find((p) => p.id === e.paidBy)?.name || "-",
      e.sharedWith.map((id) => trip.persons.find((p) => p.id === id)?.name).filter(Boolean).join(", ")
    ]);

    // autoTable
    doc.autoTable({
      head: [tableColumns],
      body: tableRows,
      startY: 45,
      theme: "grid",
      headStyles: { fillColor: [40, 130, 200], textColor: 255, fontStyle: "bold" },
      bodyStyles: { fillColor: [255, 255, 255], textColor: 30 },
      alternateRowStyles: { fillColor: [240, 248, 255] },
      margin: { left: 14, right: 14 }
    });

    // Totals
    const totalAmount = trip.expenses.reduce((a, e) => a + Number(e.amount), 0);
    const perHead = totalAmount / (trip.persons.length || 1);
    doc.setFontSize(12);
    doc.setTextColor(50, 50, 50);
    doc.setFont("helvetica", "bold");
    doc.text(
      `Total Amount: ₹${totalAmount.toFixed(2)} | Per Head: ₹${perHead.toFixed(2)}`,
      14,
      doc.lastAutoTable.finalY + 10
    );

    // Optional watermark/logo
    // doc.setTextColor(200,200,200);
    // doc.setFontSize(40);
    // doc.text("TripMate", pageWidth/2, 150, { align: "center", angle: 45, opacity: 0.1 });

    // Save PDF
    doc.save(`${trip.name.replace(/\s/g,"_")}_Summary.pdf`);
  } catch (err) {
    console.error("PDF export failed:", err);
    alert("PDF export failed: " + err.message);
  }
}
 
// ---------- UI wiring: populate #tp_shareBtns if exists ----------
function injectShareButtons(trip) {
  const container = el('tp_shareBtns');
  if (!container) return;
  container.innerHTML = '';

  function makeBtn(labelHtml, title, onclick, bgVar='--btn-blue') {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'flex items-center gap-2 px-3 py-1 rounded text-sm';
    b.style.background = `var(${bgVar})`;
    b.style.color = 'var(--text)';
    b.title = title;
    b.innerHTML = labelHtml;
    b.onclick = onclick;
    return b;
  }

  const waHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M20.5 3.5L3.5 20.5"/></svg> WhatsApp`;
   const pdfHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M12 3v10"/></svg> PDF`;
  container.appendChild(makeBtn(waHTML, 'Share via WhatsApp', ()=>shareTripWhatsApp(trip), '--btn-green')); 
  container.appendChild(makeBtn(pdfHTML, 'Export PDF', ()=>exportTripPDF(trip), '--btn-green')); 
}

const ROUTE_STORE_NAME = "trip_routes";
async function openRoutePlanner(tripId) {
  const trip = state.trips.find(t => t.id === tripId);
  if (!trip) return alert("Trip not found");

  if (document.getElementById("routePlannerPopup")) return;
  
  const popup = document.createElement("div");
  popup.id = "routePlannerPopup";
  popup.className = "fixed inset-0 z-[10000] bg-black/50 backdrop-blur-sm flex items-center justify-center p-2 overflow-auto";
  
  popup.innerHTML = `
    <div class="glass w-full max-w-4xl rounded-3xl p-4 md:p-6 relative flex flex-col gap-4 max-h-[95vh] overflow-auto" 
         style="background: var(--glass-bg); border: 1px solid var(--glass-border);">
      <button id="rp_close" class="absolute top-3 right-3 text-gray-600 dark:text-gray-300 text-xl hover:scale-110 transition">✕</button>
      
      <h2 class="text-xl md:text-2xl font-bold mb-2 flex items-center gap-2">
        🗺️ Route Planner - ${trip.name}
      </h2>

      <!-- Tab Navigation -->
      <div class="flex gap-2 border-b border-gray-600 pb-2">
        <button id="rp_tab_plan" class="px-4 py-2 rounded-t font-semibold bg-blue-600 text-white">Plan Route</button>
        <button id="rp_tab_manage" class="px-4 py-2 rounded-t font-semibold text-gray-400">Manage Trip</button>
        <button id="rp_tab_summary" class="px-4 py-2 rounded-t font-semibold text-gray-400">Summary</button>
      </div>

      <!-- TAB 1: PLAN ROUTE -->
      <div id="rp_plan_section" class="space-y-4">
        <div class="glass rounded-2xl p-4" style="background: var(--glass-bg); border: 1px solid var(--glass-border);">
          <h3 class="font-semibold mb-3">📍 Trip Configuration</h3>
          
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label class="text-xs text-gray-400">Start Location</label>
              <input id="rp_start" type="text" placeholder="e.g., Chennai" class="input w-full p-2 rounded border" 
                     style="background: var(--input-bg); color: var(--input-text);">
            </div>
            <div>
              <label class="text-xs text-gray-400">Final Destination</label>
              <input id="rp_destination" type="text" placeholder="e.g., Ooty" class="input w-full p-2 rounded border"
                     style="background: var(--input-bg); color: var(--input-text);">
            </div>
            <div>
              <label class="text-xs text-gray-400">Mode of Travel</label>
              <select id="rp_mode" class="input w-full p-2 rounded border" style="background: var(--input-bg); color: var(--input-text);">
                <option value="car">Car</option>
                <option value="bike">Bike</option>
                <option value="train">Train</option>
                <option value="flight">Flight</option>
              </select>
            </div>
            <div>
              <label class="text-xs text-gray-400">Average Speed (km/h)</label>
              <input id="rp_speed" type="number" value="60" class="input w-full p-2 rounded border"
                     style="background: var(--input-bg); color: var(--input-text);">
            </div>
            <div>
              <label class="text-xs text-gray-400">Daily Travel Hours</label>
              <input id="rp_daily_hours" type="number" value="8" class="input w-full p-2 rounded border"
                     style="background: var(--input-bg); color: var(--input-text);">
            </div>
            <div>
              <label class="text-xs text-gray-400">Max Driving Stretch (hours)</label>
              <input id="rp_max_stretch" type="number" value="2" step="0.5" class="input w-full p-2 rounded border"
                     style="background: var(--input-bg); color: var(--input-text);">
            </div>
            <div>
              <label class="text-xs text-gray-400">Break Time per Stop (min)</label>
              <input id="rp_break_time" type="number" value="15" class="input w-full p-2 rounded border"
                     style="background: var(--input-bg); color: var(--input-text);">
            </div>
            <div>
              <label class="text-xs text-gray-400">Visit Duration per Stop (min)</label>
              <input id="rp_visit_time" type="number" value="30" class="input w-full p-2 rounded border"
                     style="background: var(--input-bg); color: var(--input-text);">
            </div>
            <div>
              <label class="text-xs text-gray-400">Daily Start Time</label>
              <input id="rp_start_time" type="time" value="08:00" class="input w-full p-2 rounded border"
                     style="background: var(--input-bg); color: var(--input-text);">
            </div>
            <div>
              <label class="text-xs text-gray-400">Fuel Price (₹/L)</label>
              <input id="rp_fuel_price" type="number" value="100" class="input w-full p-2 rounded border"
                     style="background: var(--input-bg); color: var(--input-text);">
            </div>
            <div>
              <label class="text-xs text-gray-400">Vehicle Mileage (km/L)</label>
              <input id="rp_mileage" type="number" value="15" class="input w-full p-2 rounded border"
                     style="background: var(--input-bg); color: var(--input-text);">
            </div>
          </div>

          <div class="mt-3">
            <label class="text-xs text-gray-400">Intermediate Stops (comma separated)</label>
            <textarea id="rp_stops" placeholder="e.g., Pondicherry, Salem, Coimbatore" rows="2" 
                      class="input w-full p-2 rounded border" 
                      style="background: var(--input-bg); color: var(--input-text);"></textarea>
          </div>

          <button id="rp_generate" class="mt-4 px-6 py-2 rounded font-semibold" 
                  style="background: var(--btn-green); color: var(--text);">
            🚀 Generate Itinerary
          </button>
        </div>

        <div id="rp_itinerary_display" class="hidden glass rounded-2xl p-4" 
             style="background: var(--glass-bg); border: 1px solid var(--glass-border);">
          <h3 class="font-semibold mb-3">📋 Generated Itinerary</h3>
          <div id="rp_itinerary_content"></div>
          <button id="rp_save_route" class="mt-4 px-6 py-2 rounded font-semibold" 
                  style="background: var(--btn-blue); color: var(--text);">
            💾 Save Route Plan
          </button>
        </div>
      </div>

      <!-- TAB 2: MANAGE TRIP -->
      <div id="rp_manage_section" class="hidden space-y-4">
        <div id="rp_no_route" class="text-center text-gray-400 py-8">
          No route plan created yet. Switch to "Plan Route" tab to create one.
        </div>
        
        <div id="rp_active_route" class="hidden space-y-4">
          <!-- Current Status -->
          <div class="glass rounded-2xl p-4" style="background: var(--glass-bg); border: 1px solid var(--glass-border);">
            <h3 class="font-semibold mb-3">📍 Current Status</h3>
            <div id="rp_current_status" class="space-y-2"></div>
          </div>

          <!-- Today's Itinerary -->
          <div class="glass rounded-2xl p-4" style="background: var(--glass-bg); border: 1px solid var(--glass-border);">
            <h3 class="font-semibold mb-3">🗓️ Today's Plan (Day <span id="rp_current_day">1</span>)</h3>
            <div id="rp_today_plan" class="space-y-2"></div>
          </div>

          <!-- Quick Actions -->
          <div class="glass rounded-2xl p-4" style="background: var(--glass-bg); border: 1px solid var(--glass-border);">
            <h3 class="font-semibold mb-3">⚡ Quick Actions</h3>
            <div class="flex flex-wrap gap-2">
              <button id="rp_next_stop" class="px-4 py-2 rounded" style="background: var(--btn-green); color: var(--text);">
                ➡️ Next Stop
              </button>
              <button id="rp_mark_delay" class="px-4 py-2 rounded" style="background: var(--btn-red); color: var(--text);">
                ⏱️ Report Delay
              </button>
              <button id="rp_end_day" class="px-4 py-2 rounded" style="background: var(--btn-blue); color: var(--text);">
                🌙 End Today
              </button>
            </div>
          </div>

          <!-- Progress Visualization -->
          <div class="glass rounded-2xl p-4" style="background: var(--glass-bg); border: 1px solid var(--glass-border);">
            <h3 class="font-semibold mb-3">📊 Progress</h3>
            <div id="rp_progress_viz"></div>
          </div>
        </div>
      </div>

      <!-- TAB 3: SUMMARY -->
      <div id="rp_summary_section" class="hidden">
        <div id="rp_trip_summary" class="glass rounded-2xl p-4" 
             style="background: var(--glass-bg); border: 1px solid var(--glass-border);">
          <h3 class="font-semibold mb-3">📊 Trip Summary</h3>
          <div id="rp_summary_content"></div>
        </div>
      </div>
    </div>

    <!-- Delay Modal -->
    <div id="rp_delay_modal" class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center hidden z-[10001] p-2">
      <div class="glass w-full max-w-sm rounded-2xl p-4 flex flex-col gap-3" 
           style="background: var(--glass-bg); border: 1px solid var(--glass-border);">
        <h3 class="text-lg font-semibold">⏱️ Report Delay</h3>
        <input id="rp_delay_minutes" type="number" placeholder="Delay in minutes" class="input w-full p-2 rounded border"
               style="background: var(--input-bg); color: var(--input-text);">
        <div class="flex gap-2">
          <button id="rp_cancel_delay" class="flex-1 py-2 rounded" style="background: var(--btn-red); color: var(--text);">Cancel</button>
          <button id="rp_save_delay" class="flex-1 py-2 rounded" style="background: var(--btn-green); color: var(--text);">Save</button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(popup);

  // Initialize
  loadRouteForTrip(tripId);
  setupRouteEventHandlers(tripId);
}

// Setup Event Handlers
function setupRouteEventHandlers(tripId) {
  const el = (id) => document.getElementById(id);

  // Close button
  el("rp_close").onclick = () => document.getElementById("routePlannerPopup").remove();

  // Tab switching
  el("rp_tab_plan").onclick = () => switchTab("plan");
  el("rp_tab_manage").onclick = () => switchTab("manage");
  el("rp_tab_summary").onclick = () => switchTab("summary");

  // Generate itinerary
  el("rp_generate").onclick = () => generateItinerary(tripId);
  
  // Save route
  el("rp_save_route")?.addEventListener("click", () => saveRoutePlan(tripId));

  // Management actions
  el("rp_next_stop")?.addEventListener("click", () => moveToNextStop(tripId));
  el("rp_mark_delay")?.addEventListener("click", () => el("rp_delay_modal").classList.remove("hidden"));
  el("rp_end_day")?.addEventListener("click", () => endCurrentDay(tripId));

  // Delay modal
  el("rp_cancel_delay").onclick = () => el("rp_delay_modal").classList.add("hidden");
  el("rp_save_delay").onclick = () => saveDelay(tripId);
}

// Switch tabs
function switchTab(tab) {
  const el = (id) => document.getElementById(id);
  
  // Hide all sections
  el("rp_plan_section").classList.add("hidden");
  el("rp_manage_section").classList.add("hidden");
  el("rp_summary_section").classList.add("hidden");

  // Reset tab styles
  ["rp_tab_plan", "rp_tab_manage", "rp_tab_summary"].forEach(id => {
    el(id).classList.remove("bg-blue-600", "text-white");
    el(id).classList.add("text-gray-400");
  });

  // Show selected section
  if (tab === "plan") {
    el("rp_plan_section").classList.remove("hidden");
    el("rp_tab_plan").classList.add("bg-blue-600", "text-white");
    el("rp_tab_plan").classList.remove("text-gray-400");
  } else if (tab === "manage") {
    el("rp_manage_section").classList.remove("hidden");
    el("rp_tab_manage").classList.add("bg-blue-600", "text-white");
    el("rp_tab_manage").classList.remove("text-gray-400");
    refreshManageView();
  } else if (tab === "summary") {
    el("rp_summary_section").classList.remove("hidden");
    el("rp_tab_summary").classList.add("bg-blue-600", "text-white");
    el("rp_tab_summary").classList.remove("text-gray-400");
    refreshSummaryView();
  }
}

// Generate Itinerary
function generateItinerary(tripId) {
  const el = (id) => document.getElementById(id);
  
  const start = el("rp_start").value.trim();
  const destination = el("rp_destination").value.trim();
  const stopsText = el("rp_stops").value.trim();
  const mode = el("rp_mode").value;
  const speed = parseFloat(el("rp_speed").value) || 60;
  const dailyHours = parseFloat(el("rp_daily_hours").value) || 8;
  const maxStretch = parseFloat(el("rp_max_stretch").value) || 2;
  const breakTime = parseInt(el("rp_break_time").value) || 15;
  const visitTime = parseInt(el("rp_visit_time").value) || 30;
  const startTime = el("rp_start_time").value || "08:00";
  const fuelPrice = parseFloat(el("rp_fuel_price").value) || 100;
  const mileage = parseFloat(el("rp_mileage").value) || 15;

  if (!start || !destination) return alert("Start and destination are required");

  const stops = stopsText ? stopsText.split(",").map(s => s.trim()).filter(Boolean) : [];
  const allLocations = [start, ...stops, destination];

  // Show distance input modal
  showDistanceInputModal(allLocations, {
    tripId, start, destination, stops, mode, speed, dailyHours, maxStretch,
    breakTime, visitTime, startTime, fuelPrice, mileage
  });
}

// Show modal to input distances
function showDistanceInputModal(locations, config) {
  // Create modal
  const modal = document.createElement('div');
  modal.id = 'rp_distance_modal';
  modal.className = 'fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[10002] p-2';
  
  let distanceInputs = '';
  for (let i = 0; i < locations.length - 1; i++) {
    distanceInputs += `
      <div class="flex items-center gap-2 mb-2">
        <span class="text-sm flex-1">${locations[i]} → ${locations[i + 1]}</span>
        <input type="number" 
               id="rp_dist_${i}" 
               placeholder="km" 
               min="1"
               class="w-24 p-2 rounded border text-sm" 
               style="background: var(--input-bg); color: var(--input-text); border: 1px solid var(--input-border);">
        <span class="text-xs text-gray-400">km</span>
      </div>
    `;
  }

  modal.innerHTML = `
    <div class="glass w-full max-w-md rounded-2xl p-4 flex flex-col gap-3 max-h-[80vh] overflow-auto" 
         style="background: var(--glass-bg); border: 1px solid var(--glass-border);">
      <h3 class="text-lg font-semibold mb-1">📏 Enter Distances</h3>
      <p class="text-xs text-gray-400 mb-2">Enter the distance in kilometers for each segment</p>
      
      <div class="space-y-2 max-h-[50vh] overflow-auto">
        ${distanceInputs}
      </div>

      <div class="flex gap-2 mt-3">
        <button id="rp_cancel_distance" class="flex-1 py-2 rounded" 
                style="background: var(--btn-red); color: var(--text);">
          Cancel
        </button>
        <button id="rp_auto_estimate" class="flex-1 py-2 rounded text-sm" 
                style="background: var(--btn-blue); color: var(--text);">
          Auto Estimate
        </button>
        <button id="rp_save_distance" class="flex-1 py-2 rounded" 
                style="background: var(--btn-green); color: var(--text);">
          Generate
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  // Event handlers
  document.getElementById('rp_cancel_distance').onclick = () => modal.remove();
  
  document.getElementById('rp_auto_estimate').onclick = () => {
    // Auto-fill with estimated distances (50-200km range based on realistic travel)
    for (let i = 0; i < locations.length - 1; i++) {
      const estimatedDistance = 80 + Math.floor(Math.random() * 120); // 80-200 km
      document.getElementById(`rp_dist_${i}`).value = estimatedDistance;
    }
  };

  document.getElementById('rp_save_distance').onclick = () => {
    const distances = [];
    let hasError = false;

    for (let i = 0; i < locations.length - 1; i++) {
      const distInput = document.getElementById(`rp_dist_${i}`);
      const dist = parseFloat(distInput.value);
      
      if (!dist || dist <= 0) {
        distInput.classList.add('border-red-500');
        hasError = true;
      } else {
        distInput.classList.remove('border-red-500');
        distances.push(dist);
      }
    }

    if (hasError) {
      return alert("Please enter valid distances for all segments");
    }

    modal.remove();
    continueGenerateItinerary(locations, distances, config);
  };
}

// Continue generating itinerary with user-provided distances
function continueGenerateItinerary(allLocations, distances, config) {
  const { tripId, start, destination, stops, mode, speed, dailyHours, maxStretch,
          breakTime, visitTime, startTime, fuelPrice, mileage } = config;

  // Create segments with actual distances
  const segments = [];
  for (let i = 0; i < allLocations.length - 1; i++) {
    const distance = distances[i];
    segments.push({
      from: allLocations[i],
      to: allLocations[i + 1],
      distance: distance,
      time: distance / speed
    });
  }

  // Create day-by-day plan
  const dailyKm = dailyHours * speed;
  const days = [];
  let currentDay = { day: 1, segments: [], totalDistance: 0, totalTime: 0, stops: [] };
  let currentLocation = start;

  segments.forEach((seg, idx) => {
    if (currentDay.totalDistance + seg.distance > dailyKm && currentDay.segments.length > 0) {
      // Save current day and start new day
      currentDay.endLocation = currentLocation;
      days.push(currentDay);
      currentDay = { 
        day: days.length + 1, 
        segments: [], 
        totalDistance: 0, 
        totalTime: 0, 
        stops: [],
        startLocation: currentLocation 
      };
    }

    currentDay.segments.push(seg);
    currentDay.totalDistance += seg.distance;
    currentDay.totalTime += seg.time;
    currentDay.stops.push({
      name: seg.to,
      distance: seg.distance,
      arrivalTime: null,
      visitDuration: visitTime,
      breakDuration: breakTime,
      status: "pending"
    });
    currentLocation = seg.to;
  });

  if (currentDay.segments.length > 0) {
    currentDay.endLocation = destination;
    days.push(currentDay);
  }

  // Calculate times
  days.forEach(day => {
    let currentTime = parseTime(startTime);
    day.startTime = formatTime(currentTime);
    
    day.stops.forEach((stop, idx) => {
      const segment = day.segments[idx];
      currentTime += segment.time * 60; // travel time
      stop.arrivalTime = formatTime(currentTime);
      currentTime += stop.visitDuration + stop.breakDuration;
    });
    
    day.endTime = formatTime(currentTime);
  });

  // Calculate costs
  const totalDistance = segments.reduce((sum, s) => sum + s.distance, 0);
  const fuelCost = (totalDistance / mileage) * fuelPrice;

  const routePlan = {
    tripId,
    config: {
      start, destination, stops, mode, speed, dailyHours, maxStretch,
      breakTime, visitTime, startTime, fuelPrice, mileage
    },
    days,
    totalDistance,
    totalTime: segments.reduce((sum, s) => sum + s.time, 0),
    fuelCost,
    currentDay: 1,
    currentStopIndex: 0,
    totalDelay: 0,
    completedStops: 0,
    skippedStops: 0,
    status: "planned",
    createdAt: new Date().toISOString()
  };

  // Display itinerary
  displayItinerary(routePlan);
  
  // Store temporarily
  window._tempRoutePlan = routePlan;
}

// Display generated itinerary
function displayItinerary(plan) {
  const el = (id) => document.getElementById(id);
  const content = el("rp_itinerary_content");
  
  let html = `
    <div class="space-y-4">
      <div class="flex justify-between text-sm border-b border-gray-600 pb-2">
        <span>Total Distance: <strong>${plan.totalDistance.toFixed(0)} km</strong></span>
        <span>Total Time: <strong>${plan.totalTime.toFixed(1)} hrs</strong></span>
        <span>Fuel Cost: <strong>₹${plan.fuelCost.toFixed(0)}</strong></span>
      </div>
  `;

  plan.days.forEach(day => {
    html += `
      <div class="border border-gray-600 rounded-lg p-3">
        <div class="flex justify-between items-center mb-2">
          <h4 class="font-semibold text-blue-400">Day ${day.day}</h4>
          <span class="text-xs text-gray-400">${day.startTime} - ${day.endTime}</span>
        </div>
        
        <div class="text-sm space-y-1 mb-2">
          <div>📍 Start: ${day.startLocation || day.stops[0]?.name || plan.config.start}</div>
          <div>🏁 End: ${day.endLocation}</div>
          <div>🚗 Distance: ${day.totalDistance.toFixed(0)} km | Time: ${day.totalTime.toFixed(1)} hrs</div>
        </div>

        <div class="space-y-2">
    `;

    day.stops.forEach((stop, idx) => {
      html += `
        <div class="flex items-center gap-2 text-xs p-2 rounded" 
             style="background: rgba(255,255,255,0.05);">
          <span class="text-gray-400">${idx + 1}.</span>
          <div class="flex-1">
            <div class="font-medium">${stop.name}</div>
            <div class="text-gray-400">
              Arrive: ${stop.arrivalTime} | 
              Visit: ${stop.visitDuration}m | 
              Break: ${stop.breakDuration}m | 
              Distance: ${day.segments[idx].distance.toFixed(0)} km
            </div>
          </div>
        </div>
      `;
    });

    html += `
        </div>
      </div>
    `;
  });

  html += `</div>`;
  content.innerHTML = html;
  el("rp_itinerary_display").classList.remove("hidden");
}

// Save route plan
async function saveRoutePlan(tripId) {
  const plan = window._tempRoutePlan;
  if (!plan) return alert("No route plan to save");

  // Save to state
  if (!state.routes) state.routes = [];
  const existingIdx = state.routes.findIndex(r => r.tripId === tripId);
  
  if (existingIdx > -1) {
    state.routes[existingIdx] = plan;
  } else {
    state.routes.push(plan);
  }

  // Save to IndexedDB
  await put(ROUTE_STORE_NAME, plan);
  
  alert("Route plan saved successfully!");
  switchTab("manage");
}

// Load route for trip
async function loadRouteForTrip(tripId) {
  if (!state.routes) state.routes = [];
  
  const route = state.routes.find(r => r.tripId === tripId);
  if (route) {
    window._currentRoute = route;
  }
}

// Refresh manage view
function refreshManageView() {
  const route = window._currentRoute;
  const el = (id) => document.getElementById(id);

  if (!route) {
    const noRoute = el("rp_no_route");
    const activeRoute = el("rp_active_route");
    if (noRoute) noRoute.classList.remove("hidden");
    if (activeRoute) activeRoute.classList.add("hidden");
    return;
  }

  const noRoute = el("rp_no_route");
  const activeRoute = el("rp_active_route");
  if (noRoute) noRoute.classList.add("hidden");
  if (activeRoute) activeRoute.classList.remove("hidden");

  const currentDay = route.days[route.currentDay - 1];
  if (!currentDay) return;

  // Current status
  const completed = route.completedStops;
  const total = route.days.reduce((sum, d) => sum + d.stops.length, 0);
  const progress = Math.round((completed / total) * 100);

  const statusEl = el("rp_current_status");
  if (statusEl) {
    statusEl.innerHTML = `
      <div class="grid grid-cols-2 gap-2 text-sm">
        <div>Day: <strong>${route.currentDay}/${route.days.length}</strong></div>
        <div>Progress: <strong>${progress}%</strong></div>
        <div>Completed: <strong>${route.completedStops}</strong></div>
        <div>Skipped: <strong>${route.skippedStops}</strong></div>
        <div>Delay: <strong>${route.totalDelay} min</strong></div>
        <div>Status: <strong class="text-green-400">${route.status}</strong></div>
      </div>
    `;
  }

  // Today's plan
  const currentDayEl = el("rp_current_day");
  if (currentDayEl) {
    currentDayEl.textContent = route.currentDay;
  }
  
  let planHtml = `
    <div class="space-y-2">
      <div class="text-xs text-gray-400">
        ${currentDay.startTime || "N/A"} - ${currentDay.endTime || "N/A"} | 
        ${currentDay.totalDistance.toFixed(0)} km
      </div>
  `;

  currentDay.stops.forEach((stop, idx) => {
    const isCurrent = idx === route.currentStopIndex;
    const statusIcon = stop.status === "completed" ? "✅" : stop.status === "skipped" ? "⏭️" : "⏳";
    const statusColor = stop.status === "completed" ? "text-green-400" : stop.status === "skipped" ? "text-yellow-400" : "text-gray-400";

    planHtml += `
      <div class="flex items-center gap-2 p-2 rounded ${isCurrent ? 'border-2 border-blue-500' : 'border border-gray-600'}">
        <span class="${statusColor}">${statusIcon}</span>
        <div class="flex-1 text-sm">
          <div class="font-medium">${stop.name} ${isCurrent ? '← Current' : ''}</div>
          <div class="text-xs text-gray-400">
            ETA: ${stop.arrivalTime || "N/A"} | Visit: ${stop.visitDuration}m
          </div>
        </div>
        ${stop.status === "pending" ? `
          <div class="flex gap-1">
            <button onclick="markStopCompleted('${idx}')" class="text-xs px-2 py-1 rounded bg-green-600">✓</button>
            <button onclick="markStopSkipped('${idx}')" class="text-xs px-2 py-1 rounded bg-yellow-600">Skip</button>
          </div>
        ` : ''}
      </div>
    `;
  });

  planHtml += `</div>`;
  const todayPlanEl = el("rp_today_plan");
  if (todayPlanEl) {
    todayPlanEl.innerHTML = planHtml;
  }

  // Progress visualization
  renderProgressVisualization(route);
}

// Render progress visualization
function renderProgressVisualization(route) {
  const el = (id) => document.getElementById(id);
  const total = route.days.reduce((sum, d) => sum + d.stops.length, 0);
  const completed = route.completedStops;
  const progress = Math.round((completed / total) * 100);

  let html = `
    <div class="space-y-3">
      <div class="flex items-center gap-2">
        <div class="flex-1 bg-gray-700 rounded-full h-4 overflow-hidden">
          <div class="bg-green-500 h-full transition-all" style="width: ${progress}%"></div>
        </div>
        <span class="text-sm font-semibold">${progress}%</span>
      </div>

      <div class="text-xs text-center text-gray-400">
        ${completed} of ${total} stops completed
      </div>

      <div class="border border-gray-600 rounded p-2 font-mono text-xs overflow-x-auto">
  `;

  route.days.forEach((day, dayIdx) => {
    html += `<div class="mb-2">${dayIdx === route.currentDay - 1 ? '→ ' : '  '}Day ${day.day}</div>`;
    
    day.stops.forEach((stop, stopIdx) => {
      const symbol = stop.status === "completed" ? "■" : stop.status === "skipped" ? "○" : "□";
      const color = stop.status === "completed" ? "text-green-400" : stop.status === "skipped" ? "text-yellow-400" : "text-gray-500";
      html += `<span class="${color}">${symbol}</span>`;
    });
    html += `<br>`;
  });

  html += `
      </div>
    </div>
  `;

  el("rp_progress_viz").innerHTML = html;
}

// Mark stop completed
window.markStopCompleted = async function(stopIndex) {
  const route = window._currentRoute;
  if (!route) return;

  const currentDay = route.days[route.currentDay - 1];
  const stop = currentDay.stops[stopIndex];
  
  stop.status = "completed";
  stop.completedAt = new Date().toISOString();
  route.completedStops++;
  route.currentStopIndex = parseInt(stopIndex) + 1;

  await put(ROUTE_STORE_NAME, route);
  refreshManageView();
};

// Mark stop skipped
window.markStopSkipped = async function(stopIndex) {
  const route = window._currentRoute;
  if (!route) return;

  const currentDay = route.days[route.currentDay - 1];
  const stop = currentDay.stops[stopIndex];
  
  stop.status = "skipped";
  stop.skippedAt = new Date().toISOString();
  route.skippedStops++;
  route.currentStopIndex = parseInt(stopIndex) + 1;

  await put(ROUTE_STORE_NAME, route);
  refreshManageView();
};

// Move to next stop
async function moveToNextStop(tripId) {
  const route = window._currentRoute;
  if (!route) return;

  const currentDay = route.days[route.currentDay - 1];
  if (route.currentStopIndex >= currentDay.stops.length) {
    return alert("No more stops for today. Use 'End Today' to move to next day.");
  }

  const currentStop = currentDay.stops[route.currentStopIndex];
  if (currentStop.status === "pending") {
    if (!confirm(`Mark ${currentStop.name} as completed?`)) return;
    currentStop.status = "completed";
    currentStop.completedAt = new Date().toISOString();
    route.completedStops++;
  }

  route.currentStopIndex++;
  await put(ROUTE_STORE_NAME, route);
  refreshManageView();
}

// End current day
async function endCurrentDay(tripId) {
  const route = window._currentRoute;
  if (!route) return;

  if (!confirm("End today's journey and move to next day?")) return;

  const currentDay = route.days[route.currentDay - 1];
  currentDay.status = "completed";
  currentDay.completedAt = new Date().toISOString();

  // Mark pending stops as skipped
  currentDay.stops.forEach(stop => {
    if (stop.status === "pending") {
      stop.status = "skipped";
      route.skippedStops++;
    }
  });

  route.currentDay++;
  route.currentStopIndex = 0;

  if (route.currentDay > route.days.length) {
    route.status = "completed";
    alert("🎉 Trip completed! Check summary for details.");
  }

  await put(ROUTE_STORE_NAME, route);
  refreshManageView();
}

// Save delay
async function saveDelay(tripId) {
  const el = (id) => document.getElementById(id);
  const delayMinutes = parseInt(el("rp_delay_minutes").value);

  if (!delayMinutes || delayMinutes <= 0) {
    return alert("Enter valid delay in minutes");
  }

  const route = window._currentRoute;
  if (!route) return;

  route.totalDelay += delayMinutes;

  // Adjust remaining stops
  const currentDay = route.days[route.currentDay - 1];
  const remainingStops = currentDay.stops.slice(route.currentStopIndex);

  if (remainingStops.length > 0) {
    const delayPerStop = Math.floor(delayMinutes / remainingStops.length);
    
    remainingStops.forEach((stop, idx) => {
      const [hours, minutes] = stop.arrivalTime.split(":").map(Number);
      const totalMinutes = hours * 60 + minutes + delayPerStop;
      stop.arrivalTime = formatTime(totalMinutes);
    });

    // Update end time
    const lastStop = remainingStops[remainingStops.length - 1];
    const [h, m] = lastStop.arrivalTime.split(":").map(Number);
    currentDay.endTime = formatTime(h * 60 + m + lastStop.visitDuration + lastStop.breakDuration);
  }

  await put(ROUTE_STORE_NAME, route);
  el("rp_delay_modal").classList.add("hidden");
  el("rp_delay_minutes").value = "";
  
  alert(`Delay of ${delayMinutes} minutes recorded. Remaining schedule adjusted.`);
  refreshManageView();
}

function injectRoutePlannerButton(trip) {
  const container = document.getElementById('tp_shareBtns');
  if (!container) return;
  
  // Check if button already exists
  if (document.getElementById('tp_routePlannerBtn')) return;
  
  const btn = document.createElement('button');
  btn.id = 'tp_routePlannerBtn';
  btn.type = 'button';
  btn.className = 'flex items-center gap-2 px-3 py-1 rounded text-sm';
  btn.style.background = 'var(--btn-blue)';
  btn.style.color = 'var(--text)';
  btn.innerHTML = `🗺️ Route Planner`;
  btn.title = 'Plan multi-day route with stops';
  btn.onclick = () => openRoutePlanner(trip.id);
  
  container.appendChild(btn);
}

// Alternative: Add as separate section in trip details
function addRoutePlannerSection(trip) {
  const detailsSection = document.getElementById('tp_tripDetails');
  if (!detailsSection) return;
  
  // Check if section already exists
  if (document.getElementById('tp_routePlannerSection')) return;
  
  const section = document.createElement('div');
  section.id = 'tp_routePlannerSection';
  section.className = 'mt-4 p-3 rounded-lg border border-blue-600/40 bg-blue-600/10';
  section.innerHTML = `
    <div class="flex justify-between items-center">
      <div>
        <h4 class="font-semibold text-blue-400">🗺️ Route Planning</h4>
        <p class="text-xs text-gray-400">Plan multi-day itinerary with stops & real-time tracking</p>
      </div>
      <button onclick="openRoutePlanner('${trip.id}')" 
              class="px-4 py-2 rounded font-semibold whitespace-nowrap"
              style="background: var(--btn-blue); color: var(--text);">
        Open Planner
      </button>
    </div>
  `;
  
  // Insert before share buttons section
  const shareSection = document.getElementById('tp_shareBtns')?.parentElement;
  if (shareSection) {
    shareSection.parentElement.insertBefore(section, shareSection);
  } else {
    detailsSection.appendChild(section);
  }
}

// Add this to your state initialization
if (typeof state !== 'undefined' && !state.routes) {
  state.routes = [];
}

// Load routes from IndexedDB on startup
async function loadRoutesFromDB() {
  try {
    const db = await openDB();
    const tx = db.transaction(ROUTE_STORE_NAME, 'readonly');
    const store = tx.objectStore(ROUTE_STORE_NAME);
    const request = store.getAll();
    
    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        state.routes = request.result || [];
        resolve(state.routes);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error('Failed to load routes:', err);
    return [];
  }
}

// Call this when your app initializes
// loadRoutesFromDB();

// =====================================================================
// ENHANCED FEATURES: Voice Commands & Notifications
// =====================================================================

// Voice command integration (optional)
function initVoiceCommands() {
  if (!('webkitSpeechRecognition' in window)) {
    console.log('Voice recognition not supported');
    return;
  }

  const recognition = new webkitSpeechRecognition();
  recognition.continuous = false;
  recognition.lang = 'en-IN';

  recognition.onresult = (event) => {
    const command = event.results[0][0].transcript.toLowerCase();
    
    if (command.includes('next stop')) {
      moveToNextStop(window._currentRoute?.tripId);
    } else if (command.includes('mark completed')) {
      const route = window._currentRoute;
      if (route) {
        markStopCompleted(route.currentStopIndex);
      }
    } else if (command.includes('skip stop')) {
      const route = window._currentRoute;
      if (route) {
        markStopSkipped(route.currentStopIndex);
      }
    } else if (command.includes('end day')) {
      endCurrentDay(window._currentRoute?.tripId);
    }
  };

  window._voiceRecognition = recognition;
}

// Start voice recognition
function startVoiceCommand() {
  if (window._voiceRecognition) {
    window._voiceRecognition.start();
  }
}

// =====================================================================
// ENHANCED UI: Add voice button to manage section
// =====================================================================

function addVoiceButton() {
  const manageSection = document.getElementById('rp_manage_section');
  if (!manageSection) return;

  const voiceBtn = document.createElement('button');
  voiceBtn.className = 'px-4 py-2 rounded';
  voiceBtn.style.background = 'var(--btn-blue)';
  voiceBtn.style.color = 'var(--text)';
  voiceBtn.innerHTML = '🎤 Voice Command';
  voiceBtn.onclick = startVoiceCommand;
  
  const quickActions = manageSection.querySelector('.flex.flex-wrap.gap-2');
  if (quickActions) {
    quickActions.appendChild(voiceBtn);
  }
}

// =====================================================================
// GEOLOCATION: Track actual location (optional)
// =====================================================================

let watchId = null;

function startLocationTracking() {
  if (!navigator.geolocation) {
    alert('Geolocation not supported');
    return;
  }

  watchId = navigator.geolocation.watchPosition(
    (position) => {
      const { latitude, longitude } = position.coords;
      console.log('Current location:', latitude, longitude);
      
      // You can implement:
      // 1. Auto-detect when reached a stop
      // 2. Calculate real-time distance to next stop
      // 3. Update ETA based on current speed
      
      updateLocationDisplay(latitude, longitude);
    },
    (error) => {
      console.error('Location error:', error);
    },
    {
      enableHighAccuracy: true,
      maximumAge: 10000,
      timeout: 5000
    }
  );
}

function stopLocationTracking() {
  if (watchId !== null) {
    navigator.geolocation.clearWatch(watchId);
    watchId = null;
  }
}

function updateLocationDisplay(lat, lng) {
  const statusDiv = document.getElementById('rp_current_status');
  if (!statusDiv) return;
  
  const locationDiv = document.createElement('div');
  locationDiv.className = 'text-xs text-gray-400 mt-2';
  locationDiv.innerHTML = `📍 Current: ${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  
  // Remove old location display
  const oldLocation = statusDiv.querySelector('.text-xs.text-gray-400.mt-2');
  if (oldLocation) oldLocation.remove();
  
  statusDiv.appendChild(locationDiv);
}

// =====================================================================
// WEATHER API: Fetch weather for stops (optional)
// =====================================================================

async function fetchWeatherForStop(location) {
  // You can integrate with OpenWeatherMap or similar API
  // For now, returning mock data
  
  return {
    temp: 25 + Math.random() * 10,
    condition: ['Sunny', 'Cloudy', 'Rainy'][Math.floor(Math.random() * 3)],
    icon: '☀️'
  };
}

// Add weather info to stops
async function enrichStopsWithWeather(route) {
  for (const day of route.days) {
    for (const stop of day.stops) {
      if (!stop.weather) {
        stop.weather = await fetchWeatherForStop(stop.name);
      }
    }
  }
  return route;
}
// =====================================================================
// TIME UTILITY FUNCTIONS
// =====================================================================

/**
 * Parse time string (HH:MM) to total minutes
 * @param {string} timeStr - Time in format "HH:MM" (e.g., "08:30")
 * @returns {number} - Total minutes (e.g., 510 for "08:30")
 */
function parseTime(timeStr) {
  if (!timeStr || typeof timeStr !== 'string') {
    console.warn('Invalid time string:', timeStr);
    return 0;
  }
  
  const [hours, minutes] = timeStr.split(":").map(Number);
  
  if (isNaN(hours) || isNaN(minutes)) {
    console.warn('Invalid time format:', timeStr);
    return 0;
  }
  
  return hours * 60 + minutes;
}

/**
 * Format total minutes to time string (HH:MM)
 * @param {number} totalMinutes - Total minutes (e.g., 510)
 * @returns {string} - Time in format "HH:MM" (e.g., "08:30")
 */
function formatTime(totalMinutes) {
  if (typeof totalMinutes !== 'number' || isNaN(totalMinutes)) {
    console.warn('Invalid minutes value:', totalMinutes);
    return "00:00";
  }
  
  // Handle negative times by wrapping around 24 hours
  let minutes = totalMinutes;
  while (minutes < 0) {
    minutes += 24 * 60;
  }
  
  // Handle times exceeding 24 hours
  minutes = minutes % (24 * 60);
  
  const h = Math.floor(minutes / 60);
  const m = Math.floor(minutes % 60);
  
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

/**
 * Add minutes to a time string
 * @param {string} timeStr - Starting time "HH:MM"
 * @param {number} minutesToAdd - Minutes to add
 * @returns {string} - New time in format "HH:MM"
 */
function addMinutesToTime(timeStr, minutesToAdd) {
  const totalMinutes = parseTime(timeStr);
  return formatTime(totalMinutes + minutesToAdd);
}

/**
 * Calculate difference between two times in minutes
 * @param {string} startTime - Start time "HH:MM"
 * @param {string} endTime - End time "HH:MM"
 * @returns {number} - Difference in minutes
 */
function timeDifferenceInMinutes(startTime, endTime) {
  const start = parseTime(startTime);
  let end = parseTime(endTime);
  
  // Handle cases where end time is next day
  if (end < start) {
    end += 24 * 60;
  }
  
  return end - start;
}

/**
 * Format minutes to human-readable duration
 * @param {number} minutes - Total minutes
 * @returns {string} - Formatted string (e.g., "2h 30m")
 */
function formatDuration(minutes) {
  if (typeof minutes !== 'number' || isNaN(minutes)) {
    return "0m";
  }
  
  const hours = Math.floor(minutes / 60);
  const mins = Math.floor(minutes % 60);
  
  if (hours > 0 && mins > 0) {
    return `${hours}h ${mins}m`;
  } else if (hours > 0) {
    return `${hours}h`;
  } else {
    return `${mins}m`;
  }
}

/**
 * Convert hours (decimal) to minutes
 * @param {number} hours - Hours as decimal (e.g., 2.5)
 * @returns {number} - Total minutes (e.g., 150)
 */
function hoursToMinutes(hours) {
  return Math.round(hours * 60);
}

/**
 * Convert minutes to hours (decimal)
 * @param {number} minutes - Total minutes
 * @returns {number} - Hours as decimal (e.g., 2.5)
 */
function minutesToHours(minutes) {
  return minutes / 60;
}

/**
 * Check if time is within a range
 * @param {string} time - Time to check "HH:MM"
 * @param {string} startRange - Start of range "HH:MM"
 * @param {string} endRange - End of range "HH:MM"
 * @returns {boolean} - True if time is within range
 */
function isTimeInRange(time, startRange, endRange) {
  const timeMinutes = parseTime(time);
  const startMinutes = parseTime(startRange);
  let endMinutes = parseTime(endRange);
  
  // Handle overnight ranges
  if (endMinutes < startMinutes) {
    endMinutes += 24 * 60;
    if (timeMinutes < startMinutes) {
      return timeMinutes + 24 * 60 <= endMinutes;
    }
  }
  
  return timeMinutes >= startMinutes && timeMinutes <= endMinutes;
}

/**
 * Get current time as "HH:MM" string
 * @returns {string} - Current time in format "HH:MM"
 */
function getCurrentTime() {
  const now = new Date();
  const hours = now.getHours();
  const minutes = now.getMinutes();
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

/**
 * Parse time with AM/PM format
 * @param {string} timeStr - Time in format "HH:MM AM/PM"
 * @returns {string} - Time in 24-hour format "HH:MM"
 */
function parse12HourTime(timeStr) {
  const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!match) return "00:00";
  
  let hours = parseInt(match[1]);
  const minutes = parseInt(match[2]);
  const period = match[3].toUpperCase();
  
  if (period === 'PM' && hours !== 12) {
    hours += 12;
  } else if (period === 'AM' && hours === 12) {
    hours = 0;
  }
  
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

/**
 * Format time to 12-hour format with AM/PM
 * @param {string} timeStr - Time in 24-hour format "HH:MM"
 * @returns {string} - Time in 12-hour format "HH:MM AM/PM"
 */
function format12HourTime(timeStr) {
  const [hours24, minutes] = timeStr.split(':').map(Number);
  
  const period = hours24 >= 12 ? 'PM' : 'AM';
  let hours12 = hours24 % 12;
  if (hours12 === 0) hours12 = 12;
  
  return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`;
}

function refreshSummaryView() {
  const route = window._currentRoute;
  const el = (id) => document.getElementById(id);

  if (!route) {
    const summaryContent = el("rp_summary_content");
    if (summaryContent) {
      summaryContent.innerHTML = `<p class="text-gray-400 text-center py-8">No route data available</p>`;
    }
    return;
  }

  const totalStops = route.days.reduce((sum, d) => sum + d.stops.length, 0);
  const avgSpeed = route.config.speed;
  const fuelCostPerDay = route.fuelCost / route.days.length;

  let html = `
    <div class="space-y-4">
      <!-- Overall Statistics -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div class="p-3 rounded-lg bg-blue-600/20 border border-blue-600/40">
          <div class="text-xs text-gray-400">Total Distance</div>
          <div class="text-lg font-bold">${route.totalDistance.toFixed(0)} km</div>
        </div>
        <div class="p-3 rounded-lg bg-green-600/20 border border-green-600/40">
          <div class="text-xs text-gray-400">Completed</div>
          <div class="text-lg font-bold">${route.completedStops}/${totalStops}</div>
        </div>
        <div class="p-3 rounded-lg bg-yellow-600/20 border border-yellow-600/40">
          <div class="text-xs text-gray-400">Skipped</div>
          <div class="text-lg font-bold">${route.skippedStops}</div>
        </div>
        <div class="p-3 rounded-lg bg-red-600/20 border border-red-600/40">
          <div class="text-xs text-gray-400">Total Delay</div>
          <div class="text-lg font-bold">${route.totalDelay} min</div>
        </div>
      </div>

      <!-- Cost Breakdown -->
      <div class="border border-gray-600 rounded-lg p-4">
        <h4 class="font-semibold mb-3">💰 Cost Breakdown</h4>
        <div class="space-y-2 text-sm">
          <div class="flex justify-between">
            <span>Fuel Cost</span>
            <span class="font-semibold">₹${route.fuelCost.toFixed(0)}</span>
          </div>
          <div class="flex justify-between text-gray-400">
            <span>Per Day Average</span>
            <span>₹${fuelCostPerDay.toFixed(0)}</span>
          </div>
          <div class="flex justify-between text-gray-400">
            <span>Distance per Liter</span>
            <span>${route.config.mileage} km/L</span>
          </div>
        </div>
      </div>

      <!-- Day-wise Summary -->
      <div class="border border-gray-600 rounded-lg p-4">
        <h4 class="font-semibold mb-3">📅 Day-wise Summary</h4>
        <div class="space-y-3">
  `;

  route.days.forEach(day => {
    const dayCompleted = day.stops.filter(s => s.status === "completed").length;
    const daySkipped = day.stops.filter(s => s.status === "skipped").length;
    const dayPending = day.stops.filter(s => s.status === "pending").length;

    html += `
      <div class="p-3 rounded-lg bg-white/5 border border-gray-700">
        <div class="flex justify-between items-start mb-2">
          <div>
            <div class="font-medium">Day ${day.day}</div>
            <div class="text-xs text-gray-400">${day.startTime || "N/A"} - ${day.endTime || "N/A"}</div>
          </div>
          <div class="text-xs">
            <span class="text-green-400">✓${dayCompleted}</span> | 
            <span class="text-yellow-400">⏭${daySkipped}</span> | 
            <span class="text-gray-400">⏳${dayPending}</span>
          </div>
        </div>
        <div class="text-xs text-gray-400">
          ${day.totalDistance.toFixed(0)} km | ${day.totalTime.toFixed(1)} hrs | ${day.stops.length} stops
        </div>
      </div>
    `;
  });

  html += `
        </div>
      </div>

      <!-- Route Visualization -->
      <div class="border border-gray-600 rounded-lg p-4">
        <h4 class="font-semibold mb-3">🗺️ Route Overview</h4>
        <div class="font-mono text-xs overflow-x-auto space-y-1">
  `;

  route.days.forEach((day, dayIdx) => {
    html += `<div class="text-blue-400">Day ${day.day}:</div>`;
    
    let routeStr = day.startLocation || route.config.start;
    day.segments.forEach((seg, idx) => {
      const stop = day.stops[idx];
      const statusIcon = stop.status === "completed" ? "✓" : stop.status === "skipped" ? "⊘" : "○";
      routeStr += ` —${seg.distance.toFixed(0)}km→ [${statusIcon} ${seg.to}]`;
    });
    
    html += `<div class="text-gray-300 ml-4">${routeStr}</div>`;
  });

  html += `
        </div>
      </div>

      <!-- Best Moments (if completed) -->
      ${route.status === "completed" ? `
      <div class="border border-green-600 rounded-lg p-4 bg-green-600/10">
        <h4 class="font-semibold mb-2">🎉 Trip Completed!</h4>
        <p class="text-sm text-gray-300">
          You've successfully completed your ${route.days.length}-day journey covering 
          ${route.totalDistance.toFixed(0)} km with ${route.completedStops} stops visited!
        </p>
      </div>
      ` : ''}

      <!-- Export Actions -->
      <div class="flex gap-2">
        <button onclick="exportRouteSummary()" class="flex-1 px-4 py-2 rounded" 
                style="background: var(--btn-blue); color: var(--text);">
          📄 Export Summary
        </button>
        <button onclick="shareRouteWhatsApp()" class="flex-1 px-4 py-2 rounded" 
                style="background: var(--btn-green); color: var(--text);">
          💬 Share via WhatsApp
        </button>
      </div>
    </div>
  `;

  const summaryContent = el("rp_summary_content");
  if (summaryContent) {
    summaryContent.innerHTML = html;
  }
}

// Export route summary
window.exportRouteSummary = function() {
  const route = window._currentRoute;
  if (!route) return;

  const totalStops = route.days.reduce((sum, d) => sum + d.stops.length, 0);
  
  let text = `🗺️ TRIP ROUTE SUMMARY\n`;
  text += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
  text += `Trip: ${route.config.start} → ${route.config.destination}\n`;
  text += `Mode: ${route.config.mode} | Speed: ${route.config.speed} km/h\n`;
  text += `Duration: ${route.days.length} days\n\n`;
  
  text += `📊 STATISTICS\n`;
  text += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  text += `Total Distance: ${route.totalDistance.toFixed(0)} km\n`;
  text += `Total Time: ${route.totalTime.toFixed(1)} hours\n`;
  text += `Completed Stops: ${route.completedStops}/${totalStops}\n`;
  text += `Skipped Stops: ${route.skippedStops}\n`;
  text += `Total Delay: ${route.totalDelay} minutes\n`;
  text += `Fuel Cost: ₹${route.fuelCost.toFixed(0)}\n\n`;

  route.days.forEach(day => {
    text += `📅 DAY ${day.day}\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `Time: ${day.startTime} - ${day.endTime}\n`;
    text += `Distance: ${day.totalDistance.toFixed(0)} km\n`;
    text += `Route: ${day.startLocation || route.config.start}`;
    
    day.segments.forEach((seg, idx) => {
      const stop = day.stops[idx];
      const status = stop.status === "completed" ? "✓" : stop.status === "skipped" ? "⊘" : "○";
      text += ` → ${seg.distance.toFixed(0)}km → ${status} ${seg.to}`;
    });
    text += `\n\n`;
  });

  // Download as text file
  const blob = new Blob([text], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Trip_${route.config.start}_to_${route.config.destination}.txt`;
  a.click();
  URL.revokeObjectURL(url);
};

// Share via WhatsApp
window.shareRouteWhatsApp = function() {
  const route = window._currentRoute;
  if (!route) return;

  let text = `🗺️ *Trip Route Summary*\n\n`;
  text += `📍 ${route.config.start} → ${route.config.destination}\n`;
  text += `🚗 ${route.days.length} days | ${route.totalDistance.toFixed(0)} km\n\n`;
  
  route.days.forEach(day => {
    text += `*Day ${day.day}*: ${day.totalDistance.toFixed(0)}km, ${day.stops.length} stops\n`;
  });

  text += `\n💰 Fuel Cost: ₹${route.fuelCost.toFixed(0)}`;

  const encoded = encodeURIComponent(text);
  window.open(`https://wa.me/?text=${encoded}`, '_blank');
};

// Utility: Parse time string to minutes
function parseTime(timeStr) {
  const [hours, minutes] = timeStr.split(":").map(Number);
  return hours * 60 + minutes;
}

// Utility: Format minutes to HH:MM
function formatTime(minutes) {
  const h = Math.floor(minutes / 60);
  const m = Math.floor(minutes % 60);
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

// Utility: Parse time string to minutes
function parseTime(timeStr) {
  const [hours, minutes] = timeStr.split(":").map(Number);
  return hours * 60 + minutes;
}

// Utility: Format minutes to HH:MM
function formatTime(minutes) {
  const h = Math.floor(minutes / 60);
  const m = Math.floor(minutes % 60);
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

window.openTripPlanner = openTripPlanner;
window.openExpenseModal = openExpenseModal;
window.openSettlementSummary = openSettlementSummary;
window.confirmSettlement = confirmSettlement;
window.renderSettlement = renderSettlement;
window.checkTripCompletion = checkTripCompletion;
window.renderTrips = renderTrips;
window.calculateTripDays = calculateTripDays;
window.formatDate = formatDate;


window.injectRoutePlannerButton = injectRoutePlannerButton;
window.addRoutePlannerSection = addRoutePlannerSection;
window.loadRoutesFromDB = loadRoutesFromDB;
window.initVoiceCommands = initVoiceCommands;
window.startVoiceCommand = startVoiceCommand;
window.startLocationTracking = startLocationTracking;
window.stopLocationTracking = stopLocationTracking;
window.enrichStopsWithWeather = enrichStopsWithWeather;

// Add button to open route planner from trip details
window.openRoutePlannerForTrip = openRoutePlanner;

// Export functions
window.openRoutePlanner = openRoutePlanner;
window.generateItinerary = generateItinerary;
window.saveRoutePlan = saveRoutePlan;
window.moveToNextStop = moveToNextStop;
window.endCurrentDay = endCurrentDay;
window.saveDelay = saveDelay;
window.refreshManageView = refreshManageView;
window.refreshSummaryView = refreshSummaryView;

// Make functions available globally
if (typeof window !== 'undefined') {
  window.parseTime = parseTime;
  window.formatTime = formatTime;
  window.addMinutesToTime = addMinutesToTime;
  window.timeDifferenceInMinutes = timeDifferenceInMinutes;
  window.formatDuration = formatDuration;
  window.hoursToMinutes = hoursToMinutes;
  window.minutesToHours = minutesToHours;
  window.isTimeInRange = isTimeInRange;
  window.getCurrentTime = getCurrentTime;
  window.parse12HourTime = parse12HourTime;
  window.format12HourTime = format12HourTime;
}