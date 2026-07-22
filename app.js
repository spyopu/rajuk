/* ==========================================
   ডিজিটাল খাতা ও ইআরপি সিস্টেম - Main App Script
   ========================================== */

// Firebase Configuration & Initialization
// (Ensure your firebase credentials are setup or loaded properly)
const firebaseConfig = {
  // Your config here or auto-connected via project setup
};

// Initialize Firebase if not already initialized
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

const auth = firebase.auth();
const db = firebase.database();

// Global App States
let farmData = [];        // Clients & their project history
let officeExpenses = [];  // Office & Boss expenses
let currentFilter = 'all';
let currentUser = null;

// DOM Elements
const statusIndicator = document.getElementById('status-indicator');
const statusText = document.getElementById('status-text');
const googleLoginBtn = document.getElementById('google-login-btn');
const profileTrigger = document.getElementById('profile-trigger');
const profileDropdown = document.getElementById('profile-dropdown');
const userAvatar = document.getElementById('user-avatar');
const userDisplayName = document.getElementById('user-display-name');
const logoutBtn = document.getElementById('logout-btn');

const clientsTableBody = document.getElementById('clients-table-body');
const searchInput = document.getElementById('search-input');
const monthFilter = document.getElementById('month-filter');

// Initialize App on DOM Load
document.addEventListener('DOMContentLoaded', () => {
  initAuth();
  initNavigation();
  initMonthDefault();
  initEventListeners();
  
  // Set smooth touch actions for mobile UI (TallyKhata feel)
  document.body.style.touchAction = 'manipulation';
});

// --- AUTHENTICATION & FIREBASE SYNC ---
function initAuth() {
  auth.onAuthStateChanged(user => {
    if (user) {
      currentUser = user;
      googleLoginBtn.classList.add('hidden');
      profileTrigger.classList.remove('hidden');
      if(user.photoURL) userAvatar.src = user.photoURL;
      if(user.displayName) userDisplayName.innerText = user.displayName;
      
      statusIndicator.className = 'inline-block h-2 w-2 rounded-full bg-emerald-500';
      statusText.innerText = 'অনলাইন ও সিঙ্কড';

      loadFirebaseData();
    } else {
      currentUser = null;
      googleLoginBtn.classList.remove('hidden');
      profileTrigger.classList.add('hidden');
      
      statusIndicator.className = 'inline-block h-2 w-2 rounded-full bg-rose-500';
      statusText.innerText = 'লগইন করুন';
      
      // Clear data on logout
      farmData = [];
      officeExpenses = [];
      renderDashboard();
    }
  });

  googleLoginBtn.addEventListener('click', () => {
    const provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(provider).catch(error => {
      alert('লগইন ব্যর্থ হয়েছে: ' + error.message);
    });
  });

  profileTrigger.addEventListener('click', () => {
    profileDropdown.classList.toggle('hidden');
  });

  logoutBtn.addEventListener('click', () => {
    auth.signOut();
    profileDropdown.classList.add('hidden');
  });
}

// --- LOAD DATA FROM FIREBASE ---
function loadFirebaseData() {
  if (!currentUser) return;
  const uid = currentUser.uid;

  // Load Projects/Clients Data
  db.ref(`users/${uid}/clients`).on('value', snapshot => {
    const data = snapshot.val();
    farmData = [];
    if (data) {
      Object.keys(data).forEach(key => {
        farmData.push({ id: key, ...data[key], history: data[key].history ? Object.values(data[key].history) : [] });
      });
    }
    renderDashboard();
    populateDropdownItems();
  });

  // Load Office Expenses Data
  db.ref(`users/${uid}/officeExpenses`).on('value', snapshot => {
    const data = snapshot.val();
    officeExpenses = [];
    if (data) {
      Object.keys(data).forEach(key => {
        officeExpenses.push({ id: key, ...data[key] });
      });
    }
    renderOfficeExpenses();
  });
}

// --- NAVIGATION & TABS ---
function initNavigation() {
  // Handled inline via switchTab
}

