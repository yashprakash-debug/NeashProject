import {
  createDefaultProjectSignOffs,
  createInitialDemoState,
} from '../data/demoData';
import type { CollaboratorProfile, NeashAppState } from '../types/neash';
import { reconcileProjectKnowledge } from './reconciler';

const STORAGE_KEY = 'neash_continuity_workspace_v2';
const COLLABORATOR_KEY = 'neash_collaborator_profile_v1';

function hydrateMissingRound3Fields(state: NeashAppState): NeashAppState {
  const initialConflicts =
    Array.isArray(state.conflicts) && state.conflicts.length > 0
      ? state.conflicts
      : state.projects.flatMap((proj) =>
          reconcileProjectKnowledge(
            proj,
            state.sources,
            state.claims,
            []
          )
        );

  const signOffs = { ...(state.signOffs ?? {}) };
  for (const proj of state.projects) {
    if (!signOffs[proj.id]) {
      signOffs[proj.id] = createDefaultProjectSignOffs();
    }
  }

  return {
    ...state,
    conflicts: initialConflicts,
    signOffs,
    auditTrail: Array.isArray(state.auditTrail) ? state.auditTrail : [],
    claims: state.claims.map((c) => ({
      ...c,
      citationVerified: c.citationVerified ?? true,
      citationMatchType: c.citationMatchType ?? 'exact',
    })),
  };
}

export function loadWorkspaceState(): NeashAppState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const initial = hydrateMissingRound3Fields(createInitialDemoState());
      saveWorkspaceState(initial);
      return initial;
    }
    const parsed = JSON.parse(raw) as NeashAppState;
    if (!parsed || !Array.isArray(parsed.projects) || parsed.projects.length === 0) {
      const initial = hydrateMissingRound3Fields(createInitialDemoState());
      saveWorkspaceState(initial);
      return initial;
    }
    return hydrateMissingRound3Fields(parsed);
  } catch {
    return hydrateMissingRound3Fields(createInitialDemoState());
  }
}

export function saveWorkspaceState(state: NeashAppState): void {
  try {
    const serialized = JSON.stringify(state);
    window.localStorage.setItem(STORAGE_KEY, serialized);
  } catch {
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
  const fresh = hydrateMissingRound3Fields(createInitialDemoState());
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

export function loadCollaboratorProfile(): CollaboratorProfile {
  try {
    const raw = window.localStorage.getItem(COLLABORATOR_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as CollaboratorProfile;
      if (parsed?.name && parsed?.role) return parsed;
    }
  } catch {
    // Fallback below
  }
  return { name: 'Priya Nair', role: 'Reviewer' };
}

export function saveCollaboratorProfile(profile: CollaboratorProfile): void {
  try {
    window.localStorage.setItem(COLLABORATOR_KEY, JSON.stringify(profile));
  } catch {
    // Ignore cleanly
  }
}
