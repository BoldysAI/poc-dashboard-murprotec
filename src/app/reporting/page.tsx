"use client";

import { useEffect, useMemo, useState } from "react";
import { FileUpload } from "@/components/FileUpload";
import { InsightsDrawer } from "@/components/poc/InsightsDrawer";
import { ResetUploadButton } from "@/components/ResetUploadButton";
import { AgenceTabs } from "@/components/reporting/AgenceTabs";
import { BeneficeBrutCard } from "@/components/reporting/BeneficeBrutCard";
import { ChargesRentabiliteBlock } from "@/components/reporting/ChargesRentabiliteBlock";
import { PilotageCommercialBlock } from "@/components/reporting/PilotageCommercialBlock";
import { RepartitionCaChart } from "@/components/reporting/RepartitionCaChart";
import { ReportingEmptyPreview } from "@/components/reporting/ReportingEmptyPreview";
import {
  ReportingExportPdfButton,
  type ReportingExportSelection,
} from "@/components/reporting/ReportingExportPdfButton";
import { ReportingPrintSheet } from "@/components/reporting/ReportingPrintSheet";
import { TauxClesTiles } from "@/components/reporting/TauxClesTiles";
import { VariationGlobaleCard } from "@/components/reporting/VariationGlobaleCard";
import { useDashboardData } from "@/contexts/dashboard-data-context";
import { buildReportingAlerts, sortAlerts } from "@/lib/poc/alerts";
import { buildReportingBrief } from "@/lib/poc/brief";
import { reportingPdfDocumentTitle } from "@/lib/pdf-filename";
import type { ReportingBundle, ReportingData } from "@/types/dashboard";

function periodeBadgeLabel(data: ReportingData): string {
  const mois = data.periodeMois.trim().toLowerCase();
  if (data.periodeAnnee !== null) {
    return `données ${mois} ${data.periodeAnnee}`;
  }
  return `données ${mois}`;
}

export default function ReportingPage() {
  const {
    isCacheReady,
    reportingBundle,
    selectedAgenceId,
    selectedReportingData,
    setReportingBundle,
    setSelectedAgenceId,
  } = useDashboardData();

  const data = selectedReportingData;
  const [printSelection, setPrintSelection] =
    useState<ReportingExportSelection | null>(null);
  const [shouldPrint, setShouldPrint] = useState(false);

  const brief = useMemo(
    () => (data ? buildReportingBrief(data) : null),
    [data],
  );
  const alerts = useMemo(
    () => (data ? sortAlerts(buildReportingAlerts(data)) : []),
    [data],
  );

  const printDatasets = useMemo(() => {
    if (!reportingBundle) return [];
    if (printSelection === "all") {
      return reportingBundle.agencies;
    }
    const id = printSelection ?? selectedAgenceId;
    if (!id) return [];
    const one = reportingBundle.agencies.find((a) => a.agenceId === id);
    return one ? [one] : [];
  }, [reportingBundle, printSelection, selectedAgenceId]);

  useEffect(() => {
    if (!shouldPrint || printDatasets.length === 0) return;

    const previousTitle = document.title;
    const mode = printSelection === "all" ? "all" : "one";
    const ongletLabel =
      mode === "one" ? printDatasets[0]?.agenceCible : undefined;
    document.title = reportingPdfDocumentTitle({ mode, ongletLabel });

    const frame = window.requestAnimationFrame(() => {
      window.print();
      document.title = previousTitle;
      setShouldPrint(false);
    });
    return () => {
      window.cancelAnimationFrame(frame);
      document.title = previousTitle;
    };
  }, [shouldPrint, printSelection, printDatasets]);

  function handleExport(selection: ReportingExportSelection) {
    setPrintSelection(selection);
    setShouldPrint(true);
  }

  if (!isCacheReady) {
    return (
      <section className="flex flex-1 flex-col gap-6 print:hidden" aria-busy>
        <p className="text-sm text-primary/60">Chargement du cache…</p>
      </section>
    );
  }

  return (
    <section className="flex flex-1 flex-col gap-6 print:gap-0 sm:gap-8">
      <header className="flex flex-col gap-4 print:hidden sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-primary">
            Reporting Financier
          </h1>
          {data === null ? (
            <p className="mt-1 text-sm text-primary/70">
              Compte de résultat des agences à partir du fichier Excel reporting
              (.xlsx).
            </p>
          ) : (
            <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
              <p className="text-base font-medium text-primary">
                {data.agenceLibelle}
              </p>
              <span className="inline-flex w-fit items-center rounded-md border border-primary/15 bg-surface px-2.5 py-1 text-xs font-medium text-primary/80">
                {periodeBadgeLabel(data)}
              </span>
            </div>
          )}
          {reportingBundle !== null ? (
            <p className="mt-1.5 text-xs text-primary/55">
              Fichier : {reportingBundle.fileName}
            </p>
          ) : null}
        </div>
        {reportingBundle !== null && selectedAgenceId !== null ? (
          <div className="flex flex-wrap items-center gap-2">
            {brief ? (
              <InsightsDrawer brief={brief} alerts={alerts} />
            ) : null}
            <ReportingExportPdfButton
              agencies={reportingBundle.agencies.map((a) => ({
                id: a.agenceId,
                label: a.agenceCible,
                libelle: a.agenceLibelle,
              }))}
              defaultAgenceId={selectedAgenceId}
              onExport={handleExport}
            />
            <ResetUploadButton onReset={() => setReportingBundle(null)} />
          </div>
        ) : null}
      </header>

      <div className="print:hidden">
        <FileUpload
          endpoint="/api/parse/reporting"
          hint="Fichier Excel reporting attendu (.xlsx) — tout fichier peut être sélectionné ; le serveur valide le format."
          onSuccess={(payload) =>
            setReportingBundle(payload as ReportingBundle)
          }
        />
      </div>

      {reportingBundle === null || data === null || selectedAgenceId === null ? (
        <div className="print:hidden">
          <ReportingEmptyPreview />
        </div>
      ) : (
        <>
          <div className="space-y-8 print:hidden">
            <AgenceTabs
              agencies={reportingBundle.agencies.map((a) => ({
                id: a.agenceId,
                label: a.agenceCible,
              }))}
              selectedId={selectedAgenceId}
              onSelect={setSelectedAgenceId}
            />

            <div className="grid gap-5 md:grid-cols-2">
              <BeneficeBrutCard
                beneficeBrut={data.beneficeBrut}
                margeBrute={data.margeBrute}
                beneficeBrutN1={data.beneficeBrutN1}
              />
              <VariationGlobaleCard
                variationVsN1={data.variationVsN1}
                profitApresImpots={data.profitApresImpots}
              />
            </div>

            <TauxClesTiles tauxCles={data.tauxCles} />

            <RepartitionCaChart
              repartitionCA={data.repartitionCA}
              caTotal={data.caTotal}
            />

            <ChargesRentabiliteBlock
              structureCharges={data.structureCharges}
              fraisFixes={data.fraisFixes}
              breakEven={data.breakEven}
              caTotal={data.caTotal}
            />

            {data.chiffresClesDisponibles ? (
              <PilotageCommercialBlock
                cahierCommande={data.cahierCommande}
                impayes={data.impayes}
                euroCoupon={data.euroCoupon}
              />
            ) : null}
          </div>

          {printDatasets.length > 0 ? (
            <ReportingPrintSheet datasets={printDatasets} />
          ) : null}
        </>
      )}
    </section>
  );
}
