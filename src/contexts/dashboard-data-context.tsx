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
import type {
  ReportingBundle,
  ReportingData,
  ReportingMonthId,
  TresorerieData,
} from "@/types/dashboard";
import { defaultAgenceId } from "@/lib/reporting/default-agence";
import {
  defaultMonthId,
  resolveMonthIdForAgency,
  resolveReportingView,
} from "@/lib/reporting/month-view";
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
  selectedMonthId: ReportingMonthId | null;
  selectedReportingData: ReportingData | null;
  setTresorerieData: (data: TresorerieData | null) => void;
  setReportingBundle: (data: ReportingBundle | null) => void;
  setSelectedAgenceId: (id: string) => void;
  setSelectedMonthId: (id: ReportingMonthId) => void;
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
      selectedMonthId: current.selectedMonthId,
    });
  }, []);

  const setReportingBundle = useCallback((data: ReportingBundle | null) => {
    const current = getDashboardCacheSnapshot();
    if (data === null || data.agencies.length === 0) {
      replaceDashboardCache({
        tresorerie: current.tresorerie,
        reporting: null,
        selectedAgenceId: null,
        selectedMonthId: null,
      });
      return;
    }
    const agenceId = defaultAgenceId(data);
    const agency = data.agencies.find((a) => a.agenceId === agenceId)!;
    replaceDashboardCache({
      tresorerie: current.tresorerie,
      reporting: data,
      selectedAgenceId: agenceId,
      selectedMonthId: defaultMonthId(agency),
    });
  }, []);

  const setSelectedAgenceId = useCallback((id: string) => {
    const current = getDashboardCacheSnapshot();
    if (!current.reporting) return;
    const agency = current.reporting.agencies.find((a) => a.agenceId === id);
    if (!agency) return;
    replaceDashboardCache({
      tresorerie: current.tresorerie,
      reporting: current.reporting,
      selectedAgenceId: id,
      selectedMonthId: resolveMonthIdForAgency(agency, current.selectedMonthId),
    });
  }, []);

  const setSelectedMonthId = useCallback((id: ReportingMonthId) => {
    const current = getDashboardCacheSnapshot();
    if (!current.reporting || !current.selectedAgenceId) return;
    const agency = current.reporting.agencies.find(
      (a) => a.agenceId === current.selectedAgenceId,
    );
    if (!agency) return;
    const monthId = resolveMonthIdForAgency(agency, id);
    replaceDashboardCache({
      tresorerie: current.tresorerie,
      reporting: current.reporting,
      selectedAgenceId: current.selectedAgenceId,
      selectedMonthId: monthId,
    });
  }, []);

  const clearAll = useCallback(() => {
    clearDashboardCache();
  }, []);

  const selectedReportingData = useMemo((): ReportingData | null => {
    if (!cache.reporting || !cache.selectedAgenceId) return null;
    const agency = cache.reporting.agencies.find(
      (a) => a.agenceId === cache.selectedAgenceId,
    );
    if (!agency) return null;
    return resolveReportingView(agency, cache.selectedMonthId);
  }, [cache.reporting, cache.selectedAgenceId, cache.selectedMonthId]);

  const value = useMemo(
    () => ({
      isCacheReady: cache.hydrated,
      tresorerieData: cache.tresorerie,
      reportingBundle: cache.reporting,
      selectedAgenceId: cache.selectedAgenceId,
      selectedMonthId: cache.selectedMonthId,
      selectedReportingData,
      setTresorerieData,
      setReportingBundle,
      setSelectedAgenceId,
      setSelectedMonthId,
      clearAll,
    }),
    [
      cache.hydrated,
      cache.tresorerie,
      cache.reporting,
      cache.selectedAgenceId,
      cache.selectedMonthId,
      selectedReportingData,
      setTresorerieData,
      setReportingBundle,
      setSelectedAgenceId,
      setSelectedMonthId,
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
