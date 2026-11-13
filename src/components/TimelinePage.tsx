import React, { useMemo } from 'react';
import { Calendar, Eye } from 'lucide-react';
import { ExtractedClaim, Project } from '../types/neash';
import {
  CategoryIcon,
  CategoryLabel,
  ReviewStatusIndicator,
} from './StatusSignals';

interface TimelinePageProps {
  activeProject: Project | undefined;
  claims: ExtractedClaim[];
  onInspectEvidence: (claim: ExtractedClaim) => void;
}

export const TimelinePage: React.FC<TimelinePageProps> = ({
  activeProject,
  claims,
  onInspectEvidence,
}) => {
  const { datedClaims, undatedClaims } = useMemo(() => {
    const activeClaims = claims.filter((c) => c.reviewStatus !== 'Rejected');
    const dated = activeClaims
      .filter((c) => Boolean(c.date))
      .sort((a, b) => (a.date ?? '').localeCompare(b.date ?? ''));
    const undated = activeClaims.filter((c) => !c.date);
    return { datedClaims: dated, undatedClaims: undated };
  }, [claims]);

  if (!activeProject) {
    return (
      <div className="p-8 rounded-xl bg-[#111D30] border border-white/[0.07] text-center text-sm text-[#94A3B8]">
        Select a project to view its timeline.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="pb-5 border-b border-white/[0.07]">
        <div className="flex items-center gap-2 text-xs text-[#94A3B8]">
          <span>{activeProject.name}</span>
          <span aria-hidden="true">·</span>
          <span>Chronological Record</span>
        </div>
        <h1 className="font-display text-2xl font-bold text-[#F8FAFC] mt-1">
          Project Timeline
        </h1>
        <p className="text-sm text-[#94A3B8] mt-1">
          Milestones, decisions, blockers, and scheduled task deadlines plotted strictly from dates documented in sources.
        </p>
      </div>

      {datedClaims.length === 0 ? (
        <div className="p-8 rounded-xl bg-[#111D30] border border-white/[0.07] text-center text-sm text-[#94A3B8]">
          No dated events extracted yet for {activeProject.name}.
        </div>
      ) : (
        <div className="relative pl-6 sm:pl-8 space-y-5 before:content-[''] before:absolute before:left-2.5 sm:before:left-3.5 before:top-2 before:bottom-2 before:w-px before:bg-white/[0.1]">
          {datedClaims.map((claim) => {
            const title = claim.editedTitle ?? claim.originalTitle;
            const desc = claim.editedDescription ?? claim.originalDescription;
            return (
              <div key={claim.id} className="relative">
                {/* Timeline Node */}
                <span
                  aria-hidden="true"
                  className="absolute -left-[22px] sm:-left-[26px] top-5 w-3 h-3 rounded-full bg-[#3B82F6] ring-4 ring-[#080D19]"
                />
                <div className="p-5 rounded-xl bg-[#111D30] border border-white/[0.07] space-y-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 font-mono font-semibold text-[#60A5FA] tabular-nums">
                        <Calendar className="w-3.5 h-3.5" />
                        {claim.date}
                      </span>
                      <span aria-hidden="true" className="text-[#94A3B8]">
                        ·
                      </span>
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
                    </div>
                    <ReviewStatusIndicator status={claim.reviewStatus} />
                  </div>

                  <h2 className="font-display text-base font-semibold text-[#F8FAFC]">
                    {title}
                  </h2>
                  <p className="text-sm text-[#94A3B8] leading-relaxed">
                    {desc}
                  </p>

                  <div className="pt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-[#94A3B8]">
                    <span className="font-mono">
                      {claim.sourceFilename} · {claim.sourceLocation}
                    </span>
                    <button
                      type="button"
                      onClick={() => onInspectEvidence(claim)}
                      className="inline-flex items-center gap-1 text-[#60A5FA] hover:underline cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>View Evidence</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {undatedClaims.length > 0 && (
        <section className="p-5 rounded-xl bg-[#111D30] border border-white/[0.07] space-y-3">
          <h2 className="font-display text-sm font-semibold text-[#F8FAFC]">
            Undated Knowledge Items ({undatedClaims.length})
          </h2>
          <p className="text-xs text-[#94A3B8]">
            These items had no explicit date in their source document and are listed separately without inventing timestamps.
          </p>
          <div className="divide-y divide-white/[0.06] border-t border-white/[0.06]">
            {undatedClaims.map((c) => (
              <div
                key={c.id}
                className="py-3 flex flex-wrap items-center justify-between gap-3 text-xs"
              >
                <div className="space-y-0.5">
                  <p className="font-medium text-[#F8FAFC]">
                    {c.editedTitle ?? c.originalTitle}
                  </p>
                  <p className="text-[#94A3B8]">
                    {c.category} · {c.sourceFilename} ({c.sourceLocation})
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onInspectEvidence(c)}
                  className="text-[#60A5FA] hover:underline cursor-pointer"
                >
                  View Evidence
                </button>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
