// server.js
const express = require('express');
const path = require('path');
const cors = require('cors');
const db = require('./db');

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const HOST = '0.0.0.0'; // importante para nuvem

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// API
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
    const { nome } = req.body || {};
    if (!nome || !nome.trim()) return res.status(400).json({ error: 'Nome é obrigatório' });
    const novo = await db.create(nome.trim());
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
    const { nome } = req.body || {};
    if (!nome || !nome.trim()) return res.status(400).json({ error: 'Nome é obrigatório' });
    const updated = await db.update(id, nome.trim());
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

// Sobe o servidor após init do banco
(async () => {
  try {
    await db.init();
    app.listen(PORT, HOST, () => console.log(`Servidor rodando na porta ${PORT}`));
  } catch (err) {
    console.error('Falha ao inicializar o banco:', err);
    process.exit(1);
  }
})();
