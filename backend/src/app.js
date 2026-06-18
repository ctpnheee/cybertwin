import cors from 'cors';
import express from 'express';

import assetsRouter from './routes/assets.js';
import companyRouter from './routes/company.js';
import dashboardRouter from './routes/dashboard.js';
import reportRouter from './routes/report.js';
import riskRouter from './routes/risk.js';
import vulnerabilitiesRouter from './routes/vulnerabilities.js';
import { ApiError } from './utils.js';

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  app.get('/', (req, res) => {
    res.json({
      name: 'CyberTwin API',
      version: '1.0.0',
      endpoints: [
        'GET /company',
        'POST /company',
        'PUT /company',
        'GET /assets',
        'GET /assets/:id',
        'POST /assets',
        'PUT /assets/:id',
        'DELETE /assets/:id',
        'GET /vulnerabilities',
        'GET /vulnerabilities/:id',
        'POST /vulnerabilities',
        'PUT /vulnerabilities/:id',
        'DELETE /vulnerabilities/:id',
        'POST /risk/calculate',
        'GET /dashboard',
        'GET /report'
      ]
    });
  });

  app.use('/company', companyRouter);
  app.use('/assets', assetsRouter);
  app.use('/vulnerabilities', vulnerabilitiesRouter);
  app.use('/risk', riskRouter);
  app.use('/dashboard', dashboardRouter);
  app.use('/report', reportRouter);

  // 404 pour toute route inconnue.
  app.use((req, res) => {
    res.status(404).json({ error: `Route ${req.method} ${req.originalUrl} introuvable.` });
  });

  // Gestionnaire d'erreurs centralisé.
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    if (err instanceof ApiError) {
      return res.status(err.status).json({ error: err.message, details: err.details });
    }
    if (err.type === 'entity.parse.failed') {
      return res.status(400).json({ error: 'Corps de requête JSON invalide.' });
    }
    console.error(err);
    res.status(500).json({ error: 'Erreur interne du serveur.' });
  });

  return app;
}

export default createApp;
