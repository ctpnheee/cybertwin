import { Router } from 'express';
import { ASSET_TYPES, CRITICALITY_LEVELS } from '../constants.js';
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

// GET /dashboard - statistiques agrégées pour le tableau de bord de l'entreprise sélectionnée.
router.get('/', (req, res) => {
  const db = readDb();
  const assets = scopedAssets(db);
  const vulnerabilities = scopedVulnerabilities(db, assets);

  const assetsByType = ASSET_TYPES.reduce((acc, type) => {
    acc[type] = assets.filter((a) => a.type === type).length;
    return acc;
  }, {});

  const vulnerabilitiesByCriticality = CRITICALITY_LEVELS.reduce((acc, level) => {
    acc[level] = vulnerabilities.filter((v) => v.criticality === level).length;
    return acc;
  }, {});

  const risk = calculateRisk({
    company: db.company,
    assets,
    vulnerabilities
  });

  res.json({
    company: db.company,
    totalAssets: assets.length,
    totalVulnerabilities: vulnerabilities.length,
    exposedAssets: assets.filter((a) => a.exposedToInternet).length,
    assetsByType,
    vulnerabilitiesByCriticality,
    risk
  });
});

export default router;