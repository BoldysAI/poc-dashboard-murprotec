"use client";

import { useId, useState } from "react";
import type { PocAlert } from "@/lib/poc/alerts";
import { sortAlerts } from "@/lib/poc/alerts";

type AlertsCenterProps = {
  alerts: PocAlert[];
  /** Ouvert par défaut (ex. tiroir Brief & alertes). */
  defaultOpen?: boolean;
};

type AlertGroup = {
  key: string;
  label: string | null;
  alerts: PocAlert[];
};

function severityStyles(severity: PocAlert["severity"]): {
  badge: string;
  border: string;
} {
  if (severity === "danger") {
    return {
      badge: "bg-danger/15 text-danger",
      border: "border-danger/25",
    };
  }
  if (severity === "warning") {
    return {
      badge: "bg-warning/15 text-warning",
      border: "border-warning/25",
    };
  }
  return {
    badge: "bg-primary/10 text-primary/80",
    border: "border-primary/15",
  };
}

function severityLabel(severity: PocAlert["severity"]): string {
  if (severity === "danger") return "Critique";
  if (severity === "warning") return "Attention";
  return "Info";
}

/** Regroupe par agence (ordre d’apparition) ; sinon une seule liste plate. */
function groupAlerts(alerts: PocAlert[]): AlertGroup[] {
  const hasAgence = alerts.some((a) => a.agenceId);
  if (!hasAgence) {
    return [{ key: "all", label: null, alerts: sortAlerts(alerts) }];
  }

  const groups = new Map<string, AlertGroup>();
  for (const alert of alerts) {
    const key = alert.agenceId ?? "_";
    const existing = groups.get(key);
    if (existing) {
      existing.alerts.push(alert);
    } else {
      groups.set(key, {
        key,
        label: alert.agenceLabel ?? "Agence",
        alerts: [alert],
      });
    }
  }

  return [...groups.values()].map((g) => ({
    ...g,
    alerts: sortAlerts(g.alerts),
  }));
}

function AlertListItems({ alerts }: { alerts: PocAlert[] }) {
  return (
    <ul className="space-y-2.5">
      {alerts.map((alert) => {
        const styles = severityStyles(alert.severity);
        return (
          <li
            key={alert.id}
            className={`rounded-md border ${styles.border} bg-surface/50 px-3 py-2.5`}
          >
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${styles.badge}`}
              >
                {severityLabel(alert.severity)}
              </span>
              <p className="text-sm font-medium text-primary">{alert.title}</p>
            </div>
            <p className="mt-1 text-xs leading-relaxed text-primary/70">
              {alert.detail}
            </p>
          </li>
        );
      })}
    </ul>
  );
}

/** Section agence repliable — fermée par défaut. */
function AgencyAlertSection({ group }: { group: AlertGroup }) {
  const [expanded, setExpanded] = useState(false);
  const panelId = useId();
  const dangerCount = group.alerts.filter((a) => a.severity === "danger").length;

  return (
    <section className="rounded-md border border-primary/10 bg-surface/30">
      <button
        type="button"
        className="flex w-full cursor-pointer items-center justify-between gap-3 px-3 py-2.5 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        aria-expanded={expanded}
        aria-controls={panelId}
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="flex min-w-0 items-center gap-2">
          <svg
            viewBox="0 0 20 20"
            className={[
              "h-4 w-4 shrink-0 text-primary/50 transition-transform",
              expanded ? "rotate-90" : "",
            ].join(" ")}
            fill="currentColor"
            aria-hidden
          >
            <path d="M7.21 14.77a.75.75 0 0 1 .02-1.06L11.168 10 7.23 6.29a.75.75 0 1 1 1.04-1.08l4.5 4.25a.75.75 0 0 1 0 1.08l-4.5 4.25a.75.75 0 0 1-1.06-.02Z" />
          </svg>
          <h3 className="truncate text-xs font-semibold uppercase tracking-wide text-primary/80">
            {group.label}
          </h3>
        </div>
        <span
          className={[
            "inline-flex h-6 min-w-6 shrink-0 items-center justify-center rounded-full px-1.5 text-[11px] font-semibold",
            dangerCount > 0
              ? "bg-danger/15 text-danger"
              : "bg-warning/15 text-warning",
          ].join(" ")}
        >
          {group.alerts.length}
        </span>
      </button>
      {expanded ? (
        <div id={panelId} className="border-t border-primary/10 px-3 pb-3 pt-2.5">
          <AlertListItems alerts={group.alerts} />
        </div>
      ) : null}
    </section>
  );
}

export function AlertsCenter({ alerts, defaultOpen }: AlertsCenterProps) {
  const titleId = useId();
  const [open, setOpen] = useState(
    defaultOpen ?? (alerts.length > 0 && alerts.length <= 4),
  );

  const dangerCount = alerts.filter((a) => a.severity === "danger").length;
  const warningCount = alerts.filter((a) => a.severity === "warning").length;
  const groups = groupAlerts(alerts);
  const showAgencySections = groups.some((g) => g.label !== null);

  return (
    <section
      className="rounded-lg border-2 border-primary/15 bg-background"
      aria-labelledby={titleId}
    >
      <button
        type="button"
        className="flex w-full cursor-pointer items-center justify-between gap-3 px-4 py-3 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:px-5"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <div>
          <h2
            id={titleId}
            className="text-base font-semibold tracking-tight text-primary"
          >
            Centre d’alertes
          </h2>
          <p className="mt-0.5 text-xs text-primary/60">
            {alerts.length === 0
              ? "Aucun écart détecté sur les données chargées."
              : `${alerts.length} point${alerts.length > 1 ? "s" : ""} d’attention${
                  dangerCount > 0
                    ? ` · ${dangerCount} critique${dangerCount > 1 ? "s" : ""}`
                    : ""
                }${
                  warningCount > 0 ? ` · ${warningCount} à surveiller` : ""
                }`}
          </p>
        </div>
        <span
          className={[
            "inline-flex h-8 min-w-8 items-center justify-center rounded-full px-2 text-sm font-semibold",
            alerts.length === 0
              ? "bg-success/15 text-success"
              : dangerCount > 0
                ? "bg-danger/15 text-danger"
                : "bg-warning/15 text-warning",
          ].join(" ")}
          aria-hidden
        >
          {alerts.length}
        </span>
      </button>

      {open ? (
        <div className="border-t border-primary/10 px-4 pb-4 pt-3 sm:px-5">
          {alerts.length === 0 ? (
            <p className="text-sm text-primary/70">
              Les seuils et variations sont dans une zone favorable. Ce panneau
              agrègera automatiquement les écarts dès qu’ils apparaissent.
            </p>
          ) : showAgencySections ? (
            <div className="space-y-2">
              {groups.map((group) => (
                <AgencyAlertSection key={group.key} group={group} />
              ))}
            </div>
          ) : (
            <AlertListItems alerts={groups[0]!.alerts} />
          )}
        </div>
      ) : null}
    </section>
  );
}
