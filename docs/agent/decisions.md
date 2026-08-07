# docs/agent/decisions.md — Architecture decisions log (append-only)

> ADR-lite. Append only, daté. Never overwrite a past entry.
> [P] = project decision · [T] = tooling / agent-framework decision

## 2026-07-16 · [P] · Stack Next.js standalone sans BDD/auth

POC = Next.js App Router + TypeScript strict + Tailwind v4, `output: 'standalone'`.
Aucune BDD, ORM ni auth (CDC / AT §4.3, utilisateur unique Thomas Di Donato).
Source : CDC-MURPROTEC-001 + tâche socle + `package.json` / `next.config.ts`.

## 2026-07-16 · [P] · État en mémoire client (React Context)

`DashboardDataProvider` expose `tresorerieData` / `reportingData` (`null` tant qu’aucun upload).
Refresh = wipe — comportement attendu. Pas de localStorage métier.

## 2026-07-16 · [P] · Charte couleur Murpro

Primary `#29235C`, accent `#EBCA09`, surface `#EDECF1`, blanc `#FFFFFF`.
Logo bandeau : `docs/assets/logo_murpro_group.png` → `public/logo_murpro_group.png`.
Source : instruction développeur session + assets projet.

## 2026-07-16 · [P] · Position nette trésorerie = Z27 par défaut

Décision Boldys (CDC ⚠️) : « position nette » = `Z27` (hors placements) ; `Z43` affiché en complément.
Non bloquant côté Client.

## 2026-07-16 · [P] · Reporting figé sur WAL O

UI sans sélecteur multi-agences pour le POC (décision Boldys). Agence Frameries / code `WAO`.

## 2026-07-16 · [P] · Périmètre 🔶 post-AT intégré au POC

Composition des dépenses ; cahier de commande + nb mois ; impayés ; euro/coupon — hors AT signée (6+5), intégrés sur décision Yassine, hors avenant tarifaire pour l’instant (CDC traçabilité scope).

## 2026-07-16 · [T] · Framework agent Boldys

Mise en place `AGENTS.md` + playbooks `frontend.md`, `tresorerie.md`, `reporting.md` + ce journal.
Justification playbooks : UI/conventions Next non triviales ; domaines financiers à fort risque de mapping inventé.

## 2026-07-16 · [P] · Parsing Excel côté serveur (SheetJS)

Upload via `FileUpload` → `POST /api/parse/tresorerie` | `/api/parse/reporting`.
Lib **`xlsx` (SheetJS community)** ajoutée au `package.json`. Fichier traité en `Buffer` mémoire uniquement (AT §4.3).
Décision Boldys CDC confirmée : logique métier hors bundle client.

## 2026-07-16 · [P] · Utilitaires SheetJS unifiés (sheet-utils)

API commune : `readWorkbook` (`cellFormula: false`), `getCell`, `getRow`, `getSheet`,
`detectLastCompanyColumn`, `getNumberOrNull` (vide → null). Playbook : `docs/agent/excel.md`.
Vérifié sur fichiers réels : lignes masquées 10/52 lisibles ; Z45/Z15/Z22/L27/L52 OK.

## 2026-07-17 · [P] · Export PDF trésorerie — print CSS

- Méthode : `window.print()` + `@page { size: A4 landscape }` + **feuille dédiée** `TresoreriePrintSheet` (écran `print:hidden`, PDF layout autonome) — **0 dépendance**, compatible `standalone`.
  - Note : ne pas réimprimer le dashboard écran via `transform`/`zoom` (overlap donut, pagination cassée). Feuille print = grille CSS + donut PieChart taille fixe + barres horizontales sociétés.
- UI : `ExportPdfButton` (« Exporter en PDF ») ; bandeau `TresoreriePrintBanner` (logo + « Trésorerie au JJ/MM/AAAA »).
- Pas de Puppeteer / html2canvas / serveur PDF. Livrable Client = « Enregistrer au format PDF » du navigateur.
- Hors scope initial : export PDF sur `/reporting` — **levé** 2026-07-17 (feuille dédiée + choix agence).
- Source : tâche AT §7.1 « Export PDF A4 paysage ».

