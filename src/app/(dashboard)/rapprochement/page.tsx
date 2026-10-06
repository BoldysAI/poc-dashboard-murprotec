"use client";

import { useEffect, useMemo, useState } from "react";
import { FileUpload } from "@/components/FileUpload";
import { ResetUploadButton } from "@/components/ResetUploadButton";
import { ExportEcartsButton } from "@/components/rapprochement/ExportEcartsButton";
import { RapprochementPrintSheet } from "@/components/rapprochement/RapprochementPrintSheet";
import { ResultatsTable } from "@/components/rapprochement/ResultatsTable";
import { useDashboardData } from "@/contexts/dashboard-data-context";
import { attribuerStatuts, parseListeRougeUpload, parseWinbooksUpload, rapprocher } from "@/lib/rapprochement";
import type { FichierRapprochement } from "@/lib/rapprochement/parse-upload";
import type { CrmListeRougeLigne, StatutRapprochement, WinbooksLigne } from "@/types/rapprochement";

const EXPORT_DEFAUT: StatutRapprochement[] = ["Not OK", "Non apparié"];

export default function RapprochementPage() {
  const {
    isCacheReady,
    rapprochementCrm,
    rapprochementCrmFileName,
    rapprochementWinbooks,
    rapprochementWinbooksFileName,
    setRapprochementCrm,
    setRapprochementWinbooks,
    clearRapprochement,
  } = useDashboardData();
  const [statutsExport, setStatutsExport] = useState<StatutRapprochement[]>(EXPORT_DEFAUT);
  const [imprimer, setImprimer] = useState(false);

  useEffect(() => {
    if (!imprimer) return;
    const frame = window.requestAnimationFrame(() => {
      window.print();
      setImprimer(false);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [imprimer, statutsExport]);

  const lignes = useMemo(() => {
    if (!rapprochementCrm || !rapprochementWinbooks) return null;
    return attribuerStatuts(rapprocher(rapprochementCrm, rapprochementWinbooks));
  }, [rapprochementCrm, rapprochementWinbooks]);

  if (!isCacheReady) {
    return (
      <section className="flex flex-1 flex-col gap-6 print:hidden" aria-busy>
        <p className="text-sm text-primary/60">Chargement du cache…</p>
      </section>
    );
  }

  const pret = lignes !== null;
  const comptes = pret
    ? {
        ok: lignes.filter((ligne) => ligne.statut === "OK").length,
        notOk: lignes.filter((ligne) => ligne.statut === "Not OK").length,
        nonApparie: lignes.filter((ligne) => ligne.statut === "Non apparié").length,
      }
    : null;
  const aDesFichiers = rapprochementCrm !== null || rapprochementWinbooks !== null;

  return (
    <section className="flex flex-1 flex-col gap-6 print:gap-0">
      <header className="flex flex-col gap-4 print:hidden sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-primary">
            Rapprochement impayés
          </h1>
          <p className="mt-1 text-sm text-primary/70">
            Liste rouge CRM et postes ouverts Winbooks. Un écart d’un centime au plus est OK.
          </p>
        </div>
        {aDesFichiers ? (
          <div className="flex flex-wrap items-center gap-2">
            <ExportEcartsButton
              disabled={!pret}
              onExport={(statuts) => {
                setStatutsExport(statuts);
                setImprimer(true);
              }}
            />
            <ResetUploadButton onReset={clearRapprochement} />
          </div>
        ) : null}
      </header>

      <div className="grid gap-4 print:hidden lg:grid-cols-2">
        <div className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold text-primary">Liste rouge CRM</h2>
          <FileUpload
            parseFile={parseListeRougeUpload}
            label="Téléverser la liste rouge"
            hint="Fichier Word : liste rouge ou liste d'attente. Le format est contrôlé après sélection."
            onSuccess={(data) => {
              const parsed = data as FichierRapprochement<CrmListeRougeLigne[]>;
              setRapprochementCrm(parsed.lignes, parsed.fileName);
            }}
          />
          {rapprochementCrmFileName ? (
            <p className="text-xs text-primary/55">Fichier chargé : {rapprochementCrmFileName}</p>
          ) : null}
        </div>
        <div className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold text-primary">Winbooks</h2>
          <FileUpload
            parseFile={parseWinbooksUpload}
            label="Téléverser Winbooks"
            hint="Export des postes ouverts clients, Excel ou PDF. Le format est contrôlé après sélection."
            onSuccess={(data) => {
              const parsed = data as FichierRapprochement<WinbooksLigne[]>;
              setRapprochementWinbooks(parsed.lignes, parsed.fileName);
            }}
          />
          {rapprochementWinbooksFileName ? (
            <p className="text-xs text-primary/55">
              Fichier chargé : {rapprochementWinbooksFileName}
            </p>
          ) : null}
        </div>
      </div>

      {comptes ? (
        <ul className="grid gap-3 print:hidden sm:grid-cols-3" aria-live="polite">
          <Compteur label="OK" valeur={comptes.ok} classe="text-success" />
          <Compteur label="Not OK" valeur={comptes.notOk} classe="text-danger" />
          <Compteur label="Non apparié" valeur={comptes.nonApparie} classe="text-warning" />
        </ul>
      ) : null}

      <div className="print:hidden">
        <ResultatsTable lignes={lignes} />
      </div>

      {pret && rapprochementCrmFileName && rapprochementWinbooksFileName ? (
        <RapprochementPrintSheet
          lignes={lignes}
          statuts={statutsExport}
          crmFileName={rapprochementCrmFileName}
          winbooksFileName={rapprochementWinbooksFileName}
        />
      ) : null}
    </section>
  );
}

function Compteur({
  label,
  valeur,
  classe,
}: {
  label: string;
  valeur: number;
  classe: string;
}) {
  return (
    <li className="rounded-lg border border-primary/10 bg-white px-4 py-3">
      <p className="text-xs font-medium text-primary/60">{label}</p>
      <p className={`mt-1 text-2xl font-semibold tabular-nums ${classe}`}>{valeur}</p>
    </li>
  );
}
