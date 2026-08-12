# Spec — Reporting : sélection de mois + vue consolidée

**Date** : 2026-08-12  
**Statut** : validé (design session)  
**Périmètre** : Dashboard Reporting Financier (`/reporting`) uniquement — trésorerie hors scope  
**Contexte** : retour client — fichier avec données jusqu’à juillet → seul janvier affiché

---

## 1. Problème

Le parseur reporting lit toujours la colonne **B** (janvier) via `extractAgenceCr(sheet, monthCol = "B")`. Les mois suivants (C→M) sont ignorés. Thomas voit donc janvier même lorsque le fichier contient plusieurs mois remplis.

## 2. Objectifs

1. **Défaut** = dernier mois rempli du fichier (ex. juillet si B→H non vides).
2. **Sélecteur** de tous les mois disponibles.
3. **Vue consolidée** de tous les mois disponibles (montants sommés ; taux selon règles §5).

## 3. Décisions produit (session)

| Sujet | Choix |
|---|---|
| Approche technique | Parse multi-mois au upload + sélecteur UI (pas de re-parse à la volée) |
| Montants consolidés | Somme des mois remplis |
| Taux % consolidés | Recalcul depuis totaux si formule claire ; sinon moyenne (A2) |
| Pilotage commercial (CK) | Toujours affiché, indépendant du mois sélectionné |
| Cartes vs N-1 (O35 / P95) | Valeurs fichier inchangées dans toutes les vues |
| PDF | Exporte la période actuellement sélectionnée (pas de dialogue multi-périodes) |

## 4. Architecture données

### 4.1 Mois disponible

Une colonne B→M est un mois disponible si :

1. L4 matche un en-tête mois (heuristique `MONTH_HEADER` existante), **et**
2. L14 (`caTotal`) est non vide et ≠ 0.

### 4.2 Modèle

Étendre le modèle reporting (sans fusionner avec la trésorerie) :

```ts
type ReportingMonthId = string; // col Excel "B" | "C" | … | "consolide"

type ReportingMonthMeta = {
  id: ReportingMonthId; // "B", "C", …
  label: string;        // L4, ex. "Juillet"
  col: string;
};

/** Extrait CR d’un mois (mapping CDC inchangé, monthCol variable). */
type ReportingMonthSlice = {
  periodeMois: string;
  repartitionCA: RepartitionCA[];
  caTotal: number;
  beneficeBrut: number;
  margeBrute: number;
  tauxClesBase: { nom: string; valeur: number }[];
  structureCharges: StructureCharges;
  profitApresImpots: number;
  fraisFixes: number;
  breakEven: number;
};

/** Par agence : mois + parts partagées (N-1, CK). */
type ReportingAgency = {
  // identité agence (agenceId, agenceCible, agenceLibelle, …)
  months: ReportingMonthMeta[];
  byMonth: Record<string, ReportingMonthSlice>; // clé = col "B"…
  // partagé :
  beneficeBrutN1: number;
  variationVsN1: number;
  chiffresClesDisponibles: boolean;
  moisEcoules: number;
  cumulCA: number;
  seuils: SeuilIndicateur[];
  cahierCommande: CahierCommande;
  impayes: Impayes;
  euroCoupon: EuroCoupon;
  fileName: string;
  periodeAnnee: number | null;
};
```

La vue écran continue de consommer un **`ReportingData` plat** (compatibilité AT1–AT5 / PDF / brief / alertes) :

- Mois unitaire → slice + parts partagées + `buildTauxCles`.
- Consolidé → dérivé (§5), **non stocké** au parse.

### 4.3 État session / cache

- `selectedMonthId` : `"consolide"` | `"B"` | `"C"` | … — même cycle de vie que `selectedAgenceId` (`localStorage` via `dashboard-storage`).
- Défaut à l’upload / reset : **dernier** élément de `months[]` (ordre chronologique B→M).
- Changement d’agence : conserver `selectedMonthId` s’il existe chez la nouvelle agence ; sinon → dernier mois de cette agence.
- Cache version : bump de clé si le shape du bundle change (éviter hydrate cassé).

