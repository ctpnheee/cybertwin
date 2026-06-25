import { Router } from 'express';
import { nextId, readDb, writeDb } from '../db.js';
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
  if (
    has('exposedServices') &&
    (!Array.isArray(body.exposedServices) ||
      !body.exposedServices.every((service) => isNonEmptyString(service)))
  ) {
    errors.push('exposedServices doit être un tableau de chaînes non vides.');
  }

  if (errors.length > 0) {
    throw new ApiError(400, 'Données entreprise invalides.', errors);
  }
}

function getCompanies(db) {
  return Array.isArray(db.companies) ? db.companies : db.company ? [db.company] : [];
}

function getCurrentCompany(db) {
  const companies = getCompanies(db);
  return (
    companies.find((company) => company.id === db.currentCompanyId) ||
    db.company ||
    companies[0] ||
    null
  );
}

function setCurrentCompany(db, company) {
  db.companies = getCompanies(db);
  const index = db.companies.findIndex((item) => item.id === company.id);

  if (index === -1) {
    db.companies.push(company);
  } else {
    db.companies[index] = company;
  }

  db.currentCompanyId = company.id;
  db.company = company;
}

function buildCompany(body, existing, id) {
  const now = new Date().toISOString();

  return {
    id: existing?.id ?? id,
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

function removeCompanyData(db, companyId) {
  const assetIds = db.assets
    .filter((asset) => asset.companyId === companyId)
    .map((asset) => asset.id);

  db.assets = db.assets.filter((asset) => asset.companyId !== companyId);

  db.vulnerabilities = db.vulnerabilities.filter(
    (vulnerability) =>
      vulnerability.companyId !== companyId && !assetIds.includes(vulnerability.assetId)
  );
}

// GET /company - consulter l'entreprise actuellement sélectionnée
router.get('/', (req, res) => {
  const db = readDb();
  const company = getCurrentCompany(db);

  if (!company) {
    throw new ApiError(404, "Aucune entreprise n'a encore été créée.");
  }

  res.json(company);
});

// GET /company/all - liste toutes les entreprises
router.get('/all', (req, res) => {
  const db = readDb();
  const currentCompany = getCurrentCompany(db);

  res.json(
    getCompanies(db).map((company) => ({
      ...company,
      isCurrent: company.id === currentCompany?.id
    }))
  );
});

// GET /company/:id - détail d'une entreprise précise
router.get('/:id', (req, res) => {
  const db = readDb();
  const id = Number(req.params.id);
  const company = getCompanies(db).find((item) => item.id === id);

  if (!company) {
    throw new ApiError(404, `Entreprise ${id} introuvable.`);
  }

  res.json(company);
});

// POST /company - créer une nouvelle entreprise et la sélectionner
router.post('/', (req, res) => {
  const db = readDb();

  validateCompany(req.body, { partial: false });

  const company = buildCompany(req.body, null, nextId(db, 'company'));

  setCurrentCompany(db, company);
  writeDb(db);

  res.status(201).json(company);
});

// PUT /company - modifier l'entreprise actuellement sélectionnée
router.put('/', (req, res) => {
  const db = readDb();
  const currentCompany = getCurrentCompany(db);

  if (!currentCompany) {
    throw new ApiError(404, "Aucune entreprise à modifier. Créez-la d'abord (POST /company).");
  }

  validateCompany(req.body, { partial: true });

  const company = buildCompany(req.body, currentCompany, currentCompany.id);

  setCurrentCompany(db, company);
  writeDb(db);

  res.json(company);
});

// PUT /company/:id - modifier une entreprise précise
router.put('/:id', (req, res) => {
  const db = readDb();
  const id = Number(req.params.id);
  const existing = getCompanies(db).find((company) => company.id === id);

  if (!existing) {
    throw new ApiError(404, `Entreprise ${id} introuvable.`);
  }

  validateCompany(req.body, { partial: true });

  const company = buildCompany(req.body, existing, id);

  setCurrentCompany(db, company);
  writeDb(db);

  res.json(company);
});

// POST /company/:id/select - sélectionner l'entreprise active
router.post('/:id/select', (req, res) => {
  const db = readDb();
  const id = Number(req.params.id);
  const company = getCompanies(db).find((item) => item.id === id);

  if (!company) {
    throw new ApiError(404, `Entreprise ${id} introuvable.`);
  }

  setCurrentCompany(db, company);
  writeDb(db);

  res.json(company);
});

// DELETE /company/:id - supprimer une entreprise et ses données liées
router.delete('/:id', (req, res) => {
  const db = readDb();
  const id = Number(req.params.id);
  const companies = getCompanies(db);
  const index = companies.findIndex((company) => company.id === id);

  if (index === -1) {
    throw new ApiError(404, `Entreprise ${id} introuvable.`);
  }

  companies.splice(index, 1);
  db.companies = companies;

  removeCompanyData(db, id);

  const nextCompany = companies[0] || null;

  db.currentCompanyId = nextCompany?.id ?? null;
  db.company = nextCompany;

  writeDb(db);

  res.status(204).end();
});

export default router;