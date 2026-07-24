"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import type { ReportingBundle, ReportingData, TresorerieData } from "@/types/dashboard";
import { defaultAgenceId } from "@/lib/reporting/default-agence";
import {
  clearDashboardCache,
  getDashboardCacheServerSnapshot,
  getDashboardCacheSnapshot,
  hydrateDashboardCacheFromStorage,
  replaceDashboardCache,
  subscribeDashboardCache,
} from "@/lib/dashboard-storage";

type DashboardDataContextValue = {
  /** false tant que le cache local n’a pas été lu (évite un flash empty state). */
  isCacheReady: boolean;
  tresorerieData: TresorerieData | null;
  reportingBundle: ReportingBundle | null;
  selectedAgenceId: string | null;
  selectedReportingData: ReportingData | null;
  setTresorerieData: (data: TresorerieData | null) => void;
  setReportingBundle: (data: ReportingBundle | null) => void;
  setSelectedAgenceId: (id: string) => void;
  clearAll: () => void;
};

const DashboardDataContext = createContext<DashboardDataContextValue | null>(
  null,
);

export function DashboardDataProvider({ children }: { children: ReactNode }) {
  const cache = useSyncExternalStore(
    subscribeDashboardCache,
    getDashboardCacheSnapshot,
    getDashboardCacheServerSnapshot,
  );

  useEffect(() => {
    hydrateDashboardCacheFromStorage();
  }, []);

  const setTresorerieData = useCallback((data: TresorerieData | null) => {
    const current = getDashboardCacheSnapshot();
    replaceDashboardCache({
      tresorerie: data,
      reporting: current.reporting,
      selectedAgenceId: current.selectedAgenceId,
    });
  }, []);

  const setReportingBundle = useCallback((data: ReportingBundle | null) => {
    const current = getDashboardCacheSnapshot();
    if (data === null || data.agencies.length === 0) {
      replaceDashboardCache({
        tresorerie: current.tresorerie,
        reporting: null,
        selectedAgenceId: null,
      });
      return;
    }
    replaceDashboardCache({
      tresorerie: current.tresorerie,
      reporting: data,
      selectedAgenceId: defaultAgenceId(data),
    });
  }, []);

  const setSelectedAgenceId = useCallback((id: string) => {
    const current = getDashboardCacheSnapshot();
    if (!current.reporting) return;
    const exists = current.reporting.agencies.some((a) => a.agenceId === id);
    if (!exists) return;
    replaceDashboardCache({
      tresorerie: current.tresorerie,
      reporting: current.reporting,
      selectedAgenceId: id,
    });
  }, []);

  const clearAll = useCallback(() => {
    clearDashboardCache();
  }, []);

  const selectedReportingData = useMemo((): ReportingData | null => {
    if (!cache.reporting || !cache.selectedAgenceId) return null;
    return (
      cache.reporting.agencies.find(
        (a) => a.agenceId === cache.selectedAgenceId,
      ) ?? null
    );
  }, [cache.reporting, cache.selectedAgenceId]);

  const value = useMemo(
    () => ({
      isCacheReady: cache.hydrated,
      tresorerieData: cache.tresorerie,
      reportingBundle: cache.reporting,
      selectedAgenceId: cache.selectedAgenceId,
      selectedReportingData,
      setTresorerieData,
      setReportingBundle,
      setSelectedAgenceId,
      clearAll,
    }),
    [
      cache.hydrated,
      cache.tresorerie,
      cache.reporting,
      cache.selectedAgenceId,
      selectedReportingData,
      setTresorerieData,
      setReportingBundle,
      setSelectedAgenceId,
      clearAll,
    ],
  );

  return (
    <DashboardDataContext.Provider value={value}>
      {children}
    </DashboardDataContext.Provider>
  );
}

export function useDashboardData(): DashboardDataContextValue {
  const ctx = useContext(DashboardDataContext);
  if (!ctx) {
    throw new Error(
      "useDashboardData must be used within DashboardDataProvider",
    );
  }
  return ctx;
}
