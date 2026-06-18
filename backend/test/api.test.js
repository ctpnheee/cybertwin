import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it } from 'node:test';
import request from 'supertest';

import { createApp } from '../src/app.js';
import { sampleSeed, useTempDb } from './helpers.js';

const app = createApp();

describe('API CyberTwin', () => {
  let db;

  afterEach(() => {
    db?.cleanup();
  });

  describe('Santé', () => {
    beforeEach(() => {
      db = useTempDb();
    });

    it('GET /health renvoie ok', async () => {
      const res = await request(app).get('/health');
      assert.equal(res.status, 200);
      assert.deepEqual(res.body, { status: 'ok' });
    });

    it('GET / liste les endpoints', async () => {
      const res = await request(app).get('/');
      assert.equal(res.status, 200);
      assert.ok(res.body.endpoints.includes('POST /risk/calculate'));
    });

    it('renvoie 404 pour une route inconnue', async () => {
      const res = await request(app).get('/inconnu');
      assert.equal(res.status, 404);
      assert.match(res.body.error, /introuvable/);
    });
  });

  describe('Entreprise', () => {
    beforeEach(() => {
      db = useTempDb();
    });

    it("GET /company renvoie 404 quand l'entreprise n'existe pas", async () => {
      const res = await request(app).get('/company');
      assert.equal(res.status, 404);
    });

    it('POST /company crée puis GET /company la retourne', async () => {
      const payload = {
        name: 'BoulangePro SAS',
        sector: 'Agroalimentaire',
        employees: 85,
        servers: 6,
        clients: 70,
        exposedServices: ['Site e-commerce']
      };
      const created = await request(app).post('/company').send(payload);
      assert.equal(created.status, 201);
      assert.equal(created.body.name, 'BoulangePro SAS');
      assert.equal(created.body.id, 1);

      const fetched = await request(app).get('/company');
      assert.equal(fetched.status, 200);
      assert.equal(fetched.body.sector, 'Agroalimentaire');
    });

    it('POST /company rejette des données invalides (400)', async () => {
      const res = await request(app).post('/company').send({ name: '', employees: -3 });
      assert.equal(res.status, 400);
      assert.ok(res.body.details.length > 0);
    });

    it("PUT /company modifie partiellement l'entreprise", async () => {
      await request(app).post('/company').send({
        name: 'A',
        sector: 'X',
        employees: 1,
        servers: 1,
        clients: 1
      });
      const res = await request(app).put('/company').send({ employees: 50 });
      assert.equal(res.status, 200);
      assert.equal(res.body.employees, 50);
      assert.equal(res.body.name, 'A');
    });
  });

  describe('Actifs (CRUD)', () => {
    beforeEach(() => {
      db = useTempDb();
    });

    it('GET /assets renvoie un tableau vide au départ', async () => {
      const res = await request(app).get('/assets');
      assert.equal(res.status, 200);
      assert.deepEqual(res.body, []);
    });

    it('POST /assets ajoute un actif', async () => {
      const res = await request(app)
        .post('/assets')
        .send({ name: 'Routeur', type: 'Routeur', exposedToInternet: true });
      assert.equal(res.status, 201);
      assert.equal(res.body.id, 1);
      assert.equal(res.body.type, 'Routeur');
      assert.deepEqual(res.body.vulnerabilities, []);
    });

    it('POST /assets refuse un type invalide (400)', async () => {
      const res = await request(app).post('/assets').send({ name: 'X', type: 'Inconnu' });
      assert.equal(res.status, 400);
    });

    it('PUT /assets/:id modifie un actif', async () => {
      const created = await request(app)
        .post('/assets')
        .send({ name: 'Serveur', type: 'Serveur Web', exposedToInternet: true });
      const res = await request(app)
        .put(`/assets/${created.body.id}`)
        .send({ exposedToInternet: false });
      assert.equal(res.status, 200);
      assert.equal(res.body.exposedToInternet, false);
    });

    it('PUT /assets/:id renvoie 404 si introuvable', async () => {
      const res = await request(app).put('/assets/999').send({ name: 'Z' });
      assert.equal(res.status, 404);
    });

    it('DELETE /assets/:id supprime l\'actif et ses vulnérabilités', async () => {
      const asset = await request(app)
        .post('/assets')
        .send({ name: 'S', type: 'Serveur Web' });
      await request(app)
        .post('/vulnerabilities')
        .send({ assetId: asset.body.id, name: 'Port exposé', criticality: 'moyenne' });

      const del = await request(app).delete(`/assets/${asset.body.id}`);
      assert.equal(del.status, 204);

      const vulns = await request(app).get('/vulnerabilities');
      assert.deepEqual(vulns.body, []);
    });
  });

  describe('Vulnérabilités', () => {
    beforeEach(() => {
      db = useTempDb(sampleSeed());
    });

    it('GET /vulnerabilities liste les vulnérabilités', async () => {
      const res = await request(app).get('/vulnerabilities');
      assert.equal(res.status, 200);
      assert.equal(res.body.length, 1);
    });

    it('GET /vulnerabilities?assetId filtre par actif', async () => {
      const res = await request(app).get('/vulnerabilities?assetId=1');
      assert.equal(res.body.length, 1);
      const empty = await request(app).get('/vulnerabilities?assetId=999');
      assert.deepEqual(empty.body, []);
    });

    it('POST /vulnerabilities exige un actif existant (400)', async () => {
      const res = await request(app)
        .post('/vulnerabilities')
        .send({ assetId: 999, name: 'X', criticality: 'faible' });
      assert.equal(res.status, 400);
    });

    it('POST /vulnerabilities associe une vulnérabilité à un actif', async () => {
      const res = await request(app)
        .post('/vulnerabilities')
        .send({ assetId: 1, name: 'Mot de passe faible', criticality: 'moyenne' });
      assert.equal(res.status, 201);
      assert.equal(res.body.assetId, 1);
    });

    it('POST /vulnerabilities refuse une criticité invalide (400)', async () => {
      const res = await request(app)
        .post('/vulnerabilities')
        .send({ assetId: 1, name: 'X', criticality: 'critique' });
      assert.equal(res.status, 400);
    });
  });

  describe('Risque, dashboard et rapport', () => {
    beforeEach(() => {
      db = useTempDb(sampleSeed());
    });

    it('POST /risk/calculate renvoie un niveau et un score', async () => {
      const res = await request(app).post('/risk/calculate').send({});
      assert.equal(res.status, 200);
      assert.ok(['faible', 'moyen', 'élevé'].includes(res.body.level));
      assert.equal(typeof res.body.score, 'number');
      assert.ok(Array.isArray(res.body.recommendations));
    });

    it('POST /risk/calculate accepte un scénario simulé', async () => {
      const res = await request(app)
        .post('/risk/calculate')
        .send({ company: null, assets: [], vulnerabilities: [] });
      assert.equal(res.body.level, 'faible');
      assert.equal(res.body.score, 0);
    });

    it('GET /dashboard renvoie les statistiques agrégées', async () => {
      const res = await request(app).get('/dashboard');
      assert.equal(res.status, 200);
      assert.equal(res.body.totalAssets, 1);
      assert.equal(res.body.totalVulnerabilities, 1);
      assert.equal(res.body.assetsByType['Serveur Web'], 1);
      assert.equal(res.body.vulnerabilitiesByCriticality['élevée'], 1);
    });

    it('GET /report génère un rapport complet', async () => {
      const res = await request(app).get('/report');
      assert.equal(res.status, 200);
      assert.equal(res.body.company.name, 'Test SAS');
      assert.equal(res.body.assets.length, 1);
      assert.ok(res.body.risk.level);
      assert.ok(Array.isArray(res.body.recommendations));
    });

    it("GET /report renvoie 404 sans entreprise", async () => {
      db.cleanup();
      db = useTempDb();
      const res = await request(app).get('/report');
      assert.equal(res.status, 404);
    });
  });
});
