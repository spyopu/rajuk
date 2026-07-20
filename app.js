// app.js — Complete Premium Architecture with Advanced monthly reporting

// --- State Variables ---
let clients = [];
let transactions = [];
let officeExpenses = [];
let currentSelectedClientId = null;
let currentMonthFilter = new Date().toISOString().slice(0, 7); // Default to current month (YYYY-MM)

// --- Initialization ---
document.addEventListener("DOMContentLoaded", () => {
  setupMonthFilterUI();
  attachFormListeners();
  // If you have Firebase integrations, load data here. For now, initializing empty state or local storage stub.
  loadMockOrLiveServerData();
});

// --- UI Injection for Month Filter ---
function setupMonthFilterUI() {
  // Top Navbar এ মাস সিলেক্ট করার জন্য একটি ড্রপডাউন ইনজেক্ট করা হচ্ছে
  const header = document.querySelector("header");
  if (header) {
    const filterContainer = document.createElement("div");
    filterContainer.className = "flex items-center gap-2";
    filterContainer.innerHTML = `
      <label class="text-xs font-bold uppercase tracking-wider text-slate-400">Filter Month:</label>
      <input type="month" id="month-filter" value="${currentMonthFilter}" class="border border-[#2d303f] rounded-lg px-2 py-1 text-sm bg-[#1b1d26] text-white outline-none focus:border-indigo-500">
    `;
    header.insertBefore(filterContainer, header.firstChild);

    document.getElementById("month-filter").addEventListener("change", (e) => {
      currentMonthFilter = e.target.value;
      calculateAndRenderAll();
    });
  }
}

// --- Event Listeners ---
function attachFormListeners() {
  // 1. Client Registry
  document.getElementById("client-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const name = document.getElementById("client-name").value.trim();
    const phone = document.getElementById("client-phone").value.trim();
    const title = document.getElementById("project-title").value.trim();
    const budget = parseFloat(document.getElementById("project-budget").value);

    const newClient = {
      id: "c_" + Date.now(),
      name,
      phone,
      title,
      budget,
      createdAt: new Date().toISOString()
    };

    clients.push(newClient);
    document.getElementById("client-form").reset();
    calculateAndRenderAll();
  });

  // 2. Office Overhead (With Advance Payment Checkbox)
  const oeForm = document.getElementById("office-expense-form");
  if (oeForm) {
    // Inject dynamic "Advance Payment" toggle in HTML form if not present
    if (!document.getElementById("oe-is-advance")) {
      const submitBtn = oeForm.querySelector("button");
      const advanceToggle = document.createElement("div");
      advanceToggle.className = "flex items-center gap-2 py-1 px-1";
      advanceToggle.innerHTML = `
        <input type="checkbox" id="oe-is-advance" class="rounded border-[#2d303f] bg-[#1b1d26] text-indigo-600 focus:ring-0">
        <label for="oe-is-advance" class="text-xs text-slate-400 select-none">Mark as Advance Payment (অ্যাডভান্স খরচ)</label>
      `;
      oeForm.insertBefore(advanceToggle, submitBtn);
    }

    oeForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const category = document.getElementById("oe-category").value;
      const amount = parseFloat(document.getElementById("oe-amount").value);
      const details = document.getElementById("oe-details").value.trim();
      const date = document.getElementById("oe-date").value;
      const isAdvance = document.getElementById("oe-is-advance").checked;

      const newExpense = {
        id: "oe_" + Date.now(),
        category,
        amount,
        details: isAdvance ? `[ADVANCE] ${details}` : details,
        date,
        isAdvance,
        createdAt: new Date().toISOString()
      };

      officeExpenses.push(newExpense);
      oeForm.reset();
      calculateAndRenderAll();
    });
  }

  // 3. Journal Voucher Entry (Income/Expense)
  document.getElementById("tx-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const clientId = document.getElementById("tx-client-select").value;
    const type = document.getElementById("tx-type").value; // 'income' or 'expense'
    const amount = parseFloat(document.getElementById("tx-amount").value);
    const date = document.getElementById("tx-date").value;
    const details = document.getElementById("tx-details").value.trim();

    const newTx = {
      id: "tx_" + Date.now(),
      clientId,
      type,
      amount,
      date,
      details,
      createdAt: new Date().toISOString()
    };

    transactions.push(newTx);
    document.getElementById("tx-form").reset();
    calculateAndRenderAll();
  });
}

