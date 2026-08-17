"use client";

import { useEffect, useMemo, useState } from "react";
import { FileUpload } from "@/components/FileUpload";
import { InsightsDrawer } from "@/components/poc/InsightsDrawer";
import { ResetUploadButton } from "@/components/ResetUploadButton";
import { AgenceTabs } from "@/components/reporting/AgenceTabs";
import { BeneficeBrutCard } from "@/components/reporting/BeneficeBrutCard";
import { BeneficeNetCard } from "@/components/reporting/BeneficeNetCard";
import { ChargesRentabiliteBlock } from "@/components/reporting/ChargesRentabiliteBlock";
import { MoisTabs } from "@/components/reporting/MoisTabs";
import { PilotageCommercialBlock } from "@/components/reporting/PilotageCommercialBlock";
import { RepartitionCaChart } from "@/components/reporting/RepartitionCaChart";
import { ReportingEmptyPreview } from "@/components/reporting/ReportingEmptyPreview";
import {
  ReportingExportPdfButton,
  type ReportingExportSelection,
} from "@/components/reporting/ReportingExportPdfButton";
import { ReportingPrintSheet } from "@/components/reporting/ReportingPrintSheet";
import { TauxClesTiles } from "@/components/reporting/TauxClesTiles";
import {
  VariationGlobaleBrutCard,
  VariationGlobaleNetCard,
} from "@/components/reporting/VariationGlobaleCard";
import { useDashboardData } from "@/contexts/dashboard-data-context";
import { parseReportingFile } from "@/lib/excel";
import { buildReportingBundleAlerts } from "@/lib/poc/alerts";
import { buildReportingBrief } from "@/lib/poc/brief";
import { reportingPdfDocumentTitle } from "@/lib/pdf-filename";
import {
  resolveBundleViews,
  resolveReportingView,
} from "@/lib/reporting/month-view";
import { CONSOLIDE_MONTH_ID, type ReportingBundle, type ReportingData } from "@/types/dashboard";

function periodeBadgeLabel(data: ReportingData): string {
  const mois = data.periodeMois.trim().toLowerCase();
  if (data.monthId === CONSOLIDE_MONTH_ID) {
    if (data.periodeAnnee !== null) {
      return `données consolidées ${data.periodeAnnee}`;
    }
    return `données consolidées`;
  }
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
    selectedMonthId,
    selectedReportingData,
    setReportingBundle,
    setSelectedAgenceId,
    setSelectedMonthId,
  } = useDashboardData();

  const data = selectedReportingData;
  const [printSelection, setPrintSelection] =
    useState<ReportingExportSelection | null>(null);
  const [shouldPrint, setShouldPrint] = useState(false);

  const selectedAgency = useMemo(() => {
    if (!reportingBundle || !selectedAgenceId) return null;
    return (
      reportingBundle.agencies.find((a) => a.agenceId === selectedAgenceId) ??
      null
    );
  }, [reportingBundle, selectedAgenceId]);

  const brief = useMemo(
    () => (data ? buildReportingBrief(data) : null),
    [data],
  );
  const alerts = useMemo(
    () =>
      reportingBundle
        ? buildReportingBundleAlerts(reportingBundle, selectedMonthId)
        : [],
    [reportingBundle, selectedMonthId],
  );

  const printDatasets = useMemo(() => {
    if (!reportingBundle) return [];
    if (printSelection === "all") {
      return resolveBundleViews(reportingBundle.agencies, selectedMonthId);
    }
    const id = printSelection ?? selectedAgenceId;
    if (!id) return [];
    const agency = reportingBundle.agencies.find((a) => a.agenceId === id);
    return agency ? [resolveReportingView(agency, selectedMonthId)] : [];
  }, [reportingBundle, printSelection, selectedAgenceId, selectedMonthId]);

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
          parseFile={parseReportingFile}
          hint="Fichier Excel reporting attendu (.xlsx) — tout fichier peut être sélectionné ; le format est contrôlé après sélection."
          onSuccess={(payload) =>
            setReportingBundle(payload as ReportingBundle)
          }
        />
      </div>

      {reportingBundle === null ||
      data === null ||
      selectedAgenceId === null ||
      selectedMonthId === null ||
      selectedAgency === null ? (
        <div className="print:hidden">
          <ReportingEmptyPreview />
        </div>
      ) : (
        <>
          <div className="space-y-8 print:hidden">
            <div className="space-y-3">
              <AgenceTabs
                agencies={reportingBundle.agencies.map((a) => ({
                  id: a.agenceId,
                  label: a.agenceCible,
                }))}
                selectedId={selectedAgenceId}
                onSelect={setSelectedAgenceId}
              />
              <MoisTabs
                months={selectedAgency.months.map((m) => ({
                  id: m.id,
                  label: m.label,
                }))}
                selectedId={selectedMonthId}
                onSelect={setSelectedMonthId}
              />
            </div>

            <div className="space-y-5">
              <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
                <BeneficeBrutCard
                  title="Bénéfice brut"
                  subtitle="Résultat avant charges de structure, cumul de la période."
                  beneficeBrut={data.beneficeBrutConsolide}
                  margeBrute={data.margeBruteConsolide}
                />
                <BeneficeNetCard
                  title="Bénéfice net"
                  subtitle="Profit après impôts, cumul de la période."
                  beneficeNet={data.beneficeNetConsolide}
                />
                {data.monthId !== CONSOLIDE_MONTH_ID &&
                data.beneficeBrutMois !== null &&
                data.beneficeNetMois !== null &&
                data.margeBruteMois !== null ? (
                  <>
                    <BeneficeBrutCard
                      title="Bénéfice brut du mois"
                      subtitle={`Résultat avant charges de structure (${data.periodeMois}).`}
                      beneficeBrut={data.beneficeBrutMois}
                      margeBrute={data.margeBruteMois}
                    />
                    <BeneficeNetCard
                      title="Bénéfice net du mois"
                      subtitle={`Profit après impôts (${data.periodeMois}).`}
                      beneficeNet={data.beneficeNetMois}
                    />
                  </>
                ) : null}
              </div>
              <div className="grid gap-5 md:grid-cols-2">
                <VariationGlobaleBrutCard
                  variationVsN1={data.variationBeneficeBrutVsN1}
                  beneficeBrutConsolide={data.beneficeBrutConsolide}
                />
                <VariationGlobaleNetCard
                  variationVsN1={data.variationBeneficeNetVsN1}
                  beneficeNetConsolide={data.beneficeNetConsolide}
                />
              </div>
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
