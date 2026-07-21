// 1. Firebase Configuration
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

const SECURITY_PASSCODE = "1234";

let farmData = [];
let officeExpenses = [];
let databasePathRef = null;
let openLedgerId = null;
let activeClientFilter = 'all';

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

if(document.getElementById('tx-date')) document.getElementById('tx-date').value = new Date().toISOString().substring(0, 10);
if(document.getElementById('oe-date')) document.getElementById('oe-date').value = new Date().toISOString().substring(0, 10);

if (monthFilter) {
  const now = new Date();
  monthFilter.value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  monthFilter.addEventListener('change', uiUpdatePipeline);
}

if (searchInput) {
  searchInput.addEventListener('input', () => {
    switchTab('dashboard-view');
    renderMasterTable();
  });
}

window.switchTab = function(tabId) {
  document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
  document.getElementById(`tab-${tabId}`).classList.remove('hidden');

  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.className = "tab-btn w-full flex items-center justify-center md:justify-start gap-2 text-[10px] md:text-xs font-semibold px-2 py-2 rounded transition text-slate-400 hover:text-white hover:bg-[#1a1c26] text-center md:text-left";
  });

  const activeBtn = document.getElementById(`btn-${tabId}`);
  if(activeBtn) {
    activeBtn.className = "tab-btn w-full flex items-center justify-center md:justify-start gap-2 text-[10px] md:text-xs font-semibold px-2 py-2 rounded transition bg-indigo-600 text-white text-center md:text-left";
  }
}

window.setClientFilter = function(filterType) {
  activeClientFilter = filterType;
  
  const btnAll = document.getElementById('filter-btn-all');
  const btnNew = document.getElementById('filter-btn-new');
  const btnOld = document.getElementById('filter-btn-old');
  
  [btnAll, btnNew, btnOld].forEach(btn => {
    if(btn) btn.className = "flex-1 sm:flex-none px-2.5 py-0.5 text-[10px] font-bold rounded text-slate-400 hover:text-white";
  });
  
  const activeBtn = document.getElementById(`filter-btn-${filterType}`);
  if(activeBtn) activeBtn.className = "flex-1 sm:flex-none px-2.5 py-0.5 text-[10px] font-bold rounded bg-indigo-600 text-white";
  
  renderMasterTable();
}

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

auth.onAuthStateChanged(user => {
  if (user) {
    if (sidebarAuthSection) sidebarAuthSection.classList.add('hidden');
    if (profileTrigger) profileTrigger.classList.remove('hidden');
    
    const indicator = document.getElementById('status-indicator');
    const text = document.getElementById('status-text');
    if (indicator) indicator.className = "inline-block h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse";
    if (text) text.innerText = "Cloud Secured";
    
    if (document.getElementById('user-display-name')) document.getElementById('user-display-name').innerText = user.displayName;
    if (document.getElementById('user-avatar')) document.getElementById('user-avatar').src = user.photoURL || "https://via.placeholder.com/150";

    databasePathRef = rtdb.ref('rajuk_erp_data/' + user.uid);
    subscribeToCloudStreams();
  } else {
    if (sidebarAuthSection) sidebarAuthSection.classList.remove('hidden');
    if (profileTrigger) profileTrigger.classList.add('hidden');
    
    const indicator = document.getElementById('status-indicator');
    const text = document.getElementById('status-text');
    if (indicator) indicator.className = "inline-block h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse";
    if (text) text.innerText = "Guest Mode";
    
    farmData = [];
    officeExpenses = [];
    databasePathRef = null;
    uiUpdatePipeline();
  }
});

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
  if (document.getElementById('global-income')) document.getElementById('global-income').innerText = '৳' + income.toLocaleString('en-IN');
  if (document.getElementById('global-expense')) document.getElementById('global-expense').innerText = '৳' + grandTotalExpense.toLocaleString('en-IN');
  if (document.getElementById('global-due')) document.getElementById('global-due').innerText = '৳' + due.toLocaleString('en-IN');
  if (document.getElementById('global-net')) document.getElementById('global-net').innerText = '৳' + netIncome.toLocaleString('en-IN');
}