// --- Core Financial Engine (Calculations & Rendering) ---
function calculateAndRenderAll() {
  updateClientDropdowns();

  // Filter keys based on selected YYYY-MM
  const isCurrentMonth = (dateStr) => dateStr && dateStr.startsWith(currentMonthFilter);

  let totalVolume = 0;
  let grossIncome = 0;
  let totalCost = 0;
  let totalDue = 0;

  // 1. Process Client Accounts & Calculations
  const clientRowsContainer = document.getElementById("clients-table-body");
  clientRowsContainer.innerHTML = "";

  clients.forEach(client => {
    // Get all transactions for this client
    const clientTx = transactions.filter(t => t.clientId === client.id);
    
    // Monthly filtered transactions for global stats
    const monthlyClientTx = clientTx.filter(t => isCurrentMonth(t.date));

    // Contract budget is part of volume if created this month or has activity
    totalVolume += client.budget; 

    // Calculate Client Total Revenue and Cost
    const settledRevenue = clientTx.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const absorbedCosts = clientTx.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    
    // STRICT DUE SYSTEM: Contract Allocation - Settled Revenue
    const balanceReceivable = client.budget - settledRevenue;
    if (balanceReceivable > 0) {
      totalDue += balanceReceivable;
    }

    // Accumulate Monthly stats for Global Matrix Counter
    grossIncome += monthlyClientTx.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    totalCost += monthlyClientTx.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);

    // Render Master Row
    const row = document.createElement("tr");
    row.className = "hover:bg-[#1f212a] transition border-b border-[#22242e]";
    row.innerHTML = `
      <td class="px-6 py-4">
        <p class="font-bold text-white text-sm">${client.name}</p>
        <p class="text-xs text-indigo-400 font-mono">${client.title}</p>
      </td>
      <td class="px-4 py-4 text-slate-400 text-xs">${client.phone}</td>
      <td class="px-4 py-4 text-right font-mono text-sm text-white">৳${client.budget.toLocaleString()}</td>
      <td class="px-4 py-4 text-right font-mono text-sm text-emerald-400">৳${settledRevenue.toLocaleString()}</td>
      <td class="px-4 py-4 text-right font-mono text-sm text-rose-400">৳${absorbedCosts.toLocaleString()}</td>
      <td class="px-4 py-4 text-right font-mono text-sm ${balanceReceivable > 0 ? 'text-amber-400 font-bold' : 'text-slate-500'}">
        ৳${balanceReceivable.toLocaleString()} ${balanceReceivable > 0 ? '⚠️' : '✅'}
      </td>
      <td class="px-6 py-4 text-center">
        <button onclick="openLedgerDrawer('${client.id}')" class="text-xs bg-indigo-600/20 text-indigo-400 hover:bg-indigo-600 hover:text-white px-3 py-1.5 rounded-lg border border-indigo-500/30 transition">Statement</button>
      </td>
    `;
    clientRowsContainer.appendChild(row);
  });

  // 2. Process General Office Overhead (Include filtered month & Advance tracking)
  const expenseRowsContainer = document.getElementById("office-expense-rows");
  expenseRowsContainer.innerHTML = "";

  officeExpenses.forEach(exp => {
    if (isCurrentMonth(exp.date)) {
      totalCost += exp.amount; // General overhead is added to monthly costs
    }

    const row = document.createElement("tr");
    row.className = "hover:bg-[#1a1c24] text-xs border-b border-[#22242e]";
    row.innerHTML = `
      <td class="p-2 font-bold ${exp.isAdvance ? 'text-purple-400' : 'text-slate-300'}">${exp.category} ${exp.isAdvance ? '(Adv)' : ''}</td>
      <td class="p-2 text-slate-400">${exp.details}</td>
      <td class="p-2 font-mono text-slate-400">${exp.date}</td>
      <td class="p-2 text-right font-mono text-rose-400 font-bold">৳${exp.amount}</td>
    `;
    expenseRowsContainer.appendChild(row);
  });

  // 3. Update Global Screen Widgets
  document.getElementById("global-budget").innerText = `৳${totalVolume.toLocaleString()}`;
  document.getElementById("global-income").innerText = `৳${grossIncome.toLocaleString()}`;
  document.getElementById("global-expense").innerText = `৳${totalCost.toLocaleString()}`;
  document.getElementById("global-due").innerText = `৳${totalDue.toLocaleString()}`;
  
  const netBalance = grossIncome - totalCost;
  const netElement = document.getElementById("global-net");
  netElement.innerText = `৳${netBalance.toLocaleString()}`;
  if (netBalance >= 0) {
    netElement.className = "text-2xl lg:text-3xl font-black tracking-tight text-emerald-400 mt-1.5 font-mono";
  } else {
    netElement.className = "text-2xl lg:text-3xl font-black tracking-tight text-rose-500 mt-1.5 font-mono";
  }
}

