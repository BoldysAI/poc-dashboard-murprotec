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
import {
  clearRapprochementCache,
  getRapprochementCacheServerSnapshot,
  getRapprochementCacheSnapshot,
  hydrateRapprochementCacheFromStorage,
  setRapprochementCrm,
  setRapprochementWinbooks,
  subscribeRapprochementCache,
} from "@/lib/rapprochement-storage";
import type { CrmListeRougeLigne, WinbooksLigne } from "@/types/rapprochement";

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
  rapprochementCrm: CrmListeRougeLigne[] | null;
  rapprochementCrmFileName: string | null;
  rapprochementWinbooks: WinbooksLigne[] | null;
  rapprochementWinbooksFileName: string | null;
  setRapprochementCrm: (lignes: CrmListeRougeLigne[] | null, fileName: string | null) => void;
  setRapprochementWinbooks: (
    lignes: WinbooksLigne[] | null,
    fileName: string | null,
  ) => void;
  clearRapprochement: () => void;
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
  const rapprochement = useSyncExternalStore(
    subscribeRapprochementCache,
    getRapprochementCacheSnapshot,
    getRapprochementCacheServerSnapshot,
  );

  useEffect(() => {
    hydrateDashboardCacheFromStorage();
    hydrateRapprochementCacheFromStorage();
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
    clearRapprochementCache();
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
      isCacheReady: cache.hydrated && rapprochement.hydrated,
      tresorerieData: cache.tresorerie,
      reportingBundle: cache.reporting,
      selectedAgenceId: cache.selectedAgenceId,
      selectedMonthId: cache.selectedMonthId,
      selectedReportingData,
      setTresorerieData,
      setReportingBundle,
      setSelectedAgenceId,
      setSelectedMonthId,
      rapprochementCrm: rapprochement.crm,
      rapprochementCrmFileName: rapprochement.crmFileName,
      rapprochementWinbooks: rapprochement.winbooks,
      rapprochementWinbooksFileName: rapprochement.winbooksFileName,
      setRapprochementCrm,
      setRapprochementWinbooks,
      clearRapprochement: clearRapprochementCache,
      clearAll,
    }),
    [
      cache.hydrated,
      cache.tresorerie,
      cache.reporting,
      cache.selectedAgenceId,
      cache.selectedMonthId,
      rapprochement.hydrated,
      rapprochement.crm,
      rapprochement.crmFileName,
      rapprochement.winbooks,
      rapprochement.winbooksFileName,
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
