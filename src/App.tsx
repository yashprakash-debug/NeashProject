import { useEffect, useMemo, useState } from 'react';
import { EvidenceDrawer } from './components/EvidenceDrawer';
import { FirstDayPage } from './components/FirstDayPage';
import { HandoverReportsPage } from './components/HandoverReportsPage';
import { KnowledgeHubPage } from './components/KnowledgeHubPage';
import { OverviewPage } from './components/OverviewPage';
import { ProjectsPage } from './components/ProjectsPage';
import { SettingsPage } from './components/SettingsPage';
import { Sidebar } from './components/Sidebar';
import { SourcesPage } from './components/SourcesPage';
import { TimelinePage } from './components/TimelinePage';
import { TopBar } from './components/TopBar';
import { VerificationCenterPage } from './components/VerificationCenterPage';
import {
  createEcommerceDemoClaims,
  createSupportPortalDemoClaims,
  DEMO_PROJECTS,
  DEMO_SOURCES,
} from './data/demoData';
import {
  ActivityLogItem,
  ExtractedClaim,
  HandoverReportSnapshot,
  JudgeChecklistProgress,
  NavRoute,
  NeashAppState,
  SourceFile,
} from './types/neash';
import { extractClaimsFromUploadedSource } from './utils/fileExtractor';
import {
  loadWorkspaceState,
  resetWorkspaceStorage,
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

function waitMs(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default function App() {
  const [state, setState] = useState<NeashAppState>(() => loadWorkspaceState());
  const [activeRoute, setActiveRoute] = useState<NavRoute>('overview');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');

  // Drawers
  const [inspectedClaimId, setInspectedClaimId] = useState<string | null>(null);

  useEffect(() => {
    saveWorkspaceState(state);
  }, [state]);

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

  const inspectedClaim = useMemo(
    () => state.claims.find((c) => c.id === inspectedClaimId) ?? null,
    [state.claims, inspectedClaimId]
  );

  const pendingReviewCount = useMemo(
    () => projectClaims.filter((c) => c.reviewStatus === 'Pending Review').length,
    [projectClaims]
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
    ...prev.activities.slice(0, 39),
  ];

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

      return {
        ...prev,
        projects: nextProjects,
        activeProjectId: sampleProject.id,
        sources: [...prev.sources, ...missingSources],
        claims: restoredClaims,
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
    setState((prev) => ({
      ...prev,
      sources: [...newSources, ...prev.sources],
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
  };

  const handleRemoveSource = (sourceId: string) => {
    setState((prev) => {
      const target = prev.sources.find((s) => s.id === sourceId);
      return {
        ...prev,
        sources: prev.sources.filter((s) => s.id !== sourceId),
        activities: target
          ? appendActivity(prev, {
              projectId: target.projectId,
              title: 'Source Removed',
              detail: `Removed ${target.name} from ingested sources.`,
              type: 'source',
            })
          : prev.activities,
      };
    });
  };

  const handleRunIntelligenceExtraction = async (
    onStageChange: (stageIndex: number, label: string) => void
  ) => {
    if (!activeProject) return;

    const stages = [
      'Reading ingested documents and verifying file structure...',
      'Extracting decisions, tasks, blockers, risks, and milestones...',
      'Linking verbatim source excerpts and page/line citations...',
      'Populating Knowledge Hub and Verification Center...',
    ];

    for (let i = 0; i < stages.length; i++) {
      onStageChange(i, stages[i]);
      await waitMs(420);
    }

    setState((prev) => {
      const targetProject = prev.projects.find(
        (p) => p.id === activeProject.id
      );
      if (!targetProject) return prev;

      const currentSources = prev.sources.filter(
        (s) => s.projectId === targetProject.id
      );
      const existingClaimsForProject = prev.claims.filter(
        (c) => c.projectId === targetProject.id
      );
      const existingClaimIds = new Set(existingClaimsForProject.map((c) => c.id));

      // 1. Deterministic demo claims for preloaded demo projects (preserving any user reviews already made)
      let demoClaimsToAdd: ExtractedClaim[] = [];
      if (targetProject.id === 'proj-ecommerce') {
        const hasDemoSources = currentSources.some((s) => s.origin === 'demo');
        if (hasDemoSources) {
          const freshDemo = createEcommerceDemoClaims(
            existingClaimsForProject.length > 0
          );
          demoClaimsToAdd = freshDemo.filter(
            (c) =>
              !existingClaimIds.has(c.id) &&
              currentSources.some((s) => s.id === c.sourceId)
          );
        }
      } else if (targetProject.id === 'proj-support') {
        const hasDemoSources = currentSources.some((s) => s.origin === 'demo');
        if (hasDemoSources) {
          const freshSupport = createSupportPortalDemoClaims();
          demoClaimsToAdd = freshSupport.filter(
            (c) =>
              !existingClaimIds.has(c.id) &&
              currentSources.some((s) => s.id === c.sourceId)
          );
        }
      }

      // 2. Real deterministic extraction for user-uploaded files
      const uploadedClaimsToAdd: ExtractedClaim[] = [];
      for (const src of currentSources) {
        if (src.origin === 'uploaded') {
          const extracted = extractClaimsFromUploadedSource(src);
          for (const item of extracted) {
            if (!existingClaimIds.has(item.id)) {
              uploadedClaimsToAdd.push(item);
            }
          }
        }
      }

      const newlyAddedCount =
        demoClaimsToAdd.length + uploadedClaimsToAdd.length;
      const now = new Date().toISOString();

      return {
        ...prev,
        projects: prev.projects.map((p) =>
          p.id === targetProject.id
            ? {
                ...p,
                intelligenceGenerated: true,
                lastExtractedAt: now,
                updatedAt: now,
              }
            : p
        ),
        sources: prev.sources.map((s) =>
          s.projectId === targetProject.id &&
          s.status !== 'Unsupported' &&
          s.status !== 'Error'
            ? { ...s, status: 'Processed' }
            : s
        ),
        claims: [...prev.claims, ...demoClaimsToAdd, ...uploadedClaimsToAdd],
        judgeChecklist: markChecklistStep({ stepExtraction: true }, prev.judgeChecklist),
        activities: appendActivity(prev, {
          projectId: targetProject.id,
          title: 'Project Intelligence Generated',
          detail:
            newlyAddedCount > 0
              ? `Extracted ${newlyAddedCount} new structured claims across ${currentSources.length} sources for ${targetProject.name}.`
              : `Re-verified ${currentSources.length} sources for ${targetProject.name}; all grounded claims are up to date.`,
          type: 'extraction',
        }),
      };
    });
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
                reviewedBy: status === 'Pending Review' ? null : 'Demo User',
                reviewedAt: status === 'Pending Review' ? null : now,
              }
            : c
        ),
        judgeChecklist: markChecklistStep({ stepVerification: true }, prev.judgeChecklist),
        activities: appendActivity(prev, {
          projectId: target.projectId,
          title: activityTitle,
          detail: `${target.editedTitle ?? target.originalTitle}`,
          type: 'verification',
        }),
      };
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
                reviewedBy: markVerified ? 'Demo User' : c.reviewedBy,
                reviewedAt: markVerified ? now : c.reviewedAt,
              }
            : c
        ),
        judgeChecklist: markChecklistStep({ stepVerification: true }, prev.judgeChecklist),
        activities: appendActivity(prev, {
          projectId: target.projectId,
          title: markVerified ? 'Claim Edited & Verified' : 'Claim Edited',
          detail: editedTitle,
          type: 'verification',
        }),
      };
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
      },
      verifiedClaims,
      pendingClaims,
      rejectedCount,
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
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1360px] w-full mx-auto">
          {activeRoute === 'overview' && (
            <OverviewPage
              projects={state.projects}
              activeProject={activeProject}
              allSources={state.sources}
              projectSources={projectSources}
              allClaims={state.claims}
              projectClaims={projectClaims}
              activities={state.activities}
              judgeChecklist={judgeChecklist}
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
              globalSearchQuery={globalSearchQuery}
              onInspectEvidence={handleInspectClaim}
              onNavigate={setActiveRoute}
            />
          )}

          {activeRoute === 'verification' && (
            <VerificationCenterPage
              activeProject={activeProject}
              claims={projectClaims}
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
              currentReport={
                activeProject ? state.reports[activeProject.id] : undefined
              }
              onGenerateReport={handleGenerateReport}
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
