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
window.openTripPlanner = openTripPlanner;
window.openExpenseModal = openExpenseModal;
window.openSettlementSummary = openSettlementSummary;
window.confirmSettlement = confirmSettlement;
window.renderSettlement = renderSettlement;
window.checkTripCompletion = checkTripCompletion;
window.renderTrips = renderTrips;
window.calculateTripDays = calculateTripDays;
window.formatDate = formatDate;
