"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Leaf, Heart } from "lucide-react";
import { Butterfly } from "./Butterfly";

const ONBOARDING_COOKIE = "gatinelle_onboarding_seen=1; path=/; max-age=31536000";

const SLIDES = [
  {
    icon: <Butterfly flying={false} light />,
    heading: (
      <>
        Bienvenue sur
        <br />
        La Gâtinelle
      </>
    ),
    body: "La monnaie locale numérique de la Gâtine Poitevine",
  },
  {
    icon: <Leaf size={64} strokeWidth={1.5} />,
    heading: "Soutenez les commerçants locaux",
    body: "Chaque Gâtinelle dépensée reste dans notre territoire et renforce l'économie locale.",
  },
  {
    icon: <Heart size={64} strokeWidth={1.5} />,
    heading: (
      <>
        Simple, rapide
        <br />
        et solidaire
      </>
    ),
    body: "Rechargez, payez et suivez vos achats locaux en quelques secondes.",
  },
];

function finishOnboarding() {
  document.cookie = ONBOARDING_COOKIE;
}

export function OnboardingCarousel() {
  const router = useRouter();
  const [slide, setSlide] = useState(0);
  const isLast = slide === SLIDES.length - 1;
  const current = SLIDES[slide];

  function skip() {
    finishOnboarding();
    router.push("/connexion");
  }

  function chooseRole(type: "particulier" | "commercant") {
    finishOnboarding();
    router.push(`/inscription?type=${type}`);
  }

  return (
    <div className="fixed inset-0 flex flex-col bg-gradient-to-br from-brand-700 to-leaf-700 p-6 text-white">
      {!isLast && (
        <button type="button" onClick={skip} className="self-end text-sm text-brand-100">
          Passer →
        </button>
      )}

      <div className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
        <div className="flex h-20 w-20 items-center justify-center">{current.icon}</div>
        <h1 className="text-2xl font-semibold">{current.heading}</h1>
        <p className="max-w-xs text-brand-100">{current.body}</p>
      </div>

      <div className="mb-6 flex justify-center gap-2">
        {SLIDES.map((_, i) => (
          <span
            key={i}
            className={`h-2 rounded-full transition-all ${
              i === slide ? "w-6 bg-white" : "w-2 bg-white/40"
            }`}
          />
        ))}
      </div>

      {isLast ? (
        <div className="flex flex-col gap-3">
          <p className="text-center text-sm text-brand-100">Je suis...</p>
          <button
            type="button"
            onClick={() => chooseRole("particulier")}
            className="rounded-full bg-white px-6 py-3 font-medium text-brand-700"
          >
            Un consom&apos;acteur
          </button>
          <button
            type="button"
            onClick={() => chooseRole("commercant")}
            className="rounded-full border border-white px-6 py-3 font-medium text-white"
          >
            Un commerçant
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setSlide((s) => s + 1)}
          className="rounded-full bg-white px-6 py-3 font-medium text-brand-700"
        >
          Suivant
        </button>
      )}
    </div>
  );
}