window.switchTab = function(tabId) {
  document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
  document.getElementById(`tab-${tabId}`).classList.remove('hidden');

  // Update Desktop Nav styles
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.className = 'tab-btn px-4 py-2 text-xs md:text-sm font-bold rounded-lg transition text-slate-600 hover:text-rose-600';
  });
  const pcBtn = document.getElementById(`btn-${tabId}-pc`);
  if(pcBtn) pcBtn.className = 'tab-btn px-4 py-2 text-xs md:text-sm font-bold rounded-lg transition bg-rose-600 text-white shadow-sm';

  // Update Mobile Nav styles
  document.querySelectorAll('.mobile-tab-btn').forEach(btn => {
    btn.className = 'mobile-tab-btn flex flex-col items-center justify-center text-slate-500 text-[11px] font-bold py-1 transition';
  });
  const mobBtn = document.getElementById(`btn-${tabId}-mob`);
  if(mobBtn) mobBtn.className = 'mobile-tab-btn flex flex-col items-center justify-center text-rose-600 text-[11px] font-bold py-1 transition scale-105';

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// --- DATE DEFAULTS ---
function initMonthDefault() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  if(monthFilter) monthFilter.value = `${year}-${month}`;

  const todayStr = now.toISOString().split('T')[0];
  ['client-date', 'tx-date', 'oe-date'].forEach(id => {
    const el = document.getElementById(id);
    if(el) el.value = todayStr;
  });
}

// --- EVENT LISTENERS & FORMS ---
function initEventListeners() {
  if(searchInput) searchInput.addEventListener('input', renderDashboard);
  if(monthFilter) monthFilter.addEventListener('change', renderDashboard);

  // Client Form Submit
  const clientForm = document.getElementById('client-form');
  if(clientForm) {
    clientForm.addEventListener('submit', e => {
      e.preventDefault();
      if(!currentUser) { alert('আগে লগইন করুন!'); return; }

      const newClient = {
        name: document.getElementById('client-name').value,
        phone: document.getElementById('client-phone').value,
        date: document.getElementById('client-date').value,
        project: document.getElementById('project-title').value,
        budget: parseFloat(document.getElementById('project-budget').value) || 0,
        history: []
      };

      db.ref(`users/${currentUser.uid}/clients`).push(newClient).then(() => {
        clientForm.reset();
        initMonthDefault();
        switchTab('dashboard-view');
      });
    });
  }

  // Transaction Form Submit
  const txForm = document.getElementById('tx-form');
  if(txForm) {
    txForm.addEventListener('submit', e => {
      e.preventDefault();
      if(!currentUser) { alert('আগে লগইন করুন!'); return; }

      const clientId = document.getElementById('tx-client-select').value;
      if(!clientId) { alert('দয়া করে একটি প্রজেক্ট সিলেক্ট করুন'); return; }

      const tx = {
        date: document.getElementById('tx-date').value,
        type: document.getElementById('tx-type').value,
        amount: parseFloat(document.getElementById('tx-amount').value) || 0,
        details: document.getElementById('tx-details').value
      };

      const clientRef = db.ref(`users/${currentUser.uid}/clients/${clientId}/history`);
      clientRef.push(tx).then(() => {
        txForm.reset();
        initMonthDefault();
        document.getElementById('dropdown-selected-text').innerText = 'প্রজেক্ট সিলেক্ট করুন...';
        document.getElementById('dropdown-selected-text').className = 'text-slate-500';
        switchTab('dashboard-view');
      });
    });
  }

  // Office Expense Form Submit
  const oeForm = document.getElementById('office-expense-form');
  if(oeForm) {
    oeForm.addEventListener('submit', e => {
      e.preventDefault();
      if(!currentUser) { alert('আগে লগইন করুন!'); return; }

      const oe = {
        category: document.getElementById('oe-category').value,
        date: document.getElementById('oe-date').value,
        amount: parseFloat(document.getElementById('oe-amount').value) || 0,
        details: document.getElementById('oe-details').value
      };

      db.ref(`users/${currentUser.uid}/officeExpenses`).push(oe).then(() => {
        oeForm.reset();
        initMonthDefault();
      });
    });
  }

  // Custom Searchable Dropdown Toggle
  const dropdownTrigger = document.getElementById('dropdown-trigger');
  const customDropdownList = document.getElementById('custom-dropdown-list');
  const dropdownSearchInput = document.getElementById('dropdown-search-input');

  if(dropdownTrigger && customDropdownList) {
    dropdownTrigger.addEventListener('click', () => {
      customDropdownList.classList.toggle('hidden');
      if(!customDropdownList.classList.contains('hidden') && dropdownSearchInput) {
        dropdownSearchInput.focus();
      }
    });

    document.addEventListener('click', e => {
      if(!dropdownTrigger.contains(e.target) && !customDropdownList.contains(e.target)) {
        customDropdownList.classList.add('hidden');
      }
    });
  }

  if(dropdownSearchInput) {
    dropdownSearchInput.addEventListener('input', populateDropdownItems);
  }
}

