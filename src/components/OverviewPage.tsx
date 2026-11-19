import React from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  CheckSquare,
  ChevronDown,
  ChevronUp,
  Circle,
  Compass,
  FileText,
  FolderOpen,
  Sparkles,
  UploadCloud,
  UserCheck,
} from 'lucide-react';
import type {
  ActivityLogItem,
  CollaboratorRole,
  ExtractedClaim,
  JudgeChecklistProgress,
  NavRoute,
  Project,
  ReconciliationConflict,
  RoleSignOff,
  SourceFile,
} from '../types/neash';
import { ProjectStatusLabel } from './StatusSignals';

interface OverviewPageProps {
  projects: Project[];
  activeProject: Project | undefined;
  allSources: SourceFile[];
  projectSources: SourceFile[];
  allClaims: ExtractedClaim[];
  projectClaims: ExtractedClaim[];
  projectConflicts: ReconciliationConflict[];
  projectSignOffs: Record<CollaboratorRole, RoleSignOff>;
  activities: ActivityLogItem[];
  judgeChecklist: JudgeChecklistProgress;
  workspaceId: string | null;
  onToggleGuide: () => void;
  onSelectProject: (projectId: string) => void;
  onNavigate: (route: NavRoute) => void;
  onLoadSampleProject: () => void;
  onInspectSampleEvidence: () => void;
}

