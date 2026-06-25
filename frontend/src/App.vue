<script setup>
import { onMounted } from 'vue';
import { useCyberStore } from '@/stores/cyberStore';

const store = useCyberStore();

const links = [
  { to: '/', label: 'Accueil' },
  { to: '/company', label: 'Entreprise' },
  { to: '/assets', label: 'Actifs' },
  { to: '/vulnerabilities', label: 'Vulnérabilités' },
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/report', label: 'Rapport' }
];

onMounted(() => {
  store.refreshAll();
});

async function handleCompanyChange(event) {
  const id = Number(event.target.value);
  if (id && id !== store.currentCompanyId) {
    await store.selectCompany(id);
  }
}
</script>

<template>
  <div class="app-shell">
    <header class="app-header">
      <RouterLink class="brand" to="/">
        <span class="brand-icon">CT</span>
        <span>CyberTwin</span>
      </RouterLink>

      <div class="header-right">
        <label v-if="store.companies.length" class="header-company-select">
          <span>Entreprise</span>
          <select :value="store.currentCompanyId || ''" @change="handleCompanyChange">
            <option disabled value="">Choisir une entreprise</option>
            <option v-for="company in store.companies" :key="company.id" :value="company.id">
              {{ company.name }}
            </option>
          </select>
        </label>
        <RouterLink v-else class="header-company-empty" to="/company">
          Ajouter une entreprise
        </RouterLink>

        <nav aria-label="Navigation principale">
          <RouterLink v-for="link in links" :key="link.to" :to="link.to">
            {{ link.label }}
          </RouterLink>
        </nav>
      </div>
    </header>

    <main class="content">
      <RouterView />
    </main>
  </div>
</template>