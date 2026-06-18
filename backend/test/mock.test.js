import assert from 'node:assert/strict';
import { beforeEach, describe, it, mock } from 'node:test';

// Ces tests remplacent complètement la couche de données (`src/db.js`) par des
// mocks : aucun accès au système de fichiers. On vérifie ainsi le comportement
// des routes de façon isolée et on espionne les appels (spies).
//
// Le mock est installé une seule fois (le module `app.js` est mis en cache après
// le premier import). On contrôle ensuite le comportement via un store mutable.
//
// Nécessite l'option `--experimental-test-module-mocks` (cf. script `test`).

const dbUrl = new URL('../src/db.js', import.meta.url).href;

let store;
let nextIdValue = 1;

const readDb = mock.fn(() => store);
const writeDb = mock.fn((data) => {
  store = data;
  return data;
});
const nextId = mock.fn(() => nextIdValue);

mock.module(dbUrl, { namedExports: { readDb, writeDb, nextId } });

const { createApp } = await import('../src/app.js');
const request = (await import('supertest')).default;
const app = createApp();

function emptyStore() {
  return {
    company: null,
    assets: [],
    vulnerabilities: [],
    counters: { asset: 0, vulnerability: 0 }
  };
}

describe('Routes avec couche de données mockée', () => {
  beforeEach(() => {
    store = emptyStore();
    nextIdValue = 1;
    readDb.mock.resetCalls();
    writeDb.mock.resetCalls();
    nextId.mock.resetCalls();
  });

  it('GET /dashboard utilise les données renvoyées par readDb (stub)', async () => {
    store = {
      company: { exposedServices: [] },
      assets: [
        { id: 1, type: 'Routeur', exposedToInternet: false },
        { id: 2, type: 'Routeur', exposedToInternet: true }
      ],
      vulnerabilities: [{ id: 1, assetId: 2, name: 'X', criticality: 'moyenne' }],
      counters: { asset: 2, vulnerability: 1 }
    };

    const res = await request(app).get('/dashboard');

    assert.equal(res.status, 200);
    assert.equal(res.body.totalAssets, 2);
    assert.equal(res.body.assetsByType.Routeur, 2);
    assert.equal(res.body.exposedAssets, 1);
    assert.equal(res.body.vulnerabilitiesByCriticality.moyenne, 1);
    assert.ok(readDb.mock.callCount() >= 1);
  });

  it('POST /assets appelle writeDb avec le nouvel actif (spy)', async () => {
    nextIdValue = 42;

    const res = await request(app)
      .post('/assets')
      .send({ name: 'Pare-feu', type: 'Pare-feu', exposedToInternet: true });

    assert.equal(res.status, 201);
    assert.equal(res.body.id, 42);

    assert.equal(writeDb.mock.callCount(), 1);
    const savedData = writeDb.mock.calls[0].arguments[0];
    assert.equal(savedData.assets.length, 1);
    assert.equal(savedData.assets[0].name, 'Pare-feu');
    assert.equal(nextId.mock.callCount(), 1);
  });

  it('renvoie 500 si la couche de données échoue', async () => {
    readDb.mock.mockImplementationOnce(() => {
      throw new Error('panne disque simulée');
    });

    const res = await request(app).get('/assets');
    assert.equal(res.status, 500);
    assert.match(res.body.error, /interne/i);
  });
});
