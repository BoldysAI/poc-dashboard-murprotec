# Reporting mois + consolidé — Implementation Plan

> **For agentic workers:** Execute task-by-task. Steps use checkbox syntax.

**Goal:** Afficher par défaut le dernier mois rempli du reporting, permettre de choisir chaque mois disponible, et offrir une vue consolidée (Σ montants ; marge recalculée ; taux = moyenne).

**Architecture:** Parse multi-mois → `ReportingAgency` (months + byMonth + parts partagées). UI dérive un `ReportingData` plat via `resolveReportingView`. Cache v2 + `selectedMonthId`.

**Tech Stack:** Next.js App Router, React Context, SheetJS, TypeScript strict — aucune nouvelle dépendance.

## Global Constraints

- Reporting only ; trésorerie inchangée
- Pas de BDD ; cache `localStorage` OK
- UI FR ; tokens Murpro ; pas de références Excel à l’écran
- N-1 (O/P) et Pilotage CK indépendants du mois
- Cache key bump si shape bundle change

---

### Task 1: Types + resolve/consolidate helpers

**Files:**
- Modify: `src/types/dashboard.ts`
- Create: `src/lib/reporting/month-view.ts`
- Modify: `src/lib/reporting/default-agence.ts` (add `defaultMonthId`)

**Produces:** `ReportingAgency`, `ReportingMonthMeta`, `CONSOLIDE_MONTH_ID`, `resolveReportingView`, `defaultMonthId`

---

### Task 2: Parser multi-mois

**Files:**
- Modify: `src/lib/excel/parse-reporting.ts`

**Produces:** `parseReporting` → `ReportingBundle` avec `agencies: ReportingAgency[]`

---

### Task 3: Cache + context

**Files:**
- Modify: `src/lib/dashboard-storage.ts` (v2 + `selectedMonthId`)
- Modify: `src/contexts/dashboard-data-context.tsx`

---

### Task 4: UI MoisTabs + page

**Files:**
- Create: `src/components/reporting/MoisTabs.tsx`
- Modify: `src/app/(dashboard)/reporting/page.tsx`

---

### Task 5: POC adapters (alerts / brief / assistant / llm / PDF)

**Files:**
- Modify consumers to resolve views with `selectedMonthId`

---

### Task 6: Docs + verify

**Files:**
- Modify: `docs/agent/reporting.md`, `docs/agent/decisions.md`
- Run: `npm run lint` + `npm run build`
