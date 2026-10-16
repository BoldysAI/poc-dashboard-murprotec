# docs/agent/rapprochement.md — Rapprochement impayés (CDC-002)

> Brique indépendante de Trésorerie et Reporting. Ne pas étendre leurs parsers.

## Liste rouge CRM

Deux exports RTF (en-tête `{\rtf`), extension `.doc`. Pas un tableau : une cellule = un paragraphe `\pard` avec `\posx` / `\posy` (twips, ancré page).

Parser : `parseListeRouge` / `parseListeRougeFile` dans `src/lib/crm/parse-liste-rouge.ts`.
Type : `CrmListeRougeLigne` dans `src/types/rapprochement.ts`. Le même type sert aux deux exports.

### Liste rouge

Exemplaire : `exemplaires/LISTE ROUGE PAR DATE POSE.doc`.

Colonnes lues :

| Champ | En-tête | Règle |
|---|---|---|
| `nomClient` | Client | Libellé (lettres). Le code numérique à gauche (`00016279`) n'est pas extrait. |
| `numeroContrat` | Contrat | Texte brut, préfixe inclus (`LUA4049`, `LUC3080S`, `D-BE-281`, `DBE498`). |
| `numeroFacture` | No facture | Texte, ou `null`. |
| `dateFacture` | Date | `29 juil. 22` → `2022-07-29`. Année 00–69 → 2000+. Absente → `null`. |
| `montantRouge` | Mnt rouge | `4 849,87` → `4849.87`. Absent → `null`, jamais `0`. |

Regroupement : même page, `posy` à ± 40 twips (le montant rouge est ~1 pt au-dessus). Cadres de largeur ≥ 4000 twips = commentaires, ignorés. `Travaux le` et `Mnt TTC` servent d'ancres de colonnes et ne sortent pas du type.

Erreur utilisateur : `CrmParseError`, message en français.

Vérification : `npx tsx scripts/verify-liste-rouge.mts` (42 lignes sur l'exemplaire).

### Liste d'attente

Exemplaire : `exemplaires/LISTE ATT POSE PAR CONTRAT.doc` (même fichier que `exemplaires/compta/` et `exemplaires/finance/` dans la recette). Titre « LISTE D'ATTENTE JUSQU'AU 30/06/2026 ».

| Champ | En-tête | Règle |
|---|---|---|
| `nomClient` | Client | Libellé (lettres). Le code numérique à gauche n'est pas extrait. |
| `numeroContrat` | No Contrat | Texte brut (`000000000011075`, `D-BE-197`, `11127EC`). |
| `numeroFacture` | — | Pas de colonne. `null`. |
| `dateFacture` | Date | `11-juin-26` → `2026-06-11`. Même lecture que la liste rouge. |
| `montantRouge` | Montant | `6 468,62` → `6468.62`. Le drapeau `F` à droite du montant est ignoré. |

`Vendeur` est une ancre de colonne seulement : il ne sert pas au rapprochement et ne sort pas du type. La ligne `Pose:` / `Pose: 23/07/2026` non plus (date de pose). Les pourcentages sous le montant, les commentaires et le total en bas de page sont ignorés.

133 lignes. La somme des montants lus est 738 440,60 € ; le total imprimé du fichier est 738 440,59 €. Un RTF qui n'a ni les en-têtes liste rouge ni ceux de la liste d'attente est rejeté en français.

## Winbooks Excel

Exemplaire : `exemplaires/MURPROLUX Historique clients  30 06 2026.xls`.
Onglet `Sheet1`, titre « Postes ouverts clients ». En-tête ligne 5.

Parser : `parseWinbooks` / `parseWinbooksFile` dans `src/lib/winbooks/parse-winbooks.ts`.
Type : `WinbooksLigne`. Indépendant du parser CRM et de SheetJS trésorerie/reporting (lecture `xlsx` directe, `cellFormula: false`).

| Champ | Colonne | Règle |
|---|---|---|
| `numeroTiers` | Réf client | Texte trimé. Pas seulement des chiffres : `10599`, `281`, `241F1`, `LUD542`, `LUD634B`. |
| `solde` | Débit(debN) − Crédit(credN) | Pas de colonne Solde. Un crédit seul est négatif (`0 − 4079.78 = -4079.78`). Les deux cellules sont des nombres sur l'exemplaire, y compris `0`. `Mt.devise` est toujours 0 : pas de devise à lire. |

Une ligne Excel = une ligne. Pas de cumul par tiers. 203 lignes, 93 réf. distinctes.

Vérification : `npx tsx scripts/verify-winbooks.mts`.

## Winbooks PDF

Même exemplaire, export PDF : `exemplaires/MURPROLUX Historique clients 30 06 2026.pdf` (17 pages).
Parser : `parseWinbooksPdf` / `parseWinbooksPdfFile` dans `src/lib/winbooks/parse-winbooks-pdf.ts`.
Dépendance `pdfjs-dist` (build legacy sous Node, `pdfjs-dist/webpack.mjs` dans le navigateur pour le worker).

Mise en page lue sur ce fichier, pas un tableau Excel :

- Bandeau client : réf. à gauche (`x < 80`) et libellé à droite (`x > 90`), y compris quand le libellé est le numéro (`14094` / `14094`).
- Écritures en dessous : une date `jj/mm/aaaa` et un seul montant. Colonne selon l'abscisse par rapport au milieu entre les en-têtes `Débit` et `Crédit` (montants alignés à droite, l'abscisse de début varie). Débit → solde positif, crédit → solde négatif.
- Ligne `Solde (EUR)` = total du tiers, ignorée. Le bandeau client se poursuit d'une page à l'autre.

