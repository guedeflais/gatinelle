"use client";

interface ButterflyProps {
  flying: boolean;
}

/**
 * Papillon repris de l'image fournie par l'utilisateur (public/papillon.png,
 * ailes détourées) : le corps et les antennes sont redessinés en SVG et
 * superposés à l'image, car ils ont la même couleur que le fond d'origine et
 * ne pouvaient pas être détourés automatiquement. Étant une image, les ailes
 * ne peuvent pas battre indépendamment (pas de flutter au repos) — seul
 * l'envol au succès d'un paiement (translation/rotation/fondu sur
 * l'ensemble) est animé, voir PayerForm.
 */
export function Butterfly({ flying }: ButterflyProps) {
  return (
    <div
      className={`pointer-events-none inline-block ${flying ? "butterfly-fly" : ""}`}
      aria-hidden="true"
    >
      <svg width="100" height="61" viewBox="0 0 480 293" xmlns="http://www.w3.org/2000/svg">
        <image href="/papillon.png" x="0" y="0" width="480" height="293" />
        <path d="M223,130 Q230,200 240,255 Q250,200 257,130 Z" fill="#FFFFFF" />
        <ellipse cx="240" cy="113" rx="39" ry="17" fill="#FFFFFF" />
        <path
          d="M225,100 Q195,50 180,10 M255,100 Q285,50 298,10"
          stroke="#FFFFFF"
          strokeWidth="6"
          fill="none"
          strokeLinecap="round"
        />
        <circle cx="178" cy="3" r="12" fill="#FFFFFF" />
        <circle cx="300" cy="3" r="12" fill="#FFFFFF" />
      </svg>

      <style jsx>{`
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
          .butterfly-fly {
            animation: none;
          }
        }
      `}</style>
    </div>
  );
}
