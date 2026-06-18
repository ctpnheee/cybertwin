import { Router } from 'express';
import { ASSET_TYPES, CRITICALITY_LEVELS } from '../constants.js';
import { readDb } from '../db.js';
import { calculateRisk } from '../services/riskEngine.js';

const router = Router();

// GET /dashboard - statistiques agrégées pour le tableau de bord.
router.get('/', (req, res) => {
  const db = readDb();

  const assetsByType = ASSET_TYPES.reduce((acc, type) => {
    acc[type] = db.assets.filter((a) => a.type === type).length;
    return acc;
  }, {});

  const vulnerabilitiesByCriticality = CRITICALITY_LEVELS.reduce((acc, level) => {
    acc[level] = db.vulnerabilities.filter((v) => v.criticality === level).length;
    return acc;
  }, {});

  const risk = calculateRisk({
    company: db.company,
    assets: db.assets,
    vulnerabilities: db.vulnerabilities
  });

  res.json({
    totalAssets: db.assets.length,
    totalVulnerabilities: db.vulnerabilities.length,
    exposedAssets: db.assets.filter((a) => a.exposedToInternet).length,
    assetsByType,
    vulnerabilitiesByCriticality,
    risk
  });
});

export default router;
