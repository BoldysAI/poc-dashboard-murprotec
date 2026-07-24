# AGENTS.md — POC Dashboard Financier MurProtec

> Règles pour agents IA de code (Cursor, Claude Code) **et** développeurs.
> Source unique transverse, **chargée à chaque appel — garde-la courte (~200 lignes)**.
> `CLAUDE.md` importe ce fichier (`@AGENTS.md`).
> Détail mécanique (playbooks chargés à la demande) → `docs/agent/`.

---

## 1. Le projet en une page

POC web pour **MurProtec / Murpro Group** (utilisateur unique : Thomas Di Donato).
Deux dashboards indépendants, alimentés par **upload Excel manuel** ; données en session navigateur (cache local jusqu’à reset) :

1. **Trésorerie Groupe** (`/tresorerie`) — indicateurs de trésorerie consolidés.
2. **Reporting Financier** (`/reporting`) — comptes de résultat multi-agences (onglets Excel, hors Chiffres Clés / Synthèse).

Frontend + parsing + calculs d’affichage + export PDF dans **une seule app Next.js**.
Hébergement : infra IT Client (`output: 'standalone'`). Spec : `docs/CDC-POC-Dashboard-Financier.pdf` (CDC-MURPROTEC-001). En cas de contradiction avec l’Annexe Technique Projet-001, **l’AT fait foi** sur le périmètre contractuel.

---

## 2. Hiérarchie des sources (à respecter strictement)

1. **Le code + `package.json` / `package-lock.json`** — vérité opérationnelle.
2. **`docs/CDC-POC-Dashboard-Financier.pdf`** (+ AT si fournie) — vérité fonctionnelle et métier.
3. **Instructions explicites du développeur dans la session.**
4. **Docs officielles via Context7** (Next.js, React, SheetJS…) — §8, libs externes uniquement.

Règles absolues :
- **N’invente jamais** un indicateur, mapping de cellules, ou décision produit absent des sources 1–2.
- Info manquante → marque **undefined** et demande — ne comble pas avec une « best practice ».
- Spec vs code sur la stack → **le code gagne**. Spec vs code sur le métier/périmètre → **la spec gagne** ; documente dans `docs/agent/decisions.md`.

---

## 3. Stack (référence : `package.json` — ne jamais recopier les versions ici)

| Couche | Choix |
|---|---|
| App | **Next.js** (App Router) + React + TypeScript strict |
| Style | Tailwind CSS v4, tokens Murpro dans `src/app/globals.css` |
| État | React Context client — **mémoire session uniquement** |
| BDD / Auth / ORM | **Aucun** (CDC / AT §4.3) |
| Parsing Excel | **SheetJS `xlsx`** — routes `POST /api/parse/*` (mémoire, pas de disque) |
| Export PDF | `window.print()` + CSS `@page` A4 paysage (trésorerie + reporting) |
| Déploiement | `output: 'standalone'` (`next.config.ts`) |
| Qualité | ESLint (`eslint-config-next`), `tsc` via `next build` |

**N’ajoute jamais une dépendance** sans l’ajouter à `package.json` et régénérer `package-lock.json`.

---

## 4. Carte du dépôt

```
poc-dashboard-murprotec/
├── AGENTS.md / CLAUDE.md
├── docs/
│   ├── architecture.md  # doc technique plateforme (architecture)
│   ├── CDC-POC-Dashboard-Financier.pdf
│   ├── assets/          # logo + Excel de référence (ne pas parser en prod depuis docs/)
│   └── agent/           # playbooks + decisions.md
├── public/logo_murpro_group.png
├── src/
│   ├── app/             # routes : /, /tresorerie, /reporting
│   ├── components/      # UI (layout, EmptyState, …)
│   ├── contexts/        # DashboardDataProvider
│   └── types/           # TresorerieData, ReportingData
├── next.config.ts
└── package.json
```

---

## 5. Règles d’or (non négociables)

