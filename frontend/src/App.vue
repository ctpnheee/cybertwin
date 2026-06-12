<script setup>
const links = [
  { to: '/', label: 'Accueil' },
  { to: '/company', label: 'Entreprise' },
  { to: '/assets', label: 'Actifs' },
  { to: '/vulnerabilities', label: 'Vulnerabilites' },
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/report', label: 'Rapport' }
];
</script>

<template>
  <div>
    <header class="app-header">
      <RouterLink class="brand" to="/">CyberTwin</RouterLink>
      <nav>
        <RouterLink v-for="link in links" :key="link.to" :to="link.to">
          {{ link.label }}
        </RouterLink>
      </nav>
    </header>

    <main class="content">
      <RouterView />
    </main>
  </div>
</template>
