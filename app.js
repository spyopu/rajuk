// --- FIREBASE CONFIGURATION ---
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  databaseURL: "https://YOUR_PROJECT_ID-default-rtdb.firebaseio.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Initialize Firebase
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

const db = firebase.database();
const auth = firebase.auth();

// STATE MANAGEMENT
let clientsData = {};
let officeExpensesData = {};
let currentFilter = 'all';
let selectedMonth = ''; // Format: YYYY-MM
let pendingDeleteAction = null;
const SECURITY_PASSCODE = "1234"; // নিরাপত্তা পাসকোড

// INITIALIZATION
document.addEventListener('DOMContentLoaded', () => {
  setupEventListeners();
  setupMonthFilter();
  listenToDatabase();
  setupAuth();
});

// SETUP MONTH FILTER
function setupMonthFilter() {
  const monthInput = document.getElementById('month-filter');
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  selectedMonth = `${yyyy}-${mm}`;
  monthInput.value = selectedMonth;

  monthInput.addEventListener('change', (e) => {
    selectedMonth = e.target.value;
    renderDashboard();
  });
}

// REALTIME DATABASE LISTENERS
function listenToDatabase() {
  const statusIndicator = document.getElementById('status-indicator');
  const statusText = document.getElementById('status-text');

  // Listen to Projects/Clients
  db.ref('clients').on('value', (snapshot) => {
    clientsData = snapshot.val() || {};
    renderDashboard();
    populateProjectDropdown();
    if (statusIndicator) statusIndicator.className = "inline-block h-2 w-2 rounded-full bg-emerald-500";
    if (statusText) statusText.innerText = "Firebase Realtime Cloud (100% Secured)";
  }, (error) => {
    if (statusIndicator) statusIndicator.className = "inline-block h-2 w-2 rounded-full bg-rose-500";
    if (statusText) statusText.innerText = "Database Connection Error";
  });

  // Listen to Office Expenses
  db.ref('office_expenses').on('value', (snapshot) => {
    officeExpensesData = snapshot.val() || {};
    renderOfficeExpenses();
    renderDashboard(); // Re-render summary cards when expenses change
  });
}

