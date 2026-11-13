import React, { useMemo } from 'react';
import {
  AlertOctagon,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Compass,
  Eye,
  FileText,
  Users,
} from 'lucide-react';
import {
  ExtractedClaim,
  NavRoute,
  Project,
  SourceFile,
} from '../types/neash';
import { ReviewStatusIndicator } from './StatusSignals';

interface FirstDayPageProps {
  activeProject: Project | undefined;
  projectSources: SourceFile[];
  claims: ExtractedClaim[];
  onInspectEvidence: (claim: ExtractedClaim) => void;
  onNavigate: (route: NavRoute) => void;
}

export const FirstDayPage: React.FC<FirstDayPageProps> = ({
  activeProject,
  projectSources,
  claims,
  onInspectEvidence,
  onNavigate,
}) => {
  const nonRejected = useMemo(
    () => claims.filter((c) => c.reviewStatus !== 'Rejected'),
    [claims]
  );

  const decisions = nonRejected.filter((c) => c.category === 'Decision');
  const pendingTasks = nonRejected.filter(
    (c) => c.category === 'Task' && c.taskStatus !== 'Completed'
  );
  const blockers = nonRejected.filter((c) => c.category === 'Blocker');
  const risksAndGaps = nonRejected.filter(
    (c) => c.category === 'Risk' || c.category === 'Knowledge Gap'
  );
  const nextActions = nonRejected.filter((c) => c.category === 'Next Action');

  // Extract documented contacts strictly from project owners & claim owners
  const documentedContacts = useMemo(() => {
    if (!activeProject) return [];
    const map = new Map<string, string>();
    map.set(activeProject.previousOwner, 'Previous Project Owner (Outgoing)');
    for (const c of nonRejected) {
      if (
        c.owner &&
        c.owner !== activeProject.incomingOwner &&
        !map.has(c.owner)
      ) {
        map.set(c.owner, `Referenced owner (${c.sourceFilename})`);
      }
    }
    return Array.from(map.entries()).map(([name, role]) => ({ name, role }));
  }, [activeProject, nonRejected]);

  if (!activeProject) {
    return (
      <div className="p-8 rounded-xl bg-[#111D30] border border-white/[0.07] text-center text-sm text-[#94A3B8]">
        Select a project to view the incoming member onboarding brief.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Onboarding Hero Banner */}
      <section className="p-6 rounded-xl bg-[#111D30] border border-[#3B82F6]/30 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 text-xs font-medium text-[#60A5FA]">
              <Compass className="w-4 h-4" />
              <span>Your First Day — Incoming Member Briefing</span>
            </div>
            <h1 className="font-display text-2xl font-bold text-[#F8FAFC]">
              Welcome to {activeProject.name}, {activeProject.incomingOwner}
            </h1>
            <p className="text-sm text-[#94A3B8] max-w-3xl leading-relaxed">
              {activeProject.description}
            </p>
          </div>

          <button
            type="button"
            onClick={() => onNavigate('reports')}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#3B82F6] hover:bg-[#2563EB] text-xs font-semibold text-white whitespace-nowrap shrink-0 cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Open Full Handover Report</span>
          </button>
        </div>

        <div className="pt-4 border-t border-white/[0.07] grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div>
            <p className="text-[#94A3B8]">Team</p>
            <p className="mt-0.5 font-medium text-[#F8FAFC]">
              {activeProject.team}
            </p>
          </div>
          <div>
            <p className="text-[#94A3B8]">Transitioning From</p>
            <p className="mt-0.5 font-medium text-[#F8FAFC]">
              {activeProject.previousOwner}
            </p>
          </div>
          <div>
            <p className="text-[#94A3B8]">Handover Status</p>
            <p className="mt-0.5 font-medium text-[#60A5FA]">
              {activeProject.status}
            </p>
          </div>
        </div>
      </section>

      {nonRejected.length === 0 ? (
        <div className="p-8 rounded-xl bg-[#111D30] border border-white/[0.07] text-center space-y-3">
          <p className="text-sm text-[#94A3B8]">
            No extracted project intelligence is available yet to populate your First Day brief.
          </p>
          <button
            type="button"
            onClick={() => onNavigate('sources')}
            className="px-4 py-2 rounded-lg bg-[#3B82F6] hover:bg-[#2563EB] text-xs font-semibold text-white cursor-pointer"
          >
            Go to Sources & Extract Intelligence
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 1. What to Understand First & Recommended Next Actions */}
          <section className="p-6 rounded-xl bg-[#111D30] border border-white/[0.07] space-y-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#22C55E]" />
              <h2 className="font-display text-base font-semibold text-[#F8FAFC]">
                Recommended First-Day Next Actions
              </h2>
            </div>
            <div className="divide-y divide-white/[0.06] border-t border-white/[0.06]">
              {nextActions.length === 0 ? (
                <p className="py-4 text-xs text-[#94A3B8]">
                  No next actions extracted yet.
                </p>
              ) : (
                nextActions.map((item) => (
                  <div key={item.id} className="py-3.5 space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-[#F8FAFC]">
                        {item.editedTitle ?? item.originalTitle}
                      </p>
                      <ReviewStatusIndicator status={item.reviewStatus} />
                    </div>
                    <p className="text-xs text-[#94A3B8] leading-relaxed">
                      {item.editedDescription ?? item.originalDescription}
                    </p>
                    <button
                      type="button"
                      onClick={() => onInspectEvidence(item)}
                      className="inline-flex items-center gap-1 text-xs text-[#60A5FA] hover:underline cursor-pointer"
                    >
                      <Eye className="w-3 h-3" />
                      <span>Source: {item.sourceFilename}</span>
                    </button>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* 2. Current Blockers & Critical Dependencies */}
          <section className="p-6 rounded-xl bg-[#111D30] border border-white/[0.07] space-y-4">
            <div className="flex items-center gap-2">
              <AlertOctagon className="w-4 h-4 text-[#EF4444]" />
              <h2 className="font-display text-base font-semibold text-[#F8FAFC]">
                Current Blockers & Risks to Watch
              </h2>
            </div>
            <div className="divide-y divide-white/[0.06] border-t border-white/[0.06]">
              {[...blockers, ...risksAndGaps].slice(0, 6).map((item) => (
                <div key={item.id} className="py-3.5 space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-[#F8FAFC]">
                      {item.editedTitle ?? item.originalTitle}
                    </p>
                    <span
                      className={`text-xs font-medium ${
                        item.category === 'Blocker'
                          ? 'text-[#EF4444]'
                          : 'text-[#F59E0B]'
                      }`}
                    >
                      {item.category}
                    </span>
                  </div>
                  <p className="text-xs text-[#94A3B8] leading-relaxed">
                    {item.editedDescription ?? item.originalDescription}
                  </p>
                  <div className="flex items-center justify-between text-xs">
                    <ReviewStatusIndicator status={item.reviewStatus} />
                    <button
                      type="button"
                      onClick={() => onInspectEvidence(item)}
                      className="text-[#60A5FA] hover:underline cursor-pointer"
                    >
                      View Evidence
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* 3. Important Decisions */}
          <section className="p-6 rounded-xl bg-[#111D30] border border-white/[0.07] space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-base font-semibold text-[#F8FAFC]">
                Important Project Decisions
              </h2>
              <button
                type="button"
                onClick={() => onNavigate('knowledge')}
                className="inline-flex items-center gap-1 text-xs text-[#60A5FA] hover:underline cursor-pointer"
              >
                <span>All Knowledge</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
            <div className="divide-y divide-white/[0.06] border-t border-white/[0.06]">
              {decisions.map((item) => (
                <div key={item.id} className="py-3 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-[#F8FAFC]">
                      {item.editedTitle ?? item.originalTitle}
                    </p>
                    <ReviewStatusIndicator status={item.reviewStatus} />
                  </div>
                  <p className="text-xs text-[#94A3B8] leading-relaxed">
                    {item.editedDescription ?? item.originalDescription}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* 4. Pending Tasks */}
          <section className="p-6 rounded-xl bg-[#111D30] border border-white/[0.07] space-y-4">
            <h2 className="font-display text-base font-semibold text-[#F8FAFC]">
              Pending & In-Progress Tasks
            </h2>
            <div className="divide-y divide-white/[0.06] border-t border-white/[0.06]">
              {pendingTasks.length === 0 ? (
                <p className="py-4 text-xs text-[#94A3B8]">
                  No pending tasks found.
                </p>
              ) : (
                pendingTasks.map((task) => (
                  <div key={task.id} className="py-3 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-[#F8FAFC]">
                        {task.editedTitle ?? task.originalTitle}
                      </p>
                      <span className="text-xs font-mono text-[#94A3B8]">
                        {task.taskStatus ?? 'Pending'}
                      </span>
                    </div>
                    <p className="text-xs text-[#94A3B8]">
                      {task.owner ? `Owner: ${task.owner}` : 'Unassigned'}
                      {task.priority ? ` · Priority: ${task.priority}` : ''}
                      {task.date ? ` · Due: ${task.date}` : ''}
                    </p>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* 5. Documents to Read */}
          <section className="p-6 rounded-xl bg-[#111D30] border border-white/[0.07] space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-[#60A5FA]" />
                <h2 className="font-display text-base font-semibold text-[#F8FAFC]">
                  Documents to Read First
                </h2>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('sources')}
                className="text-xs text-[#60A5FA] hover:underline cursor-pointer"
              >
                Open Sources
              </button>
            </div>
            <div className="divide-y divide-white/[0.06] border-t border-white/[0.06]">
              {projectSources.map((src) => (
                <div
                  key={src.id}
                  className="py-3 flex items-center justify-between gap-3 text-xs"
                >
                  <div>
                    <p className="font-mono font-medium text-[#F8FAFC]">
                      {src.name}
                    </p>
                    <p className="text-[#94A3B8] mt-0.5">{src.extractionNote}</p>
                  </div>
                  <span className="font-mono text-[#94A3B8] shrink-0">
                    {src.format}
                  </span>
                </div>
              ))}
            </div>
          </section>

          {/* 6. People to Contact */}
          <section className="p-6 rounded-xl bg-[#111D30] border border-white/[0.07] space-y-4">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-[#60A5FA]" />
              <h2 className="font-display text-base font-semibold text-[#F8FAFC]">
                Documented People & Contacts
              </h2>
            </div>
            <div className="divide-y divide-white/[0.06] border-t border-white/[0.06]">
              {documentedContacts.map((person) => (
                <div key={person.name} className="py-3 text-xs">
                  <p className="font-medium text-[#F8FAFC] text-sm">
                    {person.name}
                  </p>
                  <p className="text-[#94A3B8] mt-0.5">{person.role}</p>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  );
};
