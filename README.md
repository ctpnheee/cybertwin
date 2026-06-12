# CyberTwin

Base de projet fullstack pour le sujet **Simulateur de Risque Cyber pour PME**.

Le projet contient uniquement la structure de depart. Les fonctionnalites sont a implementer.

## Stack

- Frontend : Vue 3 avec Vite, Vue Router, Pinia
- Backend : Node.js, Express
- Donnees : fichier JSON local dans `backend/data/db.json`

## Installation

```bash
npm install
```

## Lancer le backend

```bash
npm run dev:backend
```

API disponible sur `http://localhost:3000`.

## Lancer le frontend

```bash
npm run dev:frontend
```

Application disponible sur `http://localhost:5173`.

## Pages prevues

- Accueil
- Entreprise
- Actifs
- Vulnerabilites
- Dashboard
- Rapport

## Backend de base

- `GET /health`
