// app.js - frontend simples usando Fetch
const api = (path, opts) =>
  fetch(path, { headers: { 'Content-Type': 'application/json' }, ...opts })
    .then(r => r.json().catch(() => {}));

// UI refs
const views = document.querySelectorAll('.view');
const navBtns = document.querySelectorAll('.nav-btn');
const pageTitle = document.getElementById('page-title');

// === Data do dia (mostra no cabeçalho) ===
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

/* ---------- Navegação ---------- */
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

/* ---------- Modal (abrir/fechar) ---------- */
function openModal(title = 'Adicionar Colaborador', value = '') {
  modalTitle.innerText = title;
  modalInput.value = value;
  overlay.classList.remove('hidden');
  modal.classList.remove('hidden');
  setTimeout(() => modalInput.focus(), 0);
}

function closeModal() {
  overlay.classList.add('hidden');
  modal.classList.add('hidden');
  modalInput.value = '';
  editingId = null;
}

// Ações do modal
btnAdd.addEventListener('click', () => openModal('Adicionar Colaborador', ''));
btnCancel.addEventListener('click', closeModal);
overlay.addEventListener('click', closeModal);
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !modal.classList.contains('hidden')) closeModal();
});

// Salvar (create/update)
btnSave.addEventListener('click', async () => {
  const nome = (modalInput.value || '').trim();
  if (!nome) return alert('Digite um nome');

  try {
    if (editingId) {
      await api(`/api/collaboradores/${editingId}`, { method: 'PUT', body: JSON.stringify({ nome }) });
    } else {
      await api('/api/collaboradores', { method: 'POST', body: JSON.stringify({ nome }) });
    }
    closeModal();
    loadList(); loadControle(); loadOperacao();
  } catch (err) {
    console.error(err);
    alert('Erro ao salvar colaborador');
  }
});

/* ---------- Busca (debounce) ---------- */
let searchTimeout;
searchInput.addEventListener('input', () => {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(loadList, 250);
});

/* ---------- Lista de colaboradores ---------- */
async function loadList() {
  const q = searchInput.value || '';
  const list = await api(`/api/collaboradores?q=${encodeURIComponent(q)}`) || [];
  tableBody.innerHTML = list.map(c => `
    <tr data-id="${c.id}">
      <td>${escapeHtml(c.nome)}</td>
      <td>${c.logado ? '<span class="status-pill">Logado</span>' : ''}</td>
      <td>
        <button class="btn" data-action="edit">✏️</button>
        <button class="btn btn-red" data-action="delete">🗑️</button>
      </td>
    </tr>
  `).join('');

  // actions
  tableBody.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', async (ev) => {
      const tr = ev.target.closest('tr');
      const id = tr.dataset.id;
      const act = ev.target.dataset.action;

      if (act === 'edit') {
        editingId = id;
        const currentName = tr.cells[0].innerText.trim();
        openModal('Editar Colaborador', currentName);
      } else if (act === 'delete') {
        if (!confirm('Remover colaborador?')) return;
        await fetch(`/api/collaboradores/${id}`, { method: 'DELETE' });
        loadList(); loadControle(); loadOperacao();
      }
    });
  });
}

/* ---------- Controle (checkbox list) ---------- */
async function loadControle() {
  const list = await api('/api/collaboradores') || [];
  controleList.innerHTML = list.map(c => `
    <div class="controle-item">
      <label><input type="checkbox" data-id="${c.id}" ${c.logado ? 'checked' : ''}/> ${escapeHtml(c.nome)}</label>
      <div>${c.logado ? '<span class="status-pill">Logado</span>' : ''}</div>
    </div>
  `).join('');
}

/* ---------- Salvar status ---------- */
saveStatusBtn.addEventListener('click', async () => {
  const checked = [...controleList.querySelectorAll('input[type=checkbox]:checked')].map(i => i.dataset.id);
  await api('/api/status', { method: 'POST', body: JSON.stringify({ logados: checked }) });
  alert('Status salvo');
  loadOperacao(); loadList();
});

/* ---------- Operação ativa ---------- */
async function loadOperacao() {
  const res = await api('/api/ativos') || { total: 0, list: [] };
  totalLogadosEl.innerText = res.total || 0;
  ativosList.innerHTML = (res.list || []).map(c => `
    <div class="ativo">
      <div><span style="color:green">●</span> ${escapeHtml(c.nome)}</div>
      <div><button class="btn btn-red" data-id="${c.id}" data-action="logout">Deslogar</button></div>
    </div>
  `).join('');

  ativosList.querySelectorAll('button[data-action=logout]').forEach(b => b.addEventListener('click', async (ev) => {
    const id = ev.target.dataset.id;
    await api(`/api/logado/${id}/0`, { method: 'POST' });
    loadOperacao(); loadControle(); loadList();
  }));
}

refreshOperacaoBtn.addEventListener('click', loadOperacao);

/* ---------- Helpers ---------- */
function escapeHtml(s) {
  return s ? s.replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m])) : '';
}

/* ---------- Initial load ---------- */
loadList(); // view padrão = colaboradores
