import { defineStore } from 'pinia';

export const useCyberStore = defineStore('cyber', {
  state: () => ({
    ready: true
  })
});
