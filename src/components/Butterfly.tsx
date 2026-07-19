"use client";

interface ButterflyProps {
  flying: boolean;
}

/**
 * Papillon en SVG (tracés fournis par l'utilisateur) : battement d'ailes,
 * balancement des antennes et léger mouvement du corps en continu ; envol
 * (translation/rotation/fondu de l'ensemble) au succès d'un paiement, voir
 * PayerForm.
 */
export function Butterfly({ flying }: ButterflyProps) {
  return (
    <div
      className={`pointer-events-none inline-block ${flying ? "butterfly-fly" : ""}`}
      aria-hidden="true"
    >
      <svg width="72" height="60" viewBox="0 0 600 500" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="wingGradLeft" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
            <stop offset="55%" stopColor="#dbe9f4" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#a9c9dd" stopOpacity="0.85" />
          </linearGradient>
          <linearGradient id="wingGradRight" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
            <stop offset="55%" stopColor="#dbe9f4" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#a9c9dd" stopOpacity="0.85" />
          </linearGradient>
          <linearGradient id="lowerWingGradLeft" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#eef6fb" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#bcd7e6" stopOpacity="0.85" />
          </linearGradient>
          <linearGradient id="lowerWingGradRight" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#eef6fb" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#bcd7e6" stopOpacity="0.85" />
          </linearGradient>
          <linearGradient id="bodyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#5c7a90" />
            <stop offset="100%" stopColor="#2b3d4a" />
          </linearGradient>
        </defs>

        <g className="wing-upper-left">
          <path
            d="M300,180 C230,90 130,55 60,80 C15,96 5,150 35,190 C65,230 130,250 190,235 C240,222 280,205 300,180 Z"
            fill="url(#wingGradLeft)"
            stroke="#ffffff"
            strokeWidth="1.5"
          />
          <path
            d="M295,175 C240,130 170,100 100,100"
            stroke="#ffffff"
            strokeWidth="1"
            opacity="0.55"
            fill="none"
          />
          <path
            d="M295,185 C250,160 190,150 130,160"
            stroke="#ffffff"
            strokeWidth="1"
            opacity="0.55"
            fill="none"
          />
          <circle cx="120" cy="105" r="4" fill="#ffffff" opacity="0.5" />
          <circle cx="145" cy="95" r="3" fill="#ffffff" opacity="0.5" />
          <circle cx="170" cy="88" r="3.5" fill="#ffffff" opacity="0.5" />
          <ellipse cx="150" cy="130" rx="22" ry="16" fill="#8fb8d4" opacity="0.45" />
          <ellipse cx="150" cy="130" rx="10" ry="7" fill="#ffffff" opacity="0.6" />
          <path
            d="M60,80 C15,96 5,150 35,190 C65,230 130,250 190,235"
            stroke="#7fa6bf"
            strokeWidth="1.5"
            strokeDasharray="2 5"
            fill="none"
            opacity="0.6"
            strokeLinecap="round"
          />
        </g>

        <g className="wing-upper-right">
          <path
            d="M300,180 C370,90 470,55 540,80 C585,96 595,150 565,190 C535,230 470,250 410,235 C360,222 320,205 300,180 Z"
            fill="url(#wingGradRight)"
            stroke="#ffffff"
            strokeWidth="1.5"
          />
          <path
            d="M305,175 C360,130 430,100 500,100"
            stroke="#ffffff"
            strokeWidth="1"
            opacity="0.55"
            fill="none"
          />
          <path
            d="M305,185 C350,160 410,150 470,160"
            stroke="#ffffff"
            strokeWidth="1"
            opacity="0.55"
            fill="none"
          />
          <circle cx="480" cy="105" r="4" fill="#ffffff" opacity="0.5" />
          <circle cx="455" cy="95" r="3" fill="#ffffff" opacity="0.5" />
          <circle cx="430" cy="88" r="3.5" fill="#ffffff" opacity="0.5" />
          <ellipse cx="450" cy="130" rx="22" ry="16" fill="#8fb8d4" opacity="0.45" />
          <ellipse cx="450" cy="130" rx="10" ry="7" fill="#ffffff" opacity="0.6" />
          <path
            d="M540,80 C585,96 595,150 565,190 C535,230 470,250 410,235"
            stroke="#7fa6bf"
            strokeWidth="1.5"
            strokeDasharray="2 5"
            fill="none"
            opacity="0.6"
            strokeLinecap="round"
          />
        </g>

        <g className="wing-lower-left">
          <path
            d="M300,205 C255,250 200,300 150,305 C110,309 85,280 95,245 C105,212 150,195 200,197 C240,199 275,200 300,205 Z"
            fill="url(#lowerWingGradLeft)"
            stroke="#ffffff"
            strokeWidth="1.5"
          />
          <path
            d="M295,215 C260,245 210,275 165,280"
            stroke="#ffffff"
            strokeWidth="1"
            opacity="0.55"
            fill="none"
          />
          <circle cx="170" cy="260" r="3" fill="#ffffff" opacity="0.5" />
          <circle cx="195" cy="270" r="2.5" fill="#ffffff" opacity="0.5" />
          <ellipse cx="180" cy="240" rx="14" ry="10" fill="#8fb8d4" opacity="0.5" />
        </g>

        <g className="wing-lower-right">
          <path
            d="M300,205 C345,250 400,300 450,305 C490,309 515,280 505,245 C495,212 450,195 400,197 C360,199 325,200 300,205 Z"
            fill="url(#lowerWingGradRight)"
            stroke="#ffffff"
            strokeWidth="1.5"
          />
          <path
            d="M305,215 C340,245 390,275 435,280"
            stroke="#ffffff"
            strokeWidth="1"
            opacity="0.55"
            fill="none"
          />
          <circle cx="430" cy="260" r="3" fill="#ffffff" opacity="0.5" />
          <circle cx="405" cy="270" r="2.5" fill="#ffffff" opacity="0.5" />
          <ellipse cx="420" cy="240" rx="14" ry="10" fill="#8fb8d4" opacity="0.5" />
        </g>

        <g className="body-group">
          <path
            d="M300,150 C308,150 314,158 314,172 L314,255 C314,275 308,290 300,295 C292,290 286,275 286,255 L286,172 C286,158 292,150 300,150 Z"
            fill="url(#bodyGrad)"
            stroke="#1c2933"
            strokeWidth="1"
          />
          <g stroke="#1c2933" strokeWidth="0.8" opacity="0.5">
            <line x1="288" y1="185" x2="312" y2="185" />
            <line x1="288" y1="205" x2="312" y2="205" />
            <line x1="289" y1="225" x2="311" y2="225" />
            <line x1="290" y1="245" x2="310" y2="245" />
          </g>
          <circle cx="300" cy="145" r="12" fill="url(#bodyGrad)" stroke="#1c2933" strokeWidth="1" />
          <path
            className="antenna"
            d="M296,138 C280,118 260,100 245,90"
            stroke="#2b3d4a"
            strokeWidth="2.5"
            fill="none"
            strokeLinecap="round"
          />
          <path
            className="antenna"
            d="M304,138 C320,118 340,100 355,90"
            stroke="#2b3d4a"
            strokeWidth="2.5"
            fill="none"
            strokeLinecap="round"
          />
          <circle cx="245" cy="90" r="6" fill="#2b3d4a" />
          <circle cx="355" cy="90" r="6" fill="#2b3d4a" />
        </g>
      </svg>

      <style jsx>{`
        svg {
          overflow: visible;
        }
        .wing-upper-left,
        .wing-lower-left {
          transform-box: fill-box;
          transform-origin: right center;
          animation: flapLeft 1.6s ease-in-out infinite;
        }
        .wing-upper-right,
        .wing-lower-right {
          transform-box: fill-box;
          transform-origin: left center;
          animation: flapRight 1.6s ease-in-out infinite;
        }
        :global(.antenna) {
          transform-box: fill-box;
          transform-origin: bottom center;
          animation: sway 3.2s ease-in-out infinite;
        }
        .body-group {
          animation: bob 1.6s ease-in-out infinite;
        }
        @keyframes flapLeft {
          0%,
          100% {
            transform: scaleX(1) rotateY(0deg);
          }
          50% {
            transform: scaleX(0.78) skewY(4deg);
          }
        }
        @keyframes flapRight {
          0%,
          100% {
            transform: scaleX(1) rotateY(0deg);
          }
          50% {
            transform: scaleX(0.78) skewY(-4deg);
          }
        }
        @keyframes sway {
          0%,
          100% {
            transform: rotate(0deg);
          }
          50% {
            transform: rotate(3deg);
          }
        }
        @keyframes bob {
          0%,
          100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(3px);
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
          .wing-upper-left,
          .wing-lower-left,
          .wing-upper-right,
          .wing-lower-right,
          :global(.antenna),
          .body-group,
          .butterfly-fly {
            animation: none;
          }
        }
      `}</style>
    </div>
  );
}
