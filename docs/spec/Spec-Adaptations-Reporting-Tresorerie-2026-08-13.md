# Spec — Adaptations Dashboard Reporting Financier & Trésorerie

**Déclencheur :** appel Thomas Di Donato du 13/08/2026 (revue de l'existant, après présentation de l'offre « Rapprochement CRM/Winbooks — Luxembourg », projet distinct hors périmètre de cette spec)
**Rédigé le :** 13/08/2026
**Référence projet :** Projet-001 — POC Dashboard Financier
**Validé par Yassine le 13/08/2026** (liste de changements + 3 clarifications : Hollande = colonne H, split Bénéfice Brut/Net en cumul + mois, terminologie « Surveyor »)

---

## 0. Contexte technique — ce qui a changé dans le repo depuis la dernière spec (07/08)

Avant de détailler les nouveaux points, deux constats factuels tirés de `git log` et de la lecture du code actuel, importants pour la suite :

1. **L'authentification (login/mot de passe) a été implémentée** (commit `a845a3e`, 07/08/2026 17:53 — JWT cookies, routes `(auth)/login`, `api/auth/login`, `api/auth/logout`, middleware `proxy.ts`). Pour mémoire, la spec du 07/08 avait qualifié ce point de Demande de Changement hors périmètre AT nécessitant un devis distinct — je ne sais pas si ce cadrage contractuel a été formalisé avec Thomas avant le développement. **Point à vérifier avec toi**, indépendamment de la présente spec technique.
2. **Le Reporting a été refondu pour supporter la multi-sélection de mois + une vue consolidée** (commits `eb8c861` et `a3cdae8`, 12-13/08/2026 — `MoisTabs`, `ReportingAgency` multi-mois, `resolveReportingView`/`consolidateAgency` dans `src/lib/reporting/month-view.ts`). C'est cette fonctionnalité toute neuve que Thomas testait en live pendant l'appel (« comme ça j'ai mon CEO qui peut voir le mois concerné et puis toute l'année »).

Les deux corrections Trésorerie de la spec du 07/08 (variation 01/01 = `Z43 − Z52`, répartition pays sur `Z43`/`soldeGeneral`) et le filtrage des sociétés à recettes+dépenses nulles sont **confirmés en code et validés en live par Thomas pendant l'appel**. Rien à refaire sur ces trois points.

---

## 1. Dashboard Reporting Financier

### R1 + R2 + R3 — Restructuration du bloc Bénéfice Brut / Bénéfice Net / Variations (regroupées, car c'est un seul changement cohérent)

**Demande (clarifiée) :** 4 valeurs distinctes doivent être visibles : Bénéfice Brut, Bénéfice Brut du mois, Bénéfice Net, Bénéfice Net du mois — en plus des deux variations vs N-1 (une pour le brut, une pour le net, alors qu'aujourd'hui une seule est affichée).

**Ce qui existe aujourd'hui** (`src/components/reporting/BeneficeBrutCard.tsx`, `VariationGlobaleCard.tsx`) :
- `BeneficeBrutCard` affiche `data.beneficeBrut` (contextuel à la période sélectionnée — mois unitaire ou Σ consolidée, cf. `month-view.ts`) + un encart delta vs N-1 (`beneficeBrutN1`, toujours O35, indépendant du mois).
- `VariationGlobaleCard` affiche uniquement la variation **Bénéfice Net** (`P95`), avec en contexte le profit après impôts de la **période sélectionnée** (pas nécessairement « du mois »).
- Aucune variation Bénéfice Brut (P35) n'est actuellement lue ni affichée — choix documenté explicitement dans `docs/agent/reporting.md` (« P95 plutôt que P35 »), à inverser.

**Point à clarifier avant dev (hypothèse de travail ci-dessous, à valider) :** « Bénéfice Brut du mois » / « Bénéfice Net du mois » doit-il désigner :
- (a) le dernier mois rempli, affiché **en plus**, quelle que soit la période sélectionnée (mois passé ou vue consolidée) — pour garder un repère « mois courant » constant à côté de la valeur de la période choisie ; ou
- (b) une distinction cumul/mois qui existerait nativement dans le fichier Excel (deux cellules séparées) que le parser ne lit pas encore.

