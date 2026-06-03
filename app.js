const SB_URL = 'https://nmemmfblpzrkwyljpmvp.supabase.co';
const SB_KEY = 'sb_publishable_Lc7rXKQ-1TJaQFu7a-nOVQ_5Sf3x__M';
const { createClient } = supabase;
const sb = createClient(SB_URL, SB_KEY);

const CATS = [
  { k: 'food', l: 'Food' },
  { k: 'hygiene', l: 'Hygiene' },
  { k: 'medication', l: 'Medication' },
  { k: 'communication', l: 'Communication' },
  { k: 'transportation', l: 'Transportation' },
  { k: 'shelter', l: 'Shelter' },
  { k: 'assets', l: 'Assets' },
  { k: 'investments', l: 'Investments' },
  { k: 'entertainment', l: 'Entertainment' },
  { k: 'events', l: 'Events' },
];

let ST = { profiles: [], periods: [], sources: [], pid: null };

async function init() {
  buildCatPages();
  await loadProfiles();
  await loadPeriods();
  await loadSources();
  syncSelects();
  renderProfiles();
  renderPeriods();
  await renderIncomeLog();
}

function nav(k) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('nav button').forEach(b => b.classList.remove('active'));
  document.getElementById('pg-' + k).classList.add('active');
  document.getElementById('nb-' + k).classList.add('active');
  if (CATS.find(c => c.k === k)) loadCat(k);
  if (k === 'dashboard') loadDash();
}

async function loadProfiles() {
  const { data } = await sb.from('budget_profile').select('*').order('created_at', { ascending: false });
  ST.profiles = data || [];
}
async function loadPeriods() {
  const { data } = await sb.from('budget_period').select('*, budget_profile(name)').order('start_date', { ascending: false });
  ST.periods = data || [];
}
async function loadSources() {
  const { data } = await sb.from('income_source').select('*, budget_profile(name)');
  ST.sources = data || [];
}

function syncSelects() {
  const pOpts = '<option value="">--</option>' + ST.profiles.map(p => '<option value="' + p.profile_id + '">' + p.name + '</option>').join('');
  ['pd-prof', 'is-prof'].forEach(id => { const e = document.getElementById(id); if (e) e.innerHTML = pOpts; });
  const dOpts = '<option value="">--</option>' + ST.periods.map(p => '<option value="' + p.period_id + '">' + p.label + '</option>').join('');
  ['gp', 'il-period'].forEach(id => { const e = document.getElementById(id); if (e) e.innerHTML = dOpts; });
  CATS.forEach(c => {
    [c.k + '-ps', c.k + '-txn-ps'].forEach(id => { const e = document.getElementById(id); if (e) e.innerHTML = dOpts; });
  });
  const sOpts = '<option value="">--</option>' + ST.sources.map(s => '<option value="' + s.income_source_id + '">' + s.name + '</option>').join('');
  const sse = document.getElementById('il-source'); if (sse) sse.innerHTML = sOpts;
}

async function addProfile() {
  const name = document.getElementById('pn').value.trim();
  if (!name) return msg('pm', 'Name required', 'e');
  const { error } = await sb.from('budget_profile').insert({ name });
  if (error) return msg('pm', error.message, 'e');
  msg('pm', 'Added!', 's'); document.getElementById('pn').value = '';
  await loadProfiles(); syncSelects(); renderProfiles();
}
function renderProfiles() {
  const tb = document.getElementById('pt');
  if (!ST.profiles.length) { tb.innerHTML = '<tr><td colspan=3 class="empty">None yet</td></tr>'; return; }
  tb.innerHTML = ST.profiles.map(p =>
    '<tr><td>' + p.name + '</td><td>' + new Date(p.created_at).toLocaleDateString() + '</td><td><button class="btn bd" style="padding:4px 10px;font-size:.75rem" onclick="delProfile(\'' + p.profile_id + '\')" >Del</button></td></tr>'
  ).join('');
}
async function delProfile(id) {
  if (!confirm('Delete profile and all data?')) return;
  await sb.from('budget_profile').delete().eq('profile_id', id);
  await loadProfiles(); await loadPeriods(); syncSelects(); renderProfiles(); renderPeriods();
}

