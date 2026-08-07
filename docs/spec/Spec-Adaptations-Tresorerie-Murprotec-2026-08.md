# Spec — Adaptations Dashboard Trésorerie Murprotec

**Déclencheur :** email Thomas Di Donato du 04/08/2026, objet « Dashboard Trésorerie Murprotec - Demande d'adaptation »
**Rédigé le :** 07/08/2026
**Référence projet :** Projet-001 — POC Dashboard Financier
**Statut contractuel au moment de la demande :** période de recette en cours (Annexe Technique signée 13-17/07/2026 ; Atelier 2/Delivery ~24/07/2026 ; délai de recette de 30 jours calendaires en cours, échéance ~23-24/08/2026 ; 2 cycles de recette autorisés, ceci constitue le 1er signalement écrit du Client)

---

## 1. Contenu brut de la demande (email 04/08/2026)

> J'ai utilisé l'outil pour la Trésorerie, ce qui m'a permis de voir des anomalies à adapter :
> 1. La variation de trésorerie depuis le 01/01 semble ne pas fonctionner correctement — il me semble que le calcul fait trésorerie hors placements − trésorerie placements inclus N-1. Il faudrait faire le delta sur les deux trésoreries placements inclus.
> 2. La répartition par pays serait plus appropriée sur la trésorerie placements inclus.
> 3. Peut-on ne pas afficher les sociétés avec recettes et dépenses à 0 ?
> 4. Dans la répartition des recettes, peut-on classer du plus important au plus petit ?
> 5. Par ailleurs, comme déjà mentionné lors de notre dernière visio, peux-tu ajouter l'option de login et mot de passe pour assurer une sécurité un peu plus importante ?

---

## 2. Classification contractuelle — à faire en premier, avant tout dev

Le Contrat-Cadre (Art. 7.2) définit une anomalie comme *« toute défaillance reproductible empêchant une fonctionnalité de fonctionner conformément aux spécifications décrites dans l'Annexe Technique »*, et exclut explicitement *« les évolutions fonctionnelles ou demandes nouvelles »* et *« les améliorations UX non décrites dans l'Annexe Technique »*. L'Annexe Technique (Art. 2.1) liste les 6 indicateurs Trésorerie ; toute fonctionnalité non explicitement décrite y est présumée hors périmètre (Contrat-Cadre Art. 1 et 3.2).

| # | Demande | Qualification | Base contractuelle | Couvert par la garantie (gratuit) ? |
|---|---|---|---|---|
| 1 | Variation 01/01 — bases hors/inclus placements incohérentes | **Bug confirmé** | AT §2.1 liste explicitement cet indicateur ; incohérence de calcul avérée (voir §3.1) | **Oui** — anomalie au sens Art. 7.2, dans le délai des 30 jours |
| 2 | Répartition pays sur trésorerie placements inclus | **Zone grise** | AT §2.1 ne précise pas la base (hors/inclus) pour cet indicateur — aucune spec violée | **Discutable** — pas une anomalie stricto sensu, plutôt une clarification de spec ambiguë. Recommandation : traiter comme un ajustement mineur de bonne volonté plutôt que d'ouvrir un débat contractuel pour un coût de dev faible |
| 3 | Masquer sociétés recettes+dépenses = 0 | **Évolution UX non décrite** | AT §2.1 ne mentionne aucun filtrage ; Art. 7.2 exclut explicitement les « améliorations UX non décrites dans l'AT » | **Non, en toute rigueur** — mais coût de dev négligeable, recommandé en geste commercial |
| 4 | Trier les recettes décroissant | **Déjà implémenté** dans le code (voir §3.4) | Sans objet | Sans objet — à vérifier avant tout dev (cf. §4) |
| 5 | Login + mot de passe | **Hors périmètre confirmé** | AT §4.4 : *« accès simple réservé à un seul utilisateur… pas de gestion de comptes multiples »* ; AT §8.4 : *« aucun identifiant, clé API, mot de passe… n'est créé par le Prestataire dans le cadre de ce POC »* — contradiction frontale et documentée | **Non** — Demande de Changement obligatoire (Contrat-Cadre Art. 3.2), devis distinct à 600 €HT/jour sauf accord spécifique |

