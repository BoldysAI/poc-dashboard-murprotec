"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { ReportingBundle, ReportingData, TresorerieData } from "@/types/dashboard";
import { defaultAgenceId } from "@/lib/reporting/default-agence";

type DashboardDataContextValue = {
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
  const [tresorerieData, setTresorerieData] = useState<TresorerieData | null>(
    null,
  );
  const [reportingBundle, setReportingBundleState] =
    useState<ReportingBundle | null>(null);
  const [selectedAgenceId, setSelectedAgenceIdState] = useState<string | null>(
    null,
  );

  const setReportingBundle = useCallback((data: ReportingBundle | null) => {
    setReportingBundleState(data);
    if (data === null || data.agencies.length === 0) {
      setSelectedAgenceIdState(null);
      return;
    }
    setSelectedAgenceIdState(defaultAgenceId(data));
  }, []);

  const setSelectedAgenceId = useCallback(
    (id: string) => {
      if (!reportingBundle) return;
      const exists = reportingBundle.agencies.some((a) => a.agenceId === id);
      if (exists) setSelectedAgenceIdState(id);
    },
    [reportingBundle],
  );

  const clearAll = useCallback(() => {
    setTresorerieData(null);
    setReportingBundleState(null);
    setSelectedAgenceIdState(null);
  }, []);

  const selectedReportingData = useMemo(() => {
    if (!reportingBundle || !selectedAgenceId) return null;
    return (
      reportingBundle.agencies.find((a) => a.agenceId === selectedAgenceId) ??
      null
    );
  }, [reportingBundle, selectedAgenceId]);

  const value = useMemo(
    () => ({
      tresorerieData,
      reportingBundle,
      selectedAgenceId,
      selectedReportingData,
      setTresorerieData,
      setReportingBundle,
      setSelectedAgenceId,
      clearAll,
    }),
    [
      tresorerieData,
      reportingBundle,
      selectedAgenceId,
      selectedReportingData,
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
