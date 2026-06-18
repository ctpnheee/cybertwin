import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/**
 * Crée un fichier de base de données isolé pour un test et configure
 * la variable d'environnement utilisée par `src/db.js`.
 * Les tests n'écrivent donc jamais dans le vrai `backend/data/db.json`.
 *
 * @param {object} [seed] contenu initial de la base
 * @returns {{ path: string, cleanup: () => void }}
 */
export function useTempDb(seed) {
  const dir = mkdtempSync(join(tmpdir(), 'cybertwin-test-'));
  const path = join(dir, 'db.json');

  const data = seed ?? {
    company: null,
    assets: [],
    vulnerabilities: [],
    counters: { asset: 0, vulnerability: 0 }
  };
  writeFileSync(path, JSON.stringify(data, null, 2), 'utf-8');

  process.env.CYBERTWIN_DB_PATH = path;

  return {
    path,
    cleanup() {
      delete process.env.CYBERTWIN_DB_PATH;
      rmSync(dir, { recursive: true, force: true });
    }
  };
}

export function sampleSeed() {
  return {
    company: {
      id: 1,
      name: 'Test SAS',
      sector: 'Tech',
      employees: 10,
      servers: 2,
      clients: 8,
      exposedServices: ['Site web'],
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z'
    },
    assets: [
      {
        id: 1,
        name: 'Serveur Web',
        type: 'Serveur Web',
        exposedToInternet: true,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z'
      }
    ],
    vulnerabilities: [
      {
        id: 1,
        assetId: 1,
        name: 'Logiciel obsolète',
        criticality: 'élevée',
        description: '',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z'
      }
    ],
    counters: { asset: 1, vulnerability: 1 }
  };
}
