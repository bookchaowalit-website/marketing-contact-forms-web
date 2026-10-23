"use client";

import { useCallback, useSyncExternalStore } from "react";

// State mirrored to localStorage through useSyncExternalStore: the server render and the first client render use
// `initial` (no hydration mismatch), then the stored value is read. `parse` must return null for missing or invalid
// data and should be a stable module-level function. Copied per repository (no shared package).

const listeners = new Set<() => void>();
const cache = new Map<string, { raw: string | null; value: unknown }>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

function readRaw(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function useStoredState<T>(key: string, initial: T, parse: (raw: string | null) => T | null) {
  const getSnapshot = useCallback(() => {
    const raw = readRaw(key);
    const hit = cache.get(key);
    if (hit && hit.raw === raw) return hit.value as T;
    const value = parse(raw) ?? initial;
    cache.set(key, { raw, value });
    return value;
  }, [key, initial, parse]);

  const value = useSyncExternalStore(subscribe, getSnapshot, () => initial);

  const setValue = useCallback(
    (next: T | ((current: T) => T)) => {
      const resolved = typeof next === "function" ? (next as (current: T) => T)(getSnapshot()) : next;
      const raw = JSON.stringify(resolved);
      try {
        window.localStorage.setItem(key, raw);
        cache.set(key, { raw, value: resolved });
      } catch {
        // Storage blocked or full: keep the value in memory for this page view.
        cache.set(key, { raw: readRaw(key), value: resolved });
      }
      for (const listener of listeners) listener();
    },
    [key, getSnapshot],
  );

  return [value, setValue] as const;
}
