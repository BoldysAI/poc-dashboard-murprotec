# Documentation technique — Architecture

> POC Dashboard Financier MurProtec / Murpro Group  
> Spec fonctionnelle : `docs/CDC-POC-Dashboard-Financier.pdf` (CDC-MURPROTEC-001)  
> Vérité opérationnelle : le code (`src/`, `package.json`, `next.config.ts`)  
> Journal des décisions : `docs/agent/decisions.md`

---

## 1. Objectif de la plateforme

Application web **single-user** (Thomas Di Donato) pour visualiser deux tableaux de bord financiers indépendants, alimentés par **upload Excel manuel** :

| Brique | Route | Entrée | Sortie |
|---|---|---|---|
| **Trésorerie Groupe** | `/tresorerie` | Fichier `.xls` (onglet `Tresorerie`) | KPI, répartition pays, recettes/dépenses, PDF |
| **Reporting Financier** | `/reporting` | Fichier `.xlsx` (CR multi-agences) | Compte de résultat par agence, PDF |

Pas de base de données, pas d’ORM (CDC / AT §4.3).  
**Auth** (DC 08/2026) : cookie JWT httpOnly mono-utilisateur (`jose`) ; credentials en env `AUTH_USERNAME` / `AUTH_PASSWORD` / `AUTH_SECRET` ; garde `src/proxy.ts`.  
Le navigateur **parse** les fichiers Excel en mémoire ; l’état métier vit **dans le navigateur**. Le serveur ne reçoit pas les Excel (sauf assistant IA optionnel).

---

## 2. Vue d’ensemble

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         Navigateur (client)                             │
│  ┌──────────────┐  ┌─────────────────────┐  ┌────────────────────────┐  │
│  │ AppHeader    │  │ Pages /tresorerie   │  │ Surcouches POC         │  │
│  │ Vision prod. │  │       /reporting    │  │ Brief · Alertes · Chat │  │
│  └──────────────┘  └──────────┬──────────┘  └────────────┬───────────┘  │
│                               │                          │              │
│                    DashboardDataProvider                 │              │
│                    (React Context + localStorage)        │              │
│                               │                          │              │
│         FileUpload ──► parse*File (SheetJS) ──► Context  │              │
│                    window.print() (PDF)                  │              │
└──────────────────────────────────────────────────────────┼──────────────┘
                                                           │ JSON (contexte)
                                                           ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    Next.js 16 (Node, standalone)                        │
