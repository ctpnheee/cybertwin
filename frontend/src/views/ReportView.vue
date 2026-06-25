<script setup>
import { computed, onMounted } from 'vue';
import { RouterLink } from 'vue-router';
import { useCyberStore } from '@/stores/cyberStore';

const store = useCyberStore();

onMounted(async () => {
  store.loading = true;
  store.clearMessages();
  try {
    await store.fetchCompanies();
    await store.fetchCompany();
    await store.fetchReport();
  } catch (error) {
    store.setError(error);
  } finally {
    store.loading = false;
  }
});

const report = computed(() => store.report);

const formattedDate = computed(() => {
  if (!report.value?.generatedAt) return '—';
  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'long',
    timeStyle: 'short'
  }).format(new Date(report.value.generatedAt));
});

function riskClass(level) {
  return {
    faible: 'safe',
    moyen: 'warning',
    moyenne: 'warning',
    élevé: 'danger',
    élevée: 'danger'
  }[level] || 'neutral';
}

function printReport() {
  window.print();
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function formatFilename(value) {
  return String(value || 'rapport-cybertwin')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function downloadReport() {
  if (!report.value) return;

  const data = report.value;
  const company = data.company;
  const fileName = `${formatFilename(company.name)}-rapport-cybertwin.html`;

  const services = company.exposedServices?.length
    ? company.exposedServices.map((service) => `<li>${escapeHtml(service)}</li>`).join('')
    : '<li>Aucun service exposé déclaré.</li>';

  const assetsRows = data.assets?.length
    ? data.assets.map((asset) => {
        const vulnerabilities = asset.vulnerabilities?.length
          ? asset.vulnerabilities
              .map((vulnerability) =>
                `<li>${escapeHtml(vulnerability.name)} — ${escapeHtml(vulnerability.criticality)}</li>`
              )
              .join('')
          : '<li>Aucune vulnérabilité associée.</li>';

        return `
          <tr>
            <td>${escapeHtml(asset.name)}</td>
            <td>${escapeHtml(asset.type)}</td>
            <td>${asset.exposedToInternet ? 'Exposé Internet' : 'Interne'}</td>
            <td><ul>${vulnerabilities}</ul></td>
          </tr>
        `;
      }).join('')
    : '<tr><td colspan="4">Aucun actif enregistré.</td></tr>';

  const vulnerabilitiesList = data.vulnerabilities?.length
    ? data.vulnerabilities.map((vulnerability) => `
        <article class="mini-card">
          <h4>${escapeHtml(vulnerability.name)}</h4>
          <p><strong>Criticité :</strong> ${escapeHtml(vulnerability.criticality)}</p>
          <p>${escapeHtml(vulnerability.description || 'Aucune description.')}</p>
        </article>
      `).join('')
    : '<p>Aucune vulnérabilité détectée.</p>';

  const recommendations = data.recommendations?.length
    ? data.recommendations.map((recommendation) => `<li>${escapeHtml(recommendation)}</li>`).join('')
    : '<li>Aucune recommandation disponible.</li>';

  const html = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <title>Rapport CyberTwin - ${escapeHtml(company.name)}</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      background: #f4f7fb;
      color: #142033;
      margin: 0;
      padding: 40px;
    }

    .document {
      background: white;
      max-width: 1000px;
      margin: 0 auto;
      padding: 40px;
      border-radius: 18px;
      box-shadow: 0 20px 60px rgba(15, 23, 42, 0.12);
    }

    h1 {
      margin-bottom: 8px;
      font-size: 32px;
    }

    h2 {
      margin-top: 34px;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 8px;
    }

    .score {
      display: inline-block;
      margin-top: 12px;
      padding: 12px 18px;
      border-radius: 14px;
      background: #eef2ff;
      font-weight: bold;
    }

    .score.faible {
      background: #dcfce7;
      color: #15803d;
    }

    .score.moyen,
    .score.moyenne {
      background: #fef3c7;
      color: #b45309;
    }

    .score.élevé,
    .score.élevée {
      background: #fee2e2;
      color: #b91c1c;
    }

    table {
      border-collapse: collapse;
      width: 100%;
      margin-top: 16px;
    }

    th,
    td {
      border: 1px solid #e2e8f0;
      padding: 12px;
      text-align: left;
      vertical-align: top;
    }

    th {
      background: #f8fafc;
    }

    .grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 16px;
    }

    .mini-card {
      border: 1px solid #e2e8f0;
      border-radius: 14px;
      padding: 16px;
      background: #f8fafc;
    }

    .muted {
      color: #64748b;
    }

    @media print {
      body {
        background: white;
        padding: 0;
      }

      .document {
        box-shadow: none;
        border-radius: 0;
      }
    }
  </style>
</head>
<body>
  <main class="document">
    <p class="muted">CyberTwin — Rapport de risque cyber</p>
    <h1>Rapport de sécurité — ${escapeHtml(company.name)}</h1>
    <p>Généré le ${escapeHtml(formattedDate.value)}</p>

    <div class="score ${escapeHtml(data.summary.riskLevel)}">
      Risque : ${escapeHtml(data.summary.riskLevel)} — ${escapeHtml(data.summary.riskScore)}/100
    </div>

    <h2>1. Présentation de l'entreprise</h2>
    <p><strong>Nom :</strong> ${escapeHtml(company.name)}</p>
    <p><strong>Secteur :</strong> ${escapeHtml(company.sector)}</p>
    <p><strong>Employés :</strong> ${escapeHtml(company.employees)}</p>
    <p><strong>Serveurs :</strong> ${escapeHtml(company.servers)}</p>
    <p><strong>Postes clients :</strong> ${escapeHtml(company.clients)}</p>

    <h3>Services exposés sur Internet</h3>
    <ul>${services}</ul>

    <h2>2. Inventaire des actifs</h2>
    <table>
      <thead>
        <tr>
          <th>Actif</th>
          <th>Type</th>
          <th>Exposition</th>
          <th>Vulnérabilités associées</th>
        </tr>
      </thead>
      <tbody>
        ${assetsRows}
      </tbody>
    </table>

    <h2>3. Vulnérabilités détectées</h2>
    <div class="grid">
      ${vulnerabilitiesList}
    </div>

    <h2>4. Résultat du calcul de risque</h2>
    <p><strong>Total actifs :</strong> ${escapeHtml(data.summary.totalAssets)}</p>
    <p><strong>Total vulnérabilités :</strong> ${escapeHtml(data.summary.totalVulnerabilities)}</p>
    <p><strong>Niveau de risque :</strong> ${escapeHtml(data.summary.riskLevel)}</p>
    <p><strong>Score de risque :</strong> ${escapeHtml(data.summary.riskScore)}/100</p>

    <h2>5. Recommandations de sécurité</h2>
    <ol>${recommendations}</ol>
  </main>
</body>
</html>
`;

  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}
</script>

<template>
  <section class="page report-page">
    <div class="page-heading no-print">
      <div>
        <p class="eyebrow">Synthèse finale</p>
        <h1>Rapport de risque cyber</h1>
        <p class="lead">
          Rapport généré à partir de la fiche entreprise, de l'inventaire des actifs,
          des vulnérabilités et du moteur de calcul du risque.
        </p>
      </div>

      <div class="actions-row">
        <button class="button secondary" type="button" @click="store.fetchReport">
          Actualiser
        </button>

        <button class="button secondary" type="button" :disabled="!report" @click="downloadReport">
          Télécharger
        </button>

        <button class="button primary" type="button" :disabled="!report" @click="printReport">
          Imprimer / PDF
        </button>
      </div>
    </div>

    <div v-if="store.error" class="alert error no-print">{{ store.error }}</div>

    <div v-if="store.loading && !report" class="empty-state card">Génération du rapport...</div>

    <div v-else-if="!report" class="card empty-state">
      <h2>Rapport indisponible</h2>
      <p>Crée ou sélectionne d'abord une entreprise pour pouvoir générer un rapport complet.</p>
      <RouterLink class="button primary" to="/company">Créer l'entreprise</RouterLink>
    </div>

    <article v-else class="report-document card">
      <header class="report-header">
        <div>
          <p class="eyebrow">CyberTwin</p>
          <h2>Rapport de sécurité — {{ report.company.name }}</h2>
          <p>Généré le {{ formattedDate }}</p>
        </div>

        <div :class="['report-score', riskClass(report.summary.riskLevel)]">
          <span>Risque</span>
          <strong>{{ report.summary.riskLevel }}</strong>
          <small>{{ report.summary.riskScore }}/100</small>
        </div>
      </header>

      <section class="report-section">
        <h3>1. Présentation de l'entreprise</h3>

        <div class="report-grid">
          <dl class="info-list compact">
            <div><dt>Nom</dt><dd>{{ report.company.name }}</dd></div>
            <div><dt>Secteur</dt><dd>{{ report.company.sector }}</dd></div>
            <div><dt>Employés</dt><dd>{{ report.company.employees }}</dd></div>
            <div><dt>Serveurs</dt><dd>{{ report.company.servers }}</dd></div>
            <div><dt>Postes clients</dt><dd>{{ report.company.clients }}</dd></div>
          </dl>

          <div>
            <h4>Services exposés sur Internet</h4>

            <div v-if="report.company.exposedServices?.length" class="chips">
              <span
                v-for="service in report.company.exposedServices"
                :key="service"
                class="chip warning"
              >
                {{ service }}
              </span>
            </div>

            <p v-else class="muted">Aucun service exposé déclaré.</p>
          </div>
        </div>
      </section>

      <section class="report-section">
        <h3>2. Inventaire des actifs</h3>

        <div class="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Actif</th>
                <th>Type</th>
                <th>Exposition</th>
                <th>Vulnérabilités associées</th>
              </tr>
            </thead>

            <tbody>
              <tr v-for="asset in report.assets" :key="asset.id">
                <td><strong>{{ asset.name }}</strong></td>
                <td>{{ asset.type }}</td>
                <td>{{ asset.exposedToInternet ? 'Exposé Internet' : 'Interne' }}</td>
                <td>
                  <span v-if="!asset.vulnerabilities.length" class="muted">Aucune</span>

                  <ul v-else class="inline-list">
                    <li v-for="vulnerability in asset.vulnerabilities" :key="vulnerability.id">
                      {{ vulnerability.name }} — {{ vulnerability.criticality }}
                    </li>
                  </ul>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section class="report-section">
        <h3>3. Vulnérabilités détectées</h3>

        <div v-if="!report.vulnerabilities.length" class="empty-state">
          Aucune vulnérabilité détectée.
        </div>

        <div v-else class="vulnerability-report-list">
          <article
            v-for="vulnerability in report.vulnerabilities"
            :key="vulnerability.id"
            class="mini-card"
          >
            <div class="card-header">
              <strong>{{ vulnerability.name }}</strong>
              <span :class="['badge', riskClass(vulnerability.criticality)]">
                {{ vulnerability.criticality }}
              </span>
            </div>

            <p>{{ vulnerability.description || 'Aucune description.' }}</p>
          </article>
        </div>
      </section>

      <section class="report-section">
        <h3>4. Résultat du calcul de risque</h3>

        <div class="stats-grid compact-stats">
          <div class="stat-box">
            <span>Actifs</span>
            <strong>{{ report.summary.totalAssets }}</strong>
          </div>

          <div class="stat-box">
            <span>Vulnérabilités</span>
            <strong>{{ report.summary.totalVulnerabilities }}</strong>
          </div>

          <div class="stat-box">
            <span>Niveau</span>
            <strong>{{ report.summary.riskLevel }}</strong>
          </div>

          <div class="stat-box">
            <span>Score</span>
            <strong>{{ report.summary.riskScore }}/100</strong>
          </div>
        </div>
      </section>

      <section class="report-section">
        <h3>5. Recommandations de sécurité</h3>

        <ol class="recommendation-list ordered">
          <li v-for="recommendation in report.recommendations" :key="recommendation">
            {{ recommendation }}
          </li>
        </ol>
      </section>
    </article>
  </section>
</template>