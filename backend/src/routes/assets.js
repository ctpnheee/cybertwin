import { Router } from 'express';
import { ASSET_TYPES } from '../constants.js';
import { nextId, readDb, writeDb } from '../db.js';
import { ApiError, isNonEmptyString, toBoolean } from '../utils.js';

const router = Router();

function validateAsset(body, { partial = false } = {}) {
  const errors = [];
  const has = (key) => Object.prototype.hasOwnProperty.call(body, key);

  if ((!partial || has('name')) && !isNonEmptyString(body.name)) {
    errors.push('name est requis (chaîne non vide).');
  }
  if ((!partial || has('type')) && !ASSET_TYPES.includes(body.type)) {
    errors.push(`type doit être l'une des valeurs : ${ASSET_TYPES.join(', ')}.`);
  }

  if (errors.length > 0) {
    throw new ApiError(400, 'Données actif invalides.', errors);
  }
}

function currentCompanyId(db) {
  const id = Number(db.currentCompanyId ?? db.company?.id);
  return Number.isInteger(id) ? id : null;
}

function scopedAssets(db) {
  const companyId = currentCompanyId(db);
  if (companyId === null) return db.assets;
  return db.assets.filter((asset) => asset.companyId === companyId);
}

function scopedVulnerabilities(db) {
  const assetIds = scopedAssets(db).map((asset) => asset.id);
  return db.vulnerabilities.filter((vulnerability) => assetIds.includes(vulnerability.assetId));
}

function withVulnerabilities(asset, vulnerabilities) {
  return {
    ...asset,
    vulnerabilities: vulnerabilities.filter((v) => v.assetId === asset.id)
  };
}

// GET /assets - liste des actifs de l'entreprise sélectionnée avec leurs vulnérabilités.
router.get('/', (req, res) => {
  const db = readDb();
  const vulnerabilities = scopedVulnerabilities(db);
  const assets = scopedAssets(db).map((asset) => withVulnerabilities(asset, vulnerabilities));
  res.json(assets);
});

// GET /assets/:id - détail d'un actif de l'entreprise sélectionnée.
router.get('/:id', (req, res) => {
  const db = readDb();
  const id = Number(req.params.id);
  const asset = scopedAssets(db).find((a) => a.id === id);

  if (!asset) {
    throw new ApiError(404, `Actif ${id} introuvable.`);
  }

  res.json(withVulnerabilities(asset, scopedVulnerabilities(db)));
});

// POST /assets - ajouter un actif à l'entreprise sélectionnée.
router.post('/', (req, res) => {
  const db = readDb();

  validateAsset(req.body, { partial: false });

  const now = new Date().toISOString();
  const asset = {
    id: nextId(db, 'asset'),
    companyId: currentCompanyId(db),
    name: req.body.name.trim(),
    type: req.body.type,
    exposedToInternet: toBoolean(req.body.exposedToInternet),
    createdAt: now,
    updatedAt: now
  };

  db.assets.push(asset);
  writeDb(db);

  res.status(201).json(withVulnerabilities(asset, scopedVulnerabilities(db)));
});

// PUT /assets/:id - modifier un actif de l'entreprise sélectionnée.
router.put('/:id', (req, res) => {
  const db = readDb();
  const id = Number(req.params.id);
  const allowedIds = scopedAssets(db).map((asset) => asset.id);
  const asset = db.assets.find((a) => a.id === id && allowedIds.includes(a.id));

  if (!asset) {
    throw new ApiError(404, `Actif ${id} introuvable.`);
  }

  validateAsset(req.body, { partial: true });

  const has = (key) => Object.prototype.hasOwnProperty.call(req.body, key);

  if (has('name')) asset.name = req.body.name.trim();
  if (has('type')) asset.type = req.body.type;
  if (has('exposedToInternet')) asset.exposedToInternet = toBoolean(req.body.exposedToInternet);

  asset.updatedAt = new Date().toISOString();

  writeDb(db);

  res.json(withVulnerabilities(asset, scopedVulnerabilities(db)));
});

// DELETE /assets/:id - supprimer un actif et ses vulnérabilités associées.
router.delete('/:id', (req, res) => {
  const db = readDb();
  const id = Number(req.params.id);
  const allowedIds = scopedAssets(db).map((asset) => asset.id);
  const index = db.assets.findIndex((a) => a.id === id && allowedIds.includes(a.id));

  if (index === -1) {
    throw new ApiError(404, `Actif ${id} introuvable.`);
  }

  db.assets.splice(index, 1);
  db.vulnerabilities = db.vulnerabilities.filter((v) => v.assetId !== id);

  writeDb(db);

  res.status(204).end();
});

export default router;