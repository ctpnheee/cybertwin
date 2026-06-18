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
  company: null,
  assets: [],
  vulnerabilities: [],
  counters: { asset: 0, vulnerability: 0 }
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

export function readDb() {
  ensureFile();
  const raw = readFileSync(getDbPath(), 'utf-8');
  const data = JSON.parse(raw);
  return {
    company: data.company ?? null,
    assets: Array.isArray(data.assets) ? data.assets : [],
    vulnerabilities: Array.isArray(data.vulnerabilities) ? data.vulnerabilities : [],
    counters: {
      asset: data.counters?.asset ?? 0,
      vulnerability: data.counters?.vulnerability ?? 0
    }
  };
}

export function writeDb(data) {
  ensureFile();
  writeFileSync(getDbPath(), JSON.stringify(data, null, 2), 'utf-8');
  return data;
}

export function nextId(data, entity) {
  data.counters[entity] = (data.counters[entity] ?? 0) + 1;
  return data.counters[entity];
}
