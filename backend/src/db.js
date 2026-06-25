import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DEFAULT_DB_PATH = resolve(__dirname, '..', 'data', 'db.json');

// Le chemin du fichier de données est résolu à chaque appel afin de pouvoir
// l'isoler pendant les tests (variable d'environnement CYBERTWIN_DB_PATH).
function getDbPath() {
  return process.env.CYBERTWIN_DB_PATH || DEFAULT_DB_PATH;
}

const DEFAULT_DATA = {
  companies: [],
  currentCompanyId: null,
  company: null,
  assets: [],
  vulnerabilities: [],
  counters: { company: 0, asset: 0, vulnerability: 0 }
};

function ensureFile() {
  const dbPath = getDbPath();
  const dir = dirname(dbPath);

  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  if (!existsSync(dbPath)) {
    writeFileSync(dbPath, JSON.stringify(DEFAULT_DATA, null, 2), 'utf-8');
  }
}

function normalizeData(data = {}) {
  const companies = Array.isArray(data.companies)
    ? data.companies
    : data.company
      ? [data.company]
      : [];

  const companyIds = companies.map((company) => Number(company.id)).filter(Number.isInteger);

  const fallbackCompanyId = companyIds[0] ?? null;

  const currentCompanyId = Number.isInteger(Number(data.currentCompanyId))
    ? Number(data.currentCompanyId)
    : fallbackCompanyId;

  const currentCompany =
    companies.find((company) => company.id === currentCompanyId) || companies[0] || null;

  const selectedId = currentCompany?.id ?? null;

  const assets = Array.isArray(data.assets)
    ? data.assets.map((asset) => ({
        ...asset,
        companyId: Number.isInteger(Number(asset.companyId))
          ? Number(asset.companyId)
          : selectedId
      }))
    : [];

  const assetCompanyById = assets.reduce((acc, asset) => {
    acc[asset.id] = asset.companyId ?? null;
    return acc;
  }, {});

  const vulnerabilities = Array.isArray(data.vulnerabilities)
    ? data.vulnerabilities.map((vulnerability) => ({
        ...vulnerability,
        companyId: Number.isInteger(Number(vulnerability.companyId))
          ? Number(vulnerability.companyId)
          : assetCompanyById[vulnerability.assetId] ?? selectedId
      }))
    : [];

  return {
    companies,
    currentCompanyId: currentCompany?.id ?? null,
    company: currentCompany,
    assets,
    vulnerabilities,
    counters: {
      company: data.counters?.company ?? Math.max(0, ...companyIds, 0),
      asset: data.counters?.asset ?? Math.max(0, ...assets.map((asset) => asset.id), 0),
      vulnerability:
        data.counters?.vulnerability ?? Math.max(0, ...vulnerabilities.map((v) => v.id), 0)
    }
  };
}

export function readDb() {
  ensureFile();
  const raw = readFileSync(getDbPath(), 'utf-8');
  const data = JSON.parse(raw);
  return normalizeData(data);
}

export function writeDb(data) {
  ensureFile();
  const normalized = normalizeData(data);
  writeFileSync(getDbPath(), JSON.stringify(normalized, null, 2), 'utf-8');
  return normalized;
}

export function nextId(data, entity) {
  data.counters = data.counters || { company: 0, asset: 0, vulnerability: 0 };
  data.counters[entity] = (data.counters[entity] ?? 0) + 1;
  return data.counters[entity];
}