Même type `WinbooksLigne`. Sur l'exemplaire, les 203 lignes sont identiques à l'Excel.

Vérification : `npx tsx scripts/verify-winbooks-pdf.mts`.

## Rapprochement

`identifiantNormalise` + `rapprocher` dans `src/lib/rapprochement/rapprocher.ts`.

Identifiant = premier groupe de chiffres, zéros de tête retirés.

| Valeur | Identifiant |
|---|---|
| BE487, D-BE-487, tiers `487` | 487 |
| LUC3080S, LUC3080 | 3080 |
| 000000000011071, 11071EC | 11071 |
| 241F1 | 241 |

Les deux côtés sont normalisés de la même façon (`LUA4190` et un tiers `4190` se rejoignent).

- Un seul contrat pour ce nom client → toutes les écritures Winbooks de cet identifiant (`critere: "identifiant"`).
- Plusieurs contrats pour le même nom → la facture, sinon la date, désigne le compte. On y ajoute ensuite les autres écritures ouvertes du même numéro de tiers exact, si ce compte n'est pas déjà à ± 1 centime.
- `LUC3080` et `LUC3080S` (ou `D-BE-281` et `D-CU-281`) ne partagent pas leurs écritures : seul le numéro de tiers complet compte, pas la partie numérique.
- Une facture déjà juste (`DBE534`) ne reçoit pas l'écriture supplémentaire.
- Sinon la ligne CRM reste sans correspondance. Une écriture Winbooks n'est liée qu'une fois.

Sur l'exemplaire : 39 paires, 3 contrats sans écriture (`LUA4049`, `LUC2836`, `LUA4154`). `LUC3080` reprend aussi le document `19` (−900 €). `LUC3080S` ne le reçoit pas.

Vérification : `npx tsx scripts/verify-rapprochement.mts`.

## Statuts

`attribuerStatuts` dans `src/lib/rapprochement/statuts.ts`.

Solde Winbooks d'une paire = somme des écritures liées (en centimes). Écart = montant CRM − ce solde.

| Statut | Règle |
|---|---|
| OK | Les deux côtés sont là et \|écart\| ≤ 1 centime. |
| Not OK | Les deux côtés sont là et \|écart\| > 1 centime. Montant CRM absent → Not OK, écart null. |
| Non apparié | Ligne CRM sans écriture, ou écriture Winbooks sans contrat. Décision Boldys 23/09/2026. |

Exemplaire : 37 OK, 2 Not OK, 140 Non apparié (3 contrats + 137 écritures). `LUC3080`, `LUA4190` et `D-CU-281` passent OK en sommant les écritures du même tiers. `DBE534` reste OK sans son écriture en plus. `LUC2837` reste Not OK (écart `895.12` après ses trois écritures). `LUA4049`, `LUC2836`, `LUA4154` restent Non apparié.

Vérification : `npx tsx scripts/verify-statuts.mts`.

## Écran

Route `/rapprochement`. Deux dépôts : `parseListeRougeUpload` et `parseWinbooksUpload` (PDF si le fichier commence par `%PDF`, sinon Excel).

Le tableau à l'écran montre toutes les lignes, statut compris. Filtres (cases statut, client, contrat ou tiers, n° facture) et tri par colonne (deux sens) ne modifient ni le calcul ni les compteurs OK / Not OK / Non apparié. Aucune case statut cochée = tous les statuts. Plusieurs cases se combinent entre elles et avec les champs texte. La barre de filtres est sur fond distinct du tableau. Elle indique le nombre de lignes affichées, et « sur N » dès qu’un filtre est rempli. « Effacer les filtres » est alors disponible, même s’il reste des lignes. Un filtre sans résultat affiche « Aucune ligne ne correspond à ces filtres. »

L'export (`window.print()`, feuille `#rapprochement-print-sheet`) ignore le filtre et le tri de l'écran. « Exporter les écarts » ouvre une fenêtre de choix des statuts ; l'impression ne part qu'après confirmation. À l'ouverture, Not OK et Non apparié sont cochés, OK décoché. Annuler ferme sans imprimer. L'en-tête du PDF donne le nombre de chaque statut retenu. Si aucune ligne ne correspond : « Aucune ligne ne correspond aux statuts retenus pour cet export. »

Cache séparé `murprotec-rapprochement-cache-v1`, lu via `useDashboardData()`. Les statuts ne sont pas stockés : ils sont recalculés.

