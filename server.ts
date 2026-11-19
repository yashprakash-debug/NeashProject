import 'dotenv/config';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import express from 'express';
import { GoogleGenAI, Type } from '@google/genai';
import type {
  ActivityLogItem,
  AuditTrailEntry,
  ClaimCategory,
  CollaboratorRole,
  ConfidenceLevel,
  ConflictStatus,
  ExtractedClaim,
  NeashAppState,
  Project,
  ReconciliationConflict,
  ReviewStatus,
  RoleSignOff,
  SourceFile,
  TaskProgressStatus,
} from './src/types/neash.ts';
import { verifyCitationAgainstSources } from './src/utils/citationVerifier.ts';
import { reconcileProjectKnowledge } from './src/utils/reconciler.ts';

const PORT = Number(process.env.PORT) || 3000;
const DATA_DIR = path.resolve(process.cwd(), '.neash-data');
const WORKSPACES_FILE = path.join(DATA_DIR, 'workspaces.json');
const MAX_SOURCE_CHARS = 55000;

interface StoredWorkspaceRecord {
  workspaceId: string;
  updatedAt: string;
  state: NeashAppState;
}

type WorkspaceStoreMap = Record<string, StoredWorkspaceRecord>;

let writeChain: Promise<void> = Promise.resolve();
let memoryStore: WorkspaceStoreMap | null = null;

async function ensureStoreLoaded(): Promise<WorkspaceStoreMap> {
  if (memoryStore) return memoryStore;
  await fsp.mkdir(DATA_DIR, { recursive: true });
  try {
    const raw = await fsp.readFile(WORKSPACES_FILE, 'utf8');
    const parsed = JSON.parse(raw) as WorkspaceStoreMap;
    memoryStore = parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    memoryStore = {};
  }
  return memoryStore;
}

async function persistStore(store: WorkspaceStoreMap): Promise<void> {
  memoryStore = store;
  writeChain = writeChain.then(async () => {
    await fsp.mkdir(DATA_DIR, { recursive: true });
    const tmpFile = `${WORKSPACES_FILE}.${process.pid}.${Date.now()}.tmp`;
    await fsp.writeFile(tmpFile, JSON.stringify(store, null, 2), 'utf8');
    await fsp.rename(tmpFile, WORKSPACES_FILE);
  });
  await writeChain;
}

function createGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    const err = new Error(
      'GEMINI_API_KEY is not configured on the server. Add GEMINI_API_KEY in Settings > Secrets (or .env) to run live AI extraction.'
    );
    (err as Error & { statusCode?: number }).statusCode = 503;
    throw err;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

async function withRetry<T>(fn: () => Promise<T>, maxRetries = 2): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      const msg = err instanceof Error ? err.message : String(err);
      const isTransient = /429|503|RESOURCE_EXHAUSTED|UNAVAILABLE|temporarily/i.test(msg);
      if (!isTransient || attempt === maxRetries) {
        throw err;
      }
      await new Promise((resolve) => setTimeout(resolve, 750 * (attempt + 1)));
    }
  }
  throw lastErr;
}

function slugifyId(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 32);
}

const VALID_CATEGORIES: Set<ClaimCategory> = new Set([
  'Decision',
  'Task',
  'Blocker',
  'Risk',
  'Milestone',
  'Knowledge Gap',
  'Next Action',
]);

const VALID_CONFIDENCE: Set<ConfidenceLevel> = new Set(['High', 'Medium', 'Low']);
const VALID_TASK_STATUSES: Set<TaskProgressStatus> = new Set([
  'Completed',
  'In Progress',
  'Pending',
  'Blocked',
]);

function normalizeCategory(raw: unknown): ClaimCategory {
  if (typeof raw === 'string' && VALID_CATEGORIES.has(raw as ClaimCategory)) {
    return raw as ClaimCategory;
  }
  return 'Task';
}

function normalizeConfidence(raw: unknown): ConfidenceLevel {
  if (typeof raw === 'string' && VALID_CONFIDENCE.has(raw as ConfidenceLevel)) {
    return raw as ConfidenceLevel;
  }
  return 'Medium';
}

function normalizeTaskStatus(raw: unknown): TaskProgressStatus | undefined {
  if (typeof raw === 'string' && VALID_TASK_STATUSES.has(raw as TaskProgressStatus)) {
    return raw as TaskProgressStatus;
  }
  return undefined;
}