export const OverviewPage: React.FC<OverviewPageProps> = ({
  projects,
  activeProject,
  allSources,
  projectSources,
  allClaims,
  projectClaims,
  projectConflicts,
  projectSignOffs,
  activities,
  judgeChecklist,
  workspaceId,
  onToggleGuide,
  onSelectProject,
  onNavigate,
  onLoadSampleProject,
  onInspectSampleEvidence,
}) => {
  const totalProjects = projects.length;
  const totalSources = allSources.length;

  const nonRejectedActiveClaims = projectClaims.filter(
    (c) => c.reviewStatus !== 'Rejected'
  );
  const extractedDecisions = nonRejectedActiveClaims.filter(
    (c) => c.category === 'Decision'
  ).length;
  const pendingTasks = nonRejectedActiveClaims.filter(
    (c) => c.category === 'Task' && c.taskStatus !== 'Completed'
  ).length;
  const activeBlockers = nonRejectedActiveClaims.filter(
    (c) => c.category === 'Blocker'
  ).length;
  const openConflicts = projectConflicts.filter(
    (c) => c.status === 'Open'
  ).length;

  const totalExtracted = projectClaims.length;
  const verifiedCount = projectClaims.filter(
    (c) => c.reviewStatus === 'Verified'
  ).length;
  const pendingCount = projectClaims.filter(
    (c) => c.reviewStatus === 'Pending Review'
  ).length;
  const rejectedCount = projectClaims.filter(
    (c) => c.reviewStatus === 'Rejected'
  ).length;

  const signedRolesCount = (
    ['Outgoing Owner', 'Reviewer', 'Incoming Engineer'] as CollaboratorRole[]
  ).filter((r) => projectSignOffs[r]?.signedOff).length;

  const reviewedPct =
    totalExtracted > 0
      ? Math.round(((verifiedCount + rejectedCount) / totalExtracted) * 100)
      : 0;
  const verifiedPct =
    totalExtracted > 0 ? Math.round((verifiedCount / totalExtracted) * 100) : 0;

  const guideSteps = [
    {
      key: 'stepProject' as const,
      title: '1. Switch Demo Projects',
      desc: 'Compare E-commerce Platform (pre-extracted) and Customer Support Portal (ready for server AI extraction).',
      done: judgeChecklist.stepProject,
      ctaLabel: 'Open Projects',
      action: () => onNavigate('projects'),
      secondaryLabel:
        activeProject?.id === 'proj-support'
          ? 'Switch to E-commerce'
          : 'Try Support Portal',
      secondaryAction: () => {
        const targetId =
          activeProject?.id === 'proj-support'
            ? 'proj-ecommerce'
            : 'proj-support';
        if (projects.some((p) => p.id === targetId)) {
          onSelectProject(targetId);
        } else {
          onLoadSampleProject();
        }
      },
    },
    {
      key: 'stepSource' as const,
      title: '2. Inspect & Upload Sources',
      desc: 'Preview DEMO DATA docs or upload a real TXT/CSV/MD/JSON/PDF artifact.',
      done: judgeChecklist.stepSource,
      ctaLabel: 'Open Sources',
      action: () => onNavigate('sources'),
    },
    {
      key: 'stepExtraction' as const,
      title: '3. Run Server AI & Citation Check',
      desc: 'Extract structured claims via Express + Gemini 4 Hydrogen with verbatim quote verification.',
      done: judgeChecklist.stepExtraction,
      ctaLabel: 'Go to Extraction',
      action: () => onNavigate('sources'),
    },
    {
      key: 'stepEvidence' as const,
      title: '4. Inspect Evidence & Conflicts',
      desc: 'Trace exact quotes in Knowledge Hub and reconcile cross-source contradictions & stale facts.',
      done: judgeChecklist.stepEvidence,
      ctaLabel: 'Knowledge Hub',
      action: () => onNavigate('knowledge'),
      secondaryLabel: projectClaims.length > 0 ? 'Preview Evidence Now' : undefined,
      secondaryAction:
        projectClaims.length > 0 ? onInspectSampleEvidence : undefined,
    },
    {
      key: 'stepVerification' as const,
      title: '5. Verify & Collaborate by Role',
      desc: 'Triage claims as Outgoing Owner, Reviewer, or Incoming Engineer with full audit logs.',
      done: judgeChecklist.stepVerification,
      ctaLabel: 'Verify Claims',
      action: () => onNavigate('verification'),
    },
    {
      key: 'stepReport' as const,
      title: '6. Sign Off, Share & Export PDF',
      desc: 'Collect 3-role handover sign-offs, share workspace link, and download the full PDF report.',
      done: judgeChecklist.stepReport,
      ctaLabel: 'Handover Report',
      action: () => onNavigate('reports'),
    },
  ];

  const completedStepsCount = guideSteps.filter((s) => s.done).length;

  const kpis = [
    {
      label: 'Total Projects',
      value: totalProjects,
      sub: 'Continuity workspaces',
    },
    {
      label: 'Ingested Sources',
      value: totalSources,
      sub: `${projectSources.length} in active project`,
    },
    {
      label: 'Extracted Decisions',
      value: extractedDecisions,
      sub: activeProject ? activeProject.name : 'Active project',
    },
    {
      label: 'Pending Tasks',
      value: pendingTasks,
      sub: 'Open or in-progress tasks',
    },
    {
      label: 'Active Blockers',
      value: activeBlockers,
      sub: 'Unresolved delivery blockers',
    },
    {
      label: 'Open Conflicts',
      value: openConflicts,
      sub: 'Cross-source & stale alerts',
    },
  ];

  const recentActivities = activities
    .filter((a) => !activeProject || a.projectId === activeProject.id)
    .slice(0, 6);

  return (
    <div className="space-y-8">
      {/* Hero / Active Project Context Header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 pb-6 border-b border-white/[0.07]">
        <div className="space-y-2 max-w-2xl">
          <div className="flex flex-wrap items-center gap-2 text-xs text-[#94A3B8]">
            <span>Active Handover Workspace</span>
            {workspaceId && (
              <>
                <span aria-hidden="true">·</span>
                <span className="font-mono text-[#22C55E]">
                  Shared ({workspaceId})
                </span>
              </>
            )}
            {activeProject?.isDemoData && (
              <>
                <span aria-hidden="true">·</span>
                <span className="font-mono text-[#60A5FA]">DEMO DATA</span>
              </>
            )}
            {activeProject && (
              <>
                <span aria-hidden="true">·</span>
                <ProjectStatusLabel status={activeProject.status} />
              </>
            )}
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-[#F8FAFC] text-balance">
            {activeProject ? activeProject.name : 'Project Continuity Overview'}
          </h1>
          <p className="text-sm text-[#94A3B8] leading-relaxed">
            {activeProject
              ? `${activeProject.team} · Transitioning from ${activeProject.previousOwner} to ${activeProject.incomingOwner}.`
              : 'Select a demo project to inspect scattered documentation and build a verified handover.'}
          </p>
        </div>

        {/* Quick Actions */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => onNavigate('sources')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#111D30] hover:bg-[#16243B] border border-white/[0.08] text-xs font-medium text-[#F8FAFC] transition-colors whitespace-nowrap cursor-pointer"
          >
            <UploadCloud className="w-3.5 h-3.5 text-[#60A5FA]" />
            <span>Sources ({projectSources.length})</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigate('verification')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#111D30] hover:bg-[#16243B] border border-white/[0.08] text-xs font-medium text-[#F8FAFC] transition-colors whitespace-nowrap cursor-pointer"
          >
            <CheckSquare className="w-3.5 h-3.5 text-[#F59E0B]" />
            <span>Verify Claims ({pendingCount})</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigate('first-day')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#111D30] hover:bg-[#16243B] border border-white/[0.08] text-xs font-medium text-[#F8FAFC] transition-colors whitespace-nowrap cursor-pointer"
          >
            <Compass className="w-3.5 h-3.5 text-[#22C55E]" />
            <span>Your First Day</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigate('reports')}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-gradient-to-r from-[#2563EB] to-[#3B82F6] hover:from-[#1D4ED8] hover:to-[#2563EB] text-sm font-semibold text-white shadow-lg shadow-[#3B82F6]/30 ring-1 ring-[#60A5FA]/50 transition-all whitespace-nowrap cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#60A5FA]"
          >
            <FileText className="w-4 h-4" />
            <span>Generate Handover</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2-Minute Judge Evaluation Checklist */}
      <section className="rounded-xl bg-[#111D30] border border-[#3B82F6]/30 overflow-hidden">
        <div className="px-5 py-4 flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2.5">
              <h2 className="font-display text-sm font-semibold text-[#F8FAFC]">
                2-Minute Evaluation Guide
              </h2>
              <span className="font-mono text-xs text-[#60A5FA] tabular-nums">
                {completedStepsCount}/6 tested
              </span>
            </div>
            <p className="text-xs text-[#94A3B8]">
              Follow these six steps to evaluate server-verified AI extraction, cross-source reconciliation, and multi-user sign-off.
            </p>
          </div>

          <button
            type="button"
            onClick={onToggleGuide}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-xs font-medium text-[#F8FAFC] transition-colors whitespace-nowrap cursor-pointer"
          >
            <span>{judgeChecklist.guideCollapsed ? 'Show Steps' : 'Hide Steps'}</span>
            {judgeChecklist.guideCollapsed ? (
              <ChevronDown className="w-3.5 h-3.5" />
            ) : (
              <ChevronUp className="w-3.5 h-3.5" />
            )}
          </button>
        </div>

        {!judgeChecklist.guideCollapsed && (
          <div className="border-t border-white/[0.07] grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 divide-y md:divide-y-0 md:gap-px bg-white/[0.06]">
            {guideSteps.map((step) => (
              <div
                key={step.key}
                className="p-4 bg-[#111D30] flex flex-col justify-between gap-3"
              >
                <div className="flex items-start gap-2.5">
                  {step.done ? (
                    <CheckCircle2
                      className="w-4 h-4 text-[#22C55E] shrink-0 mt-0.5"
                      aria-label="Completed"
                    />
                  ) : (
                    <Circle
                      className="w-4 h-4 text-[#94A3B8]/60 shrink-0 mt-0.5"
                      aria-label="Not yet tested"
                    />
                  )}
                  <div className="space-y-1 min-w-0">
                    <p
                      className={`text-xs font-semibold ${
                        step.done ? 'text-[#22C55E]' : 'text-[#F8FAFC]'
                      }`}
                    >
                      {step.title}
                    </p>
                    <p className="text-xs text-[#94A3B8] leading-relaxed">
                      {step.desc}
                    </p>
                  </div>
                </div>

                <div className="pl-6 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={step.action}
                    className="inline-flex items-center gap-1 text-xs font-medium text-[#60A5FA] hover:underline whitespace-nowrap cursor-pointer"
                  >
                    <span>{step.ctaLabel}</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                  {step.secondaryLabel && step.secondaryAction && (
                    <button
                      type="button"
                      onClick={step.secondaryAction}
                      className="text-xs font-medium text-[#94A3B8] hover:text-[#F8FAFC] whitespace-nowrap cursor-pointer"
                    >
                      {step.secondaryLabel}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Alert banners: Unextracted staged sources OR Open Cross-Source Conflicts */}
      {activeProject && projectSources.length > 0 && totalExtracted === 0 && (
        <div className="p-5 rounded-xl bg-[#111D30] border border-[#3B82F6]/35 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="font-display text-sm font-semibold text-[#F8FAFC]">
              {projectSources.length} source documents staged for {activeProject.name}
            </h2>
            <p className="text-xs text-[#94A3B8]">
              Run server-side Gemini extraction + programmatic citation verification to analyze these documents.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('sources')}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#3B82F6] hover:bg-[#2563EB] text-xs font-semibold text-white whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Go to Intelligence Extraction</span>
          </button>
        </div>
      )}

      {openConflicts > 0 && (
        <div className="p-4 rounded-xl bg-[#F59E0B]/[0.08] border border-[#F59E0B]/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 text-xs text-[#F8FAFC]">
            <AlertTriangle className="w-4 h-4 text-[#F59E0B] shrink-0" />
            <span>
              <strong className="text-[#F59E0B] tabular-nums">
                {openConflicts} cross-source contradiction, passed deadline, or undocumented owner alert{openConflicts === 1 ? '' : 's'}
              </strong>{' '}
              detected for {activeProject?.name}.
            </span>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('knowledge')}
            className="inline-flex items-center gap-1 text-xs font-semibold text-[#F59E0B] hover:underline whitespace-nowrap cursor-pointer"
          >
            <span>Inspect Conflicts in Knowledge Hub</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 6 KPI Grid */}
      <section aria-label="Key project continuity metrics">
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
          {kpis.map((kpi) => (
            <div
              key={kpi.label}
              className="p-4 rounded-xl bg-[#111D30] border border-white/[0.07]"
            >
              <p className="text-xs font-medium text-[#94A3B8] truncate">
                {kpi.label}
              </p>
              <p className="mt-2 font-display text-2xl font-bold text-[#F8FAFC] tabular-nums">
                {kpi.value}
              </p>
              <p className="mt-1 text-[11px] text-[#94A3B8]/80 truncate">
                {kpi.sub}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Main 2-column Grid: Verification + Sign-Off Progress | Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <section className="lg:col-span-2 p-6 rounded-xl bg-[#111D30] border border-white/[0.07] space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-base font-semibold text-[#F8FAFC]">
                Human Verification &amp; Role Sign-Off Progress
              </h2>
              <p className="text-xs text-[#94A3B8] mt-0.5">
                Calculated directly from current extracted claims and role approvals in{' '}
                {activeProject?.name ?? 'active project'}.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1.5 text-xs font-mono text-[#60A5FA] tabular-nums">
                <UserCheck className="w-3.5 h-3.5" />
                {signedRolesCount}/3 Signed Off
              </span>
              <button
                type="button"
                onClick={() => onNavigate('verification')}
                className="inline-flex items-center gap-1 text-xs font-medium text-[#60A5FA] hover:underline whitespace-nowrap cursor-pointer"
              >
                <span>Open Verification Center</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {totalExtracted === 0 ? (
            <div className="py-6 border-t border-white/[0.06] text-sm text-[#94A3B8]">
              No claims extracted yet for this project. Upload sources or run extraction in the Sources tab.
            </div>
          ) : (
            <div className="space-y-4 pt-2 border-t border-white/[0.06]">
              <div className="flex items-baseline justify-between text-xs">
                <span className="text-[#94A3B8]">
                  Review completion:{' '}
                  <strong className="text-[#F8FAFC] tabular-nums">
                    {reviewedPct}%
                  </strong>{' '}
                  triaged ({verifiedPct}% verified as approved facts)
                </span>
                <span className="font-mono text-[#F8FAFC] tabular-nums">
                  {totalExtracted} claims extracted
                </span>
              </div>

              <div
                className="h-2.5 w-full rounded-md bg-[#080D19] overflow-hidden flex"
                role="progressbar"
                aria-valuenow={reviewedPct}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                {verifiedCount > 0 && (
                  <div
                    style={{ width: `${(verifiedCount / totalExtracted) * 100}%` }}
                    className="bg-[#22C55E] h-full transition-all"
                    title={`${verifiedCount} Verified`}
                  />
                )}
                {pendingCount > 0 && (
                  <div
                    style={{ width: `${(pendingCount / totalExtracted) * 100}%` }}
                    className="bg-[#F59E0B]/70 h-full transition-all"
                    title={`${pendingCount} Pending Review`}
                  />
                )}
                {rejectedCount > 0 && (
                  <div
                    style={{ width: `${(rejectedCount / totalExtracted) * 100}%` }}
                    className="bg-[#EF4444]/80 h-full transition-all"
                    title={`${rejectedCount} Rejected`}
                  />
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
                <div>
                  <p className="text-xs text-[#94A3B8]">Extracted</p>
                  <p className="mt-1 font-mono text-lg font-semibold text-[#F8FAFC] tabular-nums">
                    {totalExtracted}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-[#22C55E]">Verified</p>
                  <p className="mt-1 font-mono text-lg font-semibold text-[#F8FAFC] tabular-nums">
                    {verifiedCount}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-[#F59E0B]">Pending Review</p>
                  <p className="mt-1 font-mono text-lg font-semibold text-[#F8FAFC] tabular-nums">
                    {pendingCount}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-[#EF4444]">Rejected</p>
                  <p className="mt-1 font-mono text-lg font-semibold text-[#F8FAFC] tabular-nums">
                    {rejectedCount}
                  </p>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Recent Extraction & Review Activity */}
        <section className="p-6 rounded-xl bg-[#111D30] border border-white/[0.07] space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-base font-semibold text-[#F8FAFC]">
              Recent Activity
            </h2>
            <span className="text-xs text-[#94A3B8] tabular-nums">
              {recentActivities.length} events
            </span>
          </div>

          <div className="divide-y divide-white/[0.06] border-t border-white/[0.06]">
            {recentActivities.length === 0 ? (
              <p className="py-6 text-xs text-[#94A3B8]">
                No activity recorded for this project yet.
              </p>
            ) : (
              recentActivities.map((act) => (
                <div key={act.id} className="py-3 space-y-1">
                  <p className="text-xs font-semibold text-[#F8FAFC]">
                    {act.title}
                  </p>
                  <p className="text-xs text-[#94A3B8] leading-relaxed">
                    {act.detail}
                  </p>
                  <p className="text-[11px] font-mono text-[#94A3B8]/70 tabular-nums">
                    {new Date(act.timestamp).toLocaleString()}
                  </p>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      {/* Project Status Overview Table */}
      <section className="p-6 rounded-xl bg-[#111D30] border border-white/[0.07] space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-base font-semibold text-[#F8FAFC]">
              Project Status Overview
            </h2>
            <p className="text-xs text-[#94A3B8] mt-0.5">
              {workspaceId
                ? `Synced to persistent shared workspace (${workspaceId}) and cached locally.`
                : 'Persisted locally with one-click shareable server workspace links for multi-user sign-off.'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onLoadSampleProject}
              className="text-xs font-medium text-[#60A5FA] hover:underline cursor-pointer"
            >
              Load Sample Project Data
            </button>
            <button
              type="button"
              onClick={() => onNavigate('projects')}
              className="inline-flex items-center gap-1 text-xs font-medium text-[#F8FAFC] hover:text-[#60A5FA] cursor-pointer"
            >
              <span>Manage Projects</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto border-t border-white/[0.06]">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/[0.07] text-xs font-medium text-[#94A3B8]">
                <th className="py-3 pr-4">Project</th>
                <th className="py-3 px-4">Handover Transition</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Sources</th>
                <th className="py-3 px-4 text-right">Verified Claims</th>
                <th className="py-3 pl-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.05] text-sm">
              {projects.map((proj) => {
                const pSources = allSources.filter((s) => s.projectId === proj.id);
                const pClaims = allClaims.filter((c) => c.projectId === proj.id);
                const pVerified = pClaims.filter(
                  (c) => c.reviewStatus === 'Verified'
                ).length;
                const isActive = proj.id === activeProject?.id;

                return (
                  <tr
                    key={proj.id}
                    className={`hover:bg-white/[0.02] transition-colors ${
                      isActive ? 'bg-[#3B82F6]/[0.04]' : ''
                    }`}
                  >
                    <td className="py-3.5 pr-4">
                      <div className="font-medium text-[#F8FAFC]">
                        {proj.name}
                      </div>
                      <div className="text-xs text-[#94A3B8]">
                        {proj.team}
                        {proj.isDemoData && ' · DEMO DATA'}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-xs text-[#94A3B8]">
                      <span className="text-[#F8FAFC]">{proj.previousOwner}</span>
                      <span className="mx-1.5" aria-hidden="true">
                        →
                      </span>
                      <span className="text-[#60A5FA]">{proj.incomingOwner}</span>
                    </td>
                    <td className="py-3.5 px-4">
                      <ProjectStatusLabel status={proj.status} />
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-xs text-[#F8FAFC] tabular-nums">
                      {pSources.length}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-xs text-[#F8FAFC] tabular-nums">
                      {pVerified} / {pClaims.length}
                    </td>
                    <td className="py-3.5 pl-4 text-right">
                      <button
                        type="button"
                        onClick={() => {
                          onSelectProject(proj.id);
                          onNavigate('knowledge');
                        }}
                        className="inline-flex items-center gap-1 text-xs font-medium text-[#60A5FA] hover:underline whitespace-nowrap cursor-pointer"
                      >
                        <FolderOpen className="w-3.5 h-3.5" />
                        <span>{isActive ? 'Inspect' : 'Open'}</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
