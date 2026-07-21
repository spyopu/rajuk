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

// Firebase Initialization
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const rtdb = firebase.database();

// Application State
let state = {
  projects: [],
  officeExpenses: [],
  bossLogs: []
};

// DOM Content Loaded
document.addEventListener('DOMContentLoaded', () => {
  initDates();
  bindEvents();
  listenToDatabase();
});

function initDates() {
  const today = new Date().toISOString().split('T')[0];
  document.querySelectorAll('input[type="date"]').forEach(inp => {
    inp.value = today;
  });
}

function bindEvents() {
  // Navigation Tabs
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const targetTab = e.currentTarget.getAttribute('data-tab');
      switchTab(targetTab, e.currentTarget);
    });
  });

  document.getElementById('btn-top-report').addEventListener('click', () => {
    switchTab('tab-reports');
  });

  // Modals
  document.getElementById('btn-open-add-project').addEventListener('click', () => openModal('modal-add-project'));
  document.getElementById('btn-close-add-project').addEventListener('click', () => closeModal('modal-add-project'));
  document.getElementById('btn-close-ledger').addEventListener('click', () => closeModal('modal-project-ledger'));

  // Form Submissions
  document.getElementById('form-add-project').addEventListener('submit', handleCreateProject);
  document.getElementById('form-project-tx').addEventListener('submit', handleProjectTransaction);
  document.getElementById('form-office-expense').addEventListener('submit', handleOfficeExpense);
  document.getElementById('form-boss-tx').addEventListener('submit', handleBossTransaction);

  // Search Filter
  document.getElementById('search-input').addEventListener('keyup', renderProjects);
}

// REALTIME DATABASE LISTENERS
function listenToDatabase() {
  rtdb.ref('projects').on('value', snapshot => {
    const data = snapshot.val();
    state.projects = [];
    if (data) {
      Object.keys(data).forEach(key => {
        state.projects.push({ id: key, ...data[key] });
      });
    }
    refreshUI();
  });

  rtdb.ref('office_expenses').on('value', snapshot => {
    const data = snapshot.val();
    state.officeExpenses = [];
    if (data) {
      Object.keys(data).forEach(key => {
        state.officeExpenses.unshift({ id: key, ...data[key] });
      });
    }
    refreshUI();
  });

  rtdb.ref('boss_logs').on('value', snapshot => {
    const data = snapshot.val();
    state.bossLogs = [];
    if (data) {
      Object.keys(data).forEach(key => {
        state.bossLogs.unshift({ id: key, ...data[key] });
      });
    }
    refreshUI();
  });
}

function refreshUI() {
  renderDashboard();
  renderProjects();
  populateProjectDropdown();
  renderOfficeLogs();
  renderBossLogs();
  renderReport();
}

function switchTab(tabId, activeBtn) {
  document.querySelectorAll('.tab-content').forEach(tab => tab.classList.add('hidden'));
  document.getElementById(tabId).classList.remove('hidden');

  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.classList.remove('text-red-600', 'font-bold');
    btn.classList.add('text-gray-500');
  });

  if (activeBtn) {
    activeBtn.classList.remove('text-gray-500');
    activeBtn.classList.add('text-red-600', 'font-bold');
  }
}

function openModal(id) { document.getElementById(id).classList.remove('hidden'); }
function closeModal(id) { document.getElementById(id).classList.add('hidden'); }

// DASHBOARD & PROJECT LOGIC
function renderDashboard() {
  let totalBudget = state.projects.reduce((acc, p) => acc + (p.budget || 0), 0);
  let totalReceived = state.projects.reduce((acc, p) => {
    let txs = p.transactions ? Object.values(p.transactions) : [];
    let coll = txs.filter(t => t.type === 'collection').reduce((a, t) => a + t.amount, 0);
    return acc + coll;
  }, 0);
  let totalDue = totalBudget - totalReceived;

  document.getElementById('dash-budget').innerText = `৳${totalBudget.toLocaleString('bn-BD')}`;
  document.getElementById('dash-received').innerText = `৳${totalReceived.toLocaleString('bn-BD')}`;
  document.getElementById('dash-due').innerText = `৳${totalDue.toLocaleString('bn-BD')}`;
}

