import { Router } from 'express';
import { CRITICALITY_LEVELS } from '../constants.js';
import { nextId, readDb, writeDb } from '../db.js';
import { ApiError, isNonEmptyString } from '../utils.js';

const router = Router();

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

function validateVulnerability(body, db, { partial = false } = {}) {
  const errors = [];
  const has = (key) => Object.prototype.hasOwnProperty.call(body, key);
  const assets = scopedAssets(db);

  if ((!partial || has('name')) && !isNonEmptyString(body.name)) {
    errors.push('name est requis (chaîne non vide).');
  }
  if ((!partial || has('criticality')) && !CRITICALITY_LEVELS.includes(body.criticality)) {
    errors.push(`criticality doit être l'une des valeurs : ${CRITICALITY_LEVELS.join(', ')}.`);
  }
  if (!partial || has('assetId')) {
    const assetId = Number(body.assetId);
    if (!Number.isInteger(assetId) || !assets.some((a) => a.id === assetId)) {
      errors.push('assetId doit référencer un actif existant dans l’entreprise sélectionnée.');
    }
  }

  if (errors.length > 0) {
    throw new ApiError(400, 'Données vulnérabilité invalides.', errors);
  }
}

// GET /vulnerabilities - liste des vulnérabilités de l'entreprise sélectionnée (filtre ?assetId optionnel)
router.get('/', (req, res) => {
  const db = readDb();
  let result = scopedVulnerabilities(db);

  if (req.query.assetId !== undefined) {
    const assetId = Number(req.query.assetId);
    result = result.filter((v) => v.assetId === assetId);
  }

  res.json(result);
});

// GET /vulnerabilities/:id - détail d'une vulnérabilité de l'entreprise sélectionnée
router.get('/:id', (req, res) => {
  const db = readDb();
  const id = Number(req.params.id);
  const vuln = scopedVulnerabilities(db).find((v) => v.id === id);

  if (!vuln) {
    throw new ApiError(404, `Vulnérabilité ${id} introuvable.`);
  }

  res.json(vuln);
});

// POST /vulnerabilities - associer une vulnérabilité à un actif de l'entreprise sélectionnée
router.post('/', (req, res) => {
  const db = readDb();

  validateVulnerability(req.body, db, { partial: false });

  const now = new Date().toISOString();
  const assetId = Number(req.body.assetId);
  const asset = scopedAssets(db).find((item) => item.id === assetId);

  const vuln = {
    id: nextId(db, 'vulnerability'),
    companyId: asset?.companyId ?? currentCompanyId(db),
    assetId,
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

// PUT /vulnerabilities/:id - modifier une vulnérabilité de l'entreprise sélectionnée
router.put('/:id', (req, res) => {
  const db = readDb();
  const id = Number(req.params.id);
  const allowedIds = scopedVulnerabilities(db).map((v) => v.id);
  const vuln = db.vulnerabilities.find((v) => v.id === id && allowedIds.includes(v.id));

  if (!vuln) {
    throw new ApiError(404, `Vulnérabilité ${id} introuvable.`);
  }

  validateVulnerability(req.body, db, { partial: true });

  const has = (key) => Object.prototype.hasOwnProperty.call(req.body, key);

  if (has('name')) vuln.name = req.body.name.trim();
  if (has('criticality')) vuln.criticality = req.body.criticality;

  if (has('assetId')) {
    const assetId = Number(req.body.assetId);
    const asset = scopedAssets(db).find((item) => item.id === assetId);

    vuln.assetId = assetId;
    vuln.companyId = asset?.companyId ?? currentCompanyId(db);
  }

  if (has('description')) {
    vuln.description = isNonEmptyString(req.body.description) ? req.body.description.trim() : '';
  }

  vuln.updatedAt = new Date().toISOString();

  writeDb(db);

  res.json(vuln);
});

// DELETE /vulnerabilities/:id - supprimer une vulnérabilité de l'entreprise sélectionnée
router.delete('/:id', (req, res) => {
  const db = readDb();
  const id = Number(req.params.id);
  const allowedIds = scopedVulnerabilities(db).map((v) => v.id);
  const index = db.vulnerabilities.findIndex((v) => v.id === id && allowedIds.includes(v.id));

  if (index === -1) {
    throw new ApiError(404, `Vulnérabilité ${id} introuvable.`);
  }

  db.vulnerabilities.splice(index, 1);
  writeDb(db);

  res.status(204).end();
});

export default router;