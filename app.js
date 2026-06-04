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
  await loadCommunityPage();
}

function nav(k) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('nav button').forEach(b => b.classList.remove('active'));
  document.getElementById('pg-' + k).classList.add('active');
  document.getElementById('nb-' + k).classList.add('active');
  if (CATS.find(c => c.k === k)) loadCat(k);
  if (k === 'dashboard') loadDash();
  if (k === 'community') loadCommunityPage();
}

async function loadProfiles() {
  const { data } = await sb.from('budget_profile').select('*').order('created_at', { ascending: false });
  ST.profiles = data || [];
}
async function loadPeriods() {
  const { data } = await sb.from('budget_period').select('*, budget_profile(name, profile_type)').order('start_date', { ascending: false });
  ST.periods = data || [];
}
async function loadSources() {
  const { data } = await sb.from('income_source').select('*, budget_profile(name)');
  ST.sources = data || [];
}

function syncSelects() {
  const pOpts = '<option value="">--</option>' + ST.profiles.map(p => '<option value="' + p.profile_id + '">' + p.name + ' (' + p.profile_type + ')</option>').join('');
  const personalOpts = '<option value="">--</option>' + ST.profiles.filter(p => p.profile_type === 'personal').map(p => '<option value="' + p.profile_id + '">' + p.name + '</option>').join('');
  const communityOpts = '<option value="">--</option>' + ST.profiles.filter(p => p.profile_type === 'community').map(p => '<option value="' + p.profile_id + '">' + p.name + '</option>').join('');
  ['pd-prof', 'is-prof'].forEach(id => { const e = document.getElementById(id); if (e) e.innerHTML = pOpts; });
  const cmPers = document.getElementById('cm-personal'); if (cmPers) cmPers.innerHTML = personalOpts;
  const cmComm = document.getElementById('cm-community'); if (cmComm) cmComm.innerHTML = communityOpts;
  const cbComm = document.getElementById('cb-community'); if (cbComm) cbComm.innerHTML = communityOpts;
  const dOpts = '<option value="">--</option>' + ST.periods.map(p => '<option value="' + p.period_id + '">' + p.label + ' (' + (p.budget_profile?.name || '') + ')</option>').join('');
  ['gp', 'il-period'].forEach(id => { const e = document.getElementById(id); if (e) e.innerHTML = dOpts; });
  CATS.forEach(c => {
    [c.k + '-ps', c.k + '-txn-ps'].forEach(id => { const e = document.getElementById(id); if (e) e.innerHTML = dOpts; });
  });
  const sOpts = '<option value="">--</option>' + ST.sources.map(s => '<option value="' + s.income_source_id + '">' + s.name + '</option>').join('');
  const sse = document.getElementById('il-source'); if (sse) sse.innerHTML = sOpts;
}

// ---- PROFILES ----
async function addProfile() {
  const name = document.getElementById('pn').value.trim();
  const profile_type = document.getElementById('ptype').value;
  if (!name) return msg('pm', 'Name required', 'e');
  const { error } = await sb.from('budget_profile').insert({ name, profile_type });
  if (error) return msg('pm', error.message, 'e');
  msg('pm', 'Added!', 's'); document.getElementById('pn').value = '';
  await loadProfiles(); syncSelects(); renderProfiles();
}
function renderProfiles() {
  const tb = document.getElementById('pt');
  if (!ST.profiles.length) { tb.innerHTML = '<tr><td colspan=4 class="empty">None yet</td></tr>'; return; }
  tb.innerHTML = ST.profiles.map(p =>
    '<tr><td>' + p.name + '</td><td><span class="badge ' + (p.profile_type === 'community' ? 'bc' : 'bp2') + '">' + p.profile_type + '</span></td><td>' + new Date(p.created_at).toLocaleDateString() + '</td><td><button class="btn bd" style="padding:4px 10px;font-size:.75rem" onclick="delProfile(\'' + p.profile_id + '\')" >Del</button></td></tr>'
  ).join('');
}
async function delProfile(id) {
  if (!confirm('Delete profile and all data?')) return;
  await sb.from('budget_profile').delete().eq('profile_id', id);
  await loadProfiles(); await loadPeriods(); syncSelects(); renderProfiles(); renderPeriods();
}

