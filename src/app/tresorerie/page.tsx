"use client";

import { useMemo } from "react";
import { FileUpload } from "@/components/FileUpload";
import { InsightsDrawer } from "@/components/poc/InsightsDrawer";
import { ResetUploadButton } from "@/components/ResetUploadButton";
import { CompositionDepensesBlock } from "@/components/tresorerie/CompositionDepensesBlock";
import { ExportPdfButton } from "@/components/tresorerie/ExportPdfButton";
import { parsePeriodeFromFilename } from "@/components/tresorerie/format-tresorerie";
import { RecettesDepensesBlock } from "@/components/tresorerie/RecettesDepensesBlock";
import { RepartitionPaysChart } from "@/components/tresorerie/RepartitionPaysChart";
import { TresorerieEmptyPreview } from "@/components/tresorerie/TresorerieEmptyPreview";
import { TresorerieKpiRow } from "@/components/tresorerie/TresorerieKpiRow";
import { TresoreriePrintSheet } from "@/components/tresorerie/TresoreriePrintSheet";
import { useDashboardData } from "@/contexts/dashboard-data-context";
import { buildTresorerieAlerts, sortAlerts } from "@/lib/poc/alerts";
import { buildTresorerieBrief } from "@/lib/poc/brief";
import type { TresorerieData } from "@/types/dashboard";

export default function TresoreriePage() {
  const { isCacheReady, tresorerieData, setTresorerieData } = useDashboardData();
  const periode =
    tresorerieData !== null
      ? parsePeriodeFromFilename(tresorerieData.fileName)
      : null;

  const brief = useMemo(
    () => (tresorerieData ? buildTresorerieBrief(tresorerieData) : null),
    [tresorerieData],
  );
  const alerts = useMemo(
    () =>
      tresorerieData
        ? sortAlerts(buildTresorerieAlerts(tresorerieData))
        : [],
    [tresorerieData],
  );

  if (!isCacheReady) {
    return (
      <section className="flex flex-1 flex-col gap-6 print:hidden" aria-busy>
        <p className="text-sm text-primary/60">Chargement du cache…</p>
      </section>
    );
  }

  return (
    <section className="flex flex-1 flex-col gap-6 print:gap-0">
      <header className="flex flex-col gap-4 print:hidden sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-primary">
            Dashboard Trésorerie
          </h1>
          {tresorerieData === null ? (
            <p className="mt-1 text-sm text-primary/70">
              Indicateurs de trésorerie consolidés à partir du fichier Excel
              mensuel (.xls).
            </p>
          ) : (
            <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
              {periode !== null ? (
                <span className="inline-flex w-fit items-center rounded-md border border-primary/15 bg-surface px-2.5 py-1 text-xs font-medium text-primary/80">
                  données au {periode}
                </span>
              ) : null}
              <p className="text-xs text-primary/55">
                Fichier chargé : {tresorerieData.fileName}
              </p>
            </div>
          )}
        </div>
        {tresorerieData !== null ? (
          <div className="flex flex-wrap items-center gap-2">
            {brief ? (
              <InsightsDrawer brief={brief} alerts={alerts} />
            ) : null}
            <ExportPdfButton />
            <ResetUploadButton onReset={() => setTresorerieData(null)} />
          </div>
        ) : null}
      </header>

      <div className="print:hidden">
        <FileUpload
          endpoint="/api/parse/tresorerie"
          hint="Fichier Excel trésorerie attendu (.xls) — tout fichier peut être sélectionné ; le serveur valide le format."
          onSuccess={(data) => setTresorerieData(data as TresorerieData)}
        />
      </div>

      {tresorerieData === null ? (
        <div className="print:hidden">
          <TresorerieEmptyPreview />
        </div>
      ) : (
        <>
          <div className="space-y-4 print:hidden">
            <TresorerieKpiRow data={tresorerieData} />
            <div className="grid gap-4 lg:grid-cols-2 lg:items-stretch">
              <RepartitionPaysChart parPays={tresorerieData.parPays} />
              <CompositionDepensesBlock
                composition={tresorerieData.compositionDepenses}
                totalDepenses={tresorerieData.totalDepenses}
              />
            </div>
            <RecettesDepensesBlock
              parSociete={tresorerieData.parSociete}
              totalRecettes={tresorerieData.totalRecettes}
              totalDepenses={tresorerieData.totalDepenses}
            />
          </div>

          <TresoreriePrintSheet data={tresorerieData} periode={periode} />
        </>
      )}
    </section>
  );
}
