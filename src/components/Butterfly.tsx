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
 * est validé (voir PayerForm).
 */
export function Butterfly({ flying, light = false }: ButterflyProps) {
  const palette = light ? PALETTE.light : PALETTE.brand;
  const primaryOpacity = light ? 0.85 : 1;
  const secondaryOpacity = light ? 0.55 : 1;
  const darkOpacity = light ? 0.95 : 1;

  return (
    <div
      className={`pointer-events-none inline-block ${flying ? "butterfly-fly" : ""}`}
      aria-hidden="true"
    >
      <svg
        width="40"
        height="40"
        viewBox="0 0 40 40"
        className={flying ? "butterfly-flutter-fast" : "butterfly-flutter"}
      >
        <g style={{ transformOrigin: "20px 18px" }} className="butterfly-wing-left">
          <ellipse
            cx="10"
            cy="14"
            rx="9"
            ry="10"
            transform="rotate(-20 10 14)"
            fill={palette.primary}
            fillOpacity={primaryOpacity}
          />
          <ellipse
            cx="12"
            cy="26"
            rx="6.5"
            ry="7.5"
            transform="rotate(-10 12 26)"
            fill={palette.secondary}
            fillOpacity={secondaryOpacity}
          />
        </g>
        <g style={{ transformOrigin: "20px 18px" }} className="butterfly-wing-right">
          <ellipse
            cx="30"
            cy="14"
            rx="9"
            ry="10"
            transform="rotate(20 30 14)"
            fill={palette.primary}
            fillOpacity={primaryOpacity}
          />
          <ellipse
            cx="28"
            cy="26"
            rx="6.5"
            ry="7.5"
            transform="rotate(10 28 26)"
            fill={palette.secondary}
            fillOpacity={secondaryOpacity}
          />
        </g>
        <ellipse cx="20" cy="20" rx="1.5" ry="10" fill={palette.dark} fillOpacity={darkOpacity} />
        <path
          d="M20 12 C17.5 8.5, 15.5 6.5, 14 5 M20 12 C22.5 8.5, 24.5 6.5, 26 5"
          stroke={palette.dark}
          strokeOpacity={darkOpacity}
          strokeWidth="1"
          fill="none"
          strokeLinecap="round"
        />
        <circle cx="14" cy="5" r="0.9" fill={palette.dark} fillOpacity={darkOpacity} />
        <circle cx="26" cy="5" r="0.9" fill={palette.dark} fillOpacity={darkOpacity} />
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
