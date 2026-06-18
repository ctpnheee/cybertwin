import { Router } from 'express';
import { readDb } from '../db.js';
import { calculateRisk } from '../services/riskEngine.js';
import { ApiError } from '../utils.js';

const router = Router();

// GET /report - rapport complet (entreprise, actifs, vulnérabilités, risque, recommandations).
router.get('/', (req, res) => {
  const db = readDb();
  if (!db.company) {
    throw new ApiError(404, "Créez l'entreprise avant de générer un rapport.");
  }

  const risk = calculateRisk({
    company: db.company,
    assets: db.assets,
    vulnerabilities: db.vulnerabilities
  });

  const assets = db.assets.map((asset) => ({
    ...asset,
    vulnerabilities: db.vulnerabilities.filter((v) => v.assetId === asset.id)
  }));

  res.json({
    generatedAt: new Date().toISOString(),
    company: db.company,
    assets,
    vulnerabilities: db.vulnerabilities,
    summary: {
      totalAssets: db.assets.length,
      totalVulnerabilities: db.vulnerabilities.length,
      riskLevel: risk.level,
      riskScore: risk.score
    },
    risk,
    recommendations: risk.recommendations
  });
});

export default router;
