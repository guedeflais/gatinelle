"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ActionButton({
  url,
  body,
  label,
  confirmMessage,
  className,
}: {
  url: string;
  body: Record<string, unknown>;
  label: string;
  confirmMessage?: string;
  className?: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    if (confirmMessage && !window.confirm(confirmMessage)) return;
    setLoading(true);
    setError(null);
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(typeof data.error === "string" ? data.error : "Une erreur est survenue.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="inline-flex flex-col items-start gap-1">
      <button
        onClick={handleClick}
        disabled={loading}
        className={
          className ??
          "rounded bg-brand-700 px-3 py-1 text-sm text-white hover:bg-brand-800 disabled:opacity-50"
        }
      >
        {loading ? "..." : label}
      </button>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
