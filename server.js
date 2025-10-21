// server.js
const express = require('express');
const path = require('path');
const cors = require('cors');
const db = require('./db');

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const HOST = '0.0.0.0';

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

/* ----------------- Reset diário -----------------
   Guardamos a data do último reset na tabela meta.
   A cada minuto, se mudou o dia, zeramos "logado".
--------------------------------------------------*/
async function resetIfNewDay() {
  const today = new Date().toISOString().slice(0, 10); // AAAA-MM-DD (UTC)
  const last = await db.getMeta('last_reset');
  if (last !== today) {
    await db.bulkSet([]);                  // zera todos
    await db.setMeta('last_reset', today); // grava a data de hoje
    console.log('[RESET] Logins zerados para a data', today);
  }
}
setInterval(resetIfNewDay, 60 * 1000); // checa a cada 1 min

// ------------ API ------------
app.get('/api/collaboradores', async (req, res) => {
  try {
    const q = (req.query.q || '').toLowerCase();
    const list = await db.all();
    const filtered = q ? list.filter(c => (c.nome || '').toLowerCase().includes(q)) : list;
    res.json(filtered);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Falha ao listar colaboradores' });
  }
});

app.post('/api/collaboradores', async (req, res) => {
  try {
    const { nome, status } = req.body || {};
    if (!nome || !nome.trim()) return res.status(400).json({ error: 'Nome é obrigatório' });
    const novo = await db.create(nome.trim(), status || 'ativo');
    res.status(201).json(novo);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Falha ao criar colaborador' });
  }
});

app.put('/api/collaboradores/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: 'ID inválido' });

    const { nome, status } = req.body || {};
    if (!nome || !nome.trim()) return res.status(400).json({ error: 'Nome é obrigatório' });

    const updated = await db.update(id, nome.trim(), status || 'ativo');
    if (!updated) return res.status(404).json({ error: 'Colaborador não encontrado' });

    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Falha ao atualizar colaborador' });
  }
});

app.delete('/api/collaboradores/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: 'ID inválido' });
    await db.remove(id);
    res.status(204).end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Falha ao remover colaborador' });
  }
});

// salvar status (bulk)
app.post('/api/status', async (req, res) => {
  try {
    const { logados } = req.body || {};
    const ids = Array.isArray(logados) ? logados.map(Number).filter(Number.isFinite) : [];
    await db.bulkSet(ids);
    const total = await db.countLogados();
    res.json({ success: true, totalLogados: total });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Falha ao salvar status' });
  }
});

// operações de logado individuais
app.post('/api/logado/:id/:val', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: 'ID inválido' });
    const val = req.params.val === '1' || req.params.val === 'true';
    await db.setLogado(id, val);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Falha ao atualizar status' });
  }
});

app.get('/api/ativos', async (req, res) => {
  try {
    const total = await db.countLogados();
    const list = await db.listLogados();
    res.json({ total, list });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Falha ao listar ativos' });
  }
});

/* --------- Exportação (CSV/JSON) ----------
   /api/export?type=logados|nao&format=csv|json
--------------------------------------------*/
function toCSV(rows) {
  const header = ['id', 'nome', 'status', 'logado'];
  const escape = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
  return [header.join(','), ...rows.map(r => header.map(h => escape(r[h])).join(','))].join('\n');
}
app.get('/api/export', async (req, res) => {
  try {
    const type = (req.query.type || 'logados').toLowerCase(); // logados | nao
    const format = (req.query.format || 'csv').toLowerCase(); // csv | json
    const all = await db.all();
    const rows = type === 'nao' ? all.filter(r => !r.logado) : all.filter(r => !!r.logado);

    if (format === 'json') {
      res.setHeader('Content-Disposition', `attachment; filename="${type}-logados.json"`);
      return res.json(rows);
    }
    // CSV
    const csv = toCSV(rows);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${type}-logados.csv"`);
    res.send(csv);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Falha ao exportar' });
  }
});

// inicializa banco e sobe servidor
(async () => {
  try {
    await db.init();
    await resetIfNewDay(); // garante reset na subida
    app.listen(PORT, HOST, () => console.log(`Servidor rodando na porta ${PORT}`));
  } catch (err) {
    console.error('Falha ao inicializar o banco:', err);
    process.exit(1);
  }
})();
