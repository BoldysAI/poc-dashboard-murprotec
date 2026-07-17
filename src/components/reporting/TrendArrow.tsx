import type { TrendTone } from "./format-reporting";

type TrendArrowProps = {
  tone: TrendTone;
  className?: string;
};

/** Flèche SVG (pas d’emoji) — haut = amélioration, bas = dégradation. */
export function TrendArrow({ tone, className = "size-5" }: TrendArrowProps) {
  if (tone === "neutral") {
    return (
      <svg
        className={className}
        viewBox="0 0 20 20"
        fill="currentColor"
        aria-hidden
      >
        <path d="M4 10h12" stroke="currentColor" strokeWidth="2" fill="none" />
      </svg>
    );
  }

  const up = tone === "success";
  return (
    <svg
      className={className}
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden
    >
      {up ? (
        <path d="M10 3.5 15.5 10H12v6.5H8V10H4.5L10 3.5Z" />
      ) : (
        <path d="M10 16.5 4.5 10H8V3.5h4V10h3.5L10 16.5Z" />
      )}
    </svg>
  );
}