## 2026-07-17 · [P] · Reporting — variationVsN1 = P95 ; L83 / L95 ajoutés

- `variationVsN1` = colonne **P**, ligne **95** (profit après impôts), pas P35 (bénéfice brut).
- Ajouts story mapping vérifié (post-structure CDC minimale) : `structureCharges.financier` = **B83**, `profitApresImpots` = **B95**.
- Extraction CR agence paramétrable (`extractAgenceCr(sheet, monthCol)`) ; cible POC `WAL O` / `WAO` uniquement en config.
- Source : tâche « Parser WAL O → ReportingData » + instruction développeur session.

## 2026-07-17 · [P] · Chiffres Clés — seuils depuis fichier ; type intermédiaire

- `extractChiffresCles(sheet, agencyCol="F")` ; seuils parsés col A + libellés B (`parseSeuilWithUnit`) — **jamais hardcodés** (y compris euro/coupon, ex-constante 795).
- `ChiffresClesData` = type intermédiaire ; `ReportingData` reste plat (`moisEcoules`, `cumulCA`, `seuils` + cahier/impayés/euroCoupon).
- Plages « 15-18% » → borne haute (18 %). F45 lu, pas recalculé. F4 = nom agence ; mois écoulés = **B4**.
- Source : tâche « Parser Chiffres Clés » + instruction développeur session.

## 2026-07-17 · [P] · Reporting AT1 — donut CA + Recharts

- Indicateur répartition CA = **donut Recharts** (`RepartitionCaChart`) + légende montants/%.
- Libellés lus col **A** L7–12 ; total affiché = **`caTotal` L14** (pas somme recalculée) ; zéros grisés en légende.
- Tri affichage décroissant pour le coup d’œil. Dep `recharts` ajoutée au `package.json`.
- Source : tâche « Graphique de répartition du CA par produit » + choix session (donut + Recharts).

## 2026-07-17 · [P] · Reporting AT2 / AT5 — cartes bénéfice & variation

- Cartes sous le donut : `BeneficeBrutCard`, `VariationGlobaleCard`.
- Tokens sémantiques `--success` / `--danger` ; flèches SVG ; deltas signés ; pas d’inversion rouge/vert.
- Variation globale = **P95** (profit après impôts) ; contexte B95.
- Bloc résumé métriques bas de page = **temporaire**, à retirer en fin de brique (playbook `reporting.md`).
- Source : tâche « Cartes bénéfice brut & marge + variation globale » + choix session (garder résumé + tokens).

## 2026-07-17 · [P] · Reporting AT3 — tuiles taux clés + fourchettes

- UI : `TauxClesTiles` (grille 6) ; token `--warning` pour zone fourchette.
- Statuts : `neutral` | `ok` | `warning` | `danger` ; `enDeviation` = warning|danger.
- Fourchette 15–18 % : orange dans la bande, rouge au-delà ; `parseSeuilWithUnit` expose min/max.
- Alias POC (CDC sans table d’équivalence) : Commissions CA facturé ↔ Vendeurs ; Surveyor ↔ Cout Techniciens ; Marchandises / Commissions CA vente → neutre.
- Source : tâche « Tableau des taux clés » + vérification CDC + choix session (tuiles + warning).

## 2026-07-17 · [P] · Reporting AT4 — charges empilées + seuil de rentabilité

- Barres empilées horizontales Technique/Vente/Admin (Recharts) ; Financier hors stack, discret.
- Layout 2 lignes : charges pleine largeur, puis frais fixes + break-even en colonnes égales (évite le déséquilibre hauteur du 2/3–1/3).
- Libellé UI break-even = « Seuil de rentabilité mensuel » ; jauge vs `caTotal` ; % T+V+A = ratio présentation uniquement.
- Source : tâche « Structure des charges + frais fixes & break-even » + choix session (barres + layout C).

