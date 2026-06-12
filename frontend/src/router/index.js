import { createRouter, createWebHistory } from 'vue-router';
import HomeView from '@/views/HomeView.vue';
import CompanyView from '@/views/CompanyView.vue';
import AssetsView from '@/views/AssetsView.vue';
import VulnerabilitiesView from '@/views/VulnerabilitiesView.vue';
import DashboardView from '@/views/DashboardView.vue';
import ReportView from '@/views/ReportView.vue';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'home', component: HomeView },
    { path: '/company', name: 'company', component: CompanyView },
    { path: '/assets', name: 'assets', component: AssetsView },
    { path: '/vulnerabilities', name: 'vulnerabilities', component: VulnerabilitiesView },
    { path: '/dashboard', name: 'dashboard', component: DashboardView },
    { path: '/report', name: 'report', component: ReportView }
  ]
});

export default router;
