"use client";

interface ButterflyProps {
  flying: boolean;
  // Variante claire (blanc translucide) pour les fonds en dégradé bleu/vert
  // (écran de bienvenue, page d'accueil) ; variante par défaut (bleu marque)
  // pour les fonds clairs (ex. formulaire de paiement).
  light?: boolean;
}

const PALETTE = {
  brand: { primary: "#4F8FC0", secondary: "#9CC3E0", dark: "#3d7098" },
  light: { primary: "#FFFFFF", secondary: "#FFFFFF", dark: "#FFFFFF" },
};

/**
 * Papillon du logo Gâtinelle, en SVG (pas une image fixe) pour pouvoir
 * l'animer : battement d'ailes discret au repos, envol quand un paiement
 * est validé (voir PayerForm). Ailes en forme d'aile (pointues près du
 * corps, arrondies à l'extérieur), pas des ovales.
 */
export function Butterfly({ flying, light = false }: ButterflyProps) {
  const palette = light ? PALETTE.light : PALETTE.brand;
  const primaryOpacity = light ? 0.9 : 1;
  const secondaryOpacity = light ? 0.6 : 1;
  const darkOpacity = light ? 0.95 : 1;

  return (
    <div
      className={`pointer-events-none inline-block ${flying ? "butterfly-fly" : ""}`}
      aria-hidden="true"
    >
      <svg
        width="56"
        height="56"
        viewBox="0 0 56 56"
        className={flying ? "butterfly-flutter-fast" : "butterfly-flutter"}
      >
        <g style={{ transformOrigin: "28px 20px" }} className="butterfly-wing-left">
          <path
            d="M28,18 Q13.37,19.72 8,6 Q22.63,4.28 28,18 Z"
            fill={palette.primary}
            fillOpacity={primaryOpacity}
          />
          <path
            d="M28,24 Q25.24,35.24 14,38 Q16.76,26.76 28,24 Z"
            fill={palette.secondary}
            fillOpacity={secondaryOpacity}
          />
        </g>
        <g style={{ transformOrigin: "28px 20px" }} className="butterfly-wing-right">
          <path
            d="M28,18 Q42.63,19.72 48,6 Q33.37,4.28 28,18 Z"
            fill={palette.primary}
            fillOpacity={primaryOpacity}
          />
          <path
            d="M28,24 Q30.76,35.24 42,38 Q39.24,26.76 28,24 Z"
            fill={palette.secondary}
            fillOpacity={secondaryOpacity}
          />
        </g>
        <ellipse cx="28" cy="28" rx="2" ry="15" fill={palette.dark} fillOpacity={darkOpacity} />
        <path
          d="M28 14 C24 7, 20 3, 16 1 M28 14 C32 7, 36 3, 40 1"
          stroke={palette.dark}
          strokeOpacity={darkOpacity}
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
        />
        <circle cx="16" cy="1" r="1.6" fill={palette.dark} fillOpacity={darkOpacity} />
        <circle cx="40" cy="1" r="1.6" fill={palette.dark} fillOpacity={darkOpacity} />
      </svg>

      <style jsx>{`
        .butterfly-flutter .butterfly-wing-left,
        .butterfly-flutter .butterfly-wing-right {
          animation: butterfly-flap 1.1s ease-in-out infinite;
        }
        .butterfly-flutter-fast .butterfly-wing-left,
        .butterfly-flutter-fast .butterfly-wing-right {
          animation: butterfly-flap 0.28s ease-in-out infinite;
        }
        @keyframes butterfly-flap {
          0%,
          100% {
            transform: scaleX(1);
          }
          50% {
            transform: scaleX(0.55);
          }
        }
        .butterfly-fly {
          animation: butterfly-takeoff 1.6s ease-in forwards;
        }
        @keyframes butterfly-takeoff {
          0% {
            transform: translate(0, 0) rotate(0deg);
            opacity: 1;
          }
          40% {
            transform: translate(30px, -40px) rotate(-8deg);
            opacity: 1;
          }
          100% {
            transform: translate(70px, -140px) rotate(12deg);
            opacity: 0;
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .butterfly-flutter .butterfly-wing-left,
          .butterfly-flutter .butterfly-wing-right,
          .butterfly-flutter-fast .butterfly-wing-left,
          .butterfly-flutter-fast .butterfly-wing-right,
          .butterfly-fly {
            animation: none;
          }
        }
      `}</style>
    </div>
  );
}
