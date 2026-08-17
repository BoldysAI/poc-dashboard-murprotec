"use client";

import { formatEur } from "./format-reporting";

type BeneficeNetCardProps = {
  title: string;
  subtitle: string;
  beneficeNet: number;
};

export function BeneficeNetCard({
  title,
  subtitle,
  beneficeNet,
}: BeneficeNetCardProps) {
  return (
    <article className="flex flex-col gap-4 rounded-lg border-2 border-primary/15 bg-background p-5 sm:p-6">
      <header>
        <h2 className="text-lg font-semibold tracking-tight text-primary">
          {title}
        </h2>
        <p className="mt-0.5 text-sm text-primary/65">{subtitle}</p>
      </header>

      <p className="text-3xl font-semibold tabular-nums tracking-tight text-primary">
        {formatEur(beneficeNet)}
      </p>
    </article>
  );
}
