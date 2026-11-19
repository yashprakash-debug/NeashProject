import type {
  CollaboratorRole,
  ConflictStatus,
  ExtractedClaim,
  NeashAppState,
  Project,
  ReconciliationConflict,
  ReviewStatus,
  SourceFile,
} from '../types/neash';

export interface ExtractApiResponse {
  claims: ExtractedClaim[];
  meta: {
    model: string;
    totalExtracted: number;
    verifiedCitations: number;
    unverifiedCitations: number;
    sourcesAnalyzed: string[];
  };
}

export interface ReconcileApiResponse {
  conflicts: ReconciliationConflict[];
  aiSemanticChecked: boolean;
}

export interface StoredWorkspaceResponse {
  workspace: {
    workspaceId: string;
    updatedAt: string;
    state: NeashAppState;
  };
}

async function parseJsonOrThrow<T>(res: Response): Promise<T> {
  const text = await res.text();
  let data: Record<string, unknown> = {};
  try {
    data = text ? (JSON.parse(text) as Record<string, unknown>) : {};
  } catch {
    throw new Error(`Unexpected server response (${res.status}).`);
  }
  if (!res.ok) {
    const errMsg =
      typeof data.error === 'string' && data.error.trim()
        ? data.error
        : `Request failed with status ${res.status}.`;
    throw new Error(errMsg);
  }
  return data as unknown as T;
}

export async function runServerAiExtraction(
  projectId: string,
  projectName: string,
  sources: SourceFile[]
): Promise<ExtractApiResponse> {
  const res = await fetch('/api/extract', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ projectId, projectName, sources }),
  });
  return parseJsonOrThrow<ExtractApiResponse>(res);
}

export async function runCrossSourceReconciliation(
  project: Project,
  sources: SourceFile[],
  claims: ExtractedClaim[],
  existingConflicts: ReconciliationConflict[],
  includeSemanticAi = false
): Promise<ReconcileApiResponse> {
  const res = await fetch('/api/reconcile', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      project,
      sources,
      claims,
      existingConflicts,
      includeSemanticAi,
    }),
  });
  return parseJsonOrThrow<ReconcileApiResponse>(res);
}

export async function createSharedWorkspace(
  state: NeashAppState,
  actorName: string,
  actorRole: CollaboratorRole
): Promise<StoredWorkspaceResponse['workspace']> {
  const res = await fetch('/api/workspaces', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ state, actorName, actorRole }),
  });
  const data = await parseJsonOrThrow<StoredWorkspaceResponse>(res);
  return data.workspace;
}

export async function fetchSharedWorkspace(
  workspaceId: string
): Promise<StoredWorkspaceResponse['workspace']> {
  const res = await fetch(`/api/workspaces/${encodeURIComponent(workspaceId)}`);
  const data = await parseJsonOrThrow<StoredWorkspaceResponse>(res);
  return data.workspace;
}

export async function pushWorkspaceEvent(
  workspaceId: string,
  eventType:
    | 'CLAIM_REVIEW'
    | 'CLAIM_EDIT'
    | 'CONFLICT_UPDATE'
    | 'ROLE_SIGNOFF'
    | 'SOURCES_AND_CLAIMS_UPDATE'
    | 'REPORT_GENERATED',
  actorName: string,
  actorRole: CollaboratorRole,
  payload: Record<string, unknown>
): Promise<StoredWorkspaceResponse['workspace']> {
  const res = await fetch(
    `/api/workspaces/${encodeURIComponent(workspaceId)}/events`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventType, actorName, actorRole, payload }),
    }
  );
  const data = await parseJsonOrThrow<StoredWorkspaceResponse>(res);
  return data.workspace;
}

export async function syncWorkspaceFullState(
  workspaceId: string,
  state: NeashAppState
): Promise<StoredWorkspaceResponse['workspace']> {
  const res = await fetch(`/api/workspaces/${encodeURIComponent(workspaceId)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ state }),
  });
  const data = await parseJsonOrThrow<StoredWorkspaceResponse>(res);
  return data.workspace;
}

export type { ConflictStatus, ReviewStatus };