// MAIN DASHBOARD CALCULATIONS AND RENDER
function renderDashboard() {
  const tableBody = document.getElementById('clients-table-body');
  if (!tableBody) return;
  tableBody.innerHTML = '';

  let totalVolume = 0;       // Total Budget of ALL projects
  let grossIncome = 0;       // Income in selected month
  let totalCost = 0;         // Project Expenses + Office Expenses in selected month
  let totalDue = 0;          // Total Outstanding Accounts
  
  const searchInput = document.getElementById('search-input').value.toLowerCase();
  
  // Format Month Title for Labels
  let monthLabelText = "";
  if (selectedMonth) {
    const [y, m] = selectedMonth.split('-');
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    monthLabelText = ` (${monthNames[parseInt(m)-1]} ${y})`;
  }

  document.getElementById('label-income').innerText = `GROSS INCOME${monthLabelText}`;
  document.getElementById('label-expense').innerText = `TOTAL COST${monthLabelText}`;
  document.getElementById('label-net').innerText = `NET BALANCE${monthLabelText}`;

  // Process Each Client/Project
  Object.keys(clientsData).forEach((id) => {
    const client = clientsData[id];
    const budget = Number(client.budget || 0);
    
    // Total Volume = Sum of ALL project budgets
    totalVolume += budget;

    let clientIncome = 0;
    let clientExpense = 0;

    // Process Transactions
    if (client.transactions) {
      Object.values(client.transactions).forEach((tx) => {
        const txAmount = Number(tx.amount || 0);
        const txDate = tx.date || ''; // Format: YYYY-MM-DD
        const txMonth = txDate.substring(0, 7);

        // All-time calculation for client level due
        if (tx.type === 'income') {
          // If month filter matches
          if (!selectedMonth || txMonth === selectedMonth) {
            grossIncome += txAmount;
          }
          clientIncome += txAmount;
        } else if (tx.type === 'expense') {
          if (!selectedMonth || txMonth === selectedMonth) {
            totalCost += txAmount;
          }
          clientExpense += txAmount;
        }
      });
    }

    const clientDue = budget - clientIncome;
    totalDue += clientDue;

    // Filtering logic for Directory Table
    const matchesSearch = client.projectTitle.toLowerCase().includes(searchInput) || client.clientName.toLowerCase().includes(searchInput);
    let matchesFilter = true;

    if (currentFilter === 'new') {
      matchesFilter = clientIncome === 0;
    } else if (currentFilter === 'old') {
      matchesFilter = clientIncome > 0;
    }

    if (matchesSearch && matchesFilter) {
      const row = document.createElement('tr');
      row.className = 'hover:bg-slate-900/40 transition border-b border-slate-800/40';
      row.innerHTML = `
        <td class="p-3 pl-4">
          <div class="font-bold text-white">${escapeHtml(client.projectTitle)}</div>
          <div class="text-[10px] text-slate-500">${escapeHtml(client.clientName)}</div>
        </td>
        <td class="p-3 text-slate-400">${escapeHtml(client.clientPhone)}</td>
        <td class="p-3 text-right font-semibold text-slate-200">৳${budget.toLocaleString()}</td>
        <td class="p-3 text-right font-semibold text-emerald-400">৳${clientIncome.toLocaleString()}</td>
        <td class="p-3 text-right font-semibold text-rose-400">৳${clientExpense.toLocaleString()}</td>
        <td class="p-3 text-right font-semibold text-amber-500">৳${clientDue.toLocaleString()}</td>
        <td class="p-3 text-center pr-4">
          <div class="flex items-center justify-center gap-2">
            <button onclick="openDrawer('${id}')" class="bg-indigo-600/20 hover:bg-indigo-600 text-indigo-400 hover:text-white px-2.5 py-1 rounded-lg transition font-bold text-[11px]">Ledger</button>
            <button onclick="requestDeleteClient('${id}')" class="text-slate-600 hover:text-rose-500 font-bold px-1 text-sm">✕</button>
          </div>
        </td>
      `;
      tableBody.appendChild(row);
    }
  });

  // Calculate General Office Expenses for Selected Month
  Object.values(officeExpensesData).forEach((oe) => {
    const oeAmount = Number(oe.amount || 0);
    const oeMonth = (oe.date || '').substring(0, 7);
    if (!selectedMonth || oeMonth === selectedMonth) {
      totalCost += oeAmount;
    }
  });

  const netBalance = grossIncome - totalCost;

  // --- UPDATE CARDS IN DOM ---
  document.getElementById('global-volume').innerText = `৳${totalVolume.toLocaleString()}`;
  document.getElementById('global-income').innerText = `৳${grossIncome.toLocaleString()}`;
  document.getElementById('global-expense').innerText = `৳${totalCost.toLocaleString()}`;
  document.getElementById('global-due').innerText = `৳${totalDue.toLocaleString()}`;
  
  const netEl = document.getElementById('global-net');
  netEl.innerText = `৳${netBalance.toLocaleString()}`;
  if (netBalance < 0) {
    netEl.className = "text-lg font-black text-rose-500 mt-2";
  } else {
    netEl.className = "text-lg font-black text-purple-400 mt-2";
  }
}

// RENDER OFFICE EXPENSES TABLE
function renderOfficeExpenses() {
  const tbody = document.getElementById('office-expense-rows');
  if (!tbody) return;
  tbody.innerHTML = '';

  Object.keys(officeExpensesData).forEach((id) => {
    const item = officeExpensesData[id];
    const oeMonth = (item.date || '').substring(0, 7);

    if (!selectedMonth || oeMonth === selectedMonth) {
      const row = document.createElement('tr');
      row.className = 'hover:bg-slate-900/40 transition border-b border-slate-800/40';
      row.innerHTML = `
        <td class="p-3">
          <div class="font-bold text-white">${escapeHtml(item.details)}</div>
          <span class="inline-block bg-slate-800 text-slate-400 text-[9px] px-2 py-0.5 rounded-md mt-1 font-semibold">${escapeHtml(item.category)}</span>
        </td>
        <td class="p-3 text-slate-400 text-[11px]">${item.date}</td>
        <td class="p-3 text-right font-bold text-rose-400">৳${Number(item.amount).toLocaleString()}</td>
        <td class="p-3 text-center">
          <button onclick="requestDeleteOfficeExpense('${id}')" class="text-slate-600 hover:text-rose-500 font-bold px-2 py-1">✕</button>
        </td>
      `;
      tbody.appendChild(row);
    }
  });
}

