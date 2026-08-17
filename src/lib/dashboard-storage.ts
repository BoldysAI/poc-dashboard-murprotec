/**
 * Cache navigateur des dashboards (POC) — survit au refresh.
 * Wipe uniquement via set null / clearAll (boutons réinitialiser).
 * v3 : P35/P95 distincts + champs bénéfice consolidé / mois.
 */

import type {
  ReportingAgency,
  ReportingBundle,
  ReportingMonthId,
  TresorerieData,
} from "@/types/dashboard";
import { defaultAgenceId } from "@/lib/reporting/default-agence";
import {
  defaultMonthId,
  resolveMonthIdForAgency,
} from "@/lib/reporting/month-view";

export const DASHBOARD_STORAGE_KEY = "murprotec-dashboard-cache-v3";

export type DashboardCache = {
  version: 3;
  tresorerie: TresorerieData | null;
  reporting: ReportingBundle | null;
  selectedAgenceId: string | null;
  selectedMonthId: ReportingMonthId | null;
  /** true après lecture localStorage côté client */
  hydrated: boolean;
};

type Listener = () => void;

const listeners = new Set<Listener>();

let memory: DashboardCache = {
  version: 3,
  tresorerie: null,
  reporting: null,
  selectedAgenceId: null,
  selectedMonthId: null,
  hydrated: false,
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function isTresorerieData(v: unknown): v is TresorerieData {
  return isRecord(v) && typeof v.fileName === "string" && Array.isArray(v.parSociete);
}

function isReportingAgency(v: unknown): v is ReportingAgency {
  return (
    isRecord(v) &&
    typeof v.agenceId === "string" &&
    Array.isArray(v.months) &&
    isRecord(v.byMonth)
  );
}

function isReportingBundle(v: unknown): v is ReportingBundle {
  return (
    isRecord(v) &&
    typeof v.fileName === "string" &&
    Array.isArray(v.agencies) &&
    v.agencies.every(isReportingAgency)
  );
}

const SERVER_SNAPSHOT: DashboardCache = {
  version: 3,
  tresorerie: null,
  reporting: null,
  selectedAgenceId: null,
  selectedMonthId: null,
  hydrated: false,
};

export function emptyDashboardCache(): DashboardCache {
  return {
    version: 3,
    tresorerie: null,
    reporting: null,
    selectedAgenceId: null,
    selectedMonthId: null,
    hydrated: false,
  };
}

function parseStored(raw: string): Omit<DashboardCache, "hydrated"> {
  const parsed: unknown = JSON.parse(raw);
  if (!isRecord(parsed) || parsed.version !== 3) {
    return {
      version: 3,
      tresorerie: null,
      reporting: null,
      selectedAgenceId: null,
      selectedMonthId: null,
    };
  }
  const tresorerie =
    parsed.tresorerie === null
      ? null
      : isTresorerieData(parsed.tresorerie)
        ? parsed.tresorerie
        : null;
  const reporting =
    parsed.reporting === null
      ? null
      : isReportingBundle(parsed.reporting)
        ? parsed.reporting
        : null;
  let selectedAgenceId: string | null =
    typeof parsed.selectedAgenceId === "string"
      ? parsed.selectedAgenceId
      : null;
  const selectedMonthId: ReportingMonthId | null =
    typeof parsed.selectedMonthId === "string"
      ? parsed.selectedMonthId
      : null;
  if (
    reporting &&
    selectedAgenceId &&
    !reporting.agencies.some((a) => a.agenceId === selectedAgenceId)
  ) {
    selectedAgenceId = null;
  }
  return {
    version: 3,
    tresorerie,
    reporting,
    selectedAgenceId,
    selectedMonthId,
  };
}

function writeToLocalStorage(cache: Omit<DashboardCache, "hydrated">): void {
  if (typeof window === "undefined") return;
  try {
    if (
      cache.tresorerie === null &&
      cache.reporting === null &&
      cache.selectedAgenceId === null &&
      cache.selectedMonthId === null
    ) {
      window.localStorage.removeItem(DASHBOARD_STORAGE_KEY);
      window.localStorage.removeItem("murprotec-dashboard-cache-v1");
      window.localStorage.removeItem("murprotec-dashboard-cache-v2");
      return;
    }
    window.localStorage.setItem(
      DASHBOARD_STORAGE_KEY,
      JSON.stringify({
        version: 3,
        tresorerie: cache.tresorerie,
        reporting: cache.reporting,
        selectedAgenceId: cache.selectedAgenceId,
        selectedMonthId: cache.selectedMonthId,
      }),
    );
  } catch {
    // Quota / mode privé
  }
}

function emit() {
  for (const listener of listeners) listener();
}

function syncSelection(
  reporting: ReportingBundle | null,
  selectedAgenceId: string | null,
  selectedMonthId: ReportingMonthId | null,
): {
  selectedAgenceId: string | null;
  selectedMonthId: ReportingMonthId | null;
} {
  if (!reporting || reporting.agencies.length === 0) {
    return { selectedAgenceId: null, selectedMonthId: null };
  }
  let agenceId = selectedAgenceId;
  if (
    !agenceId ||
    !reporting.agencies.some((a) => a.agenceId === agenceId)
  ) {
    agenceId = defaultAgenceId(reporting);
  }
  const agency = reporting.agencies.find((a) => a.agenceId === agenceId)!;
  const monthId = resolveMonthIdForAgency(agency, selectedMonthId);
  return { selectedAgenceId: agenceId, selectedMonthId: monthId };
}

/** Lecture initiale depuis localStorage (une fois côté client). */
export function hydrateDashboardCacheFromStorage(): void {
  if (typeof window === "undefined") return;
  if (memory.hydrated) return;
  try {
    const raw = window.localStorage.getItem(DASHBOARD_STORAGE_KEY);
    const parsed = raw
      ? parseStored(raw)
      : {
          version: 3 as const,
          tresorerie: null,
          reporting: null,
          selectedAgenceId: null,
          selectedMonthId: null,
        };
    const selection = syncSelection(
      parsed.reporting,
      parsed.selectedAgenceId,
      parsed.selectedMonthId,
    );
    memory = {
      ...parsed,
      ...selection,
      hydrated: true,
    };
  } catch {
    memory = { ...emptyDashboardCache(), hydrated: true };
  }
  emit();
}

export function getDashboardCacheSnapshot(): DashboardCache {
  return memory;
}

/** Référence stable — obligatoire pour useSyncExternalStore (SSR). */
export function getDashboardCacheServerSnapshot(): DashboardCache {
  return SERVER_SNAPSHOT;
}

export function subscribeDashboardCache(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function replaceDashboardCache(
  next: Omit<DashboardCache, "hydrated" | "version"> & { version?: 3 },
): void {
  memory = {
    version: 3,
    tresorerie: next.tresorerie,
    reporting: next.reporting,
    selectedAgenceId: next.selectedAgenceId,
    selectedMonthId: next.selectedMonthId,
    hydrated: true,
  };
  writeToLocalStorage(memory);
  emit();
}

export function clearDashboardCache(): void {
  memory = { ...emptyDashboardCache(), hydrated: true };
  if (typeof window !== "undefined") {
    try {
      window.localStorage.removeItem(DASHBOARD_STORAGE_KEY);
      window.localStorage.removeItem("murprotec-dashboard-cache-v1");
      window.localStorage.removeItem("murprotec-dashboard-cache-v2");
    } catch {
      // ignore
    }
  }
  emit();
}

/** Helpers réexportés pour les call-sites d’upload. */
export { defaultMonthId };
