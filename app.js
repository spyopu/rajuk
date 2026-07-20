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

// State Memory Management Variables
let farmData = [];
let officeExpenses = [];
let databasePathRef = null;
let openLedgerId = null;

// Catch UI Reference Elements
const loginBtn = document.getElementById('google-login-btn');
const logoutBtn = document.getElementById('logout-btn');
const profileTrigger = document.getElementById('profile-trigger');
const profileDropdown = document.getElementById('profile-dropdown');
const sidebarAuthSection = document.getElementById('sidebar-auth-section');

const clientForm = document.getElementById('client-form');
const txForm = document.getElementById('tx-form');
const officeExpenseForm = document.getElementById('office-expense-form');
const clientSelect = document.getElementById('tx-client-select');
const tableBody = document.getElementById('clients-table-body');
const officeExpenseRows = document.getElementById('office-expense-rows');
const ledgerDrawer = document.getElementById('ledger-drawer');
const searchInput = document.getElementById('search-input');

// Initialize Today's Date Values Input fields
if(document.getElementById('tx-date')) document.getElementById('tx-date').value = new Date().toISOString().substring(0, 10);
if(document.getElementById('oe-date')) document.getElementById('oe-date').value = new Date().toISOString().substring(0, 10);

// Initialize Blank Dashboard
uiUpdatePipeline();

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
  farmData.forEach(c => {
    budget += c.budget;
    let cIncome = 0;
    c.history.forEach(t => {
      if(t.type === 'income') cIncome += t.amount;
      if(t.type === 'expense') prjExpense += t.amount;
    });
    income += cIncome;
    due += (c.budget - cIncome);
  });
  officeExpenses.forEach(oe => totalOfficeExpense += oe.amount);
  let grandTotalExpense = prjExpense + totalOfficeExpense;
  let netIncome = income - grandTotalExpense;

  if (document.getElementById('global-budget')) document.getElementById('global-budget').innerText = '৳' + budget.toLocaleString('en-IN');
  if (document.getElementById('global-income')) document.getElementById('global-income').innerText = '৳' + income.toLocaleString('en-IN');
  if (document.getElementById('global-expense')) document.getElementById('global-expense').innerText = '৳' + grandTotalExpense.toLocaleString('en-IN');
  if (document.getElementById('global-due')) document.getElementById('global-due').innerText = '৳' + due.toLocaleString('en-IN');
  if (document.getElementById('global-net')) document.getElementById('global-net').innerText = '৳' + netIncome.toLocaleString('en-IN');
}

// Submit Data Handlers
if (clientForm) {
  clientForm.addEventListener('submit', (e) => {
    e.preventDefault();
    if(!databasePathRef) return alert('Please login first to sync project files!');
    const newClient = {
      name: document.getElementById('client-name').value,
      phone: document.getElementById('client-phone').value,
      project: document.getElementById('project-title').value,
      budget: parseFloat(document.getElementById('project-budget').value),
      history: []
    };
    databasePathRef.child('clients').push(newClient);
    clientForm.reset();
  });
}

if (txForm) {
  txForm.addEventListener('submit', (e) => {
    e.preventDefault();
    if(!databasePathRef) return alert('Please login first to post entries!');
    const id = clientSelect.value;
    if(!id) return alert('No project file selected!');
    
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
    }
  });
}

if (officeExpenseForm) {
  officeExpenseForm.addEventListener('submit', (e) => {
    e.preventDefault();
    if(!databasePathRef) return alert('Please login first to record expenses!');
    const newExpense = {
      category: document.getElementById('oe-category').value,
      amount: parseFloat(document.getElementById('oe-amount').value),
      details: document.getElementById('oe-details').value,
      date: document.getElementById('oe-date').value
    };
    databasePathRef.child('office_expenses').push(newExpense);
    document.getElementById('oe-amount').value = '';
    document.getElementById('oe-details').value = '';
  });
}

function renderDropdown() {
  if (!clientSelect) return;
  clientSelect.innerHTML = farmData.length === 0 ? '<option value="">No Active Projects Available</option>' : 
    farmData.map(c => `<option value="${c.id}">${c.project} (${c.name})</option>`).join('');
}

// Table UI Builders
function renderMasterTable() {
  if (!tableBody) return;
  const query = searchInput ? searchInput.value.toLowerCase().trim() : '';
  
  if (!auth.currentUser) {
    tableBody.innerHTML = `<tr><td colspan="7" class="p-6 text-center text-amber-500 font-semibold bg-slate-900/40">⚠️ Dashboard is blank. Please sign in with Google from the top menu to view database files.</td></tr>`;
    return;
  }

  if (query === '') {
    tableBody.innerHTML = `<tr><td colspan="7" class="p-6 text-center text-slate-500 font-medium bg-slate-900/40">Please enter a client name or phone number in the sidebar menu to look up data.</td></tr>`;
    return;
  }
  
  const filteredData = farmData.filter(c => {
    return c.name.toLowerCase().includes(query) || 
           c.phone.includes(query) || 
           c.project.toLowerCase().includes(query);
  });

  tableBody.innerHTML = filteredData.length === 0 ? 
    `<tr><td colspan="7" class="p-6 text-center text-slate-500 font-medium bg-slate-900/40">No matching files found.</td></tr>` : '';

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
  if (officeExpenses.length === 0) {
    officeExpenseRows.innerHTML = `<tr><td class="p-3 text-center text-slate-500">${auth.currentUser ? 'No general office expenses logged yet.' : 'Please login to track expenses.'}</td></tr>`;
    return;
  }

  officeExpenseRows.innerHTML = '';
  officeExpenses.forEach(oe => {
    const tr = document.createElement('tr');
    tr.className = "border-b border-slate-800 last:border-none";
    tr.innerHTML = `
      <td class="p-2 pl-3 font-semibold text-slate-200">${oe.details} <span class="text-[9px] bg-red-950 text-red-400 px-1.5 py-0.5 rounded border border-red-900/50 font-bold">${oe.category}</span></td>
      <td class="p-2 text-slate-500 font-mono text-[10px]">${oe.date}</td>
      <td class="p-2 text-right font-bold text-red-400">৳${oe.amount.toLocaleString('en-IN')}</td>
      <td class="p-2 text-center"><button onclick="deleteOfficeExpense('${oe.id}')" class="text-slate-600 hover:text-red-500 font-bold transition">✕</button></td>
    `;
    officeExpenseRows.appendChild(tr);
  });
}

// Open Slider Account Ledgers
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
    `<tr><td colspan="4" class="p-4 text-center text-slate-400 font-medium">No ledger accounts registered for this project.</td></tr>` : '';

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
    `;
    dBody.appendChild(tr);
  });
}

// Node Deletion Scripts
window.deleteClient = function(id) {
  if(!databasePathRef) return;
  if(confirm('Are you sure you want to permanently delete this file and all its records?')) {
    databasePathRef.child('clients').child(id).remove();
    if(openLedgerId === id) closeDrawer();
  }
}

window.deleteOfficeExpense = function(id) {
  if(!databasePathRef) return;
  if(confirm('Delete this general office expense node?')) {
    databasePathRef.child('office_expenses').child(id).remove();
  }
}
