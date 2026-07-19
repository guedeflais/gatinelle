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
 * Papillon en SVG (pas une image fixe) pour pouvoir l'animer : battement
 * d'ailes discret au repos, envol quand un paiement est validé (voir
 * PayerForm). Forme calquée sur l'image de référence transmise par
 * l'utilisateur : ailes en amande (pointues près du corps, arrondies à
 * l'extérieur), antennes bien visibles avec leurs points au bout.
 */
export function Butterfly({ flying, light = false }: ButterflyProps) {
  const palette = light ? PALETTE.light : PALETTE.brand;
  const primaryOpacity = light ? 0.95 : 1;
  const secondaryOpacity = light ? 0.7 : 1;
  const darkOpacity = light ? 1 : 1;

  return (
    <div
      className={`pointer-events-none inline-block ${flying ? "butterfly-fly" : ""}`}
      aria-hidden="true"
    >
      <svg
        width="64"
        height="64"
        viewBox="0 0 100 100"
        className={flying ? "butterfly-flutter-fast" : "butterfly-flutter"}
      >
        <g style={{ transformOrigin: "50px 40px" }} className="butterfly-wing-left">
          <path
            d="M48,36 Q26.20,45.30 10,28 Q31.80,18.70 48,36 Z"
            fill={palette.primary}
            fillOpacity={primaryOpacity}
          />
          <path
            d="M49,50 Q40.10,70.29 18,72 Q26.90,51.71 49,50 Z"
            fill={palette.secondary}
            fillOpacity={secondaryOpacity}
          />
        </g>
        <g style={{ transformOrigin: "50px 40px" }} className="butterfly-wing-right">
          <path
            d="M52,36 Q73.80,45.30 90,28 Q68.20,18.70 52,36 Z"
            fill={palette.primary}
            fillOpacity={primaryOpacity}
          />
          <path
            d="M51,50 Q59.90,70.29 82,72 Q73.10,51.71 51,50 Z"
            fill={palette.secondary}
            fillOpacity={secondaryOpacity}
          />
        </g>
        <path
          d="M50,33 C54,38 54,55 50,66 C46,55 46,38 50,33 Z"
          fill={palette.dark}
          fillOpacity={darkOpacity}
        />
        <circle cx="50" cy="30" r="3.5" fill={palette.dark} fillOpacity={darkOpacity} />
        <path
          d="M48,29 C40,20 34,16 30,15 M52,29 C60,20 66,16 70,15"
          stroke={palette.dark}
          strokeOpacity={darkOpacity}
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
        />
        <circle cx="30" cy="15" r="2.4" fill={palette.dark} fillOpacity={darkOpacity} />
        <circle cx="70" cy="15" r="2.4" fill={palette.dark} fillOpacity={darkOpacity} />
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