// --- POPULATE DROPDOWN ITEMS ---
function populateDropdownItems() {
  const container = document.getElementById('dropdown-items-container');
  const searchInputVal = document.getElementById('dropdown-search-input').value.toLowerCase();
  if(!container) return;

  container.innerHTML = '';
  const filtered = farmData.filter(c => c.name.toLowerCase().includes(searchInputVal) || c.project.toLowerCase().includes(searchInputVal));

  if(filtered.length === 0) {
    container.innerHTML = '<div class="p-3 text-xs text-slate-400 text-center">কোনো প্রজেক্ট পাওয়া যায়নি</div>';
    return;
  }

  filtered.forEach(c => {
    const item = document.createElement('div');
    item.className = 'p-2.5 hover:bg-rose-50 rounded-xl cursor-pointer text-xs font-semibold flex justify-between items-center transition';
    item.innerHTML = `<span>${c.name} - <span class="text-slate-500">${c.project}</span></span> <span class="font-mono text-rose-600">${c.phone}</span>`;
    item.addEventListener('click', () => {
      document.getElementById('tx-client-select').value = c.id;
      const selText = document.getElementById('dropdown-selected-text');
      selText.innerText = `${c.name} (${c.project})`;
      selText.className = 'text-slate-900 font-bold';
      document.getElementById('custom-dropdown-list').classList.add('hidden');
    });
    container.appendChild(item);
  });
}

// --- FILTER & RENDER DASHBOARD ---
window.setClientFilter = function(type) {
  currentFilter = type;
  ['all', 'new', 'old'].forEach(t => {
    const btn = document.getElementById(`filter-btn-${t}`);
    if(btn) {
      if(t === type) {
        btn.className = 'px-3.5 py-1.5 text-xs font-bold rounded-lg transition bg-rose-600 text-white shadow-sm';
      } else {
        btn.className = 'px-3.5 py-1.5 text-xs font-bold rounded-lg transition text-slate-600 hover:text-rose-600';
      }
    }
  });
  renderDashboard();
}

function renderDashboard() {
  if(!clientsTableBody) return;

  const searchText = searchInput ? searchInput.value.toLowerCase() : '';
  const monthVal = monthFilter ? monthFilter.value : '';

  let targetYear, targetMonth;
  if(monthVal) {
    const p = monthVal.split('-');
    targetYear = parseInt(p[0]);
    targetMonth = parseInt(p[1]) - 1;
  }

  clientsTableBody.innerHTML = '';

  let gBudget = 0, gIncome = 0, gExpense = 0, gDue = 0;

  // Filter Farm Data
  let displayedClients = farmData.filter(c => {
    const matchSearch = c.name.toLowerCase().includes(searchText) || c.phone.toLowerCase().includes(searchText) || c.project.toLowerCase().includes(searchText);
    if(!matchSearch) return false;

    if(currentFilter === 'new') {
      // Created in selected month
      if(monthVal) {
        const cDate = new Date(c.date);
        return cDate.getFullYear() === targetYear && cDate.getMonth() === targetMonth;
      }
    } else if(currentFilter === 'old') {
      return true; // Ongoing or standard filter
    }
    return true;
  });

  if(displayedClients.length === 0) {
    clientsTableBody.innerHTML = `<tr><td colspan="7" class="p-6 text-center text-slate-400 text-xs">কোনো তথ্য পাওয়া যায়নি</td></tr>`;
  }

  displayedClients.forEach(c => {
    let totalPaid = 0;
    let totalProjExp = 0;

    c.history.forEach(t => {
      const tDate = new Date(t.date);
      let inMonth = true;
      if(monthVal) {
        inMonth = (tDate.getFullYear() === targetYear && tDate.getMonth() === targetMonth);
      }
      if(inMonth) {
        if(t.type === 'income') totalPaid += Number(t.amount || 0);
        if(t.type === 'expense') totalProjExp += Number(t.amount || 0);
      }
    });

    let due = c.budget - totalPaid;
    gBudget += c.budget;
    gIncome += totalPaid;
    gExpense += totalProjExp;
    gDue += due > 0 ? due : 0;

    const tr = document.createElement('tr');
    tr.className = 'hover:bg-slate-50/80 cursor-pointer transition border-b border-slate-100';
    tr.innerHTML = `
      <td class="p-4 pl-5">
        <div class="font-bold text-slate-900">${c.name}</div>
        <div class="text-[11px] text-slate-500 font-medium">${c.project}</div>
      </td>
      <td class="p-4 font-mono text-slate-600">${c.phone}</td>
      <td class="p-4 text-right font-mono font-bold text-slate-900">৳${c.budget.toLocaleString('en-IN')}</td>
      <td class="p-4 text-right font-mono font-bold text-emerald-600">৳${totalPaid.toLocaleString('en-IN')}</td>
      <td class="p-4 text-right font-mono font-bold text-rose-600">৳${totalProjExp.toLocaleString('en-IN')}</td>
      <td class="p-4 text-right font-mono font-bold text-amber-600">৳${due > 0 ? due.toLocaleString('en-IN') : 0}</td>
      <td class="p-4 text-center">
        <button onclick="event.stopPropagation(); deleteClient('${c.id}')" class="bg-slate-100 hover:bg-rose-100 hover:text-rose-600 text-slate-400 p-2 rounded-xl transition text-xs">🗑️</button>
      </td>
    `;
    tr.addEventListener('click', () => openDrawer(c));
    clientsTableBody.appendChild(tr);
  });

  let netProfit = gIncome - gExpense;

  // Update Global Summary Cards
  document.getElementById('global-budget').innerText = '৳' + gBudget.toLocaleString('en-IN');
  document.getElementById('global-income').innerText = '৳' + gIncome.toLocaleString('en-IN');
  document.getElementById('global-expense').innerText = '৳' + gExpense.toLocaleString('en-IN');
  document.getElementById('global-due').innerText = '৳' + gDue.toLocaleString('en-IN');
  
  const netEl = document.getElementById('global-net');
  netEl.innerText = '৳' + netProfit.toLocaleString('en-IN');
  netEl.className = netProfit >= 0 ? 'text-lg md:text-2xl font-black text-emerald-400 mt-1' : 'text-lg md:text-2xl font-black text-rose-400 mt-1';
}

