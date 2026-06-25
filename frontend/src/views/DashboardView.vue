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
    await store.fetchDashboard();
  } catch (error) {
    store.setError(error);
  } finally {
    store.loading = false;
  }
});

const risk = computed(() => store.dashboard?.risk || null);
const scoreStyle = computed(() => ({ '--score': `${risk.value?.score || 0}%` }));

const assetsByType = computed(() => objectToBars(store.dashboard?.assetsByType || {}));
const vulnerabilitiesByCriticality = computed(() => objectToBars(store.dashboard?.vulnerabilitiesByCriticality || {}));

function objectToBars(source) {
  const entries = Object.entries(source);
  const max = Math.max(...entries.map(([, value]) => value), 1);
  return entries.map(([label, value]) => ({
    label,
    value,
    width: `${Math.round((value / max) * 100)}%`
  }));
}

function riskClass(level) {
  return {
    faible: 'safe',
    moyen: 'warning',
    moyenne: 'warning',
    élevé: 'danger',
    élevée: 'danger'
  }[level] || 'neutral';
}
</script>

<template>
  <section class="page">
    <div class="page-heading">
      <div>
        <p class="eyebrow">Vue globale</p>
        <h1>Tableau de bord</h1>
        <p class="lead">
          Suis les indicateurs essentiels : actifs, vulnérabilités, exposition Internet
          et score global de risque cyber.
        </p>
      </div>
      <button class="button secondary" type="button" @click="store.fetchDashboard">Actualiser</button>
    </div>

    <div v-if="store.company" class="alert info">
      Dashboard de l’entreprise active : <strong>{{ store.company.name }}</strong>
    </div>

    <div v-if="store.error" class="alert error">{{ store.error }}</div>
    <div v-if="store.loading && !store.dashboard" class="empty-state card">Chargement du dashboard...</div>

    <div v-if="!store.company" class="card empty-state">
      <h2>Aucune entreprise sélectionnée</h2>
      <p>Crée ou sélectionne une entreprise pour afficher son dashboard.</p>
      <RouterLink class="button primary" to="/company">Gérer les entreprises</RouterLink>
    </div>

    <template v-if="store.company && store.dashboard">
      <div class="stats-grid">
        <article class="card stat-card">
          <span>Actifs</span>
          <strong>{{ store.dashboard.totalAssets }}</strong>
          <small>éléments inventoriés</small>
        </article>

        <article class="card stat-card">
          <span>Vulnérabilités</span>
          <strong>{{ store.dashboard.totalVulnerabilities }}</strong>
          <small>failles associées</small>
        </article>

        <article class="card stat-card">
          <span>Actifs exposés</span>
          <strong>{{ store.dashboard.exposedAssets }}</strong>
          <small>accessibles depuis Internet</small>
        </article>

        <article class="card stat-card" :class="riskClass(risk?.level)">
          <span>Risque global</span>
          <strong>{{ risk?.level || '—' }}</strong>
          <small>{{ risk?.score ?? 0 }}/100</small>
        </article>
      </div>

      <div class="dashboard-grid">
        <section class="card risk-card">
          <div class="card-header">
            <h2>Score de risque</h2>
            <span :class="['badge', riskClass(risk?.level)]">{{ risk?.level || 'non calculé' }}</span>
          </div>

          <div class="score-meter" :style="scoreStyle">
            <div class="score-fill"></div>
          </div>
          <div class="score-labels">
            <span>0</span>
            <span>25 faible</span>
            <span>55 moyen</span>
            <span>100 élevé</span>
          </div>

          <dl v-if="risk" class="breakdown-grid">
            <div><dt>Actifs</dt><dd>{{ risk.breakdown.assetCount }}</dd></div>
            <div><dt>Vulnérabilités</dt><dd>{{ risk.breakdown.vulnerabilityCount }}</dd></div>
            <div><dt>Score criticité</dt><dd>{{ risk.breakdown.vulnerabilityScore }}</dd></div>
            <div><dt>Actifs exposés</dt><dd>{{ risk.breakdown.exposedAssetCount }}</dd></div>
            <div><dt>Failles exposées</dt><dd>{{ risk.breakdown.exposedVulnerabilities }}</dd></div>
            <div><dt>Services exposés</dt><dd>{{ risk.breakdown.exposedServiceCount }}</dd></div>
          </dl>
        </section>

        <section class="card chart-card">
          <h2>Répartition des actifs</h2>
          <div class="bar-chart">
            <div v-for="bar in assetsByType" :key="bar.label" class="bar-row">
              <div class="bar-info">
                <span>{{ bar.label }}</span>
                <strong>{{ bar.value }}</strong>
              </div>
              <div class="bar-track">
                <div class="bar-fill" :style="{ width: bar.width }"></div>
              </div>
            </div>
          </div>
        </section>

        <section class="card chart-card">
          <h2>Vulnérabilités par criticité</h2>
          <div class="bar-chart">
            <div v-for="bar in vulnerabilitiesByCriticality" :key="bar.label" class="bar-row">
              <div class="bar-info">
                <span>{{ bar.label }}</span>
                <strong>{{ bar.value }}</strong>
              </div>
              <div class="bar-track">
                <div class="bar-fill" :class="riskClass(bar.label)" :style="{ width: bar.width }"></div>
              </div>
            </div>
          </div>
        </section>

        <section class="card recommendations-card">
          <h2>Recommandations principales</h2>
          <ul v-if="risk?.recommendations?.length" class="recommendation-list">
            <li v-for="recommendation in risk.recommendations" :key="recommendation">
              {{ recommendation }}
            </li>
          </ul>
          <p v-else class="muted">Aucune recommandation disponible.</p>
        </section>
      </div>
    </template>
  </section>
</template>