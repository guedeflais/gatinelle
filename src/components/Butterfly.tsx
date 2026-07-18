"use client";

interface ButterflyProps {
  flying: boolean;
}

/**
 * Papillon du logo Gâtinelle, en SVG (pas une image fixe) pour pouvoir
 * l'animer : battement d'ailes discret au repos, envol quand un paiement
 * est validé (voir PayerForm).
 */
export function Butterfly({ flying }: ButterflyProps) {
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
          <path d="M20 16 C10 4, 2 6, 4 16 C6 24, 14 22, 20 18 Z" fill="#4F8FC0" />
          <path d="M20 20 C13 22, 8 30, 13 32 C18 33, 20 25, 20 20 Z" fill="#9CC3E0" />
        </g>
        <g style={{ transformOrigin: "20px 18px" }} className="butterfly-wing-right">
          <path d="M20 16 C30 4, 38 6, 36 16 C34 24, 26 22, 20 18 Z" fill="#4F8FC0" />
          <path d="M20 20 C27 22, 32 30, 27 32 C22 33, 20 25, 20 20 Z" fill="#9CC3E0" />
        </g>
        <path
          d="M20 14 C18 10, 16 8, 15 7 M20 14 C22 10, 24 8, 25 7"
          stroke="#3d7098"
          strokeWidth="0.8"
          fill="none"
          strokeLinecap="round"
        />
        <ellipse cx="20" cy="20" rx="1.4" ry="6" fill="#2b2420" />
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
