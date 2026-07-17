import type { ReportingBundle } from "@/types/dashboard";

/** Id d’agence sélectionnée par défaut : WAL O si présent, sinon la première. */
export function defaultAgenceId(bundle: ReportingBundle): string {
  const wal = bundle.agencies.find(
    (a) => a.agenceId.trim().toUpperCase() === "WAL O",
  );
  return wal?.agenceId ?? bundle.agencies[0]!.agenceId;
}
