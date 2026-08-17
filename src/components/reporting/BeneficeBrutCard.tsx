"use client";

import { formatEur, formatPct } from "./format-reporting";

type BeneficeBrutCardProps = {
  title: string;
  subtitle: string;
  beneficeBrut: number;
  margeBrute: number;
};

export function BeneficeBrutCard({
  title,
  subtitle,
  beneficeBrut,
  margeBrute,
}: BeneficeBrutCardProps) {
  return (
    <article className="flex flex-col gap-4 rounded-lg border-2 border-primary/15 bg-background p-5 sm:p-6">
      <header>
        <h2 className="text-lg font-semibold tracking-tight text-primary">
          {title}
        </h2>
        <p className="mt-0.5 text-sm text-primary/65">{subtitle}</p>
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
    </article>
  );
}