## 2026-07-17 · [P] · Reporting AT4 — layout stack (sans vide frais fixes)

- Remplace la grille 2 col (stretch `h-full`) par un stack : charges → bandeau frais fixes compact → break-even pleine largeur.
- Source : revue layout session (espace vide sous frais fixes).

## 2026-07-17 · [P] · Reporting AT4 — une carte Charges & rentabilité

- `ChargesRentabiliteBlock` regroupe structure / frais fixes / break-even dans une seule carte section.
- Sous-composants en `embedded` (h3 + séparateurs), sans cartes imbriquées.
- Source : revue layout session (même section visuelle).

## 2026-07-17 · [P] · Reporting AT4 — Financier dans la barre empilée

- Financier (B83) intégré comme 4ᵉ segment du stack (plus de ligne isolée) ; % = part / total T+V+A+F.
- Source : revue UI session (lisibilité).

## 2026-07-17 · [P] · Reporting 🔶 Pilotage commercial

- Section cadrée distincte des AT : `PilotageCommercialBlock` (3 cartes égales).
- Cahier neutre (montant + mois facturation) ; Impayés & Euro/coupon avec flags ok/danger (seuil simple).
- `Impayes.seuil` via `findImpayesSeuil` (A45 « < 1 mois ») ; euro déjà via `findEuroCouponSeuil` — jamais hardcodés.
- Source : tâche « Bloc pilotage commercial » + cadrage session (3 cartes + flags).

## 2026-07-17 · [P] · Reporting — assemblage écran

- Ordre : bénéfice/variation → taux clés → CA → charges/BE → pilotage (flags taux au-dessus de la flottaison).
- En-tête : `agenceLibelle` « Wallonie Ouest — Frameries » (POC CDC) ; badge `données {mois} {année}` (WAL B4 + année fileName).
- Retrait du filet résumé métriques (fin de brique) ; pas de PDF sur `/reporting`.
- Source : tâche « Assemblage de l'écran Dashboard Reporting Financier ».

## 2026-07-17 · [P] · Trésorerie — null → 0 pour composition & soldes société

- Totaux Europe (`Z15`, `Z22`, `Z27`, `Z43`, `Z45`, `Z52`) : `requireNumber` → `ParseError` si absents.
- Composition dépenses 🔶 (`Z16`–`Z20`) et solde courant par société (L27) : `getNumberOrNull` puis `?? 0` explicite — décision session (garder 0, pas d’erreur).
- Pays société : normalisé en majuscules (`L10`, fallback `L8`) pour fusionner les variantes de casse du fichier (ex. colonne S « Espagne » vs « ESPAGNE »).
- Validé sur `docs/assets/TRESOR 30 06 2026 Boldys.xls` via `scripts/verify-tresorerie.mts`.
- Source : tâche « Parser Tresorerie → TresorerieData » + choix session (Option A + garder 0).

## 2026-07-17 · [P] · Trésorerie — 4 cartes KPI synthèse

- UI : `TresorerieKpiRow` sous `src/components/tresorerie/` (formatters + `TrendArrow` dupliqués, pas d’import reporting).
- Z27 = carte **principale** ; Z43 = **secondaire** + légende « placements inclus » (Spike Thomas non bloquant — défaut Boldys inchangé).
- `% Placements` = `Z45` lu, format % fr-FR **1 décimale** ; variation = EUR signé + `success`/`danger` + flèche.
- Source : tâche « Cartes KPI trésorerie ».

## 2026-07-17 · [P] · Trésorerie — donut répartition par pays

