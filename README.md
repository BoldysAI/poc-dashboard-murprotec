# POC Dashboard Financier MurProtec

Application Next.js (App Router) portant les dashboards **Trésorerie Groupe** et **Reporting Financier**.

## Prérequis

- Node.js 20+
- npm

## Développement

```bash
npm install
npm run dev
```

Ouvre [http://localhost:3000](http://localhost:3000) — redirection vers `/tresorerie`.

## Build

```bash
npm run build
npm start
```

Le build produit un bundle **standalone** (`.next/standalone`) pour déploiement sur l’infra IT du Client.

## Notes

- Pas de base de données ni d’authentification (utilisateur unique POC).
- Les données parsées vivent en mémoire côté client le temps de la session ; un refresh efface tout.
