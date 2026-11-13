import React, { useMemo, useRef, useState, useEffect } from 'react';
import {
  Bell,
  ChevronDown,
  Menu,
  Search,
  User,
} from 'lucide-react';
import {
  ActivityLogItem,
  ExtractedClaim,
  NavRoute,
  Project,
  SourceFile,
} from '../types/neash';

interface TopBarProps {
  projects: Project[];
  activeProject: Project | undefined;
  onSelectProject: (projectId: string) => void;
  onOpenMobileMenu: () => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  claims: ExtractedClaim[];
  sources: SourceFile[];
  activities: ActivityLogItem[];
  onMarkAllRead: () => void;
  onNavigate: (route: NavRoute) => void;
  onInspectClaim: (claim: ExtractedClaim) => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  projects,
  activeProject,
  onSelectProject,
  onOpenMobileMenu,
  searchQuery,
  onSearchChange,
  claims,
  sources,
  activities,
  onMarkAllRead,
  onNavigate,
  onInspectClaim,
}) => {
  const [notifOpen, setNotifOpen] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unreadCount = activities.filter((a) => !a.read).length;

  const quickResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return { claims: [], sources: [] };
    const matchedClaims = claims
      .filter((c) => {
        const title = (c.editedTitle ?? c.originalTitle).toLowerCase();
        const desc = (c.editedDescription ?? c.originalDescription).toLowerCase();
        return (
          title.includes(q) ||
          desc.includes(q) ||
          c.category.toLowerCase().includes(q) ||
          c.sourceFilename.toLowerCase().includes(q)
        );
      })
      .slice(0, 5);
    const matchedSources = sources
      .filter((s) => s.name.toLowerCase().includes(q))
      .slice(0, 3);
    return { claims: matchedClaims, sources: matchedSources };
  }, [searchQuery, claims, sources]);

  return (
    <header className="h-16 bg-[#0C1424]/95 border-b border-white/[0.07] px-4 lg:px-6 flex items-center justify-between gap-4 sticky top-0 z-30 no-print">
      {/* Left: Mobile menu + Project selector */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={onOpenMobileMenu}
          aria-label="Open navigation menu"
          className="lg:hidden p-2 text-[#94A3B8] hover:text-[#F8FAFC] rounded-lg hover:bg-white/[0.04]"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="relative">
          <label htmlFor="project-selector" className="sr-only">
            Current project
          </label>
          <select
            id="project-selector"
            value={activeProject?.id ?? ''}
            onChange={(e) => onSelectProject(e.target.value)}
            className="appearance-none bg-[#111D30] border border-white/[0.08] hover:border-[#3B82F6]/50 text-[#F8FAFC] text-sm font-medium rounded-lg pl-3 pr-8 py-2 focus:outline-none focus:ring-2 focus:ring-[#3B82F6] max-w-[200px] sm:max-w-[260px] truncate cursor-pointer"
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id} className="bg-[#111D30] text-[#F8FAFC]">
                {p.name}
              </option>
            ))}
          </select>
          <ChevronDown
            className="w-4 h-4 text-[#94A3B8] pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2"
            aria-hidden="true"
          />
        </div>
      </div>

      {/* Center: Global Search */}
      <div ref={searchRef} className="relative flex-1 max-w-md hidden md:block">
        <Search
          className="w-4 h-4 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
          aria-hidden="true"
        />
        <input
          type="search"
          value={searchQuery}
          onFocus={() => setSearchFocused(true)}
          onChange={(e) => {
            onSearchChange(e.target.value);
            setSearchFocused(true);
          }}
          placeholder="Search decisions, tasks, blockers, sources..."
          className="w-full bg-[#080D19] border border-white/[0.08] rounded-lg pl-9 pr-3 py-1.5 text-sm text-[#F8FAFC] placeholder:text-[#94A3B8]/60 focus:outline-none focus:border-[#3B82F6] transition-colors"
        />

        {searchFocused && searchQuery.trim().length > 0 && (
          <div className="absolute left-0 right-0 mt-2 bg-[#111D30] border border-white/[0.1] rounded-xl shadow-2xl overflow-hidden z-50">
            {quickResults.claims.length === 0 && quickResults.sources.length === 0 ? (
              <div className="p-4 text-xs text-[#94A3B8]">
                No matches in current project for &ldquo;{searchQuery}&rdquo;.
              </div>
            ) : (
              <div className="max-h-80 overflow-y-auto divide-y divide-white/[0.06]">
                {quickResults.claims.length > 0 && (
                  <div className="p-2">
                    <p className="px-2 py-1 text-[11px] font-medium text-[#94A3B8]">
                      Extracted Knowledge
                    </p>
                    {quickResults.claims.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          onInspectClaim(c);
                          setSearchFocused(false);
                        }}
                        className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-white/[0.05] transition-colors"
                      >
                        <p className="text-xs font-medium text-[#F8FAFC] truncate">
                          {c.editedTitle ?? c.originalTitle}
                        </p>
                        <p className="text-[11px] text-[#94A3B8] mt-0.5 truncate">
                          {c.category} · {c.sourceFilename} · {c.reviewStatus}
                        </p>
                      </button>
                    ))}
                  </div>
                )}
                {quickResults.sources.length > 0 && (
                  <div className="p-2">
                    <p className="px-2 py-1 text-[11px] font-medium text-[#94A3B8]">
                      Sources
                    </p>
                    {quickResults.sources.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => {
                          onNavigate('sources');
                          setSearchFocused(false);
                        }}
                        className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-white/[0.05] transition-colors"
                      >
                        <p className="text-xs font-medium text-[#F8FAFC] truncate">
                          {s.name}
                        </p>
                        <p className="text-[11px] text-[#94A3B8] mt-0.5">
                          {s.format} · {s.status}
                        </p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right: Notifications, Demo User, New Project */}
      <div className="flex items-center gap-3 shrink-0">
        {/* Notifications */}
        <div ref={notifRef} className="relative">
          <button
            type="button"
            onClick={() => setNotifOpen((prev) => !prev)}
            aria-label="Recent activity notifications"
            className="relative p-2 text-[#94A3B8] hover:text-[#F8FAFC] rounded-lg hover:bg-white/[0.05] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3B82F6]"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 text-[9px] font-mono font-bold bg-[#3B82F6] text-white px-1 rounded-sm leading-tight tabular-nums">
                {unreadCount}
              </span>
            )}
          </button>

          {notifOpen && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-[#111D30] border border-white/[0.1] rounded-xl shadow-2xl z-50 overflow-hidden">
              <div className="px-4 py-3 border-b border-white/[0.07] flex items-center justify-between">
                <span className="text-sm font-semibold text-[#F8FAFC]">
                  Workspace Activity
                </span>
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={onMarkAllRead}
                    className="text-xs text-[#60A5FA] hover:underline"
                  >
                    Mark all read
                  </button>
                )}
              </div>
              <div className="max-h-80 overflow-y-auto divide-y divide-white/[0.06]">
                {activities.length === 0 ? (
                  <p className="p-4 text-xs text-[#94A3B8]">No activity recorded yet.</p>
                ) : (
                  activities.slice(0, 10).map((act) => (
                    <div
                      key={act.id}
                      className={`px-4 py-3 text-xs ${
                        act.read ? 'opacity-75' : 'bg-[#3B82F6]/[0.04]'
                      }`}
                    >
                      <p className="font-medium text-[#F8FAFC]">{act.title}</p>
                      <p className="text-[#94A3B8] mt-1 leading-relaxed">{act.detail}</p>
                      <p className="text-[11px] text-[#94A3B8]/70 mt-1.5 font-mono tabular-nums">
                        {new Date(act.timestamp).toLocaleString()}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Demo User */}
        <div className="hidden sm:flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-[#111D30] border border-white/[0.07]">
          <div className="w-6 h-6 rounded-md bg-[#3B82F6]/20 text-[#60A5FA] flex items-center justify-center shrink-0">
            <User className="w-3.5 h-3.5" aria-hidden="true" />
          </div>
          <span className="text-xs font-medium text-[#F8FAFC] whitespace-nowrap">
            Demo User
          </span>
        </div>
      </div>
    </header>
  );
};