function createDefaultSignOffs(): Record<CollaboratorRole, RoleSignOff> {
  return {
    'Outgoing Owner': {
      role: 'Outgoing Owner',
      signedOff: false,
      actorName: null,
      signedAt: null,
      note: null,
    },
    Reviewer: {
      role: 'Reviewer',
      signedOff: false,
      actorName: null,
      signedAt: null,
      note: null,
    },
    'Incoming Engineer': {
      role: 'Incoming Engineer',
      signedOff: false,
      actorName: null,
      signedAt: null,
      note: null,
    },
  };
}

function pushActivity(
  state: NeashAppState,
  item: Omit<ActivityLogItem, 'id' | 'timestamp' | 'read'>
): ActivityLogItem[] {
  return [
    {
      ...item,
      id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date().toISOString(),
      read: false,
    },
    ...(state.activities ?? []).slice(0, 49),
  ];
}

function pushAudit(
  state: NeashAppState,
  entry: Omit<AuditTrailEntry, 'id' | 'timestamp'>
): AuditTrailEntry[] {
  return [
    {
      ...entry,
      id: `aud-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date().toISOString(),
    },
    ...(state.auditTrail ?? []).slice(0, 149),
  ];
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '10mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({
      ok: true,
      geminiConfigured: Boolean(process.env.GEMINI_API_KEY?.trim()),
      timestamp: new Date().toISOString(),
    });
  });

  // =========================================================================
  // 1. SERVER-SIDE AI EXTRACTION WITH PROGRAMMATIC CITATION VERIFICATION
  // =========================================================================
  app.post('/api/extract', async (req, res) => {
    try {
      const { projectId, projectName, sources } = req.body as {
        projectId?: string;
        projectName?: string;
        sources?: SourceFile[];
      };

      if (!projectId || !Array.isArray(sources) || sources.length === 0) {
        return res.status(400).json({
          error: 'Missing projectId or sources array for extraction.',
        });
      }

      const analyzableSources = sources.filter(
        (s) =>
          s &&
          typeof s.content === 'string' &&
          s.content.trim().length > 0 &&
          s.status !== 'Unsupported' &&
          s.status !== 'Error'
      );

      if (analyzableSources.length === 0) {
        return res.status(400).json({
          error: 'No readable text content found in the provided sources.',
        });
      }

      const ai = createGeminiClient();

      const sourceBlock = analyzableSources
        .map((src) => {
          const truncated =
            src.content.length > MAX_SOURCE_CHARS
              ? `${src.content.slice(0, MAX_SOURCE_CHARS)}\n[TRUNCATED AT ${MAX_SOURCE_CHARS} CHARS]`
              : src.content;
          return `=== SOURCE FILE: ${src.name} (Format: ${src.format}, ID: ${src.id}) ===\n${truncated}\n=== END FILE: ${src.name} ===`;
        })
        .join('\n\n');

      const prompt = `Project: ${projectName || projectId}

Analyze the source documents below and extract structured handover claims across these categories:
- Decision
- Task
- Blocker
- Risk
- Milestone
- Knowledge Gap
- Next Action

CRITICAL GROUNDING RULES:
1. Every claim MUST include an exact, contiguous verbatim substring copied character-for-character from one of the source documents in "evidenceExcerpt".
2. Do NOT paraphrase, summarize, or alter punctuation inside "evidenceExcerpt".
3. Set "sourceFilename" to the exact filename from the "=== SOURCE FILE: ... ===" header.
4. Set "sourceLocation" to the section, page, line number, CSV row, or message ID where the quote appears.
5. Extract between 3 and 18 high-signal, non-duplicate claims covering all important decisions, pending/blocked tasks, risks, knowledge gaps, milestones, and incoming first-day actions.
6. Only include "date" (YYYY-MM-DD), "owner", "priority", or "taskStatus" if explicitly supported by the document.

DOCUMENTS:
${sourceBlock}`;

      const response = await withRetry(() =>
        ai.models.generateContent({
          model: 'gemini-4-hydrogen',
          contents: prompt,
          config: {
            systemInstruction:
              'You are an engineering handover analyst. Return strictly grounded JSON claims backed by exact verbatim quotes from the provided project artifacts. Never invent facts, owners, dates, or quotes.',
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  category: {
                    type: Type.STRING,
                    description:
                      'One of: Decision, Task, Blocker, Risk, Milestone, Knowledge Gap, Next Action',
                  },
                  title: {
                    type: Type.STRING,
                    description: 'Concise 5-12 word summary title.',
                  },
                  description: {
                    type: Type.STRING,
                    description: '1-2 sentence factual explanation grounded in the source.',
                  },
                  sourceFilename: {
                    type: Type.STRING,
                    description: 'Exact filename of the source document.',
                  },
                  sourceLocation: {
                    type: Type.STRING,
                    description: 'Page, section, row, line, or message ID.',
                  },
                  evidenceExcerpt: {
                    type: Type.STRING,
                    description: 'Exact verbatim substring copied from the source document.',
                  },
                  confidence: {
                    type: Type.STRING,
                    description: 'High, Medium, or Low',
                  },
                  date: {
                    type: Type.STRING,
                    description: 'Optional YYYY-MM-DD date explicitly found in the source.',
                  },
                  owner: {
                    type: Type.STRING,
                    description: 'Optional owner or assignee explicitly named in the source.',
                  },
                  priority: {
                    type: Type.STRING,
                    description: 'Optional priority (High, Medium, Low).',
                  },
                  taskStatus: {
                    type: Type.STRING,
                    description: 'Optional task status: Completed, In Progress, Pending, or Blocked.',
                  },
                },
                required: [
                  'category',
                  'title',
                  'description',
                  'sourceFilename',
                  'sourceLocation',
                  'evidenceExcerpt',
                  'confidence',
                ],
              },
            },
          },
        })
      );

      const rawText = (response.text ?? '[]').trim();
      let parsedItems: Array<Record<string, unknown>> = [];
      try {
        const parsed = JSON.parse(rawText) as unknown;
        if (Array.isArray(parsed)) {
          parsedItems = parsed.filter(
            (item): item is Record<string, unknown> =>
              typeof item === 'object' && item !== null
          );
        }
      } catch {
        return res.status(502).json({
          error: 'Gemini returned malformed JSON during claim extraction. Please retry.',
        });
      }

      // Programmatic Citation Verification on every extracted claim
      const claims: ExtractedClaim[] = [];
      const seenFingerprints = new Set<string>();

      parsedItems.forEach((raw, idx) => {
        const title =
          typeof raw.title === 'string' && raw.title.trim()
            ? raw.title.trim()
            : `Extracted Item #${idx + 1}`;
        const description =
          typeof raw.description === 'string' && raw.description.trim()
            ? raw.description.trim()
            : title;
        const proposedExcerpt =
          typeof raw.evidenceExcerpt === 'string' ? raw.evidenceExcerpt.trim() : '';
        const claimedFile =
          typeof raw.sourceFilename === 'string' ? raw.sourceFilename.trim() : '';

        const verification = verifyCitationAgainstSources(
          proposedExcerpt,
          claimedFile,
          analyzableSources
        );

        const matchedSource = analyzableSources.find(
          (s) => s.id === verification.matchedSourceId
        );

        const fingerprint = `${verification.matchedSourceId || verification.matchedSourceFilename}:${slugifyId(title)}`;
        if (seenFingerprints.has(fingerprint)) return;
        seenFingerprints.add(fingerprint);

        const deterministicId = `claim-ai-${projectId}-${crypto
          .createHash('sha1')
          .update(`${verification.matchedSourceFilename}:${title}:${verification.verbatimExcerpt.slice(0, 60)}`)
          .digest('hex')
          .slice(0, 10)}`;

        const rawDate =
          typeof raw.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(raw.date.trim())
            ? raw.date.trim()
            : undefined;

        const category = normalizeCategory(raw.category);
        const confidence: ConfidenceLevel = verification.verified
          ? normalizeConfidence(raw.confidence)
          : 'Low';

        claims.push({
          id: deterministicId,
          projectId,
          category,
          originalTitle: title,
          originalDescription: description,
          editedTitle: null,
          editedDescription: null,
          sourceFilename: verification.matchedSourceFilename,
          sourceId: verification.matchedSourceId,
          sourceLocation:
            typeof raw.sourceLocation === 'string' && raw.sourceLocation.trim()
              ? raw.sourceLocation.trim()
              : 'Document Excerpt',
          evidenceExcerpt: verification.verbatimExcerpt,
          citationVerified: verification.verified,
          citationMatchType: verification.matchType,
          unverifiedQuote: verification.verified ? null : proposedExcerpt || null,
          confidence,
          reviewStatus: 'Pending Review',
          reviewedBy: null,
          reviewedByRole: null,
          reviewedAt: null,
          reviewerNote: null,
          date: rawDate,
          owner:
            typeof raw.owner === 'string' && raw.owner.trim()
              ? raw.owner.trim()
              : undefined,
          priority:
            typeof raw.priority === 'string' && raw.priority.trim()
              ? raw.priority.trim()
              : undefined,
          taskStatus: normalizeTaskStatus(raw.taskStatus),
          origin: matchedSource?.origin === 'demo' ? 'demo' : 'uploaded',
          extractedByModel: 'gemini-4-hydrogen',
        });
      });

      const verifiedQuotesCount = claims.filter((c) => c.citationVerified).length;
      const unverifiedQuotesCount = claims.length - verifiedQuotesCount;

      return res.json({
        claims,
        meta: {
          model: 'gemini-4-hydrogen',
          totalExtracted: claims.length,
          verifiedCitations: verifiedQuotesCount,
          unverifiedCitations: unverifiedQuotesCount,
          sourcesAnalyzed: analyzableSources.map((s) => s.name),
        },
      });
    } catch (err) {
      const statusCode =
        (err as Error & { statusCode?: number }).statusCode || 500;
      const message =
        err instanceof Error ? err.message : 'Server-side AI extraction failed.';
      console.error('[/api/extract error]', err);
      return res.status(statusCode).json({ error: message });
    }
  });

  // =========================================================================
  // 2. CROSS-SOURCE CONTRADICTION & STALENESS RECONCILIATION ENGINE
  // =========================================================================
  app.post('/api/reconcile', async (req, res) => {
    try {
      const {
        project,
        sources,
        claims,
        existingConflicts = [],
        includeSemanticAi = false,
      } = req.body as {
        project?: Project;
        sources?: SourceFile[];
        claims?: ExtractedClaim[];
        existingConflicts?: ReconciliationConflict[];
        includeSemanticAi?: boolean;
      };

      if (!project || !Array.isArray(sources)) {
        return res.status(400).json({
          error: 'Missing project or sources array for reconciliation.',
        });
      }

      const deterministicConflicts = reconcileProjectKnowledge(
        project,
        sources,
        Array.isArray(claims) ? claims : [],
        existingConflicts
      );

      let aiSemanticChecked = false;
      const semanticConflicts: ReconciliationConflict[] = [];
      const readableSources = sources.filter(
        (s) =>
          s.projectId === project.id &&
          typeof s.content === 'string' &&
          s.content.trim().length > 0 &&
          s.status !== 'Unsupported' &&
          s.status !== 'Error'
      );

      if (
        includeSemanticAi &&
        process.env.GEMINI_API_KEY?.trim() &&
        readableSources.length >= 2
      ) {
        try {
          const ai = createGeminiClient();
          const sourceBlock = readableSources
            .map((s) => {
              const snippet =
                s.content.length > 20000
                  ? `${s.content.slice(0, 20000)}\n[TRUNCATED]`
                  : s.content;
              return `=== FILE: ${s.name} ===\n${snippet}\n=== END ${s.name} ===`;
            })
            .join('\n\n');

          const aiRes = await withRetry(() =>
            ai.models.generateContent({
              model: 'gemini-4-hydrogen',
              contents: `Compare these project handover documents for cross-document contradictions, conflicting numeric limits/decisions, stale dates, or undocumented ownership.\nReturn only genuine conflicts supported by exact verbatim quotes from the files.\n\n${sourceBlock}`,
              config: {
                responseMimeType: 'application/json',
                responseSchema: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      type: {
                        type: Type.STRING,
                        description:
                          'One of: Contradiction, Status Mismatch, Stale Fact, Passed Deadline, Undocumented Owner',
                      },
                      severity: {
                        type: Type.STRING,
                        description: 'Critical, Warning, or Info',
                      },
                      title: { type: Type.STRING },
                      summary: { type: Type.STRING },
                      sourceAFilename: { type: Type.STRING },
                      sourceALocation: { type: Type.STRING },
                      excerptA: { type: Type.STRING },
                      sourceBFilename: { type: Type.STRING },
                      sourceBLocation: { type: Type.STRING },
                      excerptB: { type: Type.STRING },
                    },
                    required: [
                      'type',
                      'severity',
                      'title',
                      'summary',
                      'sourceAFilename',
                      'excerptA',
                    ],
                  },
                },
              },
            })
          );

          aiSemanticChecked = true;
          const parsed = JSON.parse((aiRes.text ?? '[]').trim()) as unknown;
          if (Array.isArray(parsed)) {
            const prevById = new Map(existingConflicts.map((c) => [c.id, c]));
            for (const item of parsed) {
              if (typeof item !== 'object' || item === null) continue;
              const rec = item as Record<string, unknown>;
              const verA = verifyCitationAgainstSources(
                String(rec.excerptA ?? ''),
                String(rec.sourceAFilename ?? ''),
                readableSources
              );
              if (!verA.verified) continue;

              const hasB =
                typeof rec.excerptB === 'string' && rec.excerptB.trim().length > 0;
              const verB = hasB
                ? verifyCitationAgainstSources(
                    String(rec.excerptB ?? ''),
                    String(rec.sourceBFilename ?? ''),
                    readableSources
                  )
                : null;
              if (hasB && verB && !verB.verified) continue;

              const title = String(rec.title ?? '').trim();
              if (!title) continue;

              // Skip if deterministic engine already covered identical excerpt pair
              const alreadyCovered = deterministicConflicts.some(
                (dc) =>
                  dc.excerptA === verA.verbatimExcerpt ||
                  (verB && dc.excerptB === verB.verbatimExcerpt)
              );
              if (alreadyCovered) continue;

              const id = `conf-ai-${project.id}-${crypto
                .createHash('sha1')
                .update(`${verA.matchedSourceFilename}:${title}`)
                .digest('hex')
                .slice(0, 8)}`;

              const prev = prevById.get(id);
              const rawType = String(rec.type ?? 'Contradiction');
              const validTypes = new Set([
                'Contradiction',
                'Status Mismatch',
                'Stale Fact',
                'Passed Deadline',
                'Undocumented Owner',
              ]);
              const rawSev = String(rec.severity ?? 'Warning');
              const validSev = new Set(['Critical', 'Warning', 'Info']);

              semanticConflicts.push({
                id,
                projectId: project.id,
                type: (validTypes.has(rawType)
                  ? rawType
                  : 'Contradiction') as ReconciliationConflict['type'],
                severity: (validSev.has(rawSev)
                  ? rawSev
                  : 'Warning') as ReconciliationConflict['severity'],
                status: prev?.status ?? 'Open',
                title,
                summary: String(rec.summary ?? title),
                sourceAFilename: verA.matchedSourceFilename,
                sourceALocation: String(rec.sourceALocation ?? 'Document Excerpt'),
                excerptA: verA.verbatimExcerpt,
                sourceBFilename: verB ? verB.matchedSourceFilename : null,
                sourceBLocation: verB
                  ? String(rec.sourceBLocation ?? 'Document Excerpt')
                  : null,
                excerptB: verB ? verB.verbatimExcerpt : null,
                detectedAt: prev?.detectedAt ?? new Date().toISOString(),
                resolvedBy: prev?.resolvedBy ?? null,
                resolvedByRole: prev?.resolvedByRole ?? null,
                resolvedAt: prev?.resolvedAt ?? null,
                resolutionNote: prev?.resolutionNote ?? null,
              });
            }
          }
        } catch (aiErr) {
          console.warn('[/api/reconcile semantic pass skipped]', aiErr);
        }
      }

      const combined = [...deterministicConflicts, ...semanticConflicts];
      return res.json({
        conflicts: combined,
        aiSemanticChecked,
      });
    } catch (err) {
      console.error('[/api/reconcile error]', err);
      return res.status(500).json({
        error: err instanceof Error ? err.message : 'Reconciliation failed.',
      });
    }
  });

  // =========================================================================
  // 3. PERSISTENT MULTI-USER WORKSPACES, SHARED LINKS & SIGN-OFF AUDIT TRAIL
  // =========================================================================
  app.post('/api/workspaces', async (req, res) => {
    try {
      const {
        state,
        actorName = 'Demo User',
        actorRole = 'Outgoing Owner',
        workspaceId: requestedId,
      } = req.body as {
        state?: NeashAppState;
        actorName?: string;
        actorRole?: CollaboratorRole;
        workspaceId?: string;
      };

      if (!state || !Array.isArray(state.projects)) {
        return res.status(400).json({ error: 'Invalid workspace state payload.' });
      }

      const store = await ensureStoreLoaded();
      const workspaceId =
        requestedId && /^[a-zA-Z0-9_-]{4,40}$/.test(requestedId)
          ? requestedId
          : `ws-${crypto.randomBytes(4).toString('hex')}`;
      const now = new Date().toISOString();

      const nextState: NeashAppState = {
        ...state,
        workspaceId,
        workspaceUpdatedAt: now,
        auditTrail: pushAudit(state, {
          projectId: state.activeProjectId || state.projects[0]?.id || 'workspace',
          actorName,
          actorRole,
          action: 'WORKSPACE_SHARED',
          targetId: workspaceId,
          targetLabel: `Workspace ${workspaceId}`,
          detail: `${actorName} (${actorRole}) published shared handover workspace link.`,
        }),
        activities: pushActivity(state, {
          projectId: state.activeProjectId || state.projects[0]?.id || 'workspace',
          title: 'Shared Cloud Workspace Created',
          detail: `Workspace ${workspaceId} saved for multi-user review and role sign-off.`,
          type: 'signoff',
        }),
      };

      const record: StoredWorkspaceRecord = {
        workspaceId,
        updatedAt: now,
        state: nextState,
      };
      store[workspaceId] = record;
      await persistStore(store);

      return res.status(201).json({ workspace: record });
    } catch (err) {
      console.error('[POST /api/workspaces error]', err);
      return res.status(500).json({ error: 'Failed to create shared workspace.' });
    }
  });

  app.get('/api/workspaces/:workspaceId', async (req, res) => {
    try {
      const { workspaceId } = req.params;
      const store = await ensureStoreLoaded();
      const record = store[workspaceId];
      if (!record) {
        return res.status(404).json({
          error: `Shared workspace "${workspaceId}" was not found.`,
        });
      }
      return res.json({ workspace: record });
    } catch (err) {
      console.error('[GET /api/workspaces/:id error]', err);
      return res.status(500).json({ error: 'Failed to load shared workspace.' });
    }
  });

  app.put('/api/workspaces/:workspaceId', async (req, res) => {
    try {
      const { workspaceId } = req.params;
      const { state } = req.body as { state?: NeashAppState };
      if (!state || !Array.isArray(state.projects)) {
        return res.status(400).json({ error: 'Invalid workspace state payload.' });
      }
      const store = await ensureStoreLoaded();
      const now = new Date().toISOString();
      const nextState: NeashAppState = {
        ...state,
        workspaceId,
        workspaceUpdatedAt: now,
      };
      const record: StoredWorkspaceRecord = {
        workspaceId,
        updatedAt: now,
        state: nextState,
      };
      store[workspaceId] = record;
      await persistStore(store);
      return res.json({ workspace: record });
    } catch (err) {
      console.error('[PUT /api/workspaces/:id error]', err);
      return res.status(500).json({ error: 'Failed to sync workspace state.' });
    }
  });

  // Atomic collaborative event mutations so concurrent reviewers never overwrite each other
  app.post('/api/workspaces/:workspaceId/events', async (req, res) => {
    try {
      const { workspaceId } = req.params;
      const store = await ensureStoreLoaded();
      const record = store[workspaceId];
      if (!record) {
        return res.status(404).json({
          error: `Shared workspace "${workspaceId}" was not found.`,
        });
      }

      const body = req.body as {
        eventType:
          | 'CLAIM_REVIEW'
          | 'CLAIM_EDIT'
          | 'CONFLICT_UPDATE'
          | 'ROLE_SIGNOFF'
          | 'SOURCES_AND_CLAIMS_UPDATE'
          | 'REPORT_GENERATED';
        actorName?: string;
        actorRole?: CollaboratorRole;
        payload?: Record<string, unknown>;
      };

      const actorName = body.actorName?.trim() || 'Collaborator';
      const actorRole: CollaboratorRole = body.actorRole || 'Reviewer';
      const payload = body.payload || {};
      const now = new Date().toISOString();
      let nextState = { ...record.state };

      if (body.eventType === 'CLAIM_REVIEW') {
        const claimId = String(payload.claimId ?? '');
        const reviewStatus = payload.reviewStatus as ReviewStatus;
        const target = nextState.claims.find((c) => c.id === claimId);
        if (!target) {
          return res.status(404).json({ error: 'Target claim not found.' });
        }
        nextState = {
          ...nextState,
          claims: nextState.claims.map((c) =>
            c.id === claimId
              ? {
                  ...c,
                  reviewStatus,
                  reviewedBy: reviewStatus === 'Pending Review' ? null : actorName,
                  reviewedByRole: reviewStatus === 'Pending Review' ? null : actorRole,
                  reviewedAt: reviewStatus === 'Pending Review' ? null : now,
                }
              : c
          ),
          auditTrail: pushAudit(nextState, {
            projectId: target.projectId,
            actorName,
            actorRole,
            action:
              reviewStatus === 'Verified'
                ? 'CLAIM_VERIFIED'
                : reviewStatus === 'Rejected'
                ? 'CLAIM_REJECTED'
                : 'CLAIM_REOPENED',
            targetId: claimId,
            targetLabel: target.editedTitle ?? target.originalTitle,
            detail: `${actorName} (${actorRole}) set claim status to ${reviewStatus}.`,
          }),
          activities: pushActivity(nextState, {
            projectId: target.projectId,
            title: `Claim ${reviewStatus} by ${actorName}`,
            detail: `${target.editedTitle ?? target.originalTitle} (${actorRole})`,
            type: 'verification',
          }),
        };
      } else if (body.eventType === 'CLAIM_EDIT') {
        const claimId = String(payload.claimId ?? '');
        const editedTitle = String(payload.editedTitle ?? '');
        const editedDescription = String(payload.editedDescription ?? '');
        const reviewerNote = String(payload.reviewerNote ?? '');
        const markVerified = Boolean(payload.markVerified);
        const target = nextState.claims.find((c) => c.id === claimId);
        if (!target) {
          return res.status(404).json({ error: 'Target claim not found.' });
        }
        nextState = {
          ...nextState,
          claims: nextState.claims.map((c) =>
            c.id === claimId
              ? {
                  ...c,
                  editedTitle,
                  editedDescription,
                  reviewerNote: reviewerNote || c.reviewerNote,
                  reviewStatus: markVerified ? 'Verified' : c.reviewStatus,
                  reviewedBy: markVerified ? actorName : c.reviewedBy,
                  reviewedByRole: markVerified ? actorRole : c.reviewedByRole,
                  reviewedAt: markVerified ? now : c.reviewedAt,
                }
              : c
          ),
          auditTrail: pushAudit(nextState, {
            projectId: target.projectId,
            actorName,
            actorRole,
            action: 'CLAIM_EDITED',
            targetId: claimId,
            targetLabel: editedTitle,
            detail: `${actorName} (${actorRole}) ${
              markVerified ? 'edited and verified' : 'edited'
            } claim text${reviewerNote ? ` — Note: ${reviewerNote}` : ''}.`,
          }),
          activities: pushActivity(nextState, {
            projectId: target.projectId,
            title: markVerified
              ? `Claim Edited & Verified by ${actorName}`
              : `Claim Edited by ${actorName}`,
            detail: editedTitle,
            type: 'verification',
          }),
        };
      } else if (body.eventType === 'CONFLICT_UPDATE') {
        const conflictId = String(payload.conflictId ?? '');
        const status = payload.status as ConflictStatus;
        const resolutionNote =
          typeof payload.resolutionNote === 'string'
            ? payload.resolutionNote.trim()
            : '';
        const target = (nextState.conflicts ?? []).find((c) => c.id === conflictId);
        if (!target) {
          return res.status(404).json({ error: 'Conflict item not found.' });
        }
        nextState = {
          ...nextState,
          conflicts: (nextState.conflicts ?? []).map((c) =>
            c.id === conflictId
              ? {
                  ...c,
                  status,
                  resolvedBy: status === 'Open' ? null : actorName,
                  resolvedByRole: status === 'Open' ? null : actorRole,
                  resolvedAt: status === 'Open' ? null : now,
                  resolutionNote:
                    status === 'Open' ? null : resolutionNote || c.resolutionNote || null,
                }
              : c
          ),
          auditTrail: pushAudit(nextState, {
            projectId: target.projectId,
            actorName,
            actorRole,
            action:
              status === 'Resolved'
                ? 'CONFLICT_RESOLVED'
                : status === 'Dismissed'
                ? 'CONFLICT_DISMISSED'
                : 'CONFLICT_REOPENED',
            targetId: conflictId,
            targetLabel: target.title,
            detail: `${actorName} (${actorRole}) marked ${target.type} as ${status}${
              resolutionNote ? `: ${resolutionNote}` : '.'
            }`,
          }),
          activities: pushActivity(nextState, {
            projectId: target.projectId,
            title: `Conflict ${status} by ${actorName}`,
            detail: target.title,
            type: 'conflict',
          }),
        };
      } else if (body.eventType === 'ROLE_SIGNOFF') {
        const projectId = String(payload.projectId ?? '');
        const role = (payload.role as CollaboratorRole) || actorRole;
        const signedOff = Boolean(payload.signedOff);
        const note =
          typeof payload.note === 'string' && payload.note.trim()
            ? payload.note.trim()
            : null;
        const existingSignOffs = nextState.signOffs ?? {};
        const projSignOffs =
          existingSignOffs[projectId] ?? createDefaultSignOffs();

        nextState = {
          ...nextState,
          signOffs: {
            ...existingSignOffs,
            [projectId]: {
              ...projSignOffs,
              [role]: {
                role,
                signedOff,
                actorName: signedOff ? actorName : null,
                signedAt: signedOff ? now : null,
                note: signedOff ? note : null,
              },
            },
          },
          auditTrail: pushAudit(nextState, {
            projectId,
            actorName,
            actorRole,
            action: signedOff ? 'ROLE_SIGNED_OFF' : 'SIGNOFF_REVOKED',
            targetId: `${projectId}-${role}`,
            targetLabel: `${role} Handover Sign-Off`,
            detail: signedOff
              ? `${actorName} signed off as ${role}${note ? ` — "${note}"` : '.'}`
              : `${actorName} revoked ${role} sign-off.`,
          }),
          activities: pushActivity(nextState, {
            projectId,
            title: signedOff
              ? `${role} Signed Off Handover`
              : `${role} Sign-Off Revoked`,
            detail: `${actorName} updated ${role} sign-off status.`,
            type: 'signoff',
          }),
        };
      } else if (body.eventType === 'REPORT_GENERATED' && payload.report) {
        const report = payload.report as NeashAppState['reports'][string];
        nextState = {
          ...nextState,
          reports: {
            ...nextState.reports,
            [report.projectId]: report,
          },
        };
      } else if (body.eventType === 'SOURCES_AND_CLAIMS_UPDATE') {
        if (Array.isArray(payload.projects)) {
          nextState.projects = payload.projects as Project[];
        }
        if (Array.isArray(payload.sources)) {
          nextState.sources = payload.sources as SourceFile[];
        }
        if (Array.isArray(payload.claims)) {
          nextState.claims = payload.claims as ExtractedClaim[];
        }
        if (Array.isArray(payload.conflicts)) {
          nextState.conflicts = payload.conflicts as ReconciliationConflict[];
        }
        if (payload.auditEntry) {
          const entry = payload.auditEntry as Omit<AuditTrailEntry, 'id' | 'timestamp'>;
          nextState.auditTrail = pushAudit(nextState, entry);
        }
      }

      nextState.workspaceId = workspaceId;
      nextState.workspaceUpdatedAt = now;

      const updatedRecord: StoredWorkspaceRecord = {
        workspaceId,
        updatedAt: now,
        state: nextState,
      };
      store[workspaceId] = updatedRecord;
      await persistStore(store);

      return res.json({ workspace: updatedRecord });
    } catch (err) {
      console.error('[POST /api/workspaces/:id/events error]', err);
      return res.status(500).json({ error: 'Failed to apply collaborative update.' });
    }
  });

  // =========================================================================
  // VITE MIDDLEWARE (DEV) OR STATIC BUILD (PROD)
  // =========================================================================
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'custom',
    });
    app.use(vite.middlewares);

    app.use(async (req, res, next) => {
      if (req.originalUrl.startsWith('/api')) return next();
      try {
        const htmlPath = path.resolve(process.cwd(), 'index.html');
        let template = fs.readFileSync(htmlPath, 'utf-8');
        template = await vite.transformIndexHtml(req.originalUrl, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e) {
        vite.ssrFixStacktrace(e as Error);
        next(e);
      }
    });
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.use((_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`NEASH server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start NEASH server:', err);
  process.exit(1);
});