async function addPeriod() {
  const profile_id = document.getElementById('pd-prof').value;
  const label = document.getElementById('pd-lbl').value.trim();
  const start_date = document.getElementById('pd-start').value;
  const end_date = document.getElementById('pd-end').value;
  if (!profile_id || !label || !start_date || !end_date) return msg('pdm', 'All fields required', 'e');
  const { error } = await sb.from('budget_period').insert({ profile_id, label, start_date, end_date });
  if (error) return msg('pdm', error.message, 'e');
  msg('pdm', 'Added!', 's');
  await loadPeriods(); syncSelects(); renderPeriods();
}
function renderPeriods() {
  const tb = document.getElementById('pdt');
  if (!ST.periods.length) { tb.innerHTML = '<tr><td colspan=5 class="empty">None yet</td></tr>'; return; }
  tb.innerHTML = ST.periods.map(p =>
    '<tr><td>' + (p.budget_profile?.name || '') + '</td><td>' + p.label + '</td><td>' + p.start_date + '</td><td>' + p.end_date + '</td><td><button class="btn bd" style="padding:4px 10px;font-size:.75rem" onclick="delPeriod(\'' + p.period_id + '\')" >Del</button></td></tr>'
  ).join('');
}
async function delPeriod(id) {
  if (!confirm('Delete period?')) return;
  await sb.from('budget_period').delete().eq('period_id', id);
  await loadPeriods(); syncSelects(); renderPeriods();
}

async function addSource() {
  const profile_id = document.getElementById('is-prof').value;
  const name = document.getElementById('is-name').value.trim();
  if (!profile_id || !name) return msg('ism', 'All fields required', 'e');
  const { error } = await sb.from('income_source').insert({ profile_id, name });
  if (error) return msg('ism', error.message, 'e');
  msg('ism', 'Source added!', 's'); document.getElementById('is-name').value = '';
  await loadSources(); syncSelects();
}
async function logIncome() {
  const period_id = document.getElementById('il-period').value;
  const income_source_id = document.getElementById('il-source').value;
  const amount = parseFloat(document.getElementById('il-amt').value);
  if (!period_id || !income_source_id || isNaN(amount)) return msg('ilm', 'All fields required', 'e');
  const { error } = await sb.from('monthly_income').insert({ period_id, income_source_id, amount });
  if (error) return msg('ilm', error.message, 'e');
  msg('ilm', 'Logged!', 's'); document.getElementById('il-amt').value = '';
  await renderIncomeLog();
}
async function renderIncomeLog() {
  const { data } = await sb.from('monthly_income').select('*, budget_period(label), income_source(name)').order('monthly_income_id', { ascending: false });
  const tb = document.getElementById('ilt');
  if (!data?.length) { tb.innerHTML = '<tr><td colspan=4 class="empty">No income logged</td></tr>'; return; }
  tb.innerHTML = data.map(r =>
    '<tr><td>' + (r.budget_period?.label || '') + '</td><td>' + (r.income_source?.name || '') + '</td><td>$' + Number(r.amount).toFixed(2) + '</td><td><button class="btn bd" style="padding:4px 10px;font-size:.75rem" onclick="delIncome(\'' + r.monthly_income_id + '\')" >Del</button></td></tr>'
  ).join('');
}
async function delIncome(id) {
  await sb.from('monthly_income').delete().eq('monthly_income_id', id);
  await renderIncomeLog();
}

