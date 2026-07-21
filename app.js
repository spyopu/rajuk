// 1. Firebase Initialization Configuration
const firebaseConfig = {
  apiKey: "AIzaSyD8kXy2rL9ptiPN4xEMg5h3o4RY_sPH79w",
  authDomain: "rajuk-bed98.firebaseapp.com",
  databaseURL: "https://rajuk-bed98-default-rtdb.firebaseio.com",
  projectId: "rajuk-bed98",
  storageBucket: "rajuk-bed98.firebasestorage.app",
  messagingSenderId: "367893646589",
  appId: "1:367893646589:web:6c91f066dfb5143e204294"
};

// Initialize Firebase App
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

const auth = firebase.auth();
const db = firebase.database();

// STATE MANAGEMENT
let clientsData = {};
let officeExpensesData = {};
let currentFilter = 'all';
let selectedMonth = ''; // Format: YYYY-MM
let pendingDeleteAction = null;
const SECURITY_PASSCODE = "1234"; 

// INITIALIZATION
document.addEventListener('DOMContentLoaded', () => {
  setupEventListeners();
  setupMonthFilter();
  listenToDatabase();
  setupAuth();
});

// AUTHENTICATION SYSTEM
function setupAuth() {
  const loginBtn = document.getElementById('google-login-btn');
  const logoutBtn = document.getElementById('logout-btn');
  const profileTrigger = document.getElementById('profile-trigger');
  const profileDropdown = document.getElementById('profile-dropdown');

  // Google Login Handler
  if (loginBtn) {
    loginBtn.addEventListener('click', () => {
      const provider = new firebase.auth.GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });

      auth.signInWithPopup(provider)
        .then((result) => {
          console.log("Logged in user:", result.user);
        })
        .catch((error) => {
          console.error("Firebase Auth Error:", error);
          
          if (error.code === 'auth/popup-blocked' || error.code === 'auth/popup-closed-by-user') {
            auth.signInWithRedirect(provider);
          } else {
            alert("Login Failed: " + error.message);
          }
        });
    });
  }

  // Sign Out Handler
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      auth.signOut().then(() => {
        if (profileDropdown) profileDropdown.classList.add('hidden');
      });
    });
  }

  // Profile Dropdown Toggle
  if (profileTrigger) {
    profileTrigger.addEventListener('click', (e) => {
      e.stopPropagation();
      if (profileDropdown) profileDropdown.classList.toggle('hidden');
    });

    document.addEventListener('click', () => {
      if (profileDropdown) profileDropdown.classList.add('hidden');
    });
  }

  // Listen to Auth State Changes
  auth.onAuthStateChanged((user) => {
    const authSection = document.getElementById('sidebar-auth-section');
    const userAvatar = document.getElementById('user-avatar');
    const userName = document.getElementById('user-display-name');
    const userEmail = document.getElementById('user-display-email');

    if (user) {
      if (authSection) authSection.classList.add('hidden');
      if (profileTrigger) profileTrigger.classList.remove('hidden');
      if (userAvatar) userAvatar.src = user.photoURL || 'https://via.placeholder.com/150';
      if (userName) userName.innerText = user.displayName || 'User';
      if (userEmail) userEmail.innerText = user.email || '';
    } else {
      if (authSection) authSection.classList.remove('hidden');
      if (profileTrigger) profileTrigger.classList.add('hidden');
    }
  });
}

// SETUP MONTH FILTER
function setupMonthFilter() {
  const monthInput = document.getElementById('month-filter');
  if (!monthInput) return;

  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  selectedMonth = `${yyyy}-${mm}`;
  monthInput.value = selectedMonth;

  monthInput.addEventListener('change', (e) => {
    selectedMonth = e.target.value;
    renderDashboard();
    renderOfficeExpenses();
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
    console.error("Database error:", error);
    if (statusIndicator) statusIndicator.className = "inline-block h-2 w-2 rounded-full bg-rose-500";
    if (statusText) statusText.innerText = "Database Access Denied / Error";
  });

  // Listen to Office Expenses
  db.ref('office_expenses').on('value', (snapshot) => {
    officeExpensesData = snapshot.val() || {};
    renderOfficeExpenses();
    renderDashboard();
  });
}