- UI : `RepartitionPaysChart` (Recharts donut) sous `src/components/tresorerie/`.
- Pays dynamiques depuis `parPays` ; % = part / somme des soldes **positifs** (1 décimale).
- Soldes négatifs : **exclus du camembert**, listés à part (montant signé) — un pie ne représente pas les négatifs.
- Source : tâche « Camembert de répartition de la trésorerie par pays ».

## 2026-07-17 · [P] · Trésorerie — recettes/dépenses mois + composition

- Parser : `parSociete.recettesMois` (L22) / `depensesMois` (L15) — null → 0.
- UI : `RecettesDepensesBlock` — totaux Z22/Z15 ; bâtonnets Recharts ; moyenne recettes ; top 3 dépenses en accent.
- Composition post-AT : barres empilées (pas mini-donut) ; écart signalé si `|somme Z16–20 − Z15| > 1`.
- Libellés axe : `marque — pays` (L7 + L10), tronqués.
- Source : tâche « Recettes & dépenses du mois + composition ».

## 2026-07-17 · [P] · Trésorerie — bâtonnets Recharts 3 + copy UI métier

- `SocieteBarChart` : pas de `Cell`/`shape` custom (cassent le rendu sous Recharts 3.9) ; pics = 2 `Bar` empilées (`base` / `peak`) avec `fill` explicite ; `dataKey` = `montant` (éviter `value`).
- Orientation : bâtonnets **verticaux** (préférence session) ; libellés tronqués + nom complet au survol (`<title>` SVG + tooltip barre).
- Copy UI : langage financier uniquement — interdiction cellules Excel / « hors AT » à l’écran (playbooks `frontend.md` + `tresorerie.md`).
- Fichier Boldys `TRESOR 30 06 2026` : dépenses L15 = valeurs factices (~6–72 €, Z15 = 897) alors que recettes L22 sont à l’échelle réelle (~10–32 k€). Affichage fidèle au fichier — pas de facteur inventé.
- Libellés bâtonnets : `marque — activité` (L8), pas seulement marque+pays — plusieurs colonnes Murprotec/FRANCE distinctes via L8 (Qualité Serv., Service FR…).
- Source : correctif session (barres invisibles + revue copy + échelle dépenses).

## 2026-07-17 · [P] · Trésorerie — empty preview (comme reporting)

- Sans données : `TresorerieEmptyPreview` remplace le bloc gris `EmptyState` — même structure que le dashboard chargé (KPI, pays, composition, recettes/dépenses) avec « — » / squelettes.
- Source : alignement session avec `ReportingEmptyPreview`.

## 2026-07-17 · [P] · Trésorerie — assemblage layout dashboard

- Layout page : KPI → rangée `pays | composition` → bâtonnets recettes|dépenses (`xl:grid-cols-2`).
- Donut pays : taille fixe ~200–220px (plus de stretch à la hauteur légende).
- Mid-row : `items-stretch` — cartes pays et composition **même hauteur** ; composition remplit via liste postes + barres (pas de trou gris sous la carte courte).
- Recettes/dépenses : total collé au-dessus de chaque chart (plus de rangée KPI séparée qui laisse un vide).
- Header aligné reporting : badge période depuis nom de fichier (`parsePeriodeFromFilename`), « Charger un autre fichier », bouton **Exporter PDF** désactivé (story suivante).
- `CompositionDepensesBlock` extrait de `RecettesDepensesBlock` — section `border-2` autonome.
- Source : tâche « Assemblage de l’écran Dashboard Trésorerie ».

## 2026-07-17 · [P] · Reporting — multi-agences (onglets)

- Révocation de « UI figée WAL O » : parse tous les onglets CR sauf `Chiffres Clés` / `Synthèse`.
- Soft-skip hors modèle (ex. Données Evolution) ; `ReportingBundle.agencies[]` + `AgenceTabs`.
- CK C–F pour FLW/FLO/WAE/WAO ; autres → `chiffresClesDisponibles: false` (pilotage masqué).
- Défaut sélection = WAL O ; libellé WAL O = « Wallonie Ouest — Frameries ».
- Source : changement de scope session (onglets multi-agences).