│  POST /api/auth/login|logout  →  cookie JWT httpOnly (jose)                 │
│  POST /api/assistant  →  OpenAI (optionnel) / fallback déterministe         │
│  src/proxy.ts  →  garde d’accès pages + API                                 │
│  (pas de route /api/parse — Excel 100 % client)                             │
└─────────────────────────────────────────────────────────────────────────┘
```

**Principe architectural** : monolithe Next.js (UI + API assistant). Parsing Excel **dans le navigateur**. Deux domaines métier **strictement séparés** (types, parsers, composants) ; une couche Excel partagée minimale (`src/lib/excel/`).

---

## 3. Stack technique

| Couche | Technologie | Rôle |
|---|---|---|
| Runtime app | **Next.js 16** (App Router) + React 19 | Routes pages + Route Handlers |
| Langage | **TypeScript** `strict` | Types métier dans `src/types/dashboard.ts` |
| Styles | **Tailwind CSS v4** + tokens `@theme` | Charte Murpro (`globals.css`) |
| Graphiques | **Recharts** | Donuts, barres, stacks |
| Excel | **SheetJS `xlsx`** | Lecture `.xls` / `.xlsx` **côté navigateur** |
| État | React Context + **`localStorage`** | Cache session jusqu’à reset explicite |
| PDF | `window.print()` + CSS `@page` A4 paysage | Aucune lib PDF serveur |
| Déploiement | `output: 'standalone'` + **Docker** | Coolify / VPS, port 3000 |

Versions exactes : voir `package.json` (ne pas dupliquer ici).

---

## 4. Organisation du dépôt

```
poc-dashboard-murprotec/
├── AGENTS.md / CLAUDE.md          # Règles agents / développeurs
├── docs/
│   ├── CDC-POC-Dashboard-Financier.pdf
│   ├── architecture.md            # Ce document
│   ├── assets/                    # Excel & logo de référence (tests)
│   └── agent/                     # Playbooks mécaniques + décisions
├── public/logo_murpro_group.png
├── Dockerfile                     # Multi-stage → image standalone
├── next.config.ts                 # output: 'standalone'
└── src/
    ├── app/                       # App Router
    │   ├── layout.tsx             # Shell + provider + assistant
    │   ├── page.tsx               # redirect → /tresorerie
    │   ├── tresorerie/page.tsx
    │   ├── reporting/page.tsx
    │   ├── globals.css
    │   └── api/
    │       └── assistant/route.ts
    ├── components/
    │   ├── layout/                # AppHeader
    │   ├── tresorerie/            # UI brique 1 (isolée)
    │   ├── reporting/             # UI brique 2 (isolée)
    │   ├── poc/                   # Surcouches démo (brief, alertes, IA…)
    │   ├── FileUpload.tsx
    │   └── ResetUploadButton.tsx
    ├── contexts/
    │   └── dashboard-data-context.tsx
    ├── lib/
    │   ├── excel/                 # SheetJS + parsers métier
    │   ├── poc/                   # Brief, alertes, assistant, contexte LLM
    │   ├── reporting/             # Helpers UI reporting (ex. défaut agence)
    │   ├── dashboard-storage.ts   # Cache localStorage
    │   └── pdf-filename.ts
    └── types/dashboard.ts         # TresorerieData · ReportingData · ReportingBundle
```

**Règle de découpage** : aucun import croisé entre `components/tresorerie/` et `components/reporting/` (formatters inclus). Les surcouches démo vivent dans `components/poc/` + `lib/poc/`.

---

## 5. Flux de données

### 5.1 Upload → parse → affichage

```
1. Utilisateur dépose un fichier (FileUpload, drag & drop)
2. parseTresorerieFile | parseReportingFile (navigateur)
   - valide l’extension (.xls vs .xlsx)
   - lit le fichier en ArrayBuffer (RAM navigateur)
   - appelle parseTresorerie | parseReporting (SheetJS type: "array")
3. Résultat → setTresorerieData | setReportingBundle (Context)
4. Persistance navigateur (clé murprotec-dashboard-cache-v2)
5. UI : KPI / charts ; empty preview si null
```

Le refresh navigateur **conserve** le cache. Seuls les boutons « Réinitialiser » / `clearAll` appellent `clearDashboardCache()`.

### 5.2 Couche Excel

```
readWorkbook(buffer)          # cellFormula: false → lit cell.v uniquement
    │
    ├── getSheet / getCell / getRow / getNumberOrNull / requireNumber
    ├── detectLastCompanyColumn   # trésorerie : colonnes sociétés dynamiques
    │
    ├── parse-tresorerie.ts  → TresorerieData
    └── parse-reporting.ts   → ReportingBundle { agencies: ReportingData[] }