// ---- PERIODS ----
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
    '<tr><td>' + (p.budget_profile?.name || '') + '</td><td><span class="badge ' + (p.budget_profile?.profile_type === 'community' ? 'bc' : 'bp2') + '">' + (p.budget_profile?.profile_type || '') + '</span></td><td>' + p.label + '</td><td>' + p.start_date + '</td><td>' + p.end_date + '</td><td><button class="btn bd" style="padding:4px 10px;font-size:.75rem" onclick="delPeriod(\'' + p.period_id + '\')" >Del</button></td></tr>'
  ).join('');
}
async function delPeriod(id) {
  if (!confirm('Delete period?')) return;
  await sb.from('budget_period').delete().eq('period_id', id);
  await loadPeriods(); syncSelects(); renderPeriods();
}

// ---- INCOME ----
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

// ---- CSV HELPERS ----
function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/["']/g, ''));
  return lines.slice(1).filter(l => l.trim()).map(line => {
    const vals = [];
    let cur = '', inQ = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') { inQ = !inQ; }
      else if (ch === ',' && !inQ) { vals.push(cur.trim()); cur = ''; }
      else cur += ch;
    }
    vals.push(cur.trim());
    const row = {};
    headers.forEach((h, i) => row[h] = (vals[i] || '').replace(/^["']|["']$/g, ''));
    return row;
  });
}

// Renders a pre-flight table into containerId.
// validated = array of { ok: bool, fields: [{label, value, ok, note}], insert: obj|null }
// onConfirm = async fn called with valid inserts when user clicks Confirm
function renderPreflight(containerId, validated, columns, onConfirm) {
  const el = document.getElementById(containerId);
  if (!el) return;
  const hasErrors = validated.some(r => !r.ok);
  const goodCount = validated.filter(r => r.ok).length;

  const statusCell = (f) => {
    const icon = f.ok ? '&#9989;' : '&#10060;';
    const note = f.note ? ' <span style="color:var(--danger);font-size:.72rem">' + f.note + '</span>' : '';
    return '<td>' + icon + ' <span style="font-size:.82rem">' + (f.value || '<em style="color:var(--muted)">—</em>') + '</span>' + note + '</td>';
  };

  const headerCells = columns.map(c => '<th>' + c + '</th>').join('');
  const bodyRows = validated.map((r, i) => {
    const rowStyle = r.ok ? '' : 'background:rgba(248,113,113,.07);';
    return '<tr style="' + rowStyle + '"><td style="color:var(--muted);font-size:.75rem">Row ' + (i + 2) + '</td>' +
      r.fields.map(statusCell).join('') + '</tr>';
  }).join('');

  const summary = hasErrors
    ? '<div class="msg me" style="margin-bottom:10px">&#9888; ' + (validated.length - goodCount) + ' row(s) have errors and will be skipped. Fix the CSV and re-preview, or confirm to insert only the ' + goodCount + ' valid row(s).</div>'
    : '<div class="msg ms" style="margin-bottom:10px">&#9989; All ' + goodCount + ' row(s) look good. Ready to insert.</div>';

  const confirmBtn = goodCount > 0
    ? '<button class="btn bp" style="margin-top:10px" id="' + containerId + '-confirm">Confirm &amp; Insert ' + goodCount + ' row(s)</button>'
    : '';

  el.innerHTML = summary +
    '<div style="overflow-x:auto"><table><thead><tr><th>#</th>' + headerCells + '</tr></thead><tbody>' + bodyRows + '</tbody></table></div>' +
    confirmBtn;

  if (goodCount > 0) {
    document.getElementById(containerId + '-confirm').addEventListener('click', async () => {
      const validInserts = validated.filter(r => r.ok).map(r => r.insert);
      await onConfirm(validInserts);
      el.innerHTML = '';
    });
  }
}

// ---- ITEMS CSV ----
async function previewItemsCSV(k) {
  const fileEl = document.getElementById(k + '-csv-items');
  const previewId = k + '-csv-items-preview';
  const msgId = k + '-csv-im';
  if (!fileEl.files.length) return msg(msgId, 'Select a CSV file', 'e');
  const text = await fileEl.files[0].text();
  const rows = parseCSV(text);
  if (!rows.length) return msg(msgId, 'No data rows found', 'e');

  const validated = rows.map(r => {
    const nameOk = !!r.name;
    return {
      ok: nameOk,
      fields: [
        { label: 'name', value: r.name, ok: nameOk, note: nameOk ? '' : 'required' },
        { label: 'unit', value: r.unit || '', ok: true, note: '' },
      ],
      insert: nameOk ? { name: r.name, unit: r.unit || null } : null,
    };
  });

  renderPreflight(previewId, validated, ['Name', 'Unit'], async (inserts) => {
    const { error } = await sb.from(k + '_item').insert(inserts);
    if (error) return msg(msgId, error.message, 'e');
    msg(msgId, 'Inserted ' + inserts.length + ' item(s)!', 's');
    fileEl.value = '';
    await loadCat(k);
  });
}

// ---- TRANSACTIONS CSV ----
async function previewTxnsCSV(k) {
  const fileEl = document.getElementById(k + '-csv-txns');
  const periodEl = document.getElementById(k + '-csv-period');
  const previewId = k + '-csv-txns-preview';
  const msgId = k + '-csv-tm';
  const period_id = periodEl.value;
  if (!period_id) return msg(msgId, 'Select a period first', 'e');
  if (!fileEl.files.length) return msg(msgId, 'Select a CSV file', 'e');
  const text = await fileEl.files[0].text();
  const rows = parseCSV(text);
  if (!rows.length) return msg(msgId, 'No data rows found', 'e');

  const { data: items } = await sb.from(k + '_item').select('*');
  const itemMap = {};
  (items || []).forEach(i => itemMap[i.name.toLowerCase()] = i[k + '_item_id']);
  const commMap = {};
  ST.profiles.filter(p => p.profile_type === 'community').forEach(p => commMap[p.name.toLowerCase()] = p.profile_id);

  const validated = rows.map(r => {
    const itemName = (r.item_name || r.item || '').trim();
    const item_id = itemMap[itemName.toLowerCase()];
    const itemOk = !!item_id;

    const dateVal = r.date || r.transaction_date || '';
    const dateOk = !!dateVal;

    const amountVal = r.amount;
    const amount = parseFloat(amountVal);
    const amountOk = !isNaN(amount);

    const txn_source = (r.source || 'personal').toLowerCase();
    const srcOk = ['personal', 'community'].includes(txn_source);

    const commName = (r.community_name || '').trim();
    const community_profile_id = txn_source === 'community' ? (commMap[commName.toLowerCase()] || null) : null;
    const commOk = txn_source !== 'community' || !!community_profile_id;

    const rowOk = itemOk && dateOk && amountOk && srcOk && commOk;
    return {
      ok: rowOk,
      fields: [
        { label: 'date', value: dateVal, ok: dateOk, note: dateOk ? '' : 'required' },
        { label: 'item_name', value: itemName, ok: itemOk, note: itemOk ? '' : 'not found' },
        { label: 'amount', value: amountVal, ok: amountOk, note: amountOk ? '' : 'invalid' },
        { label: 'source', value: txn_source, ok: srcOk && commOk, note: !srcOk ? 'must be personal/community' : !commOk ? 'community not found' : '' },
      ],
      insert: rowOk ? { period_id, [k + '_item_id']: item_id, transaction_date: dateVal, amount, txn_source, community_profile_id } : null,
    };
  });

  renderPreflight(previewId, validated, ['Date', 'Item', 'Amount', 'Source'], async (inserts) => {
    const { error } = await sb.from(k + '_transaction').insert(inserts);
    if (error) return msg(msgId, error.message, 'e');
    msg(msgId, 'Inserted ' + inserts.length + ' transaction(s)!', 's');
    fileEl.value = '';
    await loadCat(k);
  });
}

// ---- INCOME CSV ----
async function previewIncomeCSV() {
  const fileEl = document.getElementById('il-csv-file');
  const previewId = 'il-csv-preview';
  const msgId = 'il-csv-msg';
  if (!fileEl.files.length) return msg(msgId, 'Select a CSV file', 'e');
  const text = await fileEl.files[0].text();
  const rows = parseCSV(text);
  if (!rows.length) return msg(msgId, 'No data rows found', 'e');

  const periodMap = {};
  ST.periods.forEach(p => periodMap[p.label.toLowerCase()] = p.period_id);
  const sourceMap = {};
  ST.sources.forEach(s => sourceMap[s.name.toLowerCase()] = s.income_source_id);

  const validated = rows.map(r => {
    const periodLabel = (r.period_label || r.period || '').trim();
    const period_id = periodMap[periodLabel.toLowerCase()];
    const periodOk = !!period_id;

    const sourceName = (r.source_name || r.source || '').trim();
    const income_source_id = sourceMap[sourceName.toLowerCase()];
    const sourceOk = !!income_source_id;

    const amount = parseFloat(r.amount);
    const amountOk = !isNaN(amount);

    const rowOk = periodOk && sourceOk && amountOk;
    return {
      ok: rowOk,
      fields: [
        { label: 'period_label', value: periodLabel, ok: periodOk, note: periodOk ? '' : 'not found' },
        { label: 'source_name', value: sourceName, ok: sourceOk, note: sourceOk ? '' : 'not found' },
        { label: 'amount', value: r.amount, ok: amountOk, note: amountOk ? '' : 'invalid' },
      ],
      insert: rowOk ? { period_id, income_source_id, amount } : null,
    };
  });

  renderPreflight(previewId, validated, ['Period', 'Source', 'Amount'], async (inserts) => {
    const { error } = await sb.from('monthly_income').insert(inserts);
    if (error) return msg(msgId, error.message, 'e');
    msg(msgId, 'Inserted ' + inserts.length + ' income row(s)!', 's');
    fileEl.value = '';
    await renderIncomeLog();
  });
}

// ---- SAMPLE CSV DOWNLOADS ----
function downloadSampleCSV(type) {
  let content, filename;
  if (type === 'items') {
    content = 'name,unit\nMilk,gallon\nBread,loaf\nEggs,dozen';
    filename = 'sample_items.csv';
  } else if (type === 'transactions') {
    content = 'date,item_name,amount,source,community_name\n2026-06-01,Milk,4.99,personal,\n2026-06-02,Bread,3.49,personal,';
    filename = 'sample_transactions.csv';
  } else if (type === 'income') {
    content = 'period_label,source_name,amount\nJune 2026,Salary,3500.00\nJune 2026,Freelance,500.00';
    filename = 'sample_income.csv';
  }
  const a = document.createElement('a');
  a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(content);
  a.download = filename;
  a.click();
}

// ---- COMMUNITY PAGE ----
async function loadCommunityPage() {
  await loadProfiles();
  syncSelects();
  const { data: members } = await sb.from('community_member')
    .select('*, community:community_profile_id(name), personal:personal_profile_id(name)')
    .order('joined_at', { ascending: false });
  const mt = document.getElementById('cm-table');
  if (!mt) return;
  mt.innerHTML = members?.length
    ? members.map(m =>
        '<tr><td>' + (m.community?.name || '') + '</td><td>' + (m.personal?.name || '') + '</td>' +
        '<td>' + (Number(m.share_weight) * 100).toFixed(0) + '%</td>' +
        '<td><button class="btn bd" style="padding:3px 8px;font-size:.75rem" onclick="delMember(\'' + m.community_member_id + '\')" >Remove</button></td></tr>'
      ).join('')
    : '<tr><td colspan=4 class="empty">No members yet</td></tr>';
  await loadCommunityBudgetView();
}

async function addMember() {
  const community_profile_id = document.getElementById('cm-community').value;
  const personal_profile_id = document.getElementById('cm-personal').value;
  const share_weight = parseFloat(document.getElementById('cm-weight').value) / 100;
  if (!community_profile_id || !personal_profile_id || isNaN(share_weight)) return msg('cm-msg', 'All fields required', 'e');
  if (community_profile_id === personal_profile_id) return msg('cm-msg', 'Cannot add a profile to itself', 'e');
  const { error } = await sb.from('community_member').insert({ community_profile_id, personal_profile_id, share_weight });
  if (error) return msg('cm-msg', error.message, 'e');
  msg('cm-msg', 'Member added!', 's');
  await loadCommunityPage();
}
async function delMember(id) {
  await sb.from('community_member').delete().eq('community_member_id', id);
  await loadCommunityPage();
}

async function loadCommunityBudgetView() {
  const comm_id = document.getElementById('cb-community')?.value;
  const ct = document.getElementById('cb-table');
  if (!ct) return;
  if (!comm_id) { ct.innerHTML = '<tr><td colspan=5 class="empty">Select a community above</td></tr>'; return; }
  const { data: members } = await sb.from('community_member')
    .select('*, personal:personal_profile_id(name)')
    .eq('community_profile_id', comm_id);
  const rows = [];
  for (const c of CATS) {
    const { data: lines } = await sb.from(c.k + '_budget_line')
      .select('*, budget_period(label, budget_profile(name, profile_type)), ' + c.k + '_item(name)')
      .eq('budget_source', 'community')
      .eq('community_profile_id', comm_id);
    (lines || []).forEach(l => rows.push({ cat: c.l, item: l[c.k + '_item']?.name, period: l.budget_period?.label, profile: l.budget_period?.budget_profile?.name, amount: l.budgeted_amount }));
  }
  ct.innerHTML = rows.length
    ? rows.map(r => '<tr><td>' + r.cat + '</td><td>' + (r.item || '') + '</td><td>' + (r.period || '') + '</td><td>' + (r.profile || '') + '</td><td>$' + Number(r.amount).toFixed(2) + '</td></tr>').join('')
    : '<tr><td colspan=5 class="empty">No community budget lines yet.</td></tr>';
  const mt2 = document.getElementById('cb-members');
  if (mt2) {
    mt2.innerHTML = members?.length
      ? members.map(m => '<tr><td>' + (m.personal?.name || '') + '</td><td>' + (Number(m.share_weight) * 100).toFixed(0) + '%</td></tr>').join('')
      : '<tr><td colspan=2 class="empty">No members</td></tr>';
  }
}

// ---- CATEGORY PAGES ----
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

    '<div class="card"><h3>&#128196; Bulk Upload Items (CSV)</h3><div id="' + c.k + '-csv-im"></div>' +
      '<p style="font-size:.75rem;color:var(--muted);margin-bottom:8px">CSV columns: <code>name</code>, <code>unit</code> &nbsp;|&nbsp; <a href="#" onclick="downloadSampleCSV(\'items\')" style="color:var(--accent)">Download sample</a></p>' +
      '<div class="fr">' +
        '<div class="fg"><label>CSV File</label><input type="file" id="' + c.k + '-csv-items" accept=".csv" onchange="document.getElementById(\'' + c.k + '-csv-items-preview\').innerHTML=\'\'"></div>' +
        '<button class="btn bp" onclick="previewItemsCSV(\'' + c.k + '\')" >Preview</button>' +
      '</div>' +
      '<div id="' + c.k + '-csv-items-preview" style="margin-top:10px"></div>' +
    '</div>' +

    '<div class="card"><h3>Set Budget Line</h3><div id="' + c.k + '-lm"></div>' +
      '<div class="fr">' +
        '<div class="fg"><label>Period</label><select id="' + c.k + '-ps"><option value="">--</option></select></div>' +
        '<div class="fg"><label>Item</label><select id="' + c.k + '-isel"><option value="">--</option></select></div>' +
        '<div class="fg"><label>Budgeted ($)</label><input type="number" id="' + c.k + '-bamt" placeholder="0.00"></div>' +
        '<div class="fg"><label>Source</label><select id="' + c.k + '-bsrc"><option value="personal">Personal</option><option value="community">Community</option></select></div>' +
        '<div class="fg"><label>Community (if shared)</label><select id="' + c.k + '-bcomm"><option value="">--</option></select></div>' +
        '<button class="btn bp" onclick="addLine(\'' + c.k + '\')" >Set</button>' +
      '</div></div>' +

    '<div class="card"><h3>Log Transaction</h3><div id="' + c.k + '-tm"></div>' +
      '<div class="fr">' +
        '<div class="fg"><label>Period</label><select id="' + c.k + '-txn-ps"><option value="">--</option></select></div>' +
        '<div class="fg"><label>Item</label><select id="' + c.k + '-txn-isel"><option value="">--</option></select></div>' +
        '<div class="fg"><label>Date</label><input type="date" id="' + c.k + '-txn-date"></div>' +
        '<div class="fg"><label>Amount ($)</label><input type="number" id="' + c.k + '-txn-amt" placeholder="0.00"></div>' +
        '<div class="fg"><label>Source</label><select id="' + c.k + '-tsrc"><option value="personal">Personal</option><option value="community">Community</option></select></div>' +
        '<div class="fg"><label>Community (if shared)</label><select id="' + c.k + '-tcomm"><option value="">--</option></select></div>' +
        '<button class="btn bp" onclick="logTxn(\'' + c.k + '\')" >Log</button>' +
      '</div></div>' +

    '<div class="card"><h3>&#128196; Bulk Upload Transactions (CSV)</h3><div id="' + c.k + '-csv-tm"></div>' +
      '<p style="font-size:.75rem;color:var(--muted);margin-bottom:8px">CSV columns: <code>date</code>, <code>item_name</code>, <code>amount</code>, <code>source</code>, <code>community_name</code> &nbsp;|&nbsp; <a href="#" onclick="downloadSampleCSV(\'transactions\')" style="color:var(--accent)">Download sample</a></p>' +
      '<div class="fr">' +
        '<div class="fg"><label>Period</label><select id="' + c.k + '-csv-period"><option value="">--</option></select></div>' +
        '<div class="fg"><label>CSV File</label><input type="file" id="' + c.k + '-csv-txns" accept=".csv" onchange="document.getElementById(\'' + c.k + '-csv-txns-preview\').innerHTML=\'\'"></div>' +
        '<button class="btn bp" onclick="previewTxnsCSV(\'' + c.k + '\')" >Preview</button>' +
      '</div>' +
      '<div id="' + c.k + '-csv-txns-preview" style="margin-top:10px"></div>' +
    '</div>' +

    '<div class="two">' +
      '<div class="card"><h3>Items</h3><table><thead><tr><th>Name</th><th>Unit</th><th></th></tr></thead><tbody id="' + c.k + '-itbl"></tbody></table></div>' +
      '<div class="card"><h3>Budget Lines</h3><table><thead><tr><th>Period</th><th>Item</th><th>Budget</th><th>Source</th><th></th></tr></thead><tbody id="' + c.k + '-ltbl"></tbody></table></div>' +
    '</div>' +
    '<div class="card" style="margin-top:12px"><h3>Transactions</h3><table><thead><tr><th>Date</th><th>Item</th><th>Amount</th><th>Source</th><th></th></tr></thead><tbody id="' + c.k + '-ttbl"></tbody></table></div>' +
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
  const pOpts = '<option value="">--</option>' + ST.periods.map(p => '<option value="' + p.period_id + '">' + p.label + ' (' + (p.budget_profile?.name || '') + ')</option>').join('');
  [k + '-ps', k + '-txn-ps', k + '-csv-period'].forEach(id => { const e = document.getElementById(id); if (e) e.innerHTML = pOpts; });
  const commOpts = '<option value="">--</option>' + ST.profiles.filter(p => p.profile_type === 'community').map(p => '<option value="' + p.profile_id + '">' + p.name + '</option>').join('');
  [k + '-bcomm', k + '-tcomm'].forEach(id => { const e = document.getElementById(id); if (e) e.innerHTML = commOpts; });
  const { data: lines } = await sb.from(k + '_budget_line').select('*, budget_period(label), ' + k + '_item(name), comm:community_profile_id(name)').order(k + '_budget_line_id', { ascending: false });
  const ltbl = document.getElementById(k + '-ltbl');
  ltbl.innerHTML = lines?.length
    ? lines.map(l => {
        const src = l.budget_source === 'community'
          ? '<span class="badge bc">community: ' + (l.comm?.name || '') + '</span>'
          : '<span class="badge bp2">personal</span>';
        return '<tr><td>' + (l.budget_period?.label || '') + '</td><td>' + (l[k + '_item']?.name || '') + '</td><td>$' + Number(l.budgeted_amount).toFixed(2) + '</td><td>' + src + '</td><td><button class="btn bd" style="padding:3px 8px;font-size:.75rem" onclick="delLine(\'' + k + '\',\'' + l[k + '_budget_line_id'] + '\')" >Del</button></td></tr>';
      }).join('')
    : '<tr><td colspan=5 class="empty">None</td></tr>';
  const { data: txns } = await sb.from(k + '_transaction').select('*, budget_period(label), ' + k + '_item(name), comm:community_profile_id(name)').order('transaction_date', { ascending: false });
  const ttbl = document.getElementById(k + '-ttbl');
  ttbl.innerHTML = txns?.length
    ? txns.map(t => {
        const src = t.txn_source === 'community'
          ? '<span class="badge bc">community: ' + (t.comm?.name || '') + '</span>'
          : '<span class="badge bp2">personal</span>';
        return '<tr><td>' + t.transaction_date + '</td><td>' + (t[k + '_item']?.name || '') + '</td><td>$' + Number(t.amount).toFixed(2) + '</td><td>' + src + '</td><td><button class="btn bd" style="padding:3px 8px;font-size:.75rem" onclick="delTxn(\'' + k + '\',\'' + t[k + '_transaction_id'] + '\')" >Del</button></td></tr>';
      }).join('')
    : '<tr><td colspan=5 class="empty">None</td></tr>';
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
  const budget_source = document.getElementById(k + '-bsrc').value;
  const community_profile_id = document.getElementById(k + '-bcomm').value || null;
  if (!period_id || !item_id || isNaN(budgeted_amount)) return msg(k + '-lm', 'All fields required', 'e');
  if (budget_source === 'community' && !community_profile_id) return msg(k + '-lm', 'Select a community profile', 'e');
  const row = { period_id, [k + '_item_id']: item_id, budgeted_amount, budget_source, community_profile_id };
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
  const txn_source = document.getElementById(k + '-tsrc').value;
  const community_profile_id = document.getElementById(k + '-tcomm').value || null;
  if (!period_id || !item_id || !transaction_date || isNaN(amount)) return msg(k + '-tm', 'All fields required', 'e');
  if (txn_source === 'community' && !community_profile_id) return msg(k + '-tm', 'Select a community profile', 'e');
  const row = { period_id, [k + '_item_id']: item_id, transaction_date, amount, txn_source, community_profile_id };
  const { error } = await sb.from(k + '_transaction').insert(row);
  if (error) return msg(k + '-tm', error.message, 'e');
  msg(k + '-tm', 'Logged!', 's'); document.getElementById(k + '-txn-amt').value = '';
  await loadCat(k);
}
async function delTxn(k, id) {
  await sb.from(k + '_transaction').delete().eq(k + '_transaction_id', id);
  await loadCat(k);
}

// ---- DASHBOARD ----
async function onPC() {
  ST.pid = document.getElementById('gp').value;
  const p = ST.periods.find(x => x.period_id === ST.pid);
  document.getElementById('plbl').textContent = p ? p.label + ' (' + (p.budget_profile?.name || '') + ')' : 'No period selected';
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
