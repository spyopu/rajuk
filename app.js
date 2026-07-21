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

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const rtdb = firebase.database();

// Global Security Passcode
const SECURITY_PASSCODE = "1234";

// State Memory Management Variables
let farmData = [];
let officeExpenses = [];
let databasePathRef = null;
let openLedgerId = null;
let activeClientFilter = 'none';

// Catch UI Reference Elements
const loginBtn = document.getElementById('google-login-btn');
const logoutBtn = document.getElementById('logout-btn');
const profileTrigger = document.getElementById('profile-trigger');
const profileDropdown = document.getElementById('profile-dropdown');
const sidebarAuthSection = document.getElementById('sidebar-auth-section');

const clientForm = document.getElementById('client-form');
const txForm = document.getElementById('tx-form');
const officeExpenseForm = document.getElementById('office-expense-form');
const tableBody = document.getElementById('clients-table-body');
const officeExpenseRows = document.getElementById('office-expense-rows');
const ledgerDrawer = document.getElementById('ledger-drawer');
const searchInput = document.getElementById('search-input');
const monthFilter = document.getElementById('month-filter');

// Initialize Today's Date Values Input fields
if(document.getElementById('tx-date')) document.getElementById('tx-date').value = new Date().toISOString().substring(0, 10);
if(document.getElementById('oe-date')) document.getElementById('oe-date').value = new Date().toISOString().substring(0, 10);

// Initialize Default Value for Month Filter (Current Month)
if (monthFilter) {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  monthFilter.value = `${year}-${month}`;
  monthFilter.addEventListener('change', uiUpdatePipeline);
}

// Bind search bar trigger dynamically
if (searchInput) {
  searchInput.addEventListener('input', () => {
    switchTab('dashboard-view');
    if(activeClientFilter === 'none') {
      setClientFilter('all');
    } else {
      renderMasterTable();
    }
  });
}

// PREMIUM TAB SYSTEM CONTROLLER
window.switchTab = function(tabId) {
  document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
  document.getElementById(`tab-${tabId}`).classList.remove('hidden');

  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.className = "tab-btn flex items-center gap-2.5 text-xs font-bold px-3 py-2.5 rounded-lg transition text-slate-400 hover:text-white hover:bg-[#1e202b] text-left border border-transparent w-full";
  });

  const activeBtn = document.getElementById(`btn-${tabId}`);
  if(activeBtn) {
    activeBtn.className = "tab-btn w-full flex items-center gap-2.5 text-xs font-bold px-3 py-2.5 rounded-lg transition bg-indigo-600 text-white shadow-md text-left border border-indigo-500/20";
  }
}

// Control Table Visibility and Custom States
window.setClientFilter = function(filterType) {
  activeClientFilter = filterType;
  
  const container = document.getElementById('master-table-container');
  const btnAll = document.getElementById('filter-btn-all');
  const btnNew = document.getElementById('filter-btn-new');
  const btnOld = document.getElementById('filter-btn-old');
  
  [btnAll, btnNew, btnOld].forEach(btn => {
    if(btn) btn.className = "px-3 py-1.5 text-[11px] font-bold rounded-md transition-all text-slate-400 hover:text-white";
  });
  
  const activeBtn = document.getElementById(`filter-btn-${filterType}`);
  if(activeBtn) activeBtn.className = "px-3 py-1.5 text-[11px] font-bold rounded-md transition-all bg-indigo-600 text-white shadow-sm";
  
  if(container) {
    if(filterType === 'none') {
      container.classList.add('hidden');
    } else {
      container.classList.remove('hidden');
    }
  }
  
  renderMasterTable();
}

// Initialize System Pipelines
uiUpdatePipeline();
setClientFilter('none');

// User Menu Events Handlers
if (profileTrigger) {
  profileTrigger.addEventListener('click', (e) => {
    e.stopPropagation();
    if (profileDropdown) profileDropdown.classList.toggle('hidden');
  });
}

document.addEventListener('click', () => {
  if (profileDropdown) profileDropdown.classList.add('hidden');
});

if (loginBtn) {
  loginBtn.addEventListener('click', () => {
    const provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(provider).catch(err => alert("Login failed: " + err.message));
  });
}

