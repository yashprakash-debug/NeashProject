import React, { useMemo, useState } from 'react';
import {
  BookOpen,
  CalendarClock,
  CheckSquare,
  Compass,
  Database,
  FileText,
  FolderOpen,
  Search,
  UploadCloud,
} from 'lucide-react';
import { ExtractedClaim, NavRoute, Project, SourceFile } from '../types/neash';
import { ProjectStatusLabel } from './StatusSignals';

interface ProjectsPageProps {
  projects: Project[];
  activeProjectId: string;
  sources: SourceFile[];
  claims: ExtractedClaim[];
  onSelectProject: (projectId: string) => void;
  onNavigate: (route: NavRoute) => void;
  onLoadSampleProject: () => void;
}

export const ProjectsPage: React.FC<ProjectsPageProps> = ({
  projects,
  activeProjectId,
  sources,
  claims,
  onSelectProject,
  onNavigate,
  onLoadSampleProject,
}) => {
  const [query, setQuery] = useState('');

  const filteredProjects = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return projects;
    return projects.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.team.toLowerCase().includes(q) ||
        p.previousOwner.toLowerCase().includes(q) ||
        p.incomingOwner.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)
    );
  }, [projects, query]);

  const jumpToFeature = (projectId: string, route: NavRoute) => {
    onSelectProject(projectId);
    onNavigate(route);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-white/[0.07]">
        <div>
          <h1 className="font-display text-2xl font-bold text-[#F8FAFC]">
            Demo Projects
          </h1>
          <p className="text-sm text-[#94A3B8] mt-1">
            Explore the preloaded demonstration handover workspaces and jump directly into any NEASH capability.
          </p>
        </div>
        <button
          type="button"
          onClick={onLoadSampleProject}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#111D30] hover:bg-[#16243B] border border-white/[0.08] text-xs font-medium text-[#F8FAFC] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Database className="w-3.5 h-3.5 text-[#60A5FA]" />
          <span>Restore Sample Project Data</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="relative max-w-sm">
        <Search className="w-4 h-4 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filter demo projects by name, team, or owner..."
          className="w-full bg-[#111D30] border border-white/[0.08] rounded-lg pl-9 pr-3 py-2 text-sm text-[#F8FAFC] placeholder:text-[#94A3B8]/60 focus:outline-none focus:border-[#3B82F6]"
        />
      </div>

      {/* Demo Project Cards */}
      {filteredProjects.length === 0 ? (
        <div className="p-10 rounded-xl bg-[#111D30] border border-white/[0.07] text-center space-y-3">
          <p className="text-sm font-medium text-[#F8FAFC]">
            No matching demo projects found.
          </p>
          <button
            type="button"
            onClick={() => {
              setQuery('');
              onLoadSampleProject();
            }}
            className="px-3.5 py-2 rounded-lg bg-[#3B82F6] hover:bg-[#2563EB] text-xs font-semibold text-white cursor-pointer"
          >
            Show All Demo Projects
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {filteredProjects.map((project) => {
            const pSources = sources.filter((s) => s.projectId === project.id);
            const pClaims = claims.filter((c) => c.projectId === project.id);
            const verifiedCount = pClaims.filter(
              (c) => c.reviewStatus === 'Verified'
            ).length;
            const pendingCount = pClaims.filter(
              (c) => c.reviewStatus === 'Pending Review'
            ).length;
            const isActive = project.id === activeProjectId;

            return (
              <article
                key={project.id}
                className={`p-6 rounded-xl bg-[#111D30] border transition-colors flex flex-col justify-between gap-5 ${
                  isActive
                    ? 'border-[#3B82F6]/60'
                    : 'border-white/[0.07] hover:border-white/[0.15]'
                }`}
              >
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#94A3B8]">
                    <div className="flex items-center gap-2">
                      <span>{project.category}</span>
                      <span aria-hidden="true">·</span>
                      <span>{project.team}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono text-[#60A5FA]">
                        DEMO DATA
                      </span>
                    </div>
                    <ProjectStatusLabel status={project.status} />
                  </div>

                  <div>
                    <h2 className="font-display text-lg font-semibold text-[#F8FAFC]">
                      {project.name}
                    </h2>
                    <p className="mt-1.5 text-sm text-[#94A3B8] leading-relaxed">
                      {project.description}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-3 border-t border-white/[0.06] text-xs">
                    <div>
                      <p className="text-[#94A3B8]">Previous Owner</p>
                      <p className="mt-0.5 font-medium text-[#F8FAFC]">
                        {project.previousOwner}
                      </p>
                    </div>
                    <div>
                      <p className="text-[#94A3B8]">Incoming Owner</p>
                      <p className="mt-0.5 font-medium text-[#60A5FA]">
                        {project.incomingOwner}
                      </p>
                    </div>
                  </div>

                  {/* Direct 1-click Feature Shortcuts for Judges */}
                  <div className="pt-3 border-t border-white/[0.06] space-y-2">
                    <p className="text-[11px] font-medium text-[#94A3B8]">
                      Explore features in {project.name}:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => jumpToFeature(project.id, 'sources')}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#080D19] hover:bg-white/[0.06] border border-white/[0.08] text-xs text-[#F8FAFC] cursor-pointer"
                      >
                        <UploadCloud className="w-3.5 h-3.5 text-[#60A5FA]" />
                        <span>Sources ({pSources.length})</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => jumpToFeature(project.id, 'knowledge')}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#080D19] hover:bg-white/[0.06] border border-white/[0.08] text-xs text-[#F8FAFC] cursor-pointer"
                      >
                        <BookOpen className="w-3.5 h-3.5 text-[#60A5FA]" />
                        <span>Knowledge ({pClaims.length})</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => jumpToFeature(project.id, 'verification')}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#080D19] hover:bg-white/[0.06] border border-white/[0.08] text-xs text-[#F8FAFC] cursor-pointer"
                      >
                        <CheckSquare className="w-3.5 h-3.5 text-[#F59E0B]" />
                        <span>Verify ({pendingCount} pending)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => jumpToFeature(project.id, 'first-day')}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#080D19] hover:bg-white/[0.06] border border-white/[0.08] text-xs text-[#F8FAFC] cursor-pointer"
                      >
                        <Compass className="w-3.5 h-3.5 text-[#22C55E]" />
                        <span>First Day</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => jumpToFeature(project.id, 'timeline')}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#080D19] hover:bg-white/[0.06] border border-white/[0.08] text-xs text-[#F8FAFC] cursor-pointer"
                      >
                        <CalendarClock className="w-3.5 h-3.5 text-[#94A3B8]" />
                        <span>Timeline</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => jumpToFeature(project.id, 'reports')}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#080D19] hover:bg-white/[0.06] border border-white/[0.08] text-xs text-[#F8FAFC] cursor-pointer"
                      >
                        <FileText className="w-3.5 h-3.5 text-[#60A5FA]" />
                        <span>Report</span>
                      </button>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-white/[0.06] flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3 text-xs text-[#94A3B8] font-mono tabular-nums">
                    <span>{pSources.length} sources</span>
                    <span aria-hidden="true">·</span>
                    <span>
                      {verifiedCount}/{pClaims.length} verified
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => jumpToFeature(project.id, 'overview')}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#3B82F6]/15 hover:bg-[#3B82F6]/25 text-xs font-semibold text-[#60A5FA] transition-colors whitespace-nowrap cursor-pointer"
                  >
                    <FolderOpen className="w-3.5 h-3.5" />
                    <span>{isActive ? 'Active Workspace' : 'Switch to Project'}</span>
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
