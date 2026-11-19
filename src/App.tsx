import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { EvidenceDrawer } from './components/EvidenceDrawer';
import { FirstDayPage } from './components/FirstDayPage';
import { HandoverReportsPage } from './components/HandoverReportsPage';
import { KnowledgeHubPage } from './components/KnowledgeHubPage';
import { OverviewPage } from './components/OverviewPage';
import { ProjectsPage } from './components/ProjectsPage';
import { SettingsPage } from './components/SettingsPage';
import { Sidebar } from './components/Sidebar';
import { SourcesPage, type ExtractionRunSummary } from './components/SourcesPage';
import { TimelinePage } from './components/TimelinePage';
import { TopBar } from './components/TopBar';
import { VerificationCenterPage } from './components/VerificationCenterPage';
import {
  createDefaultProjectSignOffs,
  createEcommerceDemoClaims,
  DEMO_PROJECTS,
  DEMO_SOURCES,
} from './data/demoData';
import type {
  ActivityLogItem,
  AuditTrailEntry,
  CollaboratorProfile,
  CollaboratorRole,
  ConflictStatus,
  ExtractedClaim,
  HandoverReportSnapshot,
  JudgeChecklistProgress,
  NavRoute,
  NeashAppState,
  ReconciliationConflict,
  RoleSignOff,
  SourceFile,
} from './types/neash';
import {
  createSharedWorkspace,
  fetchSharedWorkspace,
  pushWorkspaceEvent,
  runCrossSourceReconciliation,
  runServerAiExtraction,
} from './utils/apiClient';
import { reconcileProjectKnowledge } from './utils/reconciler';
import {
  loadCollaboratorProfile,
  loadWorkspaceState,
  resetWorkspaceStorage,
  saveCollaboratorProfile,
  saveWorkspaceState,
} from './utils/storage';

const DEFAULT_JUDGE_CHECKLIST: JudgeChecklistProgress = {
  stepProject: false,
  stepSource: false,
  stepExtraction: false,
  stepEvidence: false,
  stepVerification: false,
  stepReport: false,
  guideCollapsed: false,
};

function getUrlWorkspaceId(): string | null {
  try {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('workspace')?.trim();
    return id && /^[a-zA-Z0-9_-]{4,40}$/.test(id) ? id : null;
  } catch {
    return null;
  }
}

function setUrlWorkspaceId(workspaceId: string | null) {
  try {
    const url = new URL(window.location.href);
    if (workspaceId) {
      url.searchParams.set('workspace', workspaceId);
    } else {
      url.searchParams.delete('workspace');
    }
    window.history.replaceState({}, '', url.toString());
  } catch {
    // Ignore history restrictions cleanly
  }
}

