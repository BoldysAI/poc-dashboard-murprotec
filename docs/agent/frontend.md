# docs/agent/frontend.md — Frontend Next.js

> À lire pour toute tâche UI, routing, layout, tokens, ou état session.
> Transverse → `/AGENTS.md`. Parsing métier → `tresorerie.md` / `reporting.md`.
> Référence code : `src/app/`, `src/components/`, `src/contexts/`, `src/app/globals.css`.

## Golden rules

1. **Routes métier** = `/tresorerie` et `/reporting` uniquement ; `/` redirige vers `/tresorerie` (`src/app/page.tsx`).
2. **Données dashboard** uniquement via `useDashboardData()` — ne crée pas un second store. Reporting = `reportingBundle` + `selectedAgenceId` / `selectedReportingData`.
3. **Empty state** : trésorerie → `TresorerieEmptyPreview` ; reporting → `ReportingEmptyPreview` (squelette des sections / graphes vides — pas de bloc gris plein).
4. **Charte** : tokens CSS Murpro (`primary`, `accent`, `surface`, `background`) — pas de hex hardcodés dans les composants.
5. **Accessibilité de base** : `lang="fr"`, focus visible, `aria-current` / `aria-selected` sur nav et onglets agence, contraste texte ≥ 4.5:1.
6. **Copy UI métier** : titres et textes visibles = langage financier pour Thomas. **Jamais** de références Excel (cellules `Z15`, lignes, onglets), ni « hors AT », ni jargon technique de parsing. Le mapping CDC reste dans les playbooks / code, pas à l’écran.

## Pattern — layout & navigation

1. Shell dans `src/app/layout.tsx` : font IBM Plex Sans, `DashboardDataProvider`, `AppHeader`, `<main>`.
2. Nav dans `AppHeader` : liens `next/link`, état actif via `usePathname`.
3. Logo : `public/logo_murpro_group.png` via `next/image` (~54 px de haut).
4. Reporting : `AgenceTabs` sous l’en-tête (style `border-b-2 border-accent`) pour basculer d’agence.
5. Export PDF reporting : `ReportingExportPdfButton` (une agence ou tous les onglets) → `ReportingPrintSheet` (page break / onglet) ; titre PDF = `Reporting-{onglet}` sauf export tous (`Reporting-Financier`).

## Pattern — état session + upload

```tsx
const { reportingBundle, setReportingBundle, selectedReportingData } =
  useDashboardData();
<FileUpload
  endpoint="/api/parse/reporting"
  onSuccess={(data) => setReportingBundle(data as ReportingBundle)}
/>
// null → ReportingEmptyPreview ; bundle → AgenceTabs + dashboard agence active
```

- Composant : `src/components/FileUpload.tsx` (bouton + drag & drop).
- Sans données : `TresorerieEmptyPreview` / `ReportingEmptyPreview` — même layout que le dashboard chargé, graphes / valeurs vides (pas de bloc gris plein).
- Reporting chargé : `AgenceTabs` + `selectedReportingData` pour les blocs.
- **Pas d’attribut `accept`** sur l’input : le sélecteur ne filtre pas par extension ; la validation format/structure est **côté API** (message d’erreur affiché).
- Erreurs API : message JSON `{ error }` affiché à l’utilisateur — jamais de stack.
- Refresh navigateur = wipe (AT §4.3).

## Charts & KPI briques

- Lib autorisée : **Recharts** (`recharts` dans `package.json`) pour les graphiques reporting / trésorerie.
- Reporting : `src/components/reporting/` · Trésorerie : `src/components/tresorerie/` (KPI cards, formatters dédiés — pas d’import croisé entre briques).
- Couleurs : dérivées des tokens Murpro (`--primary`, `--accent`, `--surface`) — pas de palette « SaaS purple » inventée.

## Tokens

Définis dans `src/app/globals.css` (`@theme inline`) :
- `--color-primary` / `#29235C`
- `--color-accent` / `#EBCA09`
- `--color-surface` / `#EDECF1`
- `--color-background` / `#FFFFFF`
- `--color-success` / `#1B7A4E` — amélioration / delta > 0 / taux dans le seuil
- `--color-warning` / `#B45309` — fourchette (ex. 15–18 %)
- `--color-danger` / `#B42318` — dégradation / delta < 0 / taux hors seuil

Utiliser `text-success` / `text-warning` / `text-danger` (Tailwind) — pas de `green-*` / `orange-*` / `red-*` ad hoc.

## What not to do

- ❌ Introduire shadcn/UI lib sans demande — le socle est Tailwind tokens only.
- ❌ Dark mode system (`prefers-color-scheme`) qui écrase la charte Murpro.
- ❌ Persister le context (localStorage) « pour le confort ».
- ❌ Mettre la logique de parsing Excel dans un composant UI.
- ❌ Afficher des références cellules / lignes Excel / « hors AT » dans l’UI utilisateur.

## Checklist

- [ ] Page sous le layout commun (header + main)
- [ ] Empty state si données `null`
- [ ] Tokens charte utilisés
- [ ] `npm run lint` + `npm run build` OK