// --- LEDGER DRAWER SHEET ---
function openDrawer(client) {
  const drawer = document.getElementById('ledger-drawer');
  drawer.classList.remove('hidden');
  document.getElementById('drawer-title').innerText = client.name + ' - ' + client.project;
  document.getElementById('drawer-sub').innerText = `মোবাইল: ${client.phone} | বাজেট: ৳${client.budget.toLocaleString('en-IN')}`;

  const tbody = document.getElementById('drawer-table-body');
  tbody.innerHTML = '';

  if(!client.history || client.history.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="p-4 text-center text-slate-400 text-xs">কোনো লেনদেন এন্ট্রি নেই</td></tr>`;
    return;
  }

  client.history.forEach((t, idx) => {
    const isIncome = t.type === 'income';
    const tr = document.createElement('tr');
    tr.className = 'hover:bg-slate-50 transition border-b border-slate-100';
    tr.innerHTML = `
      <td class="p-3 pl-4 font-mono text-slate-600">${t.date}</td>
      <td class="p-3 font-semibold text-slate-800">${t.details}</td>
      <td class="p-3">
        <span class="px-2.5 py-1 rounded-full text-[10px] font-bold ${isIncome ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}">
          ${isIncome ? 'টাকা জমা' : 'প্রজেক্ট খরচ'}
        </span>
      </td>
      <td class="p-3 text-right font-mono font-bold ${isIncome ? 'text-emerald-600' : 'text-rose-600'}">
        ${isIncome ? '+' : '-'}৳${Number(t.amount).toLocaleString('en-IN')}
      </td>
      <td class="p-3 text-center">
        <button onclick="deleteTransaction('${client.id}', ${idx})" class="text-slate-400 hover:text-rose-600 transition text-xs">🗑️</button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  drawer.scrollIntoView({ behavior: 'smooth' });
}

window.closeDrawer = function() {
  document.getElementById('ledger-drawer').classList.add('hidden');
}

// --- DELETE HANDLERS ---
window.deleteClient = function(clientId) {
  if(confirm('সত্যিই এই প্রজেক্ট এবং এর সকল লেনদেন মুছে ফেলতে চান?')) {
    db.ref(`users/${currentUser.uid}/clients/${clientId}`).remove();
    document.getElementById('ledger-drawer').classList.add('hidden');
  }
}

window.deleteTransaction = function(clientId, txIndex) {
  if(confirm('এই লেনদেনটি মুছে ফেলতে চান?')) {
    const client = farmData.find(c => c.id === clientId);
    if(client && client.history) {
      client.history.splice(txIndex, 1);
      db.ref(`users/${currentUser.uid}/clients/${clientId}/history`).set(client.history);
      openDrawer(client);
    }
  }
}

// --- OFFICE EXPENSES RENDERING ---
function renderOfficeExpenses() {
  const tbody = document.getElementById('office-expense-rows');
  if(!tbody) return;

  const monthVal = monthFilter ? monthFilter.value : '';
  let targetYear, targetMonth;
  if(monthVal) {
    const p = monthVal.split('-');
    targetYear = parseInt(p[0]);
    targetMonth = parseInt(p[1]) - 1;
  }

  tbody.innerHTML = '';
  let filtered = officeExpenses.filter(oe => {
    if(!monthVal) return true;
    const d = new Date(oe.date);
    return d.getFullYear() === targetYear && d.getMonth() === targetMonth;
  });

  if(filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" class="p-4 text-center text-slate-400 text-xs">এই মাসের কোনো অফিস খরচ নেই</td></tr>`;
    return;
  }

  filtered.forEach(oe => {
    const tr = document.createElement('tr');
    tr.className = 'hover:bg-slate-50 transition border-b border-slate-100';
    tr.innerHTML = `
      <td class="p-4 pl-5">
        <div class="font-bold text-slate-900">${oe.details}</div>
        <div class="text-[11px] text-rose-600 font-semibold">${oe.category}</div>
      </td>
      <td class="p-4 font-mono text-slate-600">${oe.date}</td>
      <td class="p-4 text-right font-mono font-bold text-rose-600">৳${Number(oe.amount).toLocaleString('en-IN')}</td>
      <td class="p-4 text-center">
        <button onclick="deleteOfficeExpense('${oe.id}')" class="bg-slate-100 hover:bg-rose-100 hover:text-rose-600 text-slate-400 p-2 rounded-xl transition text-xs">🗑️</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

window.deleteOfficeExpense = function(id) {
  if(confirm('এই খরচটি মুছে ফেলতে চান?')) {
    db.ref(`users/${currentUser.uid}/officeExpenses/${id}`).remove();
  }
}

// --- TALLYKHATA STYLE SMOOTH MONTHLY REPORT SYSTEM ---
window.openMonthlyReportModal = function() {
  const modal = document.getElementById('monthlyReportModal');
  if(!modal) return;
  calculateReportMetrics();
  modal.classList.remove('hidden');
}

window.closeMonthlyReportModal = function() {
  const modal = document.getElementById('monthlyReportModal');
  if(modal) modal.classList.add('hidden');
}

function calculateReportMetrics() {
  const monthInput = document.getElementById('month-filter');
  let targetYear, targetMonth;

  if (monthInput && monthInput.value) {
    const parts = monthInput.value.split('-'); 
    targetYear = parseInt(parts[0]);
    targetMonth = parseInt(parts[1]) - 1; 
  } else {
    const now = new Date();
    targetYear = now.getFullYear();
    targetMonth = now.getMonth();
  }
  
  const startOfMonth = new Date(targetYear, targetMonth, 1);
  const endOfMonth = new Date(targetYear, targetMonth + 1, 0, 23, 59, 59);

  let totalIncome = 0;
  let projectExpense = 0;
  let totalOfficeExpense = 0;
  let bossIn = 0;
  let bossOut = 0;

  if (typeof farmData !== 'undefined') {
    farmData.forEach(c => {
      if (c.history && Array.isArray(c.history)) {
        c.history.forEach(t => {
          const tDate = new Date(t.date);
          if (tDate >= startOfMonth && tDate <= endOfMonth) {
            if (t.type === 'income') totalIncome += Number(t.amount || 0);
            if (t.type === 'expense') projectExpense += Number(t.amount || 0);
          }
        });
      }
    });
  }

  if (typeof officeExpenses !== 'undefined') {
    officeExpenses.forEach(oe => {
      const oeDate = new Date(oe.date);
      if (oeDate >= startOfMonth && oeDate <= endOfMonth) {
        const amt = Number(oe.amount || 0);
        totalOfficeExpense += amt;
        if (oe.category === 'Boss Expense') {
          bossOut += amt;
        } else if (oe.category === 'Boss Fund') {
          bossIn += amt;
        }
      }
    });
  }

  let grossProfit = totalIncome - projectExpense;
  let netProfit = grossProfit - totalOfficeExpense;
  let bossDue = bossIn - bossOut;

  const updateEl = (id, val) => {
    const el = document.getElementById(id);
    if(el) el.innerText = '৳' + val.toLocaleString('en-IN');
  };

  updateEl('rep-total-income', totalIncome);
  updateEl('rep-project-expense', projectExpense);
  updateEl('rep-gross-profit', grossProfit);
  updateEl('rep-office-expense', totalOfficeExpense);
  updateEl('rep-net-profit', netProfit);
  updateEl('rep-boss-in', bossIn);
  updateEl('rep-boss-out', bossOut);
  updateEl('rep-boss-due', bossDue);
}

// Auto update report modal if open when filter changes
if(monthFilter) {
  monthFilter.addEventListener('change', () => {
    const modal = document.getElementById('monthlyReportModal');
    if(modal && !modal.classList.contains('hidden')) {
      calculateReportMetrics();
    }
  });
}
