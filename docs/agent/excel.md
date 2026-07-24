# docs/agent/excel.md — Couche SheetJS (.xls / .xlsx)

> À lire pour tout accès bas niveau Excel. Parsers métier → `tresorerie.md` / `reporting.md`.
> Référence : `src/lib/excel/sheet-utils.ts`, `read-workbook.ts`, `parse-file.ts`.

## Golden rules

1. **Toujours** `readWorkbook(buffer)` — options `cellFormula: false` (lire `cell.v`, jamais recalculer) ; `type: "array"` (navigateur + Node).
2. Cellule vide → **`null`** via `getCell` / `getNumberOrNull` — jamais un `0` silencieux.
3. Feuille absente → `ParseError` explicite (`getSheet`), message FR utilisateur.
4. Trésorerie : colonnes sociétés via `detectLastCompanyColumn` — ne pas hardcoder 23.
5. Lignes masquées (10, 52…) sont dans le fichier : accessibles comme les autres.
6. **Parse côté navigateur** — `parseTresorerieFile` / `parseReportingFile` (pas d’upload serveur). Entrée UI = `File` → `arrayBuffer()`.

## API

```ts
import {
  readWorkbook,
  getCell,
  getRow,
  getSheet,
  detectLastCompanyColumn,
  requireNumber,
  getNumberOrNull,
  parseTresorerieFile,
  parseReportingFile,
} from "@/lib/excel";

const wb = readWorkbook(buffer); // ArrayBuffer | Uint8Array
const sheet = getSheet(wb, "Tresorerie");
getCell(sheet, "Z45");           // number | string | null
getRow(sheet, 10, "C", "Y");     // CellValue[]
detectLastCompanyColumn(sheet);  // ex. "Y"

// Depuis FileUpload :
const data = await parseReportingFile(file);
```

## What not to do

- ❌ `XLSX.read` ad hoc sans `cellFormula: false`
- ❌ `optionalNumber` / `?? 0` sans intention métier documentée
- ❌ Lire `cell.f` (formule) pour un indicateur
- ❌ Remettre un `POST /api/parse/*` sans raison (régression perf prod sur .xlsx lourds)

## Checklist

- [ ] `.xls` et `.xlsx` via `readWorkbook` (`type: "array"`)
- [ ] Valeurs calculées (`cell.v`)
- [ ] Vides → null
- [ ] `detectLastCompanyColumn` pour trésorerie
- [ ] Entrée UI via `parse*File` (client)
