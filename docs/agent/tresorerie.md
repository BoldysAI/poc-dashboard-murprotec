# docs/agent/tresorerie.md — Dashboard Trésorerie Groupe

> À lire avant upload, parsing `.xls`, indicateurs ou export PDF trésorerie.
> Transverse → `/AGENTS.md`. UI générique → `frontend.md`. **Ne pas** réutiliser `reporting.md`.
> Spec : CDC Brique 1. Assets de référence : `docs/assets/TRESOR*.xls` (tests uniquement).

## Golden rules

1. **Source** = 1 onglet `Tresorerie` ; colonnes sociétés **variables** (C→Y) — ne pas hardcoder 23 sociétés (CDC).
2. **Pays** = ligne 10 (fallback L8) ; normalisé **majuscules** ; **solde courant** = ligne 27 ; agrégats totaux en colonne **Z**.
3. **Devise** = EUR tel quel — aucune conversion CHF / multi-devises (confirmé Client 16/07).
4. **Recettes / dépenses** = mois courant uniquement (`Z22` / `Z15`) — pas de série multi-mois.
5. Résultat → `TresorerieData` en mémoire via `setTresorerieData` — aucune persistance.
6. Totaux Z absents → `ParseError` ; composition Z16–20 et L27 société absents → **`0`** (décision session).

## Mapping cellules (CDC ✅)

| Indicateur | Cellule / règle |
|---|---|
| Total dépenses | `Z15` |
| Composition dépenses 🔶 | `Z16`–`Z20` (salaires, impôts, fournisseurs, dividendes, transferts) — null → 0 |
| Total recettes | `Z22` |
| Solde courant (position nette défaut) | `Z27` — Boldys : hors placements |
| Total général | `Z43` = Z40 + Z27 — affiché en complément |
| % Placements | `Z45` |
| Solde au 01/01 | `Z52` (ligne 52 masquée), lu tel quel |
| Variation depuis 01/01 | `Z27 − Z52` |
| Répartition par pays | Agrégation colonnes C→avant Europe via ligne 10 × ligne 27 |
| Recettes / dépenses par société | L22 / L15 par colonne (null → 0) ; totaux `Z22` / `Z15` |

## Pattern — pipeline

1. UI : `FileUpload` accept `.xls` → `POST /api/parse/tresorerie` (multipart `file`).
2. Serveur : `src/lib/excel/parse-tresorerie.ts` via utilitaires `@/lib/excel` (`readWorkbook`, `detectLastCompanyColumn`).
3. Colonnes sociétés dynamiques C → dernière avant Europe ; totaux colonne Z.
4. `setTresorerieData` remplace intégralement l’état session.
5. Export PDF A4 paysage : bouton **Exporter en PDF** → `window.print()` (CSS `@page landscape`) — voir § Export PDF ci-dessous.

Vérif fichier réel : `npx tsx scripts/verify-tresorerie.mts` (asset `docs/assets/TRESOR*.xls`).

## UI — Layout page `/tresorerie`

Ordre d’affichage (état chargé) :

1. **Header** — titre « Dashboard Trésorerie », badge période dérivé du nom de fichier (`TRESOR 30 06 2026…` → `30/06/2026`), nom du fichier, actions : **Exporter en PDF** + **Charger un autre fichier**.
2. **KPI** — `TresorerieKpiRow` (4 cartes).
3. **Rangée médiane** `lg:grid-cols-2 lg:items-stretch` — `RepartitionPaysChart` | `CompositionDepensesBlock` (même hauteur ; composition remplit via liste postes).
4. **Bas** — `RecettesDepensesBlock` : chaque colonne = total compact + bâtonnets (`xl:grid-cols-2`).

État vide : upload + `TresorerieEmptyPreview` (squelette KPI / pays / composition / bâtonnets, comme le reporting). Desktop prioritaire (1080p) — pas d’optimisation mobile poussée.

## Export PDF (AT §7.1)

- Bouton : `ExportPdfButton` → `window.print()`.
- CSS : `@page { size: A4 landscape }` ; contenu = `TresoreriePrintSheet` (layout print dédié, pas un zoom de l’écran).
- Bandeau print : logo Murpro + « Trésorerie au JJ/MM/AAAA ».
- Graphiques print : donut PieChart taille fixe + barres horizontales CSS denses (toutes les sociétés) ; feuille volontairement plus compacte que l’écran web.
- Masqué à l’impression : `AppHeader`, upload, boutons, dashboard écran.
- Livrable : dialogue navigateur « Enregistrer au format PDF ». Pas de binaire headless.

