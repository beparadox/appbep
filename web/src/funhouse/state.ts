import { useSyncExternalStore } from 'react';

/**
 * Funhouse state: is sound on, and which rooms has this visitor found?
 * Saved in localStorage (per browser) so the floor plan survives a reload;
 * if storage is blocked, it just lasts for the visit.
 */
interface State {
  sound: boolean;
  found: string[];
}

const KEY = 'appbep-funhouse';
let state: State = load();
const listeners = new Set<() => void>();

function load(): State {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { sound: false, found: [], ...(JSON.parse(raw) as Partial<State>) };
  } catch {
    /* storage unavailable */
  }
  return { sound: false, found: [] };
}

function set(next: Partial<State>): void {
  state = { ...state, ...next };
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* storage unavailable */
  }
  listeners.forEach((l) => l());
}

export function useFunhouse(): State {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => state,
  );
}

export const setSound = (sound: boolean) => set({ sound });

export function markFound(room: string): void {
  if (!state.found.includes(room)) set({ found: [...state.found, room] });
}

export const forgetEverything = () => set({ found: [] });
