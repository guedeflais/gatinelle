"use client";

import { useState } from "react";

interface StandOption {
  id: string;
  businessName: string;
}

export function StandBalanceExportForm({ stands }: { stands: StandOption[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set(stands.map((s) => s.id)));

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const href = `/api/admin/stands/export?ids=${Array.from(selected).join(",")}`;

  return (
    <div className="flex flex-col gap-3 rounded border border-neutral-200 p-4">
      <p className="text-sm font-medium text-neutral-700">
        Bilan à exporter — décochez pour ne garder que les stands d&apos;un organisateur
      </p>
      <div className="flex flex-col gap-1">
        {stands.map((s) => (
          <label key={s.id} className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={selected.has(s.id)} onChange={() => toggle(s.id)} />
            {s.businessName}
          </label>
        ))}
      </div>
      {selected.size > 0 ? (
        <a
          href={href}
          className="self-start rounded bg-brand-700 px-4 py-2 text-sm text-white hover:bg-brand-800"
        >
          Exporter le bilan ({selected.size} stand{selected.size > 1 ? "s" : ""})
        </a>
      ) : (
        <span className="self-start rounded bg-neutral-300 px-4 py-2 text-sm text-white">
          Sélectionnez au moins un stand
        </span>
      )}
    </div>
  );
}
