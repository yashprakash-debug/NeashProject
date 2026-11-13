import { createInitialDemoState } from '../data/demoData';
import { NeashAppState } from '../types/neash';

const STORAGE_KEY = 'neash_continuity_workspace_v1';

export function loadWorkspaceState(): NeashAppState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const initial = createInitialDemoState();
      saveWorkspaceState(initial);
      return initial;
    }
    const parsed = JSON.parse(raw) as NeashAppState;
    if (!parsed || !Array.isArray(parsed.projects) || parsed.projects.length === 0) {
      const initial = createInitialDemoState();
      saveWorkspaceState(initial);
      return initial;
    }
    return parsed;
  } catch {
    return createInitialDemoState();
  }
}

export function saveWorkspaceState(state: NeashAppState): void {
  try {
    // Avoid bloating LocalStorage with huge raw uploaded text if > 1.5MB total
    const serialized = JSON.stringify(state);
    window.localStorage.setItem(STORAGE_KEY, serialized);
  } catch {
    // Fallback: trim large uploaded source contents while preserving metadata & claims
    try {
      const trimmed: NeashAppState = {
        ...state,
        sources: state.sources.map((s) =>
          s.origin === 'uploaded' && s.content.length > 50000
            ? {
                ...s,
                content: s.content.slice(0, 50000) + '\n[Truncated in LocalStorage]',
                pages: undefined,
              }
            : s
        ),
      };
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
    } catch {
      // Ignore storage quota errors cleanly
    }
  }
}

export function resetWorkspaceStorage(): NeashAppState {
  const fresh = createInitialDemoState();
  saveWorkspaceState(fresh);
  return fresh;
}

export function getLocalStorageBytes(): number {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? new Blob([raw]).size : 0;
  } catch {
    return 0;
  }
}
