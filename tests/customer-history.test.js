const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const auth = require('../auth');

function carica(file, overrides, env = {}) {
  const sandbox = {
    module: { exports: {} }, __dirname: path.join(__dirname, '..'), Buffer,
    require: name => Object.hasOwn(overrides, name) ? overrides[name] : require(name),
    process: { env }, console: { log() {}, error() {} }
  };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), sandbox);
  return sandbox.module.exports;
}

test('lo storico locale distingue omonimi tramite ID e non scrive alcun dato', async () => {
  const archivio = JSON.stringify({
    clienti: [{ id: 'c1', nome: 'Anna' }, { id: 'c2', nome: 'Anna' }],
    appuntamenti: [
      { id: 'a1', clienteId: 'c1', data: '2026-01-01', operatoreId: 'o1' },
      { id: 'a2', clienteId: 'c2', data: '2026-01-01', operatoreId: 'o1' },
      { id: 'a3', clienteId: 'c1', data: '2027-01-01', operatoreId: 'o2' }
    ], utenti: [], reimpostazioni: [], passwordMaster: 'hash'
  });
  const fakeFs = {
    existsSync: () => true, readFileSync: () => archivio,
    writeFileSync() { assert.fail('La consultazione ha tentato una scrittura'); },
    mkdirSync() { assert.fail('La consultazione ha tentato una creazione'); }
  };
  const { db } = carica('database.js', { fs: fakeFs, './auth': auth });
  assert.equal((await db.getAppuntamenti()).length, 3);
  assert.deepEqual(Array.from(await db.getAppuntamenti({ clienteId: 'c1' }), a => a.id), ['a1', 'a3']);
  assert.deepEqual(Array.from(await db.getAppuntamenti({ clienteId: 'c1', data: '2027-01-01', operatoreId: 'o2' }), a => a.id), ['a3']);
  assert.equal((await db.getAppuntamenti({ clienteId: 'assente' })).length, 0);
});

test('lo storico PostgreSQL usa parametri e conserva i filtri data/operatore esistenti', async () => {
  const queries = [];
  class Pool {
    async query(sql, values) { queries.push({ sql, values }); return { rows: [], rowCount: 0 }; }
  }
  const { db, connectPostgreSQL } = carica('database.js', { pg: { Pool }, './auth': auth }, { DATABASE_URL: 'postgres://simulato' });
  await connectPostgreSQL();
  queries.length = 0;
  const id = "c1' OR '1'='1";
  await db.getAppuntamenti({ clienteId: id });
  assert.equal(queries[0].sql, 'SELECT * FROM appuntamenti WHERE "clienteId" = $1 ORDER BY data, ora');
  assert.deepEqual(Array.from(queries[0].values), [id]);
  await db.getAppuntamenti({ data: '2026-11-03', operatoreId: 'o1', clienteId: 'c1' });
  assert.equal(queries[1].sql, 'SELECT * FROM appuntamenti WHERE data = $1 AND "operatoreId" = $2 AND "clienteId" = $3 ORDER BY data, ora');
  assert.deepEqual(Array.from(queries[1].values), ['2026-11-03', 'o1', 'c1']);
  await db.getAppuntamenti({ data: '2026-11-03' });
  assert.equal(queries[2].sql, 'SELECT * FROM appuntamenti WHERE data = $1 ORDER BY data, ora');
  assert(queries.every(q => q.sql.startsWith('SELECT ')));
});

test('la route GET inoltra l’ID cliente senza chiamare operazioni di scrittura', async () => {
  const routes = new Map();
  let filtro;
  const app = { use() {}, listen() {} };
  for (const method of ['get', 'post', 'put', 'delete']) app[method] = (url, fn) => routes.set(`${method} ${url}`, fn);
  const express = Object.assign(() => app, { static() {}, json() {} });
  carica('server.js', {
    express, cors: () => {}, './auth': auth, './whatsapp': {}, './email': {},
    './database': { connectPostgreSQL: () => new Promise(() => {}), db: {
      async getAppuntamenti(value) { filtro = value; return [{ id: 'a1', clienteId: 'c1' }]; }
    } }
  });
  let risultato;
  await routes.get('get /api/appuntamenti')({ query: { clienteId: 'c1', data: '2026-11-03', operatore: 'o1' } }, { json(value) { risultato = value; } });
  assert.deepEqual(JSON.parse(JSON.stringify(filtro)), { data: '2026-11-03', operatoreId: 'o1', clienteId: 'c1' });
  assert.equal(risultato[0].id, 'a1');
});