function buildCatPages() {
  document.getElementById('catpages').innerHTML = CATS.map(c =>
    '<div class="page" id="pg-' + c.k + '">' +
    '<h2>' + c.l + '</h2>' +
    '<div class="card"><h3>Add Item</h3><div id="' + c.k + '-im"></div>' +
      '<div class="fr">' +
        '<div class="fg"><label>Item Name</label><input id="' + c.k + '-iname" placeholder="Item name"></div>' +
        '<div class="fg"><label>Unit</label><input id="' + c.k + '-iunit" placeholder="pkg, mo, gal"></div>' +
        '<button class="btn bp" onclick="addItem(\'' + c.k + '\')" >Add Item</button>' +
      '</div></div>' +
    '<div class="card"><h3>Set Budget Line</h3><div id="' + c.k + '-lm"></div>' +
      '<div class="fr">' +
        '<div class="fg"><label>Period</label><select id="' + c.k + '-ps"><option value="">--</option></select></div>' +
        '<div class="fg"><label>Item</label><select id="' + c.k + '-isel"><option value="">--</option></select></div>' +
        '<div class="fg"><label>Budgeted ($)</label><input type="number" id="' + c.k + '-bamt" placeholder="0.00"></div>' +
        '<button class="btn bp" onclick="addLine(\'' + c.k + '\')" >Set</button>' +
      '</div></div>' +
    '<div class="card"><h3>Log Transaction</h3><div id="' + c.k + '-tm"></div>' +
      '<div class="fr">' +
        '<div class="fg"><label>Period</label><select id="' + c.k + '-txn-ps"><option value="">--</option></select></div>' +
        '<div class="fg"><label>Item</label><select id="' + c.k + '-txn-isel"><option value="">--</option></select></div>' +
        '<div class="fg"><label>Date</label><input type="date" id="' + c.k + '-txn-date"></div>' +
        '<div class="fg"><label>Amount ($)</label><input type="number" id="' + c.k + '-txn-amt" placeholder="0.00"></div>' +
        '<button class="btn bp" onclick="logTxn(\'' + c.k + '\')" >Log</button>' +
      '</div></div>' +
    '<div class="two">' +
      '<div class="card"><h3>Items</h3><table><thead><tr><th>Name</th><th>Unit</th><th></th></tr></thead><tbody id="' + c.k + '-itbl"></tbody></table></div>' +
      '<div class="card"><h3>Budget Lines</h3><table><thead><tr><th>Period</th><th>Item</th><th>Budget</th><th></th></tr></thead><tbody id="' + c.k + '-ltbl"></tbody></table></div>' +
    '</div>' +
    '<div class="card" style="margin-top:12px"><h3>Transactions</h3><table><thead><tr><th>Date</th><th>Item</th><th>Amount</th><th></th></tr></thead><tbody id="' + c.k + '-ttbl"></tbody></table></div>' +
    '</div>'
  ).join('');
}

async function loadCat(k) {
  const { data: items } = await sb.from(k + '_item').select('*').order('name');
  const itbl = document.getElementById(k + '-itbl');
  itbl.innerHTML = items?.length
    ? items.map(i => '<tr><td>' + i.name + '</td><td>' + (i.unit || '') + '</td><td><button class="btn bd" style="padding:3px 8px;font-size:.75rem" onclick="delItem(\'' + k + '\',\'' + i[k + '_item_id'] + '\')" >Del</button></td></tr>').join('')
    : '<tr><td colspan=3 class="empty">None</td></tr>';
  const iOpts = '<option value="">--</option>' + (items || []).map(i => '<option value="' + i[k + '_item_id'] + '">' + i.name + '</option>').join('');
  [k + '-isel', k + '-txn-isel'].forEach(id => { const e = document.getElementById(id); if (e) e.innerHTML = iOpts; });
  const pOpts = '<option value="">--</option>' + ST.periods.map(p => '<option value="' + p.period_id + '">' + p.label + '</option>').join('');
  [k + '-ps', k + '-txn-ps'].forEach(id => { const e = document.getElementById(id); if (e) e.innerHTML = pOpts; });
  const { data: lines } = await sb.from(k + '_budget_line').select('*, budget_period(label), ' + k + '_item(name)').order(k + '_budget_line_id', { ascending: false });
  const ltbl = document.getElementById(k + '-ltbl');
  ltbl.innerHTML = lines?.length
    ? lines.map(l => '<tr><td>' + (l.budget_period?.label || '') + '</td><td>' + (l[k + '_item']?.name || '') + '</td><td>$' + Number(l.budgeted_amount).toFixed(2) + '</td><td><button class="btn bd" style="padding:3px 8px;font-size:.75rem" onclick="delLine(\'' + k + '\',\'' + l[k + '_budget_line_id'] + '\')" >Del</button></td></tr>').join('')
    : '<tr><td colspan=4 class="empty">None</td></tr>';
  const { data: txns } = await sb.from(k + '_transaction').select('*, budget_period(label), ' + k + '_item(name)').order('transaction_date', { ascending: false });
  const ttbl = document.getElementById(k + '-ttbl');
  ttbl.innerHTML = txns?.length
    ? txns.map(t => '<tr><td>' + t.transaction_date + '</td><td>' + (t[k + '_item']?.name || '') + '</td><td>$' + Number(t.amount).toFixed(2) + '</td><td><button class="btn bd" style="padding:3px 8px;font-size:.75rem" onclick="delTxn(\'' + k + '\',\'' + t[k + '_transaction_id'] + '\')" >Del</button></td></tr>').join('')
    : '<tr><td colspan=4 class="empty">None</td></tr>';
}