1. **Pas de BDD, pas d’auth, pas d’ORM** — utilisateur unique, accès direct (CDC / AT §4.3).
2. **État client** — `DashboardDataProvider` ; **cache `localStorage`** jusqu’à réinitialisation explicite (boutons reset / `clearAll`). Pas de BDD ni fichiers serveur. Exception POC documentée dans `decisions.md` (AT §4.3 = pas de serveur ; confort démo = cache navigateur).
3. **Deux briques indépendantes** — Trésorerie et Reporting ne partagent ni structure de données ni parsers. Pas de « modèle générique Excel » commun.
4. **Montants** — traiter comme des nombres exacts issus du fichier ; **pas de conversion de devises** (tout en EUR, confirmé Client). Pas de `float` inventé pour des agrégats métier hors spec.
5. **Périmètre AT** = 6 indicateurs trésorerie + 5 reporting. Éléments **🔶 post-AT** (composition dépenses, cahier de commande, impayés, euro/coupon) : intégrés au POC sur décision Yassine, **hors tarif AT** — ne les étends pas sans instruction.
6. **Charte Murpro** — primary `#29235C`, accent `#EBCA09`, surface `#EDECF1`, blanc `#FFFFFF`. Logo : `public/logo_murpro_group.png`.
7. **UI en français** — libellés, empty states, messages utilisateur.
8. **Secrets** — aucun secret dans le code ; ce POC n’en a pas besoin.
9. **Ne code pas hors tâche** — socle d’abord ; upload/parsing/PDF seulement quand la story le demande.
10. **Next.js 16** — APIs et conventions peuvent différer du training ; lire Context7 / `node_modules/next/dist/docs/` avant d’écrire du code framework.

---

## 6. Conventions de code

- TypeScript **`strict: true`** (`tsconfig.json`). Alias `@/*` → `src/*`.
- Composants client : directive `"use client"` uniquement si hooks / interactivité.
- Lint : `npm run lint` (eslint-config-next core-web-vitals + typescript).
- Styles : utilitaires Tailwind + tokens `@theme` — pas de raw hex ad hoc hors tokens.
- Types métier : `src/types/dashboard.ts` ; état : `src/contexts/dashboard-data-context.tsx`.

---

## 7. Docs à jour — Context7 obligatoire

Ton training est périmé sur **Next.js 16** / App Router. Avant d’écrire du code framework (routing, `next/image`, config, Server/Client Components), récupère la doc via **Context7**. Ne code pas les APIs Next de mémoire.

---

## 8. Workflow & commandes

```bash
npm install
npm run dev      # http://localhost:3000 → /tresorerie
npm run build    # produit aussi .next/standalone
npm start
npm run lint
```

**Definition of Done** :
- [ ] `npm run lint` propre
- [ ] `npm run build` sans erreur
- [ ] Types stricts respectés ; pas de `any` injustifié
- [ ] Aucune dépendance BDD/auth ajoutée
- [ ] Comportement aligné CDC (mapping / empty state) ; wipe données = reset explicite (pas le refresh)

---

## 9. Commits & PR

- **Conventional Commits** : `feat:`, `fix:`, `refactor:`, `chore:`, `test:`, `docs:`.
- Diffs **petits et ciblés**. Une PR = une brique/story cohérente.

---

## 10. Interdits

- ❌ Introduire Prisma, Drizzle, NextAuth, Supabase Auth, etc.
- ❌ Persister côté serveur / BDD. Cache navigateur `localStorage` OK pour le confort POC (wipe = reset UI).
- ❌ Inventer un mapping Excel non présent dans le CDC.
- ❌ Fusionner les modèles Trésorerie et Reporting.
- ❌ Modifier le CDC PDF / documents contractuels sans instruction.
- ❌ Désactiver lint/typage pour « faire passer » un build.

---

## 11. Auto-maintenance (living docs)

Les fichiers de `docs/agent/` sont **vivants**. Tu les tiens à jour toi-même.

- **Garde ce fichier court** (~200 lignes). Le détail mécanique vit dans `docs/agent/*.md`.
- **Routing — avant toute tâche non triviale, lis le playbook pertinent**, puis propose un plan court.
- **Nouvelle convention / pattern / décision technique** → écris-le dans le `docs/agent/*.md` concerné, dans la foulée du code.
- **Décisions d’architecture → `docs/agent/decisions.md`**, append-only et daté. N’écrase jamais une entrée passée.
- **Le code fait foi** : si une doc `docs/agent/` contredit le code, corrige la doc.

Living docs : `docs/agent/frontend.md`, `excel.md`, `tresorerie.md`, `reporting.md`, `poc-wow.md`, `decisions.md`.
