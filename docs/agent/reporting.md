# docs/agent/reporting.md — Dashboard Reporting Financier

> À lire avant upload, parsing `.xlsx`, indicateurs agence ou seuils.
> Transverse → `/AGENTS.md`. UI générique → `frontend.md`. **Ne pas** réutiliser `tresorerie.md`.
> Spec : CDC Brique 2. Assets : `docs/assets/BENELUX*.xlsx` (tests uniquement).

## Golden rules

1. **Multi-agences** : tous les onglets CR du `.xlsx` **sauf** `Chiffres Clés` et `Synthèse` ; onglets UI via `AgenceTabs`. Soft-skip si structure hors CR (ex. Evolution).
2. **Lire, ne pas recalculer** les ratios déjà dans le fichier — sauf **nb de mois cahier de commande** = Attente ÷ (Cumul CA / mois écoulés) (🔶).
3. **Mois courant** = colonne **B** ; ignorer mois vides (C→M à 0). N-1 = colonnes O / P / Q selon CDC.
4. **Seuils** = onglet `Chiffres Clés` (col A libellés). Colonnes agence CK : C=`FLA W`, D=`FLA O`, E=`WAL E`, F=`WAL O`. Autres onglets → `chiffresClesDisponibles: false` (pilotage masqué).
5. Résultat → `ReportingBundle` via `setReportingBundle` — aucune persistance. Sélection = `selectedAgenceId` (défaut `WAL O` si présent).

## Mapping réel (CDC ✅ — structure CR commune)

| Domaine | Lignes / colonnes |
|---|---|
| CA par nature | 7–12 (Chimique, CTA, DH, Cuvelage, Hydrofugation, Autres) |
| TOTAL CA | 14 |
| Bénéfice brut / marge | 35 / 36 ; N-1 en col O |
| Taux clés | 38–43 (pré-calculés) |
| Charges | Technique 53, Vente 62, Administration 78, **Financier 83** |
| Profit après impôts | **95** (mois courant col B) |
| Frais fixes / marge nette / break-even | 97 / 98 / 99 |
| Variation vs N-1 | **P95** (profit après impôts — pas P35) |

### Mapping Chiffres Clés (cols C–F)

| Domaine | Cellules |
|---|---|
| Mois écoulés | **B4** (C4–F4 = libellés agences, pas un nombre) |
| Cumul CA / Cumul Ventes / Attente | `{col}6` / `{col}7` / `{col}8` |
| Seuils | Col **A** (texte) + libellés col **B** — parsés, jamais hardcodés |
| Euro/coupon | `{col}36` ; seuil depuis A |
| Impayés liste rouge / nb mois | `{col}42` ; **`{col}45` lu** |
| 🔶 Cahier commande nb mois | **seul calcul** : Attente ÷ (Cumul CA / B4) |

Hors `ReportingData` (présents dans le fichier, non exposés) : L16 CA MQS, L18 % Chimique.
Les % restent en **décimal** dans les données ; conversion affichage (`0.12` → `12 %`) côté UI uniquement.
Plages type « 15-18% » → `seuilMin`/`seuilMax` (warning dans la bande, danger au-delà).

**Attention CDC** : le mapping du mail Thomas est approximatif — **se fier au mapping réel du CDC**, pas aux exemples type « B9/B14 = taux poseur ».

## Pattern — indicateurs UI

1. AT1 répartition CA : `RepartitionCaChart` (donut Recharts).
2. AT2 bénéfice brut & marge vs N-1 : `BeneficeBrutCard` (delta abs/rel, flèche success/danger).
3. AT3 taux clés : `TauxClesTiles` — 6 tuiles, statuts ok/warning/danger/neutral.
4. AT4 charges + rentabilité : `ChargesRentabiliteBlock` — une carte (structure + frais fixes + break-even).
5. AT5 variation globale vs N-1 : `VariationGlobaleCard` — valeur = **P95** ; contexte B95.
6. 🔶 Post-AT pilotage commercial : `PilotageCommercialBlock` — **si** `chiffresClesDisponibles`.
7. Libellés catégories = col **A** L7–12 ; total donut = `caTotal` L14.
8. Catégories à 0 : légende grisée. Tri donut décroissant.

### Assemblage `/reporting` (ordre d’écran)

