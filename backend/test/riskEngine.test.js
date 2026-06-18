import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { calculateRisk } from '../src/services/riskEngine.js';

describe('riskEngine.calculateRisk', () => {
  it("retourne un risque faible pour une entreprise sans actif ni vulnérabilité", () => {
    const result = calculateRisk({ company: null, assets: [], vulnerabilities: [] });
    assert.equal(result.level, 'faible');
    assert.equal(result.score, 0);
    assert.equal(result.breakdown.assetCount, 0);
    assert.ok(Array.isArray(result.recommendations));
  });

  it('additionne la pondération des criticités (faible=1, moyenne=3, élevée=6)', () => {
    const result = calculateRisk({
      company: null,
      assets: [{ id: 1, exposedToInternet: false }],
      vulnerabilities: [
        { id: 1, assetId: 1, name: 'A', criticality: 'faible' },
        { id: 2, assetId: 1, name: 'B', criticality: 'moyenne' },
        { id: 3, assetId: 1, name: 'C', criticality: 'élevée' }
      ]
    });
    assert.equal(result.breakdown.vulnerabilityScore, 1 + 3 + 6);
    assert.equal(result.breakdown.vulnerabilityCount, 3);
  });

  it("compte l'exposition Internet des actifs et des services", () => {
    const result = calculateRisk({
      company: { exposedServices: ['a', 'b'] },
      assets: [
        { id: 1, exposedToInternet: true },
        { id: 2, exposedToInternet: false }
      ],
      vulnerabilities: [{ id: 1, assetId: 1, name: 'X', criticality: 'moyenne' }]
    });
    assert.equal(result.breakdown.exposedAssetCount, 1);
    assert.equal(result.breakdown.exposedVulnerabilities, 1);
    assert.equal(result.breakdown.exposedServiceCount, 2);
  });

  it('classe en risque élevé un scénario fortement vulnérable', () => {
    const assets = Array.from({ length: 5 }, (_, i) => ({
      id: i + 1,
      exposedToInternet: true
    }));
    const vulnerabilities = assets.map((a) => ({
      id: a.id,
      assetId: a.id,
      name: 'Logiciel obsolète',
      criticality: 'élevée'
    }));
    const result = calculateRisk({
      company: { exposedServices: ['a', 'b', 'c'] },
      assets,
      vulnerabilities
    });
    assert.equal(result.level, 'élevé');
    assert.ok(result.score > 55);
  });

  it('plafonne le score à 100', () => {
    const assets = Array.from({ length: 50 }, (_, i) => ({ id: i + 1, exposedToInternet: true }));
    const vulnerabilities = assets.map((a) => ({
      id: a.id,
      assetId: a.id,
      name: 'Logiciel obsolète',
      criticality: 'élevée'
    }));
    const result = calculateRisk({ company: { exposedServices: [] }, assets, vulnerabilities });
    assert.equal(result.score, 100);
  });

  it('génère des recommandations ciblées selon les vulnérabilités', () => {
    const result = calculateRisk({
      company: null,
      assets: [{ id: 1, exposedToInternet: true }],
      vulnerabilities: [
        { id: 1, assetId: 1, name: 'Mot de passe faible', criticality: 'moyenne' },
        { id: 2, assetId: 1, name: 'Absence de sauvegarde', criticality: 'élevée' }
      ]
    });
    const joined = result.recommendations.join(' ');
    assert.match(joined, /mots de passe forts/i);
    assert.match(joined, /sauvegardes/i);
  });
});
