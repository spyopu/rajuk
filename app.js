// app.js — Complete Premium Architecture with Advanced Expense Breakdown

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
  setupGoogleAuthListeners();
  loadMockOrLiveServerData(); // এখানে এখন সম্পূর্ণ ব্ল্যাঙ্ক/খালি ডেটা লোড হবে
});

// --- UI Injection for Month Filter ---
function setupMonthFilterUI() {
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

// --- Google Auth Integration ---
function setupGoogleAuthListeners() {
  const loginBtn = document.getElementById("google-login-btn");
  const profileTrigger = document.getElementById("profile-trigger");
  const dropdown = document.getElementById("profile-dropdown");
  const logoutBtn = document.getElementById("logout-btn");

  if (loginBtn) {
    loginBtn.addEventListener("click", async () => {
      const statusIndicator = document.getElementById("status-indicator");
      const statusText = document.getElementById("status-text");
      const authSection = document.getElementById("sidebar-auth-section");
      const userAvatar = document.getElementById("user-avatar");
      const userName = document.getElementById("user-display-name");
      const userEmail = document.getElementById("user-display-email");

      statusIndicator.className = "inline-block h-2 w-2 rounded-full bg-emerald-500 animate-none";
      statusText.innerText = "Connected Securely";
      authSection.classList.add("hidden");
      profileTrigger.classList.remove("hidden");
      
      userAvatar.src = "https://ui-avatars.com/api/?name=Opu+Ahmed&background=6366f1&color=fff"; 
      userName.innerText = "Opu Ahmed";
      userEmail.innerText = "opu.marketing@agency.com";
    });
  }

  if (profileTrigger) {
    profileTrigger.addEventListener("click", (e) => {
      e.stopPropagation();
      dropdown.classList.toggle("hidden");
    });
  }

  document.addEventListener("click", () => {
    if (dropdown && !dropdown.classList.contains("hidden")) {
      dropdown.classList.add("hidden");
    }
  });

  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      location.reload();
    });
  }
}

