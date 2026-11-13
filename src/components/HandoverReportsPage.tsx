import React from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  FileText,
  Printer,
  RefreshCw,
} from 'lucide-react';
import {
  ExtractedClaim,
  HandoverReportSnapshot,
  NavRoute,
  Project,
} from '../types/neash';
import { downloadHandoverPdf } from '../utils/pdfGenerator';

interface HandoverReportsPageProps {
  activeProject: Project | undefined;
  projectClaims: ExtractedClaim[];
  currentReport: HandoverReportSnapshot | undefined;
  onGenerateReport: () => void;
  onPdfDownloaded?: () => void;
  onNavigate: (route: NavRoute) => void;
}

const ClaimSectionList: React.FC<{
  claims: ExtractedClaim[];
  emptyText: string;
}> = ({ claims, emptyText }) => {
  if (claims.length === 0) {
    return <p className="text-xs text-[#94A3B8] italic">{emptyText}</p>;
  }

  return (
    <ul className="space-y-3">
      {claims.map((claim) => {
        const title = claim.editedTitle ?? claim.originalTitle;
        const desc = claim.editedDescription ?? claim.originalDescription;
        const wasEdited =
          claim.editedTitle !== null || claim.editedDescription !== null;

        return (
          <li
            key={claim.id}
            className="pb-3 border-b border-white/[0.06] last:border-b-0 last:pb-0 space-y-1"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-[#F8FAFC]">{title}</p>
              <div className="flex items-center gap-2 text-[11px] font-mono text-[#94A3B8]">
                {wasEdited && (
                  <span className="text-[#60A5FA]">Human-Edited</span>
                )}
                {claim.date && <span className="tabular-nums">{claim.date}</span>}
              </div>
            </div>
            <p className="text-xs text-[#94A3B8] leading-relaxed">{desc}</p>
            <p className="text-[11px] font-mono text-[#94A3B8]/80">
              Reference: {claim.sourceFilename} · {claim.sourceLocation}
              {claim.owner ? ` · Owner: ${claim.owner}` : ''}
            </p>
          </li>
        );
      })}
    </ul>
  );
};

export const HandoverReportsPage: React.FC<HandoverReportsPageProps> = ({
  activeProject,
  projectClaims,
  currentReport,
  onGenerateReport,
  onPdfDownloaded,
  onNavigate,
}) => {
  if (!activeProject) {
    return (
      <div className="p-8 rounded-xl bg-[#111D30] border border-white/[0.07] text-center text-sm text-[#94A3B8]">
        Select a project to generate a handover report.
      </div>
    );
  }

  const liveVerifiedCount = projectClaims.filter(
    (c) => c.reviewStatus === 'Verified'
  ).length;
  const livePendingCount = projectClaims.filter(
    (c) => c.reviewStatus === 'Pending Review'
  ).length;
  const liveRejectedCount = projectClaims.filter(
    (c) => c.reviewStatus === 'Rejected'
  ).length;

  const isStale =
    Boolean(currentReport) &&
    (currentReport!.stats.verifiedCount !== liveVerifiedCount ||
      currentReport!.stats.pendingCount !== livePendingCount ||
      currentReport!.stats.rejectedCount !== liveRejectedCount ||
      currentReport!.projectName !== activeProject.name);

  // Partition report claims strictly by rules
  const verified = currentReport?.verifiedClaims ?? [];
  const decisions = verified.filter((c) => c.category === 'Decision');
  const completedTasks = verified.filter(
    (c) =>
      (c.category === 'Task' && c.taskStatus === 'Completed') ||
      c.category === 'Milestone'
  );
  const pendingTasks = verified.filter(
    (c) => c.category === 'Task' && c.taskStatus !== 'Completed'
  );
  const blockers = verified.filter((c) => c.category === 'Blocker');
  const risks = verified.filter((c) => c.category === 'Risk');
  const gaps = verified.filter((c) => c.category === 'Knowledge Gap');
  const nextActions = verified.filter((c) => c.category === 'Next Action');

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-white/[0.07] no-print">
        <div>
          <div className="flex items-center gap-2 text-xs text-[#94A3B8]">
            <span>{activeProject.name}</span>
            <span aria-hidden="true">·</span>
            <span>Handover Report Generator</span>
          </div>
          <h1 className="font-display text-2xl font-bold text-[#F8FAFC] mt-1">
            Handover Reports
          </h1>
          <p className="text-sm text-[#94A3B8] mt-1">
            Compile verified project knowledge into an auditable handover document and downloadable PDF.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {!currentReport ? (
            <button
              type="button"
              onClick={onGenerateReport}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-gradient-to-r from-[#2563EB] to-[#3B82F6] hover:from-[#1D4ED8] hover:to-[#2563EB] text-sm font-semibold text-white shadow-lg shadow-[#3B82F6]/30 ring-1 ring-[#60A5FA]/50 transition-all whitespace-nowrap cursor-pointer"
            >
              <FileText className="w-4 h-4" />
              <span>Generate Project Handover</span>
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={onGenerateReport}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#111D30] hover:bg-[#16243B] border border-white/[0.08] text-xs font-medium text-[#F8FAFC] transition-colors whitespace-nowrap cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5 text-[#60A5FA]" />
                <span>Regenerate Report</span>
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#111D30] hover:bg-[#16243B] border border-white/[0.08] text-xs font-medium text-[#F8FAFC] transition-colors whitespace-nowrap cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  downloadHandoverPdf(currentReport);
                  onPdfDownloaded?.();
                }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-[#2563EB] to-[#3B82F6] hover:from-[#1D4ED8] hover:to-[#2563EB] text-xs font-semibold text-white shadow-md shadow-[#3B82F6]/25 ring-1 ring-[#60A5FA]/40 transition-all whitespace-nowrap cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download PDF</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Live state vs snapshot notice */}
      {isStale && (
        <div className="p-4 rounded-xl bg-[#F59E0B]/10 border border-[#F59E0B]/30 flex flex-wrap items-center justify-between gap-3 no-print">
          <div className="flex items-center gap-2 text-xs text-[#F59E0B]">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>
              Verification state has changed since this report was generated ({liveVerifiedCount} verified, {livePendingCount} pending, {liveRejectedCount} rejected).
            </span>
          </div>
          <button
            type="button"
            onClick={onGenerateReport}
            className="text-xs font-semibold text-[#F8FAFC] hover:underline cursor-pointer"
          >
            Regenerate Report Now
          </button>
        </div>
      )}

      {/* Pre-generation Prompt */}
      {!currentReport ? (
        <section className="p-10 rounded-xl bg-[#111D30] border border-[#3B82F6]/40 text-center space-y-5">
          <div className="w-12 h-12 rounded-xl bg-[#3B82F6]/15 border border-[#3B82F6]/30 flex items-center justify-center mx-auto">
            <FileText className="w-6 h-6 text-[#60A5FA]" />
          </div>
          <div className="space-y-1.5 max-w-lg mx-auto">
            <h2 className="font-display text-lg font-semibold text-[#F8FAFC]">
              Ready to Compile Handover for {activeProject.name}
            </h2>
            <p className="text-sm text-[#94A3B8]">
              Current state: <strong className="text-[#22C55E] tabular-nums">{liveVerifiedCount} verified</strong>,{' '}
              <strong className="text-[#F59E0B] tabular-nums">{livePendingCount} pending review</strong>, and{' '}
              <strong className="text-[#EF4444] tabular-nums">{liveRejectedCount} rejected</strong> (excluded).
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
            <button
              type="button"
              onClick={onGenerateReport}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-gradient-to-r from-[#2563EB] to-[#3B82F6] hover:from-[#1D4ED8] hover:to-[#2563EB] text-sm font-semibold text-white shadow-lg shadow-[#3B82F6]/30 ring-1 ring-[#60A5FA]/50 transition-all cursor-pointer"
            >
              <FileText className="w-4 h-4" />
              <span>Generate Project Handover</span>
            </button>
            {livePendingCount > 0 && (
              <button
                type="button"
                onClick={() => onNavigate('verification')}
                className="px-4 py-2.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-xs font-medium text-[#F8FAFC] cursor-pointer"
              >
                Review {livePendingCount} Pending Claims First
              </button>
            )}
          </div>
        </section>
      ) : (
        /* Structured 10-Section Report Document Preview */
        <article className="p-6 sm:p-8 rounded-xl bg-[#111D30] border border-white/[0.08] space-y-8 print-only-container">
          {/* Document Header */}
          <header className="pb-6 border-b border-white/[0.08] space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#94A3B8]">
              <span className="font-mono text-[#60A5FA]">
                NEASH HANDOVER RECORD
              </span>
              <span className="font-mono tabular-nums">
                Generated: {new Date(currentReport.generatedAt).toLocaleString()}
              </span>
            </div>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#F8FAFC]">
              {currentReport.projectName}
            </h2>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#94A3B8]">
              <span>Team: {currentReport.team}</span>
              <span aria-hidden="true">·</span>
              <span>Outgoing: {currentReport.previousOwner}</span>
              <span aria-hidden="true">·</span>
              <span>Incoming: {currentReport.incomingOwner}</span>
              <span aria-hidden="true">·</span>
              <span>Status: {currentReport.projectStatus}</span>
            </div>

            <div className="pt-2 flex flex-wrap items-center gap-4 text-xs font-mono tabular-nums">
              <span className="inline-flex items-center gap-1.5 text-[#22C55E]">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {currentReport.stats.verifiedCount} Verified Facts
              </span>
              <span className="text-[#F59E0B]">
                {currentReport.stats.pendingCount} Unverified (Separated)
              </span>
              <span className="text-[#94A3B8]">
                {currentReport.rejectedCount} Rejected (Excluded)
              </span>
            </div>
          </header>

          {/* 1. Project Overview */}
          <section className="space-y-2">
            <h3 className="font-display text-base font-semibold text-[#F8FAFC]">
              01. Project Overview
            </h3>
            <p className="text-sm text-[#94A3B8] leading-relaxed">
              {currentReport.projectDescription}
            </p>
          </section>

          {/* 2. Project Status */}
          <section className="space-y-2 pt-4 border-t border-white/[0.06]">
            <h3 className="font-display text-base font-semibold text-[#F8FAFC]">
              02. Project Status
            </h3>
            <p className="text-sm text-[#94A3B8] leading-relaxed">
              Current Status: <strong className="text-[#F8FAFC]">{currentReport.projectStatus}</strong>. Transitioning ownership from{' '}
              <strong className="text-[#F8FAFC]">{currentReport.previousOwner}</strong> to{' '}
              <strong className="text-[#60A5FA]">{currentReport.incomingOwner}</strong> across{' '}
              <span className="font-mono tabular-nums">{currentReport.stats.sourcesCount}</span> ingested source documents.
            </p>
          </section>

          {/* 3. Important Decisions */}
          <section className="space-y-3 pt-4 border-t border-white/[0.06]">
            <h3 className="font-display text-base font-semibold text-[#F8FAFC]">
              03. Important Decisions (Verified)
            </h3>
            <ClaimSectionList
              claims={decisions}
              emptyText="No verified decisions recorded yet."
            />
          </section>

          {/* 4. Completed Tasks */}
          <section className="space-y-3 pt-4 border-t border-white/[0.06]">
            <h3 className="font-display text-base font-semibold text-[#F8FAFC]">
              04. Completed Tasks & Milestones (Verified)
            </h3>
            <ClaimSectionList
              claims={completedTasks}
              emptyText="No verified completed tasks or milestones recorded yet."
            />
          </section>

          {/* 5. Pending Tasks */}
          <section className="space-y-3 pt-4 border-t border-white/[0.06]">
            <h3 className="font-display text-base font-semibold text-[#F8FAFC]">
              05. Pending Tasks (Verified)
            </h3>
            <ClaimSectionList
              claims={pendingTasks}
              emptyText="No verified pending tasks recorded yet."
            />
          </section>

          {/* 6. Current Blockers */}
          <section className="space-y-3 pt-4 border-t border-white/[0.06]">
            <h3 className="font-display text-base font-semibold text-[#F8FAFC]">
              06. Current Blockers (Verified)
            </h3>
            <ClaimSectionList
              claims={blockers}
              emptyText="No verified blockers recorded."
            />
          </section>

          {/* 7. Risks and Dependencies */}
          <section className="space-y-3 pt-4 border-t border-white/[0.06]">
            <h3 className="font-display text-base font-semibold text-[#F8FAFC]">
              07. Risks and Dependencies (Verified)
            </h3>
            <ClaimSectionList
              claims={risks}
              emptyText="No verified risks or external dependencies recorded."
            />
          </section>

          {/* 8. Knowledge Gaps */}
          <section className="space-y-3 pt-4 border-t border-white/[0.06]">
            <h3 className="font-display text-base font-semibold text-[#F8FAFC]">
              08. Knowledge Gaps (Verified)
            </h3>
            <ClaimSectionList
              claims={gaps}
              emptyText="No verified knowledge gaps recorded."
            />
          </section>

          {/* 9. Incoming Member First-Day Action Plan */}
          <section className="space-y-3 pt-4 border-t border-white/[0.06]">
            <h3 className="font-display text-base font-semibold text-[#F8FAFC]">
              09. Incoming Member First-Day Action Plan (Verified)
            </h3>
            <ClaimSectionList
              claims={nextActions}
              emptyText="Verify Next Action items in the Verification Center to include them here."
            />
          </section>

          {/* 10. Evidence & Source References + Unverified Appendix */}
          <section className="space-y-4 pt-4 border-t border-white/[0.06]">
            <h3 className="font-display text-base font-semibold text-[#F8FAFC]">
              10. Evidence, Source References & Unverified Claims
            </h3>

            <div className="p-4 rounded-xl bg-[#080D19] border border-[#F59E0B]/30 space-y-3">
              <div>
                <p className="text-xs font-semibold text-[#F59E0B]">
                  Unverified Claims Pending Human Review ({currentReport.pendingClaims.length})
                </p>
                <p className="text-xs text-[#94A3B8] mt-0.5">
                  The items below have not yet been accepted by a reviewer and are explicitly separated from confirmed handover facts.
                </p>
              </div>
              <ClaimSectionList
                claims={currentReport.pendingClaims}
                emptyText="All extracted claims have been reviewed."
              />
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold text-[#F8FAFC]">
                Ingested Source Documents ({currentReport.sources.length})
              </p>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono text-[#94A3B8]">
                {currentReport.sources.map((src) => (
                  <li key={src.id} className="truncate">
                    • {src.name} ({src.format}) —{' '}
                    {src.origin === 'demo' ? 'DEMO DATA' : 'Uploaded'}
                  </li>
                ))}
              </ul>
            </div>
          </section>
        </article>
      )}
    </div>
  );
};
