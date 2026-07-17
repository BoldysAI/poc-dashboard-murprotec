type ReportingPrintBannerProps = {
  agenceLibelle: string;
  periodeLabel: string;
  fileName: string;
};

/**
 * Bandeau logo + titre — feuille d’impression PDF reporting.
 * `<img>` natif (pas next/image) pour un rendu fiable en print.
 */
export function ReportingPrintBanner({
  agenceLibelle,
  periodeLabel,
  fileName,
}: ReportingPrintBannerProps) {
  return (
    <header className="print-banner">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/logo_murpro_group.png"
        alt="Murpro Group"
        width={275}
        height={54}
        className="print-banner-logo"
      />
      <div className="print-banner-text">
        <h1>Reporting — {agenceLibelle}</h1>
        <p>
          {periodeLabel} · {fileName}
        </p>
      </div>
    </header>
  );
}
