<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { RouterLink } from 'vue-router';
import { useCyberStore } from '@/stores/cyberStore';

const store = useCyberStore();
const editingId = ref(null);

const form = reactive({
  name: '',
  type: 'Serveur Web',
  exposedToInternet: false
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

const sortedAssets = computed(() => [...store.assets].sort((a, b) => a.id - b.id));

function resetForm() {
  editingId.value = null;
  form.name = '';
  form.type = 'Serveur Web';
  form.exposedToInternet = false;
}

function editAsset(asset) {
  editingId.value = asset.id;
  form.name = asset.name;
  form.type = asset.type;
  form.exposedToInternet = Boolean(asset.exposedToInternet);
}

async function submitAsset() {
  const payload = {
    name: form.name.trim(),
    type: form.type,
    exposedToInternet: Boolean(form.exposedToInternet)
  };

  if (editingId.value) {
    await store.updateAsset(editingId.value, payload);
  } else {
    await store.createAsset(payload);
  }

  resetForm();
}

async function removeAsset(asset) {
  const confirmed = window.confirm(
    `Supprimer l'actif "${asset.name}" ? Les vulnérabilités associées seront aussi supprimées.`
  );
  if (confirmed) {
    await store.deleteAsset(asset.id);
    if (editingId.value === asset.id) resetForm();
  }
}

function vulnerabilityCount(asset) {
  return store.vulnerabilitiesByAsset[asset.id]?.length || 0;
}
</script>

<template>
  <section class="page">
    <div class="page-heading">
      <div>
        <p class="eyebrow">Inventaire</p>
        <h1>Actifs informatiques</h1>
        <p class="lead">
          Ajoute les ressources importantes de l'entreprise sélectionnée : serveurs, bases de données,
          postes utilisateurs, routeurs, pare-feu et applications métier.
        </p>
      </div>
      <div class="summary-pill">{{ store.assets.length }} actif(s)</div>
    </div>

    <div v-if="store.company" class="alert info">
      Entreprise active : <strong>{{ store.company.name }}</strong>
    </div>

    <div v-if="store.error" class="alert error">{{ store.error }}</div>
    <div v-if="store.success" class="alert success">{{ store.success }}</div>

    <div v-if="!store.company" class="card empty-state">
      <h2>Aucune entreprise sélectionnée</h2>
      <p>Crée ou sélectionne une entreprise avant d'ajouter des actifs.</p>
      <RouterLink class="button primary" to="/company">Gérer les entreprises</RouterLink>
    </div>

    <div v-else class="split-layout">
      <form class="card form-card" @submit.prevent="submitAsset">
        <h2>{{ editingId ? 'Modifier un actif' : 'Ajouter un actif' }}</h2>

        <label>
          Nom de l'actif
          <input v-model="form.name" required placeholder="Ex : Serveur e-commerce" />
        </label>

        <label>
          Type d'actif
          <select v-model="form.type" required>
            <option v-for="type in store.assetTypes" :key="type" :value="type">{{ type }}</option>
          </select>
        </label>

        <label class="checkbox-line">
          <input v-model="form.exposedToInternet" type="checkbox" />
          <span>Actif exposé sur Internet</span>
        </label>

        <div class="actions-row">
          <button class="button primary" type="submit" :disabled="store.loading">
            {{ editingId ? 'Enregistrer' : 'Ajouter' }}
          </button>
          <button v-if="editingId" class="button secondary" type="button" @click="resetForm">
            Annuler
          </button>
        </div>
      </form>

      <div class="card table-card">
        <div class="card-header">
          <h2>Liste des actifs</h2>
          <span class="muted">{{ store.company.name }}</span>
        </div>

        <div v-if="store.loading" class="empty-state">Chargement des actifs...</div>
        <div v-else-if="!sortedAssets.length" class="empty-state">
          Aucun actif pour cette entreprise. Ajoute le premier actif avec le formulaire.
        </div>

        <div v-else class="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Nom</th>
                <th>Type</th>
                <th>Exposition</th>
                <th>Failles</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="asset in sortedAssets" :key="asset.id">
                <td>
                  <strong>{{ asset.name }}</strong>
                  <small>#{{ asset.id }}</small>
                </td>
                <td><span class="chip">{{ asset.type }}</span></td>
                <td>
                  <span :class="['badge', asset.exposedToInternet ? 'danger' : 'safe']">
                    {{ asset.exposedToInternet ? 'Exposé' : 'Interne' }}
                  </span>
                </td>
                <td>{{ vulnerabilityCount(asset) }}</td>
                <td class="table-actions">
                  <button class="icon-button" type="button" @click="editAsset(asset)">Modifier</button>
                  <button class="icon-button danger-text" type="button" @click="removeAsset(asset)">Supprimer</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </section>
</template>