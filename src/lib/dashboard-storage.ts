/**
 * Cache navigateur des dashboards (POC) — survit au refresh.
 * Wipe uniquement via set null / clearAll (boutons réinitialiser).
 */

import type { ReportingBundle, TresorerieData } from "@/types/dashboard";
import { defaultAgenceId } from "@/lib/reporting/default-agence";

export const DASHBOARD_STORAGE_KEY = "murprotec-dashboard-cache-v1";

export type DashboardCache = {
  version: 1;
  tresorerie: TresorerieData | null;
  reporting: ReportingBundle | null;
  selectedAgenceId: string | null;
  /** true après lecture localStorage côté client */
  hydrated: boolean;
};

type Listener = () => void;

const listeners = new Set<Listener>();

let memory: DashboardCache = {
  version: 1,
  tresorerie: null,
  reporting: null,
  selectedAgenceId: null,
  hydrated: false,
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function isTresorerieData(v: unknown): v is TresorerieData {
  return isRecord(v) && typeof v.fileName === "string" && Array.isArray(v.parSociete);
}

function isReportingBundle(v: unknown): v is ReportingBundle {
  return (
    isRecord(v) &&
    typeof v.fileName === "string" &&
    Array.isArray(v.agencies)
  );
}

const SERVER_SNAPSHOT: DashboardCache = {
  version: 1,
  tresorerie: null,
  reporting: null,
  selectedAgenceId: null,
  hydrated: false,
};

export function emptyDashboardCache(): DashboardCache {
  return {
    version: 1,
    tresorerie: null,
    reporting: null,
    selectedAgenceId: null,
    hydrated: false,
  };
}

function parseStored(raw: string): Omit<DashboardCache, "hydrated"> {
  const parsed: unknown = JSON.parse(raw);
  if (!isRecord(parsed) || parsed.version !== 1) {
    return {
      version: 1,
      tresorerie: null,
      reporting: null,
      selectedAgenceId: null,
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
  if (
    reporting &&
    selectedAgenceId &&
    !reporting.agencies.some((a) => a.agenceId === selectedAgenceId)
  ) {
    selectedAgenceId = null;
  }
  return { version: 1, tresorerie, reporting, selectedAgenceId };
}

function writeToLocalStorage(cache: Omit<DashboardCache, "hydrated">): void {
  if (typeof window === "undefined") return;
  try {
    if (
      cache.tresorerie === null &&
      cache.reporting === null &&
      cache.selectedAgenceId === null
    ) {
      window.localStorage.removeItem(DASHBOARD_STORAGE_KEY);
      return;
    }
    window.localStorage.setItem(
      DASHBOARD_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        tresorerie: cache.tresorerie,
        reporting: cache.reporting,
        selectedAgenceId: cache.selectedAgenceId,
      }),
    );
  } catch {
    // Quota / mode privé
  }
}

function emit() {
  for (const listener of listeners) listener();
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
          version: 1 as const,
          tresorerie: null,
          reporting: null,
          selectedAgenceId: null,
        };
    let selectedAgenceId = parsed.selectedAgenceId;
    if (parsed.reporting && parsed.reporting.agencies.length > 0) {
      if (
        !selectedAgenceId ||
        !parsed.reporting.agencies.some((a) => a.agenceId === selectedAgenceId)
      ) {
        selectedAgenceId = defaultAgenceId(parsed.reporting);
      }
    } else {
      selectedAgenceId = null;
    }
    memory = {
      ...parsed,
      selectedAgenceId,
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
  next: Omit<DashboardCache, "hydrated" | "version"> & { version?: 1 },
): void {
  memory = {
    version: 1,
    tresorerie: next.tresorerie,
    reporting: next.reporting,
    selectedAgenceId: next.selectedAgenceId,
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
    } catch {
      // ignore
    }
  }
  emit();
}
