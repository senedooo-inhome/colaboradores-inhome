// db.js — SQLite com status + meta + caminho /data no Render
const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();

const defaultLocal = path.join(__dirname, 'database.sqlite');
const DB_PATH = process.env.DB_PATH || (fs.existsSync('/data') ? '/data/database.sqlite' : defaultLocal);
const db = new sqlite3.Database(DB_PATH);

// helpers
const run = (sql, params = []) => new Promise((res, rej) => db.run(sql, params, function (e){ e?rej(e):res(this); }));
const getP = (sql, params = []) => new Promise((res, rej) => db.get(sql, params, (e, row)=> e?rej(e):res(row)));
const allP = (sql, params = []) => new Promise((res, rej) => db.all(sql, params, (e, rows)=> e?rej(e):res(rows)));

const ensureStatusColumn = async () => {
  const cols = await allP(`PRAGMA table_info(colaboradores)`);
  if (!cols.find(c => c.name === 'status')) {
    await run(`ALTER TABLE colaboradores ADD COLUMN status TEXT NOT NULL DEFAULT 'ativo'`);
  }
};

const init = async () => {
  await run('PRAGMA busy_timeout = 3000');
  await run(`
    CREATE TABLE IF NOT EXISTS colaboradores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      logado INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'ativo'
    )
  `);
  await ensureStatusColumn();
  await run(`
    CREATE TABLE IF NOT EXISTS meta (
      key TEXT PRIMARY KEY,
      val TEXT
    )
  `);
};

const getMeta = async (key) => {
  const r = await getP('SELECT val FROM meta WHERE key = ?', [key]);
  return r?.val ?? null;
};
const setMeta = async (key, val) => {
  await run('INSERT INTO meta(key,val) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET val=excluded.val', [key, val]);
};

const all = () => allP('SELECT * FROM colaboradores ORDER BY id DESC');
const get = (id) => getP('SELECT * FROM colaboradores WHERE id = ?', [id]);

const create = async (nome, status = 'ativo') => {
  const info = await run('INSERT INTO colaboradores (nome, logado, status) VALUES (?, 0, ?)', [nome, status]);
  return get(info.lastID);
};

const update = async (id, nome, status = 'ativo') => {
  await run('UPDATE colaboradores SET nome = ?, status = ? WHERE id = ?', [nome, status, id]);
  return get(id);
};

const remove = (id) => run('DELETE FROM colaboradores WHERE id = ?', [id]);

const setLogado = (id, logado) =>
  run('UPDATE colaboradores SET logado = ? WHERE id = ?', [logado ? 1 : 0, id]);

const countLogados = async () => {
  const row = await getP('SELECT COUNT(*) AS c FROM colaboradores WHERE logado = 1');
  return row?.c ?? 0;
};

const listLogados = () => allP('SELECT * FROM colaboradores WHERE logado = 1 ORDER BY id DESC');

const bulkSet = async (ids = []) => {
  await run('UPDATE colaboradores SET logado = 0');
  for (const id of ids) await run('UPDATE colaboradores SET logado = 1 WHERE id = ?', [id]);
};

module.exports = {
  init,
  all,
  get,
  create,
  update,
  remove,
  setLogado,
  countLogados,
  listLogados,
  bulkSet,
  getMeta,
  setMeta,
};
