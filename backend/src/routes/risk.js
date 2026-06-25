import { Router } from 'express';
import { readDb } from '../db.js';
import { calculateRisk } from '../services/riskEngine.js';

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

function scopedVulnerabilities(db, assets) {
  const assetIds = assets.map((asset) => asset.id);
  return db.vulnerabilities.filter((vulnerability) => assetIds.includes(vulnerability.assetId));
}

// POST /risk/calculate - calcule le score de risque cyber de l'entreprise sélectionnée.
// Un payload optionnel { company, assets, vulnerabilities } permet de simuler un autre scénario.
router.post('/calculate', (req, res) => {
  const db = readDb();
  const assets = scopedAssets(db);
  const vulnerabilities = scopedVulnerabilities(db, assets);
  const body = req.body && Object.keys(req.body).length > 0 ? req.body : null;
  const has = (key) => body && Object.prototype.hasOwnProperty.call(body, key);

  const result = calculateRisk({
    company: has('company') ? body.company : db.company,
    assets: has('assets') ? body.assets : assets,
    vulnerabilities: has('vulnerabilities') ? body.vulnerabilities : vulnerabilities
  });

  res.json(result);
});

export default router;