```

Conventions :
- cellule vide → `null` (jamais un `0` silencieux sauf décisions métier documentées) ;
- formules Excel non recalculées côté app ;
- messages d’erreur utilisateur en français (`ParseError`).

Détail mapping cellules : `docs/agent/tresorerie.md`, `docs/agent/reporting.md`, `docs/agent/excel.md`.

### 5.3 Export PDF

Pas de génération PDF côté serveur.

1. Feuille print dédiée (`TresoreriePrintSheet` / `ReportingPrintSheet`) — layout autonome, pas un zoom de l’écran.
2. Bouton → `window.print()`.
3. CSS `@page { size: A4 landscape }` ; header / boutons masqués à l’impression.
4. Reporting : dialogue « une agence » ou « tous les onglets » (page break par agence).
5. Nom de fichier suggéré via `document.title` (`src/lib/pdf-filename.ts`).

Livrable client = « Enregistrer au format PDF » du navigateur.

---

## 6. Modèle de données (session)

Défini dans `src/types/dashboard.ts`. Les deux briques **ne partagent pas** de modèle commun.

### 6.1 Trésorerie — `TresorerieData`

- Sociétés (`parSociete`) : marque, activité, pays, solde, recettes/dépenses mois  
- Agrégats pays (`parPays`)  
- Totaux Europe : position nette (Z27), total général (Z43), % placements (Z45), solde 01/01 (Z52), variation, totaux recettes/dépenses  
- Composition des dépenses (🔶 post-AT)  
- `fileName`

### 6.2 Reporting — `ReportingBundle` / `ReportingData`

- Bundle = `{ fileName, agencies[] }` — un `ReportingData` par onglet CR retenu  
- Onglets exclus : `Chiffres Clés`, `Synthèse` ; soft-skip des structures hors modèle  
- Par agence : répartition CA, bénéfice/marge, taux clés, structure de charges, break-even, variation N-1 (P95), pilotage commercial si Chiffres Clés disponible (cols C–F)  
- Sélection UI : `selectedAgenceId` (défaut = premier onglet) + `selectedMonthId` (défaut = dernier mois rempli) ; vue = `resolveReportingView`

---

## 7. Couche présentation

### 7.1 Shell applicatif

`src/app/layout.tsx` :
- `lang="fr"`, police IBM Plex Sans  
- `DashboardDataProvider`  
- `AppHeader` (nav Trésorerie / Reporting, Vision produit)  
- `<main>` max-width  
- `AiAssistant` (widget flottant global)

`/` redirige vers `/tresorerie`.

### 7.2 État global

`DashboardDataProvider` (`useSyncExternalStore` + `dashboard-storage.ts`) expose :

| API | Rôle |
|---|---|
| `tresorerieData` / `setTresorerieData` | Brique 1 |
| `reportingBundle` / `setReportingBundle` | Brique 2 |
| `selectedAgenceId` / `setSelectedAgenceId` | Onglet agence actif |
| `selectedMonthId` / `setSelectedMonthId` | Période (mois ou consolidé) |
| `selectedReportingData` | Vue plate dérivée (agence + période) |
| `isCacheReady` | Évite le flash empty state avant hydratation |
| `clearAll` | Wipe cache navigateur |

**Un seul store** pour les dashboards — pas de second Context métier.

### 7.3 Charte & tokens

Définis dans `src/app/globals.css` (`@theme`) :

| Token | Usage |
|---|---|
| `primary` `#29235C` | Identité, titres, bordures fortes |
| `accent` `#EBCA09` | Accent nav / onglets |
| `surface` `#EDECF1` | Fonds secondaires |
| `background` `#FFFFFF` | Fond page |
| `success` / `warning` / `danger` | Deltas, seuils, alertes |

Pas de dark mode système qui écrase la charte.

### 7.4 Empty states

Sans données : **preview squelette** (`TresorerieEmptyPreview` / `ReportingEmptyPreview`) — même structure que le dashboard chargé, valeurs « — », pas un bloc gris plein.

---

## 8. API HTTP

Routes serveur : auth + assistant IA. Le parsing Excel est **client** (`parse*File`).

| Méthode | Chemin | Entrée | Sortie |
|---|---|---|---|
| `POST` | `/api/auth/login` | JSON : username, password | Cookie `murprotec_session` + `{ ok: true }` |
| `POST` | `/api/auth/logout` | — | Clear cookie + redirect `/login` |
| `POST` | `/api/assistant` | JSON : question, historique, snapshot session | Réponse texte (OpenAI ou fallback) |

Garde d’accès : `src/proxy.ts` — pages non authentifiées → `/login` ; `/api/*` (hors login) → 401.  
Erreurs : HTTP 4xx/5xx + message FR.  
Aucun fichier Excel n’est envoyé ni écrit sur le disque serveur.

---

## 9. Surcouches POC (hors périmètre AT strict)

