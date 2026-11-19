import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Eye,
  FileText,
  GitCompare,
  Loader2,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldAlert,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import type {
  ClaimCategory,
  ConfidenceLevel,
  ConflictStatus,
  ExtractedClaim,
  NavRoute,
  Project,
  ReconciliationConflict,
  ReviewStatus,
} from '../types/neash';
import {
  CategoryIcon,
  CategoryLabel,
  ConfidenceIndicator,
  ReviewStatusIndicator,
} from './StatusSignals';

interface KnowledgeHubPageProps {
  activeProject: Project | undefined;
  claims: ExtractedClaim[];
  conflicts: ReconciliationConflict[];
  globalSearchQuery: string;
  onInspectEvidence: (claim: ExtractedClaim) => void;
  onUpdateConflictStatus: (
    conflictId: string,
    status: ConflictStatus,
    note?: string
  ) => void;
  onRunReconciliation: (includeAi?: boolean) => Promise<void>;
  onNavigate: (route: NavRoute) => void;
}

type HubTab =
  | 'All'
  | 'Conflicts'
  | 'Decision'
  | 'Task'
  | 'Blocker'
  | 'Risk'
  | 'Milestone'
  | 'Knowledge Gap'
  | 'Next Action';

const HUB_TABS: Array<{ id: HubTab; label: string }> = [
  { id: 'All', label: 'All' },
  { id: 'Conflicts', label: 'Conflicts & Staleness' },
  { id: 'Decision', label: 'Decisions' },
  { id: 'Task', label: 'Tasks' },
  { id: 'Blocker', label: 'Blockers' },
  { id: 'Risk', label: 'Risks' },
  { id: 'Milestone', label: 'Milestones' },
  { id: 'Knowledge Gap', label: 'Knowledge Gaps' },
  { id: 'Next Action', label: 'Next Actions' },
];

type SortOption = 'default' | 'confidence' | 'status' | 'date' | 'title';

