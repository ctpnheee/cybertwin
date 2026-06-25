<script setup>
import { computed, onMounted } from 'vue';
import { RouterLink } from 'vue-router';
import { useCyberStore } from '@/stores/cyberStore';

const store = useCyberStore();

onMounted(() => {
  store.refreshAll();
});

const riskClass = computed(() => {
  const level = store.currentRisk?.level;

  return {
    faible: 'safe',
    moyen: 'warning',
    moyenne: 'warning',
    élevé: 'danger',
    élevée: 'danger'
  }[level] || 'neutral';
});
</script>

<template>
  <section class="page home-page">
    <div class="hero card dark-card">
      <div>
        <p class="eyebrow">Simulateur de risque cyber pour PME</p>
        <h1>CyberTwin</h1>
        <p class="hero-text">
          Modélise une entreprise fictive, inventorie ses actifs, associe des vulnérabilités
          et calcule automatiquement son niveau de risque cyber.
        </p>

        <div class="hero-actions">
          <RouterLink class="button primary" to="/company">
            Commencer par l'entreprise
          </RouterLink>

          <RouterLink class="button ghost-light" to="/dashboard">
            Voir le dashboard
          </RouterLink>
        </div>
      </div>

      <div class="risk-panel" :class="riskClass">
        <span>Entreprise analysée</span>

        <strong class="risk-company-name">
          {{ store.company?.name || 'Aucune entreprise sélectionnée' }}
        </strong>

        <small>
          Risque actuel :
          {{ store.currentRisk?.level || 'non calculé' }}
          <template v-if="store.currentRisk">
            · {{ store.currentRisk.score }}/100
          </template>
        </small>
      </div>
    </div>

    <div v-if="store.error" class="alert error">
      {{ store.error }}
    </div>

    <div class="grid cards-grid">
      <article class="card">
        <span class="step">1</span>
        <h2>Entreprise</h2>
        <p>
          Crée plusieurs entreprises fictives, puis sélectionne celle que tu veux analyser.
        </p>
        <RouterLink class="text-link" to="/company">
          Gérer les entreprises →
        </RouterLink>
      </article>

      <article class="card">
        <span class="step">2</span>
        <h2>Actifs</h2>
        <p>
          Ajoute les serveurs, bases de données, postes utilisateurs, routeurs,
          pare-feu et applications métier.
        </p>
        <RouterLink class="text-link" to="/assets">
          Gérer les actifs →
        </RouterLink>
      </article>

      <article class="card">
        <span class="step">3</span>
        <h2>Vulnérabilités</h2>
        <p>
          Associe les failles aux actifs et choisis une criticité faible,
          moyenne ou élevée.
        </p>
        <RouterLink class="text-link" to="/vulnerabilities">
          Gérer les vulnérabilités →
        </RouterLink>
      </article>

      <article class="card">
        <span class="step">4</span>
        <h2>Rapport final</h2>
        <p>
          Génère une synthèse avec inventaire, score de risque et recommandations
          de sécurité.
        </p>
        <RouterLink class="text-link" to="/report">
          Voir le rapport →
        </RouterLink>
      </article>
    </div>

    <section class="card status-card">
      <div>
        <h2>État du projet</h2>
        <p>Frontend Vue connecté à l'API Express via Fetch API et Pinia.</p>
      </div>

      <div class="status-list">
        <span>{{ store.companies.length }} entreprise(s)</span>
        <span>{{ store.company?.name || 'Aucune entreprise active' }}</span>
        <span>{{ store.assets.length }} actif(s)</span>
        <span>{{ store.vulnerabilities.length }} vulnérabilité(s)</span>
      </div>
    </section>
  </section>
</template>