import type { StatutRapprochement } from "@/types/rapprochement";

const STYLES: Record<StatutRapprochement, string> = {
  OK: "bg-success/10 text-success",
  "Not OK": "bg-danger/10 text-danger",
  "Non apparié": "bg-warning/15 text-warning",
};

export function StatutBadge({ statut }: { statut: StatutRapprochement }) {
  return (
    <span
      className={`inline-flex rounded px-2 py-0.5 text-xs font-semibold ${STYLES[statut]}`}
    >
      {statut}
    </span>
  );
}
