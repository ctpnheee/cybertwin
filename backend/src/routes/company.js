import { Router } from 'express';
import { readDb, writeDb } from '../db.js';
import { ApiError, isNonEmptyString, isNonNegativeInteger } from '../utils.js';

const router = Router();

function validateCompany(body, { partial = false } = {}) {
  const errors = [];
  const has = (key) => Object.prototype.hasOwnProperty.call(body, key);

  if ((!partial || has('name')) && !isNonEmptyString(body.name)) {
    errors.push('name est requis (chaîne non vide).');
  }
  if ((!partial || has('sector')) && !isNonEmptyString(body.sector)) {
    errors.push('sector est requis (chaîne non vide).');
  }
  for (const key of ['employees', 'servers', 'clients']) {
    if ((!partial || has(key)) && !isNonNegativeInteger(body[key])) {
      errors.push(`${key} doit être un entier positif ou nul.`);
    }
  }
  if (has('exposedServices') && !Array.isArray(body.exposedServices)) {
    errors.push('exposedServices doit être un tableau de chaînes.');
  }

  if (errors.length > 0) {
    throw new ApiError(400, 'Données entreprise invalides.', errors);
  }
}

function buildCompany(body, existing) {
  const now = new Date().toISOString();
  return {
    id: existing?.id ?? 1,
    name: body.name ?? existing?.name,
    sector: body.sector ?? existing?.sector,
    employees: body.employees ?? existing?.employees,
    servers: body.servers ?? existing?.servers,
    clients: body.clients ?? existing?.clients,
    exposedServices: body.exposedServices ?? existing?.exposedServices ?? [],
    createdAt: existing?.createdAt ?? now,
    updatedAt: now
  };
}

// GET /company - consulter la fiche de l'entreprise
router.get('/', (req, res) => {
  const db = readDb();
  if (!db.company) {
    throw new ApiError(404, "Aucune entreprise n'a encore été créée.");
  }
  res.json(db.company);
});

// POST /company - créer l'entreprise
router.post('/', (req, res) => {
  const db = readDb();
  validateCompany(req.body, { partial: false });
  db.company = buildCompany(req.body, db.company);
  writeDb(db);
  res.status(201).json(db.company);
});

// PUT /company - modifier les informations de l'entreprise
router.put('/', (req, res) => {
  const db = readDb();
  if (!db.company) {
    throw new ApiError(404, "Aucune entreprise à modifier. Créez-la d'abord (POST /company).");
  }
  validateCompany(req.body, { partial: true });
  db.company = buildCompany(req.body, db.company);
  writeDb(db);
  res.json(db.company);
});

export default router;