// DASHBOARD CALCULATIONS & RENDER
function renderDashboard() {
  const tableBody = document.getElementById('clients-table-body');
  if (!tableBody) return;
  tableBody.innerHTML = '';

  let totalVolume = 0;       
  let grossIncome = 0;       
  let totalCost = 0;         
  let totalDue = 0;          
  
  const searchInput = (document.getElementById('search-input')?.value || '').toLowerCase();
  
  let monthLabelText = "";
  if (selectedMonth) {
    const [y, m] = selectedMonth.split('-');
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    monthLabelText = ` (${monthNames[parseInt(m)-1]} ${y})`;
  }

  if (document.getElementById('label-income')) document.getElementById('label-income').innerText = `GROSS INCOME${monthLabelText}`;
  if (document.getElementById('label-expense')) document.getElementById('label-expense').innerText = `TOTAL COST${monthLabelText}`;
  if (document.getElementById('label-net')) document.getElementById('label-net').innerText = `NET BALANCE${monthLabelText}`;

  Object.keys(clientsData).forEach((id) => {
    const client = clientsData[id];
    const budget = Number(client.budget || 0);
    
    totalVolume += budget;

    let clientIncome = 0;
    let clientExpense = 0;

    if (client.transactions) {
      Object.values(client.transactions).forEach((tx) => {
        const txAmount = Number(tx.amount || 0);
        const txMonth = (tx.date || '').substring(0, 7);

        if (tx.type === 'income') {
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

    const matchesSearch = (client.projectTitle || '').toLowerCase().includes(searchInput) || (client.clientName || '').toLowerCase().includes(searchInput);
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

  Object.values(officeExpensesData).forEach((oe) => {
    const oeAmount = Number(oe.amount || 0);
    const oeMonth = (oe.date || '').substring(0, 7);
    if (!selectedMonth || oeMonth === selectedMonth) {
      totalCost += oeAmount;
    }
  });

  const netBalance = grossIncome - totalCost;

  if (document.getElementById('global-volume')) document.getElementById('global-volume').innerText = `৳${totalVolume.toLocaleString()}`;
  if (document.getElementById('global-income')) document.getElementById('global-income').innerText = `৳${grossIncome.toLocaleString()}`;
  if (document.getElementById('global-expense')) document.getElementById('global-expense').innerText = `৳${totalCost.toLocaleString()}`;
  if (document.getElementById('global-due')) document.getElementById('global-due').innerText = `৳${totalDue.toLocaleString()}`;
  
  const netEl = document.getElementById('global-net');
  if (netEl) {
    netEl.innerText = `৳${netBalance.toLocaleString()}`;
    netEl.className = netBalance < 0 ? "text-lg font-black text-rose-500 mt-2" : "text-lg font-black text-purple-400 mt-2";
  }
}

// RENDER OFFICE EXPENSES
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
  document.getElementById('ledger-drawer')?.classList.add('hidden');
}

// EVENT LISTENERS & FORMS
function setupEventListeners() {
  document.getElementById('search-input')?.addEventListener('input', renderDashboard);

  // New Client Form
  document.getElementById('client-form')?.addEventListener('submit', (e) => {
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
  document.getElementById('tx-form')?.addEventListener('submit', (e) => {
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
  document.getElementById('office-expense-form')?.addEventListener('submit', (e) => {
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

  // Passcode Modal
  document.getElementById('modal-cancel-btn')?.addEventListener('click', closeModal);
  document.getElementById('modal-confirm-btn')?.addEventListener('click', confirmDeleteAction);

  // Custom Search Dropdown
  const trigger = document.getElementById('dropdown-trigger');
  const list = document.getElementById('custom-dropdown-list');
  
  if (trigger && list) {
    trigger.addEventListener('click', () => list.classList.toggle('hidden'));
    document.getElementById('dropdown-search-input')?.addEventListener('input', (e) => {
      populateProjectDropdown(e.target.value.toLowerCase());
    });
  }
}

// CUSTOM DROPDOWN POPULATE
function populateProjectDropdown(search = '') {
  const container = document.getElementById('dropdown-items-container');
  if (!container) return;
  container.innerHTML = '';

  Object.keys(clientsData).forEach((id) => {
    const client = clientsData[id];
    if ((client.projectTitle || '').toLowerCase().includes(search) || (client.clientName || '').toLowerCase().includes(search)) {
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
        const selectedText = document.getElementById('dropdown-selected-text');
        if (selectedText) {
          selectedText.innerText = `${client.projectTitle} (${client.clientName})`;
          selectedText.className = "text-white font-bold";
        }
        document.getElementById('custom-dropdown-list')?.classList.add('hidden');
      };
      container.appendChild(div);
    }
  });
}

// DELETE HANDLERS
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
  document.getElementById('passcode-modal')?.classList.remove('hidden');
}

function closeModal() {
  document.getElementById('passcode-modal')?.classList.add('hidden');
  pendingDeleteAction = null;
}

function confirmDeleteAction() {
  const passcode = document.getElementById('modal-passcode-input')?.value;
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
  document.getElementById(`tab-${tabId}`)?.classList.remove('hidden');

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

// UTILS
function escapeHtml(str) {
  return String(str || '').replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