// DRAWER & LEDGER MANAGEMENT
function openDrawer(clientId) {
  const client = clientsData[clientId];
  if (!client) return;

  const drawer = document.getElementById('ledger-drawer');
  document.getElementById('drawer-title').innerText = `${client.projectTitle} - Ledger`;
  document.getElementById('drawer-sub').innerText = `Client: ${client.clientName} | Phone: ${client.clientPhone} | Agreed Budget: ৳${Number(client.budget).toLocaleString()}`;

  const tbody = document.getElementById('drawer-table-body');
  tbody.innerHTML = '';

  if (client.transactions) {
    Object.keys(client.transactions).forEach((txId) => {
      const tx = client.transactions[txId];
      const isIncome = tx.type === 'income';
      
      const row = document.createElement('tr');
      row.className = 'hover:bg-slate-900/40 border-b border-slate-800/40';
      row.innerHTML = `
        <td class="p-3 text-slate-400 text-[11px]">${tx.date}</td>
        <td class="p-3 font-semibold text-slate-200">${escapeHtml(tx.details)}</td>
        <td class="p-3">
          <span class="px-2 py-0.5 rounded-md text-[10px] font-bold ${isIncome ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}">
            ${isIncome ? 'INCOME' : 'EXPENSE'}
          </span>
        </td>
        <td class="p-3 text-right font-bold ${isIncome ? 'text-emerald-400' : 'text-rose-400'}">৳${Number(tx.amount).toLocaleString()}</td>
        <td class="p-3 text-center">
          <button onclick="requestDeleteTransaction('${clientId}', '${txId}')" class="text-slate-600 hover:text-rose-500 font-bold px-2">✕</button>
        </td>
      `;
      tbody.appendChild(row);
    });
  } else {
    tbody.innerHTML = `<tr><td colspan="5" class="p-4 text-center text-slate-500">No ledger entries found for this project.</td></tr>`;
  }

  drawer.classList.remove('hidden');
  drawer.scrollIntoView({ behavior: 'smooth' });
}

function closeDrawer() {
  document.getElementById('ledger-drawer').classList.add('hidden');
}

// EVENT LISTENERS & FORMS
function setupEventListeners() {
  // Search Bar
  document.getElementById('search-input').addEventListener('input', renderDashboard);

  // New Client Form
  document.getElementById('client-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const projectTitle = document.getElementById('project-title').value;
    const clientName = document.getElementById('client-name').value;
    const clientPhone = document.getElementById('client-phone').value;
    const budget = document.getElementById('project-budget').value;

    db.ref('clients').push({
      projectTitle,
      clientName,
      clientPhone,
      budget: Number(budget),
      createdAt: firebase.database.ServerValue.TIMESTAMP
    }).then(() => {
      e.target.reset();
      switchTab('dashboard-view');
    });
  });

  // New Transaction Form
  document.getElementById('tx-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const clientId = document.getElementById('tx-client-select').value;
    const type = document.getElementById('tx-type').value;
    const date = document.getElementById('tx-date').value;
    const amount = document.getElementById('tx-amount').value;
    const details = document.getElementById('tx-details').value;

    if (!clientId) {
      alert("Please select a project profile!");
      return;
    }

    db.ref(`clients/${clientId}/transactions`).push({
      type,
      date,
      amount: Number(amount),
      details
    }).then(() => {
      e.target.reset();
      document.getElementById('dropdown-selected-text').innerText = "Select Project Profile...";
      document.getElementById('tx-client-select').value = "";
      switchTab('dashboard-view');
    });
  });

  // Office Expense Form
  document.getElementById('office-expense-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const category = document.getElementById('oe-category').value;
    const date = document.getElementById('oe-date').value;
    const amount = document.getElementById('oe-amount').value;
    const details = document.getElementById('oe-details').value;

    db.ref('office_expenses').push({
      category,
      date,
      amount: Number(amount),
      details
    }).then(() => {
      e.target.reset();
    });
  });

  // Passcode Modal Controls
  document.getElementById('modal-cancel-btn').addEventListener('click', closeModal);
  document.getElementById('modal-confirm-btn').addEventListener('click', confirmDeleteAction);

  // Custom Dropdown Controls
  const trigger = document.getElementById('dropdown-trigger');
  const list = document.getElementById('custom-dropdown-list');
  
  trigger.addEventListener('click', () => list.classList.toggle('hidden'));
  document.getElementById('dropdown-search-input').addEventListener('input', (e) => {
    populateProjectDropdown(e.target.value.toLowerCase());
  });
}

