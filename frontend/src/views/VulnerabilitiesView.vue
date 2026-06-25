<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { RouterLink } from 'vue-router';
import { useCyberStore } from '@/stores/cyberStore';

const store = useCyberStore();
const editingId = ref(null);

const form = reactive({
  assetId: '',
  name: '',
  criticality: 'moyenne',
  description: ''
});

onMounted(async () => {
  store.loading = true;
  store.clearMessages();

  try {
    await store.fetchCompanies();
    await store.fetchCompany();
    await Promise.all([store.fetchAssets(), store.fetchVulnerabilities()]);
  } catch (error) {
    store.setError(error);
  } finally {
    store.loading = false;
  }
});

const sortedVulnerabilities = computed(() =>
  [...store.vulnerabilities].sort((a, b) => a.id - b.id)
);

const highCriticalityCount = computed(() =>
  store.vulnerabilities.filter((vulnerability) =>
    ['élevée', 'élevé'].includes(vulnerability.criticality)
  ).length
);

function resetForm() {
  editingId.value = null;
  form.assetId = '';
  form.name = '';
  form.criticality = 'moyenne';
  form.description = '';
}

function editVulnerability(vulnerability) {
  editingId.value = vulnerability.id;
  form.assetId = vulnerability.assetId;
  form.name = vulnerability.name;
  form.criticality = vulnerability.criticality;
  form.description = vulnerability.description || '';
}

async function submitVulnerability() {
  const payload = {
    assetId: Number(form.assetId),
    name: form.name.trim(),
    criticality: form.criticality,
    description: form.description.trim()
  };

  if (editingId.value) {
    await store.updateVulnerability(editingId.value, payload);
  } else {
    await store.createVulnerability(payload);
  }

  resetForm();
}

async function removeVulnerability(vulnerability) {
  const confirmed = window.confirm(`Supprimer la vulnérabilité "${vulnerability.name}" ?`);

  if (confirmed) {
    await store.deleteVulnerability(vulnerability.id);

    if (editingId.value === vulnerability.id) {
      resetForm();
    }
  }
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
        <p class="eyebrow">Analyse des failles</p>
        <h1>Vulnérabilités</h1>
        <p class="lead">
          Associe des vulnérabilités aux actifs de l’entreprise sélectionnée et définis leur
          niveau de criticité pour alimenter le calcul du risque cyber.
        </p>
      </div>

      <div class="status-list">
        <span>{{ store.vulnerabilities.length }} vulnérabilité(s)</span>
        <span class="summary-pill danger-light">
          {{ highCriticalityCount }} critique(s)
        </span>
      </div>
    </div>

    <div v-if="store.company" class="alert info">
      Entreprise active : <strong>{{ store.company.name }}</strong>
    </div>

    <div v-if="store.error" class="alert error">{{ store.error }}</div>
    <div v-if="store.success" class="alert success">{{ store.success }}</div>

    <div v-if="!store.company" class="card empty-state">
      <h2>Aucune entreprise sélectionnée</h2>
      <p>Crée ou sélectionne une entreprise avant d’ajouter des vulnérabilités.</p>
      <RouterLink class="button primary" to="/company">
        Gérer les entreprises
      </RouterLink>
    </div>

    <div v-else-if="!store.assets.length" class="card empty-state">
      <h2>Aucun actif disponible</h2>
      <p>
        Tu dois d’abord ajouter au moins un actif informatique avant de pouvoir lui associer
        une vulnérabilité.
      </p>
      <RouterLink class="button primary" to="/assets">
        Ajouter un actif
      </RouterLink>
    </div>

    <div v-else class="split-layout">
      <form class="card form-card" @submit.prevent="submitVulnerability">
        <h2>{{ editingId ? 'Modifier une vulnérabilité' : 'Ajouter une vulnérabilité' }}</h2>

        <label>
          Actif concerné
          <select v-model="form.assetId" required>
            <option disabled value="">Choisir un actif</option>
            <option v-for="asset in store.assets" :key="asset.id" :value="asset.id">
              {{ asset.name }} — {{ asset.type }}
            </option>
          </select>
        </label>

        <label>
          Nom de la vulnérabilité
          <input v-model="form.name" required placeholder="Ex : Logiciel obsolète" />
        </label>

        <label>
          Criticité
          <select v-model="form.criticality" required>
            <option
              v-for="level in store.criticalityLevels"
              :key="level"
              :value="level"
            >
              {{ level }}
            </option>
          </select>
        </label>

        <label>
          Description
          <textarea
            v-model="form.description"
            placeholder="Décris brièvement la faille, son origine ou son impact."
          />
        </label>

        <div class="actions-row">
          <button class="button primary" type="submit" :disabled="store.loading">
            {{ editingId ? 'Enregistrer' : 'Ajouter' }}
          </button>

          <button
            v-if="editingId"
            class="button secondary"
            type="button"
            @click="resetForm"
          >
            Annuler
          </button>
        </div>
      </form>

      <div class="card table-card">
        <div class="card-header">
          <h2>Liste des vulnérabilités</h2>
          <span class="muted">{{ store.company.name }}</span>
        </div>

        <div v-if="store.loading" class="empty-state">
          Chargement des vulnérabilités...
        </div>

        <div v-else-if="!sortedVulnerabilities.length" class="empty-state">
          Aucune vulnérabilité pour cette entreprise. Ajoute la première avec le formulaire.
        </div>

        <div v-else class="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Vulnérabilité</th>
                <th>Actif concerné</th>
                <th>Criticité</th>
                <th>Description</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              <tr
                v-for="vulnerability in sortedVulnerabilities"
                :key="vulnerability.id"
              >
                <td>
                  <strong>{{ vulnerability.name }}</strong>
                  <small>#{{ vulnerability.id }}</small>
                </td>

                <td>
                  {{ store.assetNameById[vulnerability.assetId] || `Actif #${vulnerability.assetId}` }}
                </td>

                <td>
                  <span :class="['badge', riskClass(vulnerability.criticality)]">
                    {{ vulnerability.criticality }}
                  </span>
                </td>

                <td class="description-cell">
                  {{ vulnerability.description || 'Aucune description.' }}
                </td>

                <td class="table-actions">
                  <button
                    class="icon-button"
                    type="button"
                    @click="editVulnerability(vulnerability)"
                  >
                    Modifier
                  </button>

                  <button
                    class="icon-button danger-text"
                    type="button"
                    @click="removeVulnerability(vulnerability)"
                  >
                    Supprimer
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </section>
</template>