export default function App() {
  const [state, setState] = useState<NeashAppState>(() => loadWorkspaceState());
  const [collaborator, setCollaborator] = useState<CollaboratorProfile>(() =>
    loadCollaboratorProfile()
  );
  const [activeRoute, setActiveRoute] = useState<NavRoute>('overview');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');
  const [inspectedClaimId, setInspectedClaimId] = useState<string | null>(null);
  const [isSyncingWorkspace, setIsSyncingWorkspace] = useState(false);
  const [workspaceNotice, setWorkspaceNotice] = useState<string | null>(null);

  const isMutatingRef = useRef(false);

  // Persist local workspace cache & collaborator identity
  useEffect(() => {
    saveWorkspaceState(state);
  }, [state]);

  const handleUpdateCollaborator = (profile: CollaboratorProfile) => {
    setCollaborator(profile);
    saveCollaboratorProfile(profile);
  };

  // Load shared workspace from ?workspace= on startup if present
  useEffect(() => {
    const urlWsId = getUrlWorkspaceId();
    if (!urlWsId) return;

    let cancelled = false;
    setIsSyncingWorkspace(true);
    fetchSharedWorkspace(urlWsId)
      .then((ws) => {
        if (cancelled) return;
        setState((prev) => ({
          ...ws.state,
          activeProjectId:
            ws.state.activeProjectId || prev.activeProjectId,
          workspaceId: ws.workspaceId,
          workspaceUpdatedAt: ws.updatedAt,
        }));
      })
      .catch((err) => {
        if (cancelled) return;
        setWorkspaceNotice(
          err instanceof Error
            ? `${err.message} Loaded local workspace instead.`
            : 'Unable to load shared workspace link.'
        );
        setUrlWorkspaceId(null);
      })
      .finally(() => {
        if (!cancelled) setIsSyncingWorkspace(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Poll shared workspace asynchronously every 4 seconds when active
  const syncWorkspaceNow = useCallback(async () => {
    const wsId = state.workspaceId;
    if (!wsId || isMutatingRef.current) return;
    setIsSyncingWorkspace(true);
    try {
      const ws = await fetchSharedWorkspace(wsId);
      setState((prev) => {
        if (
          ws.updatedAt &&
          prev.workspaceUpdatedAt &&
          ws.updatedAt <= prev.workspaceUpdatedAt
        ) {
          return prev;
        }
        return {
          ...ws.state,
          activeProjectId: prev.activeProjectId,
          judgeChecklist: prev.judgeChecklist,
          workspaceId: ws.workspaceId,
          workspaceUpdatedAt: ws.updatedAt,
        };
      });
    } catch {
      // Transient polling errors are ignored quietly
    } finally {
      setIsSyncingWorkspace(false);
    }
  }, [state.workspaceId]);

  useEffect(() => {
    if (!state.workspaceId) return;
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        void syncWorkspaceNow();
      }
    }, 4000);
    return () => window.clearInterval(timer);
  }, [state.workspaceId, syncWorkspaceNow]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (inspectedClaimId) setInspectedClaimId(null);
        else if (mobileMenuOpen) {
          setMobileMenuOpen(false);
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [inspectedClaimId, mobileMenuOpen]);

  const judgeChecklist: JudgeChecklistProgress = useMemo(
    () => ({
      ...DEFAULT_JUDGE_CHECKLIST,
      ...(state.judgeChecklist ?? {}),
    }),
    [state.judgeChecklist]
  );

  const markChecklistStep = (
    patch: Partial<JudgeChecklistProgress>,
    prevChecklist?: JudgeChecklistProgress
  ): JudgeChecklistProgress => ({
    ...DEFAULT_JUDGE_CHECKLIST,
    ...(prevChecklist ?? {}),
    ...patch,
  });

  const activeProject = useMemo(
    () =>
      state.projects.find((p) => p.id === state.activeProjectId) ??
      state.projects[0],
    [state.projects, state.activeProjectId]
  );

  const projectSources = useMemo(
    () =>
      activeProject
        ? state.sources.filter((s) => s.projectId === activeProject.id)
        : [],
    [state.sources, activeProject]
  );

  const projectClaims = useMemo(
    () =>
      activeProject
        ? state.claims.filter((c) => c.projectId === activeProject.id)
        : [],
    [state.claims, activeProject]
  );

  const projectConflicts = useMemo(
    () =>
      activeProject
        ? (state.conflicts ?? []).filter((c) => c.projectId === activeProject.id)
        : [],
    [state.conflicts, activeProject]
  );

  const projectSignOffs: Record<CollaboratorRole, RoleSignOff> = useMemo(() => {
    if (!activeProject) return createDefaultProjectSignOffs();
    return state.signOffs?.[activeProject.id] ?? createDefaultProjectSignOffs();
  }, [state.signOffs, activeProject]);

  const projectAuditTrail = useMemo(
    () =>
      activeProject
        ? (state.auditTrail ?? []).filter((a) => a.projectId === activeProject.id)
        : [],
    [state.auditTrail, activeProject]
  );

  const inspectedClaim = useMemo(
    () => state.claims.find((c) => c.id === inspectedClaimId) ?? null,
    [state.claims, inspectedClaimId]
  );

  const pendingReviewCount = useMemo(
    () => projectClaims.filter((c) => c.reviewStatus === 'Pending Review').length,
    [projectClaims]
  );

  const openConflictCount = useMemo(
    () => projectConflicts.filter((c) => c.status === 'Open').length,
    [projectConflicts]
  );

  const appendActivity = (
    prev: NeashAppState,
    item: Omit<ActivityLogItem, 'id' | 'timestamp' | 'read'>
  ): ActivityLogItem[] => [
    {
      ...item,
      id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date().toISOString(),
      read: false,
    },
    ...prev.activities.slice(0, 49),
  ];

  const appendAudit = (
    prev: NeashAppState,
    entry: Omit<AuditTrailEntry, 'id' | 'timestamp'>
  ): AuditTrailEntry[] => [
    {
      ...entry,
      id: `aud-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date().toISOString(),
    },
    ...(prev.auditTrail ?? []).slice(0, 149),
  ];

  const handleShareWorkspace = async (): Promise<string | null> => {
    if (state.workspaceId) {
      const url = new URL(window.location.href);
      url.searchParams.set('workspace', state.workspaceId);
      return url.toString();
    }

    setIsSyncingWorkspace(true);
    setWorkspaceNotice(null);
    try {
      const ws = await createSharedWorkspace(
        state,
        collaborator.name,
        collaborator.role
      );
      setUrlWorkspaceId(ws.workspaceId);
      setState((prev) => ({
        ...ws.state,
        activeProjectId: prev.activeProjectId,
        judgeChecklist: prev.judgeChecklist,
        workspaceId: ws.workspaceId,
        workspaceUpdatedAt: ws.updatedAt,
      }));
      const url = new URL(window.location.href);
      url.searchParams.set('workspace', ws.workspaceId);
      return url.toString();
    } catch (err) {
      setWorkspaceNotice(
        err instanceof Error ? err.message : 'Failed to publish shared workspace.'
      );
      return null;
    } finally {
      setIsSyncingWorkspace(false);
    }
  };

  const syncEventToServer = async (
    eventType:
      | 'CLAIM_REVIEW'
      | 'CLAIM_EDIT'
      | 'CONFLICT_UPDATE'
      | 'ROLE_SIGNOFF'
      | 'SOURCES_AND_CLAIMS_UPDATE'
      | 'REPORT_GENERATED',
    payload: Record<string, unknown>
  ) => {
    const wsId = state.workspaceId;
    if (!wsId) return;
    isMutatingRef.current = true;
    try {
      const ws = await pushWorkspaceEvent(
        wsId,
        eventType,
        collaborator.name,
        collaborator.role,
        payload
      );
      setState((prev) => ({
        ...ws.state,
        activeProjectId: prev.activeProjectId,
        judgeChecklist: prev.judgeChecklist,
        workspaceId: ws.workspaceId,
        workspaceUpdatedAt: ws.updatedAt,
      }));
    } catch (err) {
      setWorkspaceNotice(
        err instanceof Error ? err.message : 'Cloud sync failed.'
      );
    } finally {
      isMutatingRef.current = false;
    }
  };

  const handleSelectProject = (projectId: string) => {
    setState((prev) => ({
      ...prev,
      activeProjectId: projectId,
      judgeChecklist: markChecklistStep({ stepProject: true }, prev.judgeChecklist),
    }));
  };

  const handleLoadSampleProjectData = () => {
    setState((prev) => {
      const sampleProject = DEMO_PROJECTS[0];
      const hasSampleProject = prev.projects.some(
        (p) => p.id === sampleProject.id
      );
      const sampleSources = DEMO_SOURCES.filter(
        (s) => s.projectId === sampleProject.id
      );

      const nextProjects = hasSampleProject
        ? prev.projects
        : [sampleProject, ...prev.projects];

      const existingSourceIds = new Set(prev.sources.map((s) => s.id));
      const missingSources = sampleSources.filter(
        (s) => !existingSourceIds.has(s.id)
      );

      const hasEcommerceClaims = prev.claims.some(
        (c) => c.projectId === sampleProject.id
      );
      const restoredClaims = hasEcommerceClaims
        ? prev.claims
        : [...prev.claims, ...createEcommerceDemoClaims(true)];

      const nextSources = [...prev.sources, ...missingSources];
      const reconciled = reconcileProjectKnowledge(
        sampleProject,
        nextSources,
        restoredClaims,
        (prev.conflicts ?? []).filter((c) => c.projectId === sampleProject.id)
      );
      const otherConflicts = (prev.conflicts ?? []).filter(
        (c) => c.projectId !== sampleProject.id
      );

      return {
        ...prev,
        projects: nextProjects,
        activeProjectId: sampleProject.id,
        sources: nextSources,
        claims: restoredClaims,
        conflicts: [...otherConflicts, ...reconciled],
        judgeChecklist: markChecklistStep({ stepProject: true }, prev.judgeChecklist),
        activities: appendActivity(prev, {
          projectId: sampleProject.id,
          title: 'Sample Project Loaded (DEMO DATA)',
          detail:
            'Loaded E-commerce Platform with 5 internally consistent demonstration sources.',
          type: 'source',
        }),
      };
    });
    setActiveRoute('sources');
  };

  const handleAddSources = (newSources: SourceFile[]) => {
    if (!activeProject || newSources.length === 0) return;

    const updatedSources = [...newSources, ...state.sources];
    const nextConflictsForProj = reconcileProjectKnowledge(
      activeProject,
      updatedSources,
      state.claims,
      projectConflicts
    );
    const otherConflicts = (state.conflicts ?? []).filter(
      (c) => c.projectId !== activeProject.id
    );
    const allConflicts = [...otherConflicts, ...nextConflictsForProj];

    setState((prev) => ({
      ...prev,
      sources: updatedSources,
      conflicts: allConflicts,
      judgeChecklist: markChecklistStep({ stepSource: true }, prev.judgeChecklist),
      activities: appendActivity(prev, {
        projectId: activeProject.id,
        title: `Added ${newSources.length} Source File${
          newSources.length === 1 ? '' : 's'
        }`,
        detail: newSources.map((s) => s.name).join(', '),
        type: 'source',
      }),
    }));

    void syncEventToServer('SOURCES_AND_CLAIMS_UPDATE', {
      sources: updatedSources,
      conflicts: allConflicts,
    });
  };

  const handleRemoveSource = (sourceId: string) => {
    const target = state.sources.find((s) => s.id === sourceId);
    const updatedSources = state.sources.filter((s) => s.id !== sourceId);
    const targetProj = target
      ? state.projects.find((p) => p.id === target.projectId)
      : undefined;

    const allConflicts = targetProj
      ? [
          ...(state.conflicts ?? []).filter(
            (c) => c.projectId !== targetProj.id
          ),
          ...reconcileProjectKnowledge(
            targetProj,
            updatedSources,
            state.claims,
            (state.conflicts ?? []).filter((c) => c.projectId === targetProj.id)
          ),
        ]
      : state.conflicts ?? [];

    setState((prev) => ({
      ...prev,
      sources: updatedSources,
      conflicts: allConflicts,
      activities: target
        ? appendActivity(prev, {
            projectId: target.projectId,
            title: 'Source Removed',
            detail: `Removed ${target.name} from ingested sources.`,
            type: 'source',
          })
        : prev.activities,
    }));

    void syncEventToServer('SOURCES_AND_CLAIMS_UPDATE', {
      sources: updatedSources,
      conflicts: allConflicts,
    });
  };

  const handleRunIntelligenceExtraction = async (
    onStageChange: (stageIndex: number, label: string) => void
  ): Promise<ExtractionRunSummary> => {
    if (!activeProject) {
      throw new Error('No active project selected.');
    }

    const analyzableSources = projectSources.filter(
      (s) =>
        s.content.trim().length > 0 &&
        s.status !== 'Unsupported' &&
        s.status !== 'Error'
    );

    if (analyzableSources.length === 0) {
      throw new Error(
        'No readable source documents are attached to this project.'
      );
    }

    // Prioritize Ready/unextracted sources (uploaded files or unextracted staged demo projects)
    const unextractedSources = analyzableSources.filter(
      (s) => s.status === 'Ready'
    );
    const targetsToExtract =
      unextractedSources.length > 0 ? unextractedSources : analyzableSources;

    onStageChange(0, 'Preparing readable documents & checking payload limits...');

    let extractedClaims: ExtractedClaim[] = [];
    let verifiedCitations = 0;
    let unverifiedCitations = 0;
    let modelUsed = 'gemini-4-hydrogen';

    // Run real server-side Gemini extraction + programmatic citation verification
    onStageChange(1, 'Extracting structured claims via Express + Gemini 4 Hydrogen...');
    const extractResult = await runServerAiExtraction(
      activeProject.id,
      activeProject.name,
      targetsToExtract
    );

    onStageChange(
      2,
      'Programmatically verifying every quote against source text...'
    );
    extractedClaims = extractResult.claims;
    verifiedCitations = extractResult.meta.verifiedCitations;
    unverifiedCitations = extractResult.meta.unverifiedCitations;
    modelUsed = extractResult.meta.model;

    // Deduplicate against existing claims cleanly (never overwrite human edits or reviews)
    const existingIds = new Set(projectClaims.map((c) => c.id));
    const existingFingerprints = new Set(
      projectClaims.map(
        (c) =>
          `${c.sourceId || c.sourceFilename}:${c.originalTitle.toLowerCase().trim()}`
      )
    );
    const newClaims = extractedClaims.filter((c) => {
      const fp = `${c.sourceId || c.sourceFilename}:${c.originalTitle.toLowerCase().trim()}`;
      return !existingIds.has(c.id) && !existingFingerprints.has(fp);
    });

    const mergedClaims = [...state.claims, ...newClaims];

    onStageChange(
      3,
      'Reconciling cross-source contradictions, deadlines & owners...'
    );
    const reconcileResult = await runCrossSourceReconciliation(
      activeProject,
      analyzableSources,
      mergedClaims.filter((c) => c.projectId === activeProject.id),
      projectConflicts,
      true
    );

    const now = new Date().toISOString();
    const updatedProjects = state.projects.map((p) =>
      p.id === activeProject.id
        ? {
            ...p,
            intelligenceGenerated: true,
            lastExtractedAt: now,
            updatedAt: now,
          }
        : p
    );
    const updatedSources = state.sources.map((s) =>
      s.projectId === activeProject.id &&
      s.status !== 'Unsupported' &&
      s.status !== 'Error'
        ? { ...s, status: 'Processed' as const }
        : s
    );
    const otherConflicts = (state.conflicts ?? []).filter(
      (c) => c.projectId !== activeProject.id
    );
    const allConflicts = [...otherConflicts, ...reconcileResult.conflicts];

    setState((prev) => ({
      ...prev,
      projects: updatedProjects,
      sources: updatedSources,
      claims: mergedClaims,
      conflicts: allConflicts,
      judgeChecklist: markChecklistStep({ stepExtraction: true }, prev.judgeChecklist),
      auditTrail: appendAudit(prev, {
        projectId: activeProject.id,
        actorName: collaborator.name,
        actorRole: collaborator.role,
        action: 'AI_EXTRACTION_RUN',
        targetId: activeProject.id,
        targetLabel: activeProject.name,
        detail: `Server-side ${modelUsed} extracted ${newClaims.length} new claims (${verifiedCitations} citations verified, ${unverifiedCitations} flagged) and ${reconcileResult.conflicts.length} cross-source alerts.`,
      }),
      activities: appendActivity(prev, {
        projectId: activeProject.id,
        title: 'Server AI Intelligence Generated',
        detail: `${newClaims.length} new grounded claims (${verifiedCitations} verified quotes) and ${reconcileResult.conflicts.length} cross-source checks completed.`,
        type: 'extraction',
      }),
    }));

    void syncEventToServer('SOURCES_AND_CLAIMS_UPDATE', {
      projects: updatedProjects,
      sources: updatedSources,
      claims: mergedClaims,
      conflicts: allConflicts,
      auditEntry: {
        projectId: activeProject.id,
        actorName: collaborator.name,
        actorRole: collaborator.role,
        action: 'AI_EXTRACTION_RUN',
        targetId: activeProject.id,
        targetLabel: activeProject.name,
        detail: `Server-side ${modelUsed} extracted ${newClaims.length} new claims (${verifiedCitations} verified quotes).`,
      },
    });

    return {
      extractedCount: newClaims.length,
      verifiedCitations,
      unverifiedCitations,
      conflictsDetected: reconcileResult.conflicts.filter((c) => c.status === 'Open').length,
      modelUsed,
    };
  };

  const handleRunReconciliation = async (includeAi = true) => {
    if (!activeProject) return;
    try {
      const res = await runCrossSourceReconciliation(
        activeProject,
        projectSources,
        projectClaims,
        projectConflicts,
        includeAi
      );
      const otherConflicts = (state.conflicts ?? []).filter(
        (c) => c.projectId !== activeProject.id
      );
      const allConflicts = [...otherConflicts, ...res.conflicts];
      setState((prev) => ({
        ...prev,
        conflicts: allConflicts,
        activities: appendActivity(prev, {
          projectId: activeProject.id,
          title: 'Cross-Source Reconciliation Complete',
          detail: `Evaluated ${projectSources.length} documents: ${res.conflicts.filter((c) => c.status === 'Open').length} open alerts.`,
          type: 'conflict',
        }),
      }));
      void syncEventToServer('SOURCES_AND_CLAIMS_UPDATE', {
        conflicts: allConflicts,
      });
    } catch (err) {
      setWorkspaceNotice(
        err instanceof Error ? err.message : 'Cross-source reconciliation failed.'
      );
    }
  };

  const updateClaimReviewStatus = (
    claimId: string,
    status: ExtractedClaim['reviewStatus'],
    activityTitle: string
  ) => {
    const now = new Date().toISOString();
    setState((prev) => {
      const target = prev.claims.find((c) => c.id === claimId);
      if (!target) return prev;
      return {
        ...prev,
        claims: prev.claims.map((c) =>
          c.id === claimId
            ? {
                ...c,
                reviewStatus: status,
                reviewedBy: status === 'Pending Review' ? null : collaborator.name,
                reviewedByRole:
                  status === 'Pending Review' ? null : collaborator.role,
                reviewedAt: status === 'Pending Review' ? null : now,
              }
            : c
        ),
        judgeChecklist: markChecklistStep({ stepVerification: true }, prev.judgeChecklist),
        auditTrail: appendAudit(prev, {
          projectId: target.projectId,
          actorName: collaborator.name,
          actorRole: collaborator.role,
          action:
            status === 'Verified'
              ? 'CLAIM_VERIFIED'
              : status === 'Rejected'
              ? 'CLAIM_REJECTED'
              : 'CLAIM_REOPENED',
          targetId: claimId,
          targetLabel: target.editedTitle ?? target.originalTitle,
          detail: `${collaborator.name} (${collaborator.role}) set status to ${status}.`,
        }),
        activities: appendActivity(prev, {
          projectId: target.projectId,
          title: activityTitle,
          detail: `${target.editedTitle ?? target.originalTitle} · by ${collaborator.name}`,
          type: 'verification',
        }),
      };
    });

    void syncEventToServer('CLAIM_REVIEW', {
      claimId,
      reviewStatus: status,
    });
  };

  const handleAcceptClaim = (claimId: string) =>
    updateClaimReviewStatus(claimId, 'Verified', 'Claim Verified');

  const handleRejectClaim = (claimId: string) =>
    updateClaimReviewStatus(claimId, 'Rejected', 'Claim Rejected');

  const handleReopenClaim = (claimId: string) =>
    updateClaimReviewStatus(claimId, 'Pending Review', 'Claim Reopened');

  const handleEditClaim = (
    claimId: string,
    editedTitle: string,
    editedDescription: string,
    reviewerNote: string,
    markVerified: boolean
  ) => {
    const now = new Date().toISOString();
    setState((prev) => {
      const target = prev.claims.find((c) => c.id === claimId);
      if (!target) return prev;
      return {
        ...prev,
        claims: prev.claims.map((c) =>
          c.id === claimId
            ? {
                ...c,
                editedTitle,
                editedDescription,
                reviewerNote: reviewerNote || c.reviewerNote,
                reviewStatus: markVerified ? 'Verified' : c.reviewStatus,
                reviewedBy: markVerified ? collaborator.name : c.reviewedBy,
                reviewedByRole: markVerified ? collaborator.role : c.reviewedByRole,
                reviewedAt: markVerified ? now : c.reviewedAt,
              }
            : c
        ),
        judgeChecklist: markChecklistStep({ stepVerification: true }, prev.judgeChecklist),
        auditTrail: appendAudit(prev, {
          projectId: target.projectId,
          actorName: collaborator.name,
          actorRole: collaborator.role,
          action: 'CLAIM_EDITED',
          targetId: claimId,
          targetLabel: editedTitle,
          detail: `${collaborator.name} (${collaborator.role}) ${
            markVerified ? 'edited and verified' : 'edited'
          } claim.`,
        }),
        activities: appendActivity(prev, {
          projectId: target.projectId,
          title: markVerified ? 'Claim Edited & Verified' : 'Claim Edited',
          detail: `${editedTitle} · by ${collaborator.name}`,
          type: 'verification',
        }),
      };
    });

    void syncEventToServer('CLAIM_EDIT', {
      claimId,
      editedTitle,
      editedDescription,
      reviewerNote,
      markVerified,
    });
  };

  const handleUpdateConflictStatus = (
    conflictId: string,
    status: ConflictStatus,
    note?: string
  ) => {
    const now = new Date().toISOString();
    const trimmedNote = note?.trim() || null;
    setState((prev) => {
      const target = (prev.conflicts ?? []).find((c) => c.id === conflictId);
      if (!target) return prev;
      return {
        ...prev,
        conflicts: (prev.conflicts ?? []).map((c) =>
          c.id === conflictId
            ? {
                ...c,
                status,
                resolvedBy: status === 'Open' ? null : collaborator.name,
                resolvedByRole: status === 'Open' ? null : collaborator.role,
                resolvedAt: status === 'Open' ? null : now,
                resolutionNote:
                  status === 'Open' ? null : trimmedNote || c.resolutionNote || null,
              }
            : c
        ),
        auditTrail: appendAudit(prev, {
          projectId: target.projectId,
          actorName: collaborator.name,
          actorRole: collaborator.role,
          action:
            status === 'Resolved'
              ? 'CONFLICT_RESOLVED'
              : status === 'Dismissed'
              ? 'CONFLICT_DISMISSED'
              : 'CONFLICT_REOPENED',
          targetId: conflictId,
          targetLabel: target.title,
          detail: `${collaborator.name} (${collaborator.role}) marked ${target.type} as ${status}${
            trimmedNote ? `: ${trimmedNote}` : '.'
          }`,
        }),
        activities: appendActivity(prev, {
          projectId: target.projectId,
          title: `Conflict ${status}`,
          detail: `${target.title} · by ${collaborator.name}`,
          type: 'conflict',
        }),
      };
    });

    void syncEventToServer('CONFLICT_UPDATE', {
      conflictId,
      status,
      resolutionNote: trimmedNote || '',
    });
  };

  const handleToggleRoleSignOff = (
    role: CollaboratorRole,
    signedOff: boolean,
    note?: string
  ) => {
    if (!activeProject) return;
    const now = new Date().toISOString();
    const trimmedNote = note?.trim() || null;

    setState((prev) => {
      const prevMap = prev.signOffs ?? {};
      const projMap = prevMap[activeProject.id] ?? createDefaultProjectSignOffs();
      return {
        ...prev,
        signOffs: {
          ...prevMap,
          [activeProject.id]: {
            ...projMap,
            [role]: {
              role,
              signedOff,
              actorName: signedOff ? collaborator.name : null,
              signedAt: signedOff ? now : null,
              note: signedOff ? trimmedNote : null,
            },
          },
        },
        judgeChecklist: markChecklistStep({ stepReport: true }, prev.judgeChecklist),
        auditTrail: appendAudit(prev, {
          projectId: activeProject.id,
          actorName: collaborator.name,
          actorRole: collaborator.role,
          action: signedOff ? 'ROLE_SIGNED_OFF' : 'SIGNOFF_REVOKED',
          targetId: `${activeProject.id}-${role}`,
          targetLabel: `${role} Handover Sign-Off`,
          detail: signedOff
            ? `${collaborator.name} signed off as ${role}${
                trimmedNote ? ` — "${trimmedNote}"` : '.'
              }`
            : `${collaborator.name} revoked ${role} sign-off.`,
        }),
        activities: appendActivity(prev, {
          projectId: activeProject.id,
          title: signedOff ? `${role} Signed Off` : `${role} Sign-Off Revoked`,
          detail: `${collaborator.name} updated ${role} sign-off for ${activeProject.name}.`,
          type: 'signoff',
        }),
      };
    });

    void syncEventToServer('ROLE_SIGNOFF', {
      projectId: activeProject.id,
      role,
      signedOff,
      note: trimmedNote || '',
    });
  };

  const handleGenerateReport = () => {
    if (!activeProject) return;
    const verifiedClaims = projectClaims.filter(
      (c) => c.reviewStatus === 'Verified'
    );
    const pendingClaims = projectClaims.filter(
      (c) => c.reviewStatus === 'Pending Review'
    );
    const rejectedCount = projectClaims.filter(
      (c) => c.reviewStatus === 'Rejected'
    ).length;

    const snapshot: HandoverReportSnapshot = {
      id: `rep-${Date.now()}`,
      projectId: activeProject.id,
      generatedAt: new Date().toISOString(),
      projectName: activeProject.name,
      team: activeProject.team,
      previousOwner: activeProject.previousOwner,
      incomingOwner: activeProject.incomingOwner,
      projectStatus: activeProject.status,
      projectDescription: activeProject.description,
      stats: {
        totalExtracted: projectClaims.length,
        verifiedCount: verifiedClaims.length,
        pendingCount: pendingClaims.length,
        rejectedCount,
        sourcesCount: projectSources.length,
        openConflictsCount: projectConflicts.filter((c) => c.status === 'Open').length,
        resolvedConflictsCount: projectConflicts.filter((c) => c.status !== 'Open').length,
      },
      verifiedClaims,
      pendingClaims,
      rejectedCount,
      conflicts: projectConflicts,
      signOffs: projectSignOffs,
      auditTrail: projectAuditTrail,
      sources: projectSources.map((s) => ({
        id: s.id,
        name: s.name,
        format: s.format,
        origin: s.origin,
      })),
    };

    setState((prev) => ({
      ...prev,
      reports: {
        ...prev.reports,
        [activeProject.id]: snapshot,
      },
      judgeChecklist: markChecklistStep({ stepReport: true }, prev.judgeChecklist),
      activities: appendActivity(prev, {
        projectId: activeProject.id,
        title: 'Handover Report Generated',
        detail: `Compiled ${verifiedClaims.length} verified facts and ${pendingClaims.length} pending claims for ${activeProject.name}.`,
        type: 'report',
      }),
    }));

    void syncEventToServer('REPORT_GENERATED', { report: snapshot });
  };

  const handleInspectClaim = (claim: ExtractedClaim) => {
    setInspectedClaimId(claim.id);
    setState((prev) => ({
      ...prev,
      judgeChecklist: markChecklistStep({ stepEvidence: true }, prev.judgeChecklist),
    }));
  };

  const handleMarkAllActivitiesRead = () => {
    setState((prev) => ({
      ...prev,
      activities: prev.activities.map((a) => ({ ...a, read: true })),
    }));
  };

  const handleResetDemoData = () => {
    setUrlWorkspaceId(null);
    const fresh = resetWorkspaceStorage();
    setState(fresh);
    setInspectedClaimId(null);
    setActiveRoute('overview');
  };

  return (
    <div className="min-h-screen bg-[#080D19] text-[#F8FAFC] flex">
      <Sidebar
        activeRoute={activeRoute}
        onNavigate={setActiveRoute}
        pendingReviewCount={pendingReviewCount}
        openConflictCount={openConflictCount}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      <div className="flex-1 min-w-0 flex flex-col">
        <TopBar
          projects={state.projects}
          activeProject={activeProject}
          onSelectProject={handleSelectProject}
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
          searchQuery={globalSearchQuery}
          onSearchChange={setGlobalSearchQuery}
          claims={projectClaims}
          sources={projectSources}
          activities={state.activities}
          onMarkAllRead={handleMarkAllActivitiesRead}
          onNavigate={setActiveRoute}
          onInspectClaim={handleInspectClaim}
          collaborator={collaborator}
          onUpdateCollaborator={handleUpdateCollaborator}
          workspaceId={state.workspaceId ?? null}
          isSyncingWorkspace={isSyncingWorkspace}
          onShareWorkspace={handleShareWorkspace}
          onSyncWorkspaceNow={syncWorkspaceNow}
        />

        {workspaceNotice && (
          <div className="bg-[#F59E0B]/10 border-b border-[#F59E0B]/30 px-4 lg:px-8 py-2.5 flex items-center justify-between gap-3 text-xs text-[#F59E0B] no-print">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{workspaceNotice}</span>
            </div>
            <button
              type="button"
              onClick={() => setWorkspaceNotice(null)}
              aria-label="Dismiss workspace notice"
              className="p-1 rounded-md hover:bg-white/[0.06] cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1360px] w-full mx-auto">
          {activeRoute === 'overview' && (
            <OverviewPage
              projects={state.projects}
              activeProject={activeProject}
              allSources={state.sources}
              projectSources={projectSources}
              allClaims={state.claims}
              projectClaims={projectClaims}
              projectConflicts={projectConflicts}
              projectSignOffs={projectSignOffs}
              activities={state.activities}
              judgeChecklist={judgeChecklist}
              workspaceId={state.workspaceId ?? null}
              onToggleGuide={() =>
                setState((prev) => ({
                  ...prev,
                  judgeChecklist: markChecklistStep(
                    { guideCollapsed: !judgeChecklist.guideCollapsed },
                    prev.judgeChecklist
                  ),
                }))
              }
              onSelectProject={handleSelectProject}
              onNavigate={setActiveRoute}
              onLoadSampleProject={handleLoadSampleProjectData}
              onInspectSampleEvidence={() => {
                if (projectClaims.length > 0) {
                  handleInspectClaim(projectClaims[0]);
                }
              }}
            />
          )}

          {activeRoute === 'projects' && (
            <ProjectsPage
              projects={state.projects}
              activeProjectId={activeProject?.id ?? ''}
              sources={state.sources}
              claims={state.claims}
              onSelectProject={handleSelectProject}
              onNavigate={setActiveRoute}
              onLoadSampleProject={handleLoadSampleProjectData}
            />
          )}

          {activeRoute === 'sources' && (
            <SourcesPage
              activeProject={activeProject}
              projectSources={projectSources}
              onAddSources={handleAddSources}
              onRemoveSource={handleRemoveSource}
              onLoadSampleProjectData={handleLoadSampleProjectData}
              onSourceInspected={() =>
                setState((prev) => ({
                  ...prev,
                  judgeChecklist: markChecklistStep({ stepSource: true }, prev.judgeChecklist),
                }))
              }
              onRunIntelligenceExtraction={handleRunIntelligenceExtraction}
              onNavigate={setActiveRoute}
            />
          )}

          {activeRoute === 'knowledge' && (
            <KnowledgeHubPage
              activeProject={activeProject}
              claims={projectClaims}
              conflicts={projectConflicts}
              globalSearchQuery={globalSearchQuery}
              onInspectEvidence={handleInspectClaim}
              onUpdateConflictStatus={handleUpdateConflictStatus}
              onRunReconciliation={handleRunReconciliation}
              onNavigate={setActiveRoute}
            />
          )}

          {activeRoute === 'verification' && (
            <VerificationCenterPage
              activeProject={activeProject}
              claims={projectClaims}
              auditTrail={projectAuditTrail}
              collaborator={collaborator}
              onAcceptClaim={handleAcceptClaim}
              onRejectClaim={handleRejectClaim}
              onReopenClaim={handleReopenClaim}
              onEditClaim={handleEditClaim}
              onInspectEvidence={handleInspectClaim}
              onNavigate={setActiveRoute}
            />
          )}

          {activeRoute === 'timeline' && (
            <TimelinePage
              activeProject={activeProject}
              claims={projectClaims}
              onInspectEvidence={handleInspectClaim}
            />
          )}

          {activeRoute === 'first-day' && (
            <FirstDayPage
              activeProject={activeProject}
              projectSources={projectSources}
              claims={projectClaims}
              onInspectEvidence={handleInspectClaim}
              onNavigate={setActiveRoute}
            />
          )}

          {activeRoute === 'reports' && (
            <HandoverReportsPage
              activeProject={activeProject}
              projectClaims={projectClaims}
              projectConflicts={projectConflicts}
              projectSignOffs={projectSignOffs}
              projectAuditTrail={projectAuditTrail}
              collaborator={collaborator}
              workspaceId={state.workspaceId ?? null}
              currentReport={
                activeProject ? state.reports[activeProject.id] : undefined
              }
              onGenerateReport={handleGenerateReport}
              onToggleRoleSignOff={handleToggleRoleSignOff}
              onShareWorkspace={handleShareWorkspace}
              onPdfDownloaded={() =>
                setState((prev) => ({
                  ...prev,
                  judgeChecklist: markChecklistStep({ stepReport: true }, prev.judgeChecklist),
                }))
              }
              onNavigate={setActiveRoute}
            />
          )}

          {activeRoute === 'settings' && (
            <SettingsPage
              state={state}
              onResetDemoData={handleResetDemoData}
            />
          )}
        </main>
      </div>

      {/* Evidence Traceability Drawer */}
      <EvidenceDrawer
        claim={inspectedClaim}
        sources={projectSources}
        onClose={() => setInspectedClaimId(null)}
        onAccept={handleAcceptClaim}
        onReject={handleRejectClaim}
        onReopen={handleReopenClaim}
        onOpenInVerification={() => setActiveRoute('verification')}
      />
    </div>
  );
}
