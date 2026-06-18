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

function withVulnerabilities(asset, vulnerabilities) {
  return {
    ...asset,
    vulnerabilities: vulnerabilities.filter((v) => v.assetId === asset.id)
  };
}

// GET /assets - liste des actifs (avec leurs vulnérabilités)
router.get('/', (req, res) => {
  const db = readDb();
  const assets = db.assets.map((asset) => withVulnerabilities(asset, db.vulnerabilities));
  res.json(assets);
});

// GET /assets/:id - détail d'un actif
router.get('/:id', (req, res) => {
  const db = readDb();
  const id = Number(req.params.id);
  const asset = db.assets.find((a) => a.id === id);
  if (!asset) {
    throw new ApiError(404, `Actif ${id} introuvable.`);
  }
  res.json(withVulnerabilities(asset, db.vulnerabilities));
});

// POST /assets - ajouter un actif
router.post('/', (req, res) => {
  const db = readDb();
  validateAsset(req.body, { partial: false });
  const now = new Date().toISOString();
  const asset = {
    id: nextId(db, 'asset'),
    name: req.body.name.trim(),
    type: req.body.type,
    exposedToInternet: toBoolean(req.body.exposedToInternet),
    createdAt: now,
    updatedAt: now
  };
  db.assets.push(asset);
  writeDb(db);
  res.status(201).json(withVulnerabilities(asset, db.vulnerabilities));
});

// PUT /assets/:id - modifier un actif
router.put('/:id', (req, res) => {
  const db = readDb();
  const id = Number(req.params.id);
  const asset = db.assets.find((a) => a.id === id);
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
  res.json(withVulnerabilities(asset, db.vulnerabilities));
});

// DELETE /assets/:id - supprimer un actif (et ses vulnérabilités associées)
router.delete('/:id', (req, res) => {
  const db = readDb();
  const id = Number(req.params.id);
  const index = db.assets.findIndex((a) => a.id === id);
  if (index === -1) {
    throw new ApiError(404, `Actif ${id} introuvable.`);
  }
  db.assets.splice(index, 1);
  db.vulnerabilities = db.vulnerabilities.filter((v) => v.assetId !== id);
  writeDb(db);
  res.status(204).end();
});

export default router;