export const KnowledgeHubPage: React.FC<KnowledgeHubPageProps> = ({
  activeProject,
  claims,
  conflicts,
  globalSearchQuery,
  onInspectEvidence,
  onUpdateConflictStatus,
  onRunReconciliation,
  onNavigate,
}) => {
  const [activeTab, setActiveTab] = useState<HubTab>('All');
  const [localSearch, setLocalSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | ReviewStatus>('All');
  const [confidenceFilter, setConfidenceFilter] = useState<
    'All' | ConfidenceLevel
  >('All');
  const [sortBy, setSortBy] = useState<SortOption>('default');
  const [conflictFilter, setConflictFilter] = useState<'All' | ConflictStatus>('All');
  const [isReconciling, setIsReconciling] = useState(false);
  const [resolutionNotes, setResolutionNotes] = useState<Record<string, string>>({});

  const effectiveSearch = (localSearch || globalSearchQuery).trim().toLowerCase();

  const openConflictsCount = useMemo(
    () => conflicts.filter((c) => c.status === 'Open').length,
    [conflicts]
  );

  const tabCounts = useMemo(() => {
    const counts: Record<string, number> = {
      All: claims.length,
      Conflicts: conflicts.length,
    };
    for (const c of claims) {
      counts[c.category] = (counts[c.category] ?? 0) + 1;
    }
    return counts;
  }, [claims, conflicts]);

  const filteredClaims = useMemo(() => {
    const list = claims.filter((c) => {
      if (
        activeTab !== 'All' &&
        activeTab !== 'Conflicts' &&
        c.category !== (activeTab as ClaimCategory)
      ) {
        return false;
      }
      if (statusFilter !== 'All' && c.reviewStatus !== statusFilter) {
        return false;
      }
      if (confidenceFilter !== 'All' && c.confidence !== confidenceFilter) {
        return false;
      }
      if (effectiveSearch) {
        const title = (c.editedTitle ?? c.originalTitle).toLowerCase();
        const desc = (c.editedDescription ?? c.originalDescription).toLowerCase();
        const match =
          title.includes(effectiveSearch) ||
          desc.includes(effectiveSearch) ||
          c.sourceFilename.toLowerCase().includes(effectiveSearch) ||
          c.category.toLowerCase().includes(effectiveSearch) ||
          (c.owner?.toLowerCase().includes(effectiveSearch) ?? false);
        if (!match) return false;
      }
      return true;
    });

    const confRank: Record<ConfidenceLevel, number> = {
      High: 3,
      Medium: 2,
      Low: 1,
    };
    const statusRank: Record<ReviewStatus, number> = {
      'Pending Review': 1,
      Verified: 2,
      Rejected: 3,
    };

    return [...list].sort((a, b) => {
      if (sortBy === 'confidence') {
        return confRank[b.confidence] - confRank[a.confidence];
      }
      if (sortBy === 'status') {
        return statusRank[a.reviewStatus] - statusRank[b.reviewStatus];
      }
      if (sortBy === 'date') {
        return (b.date ?? '').localeCompare(a.date ?? '');
      }
      if (sortBy === 'title') {
        return (a.editedTitle ?? a.originalTitle).localeCompare(
          b.editedTitle ?? b.originalTitle
        );
      }
      return 0;
    });
  }, [claims, activeTab, statusFilter, confidenceFilter, effectiveSearch, sortBy]);

  const filteredConflicts = useMemo(() => {
    return conflicts.filter((c) => {
      if (conflictFilter !== 'All' && c.status !== conflictFilter) return false;
      if (effectiveSearch) {
        const hay = `${c.title} ${c.summary} ${c.sourceAFilename} ${
          c.sourceBFilename || ''
        } ${c.type}`.toLowerCase();
        if (!hay.includes(effectiveSearch)) return false;
      }
      return true;
    });
  }, [conflicts, conflictFilter, effectiveSearch]);

  const handleRunReconcileClick = async () => {
    if (isReconciling) return;
    setIsReconciling(true);
    try {
      await onRunReconciliation(true);
    } finally {
      setIsReconciling(false);
    }
  };

  if (!activeProject) {
    return (
      <div className="p-8 rounded-xl bg-[#111D30] border border-white/[0.07] text-center text-sm text-[#94A3B8]">
        Select a project to inspect extracted knowledge.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-5 border-b border-white/[0.07]">
        <div>
          <div className="flex items-center gap-2 text-xs text-[#94A3B8]">
            <span>{activeProject.name}</span>
            {activeProject.isDemoData && (
              <>
                <span aria-hidden="true">·</span>
                <span className="font-mono text-[#60A5FA]">DEMO DATA</span>
              </>
            )}
          </div>
          <h1 className="font-display text-2xl font-bold text-[#F8FAFC] mt-1">
            Knowledge Hub
          </h1>
          <p className="text-sm text-[#94A3B8] mt-1">
            Structured project claims with verified citations and cross-source contradiction &amp; staleness detection.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => {
              setActiveTab('Conflicts');
              void handleRunReconcileClick();
            }}
            disabled={isReconciling}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#111D30] hover:bg-[#16243B] border border-[#F59E0B]/35 text-xs font-medium text-[#F59E0B] whitespace-nowrap cursor-pointer"
          >
            {isReconciling ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <GitCompare className="w-3.5 h-3.5" />
            )}
            <span>
              {isReconciling ? 'Reconciling...' : 'Reconcile Cross-Source Conflicts'}
            </span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('verification')}
            className="px-4 py-2 rounded-lg bg-[#111D30] hover:bg-[#16243B] border border-white/[0.08] text-xs font-medium text-[#60A5FA] whitespace-nowrap cursor-pointer"
          >
            Open Verification Center
          </button>
        </div>
      </div>

      {/* Category Tabs */}
      <div
        className="flex items-center gap-1.5 p-1 rounded-xl bg-[#0C1424] border border-white/[0.07] overflow-x-auto"
        role="tablist"
        aria-label="Knowledge categories"
      >
        {HUB_TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          const count = tabCounts[tab.id] ?? 0;
          const isConflictTab = tab.id === 'Conflicts';
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveTab(tab.id)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                isActive
                  ? isConflictTab
                    ? 'bg-[#F59E0B] text-[#080D19] font-semibold'
                    : 'bg-[#3B82F6] text-white'
                  : isConflictTab && openConflictsCount > 0
                  ? 'text-[#F59E0B] hover:bg-[#F59E0B]/10'
                  : 'text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-white/[0.04]'
              }`}
            >
              {isConflictTab && <AlertTriangle className="w-3.5 h-3.5" />}
              <span>{tab.label}</span>
              <span
                className={`font-mono text-[11px] tabular-nums ${
                  isActive
                    ? isConflictTab
                      ? 'text-[#080D19]/80'
                      : 'text-white/90'
                    : isConflictTab && openConflictsCount > 0
                    ? 'text-[#F59E0B]'
                    : 'text-[#94A3B8]/70'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Open Conflicts Banner when viewing Claims tabs */}
      {activeTab !== 'Conflicts' && openConflictsCount > 0 && (
        <div className="p-4 rounded-xl bg-[#F59E0B]/[0.08] border border-[#F59E0B]/30 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 text-xs text-[#F8FAFC]">
            <ShieldAlert className="w-4 h-4 text-[#F59E0B] shrink-0" />
            <span>
              Cross-source reconciliation detected{' '}
              <strong className="text-[#F59E0B] tabular-nums">
                {openConflictsCount} open contradiction, deadline, or ownership alert{openConflictsCount === 1 ? '' : 's'}
              </strong>{' '}
              across project sources.
            </span>
          </div>
          <button
            type="button"
            onClick={() => setActiveTab('Conflicts')}
            className="text-xs font-semibold text-[#F59E0B] hover:underline cursor-pointer"
          >
            Inspect Conflicts &amp; Staleness
          </button>
        </div>
      )}

      {/* Search & Filter Bar */}
      {activeTab === 'Conflicts' ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="relative flex-1 min-w-[220px] max-w-md">
            <Search className="w-4 h-4 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              placeholder="Search conflicts, files, deadlines..."
              className="w-full bg-[#111D30] border border-white/[0.08] rounded-lg pl-9 pr-3 py-2 text-xs text-[#F8FAFC] placeholder:text-[#94A3B8]/60 focus:outline-none focus:border-[#3B82F6]"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 p-1 rounded-lg bg-[#0C1424] border border-white/[0.07]">
              {(['All', 'Open', 'Resolved', 'Dismissed'] as const).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setConflictFilter(st)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                    conflictFilter === st
                      ? 'bg-[#3B82F6] text-white'
                      : 'text-[#94A3B8] hover:text-[#F8FAFC]'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => void handleRunReconcileClick()}
              disabled={isReconciling}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-xs font-medium text-[#F8FAFC] cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isReconciling ? 'animate-spin' : ''}`} />
              <span>Re-scan Sources</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              placeholder="Search claims, owners, files..."
              className="w-full bg-[#111D30] border border-white/[0.08] rounded-lg pl-9 pr-3 py-2 text-xs text-[#F8FAFC] placeholder:text-[#94A3B8]/60 focus:outline-none focus:border-[#3B82F6]"
            />
          </div>

          <select
            aria-label="Filter by review status"
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value as 'All' | ReviewStatus)
            }
            className="bg-[#111D30] border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-[#F8FAFC] focus:outline-none focus:border-[#3B82F6]"
          >
            <option value="All">Status: All</option>
            <option value="Pending Review">Status: Pending Review</option>
            <option value="Verified">Status: Verified</option>
            <option value="Rejected">Status: Rejected</option>
          </select>

          <select
            aria-label="Filter by confidence level"
            value={confidenceFilter}
            onChange={(e) =>
              setConfidenceFilter(e.target.value as 'All' | ConfidenceLevel)
            }
            className="bg-[#111D30] border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-[#F8FAFC] focus:outline-none focus:border-[#3B82F6]"
          >
            <option value="All">Confidence: All</option>
            <option value="High">Confidence: High</option>
            <option value="Medium">Confidence: Medium</option>
            <option value="Low">Confidence: Low</option>
          </select>

          <select
            aria-label="Sort claims"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="bg-[#111D30] border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-[#F8FAFC] focus:outline-none focus:border-[#3B82F6]"
          >
            <option value="default">Sort: Extraction Order</option>
            <option value="confidence">Sort: Highest Confidence</option>
            <option value="status">Sort: Review Status</option>
            <option value="date">Sort: Most Recent Date</option>
            <option value="title">Sort: Title A–Z</option>
          </select>
        </div>
      )}

      {/* Body View: Conflicts & Staleness OR Claims */}
      {activeTab === 'Conflicts' ? (
        filteredConflicts.length === 0 ? (
          <div className="p-10 rounded-xl bg-[#111D30] border border-white/[0.07] text-center space-y-2">
            <CheckCircle2 className="w-7 h-7 text-[#22C55E] mx-auto" />
            <p className="text-sm font-medium text-[#F8FAFC]">
              No matching cross-source contradictions or staleness alerts.
            </p>
            <p className="text-xs text-[#94A3B8]">
              Click &ldquo;Re-scan Sources&rdquo; after uploading new documents to compare decisions, task statuses, dates, and owners.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredConflicts.map((conflict) => {
              const sevColor =
                conflict.severity === 'Critical'
                  ? 'text-[#EF4444]'
                  : conflict.severity === 'Warning'
                  ? 'text-[#F59E0B]'
                  : 'text-[#60A5FA]';
              const statusColor =
                conflict.status === 'Resolved'
                  ? 'text-[#22C55E]'
                  : conflict.status === 'Dismissed'
                  ? 'text-[#94A3B8]'
                  : 'text-[#F59E0B]';

              return (
                <article
                  key={conflict.id}
                  className={`p-5 rounded-xl bg-[#111D30] border space-y-4 ${
                    conflict.status === 'Open' && conflict.severity === 'Critical'
                      ? 'border-[#EF4444]/35'
                      : conflict.status === 'Open'
                      ? 'border-[#F59E0B]/30'
                      : 'border-white/[0.07] opacity-75'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex flex-wrap items-center gap-2 font-mono">
                      <span className={`font-semibold ${sevColor}`}>
                        {conflict.severity}
                      </span>
                      <span aria-hidden="true" className="text-[#94A3B8]">
                        ·
                      </span>
                      <span className="text-[#F8FAFC]">{conflict.type}</span>
                    </div>
                    <span className={`font-mono font-medium ${statusColor}`}>
                      {conflict.status}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <h2 className="font-display text-base font-semibold text-[#F8FAFC]">
                      {conflict.title}
                    </h2>
                    <p className="text-sm text-[#94A3B8] leading-relaxed">
                      {conflict.summary}
                    </p>
                  </div>

                  {/* Side-by-side Evidence Comparison */}
                  <div
                    className={`grid grid-cols-1 ${
                      conflict.excerptB ? 'lg:grid-cols-2' : ''
                    } gap-3`}
                  >
                    <div className="p-3.5 rounded-lg bg-[#080D19] border border-white/[0.07] space-y-1.5">
                      <p className="text-[11px] font-mono text-[#60A5FA]">
                        {conflict.sourceAFilename} · {conflict.sourceALocation}
                      </p>
                      <blockquote className="text-xs font-mono text-[#F8FAFC]/90 leading-relaxed">
                        &ldquo;{conflict.excerptA}&rdquo;
                      </blockquote>
                    </div>

                    {conflict.excerptB && (
                      <div className="p-3.5 rounded-lg bg-[#080D19] border border-white/[0.07] space-y-1.5">
                        <p className="text-[11px] font-mono text-[#F59E0B]">
                          {conflict.sourceBFilename} ·{' '}
                          {conflict.sourceBLocation || 'Cross-Source Evidence'}
                        </p>
                        <blockquote className="text-xs font-mono text-[#F8FAFC]/90 leading-relaxed">
                          &ldquo;{conflict.excerptB}&rdquo;
                        </blockquote>
                      </div>
                    )}
                  </div>

                  {conflict.resolvedBy && (
                    <p className="text-xs text-[#22C55E]">
                      {conflict.status} by {conflict.resolvedBy} (
                      {conflict.resolvedByRole || 'Reviewer'})
                      {conflict.resolutionNote ? ` — "${conflict.resolutionNote}"` : ''}
                    </p>
                  )}

                  {/* Resolution Controls */}
                  <div className="pt-3 border-t border-white/[0.06] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    {conflict.status === 'Open' ? (
                      <>
                        <input
                          type="text"
                          value={resolutionNotes[conflict.id] || ''}
                          onChange={(e) =>
                            setResolutionNotes((prev) => ({
                              ...prev,
                              [conflict.id]: e.target.value,
                            }))
                          }
                          placeholder="Optional resolution note (recorded in audit trail)..."
                          className="flex-1 bg-[#080D19] border border-white/[0.08] rounded-lg px-3 py-1.5 text-xs text-[#F8FAFC] placeholder:text-[#94A3B8]/60 focus:outline-none focus:border-[#3B82F6]"
                        />
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() =>
                              onUpdateConflictStatus(
                                conflict.id,
                                'Resolved',
                                resolutionNotes[conflict.id]
                              )
                            }
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#22C55E]/15 hover:bg-[#22C55E]/25 text-xs font-semibold text-[#22C55E] cursor-pointer"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Mark Resolved</span>
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              onUpdateConflictStatus(
                                conflict.id,
                                'Dismissed',
                                resolutionNotes[conflict.id]
                              )
                            }
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-xs font-medium text-[#94A3B8] hover:text-[#F8FAFC] cursor-pointer"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Dismiss</span>
                          </button>
                        </div>
                      </>
                    ) : (
                      <div className="flex items-center justify-between w-full">
                        <span className="text-xs text-[#94A3B8] font-mono tabular-nums">
                          Updated{' '}
                          {conflict.resolvedAt
                            ? new Date(conflict.resolvedAt).toLocaleString()
                            : ''}
                        </span>
                        <button
                          type="button"
                          onClick={() => onUpdateConflictStatus(conflict.id, 'Open')}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-xs font-medium text-[#F8FAFC] cursor-pointer"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Reopen Alert</span>
                        </button>
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )
      ) : claims.length === 0 ? (
        <div className="p-10 rounded-xl bg-[#111D30] border border-white/[0.07] text-center space-y-3">
          <p className="text-sm font-medium text-[#F8FAFC]">
            No knowledge extracted for {activeProject.name} yet.
          </p>
          <p className="text-xs text-[#94A3B8]">
            Go to Sources and click &ldquo;Generate Project Intelligence&rdquo; to analyze your project documents with Gemini + citation verification.
          </p>
          <button
            type="button"
            onClick={() => onNavigate('sources')}
            className="px-4 py-2 rounded-lg bg-[#3B82F6] hover:bg-[#2563EB] text-xs font-semibold text-white cursor-pointer"
          >
            Go to Sources
          </button>
        </div>
      ) : filteredClaims.length === 0 ? (
        <div className="p-8 rounded-xl bg-[#111D30] border border-white/[0.07] text-center text-sm text-[#94A3B8]">
          No claims match the active filters.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredClaims.map((claim) => {
            const title = claim.editedTitle ?? claim.originalTitle;
            const desc = claim.editedDescription ?? claim.originalDescription;
            const isEdited =
              claim.editedTitle !== null || claim.editedDescription !== null;
            const quoteVerified =
              claim.citationVerified !== false &&
              claim.evidenceExcerpt !== 'No supporting evidence found.';

            return (
              <article
                key={claim.id}
                className={`p-5 rounded-xl bg-[#111D30] border border-white/[0.07] flex flex-col justify-between gap-4 ${
                  claim.reviewStatus === 'Rejected' ? 'opacity-65' : ''
                }`}
              >
                <div className="space-y-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2">
                      <CategoryIcon category={claim.category} />
                      <CategoryLabel category={claim.category} />
                      {claim.taskStatus && (
                        <>
                          <span aria-hidden="true" className="text-[#94A3B8]">
                            ·
                          </span>
                          <span className="text-[#94A3B8]">
                            {claim.taskStatus}
                          </span>
                        </>
                      )}
                      {isEdited && (
                        <>
                          <span aria-hidden="true" className="text-[#94A3B8]">
                            ·
                          </span>
                          <span className="text-[#60A5FA]">Human-Edited</span>
                        </>
                      )}
                    </div>
                    <ReviewStatusIndicator status={claim.reviewStatus} />
                  </div>

                  <h2 className="font-display text-base font-semibold text-[#F8FAFC] leading-snug">
                    {title}
                  </h2>

                  <p className="text-sm text-[#94A3B8] leading-relaxed">
                    {desc}
                  </p>
                </div>

                <div className="pt-3.5 border-t border-white/[0.06] flex flex-wrap items-center justify-between gap-3">
                  <div className="space-y-0.5 text-xs text-[#94A3B8] min-w-0">
                    <div className="flex items-center gap-1.5 font-mono truncate">
                      <FileText className="w-3.5 h-3.5 text-[#60A5FA] shrink-0" />
                      <span className="truncate">{claim.sourceFilename}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-[11px]">
                      <span>{claim.sourceLocation}</span>
                      <span aria-hidden="true">·</span>
                      <ConfidenceIndicator confidence={claim.confidence} />
                      <span aria-hidden="true">·</span>
                      {quoteVerified ? (
                        <span className="inline-flex items-center gap-1 text-[#22C55E]">
                          <ShieldCheck className="w-3 h-3" />
                          Quote Verified
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[#EF4444]">
                          <AlertTriangle className="w-3 h-3" />
                          Unverified Quote
                        </span>
                      )}
                      {claim.owner && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span>Owner: {claim.owner}</span>
                        </>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => onInspectEvidence(claim)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.06] hover:bg-[#3B82F6]/20 hover:text-[#60A5FA] text-xs font-medium text-[#F8FAFC] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>View Evidence</span>
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};