// --- Helper Functions ---
function updateClientDropdowns() {
  const select = document.getElementById("tx-client-select");
  if (!select) return;
  const currentVal = select.value;
  select.innerHTML = '<option value="" disabled selected>Choose target profile...</option>';
  
  clients.forEach(client => {
    const opt = document.createElement("option");
    opt.value = client.id;
    opt.innerText = `${client.name} (${client.title})`;
    select.appendChild(opt);
  });
  if (currentVal) select.value = currentVal;
}

// --- Subsidiary Statement Ledger Drawer Functionality ---
window.openLedgerDrawer = function(clientId) {
  const client = clients.find(c => c.id === clientId);
  if (!client) return;

  currentSelectedClientId = clientId;
  document.getElementById("drawer-title").innerText = `Statement Ledger: ${client.name}`;
  document.getElementById("drawer-sub").innerText = `Scope: ${client.title} | Hotline: ${client.phone}`;
  
  const tbody = document.getElementById("drawer-table-body");
  tbody.innerHTML = "";

  const clientTx = transactions.filter(t => t.clientId === clientId);
  
  if(clientTx.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" class="py-4 text-center text-slate-500">No transactions posted to this profile yet.</td></tr>`;
  } else {
    clientTx.forEach(t => {
      const row = document.createElement("tr");
      row.className = "hover:bg-[#1a1c24] border-b border-[#22242e]";
      row.innerHTML = `
        <td class="py-3 px-3 font-mono">${t.date}</td>
        <td class="py-3 px-3 text-slate-300">${t.details}</td>
        <td class="py-3 px-3">
          <span class="px-2 py-0.5 rounded text-[10px] font-bold uppercase ${t.type === 'income' ? 'bg-emerald-950 text-emerald-400 border border-emerald-900' : 'bg-rose-950 text-rose-400 border border-rose-900'}">${t.type === 'income' ? 'Debit / Received' : 'Credit / Cost'}</span>
        </td>
        <td class="py-3 px-3 text-right font-mono font-bold ${t.type === 'income' ? 'text-emerald-400' : 'text-rose-400'}">৳${t.amount.toLocaleString()}</td>
      `;
      tbody.appendChild(row);
    });
  }

  const drawer = document.getElementById("ledger-drawer");
  drawer.classList.remove("hidden");
  drawer.scrollIntoView({ behavior: 'smooth' });
};

window.closeDrawer = function() {
  document.getElementById("ledger-drawer").classList.add("hidden");
  currentSelectedClientId = null;
};

// --- Mock Loader Stub ---
function loadMockOrLiveServerData() {
  // Demo Initial State for Instant testing logic validation
  clients = [
    { id: "c_1", name: "Karim Rahman", phone: "01711000222", title: "Rajuk Plan Approval", budget: 150000, createdAt: "2026-07-01T10:00:00.000Z" }
  ];
  transactions = [
    { id: "tx_1", clientId: "c_1", type: "income", amount: 50000, date: "2026-07-05", details: "Booking Advance Received", createdAt: "2026-07-05T12:00:00.000Z" },
    { id: "tx_2", clientId: "c_1", type: "expense", amount: 15000, date: "2026-07-10", details: "Site Survey & Drafting Cost", createdAt: "2026-07-10T15:00:00.000Z" }
  ];
  officeExpenses = [
    { id: "oe_1", category: "Office Rent", amount: 25000, details: "July Rent Paid", date: "2026-07-01", isAdvance: false },
    { id: "oe_2", category: "Staff Salary", amount: 10000, details: "Advance to Digital Marketer", date: "2026-07-12", isAdvance: true }
  ];
  
  calculateAndRenderAll();
}