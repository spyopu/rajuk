// Dynamic Invoice PDF layout downloader core engine layer
function downloadInvoice(clientName, phone, projectTitle, budget, totalIncome, totalDue) {
  // Sandbox setup space for strict printing scope
  const invoiceElement = document.createElement('div');
  invoiceElement.className = "p-8 bg-white text-slate-800 border border-slate-200";
  invoiceElement.style.width = "780px";
  invoiceElement.style.fontFamily = "'Inter', sans-serif";

  const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  invoiceElement.innerHTML = `
    <div style="padding: 10px;">
      <!-- Invoice Document Header Banner Structure -->
      <div class="flex justify-between items-center border-b-2 border-indigo-600 pb-6 mb-6">
        <div>
          <h1 class="text-2xl font-black text-indigo-700 tracking-tight">Rajuk Consultancy</h1>
          <p class="text-xs text-slate-400 font-medium">Premium Agency & Operations Suite</p>
        </div>
        <div class="text-right">
          <h2 class="text-lg font-bold text-slate-700 uppercase tracking-widest">Payment Statement</h2>
          <p class="text-xs text-slate-500 font-medium">Issued: ${today}</p>
        </div>
      </div>

      <!-- Parties Metadata Info Grid Block Context -->
      <div class="mb-8 bg-slate-50 p-5 rounded-xl border border-slate-100 grid grid-cols-2 gap-4 text-xs">
        <div>
          <h3 class="font-bold text-indigo-600 uppercase tracking-wider mb-1">Prepared For:</h3>
          <p class="font-bold text-slate-800 text-sm">${clientName}</p>
          <p class="text-slate-500 font-medium mt-0.5">Contact: ${phone}</p>
        </div>
        <div class="text-right">
          <h3 class="font-bold text-indigo-600 uppercase tracking-wider mb-1">Project Details:</h3>
          <p class="font-bold text-slate-800 text-sm">${projectTitle}</p>
        </div>
      </div>

      <!-- Financial Statement Table Sheet -->
      <table class="w-full text-left border-collapse text-xs mb-8">
        <thead>
          <tr class="bg-indigo-600 text-white font-semibold uppercase tracking-wider">
            <th class="p-3 rounded-l-lg">Description / Financial Particulars</th>
            <th class="p-3 text-right rounded-r-lg">Value Allocation</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-200 text-slate-700 font-medium">
          <tr>
            <td class="p-3 text-slate-500">Total Approved Project Contract Budget</td>
            <td class="p-3 text-right font-bold text-slate-900">$${budget.toLocaleString()}</td>
          </tr>
          <tr class="bg-emerald-50/60">
            <td class="p-3 text-emerald-800 font-semibold">Total Cleared Payment Collections (Paid)</td>
            <td class="p-3 text-right font-black text-emerald-700">$${totalIncome.toLocaleString()}</td>
          </tr>
          <tr class="bg-rose-50/60">
            <td class="p-3 text-rose-800 font-semibold">Outstanding Balance Receivables (Due)</td>
            <td class="p-3 text-right font-black text-rose-700">$${totalDue.toLocaleString()}</td>
          </tr>
        </tbody>
      </table>

      <!-- Verification Footer Section -->
      <div class="border-t border-slate-100 pt-8 mt-12 flex justify-between items-center text-[10px] text-slate-400 font-medium">
        <p>Thank you for choosing Rajuk Consultancy for your digital transformation needs.</p>
        <p class="text-right font-mono text-[9px] uppercase text-slate-300">System Generated Statement</p>
      </div>
    </div>
  `;

  // Canvas scaling options matrix setup boundaries rules context allocation
  const configurationOptions = {
    margin:       0.4,
    filename:     `Invoice_${clientName.replace(/\s+/g, '_')}_Statement.pdf`,
    image:        { type: 'jpeg', quality: 0.99 },
    html2canvas:  { scale: 2.5, useCORS: true, letterRendering: true },
    jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
  };

  // Run dynamic generation stream engine parameters to save file directly
  html2pdf().set(configurationOptions).from(invoiceElement).save();
}

// Global UI Split Layout View Port Tab Router Function
function switchTab(targetTabId) {
  document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.remove('bg-indigo-600', 'text-white', 'shadow-md');
    btn.classList.add('text-slate-400', 'hover:text-white', 'hover:bg-[#1e202b]');
  });

  document.getElementById(`tab-${targetTabId}`).classList.remove('hidden');
  const activeBtn = document.getElementById(`btn-${targetTabId}`);
  if(activeBtn) {
    activeBtn.classList.add('bg-indigo-600', 'text-white', 'shadow-md');
    activeBtn.classList.remove('text-slate-400', 'hover:text-white', 'hover:bg-[#1e202b]');
  }
}

// Client Table Dataset Compiler Engine Function Row Renderer
function renderClientTableData() {
  const container = document.getElementById('clients-table-body');
  if(!container) return;
  
  // Sample production client profile structure entries dataset
  const mockClients = [
    { id: "c1", name: "Opu Ahmed", phone: "01711000000", project: "E-Commerce App Dev", budget: 3500, income: 2000, expense: 450, due: 1500 },
    { id: "c2", name: "Rahat Khan", phone: "01912999888", project: "Social Media Campaign", budget: 1200, income: 1200, expense: 200, due: 0 }
  ];

  container.innerHTML = mockClients.map(client => `
    <tr class="hover:bg-[#191b22] transition">
      <td class="px-6 py-3.5 font-bold text-white">${client.name}<br><span class="text-[10px] text-slate-500 font-medium">${client.project}</span></td>
      <td class="px-4 py-3.5 font-mono text-slate-400">${client.phone}</td>
      <td class="px-4 py-3.5 text-right font-mono font-bold">$${client.budget}</td>
      <td class="px-4 py-3.5 text-right font-mono font-bold text-emerald-400">$${client.income}</td>
      <td class="px-4 py-3.5 text-right font-mono font-bold text-rose-400">$${client.expense}</td>
      <td class="px-4 py-3.5 text-right font-mono font-bold text-amber-500">$${client.due}</td>
      <td class="px-6 py-3.5 text-center">
        <button onclick="downloadInvoice('${client.name}', '${client.phone}', '${client.project}', ${client.budget}, ${client.income}, ${client.due})" class="bg-indigo-600/10 hover:bg-indigo-600 text-indigo-400 hover:text-white px-2.5 py-1 rounded text-[11px] font-bold transition-all duration-150">
          📄 Invoice
        </button>
      </td>
    </tr>
  `).join('');
}

// DOM Setup Hook Listener Implementation Context Trigger execution layer
window.addEventListener('DOMContentLoaded', () => {
  renderClientTableData();
});