if (logoutBtn) {
  logoutBtn.addEventListener('click', () => {
    auth.signOut().then(() => window.location.reload());
  });
}

// Firebase Auth Authentication State Realtime Observers
auth.onAuthStateChanged(user => {
  if (user) {
    if (sidebarAuthSection) sidebarAuthSection.classList.add('hidden');
    if (profileTrigger) profileTrigger.classList.remove('hidden');
    
    const indicator = document.getElementById('status-indicator');
    const text = document.getElementById('status-text');
    if (indicator) indicator.className = "inline-block h-2 w-2 rounded-full bg-emerald-500 animate-pulse";
    if (text) text.innerText = "Firebase Realtime Cloud (100% Secured)";
    
    if (document.getElementById('user-display-name')) document.getElementById('user-display-name').innerText = user.displayName;
    if (document.getElementById('user-display-email')) document.getElementById('user-display-email').innerText = user.email;
    if (document.getElementById('user-avatar')) document.getElementById('user-avatar').src = user.photoURL || "https://via.placeholder.com/150";

    databasePathRef = rtdb.ref('rajuk_erp_data/' + user.uid);
    subscribeToCloudStreams();
  } else {
    if (sidebarAuthSection) sidebarAuthSection.classList.remove('hidden');
    if (profileTrigger) profileTrigger.classList.add('hidden');
    
    const indicator = document.getElementById('status-indicator');
    const text = document.getElementById('status-text');
    if (indicator) indicator.className = "inline-block h-2 w-2 rounded-full bg-amber-500 animate-pulse";
    if (text) text.innerText = "Offline / Guest Mode";
    
    farmData = [];
    officeExpenses = [];
    databasePathRef = null;
    uiUpdatePipeline();
  }
});

// Sync Stream listeners with Firebase Cloud Node 
function subscribeToCloudStreams() {
  if(!databasePathRef) return;
  databasePathRef.child('clients').on('value', snapshot => {
    farmData = [];
    snapshot.forEach(childSnapshot => {
      const val = childSnapshot.val();
      if(!val.history) val.history = [];
      else if(!Array.isArray(val.history)) {
        val.history = Object.keys(val.history).map(k => val.history[k]);
      }
      farmData.push({ id: childSnapshot.key, ...val });
    });
    uiUpdatePipeline();
  });

  databasePathRef.child('office_expenses').on('value', snapshot => {
    officeExpenses = [];
    snapshot.forEach(childSnapshot => {
      officeExpenses.push({ id: childSnapshot.key, ...childSnapshot.val() });
    });
    officeExpenses.sort((a,b) => new Date(b.date) - new Date(a.date));
    uiUpdatePipeline();
  });
}

function uiUpdatePipeline() {
  calculateGlobalMetrics();
  renderDropdown();
  renderMasterTable();
  renderOfficeExpenses();
  if(openLedgerId) refreshDrawer(openLedgerId);
}

