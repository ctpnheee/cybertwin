<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useCyberStore } from '@/stores/cyberStore';

const store = useCyberStore();
const editingId = ref(null);
const createMode = ref(false);

const form = reactive({
  name: '',
  sector: '',
  employees: 0,
  servers: 0,
  clients: 0,
  exposedServicesText: ''
});

function fillForm(company) {
  if (!company) return;
  editingId.value = company.id;
  createMode.value = false;
  form.name = company.name || '';
  form.sector = company.sector || '';
  form.employees = company.employees ?? 0;
  form.servers = company.servers ?? 0;
  form.clients = company.clients ?? 0;
  form.exposedServicesText = Array.isArray(company.exposedServices)
    ? company.exposedServices.join('\n')
    : '';
}

function newCompanyForm() {
  editingId.value = null;
  createMode.value = true;
  form.name = '';
  form.sector = '';
  form.employees = 0;
  form.servers = 0;
  form.clients = 0;
  form.exposedServicesText = '';
}

onMounted(async () => {
  await store.refreshAll();
  if (store.company) fillForm(store.company);
  else newCompanyForm();
});

watch(() => store.company, (company) => {
  if (company && !createMode.value) fillForm(company);
});

const exposedServices = computed(() => form.exposedServicesText
  .split(/\n|,/)
  .map((service) => service.trim())
  .filter(Boolean));

const formTitle = computed(() => {
  if (createMode.value || !editingId.value) return 'Ajouter une entreprise';
  return 'Modifier l’entreprise sélectionnée';
});

async function submitCompany() {
  const payload = {
    name: form.name.trim(),
    sector: form.sector.trim(),
    employees: Number(form.employees),
    servers: Number(form.servers),
    clients: Number(form.clients),
    exposedServices: exposedServices.value
  };

  if (createMode.value || !editingId.value) {
    await store.createCompany(payload);
  } else {
    await store.updateCompany(editingId.value, payload);
  }

  fillForm(store.company);
}

async function selectCompany(company) {
  await store.selectCompany(company.id);
  fillForm(store.company);
}

function editCompany(company) {
  fillForm(company);
}

async function removeCompany(company) {
  const confirmed = window.confirm(
    `Supprimer l'entreprise "${company.name}" ? Ses actifs et vulnérabilités seront aussi supprimés.`
  );
  if (!confirmed) return;
  await store.deleteCompany(company.id);
  if (store.company) fillForm(store.company);
  else newCompanyForm();
}
</script>

<template>
  <section class="page company-page">
    <div class="page-heading">
      <div>
        <p class="eyebrow">Configuration</p>
        <h1>Entreprises</h1>
        <p class="lead">
          Ajoute plusieurs entreprises fictives, sélectionne celle à analyser, puis gère ses actifs,
          vulnérabilités, dashboard et rapport séparément.
        </p>
      </div>
      <div class="summary-pill">{{ store.companies.length }} entreprise(s)</div>
    </div>

    <div v-if="store.error" class="alert error">{{ store.error }}</div>
    <div v-if="store.success" class="alert success">{{ store.success }}</div>

    <div class="split-layout company-layout">
      <form class="card form-card" @submit.prevent="submitCompany">
        <div class="card-header">
          <h2>{{ formTitle }}</h2>
          <button class="button secondary" type="button" @click="newCompanyForm">
            Nouvelle entreprise
          </button>
        </div>

        <div class="form-grid">
          <label>
            Nom de l'entreprise
            <input v-model="form.name" required placeholder="Ex : BoulangePro SAS" />
          </label>

          <label>
            Secteur d'activité
            <input v-model="form.sector" required placeholder="Ex : Agroalimentaire" />
          </label>

          <label>
            Nombre d'employés
            <input v-model.number="form.employees" required min="0" type="number" />
          </label>

          <label>
            Nombre de serveurs
            <input v-model.number="form.servers" required min="0" type="number" />
          </label>

          <label>
            Nombre de postes clients
            <input v-model.number="form.clients" required min="0" type="number" />
          </label>

          <label class="full-row">
            Services exposés sur Internet
            <textarea
              v-model="form.exposedServicesText"
              rows="5"
              placeholder="Un service par ligne : Site e-commerce, VPN, Messagerie..."
            />
          </label>
        </div>

        <div class="actions-row">
          <button class="button primary" type="submit" :disabled="store.loading">
            {{ createMode || !editingId ? 'Créer l’entreprise' : 'Enregistrer les modifications' }}
          </button>
          <span v-if="store.loading" class="muted">Enregistrement...</span>
        </div>
      </form>

      <aside class="card companies-card">
        <div class="card-header">
          <h2>Liste des entreprises</h2>
          <span class="muted">Entreprise active : {{ store.company?.name || 'Aucune' }}</span>
        </div>

        <div v-if="store.loading && !store.companies.length" class="empty-state">
          Chargement des entreprises...
        </div>

        <div v-else-if="!store.companies.length" class="empty-state">
          Aucune entreprise créée. Utilise le formulaire pour ajouter la première.
        </div>

        <div v-else class="company-list">
          <article
            v-for="company in store.companies"
            :key="company.id"
            :class="['company-item', { active: company.id === store.company?.id }]"
          >
            <div>
              <strong>{{ company.name }}</strong>
              <p>{{ company.sector }}</p>
              <small>#{{ company.id }} · {{ company.employees }} employé(s)</small>
            </div>
            <div class="company-actions">
              <button
                class="icon-button"
                type="button"
                :disabled="company.id === store.company?.id"
                @click="selectCompany(company)"
              >
                {{ company.id === store.company?.id ? 'Active' : 'Sélectionner' }}
              </button>
              <button class="icon-button" type="button" @click="editCompany(company)">Modifier</button>
              <button class="icon-button danger-text" type="button" @click="removeCompany(company)">Supprimer</button>
            </div>
          </article>
        </div>
      </aside>
    </div>

    <aside class="card preview-card company-preview">
      <h2>Fiche descriptive</h2>
      <dl class="info-list">
        <div><dt>Nom</dt><dd>{{ form.name || 'Non renseigné' }}</dd></div>
        <div><dt>Secteur</dt><dd>{{ form.sector || 'Non renseigné' }}</dd></div>
        <div><dt>Employés</dt><dd>{{ form.employees }}</dd></div>
        <div><dt>Serveurs</dt><dd>{{ form.servers }}</dd></div>
        <div><dt>Postes clients</dt><dd>{{ form.clients }}</dd></div>
      </dl>

      <h3>Services exposés</h3>
      <div v-if="exposedServices.length" class="chips">
        <span v-for="service in exposedServices" :key="service" class="chip warning">{{ service }}</span>
      </div>
      <p v-else class="muted">Aucun service exposé renseigné.</p>
    </aside>
  </section>
</template>