async function addItem(k) {
  const name = document.getElementById(k + '-iname').value.trim();
  const unit = document.getElementById(k + '-iunit').value.trim();
  if (!name) return msg(k + '-im', 'Name required', 'e');
  const { error } = await sb.from(k + '_item').insert({ name, unit: unit || null });
  if (error) return msg(k + '-im', error.message, 'e');
  msg(k + '-im', 'Added!', 's');
  document.getElementById(k + '-iname').value = '';
  document.getElementById(k + '-iunit').value = '';
  await loadCat(k);
}
async function delItem(k, id) {
  await sb.from(k + '_item').delete().eq(k + '_item_id', id);
  await loadCat(k);
}
async function addLine(k) {
  const period_id = document.getElementById(k + '-ps').value;
  const item_id = document.getElementById(k + '-isel').value;
  const budgeted_amount = parseFloat(document.getElementById(k + '-bamt').value);
  if (!period_id || !item_id || isNaN(budgeted_amount)) return msg(k + '-lm', 'All fields required', 'e');
  const row = { period_id, [k + '_item_id']: item_id, budgeted_amount };
  const { error } = await sb.from(k + '_budget_line').insert(row);
  if (error) return msg(k + '-lm', error.message, 'e');
  msg(k + '-lm', 'Set!', 's'); document.getElementById(k + '-bamt').value = '';
  await loadCat(k);
}
async function delLine(k, id) {
  await sb.from(k + '_budget_line').delete().eq(k + '_budget_line_id', id);
  await loadCat(k);
}
async function logTxn(k) {
  const period_id = document.getElementById(k + '-txn-ps').value;
  const item_id = document.getElementById(k + '-txn-isel').value;
  const transaction_date = document.getElementById(k + '-txn-date').value;
  const amount = parseFloat(document.getElementById(k + '-txn-amt').value);
  if (!period_id || !item_id || !transaction_date || isNaN(amount)) return msg(k + '-tm', 'All fields required', 'e');
  const row = { period_id, [k + '_item_id']: item_id, transaction_date, amount };
  const { error } = await sb.from(k + '_transaction').insert(row);
  if (error) return msg(k + '-tm', error.message, 'e');
  msg(k + '-tm', 'Logged!', 's'); document.getElementById(k + '-txn-amt').value = '';
  await loadCat(k);
}
async function delTxn(k, id) {
  await sb.from(k + '_transaction').delete().eq(k + '_transaction_id', id);
  await loadCat(k);
}

async function onPC() {
  ST.pid = document.getElementById('gp').value;
  const p = ST.periods.find(x => x.period_id === ST.pid);
  document.getElementById('plbl').textContent = p ? p.label : 'No period selected';
  await loadDash();
}
async function loadDash() {
  const pid = ST.pid;
  if (!pid) {
    document.getElementById('ss').innerHTML = '';
    document.getElementById('st').innerHTML = '<tr><td colspan=4 class="empty">Select a period above</td></tr>';
    return;
  }
  const { data } = await sb.from('budget_period_summary').select('*').eq('period_id', pid).single();
  if (!data) return;
  const income = Number(data.total_income);
  let tB = 0, tA = 0;
  CATS.forEach(c => { tB += Number(data[c.k + '_budgeted'] || 0); tA += Number(data[c.k + '_actual'] || 0); });
  document.getElementById('ss').innerHTML = [
    { l: 'Total Income', v: '$' + income.toFixed(2) },
    { l: 'Total Budgeted', v: '$' + tB.toFixed(2) },
    { l: 'Total Spent', v: '$' + tA.toFixed(2) },
    { l: 'Remaining', v: '$' + (income - tA).toFixed(2) },
  ].map(s => '<div class="stat"><div class="lbl">' + s.l + '</div><div class="val">' + s.v + '</div></div>').join('');
  document.getElementById('st').innerHTML = CATS.map(c => {
    const b = Number(data[c.k + '_budgeted'] || 0);
    const a = Number(data[c.k + '_actual'] || 0);
    const r = b - a;
    const badge = r >= 0 ? '<span class="badge bg">+$' + r.toFixed(2) + '</span>' : '<span class="badge br">-$' + Math.abs(r).toFixed(2) + '</span>';
    return '<tr><td>' + c.l + '</td><td>$' + b.toFixed(2) + '</td><td>$' + a.toFixed(2) + '</td><td>' + badge + '</td></tr>';
  }).join('');
}

function msg(id, text, t) {
  const e = document.getElementById(id);
  if (!e) return;
  e.innerHTML = '<div class="msg ' + (t === 's' ? 'ms' : 'me') + '">' + text + '</div>';
  setTimeout(() => e.innerHTML = '', 3500);
}

init();
