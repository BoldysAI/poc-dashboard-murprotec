"use client";

import type { BriefBullet, MonthBrief } from "@/lib/poc/brief";

type BriefDuMoisProps = {
  brief: MonthBrief;
};

function toneDot(tone: BriefBullet["tone"]): string {
  if (tone === "success") return "bg-success";
  if (tone === "danger") return "bg-danger";
  if (tone === "warning") return "bg-warning";
  return "bg-primary/35";
}

export function BriefDuMois({ brief }: BriefDuMoisProps) {
  return (
    <section
      className="rounded-lg border-2 border-primary/15 bg-surface/60 p-4 sm:p-5"
      aria-labelledby="brief-du-mois-title"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-primary/55">
            Synthèse pour Thomas
          </p>
          <h2
            id="brief-du-mois-title"
            className="mt-0.5 text-lg font-semibold tracking-tight text-primary"
          >
            {brief.title}
          </h2>
          <p className="text-sm text-primary/65">{brief.subtitle}</p>
        </div>
        <span className="inline-flex items-center rounded-md border border-accent/40 bg-accent/15 px-2 py-0.5 text-[11px] font-medium text-primary">
          Aperçu produit
        </span>
      </div>

      <ul className="mt-4 space-y-2.5">
        {brief.bullets.map((b) => (
          <li key={b.id} className="flex gap-2.5 text-sm text-primary/90">
            <span
              className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${toneDot(b.tone)}`}
              aria-hidden
            />
            <span>{b.text}</span>
          </li>
        ))}
      </ul>

      <div className="mt-4 rounded-md border border-primary/10 bg-background px-3 py-2.5">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-primary/50">
          Conseil
        </p>
        <p className="mt-1 text-sm text-primary/85">{brief.conseil}</p>
      </div>
    </section>
  );
}
