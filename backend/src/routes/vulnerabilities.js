import { Router } from 'express';
import { CRITICALITY_LEVELS } from '../constants.js';
import { nextId, readDb, writeDb } from '../db.js';
import { ApiError, isNonEmptyString } from '../utils.js';

const router = Router();

function validateVulnerability(body, db, { partial = false } = {}) {
  const errors = [];
  const has = (key) => Object.prototype.hasOwnProperty.call(body, key);

  if ((!partial || has('name')) && !isNonEmptyString(body.name)) {
    errors.push('name est requis (chaîne non vide).');
  }
  if ((!partial || has('criticality')) && !CRITICALITY_LEVELS.includes(body.criticality)) {
    errors.push(`criticality doit être l'une des valeurs : ${CRITICALITY_LEVELS.join(', ')}.`);
  }
  if (!partial || has('assetId')) {
    const assetId = Number(body.assetId);
    if (!Number.isInteger(assetId) || !db.assets.some((a) => a.id === assetId)) {
      errors.push('assetId doit référencer un actif existant.');
    }
  }

  if (errors.length > 0) {
    throw new ApiError(400, 'Données vulnérabilité invalides.', errors);
  }
}

// GET /vulnerabilities - liste de toutes les vulnérabilités (filtre ?assetId optionnel)
router.get('/', (req, res) => {
  const db = readDb();
  let result = db.vulnerabilities;
  if (req.query.assetId !== undefined) {
    const assetId = Number(req.query.assetId);
    result = result.filter((v) => v.assetId === assetId);
  }
  res.json(result);
});

// GET /vulnerabilities/:id - détail d'une vulnérabilité
router.get('/:id', (req, res) => {
  const db = readDb();
  const id = Number(req.params.id);
  const vuln = db.vulnerabilities.find((v) => v.id === id);
  if (!vuln) {
    throw new ApiError(404, `Vulnérabilité ${id} introuvable.`);
  }
  res.json(vuln);
});

// POST /vulnerabilities - associer une vulnérabilité à un actif
router.post('/', (req, res) => {
  const db = readDb();
  validateVulnerability(req.body, db, { partial: false });
  const now = new Date().toISOString();
  const vuln = {
    id: nextId(db, 'vulnerability'),
    assetId: Number(req.body.assetId),
    name: req.body.name.trim(),
    criticality: req.body.criticality,
    description: isNonEmptyString(req.body.description) ? req.body.description.trim() : '',
    createdAt: now,
    updatedAt: now
  };
  db.vulnerabilities.push(vuln);
  writeDb(db);
  res.status(201).json(vuln);
});

// PUT /vulnerabilities/:id - modifier une vulnérabilité
router.put('/:id', (req, res) => {
  const db = readDb();
  const id = Number(req.params.id);
  const vuln = db.vulnerabilities.find((v) => v.id === id);
  if (!vuln) {
    throw new ApiError(404, `Vulnérabilité ${id} introuvable.`);
  }
  validateVulnerability(req.body, db, { partial: true });
  const has = (key) => Object.prototype.hasOwnProperty.call(req.body, key);

  if (has('name')) vuln.name = req.body.name.trim();
  if (has('criticality')) vuln.criticality = req.body.criticality;
  if (has('assetId')) vuln.assetId = Number(req.body.assetId);
  if (has('description')) {
    vuln.description = isNonEmptyString(req.body.description) ? req.body.description.trim() : '';
  }
  vuln.updatedAt = new Date().toISOString();

  writeDb(db);
  res.json(vuln);
});

// DELETE /vulnerabilities/:id - supprimer une vulnérabilité
router.delete('/:id', (req, res) => {
  const db = readDb();
  const id = Number(req.params.id);
  const index = db.vulnerabilities.findIndex((v) => v.id === id);
  if (index === -1) {
    throw new ApiError(404, `Vulnérabilité ${id} introuvable.`);
  }
  db.vulnerabilities.splice(index, 1);
  writeDb(db);
  res.status(204).end();
});

export default router;