let pendingDeleteAction = null;
function requestPasscodeAuth(onSuccess) {
  const modal = document.getElementById('securityModal');
  const passInput = document.getElementById('modalPasscodeInput');
  const confirmBtn = document.getElementById('modalConfirmBtn');
  const cancelBtn = document.getElementById('modalCancelBtn');

  if (!modal || !passInput) return;

  passInput.value = '';
  pendingDeleteAction = onSuccess;
  modal.classList.remove('hidden');
  setTimeout(() => passInput.focus(), 50);

  confirmBtn.onclick = function() {
    if (passInput.value.trim() === SECURITY_PASSCODE) {
      modal.classList.add('hidden');
      if (pendingDeleteAction) pendingDeleteAction();
    } else {
      passInput.value = '';
      passInput.focus();
    }
  };

  cancelBtn.onclick = function() {
    modal.classList.add('hidden');
    pendingDeleteAction = null;
  };
}

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

  document.onclick = function() { dropdownList.classList.add('hidden'); };
  dropdownList.onclick = function(e) { e.stopPropagation(); };

  function filterDropdownItems(query) {
    itemsContainer.innerHTML = '';
    const filtered = farmData.filter(c => 
      c.project.toLowerCase().includes(query.toLowerCase()) || 
      c.name.toLowerCase().includes(query.toLowerCase())
    );

    if (filtered.length === 0) {
      itemsContainer.innerHTML = `<div class="p-1.5 text-[10px] text-slate-500 text-center">No projects</div>`;
      return;
    }

    filtered.forEach(c => {
      const item = document.createElement('div');
      item.className = "p-1.5 text-[11px] text-slate-300 hover:bg-indigo-600 hover:text-white rounded cursor-pointer transition flex justify-between";
      item.innerHTML = `<span>${c.project}</span> <span class="text-[9px] text-slate-500">${c.name}</span>`;
      
      item.onclick = function() {
        hiddenInput.value = c.id;
        selectedText.innerText = `${c.project}`;
        selectedText.className = "text-white font-medium";
        dropdownList.classList.add('hidden');
      };
      itemsContainer.appendChild(item);
    });
  }

  if (dropdownSearchInput) dropdownSearchInput.oninput = function() { filterDropdownItems(this.value); };
}

