// db.js — inicializa banco SQLite e expõe operações (versão para 'sqlite3')
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

// cria/abre o arquivo do banco na pasta do projeto
const db = new sqlite3.Database(path.join(__dirname, 'database.sqlite'));

// Helpers em Promise
const run = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) return reject(err);
      // 'this' tem lastID e changes
      resolve(this);
    });
  });

const getP = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) return reject(err);
      resolve(row);
    });
  });

const allP = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });

// cria tabela (se não existir)
const init = async () => {
  await run(`
    CREATE TABLE IF NOT EXISTS colaboradores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      logado INTEGER NOT NULL DEFAULT 0
    )
  `);
};

// consultas/crud
const all = () =>
  allP('SELECT * FROM colaboradores ORDER BY id DESC');

const get = (id) =>
  getP('SELECT * FROM colaboradores WHERE id = ?', [id]);

const create = async (nome) => {
  const info = await run(
    'INSERT INTO colaboradores (nome, logado) VALUES (?, 0)',
    [nome]
  );
  return get(info.lastID);
};

const update = async (id, nome) => {
  await run('UPDATE colaboradores SET nome = ? WHERE id = ?', [nome, id]);
  return get(id);
};

const remove = (id) =>
  run('DELETE FROM colaboradores WHERE id = ?', [id]);

const setLogado = (id, logado) =>
  run('UPDATE colaboradores SET logado = ? WHERE id = ?', [logado ? 1 : 0, id]);

const countLogados = async () => {
  const row = await getP('SELECT COUNT(*) AS c FROM colaboradores WHERE logado = 1');
  return row?.c ?? 0;
};

const listLogados = () =>
  allP('SELECT * FROM colaboradores WHERE logado = 1 ORDER BY id DESC');

const bulkSet = async (ids = []) => {
  // zera todos
  await run('UPDATE colaboradores SET logado = 0');
  // liga somente os informados
  for (const id of ids) {
    await run('UPDATE colaboradores SET logado = 1 WHERE id = ?', [id]);
  }
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
};