Pack démo produit documenté dans `docs/agent/poc-wow.md` :

| Feature | Emplacement | Données |
|---|---|---|
| Brief du mois | Tiroir `InsightsDrawer` | Dérivé des données session |
| Centre d’alertes | Idem (reporting = multi-agences) | Seuils / deltas déjà parsés |
| Assistant IA | Flottant ; `POST /api/assistant` | Contexte JSON compact session |
| Vision produit | Header `PostPocInfoButton` | Catalogue post-POC (teaser) |

Assistant :
- clé `OPENAI_API_KEY` **serveur uniquement** (`.env.local` / Coolify) ;  
- modèle défaut `gpt-4o-mini` (`OPENAI_MODEL` optionnel) ;  
- fallback déterministe si clé absente ou erreur API ;  
- jamais de `NEXT_PUBLIC_*` pour les secrets.

Ces features **n’ajoutent pas** de mapping Excel ni de persistance serveur.

---

## 10. Déploiement

### 10.1 Build natif

```bash
npm install
npm run build    # produit .next/standalone
npm start
```

`next.config.ts` : `output: "standalone"`.

### 10.2 Docker / Coolify

`Dockerfile` multi-stage (`node:20-bookworm-slim`) :

1. `npm ci`  
2. `npm run build`  
3. Image runtime : copie `standalone` + `static` + `public`, user non-root `nextjs`, `CMD node server.js`  
4. Port **3000**, `HOSTNAME=0.0.0.0`  
5. Healthcheck HTTP sur `/`

Variables runtime (Coolify / `.env`) : `OPENAI_API_KEY`, optionnel `OPENAI_MODEL` — voir `.env.example`.

Pas de `docker-compose` dans le repo (déploiement Git → Coolify).

---

## 11. Sécurité & contraintes non fonctionnelles

| Sujet | Choix |
|---|---|
| Auth | Aucune (accès direct, utilisateur unique) |
| BDD / fichiers serveur | Interdits pour les données métier |
| Secrets | Uniquement env serveur ; `.env*` gitignoré sauf `.env.example` |
| Devise | EUR tel quel — pas de conversion |
| Périmètre AT | 6 indicateurs trésorerie + 5 reporting ; 🔶 post-AT intégrés au POC sur décision produit, hors avenant tarifaire |
| Qualité | `npm run lint` + `npm run build` (tsc via Next) |

---

## 12. Limites assumées (POC)

1. **Pas de multi-utilisateur** ni de droits.  
2. **Pas d’historique** côté serveur — un nouvel upload remplace l’état de la brique.  
3. **Mapping Excel figé** sur le modèle CDC ; un changement de structure fichier casse le parse (messages d’erreur FR).  
4. **PDF dépendant du navigateur** (dialogue d’impression).  
5. **Assistant IA optionnel** — dégradé gracieusement sans clé.  
6. Cache `localStorage` = confort démo ; wipe = action utilisateur explicite.

---

## 13. Cartographie documentation

| Document | Audience | Contenu |
|---|---|---|
| `docs/architecture.md` | Tech / IT client | Vue architecture (ce fichier) |
| `docs/CDC-POC-Dashboard-Financier.pdf` | Métier / contractuel | Spec fonctionnelle |
| `AGENTS.md` | Agents IA + devs | Règles transverses courtes |
| `docs/agent/frontend.md` | Dev UI | Layout, tokens, empty states |
| `docs/agent/excel.md` | Dev parsing | Utilitaires SheetJS |
| `docs/agent/tresorerie.md` | Dev brique 1 | Mapping + UI trésorerie |
| `docs/agent/reporting.md` | Dev brique 2 | Mapping + UI reporting |
| `docs/agent/poc-wow.md` | Dev surcouches | Brief, alertes, assistant |
| `docs/agent/decisions.md` | Tous | ADR append-only daté |

En cas de contradiction **stack/code** vs doc agent → **le code gagne**.  
En cas de contradiction **périmètre métier** vs code → **la spec CDC/AT gagne** ; documenter l’écart dans `decisions.md`.
