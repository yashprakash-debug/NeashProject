import React, { useMemo, useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  Edit3,
  Eye,
  RotateCcw,
  Save,
  X,
  XCircle,
} from 'lucide-react';
import { ALL_CLAIM_CATEGORIES } from '../data/demoData';
import {
  ClaimCategory,
  ExtractedClaim,
  NavRoute,
  Project,
  ReviewStatus,
} from '../types/neash';
import {
  CategoryLabel,
  ConfidenceIndicator,
  ReviewStatusIndicator,
} from './StatusSignals';

interface VerificationCenterPageProps {
  activeProject: Project | undefined;
  claims: ExtractedClaim[];
  onAcceptClaim: (claimId: string) => void;
  onRejectClaim: (claimId: string) => void;
  onReopenClaim: (claimId: string) => void;
  onEditClaim: (
    claimId: string,
    editedTitle: string,
    editedDescription: string,
    reviewerNote: string,
    markVerified: boolean
  ) => void;
  onInspectEvidence: (claim: ExtractedClaim) => void;
  onNavigate?: (route: NavRoute) => void;
}

export const VerificationCenterPage: React.FC<VerificationCenterPageProps> = ({
  activeProject,
  claims,
  onAcceptClaim,
  onRejectClaim,
  onReopenClaim,
  onEditClaim,
  onInspectEvidence,
  onNavigate,
}) => {
  const [statusFilter, setStatusFilter] = useState<'All' | ReviewStatus>(
    'All'
  );
  const [categoryFilter, setCategoryFilter] = useState<'All' | ClaimCategory>(
    'All'
  );
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState('');
  const [draftDesc, setDraftDesc] = useState('');
  const [draftNote, setDraftNote] = useState('');

  // Dynamic live counts calculated strictly from state
  const totalCount = claims.length;
  const verifiedCount = claims.filter(
    (c) => c.reviewStatus === 'Verified'
  ).length;
  const pendingCount = claims.filter(
    (c) => c.reviewStatus === 'Pending Review'
  ).length;
  const rejectedCount = claims.filter(
    (c) => c.reviewStatus === 'Rejected'
  ).length;

  const filtered = useMemo(() => {
    return claims.filter((c) => {
      if (statusFilter !== 'All' && c.reviewStatus !== statusFilter) return false;
      if (categoryFilter !== 'All' && c.category !== categoryFilter) return false;
      return true;
    });
  }, [claims, statusFilter, categoryFilter]);

  const startEditing = (claim: ExtractedClaim) => {
    setEditingId(claim.id);
    setDraftTitle(claim.editedTitle ?? claim.originalTitle);
    setDraftDesc(claim.editedDescription ?? claim.originalDescription);
    setDraftNote(claim.reviewerNote ?? '');
  };

  const cancelEditing = () => {
    setEditingId(null);
    setDraftTitle('');
    setDraftDesc('');
    setDraftNote('');
  };

  if (!activeProject) {
    return (
      <div className="p-8 rounded-xl bg-[#111D30] border border-white/[0.07] text-center text-sm text-[#94A3B8]">
        Select a project to review extracted claims.
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
            <span aria-hidden="true">·</span>
            <span>Human-in-the-Loop Verification</span>
          </div>
          <h1 className="font-display text-2xl font-bold text-[#F8FAFC] mt-1">
            Verification Center
          </h1>
          <p className="text-sm text-[#94A3B8] mt-1">
            Accept, edit, reject, or reopen claims. Original AI-extracted text remains preserved separately from human revisions.
          </p>
        </div>

        {onNavigate && (
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => onNavigate('first-day')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#111D30] hover:bg-[#16243B] border border-white/[0.08] text-xs font-medium text-[#F8FAFC] transition-colors whitespace-nowrap cursor-pointer"
            >
              <span>Your First Day</span>
              <ArrowRight className="w-3.5 h-3.5 text-[#60A5FA]" />
            </button>
            <button
              type="button"
              onClick={() => onNavigate('reports')}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-gradient-to-r from-[#2563EB] to-[#3B82F6] hover:from-[#1D4ED8] hover:to-[#2563EB] text-xs font-semibold text-white shadow-md shadow-[#3B82F6]/25 ring-1 ring-[#60A5FA]/40 transition-all whitespace-nowrap cursor-pointer"
            >
              <span>Generate Handover</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Live Verification Progress Summary */}
      <section className="p-5 rounded-xl bg-[#111D30] border border-white/[0.07] space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3 text-sm font-mono tabular-nums">
            <span className="text-[#F8FAFC] font-semibold">
              {totalCount} claims extracted
            </span>
            <span aria-hidden="true" className="text-[#94A3B8]">
              ·
            </span>
            <span className="text-[#22C55E]">{verifiedCount} verified</span>
            <span aria-hidden="true" className="text-[#94A3B8]">
              ·
            </span>
            <span className="text-[#F59E0B]">{pendingCount} pending</span>
            <span aria-hidden="true" className="text-[#94A3B8]">
              ·
            </span>
            <span className="text-[#EF4444]">{rejectedCount} rejected</span>
          </div>

          <span className="text-xs text-[#94A3B8]">
            Only Verified claims are promoted to confirmed Handover Report facts.
          </span>
        </div>

        {totalCount > 0 && (
          <div className="h-2 w-full rounded-md bg-[#080D19] overflow-hidden flex">
            <div
              style={{ width: `${(verifiedCount / totalCount) * 100}%` }}
              className="bg-[#22C55E] h-full transition-all"
            />
            <div
              style={{ width: `${(pendingCount / totalCount) * 100}%` }}
              className="bg-[#F59E0B]/70 h-full transition-all"
            />
            <div
              style={{ width: `${(rejectedCount / totalCount) * 100}%` }}
              className="bg-[#EF4444]/80 h-full transition-all"
            />
          </div>
        )}
      </section>

      {/* Filter Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1 p-1 rounded-lg bg-[#0C1424] border border-white/[0.07]">
          {(['All', 'Pending Review', 'Verified', 'Rejected'] as const).map(
            (st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                  statusFilter === st
                    ? 'bg-[#3B82F6] text-white'
                    : 'text-[#94A3B8] hover:text-[#F8FAFC]'
                }`}
              >
                {st}
              </button>
            )
          )}
        </div>

        <select
          aria-label="Filter claims by category"
          value={categoryFilter}
          onChange={(e) =>
            setCategoryFilter(e.target.value as 'All' | ClaimCategory)
          }
          className="bg-[#111D30] border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-[#F8FAFC] focus:outline-none focus:border-[#3B82F6]"
        >
          <option value="All">All Categories</option>
          {ALL_CLAIM_CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      </div>

      {/* Claims Review Queue */}
      {filtered.length === 0 ? (
        <div className="p-8 rounded-xl bg-[#111D30] border border-white/[0.07] text-center text-sm text-[#94A3B8]">
          No claims match the selected status or category filter.
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((claim) => {
            const isEditing = editingId === claim.id;
            const hasHumanEdit =
              claim.editedTitle !== null || claim.editedDescription !== null;

            return (
              <article
                key={claim.id}
                className="p-5 rounded-xl bg-[#111D30] border border-white/[0.07] space-y-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex flex-wrap items-center gap-2 text-[#94A3B8]">
                    <CategoryLabel category={claim.category} />
                    <span aria-hidden="true">·</span>
                    <span className="font-mono">{claim.sourceFilename}</span>
                    <span aria-hidden="true">·</span>
                    <span>{claim.sourceLocation}</span>
                    <span aria-hidden="true">·</span>
                    <ConfidenceIndicator confidence={claim.confidence} />
                  </div>
                  <ReviewStatusIndicator status={claim.reviewStatus} />
                </div>

                {/* Original AI Claim vs Human-Edited Claim */}
                {isEditing ? (
                  <div className="space-y-3 pt-2 border-t border-white/[0.06]">
                    <div className="p-3 rounded-lg bg-[#080D19] border border-white/[0.06] text-xs text-[#94A3B8]">
                      <span className="font-medium text-[#F8FAFC]">
                        Original Extracted Claim (Preserved):
                      </span>{' '}
                      {claim.originalTitle} — {claim.originalDescription}
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-[#94A3B8] mb-1">
                        Human-Edited Title
                      </label>
                      <input
                        type="text"
                        value={draftTitle}
                        onChange={(e) => setDraftTitle(e.target.value)}
                        className="w-full bg-[#080D19] border border-white/[0.12] rounded-lg px-3 py-2 text-sm text-[#F8FAFC] focus:outline-none focus:border-[#3B82F6]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-[#94A3B8] mb-1">
                        Human-Edited Description
                      </label>
                      <textarea
                        rows={3}
                        value={draftDesc}
                        onChange={(e) => setDraftDesc(e.target.value)}
                        className="w-full bg-[#080D19] border border-white/[0.12] rounded-lg px-3 py-2 text-sm text-[#F8FAFC] focus:outline-none focus:border-[#3B82F6]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-[#94A3B8] mb-1">
                        Reviewer Note (Optional)
                      </label>
                      <input
                        type="text"
                        value={draftNote}
                        onChange={(e) => setDraftNote(e.target.value)}
                        placeholder="Context or rationale for edit..."
                        className="w-full bg-[#080D19] border border-white/[0.12] rounded-lg px-3 py-2 text-xs text-[#F8FAFC] focus:outline-none focus:border-[#3B82F6]"
                      />
                    </div>

                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          onEditClaim(
                            claim.id,
                            draftTitle.trim() || claim.originalTitle,
                            draftDesc.trim() || claim.originalDescription,
                            draftNote.trim(),
                            true
                          );
                          cancelEditing();
                        }}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#22C55E] hover:bg-[#16A34A] text-xs font-semibold text-[#080D19] cursor-pointer"
                      >
                        <Save className="w-3.5 h-3.5" />
                        <span>Save Edit & Verify</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          onEditClaim(
                            claim.id,
                            draftTitle.trim() || claim.originalTitle,
                            draftDesc.trim() || claim.originalDescription,
                            draftNote.trim(),
                            false
                          );
                          cancelEditing();
                        }}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#3B82F6] hover:bg-[#2563EB] text-xs font-semibold text-white cursor-pointer"
                      >
                        <span>Save Edit Only</span>
                      </button>
                      <button
                        type="button"
                        onClick={cancelEditing}
                        className="inline-flex items-center gap-1 px-3 py-2 rounded-lg text-xs text-[#94A3B8] hover:text-[#F8FAFC] cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Cancel</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {hasHumanEdit ? (
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-2 border-t border-white/[0.06]">
                        <div className="space-y-1">
                          <p className="text-[11px] font-medium text-[#94A3B8]">
                            Original AI-Extracted Claim
                          </p>
                          <h2 className="text-sm font-medium text-[#94A3B8] line-through">
                            {claim.originalTitle}
                          </h2>
                          <p className="text-xs text-[#94A3B8]/80 leading-relaxed">
                            {claim.originalDescription}
                          </p>
                        </div>

                        <div className="space-y-1">
                          <p className="text-[11px] font-medium text-[#60A5FA]">
                            Human-Edited Claim (Active)
                          </p>
                          <h2 className="text-sm font-semibold text-[#F8FAFC]">
                            {claim.editedTitle ?? claim.originalTitle}
                          </h2>
                          <p className="text-sm text-[#F8FAFC]/90 leading-relaxed">
                            {claim.editedDescription ??
                              claim.originalDescription}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <h2 className="font-display text-base font-semibold text-[#F8FAFC]">
                          {claim.originalTitle}
                        </h2>
                        <p className="text-sm text-[#94A3B8] leading-relaxed">
                          {claim.originalDescription}
                        </p>
                      </div>
                    )}

                    {claim.reviewerNote && (
                      <p className="text-xs text-[#94A3B8] italic">
                        Reviewer note: {claim.reviewerNote}
                      </p>
                    )}

                    {/* Action Bar */}
                    <div className="pt-3 border-t border-white/[0.06] flex flex-wrap items-center justify-between gap-3">
                      <div className="flex flex-wrap items-center gap-2">
                        {claim.reviewStatus !== 'Verified' && (
                          <button
                            type="button"
                            onClick={() => onAcceptClaim(claim.id)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#22C55E]/15 hover:bg-[#22C55E]/25 text-xs font-semibold text-[#22C55E] transition-colors cursor-pointer"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Accept</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => startEditing(claim)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] text-xs font-medium text-[#F8FAFC] transition-colors cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </button>
                        {claim.reviewStatus !== 'Rejected' && (
                          <button
                            type="button"
                            onClick={() => onRejectClaim(claim.id)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#EF4444]/15 hover:bg-[#EF4444]/25 text-xs font-semibold text-[#EF4444] transition-colors cursor-pointer"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Reject</span>
                          </button>
                        )}
                        {claim.reviewStatus !== 'Pending Review' && (
                          <button
                            type="button"
                            onClick={() => onReopenClaim(claim.id)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-xs font-medium text-[#94A3B8] hover:text-[#F8FAFC] transition-colors cursor-pointer"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Reopen</span>
                          </button>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => onInspectEvidence(claim)}
                        className="inline-flex items-center gap-1.5 text-xs font-medium text-[#60A5FA] hover:underline cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>View Evidence</span>
                      </button>
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};