## 5. Règles de consolidation

Produit un `ReportingData` dérivé à partir des slices des mois disponibles de l’agence active.

| Champ | Règle |
|---|---|
| `repartitionCA[].montant`, `caTotal`, `beneficeBrut`, `structureCharges.*`, `profitApresImpots`, `fraisFixes`, `breakEven` | **Σ** sur les mois dispo |
| `margeBrute` | **Recalcul** : `Σ beneficeBrut / Σ caTotal` si `Σ caTotal ≠ 0`, sinon 0 |
| `tauxCles[].valeur` | **Moyenne** arithmétique des valeurs mois (pas de numérateur/dénominateur dans le modèle) ; seuils/statut via `buildTauxCles` existant |
| `beneficeBrutN1`, `variationVsN1` | Inchangés (O35 / P95) |
| Pilotage / CK | Inchangés |
| `periodeMois` | Libellé du type `Consolidé (jan.–juil.)` (bornes = premier / dernier mois dispo) |

## 6. UI

1. Nouveau sélecteur **période** sous `AgenceTabs` (même chrome : `border-b-2 border-accent` sur l’actif).
2. Onglets = labels mois dispo + onglet final **« Consolidé »**.
3. Badge en-tête :
   - mois : `données {mois} {année}` (comportement actuel, mois = sélection) ;
   - consolidé : `données consolidées {année}` (ou libellé `periodeMois` dérivé).
4. Composants AT1–AT5 / Pilotage / Print : **inchangés** en props — reçoivent le `ReportingData` de la vue active.
5. Brief, alertes, assistant : basés sur la **vue affichée** (mois ou consolidé).

## 7. Parsing

- Réutiliser `extractAgenceCr(sheet, monthCol)` pour chaque colonne B→M retenue.
- N-1 toujours depuis O35 / P95 (une fois par onglet).
- CK / seuils / soft-skip hors CR : inchangés.
- Si **aucun** mois rempli → `ParseError` explicite (FR).

## 8. Cas limites

- Un seul mois rempli → défaut = ce mois ; « Consolidé » = mêmes chiffres (acceptable POC).
- Mois vides (L14 = 0 / vide) → exclus du sélecteur et de la somme.
- Trésorerie : aucun changement.
- Pas de graphe d’évolution mois à mois ; pas de dialogue PDF multi-périodes.

## 9. Fichiers touchés (indicatif)

- `src/types/dashboard.ts` — types multi-mois
- `src/lib/excel/parse-reporting.ts` — détection mois + slices
- `src/lib/reporting/consolidate-months.ts` (nouveau) — dérivation consolidée
- `src/contexts/dashboard-data-context.tsx` + `src/lib/dashboard-storage.ts` — `selectedMonthId`
- `src/components/reporting/MoisTabs.tsx` (nouveau)
- `src/app/(dashboard)/reporting/page.tsx` — branchement sélecteur + vue active
- `docs/agent/reporting.md` + `docs/agent/decisions.md` — living docs

## 10. Hors scope

- Trésorerie multi-mois
- Export PDF de toutes les périodes d’un coup
- Persistance serveur / BDD
- Recalcul inventé de taux hors moyenne / marge (ex. inventer un dénominateur CA pour chaque taux)

## 11. Critères d’acceptation

- [ ] Fichier avec mois B→H remplis → défaut UI = dernier mois (H / juillet), pas janvier
- [ ] Sélecteur liste tous les mois remplis + « Consolidé »
- [ ] Vue mois = mapping CDC de la colonne choisie
- [ ] Vue consolidée = Σ montants ; marge = Σ bénéfice / Σ CA ; taux clés = moyenne
- [ ] Pilotage CK identique quelle que soit la période
- [ ] N-1 (bénéfice / variation) identiques quelle que soit la période
- [ ] Changement d’agence conserve le mois si possible
- [ ] Refresh navigateur conserve la période (cache)
- [ ] Reset / nouvel upload → dernier mois rempli
- [ ] `npm run lint` + `npm run build` OK
- [ ] Playbooks `reporting.md` + entrée `decisions.md` à jour