## 2026-07-17 · [P] · Reporting — export PDF avec choix d’agence

- Même méthode que trésorerie : `window.print()` + `@page` A4 paysage + feuille dédiée `ReportingPrintSheet` (`#reporting-print-sheet`).
- Différence : `ReportingExportPdfButton` ouvre un dialogue pour choisir l’agence à exporter (indépendamment de l’onglet écran).
- CSS print partagé étendu (`#tresorerie-print-sheet, #reporting-print-sheet` + grille taux).
- Source : demande session (PDF reporting + sélection onglet).

## 2026-07-17 · [P] · Reporting — export PDF multi-onglets + nom de fichier

- Option **Tous les onglets** : une `.print-page` par agence (`break-after: page`).
- Nom PDF suggéré via `document.title` (`src/lib/pdf-filename.ts`) : `Reporting-{agenceCible}` pour une agence ; `Reporting-Financier` pour tous (pas de nom d’onglet).
- Source : demande session.

## 2026-07-21 · [P] · Surcouches POC wow (brief, alertes, assistant, radar, fake doors)

- Pack démo séduction hors AT métier : narration + pilotage + vision produit.
- **Brief du mois** + **centre d’alertes** : dérivés des données session (seuils / deltas déjà présents) — `src/lib/poc/{brief,alerts}.ts`.
- **Assistant IA** : widget flottant ; réponses **déterministes** (pas de LLM / pas de clé API) sur chiffres chargés + questions suggérées — `src/lib/poc/assistant.ts`.
- **Radar multi-agences** : Recharts Radar, indices relatifs 0–100 (marge, CA, profit, taux OK, var N-1) — `AgencesRadarChart`.
- **Fake doors** : ERP, email programmé, export PPT — modales teaser « Aperçu produit ».
- Playbook : `docs/agent/poc-wow.md`. Aucune persistance, aucun nouveau mapping Excel.
- Source : plan features POC wow (pack recommandé) + instruction session.

## 2026-07-21 · [P] · Assistant IA branché OpenAI (clé serveur)

- `POST /api/assistant` : Chat Completions (`gpt-4o-mini` par défaut, `OPENAI_MODEL` surchargeable).
- Clé uniquement dans `.env.local` (`OPENAI_API_KEY`) — jamais client / jamais commit (`.gitignore` `.env*` + exception `.env.example`).
- Contexte LLM = JSON compact session (`src/lib/poc/llm-context.ts`) ; garde-fou prompt « n’invente pas un chiffre ».
- Fallback déterministe (`answerAssistantQuestion`) si clé absente ou erreur API.
- Source : clé fournie en session + upgrade pack wow.

## 2026-07-21 · [P] · Wow hors flux dashboard + Vision produit + chat agrandi

- Brief & alertes sortis du corps des pages → bouton **Brief & alertes** + tiroir `InsightsDrawer` (badge nb alertes).
- Fake doors barre retirée → **Vision produit** (`PostPocInfoButton` dans `AppHeader`) : catalogue post-POC avec explication par feature.
- Radar multi-agences **retiré** (illisibilité).
- Assistant IA : mode agrandi (plein panneau) via icône dans le header du chat.
- Source : feedback session UX démo.

## 2026-07-21 · [P] · Cache localStorage des dashboards (survit au refresh)

- Demande explicite session : un refresh ne doit plus effacer les données ; wipe = reset UI uniquement.
- `src/lib/dashboard-storage.ts` : clé `murprotec-dashboard-cache-v1` (trésorerie + reporting + agence sélectionnée).
- `DashboardDataProvider` hydrate au mount (`isCacheReady`) puis réécrit le cache à chaque changement ; `clearAll` / set null → `clearDashboardCache()`.
- AT §4.3 (pas de BDD / pas de fichiers serveur) respectée — persistance = navigateur uniquement, confort POC.
- Copy reset : précise l’effacement du cache navigateur.
- Source : instruction développeur session.

