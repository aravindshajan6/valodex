/** Thin scrolling data ticker: "ACT V // PATCH 13.04 // 29 AGENTS ...". Pure CSS marquee, server-rendered. */
export function Ticker({ items }: { items: string[] }) {
  const row = items.flatMap((it, i) => [
    <span key={`t${i}`} className="text-bone-2">
      {it}
    </span>,
    <span key={`s${i}`} className="text-red" aria-hidden>
      {"//"}
    </span>,
  ]);
  return (
    <div className="relative overflow-hidden border-y border-line bg-ink-2/60 py-3 font-mono text-[11px] uppercase tracking-[0.28em]" aria-label={items.join(", ")}>
      <style>{`@keyframes vm-ticker{from{transform:translateX(0)}to{transform:translateX(-50%)}}`}</style>
      <div className="flex w-max gap-8 whitespace-nowrap will-change-transform" style={{ animation: "vm-ticker 48s linear infinite" }}>
        <div className="flex gap-8" aria-hidden={false}>
          {row}
        </div>
        <div className="flex gap-8" aria-hidden>
          {row}
        </div>
      </div>
      <div className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-ink to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-ink to-transparent" />
    </div>
  );
}
