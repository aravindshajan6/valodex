"use client";

import { animate, stagger } from "animejs";
import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { type DamageRange, type HitLocation, HIT_LOCATIONS, rangeBreakpoints } from "@/lib/ttk";
import { HIT_COLORS, HIT_LABELS } from "./hitColors";
import { useReducedMotion } from "./useReducedMotion";

const H = 320;
const M = { top: 26, right: 78, bottom: 42, left: 48 };
const SURFACE = "#1b2836";

function niceMax(v: number): number {
  const step = v > 400 ? 100 : v > 120 ? 50 : v > 40 ? 20 : 10;
  return Math.max(step, Math.ceil((v * 1.08) / step) * step);
}
function fmtDmg(v: number): string {
  return Number.isInteger(v) ? String(v) : v.toFixed(2).replace(/\.?0+$/, "");
}
function useWidth(ref: React.RefObject<HTMLDivElement | null>, fallback = 760) {
  const [w, setW] = useState(fallback);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(340, Math.floor(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return w;
}

/**
 * Head/body/leg damage versus distance as stepped lines, one step per damage
 * bracket. Lines draw in with anime.js; hovering (or focusing) a bracket shows
 * its numbers. A table twin sits underneath for keyboard/print/CVD readers.
 */
export function DamageFalloffChart({ ranges, pellets = 1, weaponName }: { ranges: DamageRange[]; pellets?: number; weaponName: string }) {
  const reduced = useReducedMotion();
  const host = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const W = useWidth(host);
  const [active, setActive] = useState<number | null>(null);

  const chart = useMemo(() => {
    const sorted = [...ranges].sort((a, b) => a.rangeStartMeters - b.rangeStartMeters);
    const xMax = Math.max(50, ...sorted.map((r) => r.rangeEndMeters));
    const maxDmg = Math.max(1, ...sorted.flatMap((r) => [r.headDamage, r.bodyDamage, r.legDamage])) * pellets;
    const yMax = niceMax(maxDmg);
    const PW = W - M.left - M.right;
    const PH = H - M.top - M.bottom;
    const x = (m: number) => M.left + (m / xMax) * PW;
    const y = (d: number) => M.top + PH - (d / yMax) * PH;
    const value = (r: DamageRange, k: HitLocation) => (k === "head" ? r.headDamage : k === "body" ? r.bodyDamage : r.legDamage) * pellets;

    const series = HIT_LOCATIONS.map((key) => {
      const d = sorted.map((r, i) => `${i === 0 ? "M" : "L"}${x(r.rangeStartMeters).toFixed(1)},${y(value(r, key)).toFixed(1)} L${x(r.rangeEndMeters).toFixed(1)},${y(value(r, key)).toFixed(1)}`).join(" ");
      const last = sorted[sorted.length - 1];
      return { key, d, endX: x(last.rangeEndMeters), endY: y(value(last, key)), endValue: value(last, key) };
    });

    // Direct end-labels only where they don't collide (head is always placed first).
    const placed: number[] = [];
    const labels = series.map((s) => {
      const ok = placed.every((py) => Math.abs(py - s.endY) >= 14);
      if (ok) placed.push(s.endY);
      return ok;
    });

    const yStep = yMax / 5;
    const yTicks = Array.from({ length: 6 }, (_, i) => Math.round(i * yStep));
    const bps = rangeBreakpoints(sorted);
    const bands = sorted.map((r, i) => ({ i, r, x0: x(r.rangeStartMeters), x1: x(r.rangeEndMeters), head: value(r, "head"), body: value(r, "body"), leg: value(r, "leg") }));
    const refs = [100, 150].filter((v) => v < yMax).map((v) => ({ v, y: y(v), label: v === 100 ? "100 HP" : "150 HP · heavy" }));
    return { xMax, yMax, x, y, series, labels, yTicks, bps, bands, refs, PW, PH };
  }, [ranges, pellets, W]);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const paths = Array.from(svg.querySelectorAll<SVGPathElement>("path[data-series]"));
    const tags = Array.from(svg.querySelectorAll<SVGGElement>("[data-endlabel]"));
    const show = () => {
      paths.forEach((p) => {
        p.style.strokeDasharray = "none";
        p.style.strokeDashoffset = "0";
        p.style.opacity = "1";
      });
      tags.forEach((g) => (g.style.opacity = "1"));
    };
    if (reduced) {
      show();
      return;
    }
    let played = false;
    let anims: Array<{ cancel: () => void }> = [];
    const play = () => {
      if (played) return;
      played = true;
      paths.forEach((p) => {
        const len = p.getTotalLength();
        p.style.strokeDasharray = `${len}`;
        p.style.strokeDashoffset = `${len}`;
        p.style.opacity = "1";
      });
      anims = [
        animate(paths, { strokeDashoffset: 0, duration: 1500, delay: stagger(160), ease: "outQuart" }),
        animate(tags, { opacity: [0, 1], translateX: [-8, 0], duration: 500, delay: stagger(80, { start: 1300 }), ease: "outExpo" }),
      ];
    };
    const io = new IntersectionObserver((es) => es.some((e) => e.isIntersecting) && (play(), io.disconnect()), { threshold: 0.3 });
    io.observe(svg);
    return () => {
      io.disconnect();
      anims.forEach((a) => a.cancel());
    };
  }, [reduced, chart]);

  const band = active != null ? chart.bands[active] : null;

  return (
    <div ref={host} className="relative">
      <div className="mb-3 flex flex-wrap items-center gap-x-5 gap-y-2" aria-hidden>
        {HIT_LOCATIONS.map((k) => (
          <span key={k} className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-bone-2">
            <span className="h-0.5 w-5" style={{ background: HIT_COLORS[k] }} />
            {HIT_LABELS[k]}
          </span>
        ))}
        {pellets > 1 && <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-mute">× {pellets} pellets</span>}
      </div>

      <svg
        ref={svgRef}
        width={W}
        height={H}
        viewBox={`0 0 ${W} ${H}`}
        className="block max-w-full select-none"
        role="img"
        aria-label={`${weaponName} damage falloff chart; the table below lists the same values.`}
        onMouseLeave={() => setActive(null)}
      >
        {/* Bracket bands (hover targets) */}
        {chart.bands.map((b) => (
          <rect
            key={b.i}
            x={b.x0}
            y={M.top}
            width={Math.max(0, b.x1 - b.x0)}
            height={chart.PH}
            fill={active === b.i ? "#ece8e1" : "transparent"}
            fillOpacity={active === b.i ? 0.05 : 0}
            tabIndex={0}
            role="button"
            aria-label={`${b.r.rangeStartMeters} to ${b.r.rangeEndMeters} metres: head ${fmtDmg(b.head)}, body ${fmtDmg(b.body)}, legs ${fmtDmg(b.leg)}`}
            onMouseEnter={() => setActive(b.i)}
            onFocus={() => setActive(b.i)}
            onBlur={() => setActive(null)}
            className="outline-none"
          />
        ))}
        {/* Grid */}
        {chart.yTicks.map((v) => (
          <g key={v}>
            <line x1={M.left} x2={W - M.right} y1={chart.y(v)} y2={chart.y(v)} stroke="#263544" strokeWidth={1} />
            <text x={M.left - 8} y={chart.y(v) + 3} textAnchor="end" fontSize={10} fill="#768079" fontFamily="var(--font-mono)">
              {v}
            </text>
          </g>
        ))}
        {chart.bps.map((m) => (
          <g key={m}>
            <line x1={chart.x(m)} x2={chart.x(m)} y1={M.top} y2={H - M.bottom} stroke="#263544" strokeWidth={1} />
            <text x={chart.x(m)} y={H - M.bottom + 16} textAnchor="middle" fontSize={10} fill="#768079" fontFamily="var(--font-mono)">
              {m}m
            </text>
          </g>
        ))}
        <text x={W - M.right} y={H - 6} textAnchor="end" fontSize={9} fill="#768079" fontFamily="var(--font-mono)" letterSpacing="0.2em">
          DISTANCE
        </text>
        {/* HP reference lines */}
        {chart.refs.map((r) => (
          <g key={r.v}>
            <line x1={M.left} x2={W - M.right} y1={r.y} y2={r.y} stroke="#ece8e1" strokeOpacity={0.28} strokeWidth={1} />
            <text x={M.left + 4} y={r.y - 4} fontSize={9} fill="#b9b4ab" fontFamily="var(--font-mono)" letterSpacing="0.15em">
              {r.label}
            </text>
          </g>
        ))}
        {/* Series */}
        {chart.series.map((s, i) => (
          <g key={s.key}>
            <path data-series={s.key} d={s.d} fill="none" stroke={HIT_COLORS[s.key]} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" style={{ opacity: 0 }} />
            <circle cx={s.endX} cy={s.endY} r={4} fill={HIT_COLORS[s.key]} stroke={SURFACE} strokeWidth={2} />
            {chart.labels[i] && (
              <g data-endlabel style={{ opacity: 0 }}>
                <text x={s.endX + 10} y={s.endY + 3.5} fontSize={11} fill="#ece8e1" fontFamily="var(--font-mono)">
                  {fmtDmg(s.endValue)}
                </text>
                <text x={s.endX + 10} y={s.endY + 15} fontSize={8} fill="#768079" fontFamily="var(--font-mono)" letterSpacing="0.15em">
                  {HIT_LABELS[s.key].toUpperCase()}
                </text>
              </g>
            )}
          </g>
        ))}
        {/* Active markers */}
        {band &&
          HIT_LOCATIONS.map((k) => (
            <circle key={k} cx={(band.x0 + band.x1) / 2} cy={chart.y(band[k])} r={4} fill={HIT_COLORS[k]} stroke={SURFACE} strokeWidth={2} />
          ))}
      </svg>

      {/* Tooltip */}
      {band && (
        <div
          role="status"
          className="chamfer-sm pointer-events-none absolute top-8 z-10 min-w-[150px] -translate-x-1/2 border border-line bg-ink-2/95 px-3 py-2 backdrop-blur"
          style={{ left: `${(((band.x0 + band.x1) / 2) / W) * 100}%` }}
        >
          <div className="mb-1 font-mono text-[10px] uppercase tracking-[0.2em] text-mute">
            {band.r.rangeStartMeters}–{band.r.rangeEndMeters} m
          </div>
          {HIT_LOCATIONS.map((k) => (
            <div key={k} className="flex items-center justify-between gap-4 font-mono text-xs">
              <span className="inline-flex items-center gap-2 text-bone-2">
                <span className="h-2 w-2" style={{ background: HIT_COLORS[k] }} />
                {HIT_LABELS[k]}
              </span>
              <span className="tabular-nums text-bone">{fmtDmg(band[k])}</span>
            </div>
          ))}
        </div>
      )}

      <details className="mt-4 group">
        <summary className="cursor-pointer font-mono text-[10px] uppercase tracking-[0.25em] text-mute outline-none hover:text-bone focus-visible:text-holo">
          Data table
        </summary>
        <table className="mt-3 w-full text-sm">
          <thead>
            <tr className="border-b border-line font-mono text-[10px] uppercase tracking-[0.2em] text-mute">
              <th scope="col" className="py-2 text-left font-normal">Range</th>
              {HIT_LOCATIONS.map((k) => (
                <th key={k} scope="col" className="py-2 text-right font-normal">{HIT_LABELS[k]}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {chart.bands.map((b) => (
              <tr key={b.i} className={cn("border-b border-line/60", active === b.i && "bg-ink-2")}>
                <td className="py-2 font-mono tabular-nums text-bone-2">{b.r.rangeStartMeters}–{b.r.rangeEndMeters} m</td>
                {HIT_LOCATIONS.map((k) => (
                  <td key={k} className="py-2 text-right font-mono tabular-nums text-bone">{fmtDmg(b[k])}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}
