# CyberTwin — Simulateur de Risque Cyber pour PME

CyberTwin est une application web fullstack développée avec **Vue.js** et **Node.js / Express**.  
Elle permet de modéliser une ou plusieurs entreprises fictives, d’inventorier leurs actifs informatiques, d’associer des vulnérabilités à ces actifs, puis de calculer automatiquement un niveau de risque cyber.

Le projet répond au sujet : **Développement Fullstack avec Vue.js et Node.js — CyberTwin, Simulateur de Risque Cyber pour PME**.

---

## Objectif du projet

La cybersécurité est devenue un enjeu important pour les PME.  
Ces entreprises disposent souvent de plusieurs actifs numériques : serveurs, postes utilisateurs, applications métier, bases de données, routeurs ou services exposés sur Internet.

L’objectif de CyberTwin est de créer un **jumeau numérique simplifié** d’une entreprise afin de :

1. décrire l’entreprise ;
2. recenser ses actifs informatiques ;
3. identifier les vulnérabilités associées ;
4. calculer un score de risque ;
5. afficher des indicateurs dans un tableau de bord ;
6. générer un rapport final avec recommandations.

CyberTwin n’est pas un outil d’audit de sécurité réel. C’est un simulateur pédagogique permettant de comprendre comment plusieurs facteurs peuvent influencer le niveau de risque cyber d’une organisation.

---

## Fonctionnalités principales

### Gestion multi-entreprises

L’application permet de gérer plusieurs entreprises fictives.

Fonctionnalités disponibles :

- créer une nouvelle entreprise ;
- consulter la liste des entreprises ;
- sélectionner l’entreprise active ;
- modifier une entreprise existante ;
- supprimer une entreprise ;
- afficher l’entreprise active dans la barre de navigation ;
- isoler les actifs, vulnérabilités, statistiques et rapports par entreprise.

Chaque entreprise possède les informations suivantes :

- nom ;
- secteur d’activité ;
- nombre d’employés ;
- nombre de serveurs ;
- nombre de postes clients ;
- services exposés sur Internet.

---

### Gestion des actifs informatiques

L’application permet de gérer les actifs liés à l’entreprise active.

Fonctionnalités disponibles :

- ajouter un actif ;
- consulter la liste des actifs ;
- modifier un actif ;
- supprimer un actif ;
- afficher le nombre de vulnérabilités associées à chaque actif ;
- indiquer si l’actif est exposé sur Internet.

Types d’actifs disponibles :

- Serveur Web ;
- Base de données ;
- Poste utilisateur ;
- Routeur ;
- Pare-feu ;
- Application métier.

---

### Gestion des vulnérabilités

L’application permet d’associer des vulnérabilités aux actifs de l’entreprise active.

Fonctionnalités disponibles :

- ajouter une vulnérabilité ;
- modifier une vulnérabilité ;
- supprimer une vulnérabilité ;
- choisir l’actif concerné ;
- définir une criticité ;
- ajouter une description.

Criticités disponibles :

- faible ;
- moyenne ;
- élevée.

Exemples de vulnérabilités :

- Logiciel obsolète ;
- Mot de passe faible ;
- Port exposé ;
- Absence de sauvegarde ;
- Service non chiffré ;
- Compte administrateur partagé ;
- Antivirus désactivé.

---

### Calcul automatique du risque cyber

Le backend contient un moteur de calcul du risque.

Le score prend en compte :

- le nombre total d’actifs ;
- le nombre total de vulnérabilités ;
- la criticité des vulnérabilités ;
- les actifs exposés sur Internet ;
- les vulnérabilités présentes sur des actifs exposés ;
- le nombre de services exposés au niveau de l’entreprise.

Le résultat contient :

- un score sur 100 ;
- un niveau de risque : faible, moyen ou élevé ;
- un détail du calcul ;
- des recommandations de sécurité.

---

### Tableau de bord

Le dashboard affiche les indicateurs principaux de l’entreprise sélectionnée :

- nombre total d’actifs ;
- nombre total de vulnérabilités ;
- nombre d’actifs exposés sur Internet ;
- score de risque global ;
- niveau de risque ;
- répartition des actifs par type ;
- répartition des vulnérabilités par criticité ;
- recommandations principales.

Les graphiques sont réalisés en CSS sous forme de barres horizontales.

---

### Rapport final

L’application génère un rapport de risque cyber contenant :

- la présentation de l’entreprise ;
- l’inventaire des actifs ;
- les vulnérabilités détectées ;
- le résultat du calcul de risque ;
- les recommandations de sécurité.

La page Rapport propose deux actions :

- **Télécharger** : télécharge le rapport en fichier HTML ;
- **Imprimer / PDF** : ouvre l’impression du navigateur, permettant aussi d’enregistrer en PDF.

---

## Technologies utilisées

### Frontend

- Vue.js 3
- Vite
- Vue Router
- Pinia
- Fetch API
- CSS responsive

### Backend

- Node.js
- Express.js
- API REST
- CORS
- Stockage local JSON

### Tests

- node:test
- supertest
- tests unitaires du moteur de risque
- tests d’intégration des routes API

---

## Architecture du projet

Le projet est organisé en deux parties principales :

```txt
cybertwin/
├── backend/
│   ├── data/
│   │   └── db.json
│   ├── src/
│   │   ├── app.js
│   │   ├── server.js
│   │   ├── db.js
│   │   ├── constants.js
│   │   ├── utils.js
│   │   ├── routes/
│   │   │   ├── company.js
│   │   │   ├── assets.js
│   │   │   ├── vulnerabilities.js
│   │   │   ├── risk.js
│   │   │   ├── dashboard.js
│   │   │   └── report.js
│   │   └── services/
│   │       └── riskEngine.js
│   ├── test/
│   │   ├── api.test.js
│   │   ├── helpers.js
│   │   ├── mock.test.js
│   │   └── riskEngine.test.js
│   └── package.json
│
├── frontend/
│   ├── index.html
│   ├── vite.config.js
│   ├── package.json
│   └── src/
│       ├── main.js
│       ├── App.vue
│       ├── styles.css
│       ├── router/
│       │   └── index.js
│       ├── services/
│       │   └── api.js
│       ├── stores/
│       │   └── cyberStore.js
│       └── views/
│           ├── HomeView.vue
│           ├── CompanyView.vue
│           ├── AssetsView.vue
│           ├── VulnerabilitiesView.vue
│           ├── DashboardView.vue
│           └── ReportView.vue
│
├── package.json
├── package-lock.json
└── README.md