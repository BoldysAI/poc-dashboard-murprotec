"use client";

import type {
  CahierCommande,
  EuroCoupon,
  Impayes,
} from "@/types/dashboard";
import { formatEur, formatMois } from "./format-reporting";

type PilotageCommercialBlockProps = {
  cahierCommande: CahierCommande;
  impayes: Impayes;
  euroCoupon: EuroCoupon;
};

type SeuilStatut = "ok" | "danger";

function AlertIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden
    >
      <path
        fillRule="evenodd"
        d="M8.257 3.099c.765-1.36 2.721-1.36 3.486 0l6.518 11.594c.75 1.335-.213 2.982-1.742 2.982H3.48c-1.53 0-2.493-1.647-1.743-2.982L8.257 3.1ZM10 7a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 10 7Zm0 7a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden
    >
      <path
        fillRule="evenodd"
        d="M16.704 5.29a1 1 0 0 1 .006 1.414l-7.25 7.333a1 1 0 0 1-1.432.01L3.29 9.98a1 1 0 1 1 1.42-1.41l3.96 3.986 6.54-6.615a1 1 0 0 1 1.494-.05Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

/** Impayés : rester sous le seuil = bon. */
function seuilStatutPlafond(valeur: number, seuil: number): SeuilStatut {
  return valeur <= seuil ? "ok" : "danger";
}

/** Euro/coupon : dépasser le seuil = bon. */
function seuilStatutPlancher(valeur: number, seuil: number): SeuilStatut {
  return valeur >= seuil ? "ok" : "danger";
}

function statutStyles(statut: SeuilStatut): {
  shell: string;
  value: string;
  label: string;
} {
  if (statut === "ok") {
    return {
      shell: "border-success/25 bg-success/5",
      value: "text-success",
      label: "text-success/80",
    };
  }
  return {
    shell: "border-danger/35 bg-danger/10",
    value: "text-danger",
    label: "text-danger/90",
  };
}

export function PilotageCommercialBlock({
  cahierCommande,
  impayes,
  euroCoupon,
}: PilotageCommercialBlockProps) {
  const statutImpayes = seuilStatutPlafond(impayes.nbMois, impayes.seuil);
  const statutEuro = seuilStatutPlancher(euroCoupon.valeur, euroCoupon.seuil);
  const stylesImpayes = statutStyles(statutImpayes);
  const stylesEuro = statutStyles(statutEuro);

  return (
    <section
      className="rounded-lg border-2 border-primary/15 bg-background p-5 sm:p-6"
      aria-labelledby="pilotage-commercial-title"
    >
      <header className="mb-4">
        <h2
          id="pilotage-commercial-title"
          className="text-lg font-semibold tracking-tight text-primary"
        >
          Pilotage commercial
        </h2>
        <p className="mt-0.5 text-sm text-primary/65">
          Suivi commercial et trésorerie agence.
        </p>
      </header>

      <div className="mt-1 grid gap-5 md:grid-cols-3">
        <article className="flex h-full flex-col rounded-lg border border-primary/10 bg-background p-4 sm:p-5">
          <header>
            <h3 className="text-sm font-medium text-primary/75">
              Cahier de commande
            </h3>
            <p className="mt-0.5 text-xs text-primary/55">
              Commandes en attente de facturation.
            </p>
          </header>
          <p className="mt-3 text-2xl font-semibold tabular-nums tracking-tight text-primary sm:text-3xl">
            {formatEur(cahierCommande.montant)}
          </p>
          <p className="mt-2 text-sm text-primary/70">
            soit{" "}
            <span className="font-medium tabular-nums text-primary">
              {formatMois(cahierCommande.nbMois)} mois
            </span>{" "}
            de facturation
          </p>
        </article>

        <article
          className={`flex h-full flex-col rounded-lg border p-4 sm:p-5 ${stylesImpayes.shell}`}
          aria-label={`Impayés : ${formatEur(impayes.listeRouge)}, ${formatMois(impayes.nbMois)} mois, ${statutImpayes === "ok" ? "dans le seuil" : "au-dessus du seuil"}`}
        >
          <header className="flex items-start justify-between gap-2">
            <div>
              <h3 className="text-sm font-medium text-primary/75">Impayés</h3>
              <p className="mt-0.5 text-xs text-primary/55">Liste rouge</p>
            </div>
            <span className="flex size-4 shrink-0 items-center justify-center">
              {statutImpayes === "ok" ? (
                <CheckIcon className={`size-4 ${stylesImpayes.value}`} />
              ) : (
                <AlertIcon className={`size-4 ${stylesImpayes.value}`} />
              )}
            </span>
          </header>
          <p
            className={`mt-3 text-2xl font-semibold tabular-nums tracking-tight sm:text-3xl ${stylesImpayes.value}`}
          >
            {formatEur(impayes.listeRouge)}
          </p>
          <p className={`mt-2 text-sm tabular-nums ${stylesImpayes.label}`}>
            {formatMois(impayes.nbMois)} mois
            <span className="text-primary/45">
              {" "}
              · seuil {formatMois(impayes.seuil, 0)} mois
            </span>
          </p>
        </article>

        <article
          className={`flex h-full flex-col rounded-lg border p-4 sm:p-5 ${stylesEuro.shell}`}
          aria-label={`Euro par coupon : ${formatEur(euroCoupon.valeur)}, ${statutEuro === "ok" ? "au-dessus ou égal au seuil" : "en dessous du seuil"}`}
        >
          <header className="flex items-start justify-between gap-2">
            <div>
              <h3 className="text-sm font-medium text-primary/75">
                Euro / coupon
              </h3>
              <p className="mt-0.5 text-xs text-primary/55">
                Coût moyen par coupon reçu.
              </p>
            </div>
            <span className="flex size-4 shrink-0 items-center justify-center">
              {statutEuro === "ok" ? (
                <CheckIcon className={`size-4 ${stylesEuro.value}`} />
              ) : (
                <AlertIcon className={`size-4 ${stylesEuro.value}`} />
              )}
            </span>
          </header>
          <p
            className={`mt-3 text-2xl font-semibold tabular-nums tracking-tight sm:text-3xl ${stylesEuro.value}`}
          >
            {formatEur(euroCoupon.valeur)}
          </p>
          <p className={`mt-2 text-sm ${stylesEuro.label}`}>
            seuil {formatEur(euroCoupon.seuil)}
          </p>
        </article>
      </div>
    </section>
  );
}