// Calculate Dashboard Total Amounts
function calculateGlobalMetrics() {
  let budget = 0, income = 0, prjExpense = 0, due = 0, totalOfficeExpense = 0;
  
  let targetYear, targetMonth;
  if (monthFilter && monthFilter.value) {
    const parts = monthFilter.value.split('-'); 
    targetYear = parseInt(parts[0]);
    targetMonth = parseInt(parts[1]) - 1; 
  } else {
    const now = new Date();
    targetYear = now.getFullYear();
    targetMonth = now.getMonth();
  }
  
  const startOfMonth = new Date(targetYear, targetMonth, 1);
  const endOfMonth = new Date(targetYear, targetMonth + 1, 0, 23, 59, 59);
  const monthLabel = startOfMonth.toLocaleString('default', { month: 'long', year: 'numeric' });

  farmData.forEach(c => {
    budget += c.budget; 
    let cIncome = 0;
    
    c.history.forEach(t => {
      const tDate = new Date(t.date);
      const isSelectedMonth = (tDate >= startOfMonth && tDate <= endOfMonth);

      if (t.type === 'income') {
        cIncome += t.amount; 
        if (isSelectedMonth) income += t.amount; 
      }
      if (t.type === 'expense' && isSelectedMonth) {
        prjExpense += t.amount; 
      }
    });
    due += (c.budget - cIncome); 
  });

  officeExpenses.forEach(oe => {
    const oeDate = new Date(oe.date);
    if (oeDate >= startOfMonth && oeDate <= endOfMonth) {
      totalOfficeExpense += oe.amount;
    }
  });

  let grandTotalExpense = prjExpense + totalOfficeExpense;
  let netIncome = income - grandTotalExpense;

  if (document.getElementById('global-budget')) document.getElementById('global-budget').innerText = '৳' + budget.toLocaleString('en-IN');
  
  const incomeCard = document.getElementById('global-income');
  if (incomeCard) {
    incomeCard.innerText = '৳' + income.toLocaleString('en-IN');
    incomeCard.previousElementSibling.innerText = `Gross Income (${monthLabel})`;
  }
  
  const expenseCard = document.getElementById('global-expense');
  if (expenseCard) {
    expenseCard.innerText = '৳' + grandTotalExpense.toLocaleString('en-IN');
    expenseCard.previousElementSibling.innerText = `Total Cost (${monthLabel})`;
  }
  
  if (document.getElementById('global-due')) document.getElementById('global-due').innerText = '৳' + due.toLocaleString('en-IN');
  
  const netCard = document.getElementById('global-net');
  if (netCard) {
    netCard.innerText = '৳' + netIncome.toLocaleString('en-IN');
    netCard.previousElementSibling.innerText = `Net Balance (${monthLabel})`;
  }
}


// ==========================================
// Compact Passcode Modal Handler
// ==========================================
let pendingDeleteAction = null;

function requestPasscodeAuth(onSuccess) {
  const modal = document.getElementById('securityModal');
  const passInput = document.getElementById('modalPasscodeInput');
  const confirmBtn = document.getElementById('modalConfirmBtn');
  const cancelBtn = document.getElementById('modalCancelBtn');

  if (!modal || !passInput) return;

  passInput.value = '';
  passInput.classList.remove('border-red-500');
  pendingDeleteAction = onSuccess;
  modal.classList.remove('hidden');
  
  setTimeout(() => passInput.focus(), 50);

  // Submit on Enter Key
  passInput.onkeyup = function(e) {
    if (e.key === 'Enter') confirmBtn.click();
  };

  confirmBtn.onclick = function() {
    const enteredPass = passInput.value.trim();
    if (enteredPass === SECURITY_PASSCODE) {
      modal.classList.add('hidden');
      if (pendingDeleteAction) pendingDeleteAction();
    } else {
      passInput.classList.add('border-red-500');
      passInput.value = '';
      passInput.focus();
    }
  };

  cancelBtn.onclick = function() {
    modal.classList.add('hidden');
    pendingDeleteAction = null;
  };
}


// ==========================================
// Silent Submit Handlers (No Alert Popups)
// ==========================================
if (clientForm) {
  clientForm.addEventListener('submit', (e) => {
    e.preventDefault();
    if(!databasePathRef) return;
    const newClient = {
      name: document.getElementById('client-name').value,
      phone: document.getElementById('client-phone').value,
      project: document.getElementById('project-title').value,
      budget: parseFloat(document.getElementById('project-budget').value),
      history: []
    };
    databasePathRef.child('clients').push(newClient);
    clientForm.reset();
    setClientFilter('all');
    switchTab('dashboard-view');
  });
}

if (txForm) {
  txForm.addEventListener('submit', (e) => {
    e.preventDefault();
    if(!databasePathRef) return;
    const id = document.getElementById('tx-client-select').value;
    if(!id) return;
    
    const client = farmData.find(c => c.id === id);
    if(client) {
      const updatedHistory = client.history || [];
      updatedHistory.push({
        id: 't_' + Date.now(),
        type: document.getElementById('tx-type').value,
        amount: parseFloat(document.getElementById('tx-amount').value),
        details: document.getElementById('tx-details').value,
        date: document.getElementById('tx-date').value
      });
      updatedHistory.sort((a,b) => new Date(b.date) - new Date(a.date));
      
      databasePathRef.child('clients').child(id).update({ history: updatedHistory });
      
      document.getElementById('tx-amount').value = '';
      document.getElementById('tx-details').value = '';
      document.getElementById('tx-client-select').value = '';
      
      const selectedText = document.getElementById('dropdown-selected-text');
      if (selectedText) {
        selectedText.innerText = 'Select Project Profile...';
        selectedText.className = 'text-slate-500';
      }

      setClientFilter('all');
      uiUpdatePipeline();
      switchTab('dashboard-view');
    }
  });
}