**Point de vigilance stratégique pour toi (Yassine) :** ce signalement du 04/08 consomme le **1er des 2 cycles de recette gratuits** (Contrat-Cadre Art. 7.3). Au-delà du 2e cycle, ou passé le délai de 30 jours, toute intervention — bug ou évolution — bascule en régie à 600 €HT/jour (Contrat de Maintenance Art. 6, puisque Murprotec n'a souscrit qu'à l'hébergement, explicitement *« sans maintenance applicative »*, Art. 2). Il faut décider maintenant si les points 2 et 3 (limite de la garantie) sont traités gratuitement dans ce cycle par geste commercial, ou explicitement requalifiés en petite Demande de Changement facturée — mais **pas les deux implicitement** : le flou coûte cher sur la suite (précédent créé pour les prochaines demandes).

---

## 3. Spec technique détaillée

### 3.1 — Variation depuis le 01/01 (bug confirmé)

**Fichiers concernés :** `src/lib/excel/parse-tresorerie.ts`, `src/types/dashboard.ts`

**Diagnostic (vérifié sur `docs/assets/TRESOR 30 06 2026 Boldys.xls`) :**
- Ligne 27 (`positionNette`) = solde hors placements.
- Ligne 40 (`Total Placement`) + ligne 27 = ligne 43 (`Total General`, `totalGeneral`) = base **placements inclus**.
- Ligne 52 (`Solde au 01/01/2026`) est une valeur unique saisie manuellement par le Client chaque année (AT §9.1 : *« ajouter… une valeur de trésorerie figée au 1er janvier »*) — elle n'est pas décomposée hors/inclus placements dans le fichier, donc elle ne peut être comparée de façon cohérente qu'à un agrégat lui aussi non décomposé, soit `Z43` (placements inclus).

Code actuel :
```ts
variationDepuis1erJanvier: positionNette - soldeAu1erJanvier, // Z27 - Z52 → bases incohérentes
```

Correction :
```ts
variationDepuis1erJanvier: totalGeneral - soldeAu1erJanvier, // Z43 - Z52 → bases cohérentes (placements inclus)
```

**Impact UI :** aucun changement de composant nécessaire (`VariationDepuis1erJanvierCard.tsx`, `TresorerieKpiRow.tsx`, `alerts.ts`, `brief.ts`, `TresoreriePrintSheet.tsx` consomment tous `data.variationDepuis1erJanvier` sans logique propre) — un seul point de calcul à corriger.

**À mettre à jour :** `docs/agent/tresorerie.md` ligne 27 (« Variation depuis 01/01 | `Z27 − Z52` » → `Z43 − Z52`) + commentaire dans `VariationDepuis1erJanvierCard.tsx` (« Indicateur AT — variation = Z27 − Z52 »).

**Non-régression à tester :** rejouer `TRESOR 30 06 2026 Boldys.xls` → nouvelle valeur attendue = `1443181 − 208593,13 = 1234587,87` (vs actuellement `735103 − 208593,13 = 526509,87`). Écart significatif — s'assurer que Thomas comprenne que le chiffre affiché va sensiblement changer (à annoncer, pas juste livrer silencieusement).

### 3.2 — Répartition par pays sur trésorerie placements inclus

**Fichiers concernés :** `src/types/dashboard.ts`, `src/lib/excel/parse-tresorerie.ts`, `src/components/tresorerie/RepartitionPaysChart.tsx`, `src/components/tresorerie/TresoreriePrintSheet.tsx`

**Faisabilité confirmée :** la ligne 43 (`Total General`) existe **par société** dans le fichier (colonnes C→Y), pas seulement en colonne Z. On peut donc agréger par pays sur cette base sans donnée manquante.

Modifications :
1. `TresorerieSociete` (types/dashboard.ts) : ajouter un champ `soldeGeneral: number` (ligne 43, placements inclus par société ; null → 0, même règle que les autres champs société).
2. `parse-tresorerie.ts` : lire `getNumberOrNull(sheet, \`${colonne}43\`)` en plus de la ligne 27 actuelle.
3. `parPays` : remplacer l'agrégation actuelle (`s.soldeCourant`) par `s.soldeGeneral`.
4. `RepartitionPaysChart.tsx` : aucun changement structurel — le composant consomme déjà `parPays` de façon générique. Mettre à jour uniquement les libellés implicites si besoin (le composant n'affiche pas explicitement « hors/inclus » aujourd'hui, donc pas de risque de contradiction visuelle).
5. `TresoreriePrintSheet.tsx` : même source `data.parPays`, donc suit automatiquement le changement — **à vérifier en recette visuelle** pour confirmer la cohérence écran/PDF.

**Point à trancher :** le total affiché au centre du donut et dans l'en-tête (« Total soldes positifs ») basculera aussi sur la base placements inclus — cohérent avec la demande, mais vérifier que Thomas ne s'attend pas à un total qui matche encore le KPI « Position nette » (qui reste hors placements par ailleurs, Art AT §2.1 non modifié sur ce point). Risque de confusion à anticiper dans la réponse à Thomas.

### 3.3 — Masquer les sociétés à recettes ET dépenses nulles

**Fichier concerné :** `src/components/tresorerie/RecettesDepensesBlock.tsx` (fonction `toRows`), potentiellement `TresoreriePrintSheet.tsx` pour cohérence écran/PDF (voir décision à prendre ci-dessous).

Lecture littérale de la demande : masquer une société uniquement si **recettes = 0 ET dépenses = 0** (une société avec recettes à 0 mais dépenses > 0 doit rester visible dans le graphique dépenses, et inversement).

Modification proposée dans `RecettesDepensesBlock.tsx` avant l'appel à `toRows` :
```ts
const societesActives = parSociete.filter(
  (s) => s.recettesMois !== 0 || s.depensesMois !== 0,
);
```
puis appeler `toRows(societesActives, ...)` pour les deux graphiques (recettes et dépenses).

**Décision à prendre (impact documentation) :** `docs/agent/tresorerie.md` §Export PDF précise actuellement que les graphiques d'impression affichent *« toutes les sociétés »* (choix documenté). Si on filtre à l'écran, il faut décider si le PDF suit la même règle (recommandé, pour éviter un écart visible entre écran et export que Thomas signalera ensuite) — dans ce cas, appliquer le même filtre dans `TresoreriePrintSheet.tsx` (`recettes`/`depenses` memo) et mettre à jour la doc en conséquence.

### 3.4 — Tri des recettes du plus important au plus petit

**Constat :** le tri descendant existe déjà dans le code actuel, **depuis le commit initial du projet** (`RecettesDepensesBlock.tsx` → `toRows` → `sorted = [...parSociete].sort((a, b) => b[valueKey] - a[valueKey])`), et de façon identique dans `TresoreriePrintSheet.tsx`. `git log` confirme qu'aucune régression n'a été introduite sur ce point.

**Aucune action de code identifiée à ce stade.** Deux hypothèses à lever avant de coder quoi que ce soit (voir §4 — Questions) :
- la version déployée chez le Client (hébergée sur son infra via Coolify, AT §4.1) n'est peut-être pas synchronisée avec le `main` du dépôt actuel ;
- Thomas fait peut-être référence à un autre graphique que « Recettes par société » (ex. légende de la répartition par pays, elle aussi déjà triée décroissante) — une capture d'écran permettrait de lever le doute en 30 secondes.

---

## 4. Questions à clarifier avant de coder

**En interne (à me confirmer, Yassine) :**
- Confirmes-tu qu'on traite les points 2 et 3 comme un geste commercial gratuit dans ce cycle de recette, plutôt que d'ouvrir un débat contractuel avec Thomas pour un gain de temps marginal ? Ça fixe un précédent pour la suite.
- Le déploiement chez Murprotec (Coolify, infra interne) est-il à jour avec `main` ? Si non, le point 4 n'est peut-être qu'un problème de mise à jour, pas de code.
- Pour le login (§5), veux-tu que je prépare un chiffrage (estimation jours + prix) avant ou après avoir formalisé la Demande de Changement avec Thomas ?

**À poser à Thomas (avant toute correction visuelle) :**
- Point 4 : peux-tu nous envoyer une capture d'écran du dashboard tel que tu le vois, avec le nom du graphique concerné ? Le tri décroissant semble déjà actif dans notre version de référence.
- Point 1 : le nouveau calcul va faire varier significativement le chiffre affiché (la correction change la base de référence) — à annoncer explicitement pour éviter un doute sur la fiabilité de l'outil.
- Point 5 (login) : peux-tu préciser le contexte exact de la demande verbale en visio (date, interlocuteur) pour qu'on la documente correctement côté Boldys avant de formaliser la Demande de Changement ?

---

## 5. Le sujet Login / mot de passe — à traiter séparément, pas comme un correctif

Ce point ne doit **pas** être mélangé aux 4 points précédents dans la réponse à Thomas ni dans le planning de correction. Il s'agit d'une fonctionnalité absente à 100 % du code (aucune dépendance d'auth, aucun middleware, aucune gestion de session — vérifié dans `package.json` et l'arborescence `src/`), explicitement exclue de l'Annexe Technique signée, et nécessitant des choix d'architecture non triviaux compte tenu du contexte technique du POC (pas de base de données, hébergement mutualisé chez le Client, un seul utilisateur prévu) :

- authentification à un seul facteur (login/mot de passe partagé) suffisante au vu du périmètre, ou identifiant unique + mot de passe en variable d'environnement (cohérent avec l'absence de BDD) ;
- gestion de session (cookie signé + middleware Next.js) à construire from scratch ;
- pas de mécanisme de reset de mot de passe prévu dans un premier temps (à trancher).

