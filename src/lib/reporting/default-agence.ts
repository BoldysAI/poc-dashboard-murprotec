import type { ReportingBundle } from "@/types/dashboard";

/** Id d’agence sélectionnée par défaut : premier onglet (ordre Excel / barre). */
export function defaultAgenceId(bundle: ReportingBundle): string {
  return bundle.agencies[0]!.agenceId;
}
