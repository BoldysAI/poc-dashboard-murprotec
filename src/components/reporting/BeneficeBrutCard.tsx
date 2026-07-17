"use client";

import { TrendArrow } from "./TrendArrow";
import {
  deltaAbsolu,
  deltaRelatif,
  formatEur,
  formatEurSigned,
  formatPct,
  formatPctSigned,
  toneClass,
  trendTone,
} from "./format-reporting";

type BeneficeBrutCardProps = {
  beneficeBrut: number;
  margeBrute: number;
  beneficeBrutN1: number;
};

export function BeneficeBrutCard({
  beneficeBrut,
  margeBrute,
  beneficeBrutN1,
}: BeneficeBrutCardProps) {
  const delta = deltaAbsolu(beneficeBrut, beneficeBrutN1);
  const rel = deltaRelatif(beneficeBrut, beneficeBrutN1);
  const tone = trendTone(delta);
  const label =
    tone === "success"
      ? "En hausse vs N-1"
      : tone === "danger"
        ? "En baisse vs N-1"
        : "Stable vs N-1";

  return (
    <article className="flex flex-col gap-4 rounded-lg border-2 border-primary/15 bg-background p-5 sm:p-6">
      <header>
        <h2 className="text-lg font-semibold tracking-tight text-primary">
          Bénéfice brut
        </h2>
        <p className="mt-0.5 text-sm text-primary/65">
          Résultat avant charges de structure, avec marge et comparaison à
          l&apos;an dernier.
        </p>
      </header>

      <div>
        <p className="text-3xl font-semibold tabular-nums tracking-tight text-primary">
          {formatEur(beneficeBrut)}
        </p>
        <p className="mt-1 text-sm text-primary/70">
          Marge brute{" "}
          <span className="font-medium tabular-nums text-primary">
            {formatPct(margeBrute, 2)}
          </span>
        </p>
      </div>

      <div
        className={`flex items-start gap-3 rounded-md bg-surface/80 px-3 py-3 ${toneClass(tone)}`}
        aria-label={`${label} : ${formatEurSigned(delta)}${rel !== null ? `, soit ${formatPctSigned(rel)}` : ""}`}
      >
        <TrendArrow tone={tone} className="mt-0.5 size-5 shrink-0" />
        <div className="min-w-0 flex-1 text-sm">
          <p className="font-medium">{label}</p>
          <p className="mt-0.5 tabular-nums">
            {formatEurSigned(delta)}
            {rel !== null ? (
              <span className="text-current/80">
                {" "}
                ({formatPctSigned(rel)})
              </span>
            ) : null}
          </p>
          <p className="mt-1 text-primary/55">
            N-1 :{" "}
            <span className="tabular-nums text-primary/70">
              {formatEur(beneficeBrutN1)}
            </span>
          </p>
        </div>
      </div>
    </article>
  );
}
