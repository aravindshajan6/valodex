"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * Favourites live in `localStorage` — there are no accounts, and the request
 * path is read-only. The store is exposed through `useSyncExternalStore` so the
 * server (and the hydration pass) always sees an empty list; `hydrated` tells a
 * component when the real value has arrived, so it can avoid flashing an empty
 * state that isn't really empty.
 */

export type FavouriteKind = "agents" | "weapons" | "skins";
export type Favourites = Record<FavouriteKind, string[]>;

export const FAVOURITE_KINDS: FavouriteKind[] = ["agents", "weapons", "skins"];
const KEY = "valodex:favourites";
const EMPTY: Favourites = { agents: [], weapons: [], skins: [] };

let cache: Favourites | null = null;
const listeners = new Set<() => void>();

function parse(raw: string | null): Favourites {
  if (!raw) return EMPTY;
  try {
    const data = JSON.parse(raw) as Partial<Record<FavouriteKind, unknown>>;
    const list = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);
    return { agents: list(data.agents), weapons: list(data.weapons), skins: list(data.skins) };
  } catch {
    return EMPTY;
  }
}

function read(): Favourites {
  if (cache) return cache;
  try {
    cache = parse(window.localStorage.getItem(KEY));
  } catch {
    cache = EMPTY;
  }
  return cache;
}

function write(next: Favourites) {
  cache = next;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* private mode / quota — keep the in-memory copy for this tab */
  }
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  // Another tab changed the list: drop the cache so the next read re-parses.
  const onStorage = (e: StorageEvent) => {
    if (e.key === null || e.key === KEY) {
      cache = null;
      cb();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", onStorage);
  };
}

const noop = () => () => {};
const serverEmpty = () => EMPTY;

export function countFavourites(f: Favourites): number {
  return f.agents.length + f.weapons.length + f.skins.length;
}

/** True once the client has taken over from server HTML (same trick as `useWebGL`). */
export function useHydrated(): boolean {
  return useSyncExternalStore(noop, () => true, () => false);
}

/** Cheap per-item subscription for the ★ button: re-renders only when this item flips. */
export function useIsFavourite(kind: FavouriteKind, id: string): boolean {
  return useSyncExternalStore(
    subscribe,
    () => read()[kind].includes(id),
    () => false,
  );
}

export function useFavourites() {
  const favourites = useSyncExternalStore(subscribe, read, serverEmpty);
  const hydrated = useHydrated();

  const toggle = useCallback((kind: FavouriteKind, id: string) => {
    const cur = read();
    const on = cur[kind].includes(id);
    write({ ...cur, [kind]: on ? cur[kind].filter((x) => x !== id) : [...cur[kind], id] });
    return !on;
  }, []);

  const remove = useCallback((kind: FavouriteKind, ids: string[]) => {
    const cur = read();
    const drop = new Set(ids);
    write({ ...cur, [kind]: cur[kind].filter((x) => !drop.has(x)) });
  }, []);

  /** Union another list into ours (used to "save" a shared link). Returns how many were new. */
  const merge = useCallback((incoming: Favourites) => {
    const cur = read();
    let added = 0;
    const next = { ...cur };
    for (const kind of FAVOURITE_KINDS) {
      const seen = new Set(cur[kind]);
      const fresh = incoming[kind].filter((id) => !seen.has(id));
      added += fresh.length;
      next[kind] = [...cur[kind], ...fresh];
    }
    if (added) write(next);
    return added;
  }, []);

  const clear = useCallback(() => write(EMPTY), []);

  return { favourites, hydrated, count: countFavourites(favourites), toggle, remove, merge, clear };
}