if (officeExpenseForm) {
  officeExpenseForm.addEventListener('submit', (e) => {
    e.preventDefault();
    if(!databasePathRef) return;
    const newExpense = {
      category: document.getElementById('oe-category').value,
      amount: parseFloat(document.getElementById('oe-amount').value),
      details: document.getElementById('oe-details').value,
      date: document.getElementById('oe-date').value
    };
    databasePathRef.child('office_expenses').push(newExpense);
    document.getElementById('oe-amount').value = '';
    document.getElementById('oe-details').value = '';
    uiUpdatePipeline();
  });
}


// Searchable Dropdown Logics
function renderDropdown() {
  const trigger = document.getElementById('dropdown-trigger');
  const dropdownList = document.getElementById('custom-dropdown-list');
  const dropdownSearchInput = document.getElementById('dropdown-search-input');
  const itemsContainer = document.getElementById('dropdown-items-container');
  const hiddenInput = document.getElementById('tx-client-select');
  const selectedText = document.getElementById('dropdown-selected-text');

  if (!trigger || !dropdownList || !itemsContainer) return;

  trigger.onclick = function(e) {
    e.stopPropagation();
    dropdownList.classList.toggle('hidden');
    if (!dropdownList.classList.contains('hidden') && dropdownSearchInput) {
      dropdownSearchInput.value = '';
      filterDropdownItems('');
      dropdownSearchInput.focus();
    }
  };

  document.onclick = function() {
    dropdownList.classList.add('hidden');
  };

  dropdownList.onclick = function(e) {
    e.stopPropagation();
  };

  function filterDropdownItems(query) {
    itemsContainer.innerHTML = '';
    
    const filtered = farmData.filter(c => 
      c.project.toLowerCase().includes(query.toLowerCase()) || 
      c.name.toLowerCase().includes(query.toLowerCase())
    );

    if (filtered.length === 0) {
      itemsContainer.innerHTML = `<div class="p-2.5 text-xs text-slate-500 text-center">No projects found</div>`;
      return;
    }

    filtered.forEach(c => {
      const item = document.createElement('div');
      item.className = "p-2.5 text-xs text-slate-300 hover:bg-indigo-600 hover:text-white rounded-lg cursor-pointer transition-all font-medium flex justify-between items-center";
      item.innerHTML = `<span>${c.project} <span class="text-[10px] text-slate-500">(${c.name})</span></span>`;
      
      item.onclick = function() {
        hiddenInput.value = c.id;
        selectedText.innerText = `${c.project} (${c.name})`;
        selectedText.className = "text-white font-semibold";
        dropdownList.classList.add('hidden');
      };
      
      itemsContainer.appendChild(item);
    });
  }

  if (dropdownSearchInput) {
    dropdownSearchInput.oninput = function() {
      filterDropdownItems(this.value);
    };
  }

  if (farmData.length === 0) {
    selectedText.innerText = "No Active Projects Available";
    selectedText.className = "text-slate-500";
    hiddenInput.value = "";
  } else {
    if(!hiddenInput.value) {
      selectedText.innerText = "Select Project Profile...";
      selectedText.className = "text-slate-500";
    } else {
      const current = farmData.find(c => c.id === hiddenInput.value);
      if(current) {
        selectedText.innerText = `${current.project} (${current.name})`;
        selectedText.className = "text-white font-semibold";
      } else {
        selectedText.innerText = "Select Project Profile...";
        selectedText.className = "text-slate-500";
        hiddenInput.value = "";
      }
    }
  }
}

