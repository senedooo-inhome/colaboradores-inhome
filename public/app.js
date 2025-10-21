// app.js - frontend
const api = (path, opts) =>
  fetch(path, { headers: { 'Content-Type': 'application/json' }, ...opts })
    .then(r => r.json().catch(() => {}));

const views = document.querySelectorAll('.view');
const navBtns = document.querySelectorAll('.nav-btn');
const pageTitle = document.getElementById('page-title');

// Data do dia
const dataHojeEl = document.getElementById('data-hoje');
function formatarData(d){
  const dias=['Domingo','Segunda-feira','Terça-feira','Quarta-feira','Quinta-feira','Sexta-feira','Sábado'];
  const meses=['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
  return `${dias[d.getDay()]}, ${d.getDate()} de ${meses[d.getMonth()]} de ${d.getFullYear()}`;
}
if (dataHojeEl) dataHojeEl.textContent = `📅 ${formatarData(new Date())}`;

const overlay = document.getElementById('overlay');
const modal = document.getElementById('modal');
const modalInput = document.getElementById('modal-input');
const modalStatus = document.getElementById('modal-status');
const modalTitle = document.getElementById('modal-title');
const btnAdd = document.getElementById('btn-add');
const btnCancel = document.getElementById('modal-cancel');
const btnSave = document.getElementById('modal-save');
let editingId = null;

const tableBody = document.querySelector('#table tbody');
const searchInput = document.getElementById('search');

const controleList = document.getElementById('controle-list');
const saveStatusBtn = document.getElementById('save-status');

const totalLogadosEl = document.getElementById('total-logados');
const ativosList = document.getElementById('ativos-list');
const refreshOperacaoBtn = document.getElementById('refresh-operacao');

navBtns.forEach(b => b.addEventListener('click', () => {
  navBtns.forEach(x => x.classList.remove('active'));
  b.classList.add('active');
  views.forEach(v => v.classList.add('hidden'));
  document.getElementById(b.dataset.view).classList.remove('hidden');
  pageTitle.innerText = b.innerText.trim();
  if (b.dataset.view === 'colaboradores') loadList();
  if (b.dataset.view === 'controle') loadControle();
  if (b.dataset.view === 'operacao') loadOperacao();
}));

function openModal(title = 'Adicionar Colaborador', value = '', status = 'ativo') {
  modalTitle.innerText = title;
  modalInput.value = value;
  modalStatus.value = status;
  overlay.classList.remove('hidden');
  modal.classList.remove('hidden');
  setTimeout(() => modalInput.focus(), 0);
}
function closeModal() {
  overlay.classList.add('hidden');
  modal.classList.add('hidden');
  modalInput.value = '';
  modalStatus.value = 'ativo';
  editingId = null;
}
btnAdd.addEventListener('click', () => openModal('Adicionar Colaborador', '', 'ativo'));
btnCancel.addEventListener('click', closeModal);
overlay.addEventListener('click', closeModal);
window.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !modal.classList.contains('hidden')) closeModal(); });

btnSave.addEventListener('click', async () => {
  const nome = (modalInput.value || '').trim();
  const status = modalStatus.value || 'ativo';
  if (!nome) return alert('Digite um nome');

  try {
    if (editingId) {
      await api(`/api/collaboradores/${editingId}`, { method: 'PUT', body: JSON.stringify({ nome, status }) });
    } else {
      await api('/api/collaboradores', { method: 'POST', body: JSON.stringify({ nome, status }) });
    }
    closeModal();
    loadList(); loadControle(); loadOperacao();
  } catch (err) {
    console.error(err);
    alert('Erro ao salvar colaborador');
  }
});

let searchTimeout;
searchInput.addEventListener('input', () => {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(loadList, 250);
});

function badgeStatus(s) {
  const map = { ativo: 'badge-ativo', ferias: 'badge-ferias', atestado: 'badge-atestado' };
  const cls = map[s] || 'badge-ativo';
  const label = s === 'ferias' ? 'Férias' : s === 'atestado' ? 'Atestado' : 'Ativo';
  return `<span class="badge ${cls}">${label}</span>`;
}

async function loadList() {
  const q = searchInput.value || '';
  const list = await api(`/api/collaboradores?q=${encodeURIComponent(q)}`) || [];
  tableBody.innerHTML = list.map(c => `
    <tr data-id="${c.id}" data-status="${c.status}">
      <td>${escapeHtml(c.nome)}</td>
      <td>${badgeStatus(c.status)}</td>
      <td>${c.logado ? '<span class="status-pill">Logado</span>' : ''}</td>
      <td>
        <button class="btn" data-action="edit">✏️</button>
        <button class="btn btn-red" data-action="delete">🗑️</button>
      </td>
    </tr>
  `).join('');

  tableBody.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', async (ev) => {
      const tr = ev.target.closest('tr');
      const id = tr.dataset.id;
      const act = ev.target.dataset.action;
      if (act === 'edit') {
        editingId = id;
        openModal('Editar Colaborador', tr.cells[0].innerText.trim(), tr.dataset.status);
      } else if (act === 'delete') {
        if (!confirm('Remover colaborador?')) return;
        await fetch(`/api/collaboradores/${id}`, { method: 'DELETE' });
        loadList(); loadControle(); loadOperacao();
      }
    });
  });
}

async function loadControle() {
  const list = await api('/api/collaboradores') || [];
  controleList.innerHTML = list.map(c => `
    <div class="controle-item">
      <label>
        <input type="checkbox" data-id="${c.id}" ${c.logado ? 'checked' : ''}/>
        ${escapeHtml(c.nome)} ${badgeStatus(c.status)}
      </label>
      <div>${c.logado ? '<span class="status-pill">Logado</span>' : ''}</div>
    </div>
  `).join('');
}

saveStatusBtn.addEventListener('click', async () => {
  const checked = [...controleList.querySelectorAll('input[type=checkbox]:checked')].map(i => i.dataset.id);
  await api('/api/status', { method: 'POST', body: JSON.stringify({ logados: checked }) });
  alert('Status salvo');
  loadOperacao(); loadList();
});

async function loadOperacao() {
  const res = await api('/api/ativos') || { total: 0, list: [] };
  totalLogadosEl.innerText = res.total || 0;
  ativosList.innerHTML = (res.list || []).map(c => `
    <div class="ativo">
      <div><span style="color:green">●</span> ${escapeHtml(c.nome)} ${badgeStatus(c.status)}</div>
      <div><button class="btn btn-red" data-id="${c.id}" data-action="logout">Deslogar</button></div>
    </div>
  `).join('');
  ativosList.querySelectorAll('button[data-action=logout]').forEach(b => b.addEventListener('click', async (ev) => {
    const id = ev.target.dataset.id;
    await api(`/api/logado/${id}/0`, { method:'POST' });
    loadOperacao(); loadControle(); loadList();
  }));
}
refreshOperacaoBtn.addEventListener('click', loadOperacao);

function escapeHtml(s){ return s ? s.replace(/[&<>"']/g, (m)=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m])) : ''; }
loadList();
