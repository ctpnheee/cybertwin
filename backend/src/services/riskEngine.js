import { CRITICALITY_WEIGHT, RISK_LEVELS } from '../constants.js';

/**
 * Calcule le score de risque cyber d'une entreprise.
 *
 * Le calcul prend en compte (cf. sujet 3.4) :
 *  - le nombre d'actifs
 *  - le nombre de vulnérabilités
 *  - la criticité des vulnérabilités
 *  - l'exposition Internet
 *
 * @param {object} params
 * @param {object|null} params.company
 * @param {Array} params.assets
 * @param {Array} params.vulnerabilities
 * @returns {object} résultat détaillé du calcul
 */
export function calculateRisk({ company, assets = [], vulnerabilities = [] }) {
  const assetCount = assets.length;
  const vulnerabilityCount = vulnerabilities.length;

  // 1. Score lié à la criticité des vulnérabilités.
  const vulnerabilityScore = vulnerabilities.reduce(
    (total, vuln) => total + (CRITICALITY_WEIGHT[vuln.criticality] ?? 0),
    0
  );

  // 2. Exposition Internet : actifs exposés + vulnérabilités sur ces actifs.
  const exposedAssetIds = new Set(
    assets.filter((asset) => asset.exposedToInternet).map((asset) => asset.id)
  );
  const exposedAssetCount = exposedAssetIds.size;
  const exposedVulnerabilities = vulnerabilities.filter((vuln) =>
    exposedAssetIds.has(vuln.assetId)
  ).length;

  // 3. Services exposés déclarés au niveau de l'entreprise.
  const exposedServiceCount = Array.isArray(company?.exposedServices)
    ? company.exposedServices.length
    : 0;

  // Score brut pondéré.
  const rawScore =
    assetCount * 1 +
    vulnerabilityScore +
    exposedAssetCount * 4 +
    exposedVulnerabilities * 3 +
    exposedServiceCount * 2;

  // Normalisation sur 100 pour obtenir un score lisible.
  const score = Math.min(100, Math.round(rawScore));

  let level;
  if (score <= 25) {
    level = RISK_LEVELS.LOW;
  } else if (score <= 55) {
    level = RISK_LEVELS.MEDIUM;
  } else {
    level = RISK_LEVELS.HIGH;
  }

  return {
    level,
    score,
    breakdown: {
      assetCount,
      vulnerabilityCount,
      vulnerabilityScore,
      exposedAssetCount,
      exposedVulnerabilities,
      exposedServiceCount
    },
    recommendations: buildRecommendations({
      company,
      assets,
      vulnerabilities,
      level,
      exposedAssetCount
    }),
    calculatedAt: new Date().toISOString()
  };
}

function buildRecommendations({ company, assets, vulnerabilities, level, exposedAssetCount }) {
  const recommendations = [];

  const highVulns = vulnerabilities.filter((v) => v.criticality === 'élevée');
  if (highVulns.length > 0) {
    recommendations.push(
      `Corriger en priorité les ${highVulns.length} vulnérabilité(s) de criticité élevée.`
    );
  }

  if (vulnerabilities.some((v) => v.name === 'Logiciel obsolète')) {
    recommendations.push('Mettre à jour les logiciels et systèmes obsolètes.');
  }
  if (vulnerabilities.some((v) => v.name === 'Mot de passe faible')) {
    recommendations.push(
      "Imposer une politique de mots de passe forts et l'authentification à deux facteurs."
    );
  }
  if (vulnerabilities.some((v) => v.name === 'Port exposé')) {
    recommendations.push("Fermer ou filtrer les ports inutiles exposés sur Internet.");
  }
  if (vulnerabilities.some((v) => v.name === 'Absence de sauvegarde')) {
    recommendations.push('Mettre en place des sauvegardes automatiques et testées régulièrement.');
  }

  if (exposedAssetCount > 0) {
    recommendations.push(
      `Renforcer la protection des ${exposedAssetCount} actif(s) exposé(s) sur Internet (pare-feu, WAF, segmentation réseau).`
    );
  }

  if (assets.length === 0) {
    recommendations.push("Inventorier les actifs informatiques de l'entreprise.");
  }

  if (level === RISK_LEVELS.HIGH) {
    recommendations.push(
      'Réaliser un audit de sécurité complet et définir un plan de remédiation prioritaire.'
    );
  } else if (level === RISK_LEVELS.MEDIUM) {
    recommendations.push('Planifier des revues de sécurité régulières pour réduire le risque.');
  } else {
    recommendations.push('Maintenir les bonnes pratiques et surveiller les nouvelles menaces.');
  }

  return recommendations;
}