// Master Table Rendering
function renderMasterTable() {
  if (!tableBody) return;
  const query = searchInput ? searchInput.value.toLowerCase().trim() : '';
  const container = document.getElementById('master-table-container');
  
  if (!auth.currentUser) {
    if(container) container.classList.remove('hidden');
    tableBody.innerHTML = `<tr><td colspan="7" class="p-6 text-center text-amber-500 font-semibold bg-slate-900/40">⚠️ Dashboard is blank. Please sign in with Google from the top menu to view database files.</td></tr>`;
    return;
  }

  if (activeClientFilter === 'none') {
    if(container) container.classList.add('hidden');
    return;
  }

  if (farmData.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="7" class="p-6 text-center text-slate-500 font-medium bg-slate-900/40">No records found. Please add a client first.</td></tr>`;
    return;
  }

  let filteredData = farmData.filter(c => {
    return c.name.toLowerCase().includes(query) || 
           c.phone.includes(query) || 
           c.project.toLowerCase().includes(query);
  });

  if (activeClientFilter === 'new') {
    filteredData = filteredData.filter(c => {
      const hasIncome = c.history.some(t => t.type === 'income');
      return !hasIncome;
    });
  } else if (activeClientFilter === 'old') {
    filteredData = filteredData.filter(c => {
      const hasIncome = c.history.some(t => t.type === 'income');
      return hasIncome;
    });
  }

  tableBody.innerHTML = filteredData.length === 0 ? 
    `<tr><td colspan="7" class="p-6 text-center text-slate-500 font-medium bg-slate-900/40">No matching profiles found in this category.</td></tr>` : '';

  filteredData.forEach(c => {
    let localIncome = 0, localExpense = 0;
    c.history.forEach(t => {
      if(t.type === 'income') localIncome += t.amount;
      if(t.type === 'expense') localExpense += t.amount;
    });
    let cDue = c.budget - localIncome;

    const tr = document.createElement('tr');
    tr.className = "hover:bg-slate-800/40 transition font-medium border-b border-slate-800 last:border-none text-slate-300";
    tr.innerHTML = `
      <td class="p-4 pl-6">
        <div class="font-bold text-slate-100 text-sm">${c.project}</div>
        <div class="text-[11px] text-slate-500 mt-0.5">${c.name}</div>
      </td>
      <td class="p-4 font-mono text-xs text-slate-400">${c.phone}</td>
      <td class="p-4 text-right font-bold text-slate-100">৳${c.budget.toLocaleString('en-IN')}</td>
      <td class="p-4 text-right font-bold text-emerald-400">৳${localIncome.toLocaleString('en-IN')}</td>
      <td class="p-4 text-right font-bold text-red-400">৳${localExpense.toLocaleString('en-IN')}</td>
      <td class="p-4 text-right font-black ${cDue > 0 ? 'text-amber-500' : 'text-slate-500'}">৳${cDue.toLocaleString('en-IN')}</td>
      <td class="p-4 pr-6 text-center">
        <div class="flex justify-center items-center gap-2">
          <button onclick="openDrawer('${c.id}')" class="bg-slate-800 hover:bg-emerald-600 hover:text-white text-slate-200 px-3 py-1.5 rounded-xl text-[11px] font-bold transition">Ledger</button>
          <button onclick="deleteClient('${c.id}')" class="text-slate-600 hover:text-red-500 font-bold p-1 transition">✕</button>
        </div>
      </td>
    `;
    tableBody.appendChild(tr);
  });
}

function renderOfficeExpenses() {
  if (!officeExpenseRows) return;
  
  let targetYear, targetMonth;
  if (monthFilter && monthFilter.value) {
    const parts = monthFilter.value.split('-');
    targetYear = parseInt(parts[0]);
    targetMonth = parseInt(parts[1]) - 1;
  } else {
    const now = new Date();
    targetYear = now.getFullYear();
    targetMonth = now.getMonth();
  }
  const startOfMonth = new Date(targetYear, targetMonth, 1);
  const endOfMonth = new Date(targetYear, targetMonth + 1, 0, 23, 59, 59);

  const localFilteredExpenses = officeExpenses.filter(oe => {
    const d = new Date(oe.date);
    return d >= startOfMonth && d <= endOfMonth;
  });

  if (localFilteredExpenses.length === 0) {
    officeExpenseRows.innerHTML = `<tr><td colspan="4" class="p-3 text-center text-slate-500">${auth.currentUser ? 'No expenses logged for this month.' : 'Please login to track expenses.'}</td></tr>`;
    return;
  }

  officeExpenseRows.innerHTML = '';
  localFilteredExpenses.forEach(oe => {
    const tr = document.createElement('tr');
    tr.className = "border-b border-slate-800 last:border-none";
    tr.innerHTML = `
      <td class="p-3 pl-3 font-semibold text-slate-200">${oe.details} <span class="text-[9px] bg-red-950 text-red-400 px-1.5 py-0.5 rounded border border-red-900/50 font-bold">${oe.category}</span></td>
      <td class="p-3 text-slate-500 font-mono text-[10px]">${oe.date}</td>
      <td class="p-3 text-right font-bold text-red-400">৳${oe.amount.toLocaleString('en-IN')}</td>
      <td class="p-3 text-center"><button onclick="deleteOfficeExpense('${oe.id}')" class="text-slate-600 hover:text-red-500 font-bold transition">✕</button></td>
    `;
    officeExpenseRows.appendChild(tr);
  });
}

// Drawer Drawer Sheet Controllers
window.openDrawer = function(id) {
  openLedgerId = id;
  if (ledgerDrawer) {
    ledgerDrawer.classList.remove('hidden');
    refreshDrawer(id);
    ledgerDrawer.scrollIntoView({ behavior: 'smooth' });
  }
}

window.closeDrawer = function() {
  openLedgerId = null;
  if (ledgerDrawer) ledgerDrawer.classList.add('hidden');
}

function refreshDrawer(id) {
  const client = farmData.find(c => c.id === id);
  if(!client) return closeDrawer();

  if (document.getElementById('drawer-title')) document.getElementById('drawer-title').innerText = `🏢 File: ${client.project} (${client.name})`;
  if (document.getElementById('drawer-sub')) document.getElementById('drawer-sub').innerText = `Contact: ${client.phone} | Budget: ৳${client.budget.toLocaleString('en-IN')}`;

  const dBody = document.getElementById('drawer-table-body');
  if (!dBody) return;
  dBody.innerHTML = (!client.history || client.history.length === 0) ? 
    `<tr><td colspan="5" class="p-4 text-center text-slate-400 font-medium">No ledger accounts registered for this project.</td></tr>` : '';

  client.history.forEach(t => {
    const tr = document.createElement('tr');
    tr.className = "border-b border-slate-800 last:border-none font-medium text-slate-300";
    let typeText = t.type === 'income' ? '<span class="text-emerald-400 font-bold">📥 Debit</span>' : '<span class="text-red-400 font-bold">📤 Credit</span>';
    let valColor = t.type === 'income' ? 'text-emerald-400' : 'text-red-400';

    tr.innerHTML = `
      <td class="p-3 text-slate-500 font-mono">${t.date}</td>
      <td class="p-3 font-semibold text-slate-200">${t.details}</td>
      <td class="p-3">${typeText}</td>
      <td class="p-3 text-right font-black ${valColor}">৳${t.amount.toLocaleString('en-IN')}</td>
      <td class="p-3 text-center">
        <button onclick="deleteTransaction('${client.id}', '${t.id}')" class="text-slate-600 hover:text-red-500 font-bold transition px-2">✕</button>
      </td>
    `;
    dBody.appendChild(tr);
  });
}


// ==========================================
// Silent Deletion Handlers (No Alerts)
// ==========================================
window.deleteClient = function(id) {
  if(!databasePathRef) return;
  requestPasscodeAuth(() => {
    databasePathRef.child('clients').child(id).remove()
      .then(() => {
        if(openLedgerId === id) closeDrawer();
      });
  });
};

window.deleteOfficeExpense = function(id) {
  if(!databasePathRef) return;
  requestPasscodeAuth(() => {
    databasePathRef.child('office_expenses').child(id).remove();
  });
};

window.deleteTransaction = function(clientId, txId) {
  if(!databasePathRef) return;
  const client = farmData.find(c => c.id === clientId);
  if(!client) return;

  requestPasscodeAuth(() => {
    const updatedHistory = (client.history || []).filter(t => t.id !== txId);
    databasePathRef.child('clients').child(clientId).update({ history: updatedHistory });
  });
};
