import { defineStore } from 'pinia';
import { api } from '@/services/api';

export const useCyberStore = defineStore('cyber', {
  state: () => ({
    companies: [],
    company: null,
    assets: [],
    vulnerabilities: [],
    dashboard: null,
    report: null,
    loading: false,
    error: null,
    success: null,
    assetTypes: [
      'Serveur Web',
      'Base de données',
      'Poste utilisateur',
      'Routeur',
      'Pare-feu',
      'Application métier'
    ],
    criticalityLevels: ['faible', 'moyenne', 'élevée'],
    vulnerabilitySuggestions: [
      'Logiciel obsolète',
      'Mot de passe faible',
      'Port exposé',
      'Absence de sauvegarde',
      'Service non chiffré',
      'Compte administrateur partagé',
      'Antivirus désactivé'
    ]
  }),

  getters: {
    hasCompany: (state) => Boolean(state.company),
    currentCompanyId: (state) => state.company?.id || null,
    vulnerabilitiesByAsset: (state) => {
      return state.vulnerabilities.reduce((acc, vuln) => {
        acc[vuln.assetId] = acc[vuln.assetId] || [];
        acc[vuln.assetId].push(vuln);
        return acc;
      }, {});
    },
    assetNameById: (state) => {
      return state.assets.reduce((acc, asset) => {
        acc[asset.id] = asset.name;
        return acc;
      }, {});
    },
    currentRisk: (state) => state.dashboard?.risk || state.report?.risk || null
  },

  actions: {
    clearMessages() {
      this.error = null;
      this.success = null;
    },

    setError(error) {
      const details = Array.isArray(error?.details) && error.details.length > 0
        ? ` (${error.details.join(' ')})`
        : '';
      this.error = `${error?.message || 'Une erreur est survenue.'}${details}`;
    },

    resetScopedData() {
      this.assets = [];
      this.vulnerabilities = [];
      this.dashboard = null;
      this.report = null;
    },

    async run(action, successMessage = null) {
      this.loading = true;
      this.clearMessages();
      try {
        const result = await action();
        if (successMessage) {
          this.success = successMessage;
        }
        return result;
      } catch (error) {
        this.setError(error);
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async fetchCompanies() {
      this.companies = await api.get('/company/all');
      return this.companies;
    },

    async fetchCompany() {
      try {
        this.company = await api.get('/company');
      } catch (error) {
        if (error.status === 404) {
          this.company = null;
          this.resetScopedData();
          return null;
        }
        this.setError(error);
        throw error;
      }
      return this.company;
    },

    async createCompany(payload) {
      return this.run(async () => {
        this.company = await api.post('/company', payload);
        await this.fetchCompanies();
        await this.refreshAssetsAndComputedData();
        return this.company;
      }, 'Nouvelle entreprise créée et sélectionnée.');
    },

    async updateCompany(id, payload) {
      return this.run(async () => {
        this.company = await api.put(`/company/${id}`, payload);
        await this.fetchCompanies();
        await this.refreshComputedData();
        return this.company;
      }, 'Fiche entreprise modifiée.');
    },

    async saveCompany(payload) {
      return this.company
        ? this.updateCompany(this.company.id, payload)
        : this.createCompany(payload);
    },

    async selectCompany(id) {
      return this.run(async () => {
        this.company = await api.post(`/company/${id}/select`, {});
        await this.fetchCompanies();
        await this.refreshAssetsAndComputedData();
        return this.company;
      }, 'Entreprise sélectionnée.');
    },

    async deleteCompany(id) {
      return this.run(async () => {
        await api.delete(`/company/${id}`);
        await this.fetchCompanies();
        await this.fetchCompany();
        await this.refreshAssetsAndComputedData();
      }, 'Entreprise supprimée.');
    },

    async fetchAssets() {
      this.assets = await api.get('/assets');
      return this.assets;
    },

    async createAsset(payload) {
      return this.run(async () => {
        await api.post('/assets', payload);
        await this.refreshAssetsAndComputedData();
      }, 'Actif ajouté.');
    },

    async updateAsset(id, payload) {
      return this.run(async () => {
        await api.put(`/assets/${id}`, payload);
        await this.refreshAssetsAndComputedData();
      }, 'Actif modifié.');
    },

    async deleteAsset(id) {
      return this.run(async () => {
        await api.delete(`/assets/${id}`);
        await this.refreshAssetsAndComputedData();
      }, 'Actif supprimé.');
    },

    async fetchVulnerabilities() {
      this.vulnerabilities = await api.get('/vulnerabilities');
      return this.vulnerabilities;
    },

    async createVulnerability(payload) {
      return this.run(async () => {
        await api.post('/vulnerabilities', payload);
        await this.refreshAssetsAndComputedData();
      }, 'Vulnérabilité ajoutée.');
    },

    async updateVulnerability(id, payload) {
      return this.run(async () => {
        await api.put(`/vulnerabilities/${id}`, payload);
        await this.refreshAssetsAndComputedData();
      }, 'Vulnérabilité modifiée.');
    },

    async deleteVulnerability(id) {
      return this.run(async () => {
        await api.delete(`/vulnerabilities/${id}`);
        await this.refreshAssetsAndComputedData();
      }, 'Vulnérabilité supprimée.');
    },

    async calculateRisk() {
      return this.run(async () => {
        const risk = await api.post('/risk/calculate', {});
        this.dashboard = {
          ...(this.dashboard || {}),
          risk
        };
        return risk;
      });
    },

    async fetchDashboard() {
      this.dashboard = await api.get('/dashboard');
      return this.dashboard;
    },

    async fetchReport() {
      try {
        this.report = await api.get('/report');
      } catch (error) {
        if (error.status === 404) {
          this.report = null;
          return null;
        }
        this.setError(error);
        throw error;
      }
      return this.report;
    },

    async refreshComputedData() {
      await Promise.allSettled([this.fetchDashboard(), this.fetchReport()]);
    },

    async refreshAssetsAndComputedData() {
      await Promise.all([this.fetchAssets(), this.fetchVulnerabilities()]);
      await this.refreshComputedData();
    },

    async refreshAll() {
      this.loading = true;
      this.clearMessages();
      try {
        await this.fetchCompanies();
        await this.fetchCompany();
        await Promise.all([this.fetchAssets(), this.fetchVulnerabilities()]);
        await this.refreshComputedData();
      } catch (error) {
        this.setError(error);
      } finally {
        this.loading = false;
      }
    }
  }
});