function renderProjects() {
  const query = document.getElementById('search-input').value.toLowerCase();
  const container = document.getElementById('projects-list-container');
  container.innerHTML = '';

  const filtered = state.projects.filter(p => 
    (p.client && p.client.toLowerCase().includes(query)) || 
    (p.title && p.title.toLowerCase().includes(query))
  );

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="text-center py-10 text-gray-500 text-xs bg-white rounded-xl border border-dashed border-gray-300">
        <p class="text-lg mb-1">📁</p>
        <p class="font-semibold text-gray-600">ডেটাবেসে কোনো প্রজেক্ট পাওয়া যায়নি!</p>
        <p class="mt-1">উপরের <b class="text-red-600">"➕ প্রজেক্ট"</b> বাটনে ক্লিক করে প্রথম হিসাব যোগ করুন।</p>
      </div>`;
    return;
  }

  filtered.forEach(p => {
    const txs = p.transactions ? Object.values(p.transactions) : [];
    const totalColl = txs.filter(t => t.type === 'collection').reduce((a, t) => a + t.amount, 0);
    const due = (p.budget || 0) - totalColl;
    const initial = p.client ? p.client.charAt(0).toUpperCase() : 'P';
    
    const card = document.createElement('div');
    card.className = "bg-white rounded-xl shadow-sm border border-gray-200 p-3 flex justify-between items-center hover:border-gray-300 transition";
    card.innerHTML = `
      <div class="flex items-center gap-3">
        <div class="h-10 w-10 rounded-full bg-red-100 text-red-600 border border-red-200 flex items-center justify-center font-bold text-sm shrink-0">
          ${initial}
        </div>
        <div>
          <h3 class="text-xs font-bold text-gray-800">${p.client}</h3>
          <p class="text-[11px] text-gray-500">${p.title}</p>
          <span class="text-[10px] text-gray-400">বাজেট: ৳${(p.budget || 0).toLocaleString('bn-BD')}</span>
        </div>
      </div>
      <div class="text-right flex flex-col items-end gap-1">
        <div>
          <p class="text-[10px] text-gray-400">বাকি (Due)</p>
          <p class="text-xs font-bold ${due > 0 ? 'text-red-600' : 'text-emerald-600'}">৳${due.toLocaleString('bn-BD')}</p>
        </div>
        <div class="flex items-center gap-2">
          <button class="btn-ledger text-[10px] text-red-600 bg-red-50 border border-red-200 px-2.5 py-0.5 rounded font-bold hover:bg-red-100 transition">
             বিস্তারিত &gt;
          </button>
          <button class="btn-delete-project text-[10px] text-gray-400 hover:text-red-600 px-1 py-0.5 transition">
            🗑️
          </button>
        </div>
      </div>
    `;

    card.querySelector('.btn-ledger').addEventListener('click', () => openProjectLedger(p.id));
    card.querySelector('.btn-delete-project').addEventListener('click', () => deleteProject(p.id));

    container.appendChild(card);
  });
}

// REALTIME DATABASE OPERATIONS
async function handleCreateProject(e) {
  e.preventDefault();
  const newProj = {
    client: document.getElementById('new-client-name').value,
    mobile: document.getElementById('new-client-mobile').value,
    title: document.getElementById('new-project-name').value,
    budget: parseFloat(document.getElementById('new-project-budget').value) || 0,
    timestamp: Date.now()
  };

  try {
    await rtdb.ref('projects').push(newProj);
    closeModal('modal-add-project');
    e.target.reset();
    alert('নতুন প্রজেক্ট ডাটাবেসে সেভ হয়েছে!');
  } catch (err) {
    alert('সমস্যা হয়েছে: ' + err.message);
  }
}

async function handleProjectTransaction(e) {
  e.preventDefault();
  const projId = document.getElementById('tx-project-select').value;
  if (!projId) return alert('প্রজেক্ট সিলেক্ট করুন!');

  const type = document.getElementById('tx-type').value;
  const amount = parseFloat(document.getElementById('tx-amount').value) || 0;
  const date = document.getElementById('tx-date').value;
  const note = document.getElementById('tx-note').value;

  const txData = { type, amount, date, note, timestamp: Date.now() };

  try {
    await rtdb.ref(`projects/${projId}/transactions`).push(txData);
    e.target.reset();
    initDates();
    alert('ভাউচার সেভ হয়েছে!');
  } catch (err) {
    alert('সমস্যা হয়েছে: ' + err.message);
  }
}

function openProjectLedger(projId) {
  const proj = state.projects.find(p => p.id === projId);
  if (!proj) return;

  const rawTxs = proj.transactions || {};
  const txs = Object.keys(rawTxs).map(k => ({ id: k, ...rawTxs[k] })).reverse();

  const totalColl = txs.filter(t => t.type === 'collection').reduce((a, t) => a + t.amount, 0);
  const due = (proj.budget || 0) - totalColl;

  document.getElementById('ledger-client-title').innerText = proj.client;
  document.getElementById('ledger-client-sub').innerText = `${proj.title} • 📞 ${proj.mobile}`;
  
  document.getElementById('ledger-budget').innerText = `৳${(proj.budget || 0).toLocaleString('bn-BD')}`;
  document.getElementById('ledger-collections').innerText = `৳${totalColl.toLocaleString('bn-BD')}`;
  document.getElementById('ledger-due').innerText = `৳${due.toLocaleString('bn-BD')}`;

  const txContainer = document.getElementById('ledger-tx-list');
  txContainer.innerHTML = '';

  if (txs.length === 0) {
    txContainer.innerHTML = `<p class="text-gray-400 text-center py-4">কোনো লেনদেন পাওয়া যায়নি।</p>`;
  } else {
    txs.forEach(tx => {
      const isIncome = tx.type === 'collection';
      const row = document.createElement('div');
      row.className = "bg-gray-50 p-2.5 rounded-lg border border-gray-200 flex justify-between items-center";
      row.innerHTML = `
        <div>
          <div class="flex items-center gap-1.5">
            <span class="px-1.5 py-0.2 text-[9px] rounded font-bold ${isIncome ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 'bg-red-100 text-red-700 border border-red-200'}">
              ${isIncome ? '📥 টাকা পেলাম' : '📤 প্রজেক্ট খরচ'}
            </span>
            <span class="text-[11px] font-medium text-gray-700">${tx.note}</span>
          </div>
          <p class="text-[10px] text-gray-400 mt-1">📅 তারিখ: ${tx.date}</p>
        </div>
        <div class="text-right flex items-center gap-2">
          <span class="font-bold ${isIncome ? 'text-emerald-600' : 'text-red-600'}">
            ${isIncome ? '+' : '-'}৳${tx.amount.toLocaleString('bn-BD')}
          </span>
          <button class="btn-del-single text-gray-400 hover:text-red-600 text-xs p-1">🗑️</button>
        </div>
      `;

      row.querySelector('.btn-del-single').addEventListener('click', () => {
        deleteSingleTransaction(proj.id, tx.id);
      });

      txContainer.appendChild(row);
    });
  }

  openModal('modal-project-ledger');
}

async function deleteSingleTransaction(projId, txId) {
  if (confirm('আপনি কি এই লেনদেনটি মুছে ফেলতে চান?')) {
    await rtdb.ref(`projects/${projId}/transactions/${txId}`).remove();
    openProjectLedger(projId);
  }
}

async function deleteProject(id) {
  if (confirm('আপনি কি নিশ্চিত এই প্রজেক্টের সমস্ত হিসাব মুছে ফেলবেন?')) {
    await rtdb.ref(`projects/${id}`).remove();
  }
}

function populateProjectDropdown() {
  const select = document.getElementById('tx-project-select');
  select.innerHTML = `<option value="">সিলেক্ট করুন...</option>`;
  state.projects.forEach(p => {
    select.innerHTML += `<option value="${p.id}">${p.client} — ${p.title}</option>`;
  });
}

async function handleOfficeExpense(e) {
  e.preventDefault();
  const newExp = {
    category: document.getElementById('office-cat').value,
    amount: parseFloat(document.getElementById('office-amount').value) || 0,
    date: document.getElementById('office-date').value,
    note: document.getElementById('office-note').value,
    timestamp: Date.now()
  };

  await rtdb.ref('office_expenses').push(newExp);
  e.target.reset();
  initDates();
  alert('অফিস খরচ রেকর্ড করা হয়েছে!');
}

function renderOfficeLogs() {
  const list = document.getElementById('office-logs-list');
  list.innerHTML = '';
  if (state.officeExpenses.length === 0) {
    list.innerHTML = `<p class="text-gray-400 text-[11px] py-2">কোনো অফিস খরচ পাওয়া যায়নি।</p>`;
    return;
  }
  state.officeExpenses.forEach(o => {
    const row = document.createElement('div');
    row.className = "py-2 flex justify-between items-center";
    row.innerHTML = `
      <div>
        <p class="font-bold text-gray-700">${o.category}</p>
        <p class="text-[10px] text-gray-400">${o.note} • ${o.date}</p>
      </div>
      <div class="flex items-center gap-2">
        <span class="font-bold text-red-600">৳${o.amount.toLocaleString('bn-BD')}</span>
        <button class="btn-del-off text-gray-400 hover:text-red-600 text-xs">🗑️</button>
      </div>
    `;
    row.querySelector('.btn-del-off').addEventListener('click', () => deleteOfficeExpense(o.id));
    list.appendChild(row);
  });
}

async function deleteOfficeExpense(id) {
  if (confirm('এই অফিস খরচটি মুছে ফেলতে চান?')) {
    await rtdb.ref(`office_expenses/${id}`).remove();
  }
}

async function handleBossTransaction(e) {
  e.preventDefault();
  const newBossTx = {
    type: document.getElementById('boss-tx-type').value,
    amount: parseFloat(document.getElementById('boss-amount').value) || 0,
    date: document.getElementById('boss-date').value,
    note: document.getElementById('boss-note').value,
    timestamp: Date.now()
  };

  await rtdb.ref('boss_logs').push(newBossTx);
  e.target.reset();
  initDates();
  alert('মালিকের ফান্ড লেনদেন এন্ট্রি করা হয়েছে!');
}

function renderBossLogs() {
  const list = document.getElementById('boss-logs-list');
  list.innerHTML = '';
  
  let given = state.bossLogs.filter(b => b.type === 'deposit').reduce((acc, b) => acc + b.amount, 0);
  let taken = state.bossLogs.filter(b => b.type === 'withdraw').reduce((acc, b) => acc + b.amount, 0);
  let netBossWallet = given - taken;

  document.getElementById('boss-wallet-balance').innerText = `৳${Math.abs(netBossWallet).toLocaleString('bn-BD')}`;
  document.getElementById('boss-wallet-status').innerText = netBossWallet >= 0 ? 'কোম্পানি বসের কাছে ঋণগ্রস্ত' : 'বস উত্তোলন করেছেন';

  if (state.bossLogs.length === 0) {
    list.innerHTML = `<p class="text-gray-400 text-[11px] py-2">কোনো রেকর্ড নেই।</p>`;
    return;
  }

  state.bossLogs.forEach(b => {
    const row = document.createElement('div');
    row.className = "py-2 flex justify-between items-center";
    row.innerHTML = `
      <div>
        <p class="font-bold text-gray-700">${b.type === 'deposit' ? '📥 টাকা দিয়েছেন' : '📤 টাকা নিয়েছেন'}</p>
        <p class="text-[10px] text-gray-400">${b.note} • ${b.date}</p>
      </div>
      <div class="flex items-center gap-2">
        <span class="font-bold ${b.type === 'deposit' ? 'text-emerald-600' : 'text-red-600'}">
          ${b.type === 'deposit' ? '+' : '-'}৳${b.amount.toLocaleString('bn-BD')}
        </span>
        <button class="btn-del-boss text-gray-400 hover:text-red-600 text-xs">🗑️</button>
      </div>
    `;
    row.querySelector('.btn-del-boss').addEventListener('click', () => deleteBossLog(b.id));
    list.appendChild(row);
  });
}

async function deleteBossLog(id) {
  if (confirm('মালিকের এই লেনদেনটি মুছে ফেলতে চান?')) {
    await rtdb.ref(`boss_logs/${id}`).remove();
  }
}

function renderReport() {
  let totalCollections = 0;
  let totalDirectCost = 0;

  state.projects.forEach(p => {
    let txs = p.transactions ? Object.values(p.transactions) : [];
    txs.forEach(t => {
      if (t.type === 'collection') totalCollections += t.amount;
      if (t.type === 'cost') totalDirectCost += t.amount;
    });
  });

  let grossProfit = totalCollections - totalDirectCost;
  let totalOfficeExpenses = state.officeExpenses.reduce((acc, o) => acc + o.amount, 0);
  let netProfit = grossProfit - totalOfficeExpenses;

  let bossGiven = state.bossLogs.filter(b => b.type === 'deposit').reduce((acc, b) => acc + b.amount, 0);
  let bossTaken = state.bossLogs.filter(b => b.type === 'withdraw').reduce((acc, b) => acc + b.amount, 0);

  document.getElementById('rpt-total-income').innerText = `৳${totalCollections.toLocaleString('bn-BD')}`;
  document.getElementById('rpt-project-cost').innerText = `৳${totalDirectCost.toLocaleString('bn-BD')}`;
  document.getElementById('rpt-gross-profit').innerText = `৳${grossProfit.toLocaleString('bn-BD')}`;
  document.getElementById('rpt-office-cost').innerText = `৳${totalOfficeExpenses.toLocaleString('bn-BD')}`;
  document.getElementById('rpt-net-profit').innerText = `৳${netProfit.toLocaleString('bn-BD')}`;

  document.getElementById('rpt-boss-given').innerText = `৳${bossGiven.toLocaleString('bn-BD')}`;
  document.getElementById('rpt-boss-taken').innerText = `৳${bossTaken.toLocaleString('bn-BD')}`;
  document.getElementById('rpt-boss-net').innerText = `৳${(bossGiven - bossTaken).toLocaleString('bn-BD')}`;
}