1. En-tête : `agenceLibelle` de l’agence active + badge période ; barre `AgenceTabs`.
2. Bénéfice + Variation (flags N-1 en haut).
3. Taux clés (flags déviation au-dessus de la flottaison).
4. Répartition CA puis charges / frais fixes / break-even.
5. 🔶 Pilotage commercial (si CK) en bas.
6. Export PDF : bouton → dialogue (une agence **ou** tous les onglets) → `ReportingPrintSheet` (1 page / onglet) + `window.print()` ; nom de fichier via `document.title` (`Reporting-{onglet}` ; tous = `Reporting-Financier`).

Métadonnées : WAL O = « Wallonie Ouest — Frameries » ; autres = CK row4 ou nom d’onglet.

### AT4 — charges & seuil de rentabilité

- % répartition = ratio de présentation sur les 4 postes (T+V+A+F) ; montants lus.
- Break-even UI = « Seuil de rentabilité mensuel » ; comparaison visuelle vs `caTotal`.
- Layout : une carte `ChargesRentabiliteBlock` — sous-blocs séparés par `border-t` (pas de cartes imbriquées).

### 🔶 Post-AT — Pilotage commercial

- Section cadrée distincte des indicateurs AT (frontière périmètre visible).
- 3 cartes (`md:grid-cols-3`) : Cahier (neutre) ; Impayés & Euro/coupon (flags ok/danger).
- Sous-titre UI : « Suivi commercial et trésorerie agence. » (sans jargon AT).
- Flags seuil simple : `≤` ok, `>` danger ; seuils col A (`impayes.seuil`, `euroCoupon.seuil`) — jamais hardcodés.
- F45 lu ; seul calcul = nb mois cahier.

### AT3 — rapprochements taux ↔ seuils

| Taux WAL O | Seuil Chiffres Clés | Statut |
|---|---|---|
| % Poseurs | % Poseurs | même libellé CDC |
| % Publicités | % Publicité | même famille |
| % Commissions (CA facturé) | % Vendeurs (15–18 %) | alias POC |
| % Surveyor | % Cout Techniciens | alias POC |
| % Marchandises | — | neutre |
| % Commissions (CA vente) | — | neutre (seuil Vendeurs déjà sur CA facturé) |

Fourchette : `< min` → ok ; `min–max` → warning ; `> max` → danger. Seuil simple : `≤` ok, `>` danger.

## Pattern — pipeline

1. UI : `FileUpload` → `POST /api/parse/reporting`.
2. Serveur : tous onglets CR (hors CK / Synthèse) → `ReportingBundle.agencies[]` ; CK C–F si mapping A3.
3. Seuils col A → flags ; seul calcul = nb mois cahier.
4. `setReportingBundle` + `selectedAgenceId` (session).

## Structure

Types : `ReportingBundle`, `ReportingData`, `ChiffresClesData`, `SeuilIndicateur`.
Parser : `src/lib/excel/parse-reporting.ts`. Route : `src/app/api/parse/reporting/route.ts`.
UI : `src/components/reporting/*` (`AgenceTabs`, charts, cartes).

## What not to do

- ❌ Recalculer les % déjà présents (38–43) « pour vérifier ».
- ❌ Hardcoder les seuils (795, 12 %…) — toujours col A.
- ❌ Recalculer F45 (nb mois impayés) — le lire.
- ❌ Afficher un total CA recalculé à la place de L14.
- ❌ Inverser rouge/vert sur deltas négatifs (amélioration = delta > 0).
- ❌ Se fier au mapping approximatif du mail plutôt qu’au CDC.
- ❌ Fusionner avec le modèle trésorerie.
- ❌ Inclure `Chiffres Clés` / `Synthèse` comme onglets UI.

## Checklist

- [x] Multi-onglets CR (hors CK / Synthèse) + soft-skip hors modèle
- [x] CK C–F pour FLW/FLO/WAE/WAO ; pilotage conditionnel
- [x] `AgenceTabs` + défaut WAL O
- [x] Mois vides ignorés
- [x] Un seul calcul autorisé : nb mois cahier de commande
- [x] AT1–AT5 + 🔶 pilotage (si CK)
- [x] État session only ; empty = `ReportingEmptyPreview`
- [x] Export PDF A4 paysage (choix agence / tous les onglets, 1 page / onglet, nom fichier)
