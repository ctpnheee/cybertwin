import { Router } from 'express';
import { readDb } from '../db.js';
import { calculateRisk } from '../services/riskEngine.js';

const router = Router();

// POST /risk/calculate - calcule le score de risque cyber de l'entreprise.
// Utilise par défaut les données stockées. Un payload optionnel
// { company, assets, vulnerabilities } permet de simuler un autre scénario.
router.post('/calculate', (req, res) => {
  const db = readDb();
  const body = req.body && Object.keys(req.body).length > 0 ? req.body : null;
  const has = (key) => body && Object.prototype.hasOwnProperty.call(body, key);
  const result = calculateRisk({
    company: has('company') ? body.company : db.company,
    assets: has('assets') ? body.assets : db.assets,
    vulnerabilities: has('vulnerabilities') ? body.vulnerabilities : db.vulnerabilities
  });
  res.json(result);
});

export default router;