**Procédure contractuelle à respecter (Contrat-Cadre Art. 3.2) :**
1. Formaliser la Demande de Changement par écrit (retour à Thomas, ce mail ou un suivant, faisant explicitement référence à l'écart avec l'AT §4.4/§8.4).
2. Chiffrer en interne (estimation jours à 600 €HT/j, ou forfait).
3. Envoyer le chiffrage à Thomas pour acceptation écrite.
4. Ne démarrer le développement qu'après acceptation écrite (aucune mise en œuvre sans validation, Art. 3.2).

---

## 6. Plan d'action recommandé

1. Corriger le point 1 (bug confirmé, garantie) — livraison rapide, à annoncer avec pédagogie sur le changement de chiffre affiché.
2. Corriger le point 2 (faisabilité confirmée sur le fichier réel) en même temps, en geste commercial assumé.
3. Corriger le point 3 (filtrage sociétés à 0) en même temps, écran + PDF pour rester cohérent.
4. Répondre à Thomas sur le point 4 en demandant une capture d'écran avant tout développement — ne pas coder à l'aveugle un correctif sur un comportement déjà correct dans le dépôt.
5. Répondre séparément sur le point 5 en le requalifiant explicitement en Demande de Changement, sans engager de date de livraison avant acceptation écrite du chiffrage.
6. Mettre à jour `docs/agent/tresorerie.md` (mapping cellule variation 01/01, base de la répartition pays, règle de filtrage sociétés à 0) en même temps que le code, pour que la doc agent reste la source de vérité.

---

## 7. Prochaine étape concrète

Valider ce document avec toi (Yassine) — en particulier les 3 arbitrages ouverts en §4 — avant :
(a) de transformer les points 1-3 en tickets de dev, et
(b) de rédiger la réponse à Thomas (qui devra distinguer clairement correctifs gratuits, geste commercial, et Demande de Changement à chiffrer).
