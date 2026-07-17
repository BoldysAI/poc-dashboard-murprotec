type TresoreriePrintBannerProps = {
  periode: string | null;
  fileName: string;
};

/**
 * Bandeau logo + titre daté — réservé à la feuille d’impression PDF.
 * `<img>` natif (pas next/image) pour un rendu fiable en print.
 */
export function TresoreriePrintBanner({
  periode,
  fileName,
}: TresoreriePrintBannerProps) {
  const title =
    periode !== null ? `Trésorerie au ${periode}` : "Trésorerie Groupe";

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
        <h1>{title}</h1>
        <p>{fileName}</p>
      </div>
    </header>
  );
}