// CUSTOM SEARCHABLE DROPDOWN
function populateProjectDropdown(search = '') {
  const container = document.getElementById('dropdown-items-container');
  if (!container) return;
  container.innerHTML = '';

  Object.keys(clientsData).forEach((id) => {
    const client = clientsData[id];
    if (client.projectTitle.toLowerCase().includes(search) || client.clientName.toLowerCase().includes(search)) {
      const div = document.createElement('div');
      div.className = 'p-2.5 hover:bg-indigo-600/20 rounded-xl cursor-pointer transition text-xs flex justify-between items-center';
      div.innerHTML = `
        <div>
          <div class="font-bold text-white">${escapeHtml(client.projectTitle)}</div>
          <div class="text-[10px] text-slate-400">${escapeHtml(client.clientName)}</div>
        </div>
      `;
      div.onclick = () => {
        document.getElementById('tx-client-select').value = id;
        document.getElementById('dropdown-selected-text').innerText = `${client.projectTitle} (${client.clientName})`;
        document.getElementById('dropdown-selected-text').className = "text-white font-bold";
        document.getElementById('custom-dropdown-list').classList.add('hidden');
      };
      container.appendChild(div);
    }
  });
}

// SECURITY DELETION HANDLERS
function requestDeleteClient(clientId) {
  pendingDeleteAction = () => db.ref(`clients/${clientId}`).remove();
  openModal();
}

function requestDeleteTransaction(clientId, txId) {
  pendingDeleteAction = () => db.ref(`clients/${clientId}/transactions/${txId}`).remove();
  openModal();
}

function requestDeleteOfficeExpense(expenseId) {
  pendingDeleteAction = () => db.ref(`office_expenses/${expenseId}`).remove();
  openModal();
}

function openModal() {
  document.getElementById('modal-passcode-input').value = '';
  document.getElementById('passcode-modal').classList.remove('hidden');
}

function closeModal() {
  document.getElementById('passcode-modal').classList.add('hidden');
  pendingDeleteAction = null;
}

function confirmDeleteAction() {
  const passcode = document.getElementById('modal-passcode-input').value;
  if (passcode === SECURITY_PASSCODE) {
    if (pendingDeleteAction) pendingDeleteAction();
    closeModal();
    closeDrawer();
  } else {
    alert("Incorrect Passcode!");
  }
}

// TAB SWITCHING
function switchTab(tabId) {
  document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
  document.getElementById(`tab-${tabId}`).classList.remove('hidden');

  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.className = 'tab-btn w-full flex items-center gap-2.5 text-xs font-bold px-3 py-2.5 rounded-lg transition text-slate-400 hover:text-white hover:bg-[#1e202b] text-left border border-transparent';
  });

  const activeBtn = document.getElementById(`btn-${tabId}`);
  if (activeBtn) {
    activeBtn.className = 'tab-btn w-full flex items-center gap-2.5 text-xs font-bold px-3 py-2.5 rounded-lg transition bg-indigo-600 text-white shadow-md text-left border border-indigo-500/20';
  }
}

function setClientFilter(filter) {
  currentFilter = filter;
  renderDashboard();
}

// GOOGLE AUTH
function setupAuth() {
  const loginBtn = document.getElementById('google-login-btn');
  const logoutBtn = document.getElementById('logout-btn');
  const profileTrigger = document.getElementById('profile-trigger');
  const profileDropdown = document.getElementById('profile-dropdown');

  loginBtn.addEventListener('click', () => {
    const provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(provider);
  });

  logoutBtn.addEventListener('click', () => auth.signOut());

  profileTrigger.addEventListener('click', () => {
    profileDropdown.classList.toggle('hidden');
  });

  auth.onAuthStateChanged((user) => {
    if (user) {
      document.getElementById('sidebar-auth-section').classList.add('hidden');
      profileTrigger.classList.remove('hidden');
      document.getElementById('user-avatar').src = user.photoURL || '';
      document.getElementById('user-display-name').innerText = user.displayName || 'User';
      document.getElementById('user-display-email').innerText = user.email || '';
    } else {
      document.getElementById('sidebar-auth-section').classList.remove('hidden');
      profileTrigger.classList.add('hidden');
    }
  });
}

// HELPER UTILS
function escapeHtml(str) {
  return String(str || '').replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
