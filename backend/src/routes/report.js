import { Router } from 'express';
import { readDb } from '../db.js';
import { calculateRisk } from '../services/riskEngine.js';
import { ApiError } from '../utils.js';

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

// GET /report - rapport complet de l'entreprise sélectionnée.
router.get('/', (req, res) => {
  const db = readDb();
  if (!db.company) {
    throw new ApiError(404, "Créez l'entreprise avant de générer un rapport.");
  }

  const scoped = scopedAssets(db);
  const vulnerabilities = scopedVulnerabilities(db, scoped);
  const risk = calculateRisk({
    company: db.company,
    assets: scoped,
    vulnerabilities
  });

  const assets = scoped.map((asset) => ({
    ...asset,
    vulnerabilities: vulnerabilities.filter((v) => v.assetId === asset.id)
  }));

  res.json({
    generatedAt: new Date().toISOString(),
    company: db.company,
    assets,
    vulnerabilities,
    summary: {
      totalAssets: assets.length,
      totalVulnerabilities: vulnerabilities.length,
      riskLevel: risk.level,
      riskScore: risk.score
    },
    risk,
    recommendations: risk.recommendations
  });
});

export default router;