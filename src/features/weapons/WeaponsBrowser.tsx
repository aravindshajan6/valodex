"use client";

import { useState } from "react";
import { BuyMenuGrid } from "./BuyMenuGrid";
import { CompareTable } from "./CompareTable";
import { Segmented } from "./Segmented";
import type { WeaponSummary } from "./types";

type View = "grid" | "table";

/** Buy-menu grid with a client-side toggle to the sortable compare table. */
export function WeaponsBrowser({ weapons }: { weapons: WeaponSummary[] }) {
  const [view, setView] = useState<View>("grid");
  return (
    <div>
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-mute">
          {view === "grid" ? "Laid out like the in-game buy menu" : "Click a column to sort"}
        </p>
        <Segmented<View>
          label="View"
          value={view}
          onChange={setView}
          options={[
            { value: "grid", label: "Buy menu" },
            { value: "table", label: "Compare" },
          ]}
        />
      </div>
      {view === "grid" ? <BuyMenuGrid weapons={weapons} /> : <CompareTable weapons={weapons} />}
    </div>
  );
}
