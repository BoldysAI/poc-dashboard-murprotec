"use client";

import { useId, useState } from "react";
import type { PocAlert } from "@/lib/poc/alerts";

type AlertsCenterProps = {
  alerts: PocAlert[];
  /** Ouvert par défaut (ex. tiroir Brief & alertes). */
  defaultOpen?: boolean;
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

export function AlertsCenter({ alerts, defaultOpen }: AlertsCenterProps) {
  const titleId = useId();
  const [open, setOpen] = useState(
    defaultOpen ?? (alerts.length > 0 && alerts.length <= 4),
  );

  const dangerCount = alerts.filter((a) => a.severity === "danger").length;
  const warningCount = alerts.filter((a) => a.severity === "warning").length;

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
                  dangerCount > 0 ? ` · ${dangerCount} critique${dangerCount > 1 ? "s" : ""}` : ""
                }${
                  warningCount > 0
                    ? ` · ${warningCount} à surveiller`
                    : ""
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
          ) : (
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
                      <p className="text-sm font-medium text-primary">
                        {alert.title}
                      </p>
                    </div>
                    <p className="mt-1 text-xs leading-relaxed text-primary/70">
                      {alert.detail}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      ) : null}
    </section>
  );
}