## UI — KPI synthèse

Composants : `src/components/tresorerie/` (`TresorerieKpiRow` + 4 cartes). Formatters locaux (`format-tresorerie.ts`) — **ne pas** importer `format-reporting`.

Pattern (comme reporting Pilotage / Taux clés) : **une carte section** `border-2 border-primary/15` (« Indicateurs de synthèse ») ; les 4 KPI sont des sous-cartes `border` fine.

| Carte | Champ | Style |
|---|---|---|
| Position nette de trésorerie | `positionNette` (Z27) | Même chrome que les autres KPI ; légende « hors placements » |
| Total Général | `totalGeneral` (Z43) | Même chrome que les autres KPI ; légende « placements inclus » (pas de fond grisé) |
| % Placements | `pctPlacements` (Z45) | % fr-FR, **1 décimale** (ratio lu, pas recalculé) — même chrome |
| Variation depuis le 01/01 | `variationDepuis1erJanvier` | EUR signé + flèche + `success`/`danger` |

## UI — Répartition par pays

Composant : `RepartitionPaysChart` (donut Recharts, calqué sur le CA reporting — pas d’import croisé).

- Source : `parPays` (dynamique, pas de liste de pays en dur).
- Donut **taille fixe** (~200–220px) — ne s’étire plus à la hauteur de la légende.
- Carte `h-full` pour s’aligner avec la composition (stretch grille).
- % = `montant / somme(montants > 0)` — 1 décimale ; légende dense + tooltip (pays, montant, %).
- **Soldes négatifs** : exclus du donut (un camembert ne les représente pas) ; listés à part avec montant signé + mention explicite.
- Zéros : hors pie, légende grisée.

## UI — Composition des dépenses

Composant section : `CompositionDepensesBlock` (`border-2 h-full`, pair du donut pays).

- Barre empilée + liste postes avec barres proportionnelles (remplit la hauteur stretch).
- % vs total dépenses ; signal d’écart en langage métier si `|somme − total| > 1` EUR.
- Copy écran (financier uniquement) — pas de cellules Excel / « hors AT ».

## UI — Recettes & dépenses du mois

Composant : `RecettesDepensesBlock` (section `border-2`) + `SocieteBarChart`.

**Copy écran (financier uniquement)** — pas de `Z15`/`Z22`, pas de « ligne 15/22 », pas de « hors AT » (règle `frontend.md`).

- Chaque colonne : total compact (inline) puis bâtonnets — pas de rangée KPI séparée au-dessus.
- Bâtonnets côte à côte en `xl:grid-cols-2` ; hauteur ~260–280px.
- Libellé `marque — activité` (L8, fallback pays) pour distinguer les colonnes homonymes ; tronqué + tooltip complet.
- Recettes : `ReferenceLine` = moyenne arithmétique des sociétés.
- Dépenses : top 3 montants en accent `#EBCA09` (2 séries empilées `base`/`peak` — pas de `Cell`/`shape` custom, cassé sous Recharts 3).

## Structure

Types : `src/types/dashboard.ts` (`TresorerieData`). Parser : `src/lib/excel/parse-tresorerie.ts`. Route : `src/app/api/parse/tresorerie/route.ts`. UI : `src/components/tresorerie/`.

## What not to do

- ❌ Coder un nombre fixe de sociétés.
- ❌ Recalculer % placements si `Z45` est déjà dans le fichier (lire).
- ❌ Partager le parser avec le reporting.
- ❌ Afficher une série historique multi-mois.
- ❌ Inclure des soldes négatifs dans le donut.
- ❌ Exposer cellules Excel / « hors AT » dans les libellés UI.

## Checklist

- [x] Onglet `Tresorerie` uniquement
- [x] Colonnes sociétés dynamiques
- [x] Mapping cellules CDC respecté (validé `TRESOR 30 06 2026 Boldys.xls`)
- [x] null → 0 composition / L27 / L15 / L22 société ; `requireNumber` sur totaux Z
- [x] 4 cartes KPI (Z27 principal / Z43 secondaire / % / variation)
- [x] Donut répartition par pays (négatifs hors pie)
- [x] Recettes & dépenses mois courant + composition post-AT
- [x] Layout assemblé (KPI → pays+composition → bâtonnets ; header fichier/période ; PDF stub)
- [x] Export PDF A4 paysage (`window.print` + CSS)
- [ ] Pas de persistance hors export PDF
