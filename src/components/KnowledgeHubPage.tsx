import React, { useMemo, useState } from 'react';
import { Eye, FileText, Search } from 'lucide-react';
import {
  ClaimCategory,
  ConfidenceLevel,
  ExtractedClaim,
  NavRoute,
  Project,
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
  globalSearchQuery: string;
  onInspectEvidence: (claim: ExtractedClaim) => void;
  onNavigate: (route: NavRoute) => void;
}

type HubTab =
  | 'All'
  | 'Decision'
  | 'Task'
  | 'Blocker'
  | 'Risk'
  | 'Milestone'
  | 'Knowledge Gap'
  | 'Next Action';

const HUB_TABS: Array<{ id: HubTab; label: string }> = [
  { id: 'All', label: 'All' },
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
  globalSearchQuery,
  onInspectEvidence,
  onNavigate,
}) => {
  const [activeTab, setActiveTab] = useState<HubTab>('All');
  const [localSearch, setLocalSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | ReviewStatus>('All');
  const [confidenceFilter, setConfidenceFilter] = useState<
    'All' | ConfidenceLevel
  >('All');
  const [sortBy, setSortBy] = useState<SortOption>('default');

  const effectiveSearch = (localSearch || globalSearchQuery).trim().toLowerCase();

  const tabCounts = useMemo(() => {
    const counts: Record<string, number> = { All: claims.length };
    for (const c of claims) {
      counts[c.category] = (counts[c.category] ?? 0) + 1;
    }
    return counts;
  }, [claims]);

  const filteredClaims = useMemo(() => {
    const list = claims.filter((c) => {
      if (activeTab !== 'All' && c.category !== (activeTab as ClaimCategory)) {
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
            Structured project claims extracted from ingested sources with direct evidence citations.
          </p>
        </div>

        <button
          type="button"
          onClick={() => onNavigate('verification')}
          className="px-4 py-2 rounded-lg bg-[#111D30] hover:bg-[#16243B] border border-white/[0.08] text-xs font-medium text-[#60A5FA] whitespace-nowrap cursor-pointer"
        >
          Open Verification Center
        </button>
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
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveTab(tab.id)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                isActive
                  ? 'bg-[#3B82F6] text-white'
                  : 'text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-white/[0.04]'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`font-mono text-[11px] tabular-nums ${
                  isActive ? 'text-white/90' : 'text-[#94A3B8]/70'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Search, Filter & Sort Controls */}
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

      {/* Claims List */}
      {claims.length === 0 ? (
        <div className="p-10 rounded-xl bg-[#111D30] border border-white/[0.07] text-center space-y-3">
          <p className="text-sm font-medium text-[#F8FAFC]">
            No knowledge extracted for {activeProject.name} yet.
          </p>
          <p className="text-xs text-[#94A3B8]">
            Go to Sources and click &ldquo;Generate Project Intelligence&rdquo; to analyze your project documents.
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