Je pars sur l'hypothèse (a) ci-dessous — c'est cohérent avec le moment de la demande (Thomas était sur l'onglet **Consolidé** quand il a formulé ce besoin) et ça ne suppose pas une structure de cellule qu'on n'a pas vérifiée sur le fichier réel. **À confirmer avec Thomas ou en relisant le nouveau fichier qu'il doit envoyer avant de coder.**

**Spec technique (hypothèse a) :**

1. `src/types/dashboard.ts` :
   - `ReportingData` : ajouter `beneficeBrutMoisCourant: number`, `beneficeNetMoisCourant: number` (= `profitApresImpots` du dernier mois, indépendant de la période sélectionnée).
   - Renommer/clarifier `variationVsN1` → `variationBeneficeNetVsN1` (garder alias ou renommer partout — `alerts.ts`, `brief.ts`, `ReportingPrintSheet.tsx`, `month-view.ts`).
   - Ajouter `variationBeneficeBrutVsN1: number` (nouvelle donnée, P35).

2. `src/lib/excel/parse-reporting.ts` — fonction `extractN1` :
   ```ts
   variationBeneficeBrutVsN1: requireNumber(sheet, "P35", "Variation bénéfice brut vs N-1"),
   variationBeneficeNetVsN1: requireNumber(sheet, "P95", "Variation vs N-1 (profit après impôts)"),
   ```

3. `src/lib/reporting/month-view.ts` — `sharedAgencyFields` : ajouter le calcul de `beneficeBrutMoisCourant` / `beneficeNetMoisCourant` à partir de `agency.byMonth[defaultMonthId(agency)]` (le dernier mois rempli), indépendamment de `monthId` sélectionné.

4. UI — nouveau layout à 4 tuiles (`md:grid-cols-4` ou 2x2 selon largeur) dans `src/app/(dashboard)/reporting/page.tsx` :
   - `BeneficeBrutCard` simplifiée : montant + marge uniquement, **sans** l'encart delta (retirer le bloc `TrendArrow`/`toneClass` actuel, lignes ~60-83).
   - Nouvelle carte `BeneficeNetCard` : `beneficeNetMoisCourant` (ou la valeur de période sélectionnée, selon la clarification ci-dessus).
   - `VariationGlobaleCard` scindée en deux : `VariationGlobaleBrutCard` (P35) et `VariationGlobaleNetCard` (P95, = composant actuel renommé).

### R4 — Bloc Technique (Structure des charges) incomplet

**Demande confirmée :** ajouter les lignes 30 (« Déplacement Surveyor ») et 31 (« Salaire Surveyor ») au total actuellement affiché (ligne 53), de façon additive.

**Spec technique** — `src/lib/excel/parse-reporting.ts`, fonction `extractMonthSlice` :
```ts
const structureCharges: StructureCharges = {
  technique:
    requireNumber(sheet, `${col}53`, "Charges TECHNIQUE") +
    requireNumber(sheet, `${col}30`, "Déplacement Surveyor") +
    requireNumber(sheet, `${col}31`, "Salaire Surveyor"),
  vente: requireNumber(sheet, `${col}62`, "Charges VENTE"),
  administration: requireNumber(sheet, `${col}78`, "Charges ADMINISTRATION"),
  financier: requireNumber(sheet, `${col}83`, "Charges FINANCIER"),
};
```
Impact vue consolidée (`month-view.ts` → `consolidateAgency`) : aucun changement nécessaire, la somme des `technique` par mois inclut déjà les lignes 30/31 puisqu'elles sont agrégées dans le champ avant consolidation.
À mettre à jour : `docs/agent/reporting.md` ligne « Charges | Technique 53… » → préciser `53 + 30 + 31`.

### R5 — Seuil Euro/coupon inversé

**Demande confirmée :** au-dessus du seuil (795) = bon (aujourd'hui traité comme mauvais). Règle inverse de celle des Impayés (où en dessous du seuil reste bon) — ce n'est **pas** une règle générale à changer, seulement l'indicateur Euro/coupon.

**Spec technique** — `src/components/reporting/PilotageCommercialBlock.tsx` :
```ts
// Avant (partagé Impayés + Euro/coupon) :
function seuilStatut(valeur: number, seuil: number): SeuilStatut {
  return valeur <= seuil ? "ok" : "danger";
}

// Après — deux règles distinctes :
function seuilStatutPlafond(valeur: number, seuil: number): SeuilStatut {
  // Impayés : rester sous le seuil = bon (inchangé)
  return valeur <= seuil ? "ok" : "danger";
}
function seuilStatutPlancher(valeur: number, seuil: number): SeuilStatut {
  // Euro/coupon : dépasser le seuil = bon
  return valeur >= seuil ? "ok" : "danger";
}
```
Appliquer `seuilStatutPlancher` uniquement à `statutEuro` (garder `seuilStatutPlafond` pour `statutImpayes`).

Également à corriger — `src/lib/poc/alerts.ts` ligne ~75, la génération d'alerte est dans le même sens que le bug :
```ts
// Avant :
if (data.euroCoupon.valeur > data.euroCoupon.seuil) { /* alerte danger */ }
// Après :
if (data.euroCoupon.valeur < data.euroCoupon.seuil) { /* alerte danger */ }
```
À mettre à jour : `docs/agent/reporting.md` — la règle « Flags seuil simple : ≤ ok, > danger » doit désormais préciser l'exception Euro/coupon (sens inverse), sinon la doc contredit le code pour la prochaine itération.

### R6 — Pilotage commercial absent pour Luxembourg et Hollande

**Demande confirmée, colonnes précisées :** Luxembourg = colonne **J**, Hollande = colonne **H** (Chiffres Clés).

**Constat code** — `src/lib/excel/parse-reporting.ts`, `CK_REGISTRY` : seules 4 agences sont enregistrées aujourd'hui (`FLW`→C, `FLO`→D, `WAE`→E, `WAO`→F). Luxembourg et Hollande n'y figurent pas du tout, donc `chiffresClesDisponibles` reste `false` pour ces agences quel que soit leur contenu réel — d'où l'absence du bloc Pilotage Commercial.

**Bloquant avant dev :** contrairement aux 4 entrées existantes, je n'ai pas le nom d'onglet Excel ni le code A3 utilisés pour Luxembourg et Hollande dans les Comptes de Résultat (le mapping se fait sur `sheetNames` **ou** `codes` A3 — voir `resolveCkEntry`). **Question à te poser / à poser à Thomas** : quels sont les noms d'onglets ou codes A3 pour ces deux agences dans le fichier réel ? Le nouveau fichier consolidé que Thomas doit envoyer devrait le révéler directement — à vérifier dessus avant de coder plutôt que de deviner.

**Spec technique (à compléter avec les vraies valeurs) :**
```ts
{
  codes: ["LUX"], // à confirmer
  sheetNames: ["???"], // à confirmer sur le fichier réel
  col: "J",
  libelleFallback: "Luxembourg",
},
{
  codes: ["HOL"], // à confirmer
  sheetNames: ["???"], // à confirmer sur le fichier réel
  col: "H",
  libelleFallback: "Hollande",
},
```

### R7 — Dépendance données

Thomas doit envoyer un fichier Reporting consolidé plus complet (Luxembourg, Hollande, N-1). Nécessaire pour tester R1-R3 (cellules P35, mois multiples) et R6 (identifier les onglets Luxembourg/Hollande). **Ne pas livrer R6 sans ce fichier.**

---

## 2. Dashboard Trésorerie

### T1, T2, T3 — Confirmés déjà en production (aucune action)

- Filtrage des sociétés à recettes **et** dépenses nulles : implémenté (`RecettesDepensesBlock.tsx`, `societesActives`) et repris côté export PDF (`TresoreriePrintSheet.tsx`). Validé par Thomas en live.
- Variation depuis le 01/01 (`Z43 − Z52`) et répartition par pays sur base placements inclus (`soldeGeneral`, `Z43`) : implémentés et validés par Thomas en live.

*(Remarque : pendant l'appel, Thomas a un instant redit sa demande de masquage des zéros comme si ce n'était pas fait, avant de se corriger lui-même. Le code confirme que c'est bien en place — pas d'action, sauf si un futur retour montre un écart entre ce qui est déployé chez Murprotec et le `main` du repo, auquel cas ce serait un problème de synchronisation du déploiement, pas de code.)*

### T4 — Composition des dépenses non triée (nouveau gap confirmé)

**Demande :** trier les postes de la Composition des dépenses par montant décroissant (ex. Fournisseurs 58,6 % en premier), au lieu de l'ordre fixe actuel (Salaires, Impôts, Fournisseurs, Dividendes, Transferts).

**Constat code :** l'ordre est câblé en dur dans deux fichiers, non touchés depuis le commit initial :
- `src/components/tresorerie/CompositionDepensesBlock.tsx` — tableau `SEGMENTS`.
- `src/components/tresorerie/TresoreriePrintSheet.tsx` — tableau `COMPOSITION` (même ordre, dupliqué pour l'export PDF).

**Spec technique** — dans les deux fichiers, remplacer l'ordre fixe par un tri dynamique sur `composition`/`legend` après calcul des montants :
```ts
// CompositionDepensesBlock.tsx — après construction de `legend` :
const legend = SEGMENTS.map((s) => {
  const montant = composition[s.key];
  const pct = totalDepenses === 0 ? 0 : montant / totalDepenses;
  return { ...s, montant, pct };
}).sort((a, b) => b.montant - a.montant);
```
Même principe pour `composition` dans `TresoreriePrintSheet.tsx` (`.sort((a, b) => b.montant - a.montant)` après le `.map`). Le graphique en barre empilée (`BarChart` stackId) n'a pas besoin d'être trié dans le même sens que la légende — seule la légende (liste ordonnée avec %) est concernée par la demande de Thomas, mais par cohérence visuelle je recommande de trier aussi l'ordre des segments empilés dans le graphique.

### Alertes / Brief — aucune action

Trésorerie jugée cohérente par Thomas. Reporting pas encore relu par lui — à surveiller après livraison des points R1-R6, pas d'action immédiate.

---

## 3. Récapitulatif des points bloquants avant de coder

| # | Point | Blocage | Qui tranche |
|---|---|---|---|
| 1 | R1-R3 : sens exact de « du mois » (dernier mois constant vs cellule dédiée du fichier) | Hypothèse (a) retenue par défaut — à confirmer | Toi, ou question à Thomas |
| 2 | R6 : nom d'onglet / code A3 pour Luxembourg et Hollande | Pas d'info dans le transcript ni tes clarifications | Fichier à venir de Thomas, ou question directe |
| 3 | R7 : fichier consolidé à jour (Luxembourg, Hollande, N-1) | Nécessaire pour tester R1, R3, R6 | Thomas (à relancer si pas reçu) |

---

## 4. Plan d'action recommandé

1. Corriger T4 (Composition des dépenses) — indépendant, aucune dépendance de données, faisable immédiatement.
2. Corriger R5 (seuil Euro/coupon) — indépendant, faisable immédiatement avec les fichiers de test existants.
3. Corriger R4 (lignes 30/31 technique) — faisable avec les fichiers de test existants.
4. Attendre le fichier consolidé de Thomas (R7) avant R1-R3 et R6, pour éviter de deviner des cellules ou des noms d'onglets qui seront de toute façon à revalider dessus.
5. Mettre à jour `docs/agent/reporting.md` en parallèle de chaque correctif (mapping technique 53+30+31, exception de sens Euro/coupon, nouvelles agences CK_REGISTRY).

---

## 5. Prochaine étape concrète

Valider avec toi les 3 points bloquants du §3 — en particulier l'hypothèse (a) sur « bénéfice du mois » — avant de lancer le développement de R1-R3. Les points T4, R4 et R5 peuvent démarrer dès maintenant sans attendre de réponse.