## 2026-07-24 · [P] · Packaging Docker pour Coolify (VPS)

- `Dockerfile` multi-stage `node:20-bookworm-slim` + `.dockerignore` à la racine.
- S’appuie sur `output: 'standalone'` déjà présent dans `next.config.ts` ; CMD = `node server.js`, port **3000**, `HOSTNAME=0.0.0.0`.
- Secrets runtime injectés par Coolify (`OPENAI_API_KEY`, optionnel `OPENAI_MODEL`) — documentés dans `.env.example`. Pas de docker-compose (déploiement Git → Coolify).
- Source : demande session déploiement VPS Coolify.

## 2026-07-24 · [P] · Reporting — onglet défaut + alertes multi-agences

- Défaut `selectedAgenceId` = premier onglet (`agencies[0]`), plus de préférence WAL O — `defaultAgenceId`.
- Centre d’alertes reporting : toutes les agences (`buildReportingBundleAlerts`) ; UI `AlertsCenter` avec sections par agence (`agenceId` / `agenceLabel` sur `PocAlert`).
- Source : feedback session UX.

## 2026-07-24 · [P] · Parsing Excel 100 % client (plus d’upload serveur)

- Constat prod : `BENELUX*.xlsx` ~48 Mo dont ~47 Mo = Power Pivot (`xl/model/item.data`) ; le parse SheetJS est rapide (~150 ms), le goulot = transfert réseau vers le VPS.
- `FileUpload` appelle `parseTresorerieFile` / `parseReportingFile` dans le navigateur (`ArrayBuffer` → `readWorkbook` `type: "array"`).
- Routes `POST /api/parse/tresorerie|reporting` **retirées**. Seul `POST /api/assistant` reste côté serveur (clé OpenAI).
- Aligné AT §4.3 (pas de fichiers serveur) ; bundle client inclut SheetJS — acceptable pour ce POC single-user.
- Source : lenteur import reporting en prod Coolify + choix session (option parse client).

## 2026-08-07 · [P] · Recette Trésorerie — bug variation + geste commercial points 2–3

Email Thomas 04/08/2026 (« Demande d'adaptation ») ; spec `docs/spec/Spec-Adaptations-Tresorerie-Murprotec-2026-08.md`.

1. **Bug (garantie Art. 7.2)** : `variationDepuis1erJanvier` = `Z43 − Z52` (placements inclus), plus `Z27 − Z52` (bases incohérentes).
2. **Geste commercial** : répartition pays agrège `soldeGeneral` (L43) au lieu de `soldeCourant` (L27).
3. **Geste commercial** : recettes/dépenses (écran + PDF) masquent les sociétés à recettes **et** dépenses = 0.
4. Tri recettes décroissant : déjà en place — aucun code.
5. Login / mot de passe : traité en DC séparée le même jour (voir entrée suivante).

Arbitrage Yassine : points 2–3 inclus gratuitement dans ce 1er cycle de recette (geste commercial assumé).

## 2026-08-07 · [P] · Auth mono-utilisateur (DC login)

Demande Thomas 04/08 point 5 ; hors AT §4.4 / §8.4 — Demande de Changement livrée sur instruction Yassine.

- Identifiant + mot de passe en env (`AUTH_USERNAME`, `AUTH_PASSWORD`) + `AUTH_SECRET` (≥ 32 chars) pour JWT HS256 (`jose`).
- Cookie httpOnly `murprotec_session`, TTL 7 jours ; garde `src/proxy.ts` (Next.js 16 Proxy).
- Routes : `/login`, `POST /api/auth/login`, `POST /api/auth/logout` ; bouton Déconnexion dans `AppHeader`.
- Pas de BDD, pas de NextAuth, pas de reset MDP, pas de multi-comptes.
- Fail-closed si env auth incomplète.
