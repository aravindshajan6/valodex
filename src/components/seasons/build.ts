import { t } from "@/lib/i18n";
import type { EventRow, SeasonRow } from "@/lib/queries/meta";

export type Status = "past" | "current" | "future";

export type ActSegment = {
  uuid: string;
  name: string;
  /** Roman numeral only, e.g. "V" */
  short: string;
  title: string | null;
  startLabel: string;
  endLabel: string;
  days: number;
  status: Status;
  /** Share of the parent episode's duration, 0–100 */
  widthPct: number;
  /** Only for the current act */
  progressPct: number | null;
};

export type EventMarker = {
  uuid: string;
  name: string;
  short: string;
  startLabel: string;
  endLabel: string;
  leftPct: number;
  status: Status;
};

export type EpisodeRow = {
  uuid: string;
  name: string;
  title: string | null;
  startLabel: string;
  endLabel: string;
  days: number;
  status: Status;
  acts: ActSegment[];
  events: EventMarker[];
};

export type LiveAct = {
  name: string;
  episode: string;
  title: string | null;
  startLabel: string;
  endLabel: string;
  totalDays: number;
  daysElapsed: number;
  daysRemaining: number;
  elapsedPct: number;
};

const DAY = 86_400_000;
const fmt = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
const label = (d: Date) => fmt.format(d);
const days = (a: Date, b: Date) => Math.max(1, Math.round((b.getTime() - a.getTime()) / DAY));
const statusOf = (start: Date, end: Date, now: Date): Status => (now < start ? "future" : now >= end ? "past" : "current");
const roman = (name: string) => name.replace(/^ACT\s+/i, "").trim() || name;

/** Group acts under their parent episode and derive every number the timeline renders. */
export function buildTimeline(rows: SeasonRow[], eventRows: EventRow[], now: Date): { episodes: EpisodeRow[]; live: LiveAct | null } {
  const episodes = rows.filter((r) => r.type !== "act");
  const acts = rows.filter((r) => r.type === "act");
  const byParent = new Map<string, SeasonRow[]>();
  for (const act of acts) {
    if (!act.parentUuid) continue;
    byParent.set(act.parentUuid, [...(byParent.get(act.parentUuid) ?? []), act]);
  }

  // Episode display names repeat (V25/V26 split into two halves); suffix those with their act range.
  const nameCounts = new Map<string, number>();
  for (const ep of episodes) {
    const n = t(ep.displayName);
    nameCounts.set(n, (nameCounts.get(n) ?? 0) + 1);
  }

  let live: LiveAct | null = null;

  const built: EpisodeRow[] = episodes.map((ep) => {
    const children = (byParent.get(ep.uuid) ?? []).sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
    const source = children.length ? children : [ep]; // Closed Beta has no acts → treat it as one segment
    const epStart = ep.startTime;
    const epEnd = ep.endTime;
    const span = Math.max(1, epEnd.getTime() - epStart.getTime());
    const baseName = t(ep.displayName);
    const duplicate = (nameCounts.get(baseName) ?? 0) > 1 && children.length > 0;
    const name = duplicate ? `${baseName} · Acts ${roman(t(children[0].displayName))}–${roman(t(children[children.length - 1].displayName))}` : baseName;
    const epTitle = ep.title ? t(ep.title) || null : null;

    const segments: ActSegment[] = source.map((act) => {
      const status = statusOf(act.startTime, act.endTime, now);
      const total = act.endTime.getTime() - act.startTime.getTime();
      const progressPct = status === "current" ? Math.min(100, Math.max(0, ((now.getTime() - act.startTime.getTime()) / total) * 100)) : null;
      const actName = t(act.displayName);
      const actTitle = act.title ? t(act.title) || null : null;
      if (status === "current" && act.type === "act") {
        const totalDays = days(act.startTime, act.endTime);
        const daysElapsed = Math.min(totalDays, Math.floor((now.getTime() - act.startTime.getTime()) / DAY));
        live = {
          name: actName,
          episode: baseName,
          title: actTitle,
          startLabel: label(act.startTime),
          endLabel: label(act.endTime),
          totalDays,
          daysElapsed,
          daysRemaining: Math.max(0, Math.ceil((act.endTime.getTime() - now.getTime()) / DAY)),
          elapsedPct: Math.round(progressPct ?? 0),
        };
      }
      return {
        uuid: act.uuid,
        name: actName,
        short: roman(actName),
        title: actTitle,
        startLabel: label(act.startTime),
        endLabel: label(act.endTime),
        days: days(act.startTime, act.endTime),
        status,
        widthPct: (total / span) * 100,
        progressPct,
      };
    });

    const markers: EventMarker[] = eventRows
      .filter((ev) => ev.startTime >= epStart && ev.startTime < epEnd)
      .filter((ev) => !/_DisplayName$/i.test(t(ev.displayName))) // unlocalised placeholder rows from the API
      .map((ev) => ({
        uuid: ev.uuid,
        name: t(ev.displayName),
        short: t(ev.shortDisplayName) || t(ev.displayName),
        startLabel: label(ev.startTime),
        endLabel: label(ev.endTime),
        leftPct: ((ev.startTime.getTime() - epStart.getTime()) / span) * 100,
        status: statusOf(ev.startTime, ev.endTime, now),
      }));

    return {
      uuid: ep.uuid,
      name,
      title: epTitle,
      startLabel: label(epStart),
      endLabel: label(epEnd),
      days: days(epStart, epEnd),
      status: statusOf(epStart, epEnd, now),
      acts: segments,
      events: markers,
    };
  });

  // Newest first: what's live sits at the top.
  built.sort((a, b) => {
    const ea = episodes.find((e) => e.uuid === a.uuid)!;
    const eb = episodes.find((e) => e.uuid === b.uuid)!;
    return eb.startTime.getTime() - ea.startTime.getTime();
  });

  return { episodes: built, live };
}