// ULTRA-MINIMAL MOBILE RENDERER
function renderMasterTable() {
  if (!tableBody) return;
  const query = searchInput ? searchInput.value.toLowerCase().trim() : '';
  const container = document.getElementById('master-table-container');
  const cardContainer = document.getElementById('master-card-container');

  const currentUser = firebase.auth().currentUser;

  if (!currentUser) {
    if(container) container.classList.remove('hidden');
    tableBody.innerHTML = `<tr><td colspan="7" class="p-4 text-center text-amber-500 text-xs">⚠️ Please sign in.</td></tr>`;
    if(cardContainer) cardContainer.innerHTML = `<div class="p-3 text-center text-amber-500 text-[11px]">⚠️ Sign in with Google</div>`;
    return;
  }

  if (farmData.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="7" class="p-4 text-center text-slate-500 text-xs">No records.</td></tr>`;
    if(cardContainer) cardContainer.innerHTML = `<div class="p-3 text-center text-slate-500 text-[11px]">No records found.</div>`;
    return;
  }

  let filteredData = farmData.filter(c => {
    return c.name.toLowerCase().includes(query) || 
           c.phone.includes(query) || 
           c.project.toLowerCase().includes(query);
  });

  if (activeClientFilter === 'new') {
    filteredData = filteredData.filter(c => !c.history.some(t => t.type === 'income'));
  } else if (activeClientFilter === 'old') {
    filteredData = filteredData.filter(c => c.history.some(t => t.type === 'income'));
  }

  tableBody.innerHTML = '';
  if(cardContainer) cardContainer.innerHTML = '';

  filteredData.forEach(c => {
    let localIncome = 0, localExpense = 0;
    c.history.forEach(t => {
      if(t.type === 'income') localIncome += t.amount;
      if(t.type === 'expense') localExpense += t.amount;
    });
    let cDue = c.budget - localIncome;

    // Desktop Row
    const tr = document.createElement('tr');
    tr.className = "hover:bg-[#181a24] transition font-medium border-b border-[#1e202a] text-slate-300";
    tr.innerHTML = `
      <td class="p-3 pl-4">
        <div class="font-bold text-slate-100">${c.project}</div>
        <div class="text-[10px] text-slate-500">${c.name}</div>
      </td>
      <td class="p-3 font-mono text-[11px] text-slate-400">${c.phone}</td>
      <td class="p-3 text-right font-bold text-slate-200">৳${c.budget.toLocaleString('en-IN')}</td>
      <td class="p-3 text-right font-bold text-emerald-400">৳${localIncome.toLocaleString('en-IN')}</td>
      <td class="p-3 text-right font-bold text-rose-400">৳${localExpense.toLocaleString('en-IN')}</td>
      <td class="p-3 text-right font-bold ${cDue > 0 ? 'text-amber-400' : 'text-slate-500'}">৳${cDue.toLocaleString('en-IN')}</td>
      <td class="p-3 pr-4 text-center">
        <button onclick="openDrawer('${c.id}')" class="bg-[#1e202a] hover:bg-indigo-600 text-slate-200 hover:text-white px-2.5 py-1 rounded text-[10px] font-semibold transition">Ledger</button>
        <button onclick="deleteClient('${c.id}')" class="text-slate-600 hover:text-red-400 font-bold ml-1.5">✕</button>
      </td>
    `;
    tableBody.appendChild(tr);

    // MINIMAL MOBILE CARD (Clutter-Free)
    if(cardContainer) {
      const card = document.createElement('div');
      card.className = "bg-[#14151c] border border-[#1e202a] rounded p-2.5 space-y-2";
      card.innerHTML = `
        <div class="flex justify-between items-center border-b border-[#1e202a] pb-1.5">
          <div>
            <h4 class="font-bold text-white text-xs">${c.project}</h4>
            <p class="text-[10px] text-slate-400">${c.name} • <span class="font-mono text-slate-500">${c.phone}</span></p>
          </div>
          <button onclick="deleteClient('${c.id}')" class="text-slate-600 hover:text-red-400 text-xs px-1">✕</button>
        </div>

        <div class="flex items-center justify-between text-[11px] font-mono pt-0.5">
          <div>
            <span class="text-[8px] text-slate-500 block uppercase font-sans">Budget</span>
            <span class="font-semibold text-slate-200">৳${c.budget.toLocaleString('en-IN')}</span>
          </div>
          <div>
            <span class="text-[8px] text-emerald-500 block uppercase font-sans">Income</span>
            <span class="font-semibold text-emerald-400">৳${localIncome.toLocaleString('en-IN')}</span>
          </div>
          <div>
            <span class="text-[8px] text-rose-500 block uppercase font-sans">Cost</span>
            <span class="font-semibold text-rose-400">৳${localExpense.toLocaleString('en-IN')}</span>
          </div>
          <div class="text-right">
            <span class="text-[8px] text-amber-500 block uppercase font-sans">Due</span>
            <span class="font-bold ${cDue > 0 ? 'text-amber-400' : 'text-slate-400'}">৳${cDue.toLocaleString('en-IN')}</span>
          </div>
        </div>

        <button onclick="openDrawer('${c.id}')" class="w-full bg-[#1e202a] hover:bg-indigo-600 text-slate-300 hover:text-white font-semibold py-1 rounded text-[10px] transition">
          View Ledger
        </button>
      `;
      cardContainer.appendChild(card);
    }
  });
}

function renderOfficeExpenses() {
  if (!officeExpenseRows) return;
  officeExpenseRows.innerHTML = '';
  if(officeExpenses.length === 0) {
    officeExpenseRows.innerHTML = `<tr><td class="p-2 text-center text-slate-500 text-[10px]">No records.</td></tr>`;
    return;
  }
  officeExpenses.forEach(oe => {
    const tr = document.createElement('tr');
    tr.className = "border-b border-[#1e202a]";
    tr.innerHTML = `
      <td class="p-2 font-medium text-slate-300 text-[11px]">${oe.details} <span class="text-[9px] text-slate-500 block">${oe.category} • ${oe.date}</span></td>
      <td class="p-2 text-right font-bold text-rose-400 font-mono text-xs">৳${oe.amount.toLocaleString('en-IN')}</td>
      <td class="p-2 text-center"><button onclick="deleteOfficeExpense('${oe.id}')" class="text-slate-600 hover:text-red-400 font-bold text-xs">✕</button></td>
    `;
    officeExpenseRows.appendChild(tr);
  });
}

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

  if (document.getElementById('drawer-title')) document.getElementById('drawer-title').innerText = `${client.project}`;
  if (document.getElementById('drawer-sub')) document.getElementById('drawer-sub').innerText = `${client.name} | Budget: ৳${client.budget.toLocaleString('en-IN')}`;

  const dBody = document.getElementById('drawer-table-body');
  if (!dBody) return;
  dBody.innerHTML = (!client.history || client.history.length === 0) ? 
    `<tr><td class="p-3 text-center text-slate-500 text-[11px]">No transactions logged.</td></tr>` : '';

  client.history.forEach(t => {
    const tr = document.createElement('tr');
    tr.className = "border-b border-[#1e202a] text-[11px]";
    let valColor = t.type === 'income' ? 'text-emerald-400' : 'text-rose-400';

    tr.innerHTML = `
      <td class="p-2 font-mono text-slate-500 text-[10px]">${t.date}</td>
      <td class="p-2 font-medium text-slate-200">${t.details}</td>
      <td class="p-2 text-right font-bold font-mono ${valColor}">৳${t.amount.toLocaleString('en-IN')}</td>
      <td class="p-2 text-center"><button onclick="deleteTransaction('${client.id}', '${t.id}')" class="text-slate-600 hover:text-red-400 font-bold text-xs">✕</button></td>
    `;
    dBody.appendChild(tr);
  });
}

window.deleteClient = function(id) {
  if(!databasePathRef) return;
  requestPasscodeAuth(() => {
    databasePathRef.child('clients').child(id).remove()
      .then(() => { if(openLedgerId === id) closeDrawer(); });
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