// --- Event Listeners for Forms ---
function attachFormListeners() {
  // 1. Client Registry
  document.getElementById("client-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const name = document.getElementById("client-name").value.trim();
    const phone = document.getElementById("client-phone").value.trim();
    const title = document.getElementById("project-title").value.trim();
    const budget = parseFloat(document.getElementById("project-budget").value) || 0;

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

  // 2. Office Overhead (General Cost with Total, Paid/Advance, Due)
  const oeForm = document.getElementById("office-expense-form");
  if (oeForm) {
    oeForm.innerHTML = `
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label class="block text-xs text-slate-400 mb-1">Category (e.g. Staff Salary, Shop Rent)</label>
          <input type="text" id="oe-category" placeholder="Salary / Rent" required class="w-full bg-[#1b1d26] border border-[#2d303f] rounded-lg px-3 py-2 text-sm text-white focus:border-indigo-500 outline-none">
        </div>
        <div>
          <label class="block text-xs text-slate-400 mb-1">Total Fixed Amount (মোট বরাদ্দ)</label>
          <input type="number" id="oe-total-amount" placeholder="৳" required class="w-full bg-[#1b1d26] border border-[#2d303f] rounded-lg px-3 py-2 text-sm font-mono text-white focus:border-indigo-500 outline-none">
        </div>
        <div>
          <label class="block text-xs text-slate-400 mb-1">Paid / Advance Amount (আজকে দিলেন)</label>
          <input type="number" id="oe-paid-amount" placeholder="৳" required class="w-full bg-[#1b1d26] border border-[#2d303f] rounded-lg px-3 py-2 text-sm font-mono text-white focus:border-indigo-500 outline-none">
        </div>
        <div>
          <label class="block text-xs text-slate-400 mb-1">Date</label>
          <input type="date" id="oe-date" required class="w-full bg-[#1b1d26] border border-[#2d303f] rounded-lg px-3 py-2 text-sm text-white focus:border-indigo-500 outline-none">
        </div>
      </div>
      <div class="mt-3">
        <label class="block text-xs text-slate-400 mb-1">Details / Remarks</label>
        <input type="text" id="oe-details" placeholder="Note here..." class="w-full bg-[#1b1d26] border border-[#2d303f] rounded-lg px-3 py-2 text-sm text-white focus:border-indigo-500 outline-none">
      </div>
      <button type="submit" class="mt-4 w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg text-sm transition">Post General Cost</button>
    `;

    // সেটআপ আজকের তারিখ ডিফল্ট হিসেবে
    document.getElementById("oe-date").value = new Date().toISOString().slice(0, 10);

    oeForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const category = document.getElementById("oe-category").value.trim();
      const totalAmount = parseFloat(document.getElementById("oe-total-amount").value) || 0;
      const paidAmount = parseFloat(document.getElementById("oe-paid-amount").value) || 0;
      const details = document.getElementById("oe-details").value.trim();
      const date = document.getElementById("oe-date").value;

      const dueAmount = totalAmount - paidAmount;

      const newExpense = {
        id: "oe_" + Date.now(),
        category,
        totalAmount,
        paidAmount,
        dueAmount,
        details,
        date,
        createdAt: new Date().toISOString()
      };

      officeExpenses.push(newExpense);
      oeForm.reset();
      document.getElementById("oe-date").value = new Date().toISOString().slice(0, 10);
      calculateAndRenderAll();
    });
  }

  // 3. Journal Voucher Entry (Income/Expense)
  document.getElementById("tx-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const clientId = document.getElementById("tx-client-select").value;
    const type = document.getElementById("tx-type").value;
    const amount = parseFloat(document.getElementById("tx-amount").value) || 0;
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

// --- Core Financial Engine ---
function calculateAndRenderAll() {
  updateClientDropdowns();

  const isCurrentMonth = (dateStr) => dateStr && dateStr.startsWith(currentMonthFilter);

  let totalVolume = 0;
  let grossIncome = 0;
  let totalCost = 0;
  let totalDue = 0;

  // 1. Process Client Accounts & Calculations
  const clientRowsContainer = document.getElementById("clients-table-body");
  clientRowsContainer.innerHTML = "";

  clients.forEach(client => {
    const clientTx = transactions.filter(t => t.clientId === client.id);
    const monthlyClientTx = clientTx.filter(t => isCurrentMonth(t.date));

    totalVolume += client.budget; 

    const settledRevenue = clientTx.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const absorbedCosts = clientTx.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    
    const balanceReceivable = client.budget - settledRevenue;
    if (balanceReceivable > 0) {
      totalDue += balanceReceivable;
    }

    grossIncome += monthlyClientTx.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    totalCost += monthlyClientTx.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);

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

  // 2. Process General Office Overhead with detailed structure
  const expenseRowsContainer = document.getElementById("office-expense-rows");
  
  // টেবিল হেডার আপডেট (যাতে মোট, অ্যাডভান্স ও ডিউ কলাম দেখা যায়)
  const expenseTable = expenseRowsContainer.closest('table');
  if (expenseTable && !expenseTable.dataset.updatedHeaders) {
    const thead = expenseTable.querySelector('thead');
    if (thead) {
      thead.innerHTML = `
        <tr class="text-left text-slate-400 text-xs uppercase tracking-wider border-b border-[#22242e]">
          <th class="p-3">Category</th>
          <th class="p-3">Note</th>
          <th class="p-3">Date</th>
          <th class="p-3 text-right">Total Cost</th>
          <th class="p-3 text-right">Paid / Adv</th>
          <th class="p-3 text-right">Due Left</th>
        </tr>
      `;
      expenseTable.dataset.updatedHeaders = "true";
    }
  }

  expenseRowsContainer.innerHTML = "";

  officeExpenses.forEach(exp => {
    if (isCurrentMonth(exp.date)) {
      // মোট খরচ হিসেবে শুধুমাত্র যতটুকু ক্যাশ পেমেন্ট বা অ্যাডভান্স দেওয়া হয়েছে তা যুক্ত হবে
      totalCost += exp.paidAmount; 
    }

    const row = document.createElement("tr");
    row.className = "hover:bg-[#1a1c24] text-xs border-b border-[#22242e]";
    row.innerHTML = `
      <td class="p-3 font-bold text-slate-200">${exp.category}</td>
      <td class="p-3 text-slate-400">${exp.details || '-'}</td>
      <td class="p-3 font-mono text-slate-400">${exp.date}</td>
      <td class="p-3 text-right font-mono text-slate-300">৳${exp.totalAmount.toLocaleString()}</td>
      <td class="p-3 text-right font-mono text-emerald-400 font-bold">৳${exp.paidAmount.toLocaleString()}</td>
      <td class="p-3 text-right font-mono ${exp.dueAmount > 0 ? 'text-amber-400 font-bold' : 'text-slate-500'}">৳${exp.dueAmount.toLocaleString()}</td>
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

// --- Ledger Drawer Functionality ---
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

// --- Mock Data Loader (এখন সম্পূর্ণ ক্লিন এবং খালি) ---
function loadMockOrLiveServerData() {
  clients = [];
  transactions = [];
  officeExpenses = [];
  
  calculateAndRenderAll();
}
