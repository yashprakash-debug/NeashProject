import React, { useMemo, useRef, useState, useEffect } from 'react';
import {
  Bell,
  Check,
  ChevronDown,
  Cloud,
  Copy,
  Menu,
  RefreshCw,
  Search,
  Share2,
  User,
} from 'lucide-react';
import type {
  ActivityLogItem,
  CollaboratorProfile,
  CollaboratorRole,
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
  collaborator: CollaboratorProfile;
  onUpdateCollaborator: (profile: CollaboratorProfile) => void;
  workspaceId: string | null;
  isSyncingWorkspace: boolean;
  onShareWorkspace: () => Promise<string | null>;
  onSyncWorkspaceNow: () => Promise<void>;
}

const ROLES: CollaboratorRole[] = [
  'Outgoing Owner',
  'Reviewer',
  'Incoming Engineer',
];

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
  collaborator,
  onUpdateCollaborator,
  workspaceId,
  isSyncingWorkspace,
  onShareWorkspace,
  onSyncWorkspaceNow,
}) => {
  const [notifOpen, setNotifOpen] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [draftName, setDraftName] = useState(collaborator.name);
  const notifRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setDraftName(collaborator.name);
  }, [collaborator.name]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchFocused(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
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

  const handleShareClick = async () => {
    const shareUrl = await onShareWorkspace();
    if (shareUrl) {
      try {
        await navigator.clipboard.writeText(shareUrl);
      } catch {
        // Ignore clipboard denial in restricted iframe
      }
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2600);
    }
  };

  return (
    <header className="h-16 bg-[#0C1424]/95 border-b border-white/[0.07] px-4 lg:px-6 flex items-center justify-between gap-3 sticky top-0 z-30 no-print">
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
            className="appearance-none bg-[#111D30] border border-white/[0.08] hover:border-[#3B82F6]/50 text-[#F8FAFC] text-sm font-medium rounded-lg pl-3 pr-8 py-2 focus:outline-none focus:ring-2 focus:ring-[#3B82F6] max-w-[180px] sm:max-w-[230px] truncate cursor-pointer"
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
      <div ref={searchRef} className="relative flex-1 max-w-sm hidden md:block">
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
                        className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-white/[0.05] transition-colors cursor-pointer"
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
                        className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-white/[0.05] transition-colors cursor-pointer"
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

      {/* Right: Shared Workspace Sync, Notifications, Collaborator Switcher */}
      <div className="flex items-center gap-2 shrink-0">
        {workspaceId ? (
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => void onSyncWorkspaceNow()}
              title="Sync latest changes from shared workspace"
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#22C55E]/10 hover:bg-[#22C55E]/20 border border-[#22C55E]/30 text-xs font-mono text-[#22C55E] transition-colors whitespace-nowrap cursor-pointer"
            >
              <Cloud className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{workspaceId}</span>
              <RefreshCw
                className={`w-3 h-3 ${isSyncingWorkspace ? 'animate-spin' : ''}`}
              />
            </button>
            <button
              type="button"
              onClick={() => void handleShareClick()}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#111D30] hover:bg-[#16243B] border border-white/[0.08] text-xs font-medium text-[#F8FAFC] transition-colors whitespace-nowrap cursor-pointer"
            >
              {copiedLink ? (
                <>
                  <Check className="w-3.5 h-3.5 text-[#22C55E]" />
                  <span className="hidden sm:inline text-[#22C55E]">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-[#60A5FA]" />
                  <span className="hidden sm:inline">Copy Link</span>
                </>
              )}
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => void handleShareClick()}
            disabled={isSyncingWorkspace}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#111D30] hover:bg-[#16243B] border border-[#3B82F6]/35 text-xs font-medium text-[#60A5FA] transition-colors whitespace-nowrap cursor-pointer"
          >
            {copiedLink ? (
              <Check className="w-3.5 h-3.5 text-[#22C55E]" />
            ) : (
              <Share2 className="w-3.5 h-3.5" />
            )}
            <span className="hidden sm:inline">
              {copiedLink ? 'Link Copied' : 'Share Workspace'}
            </span>
          </button>
        )}

        {/* Notifications */}
        <div ref={notifRef} className="relative">
          <button
            type="button"
            onClick={() => setNotifOpen((prev) => !prev)}
            aria-label="Recent activity notifications"
            className="relative p-2 text-[#94A3B8] hover:text-[#F8FAFC] rounded-lg hover:bg-white/[0.05] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3B82F6] cursor-pointer"
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
                    className="text-xs text-[#60A5FA] hover:underline cursor-pointer"
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

        {/* Active Collaborator Identity & Role Switcher */}
        <div ref={profileRef} className="relative">
          <button
            type="button"
            onClick={() => setProfileOpen((prev) => !prev)}
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-[#111D30] hover:bg-[#16243B] border border-white/[0.08] transition-colors cursor-pointer"
          >
            <div className="w-6 h-6 rounded-md bg-[#3B82F6]/20 text-[#60A5FA] flex items-center justify-center shrink-0">
              <User className="w-3.5 h-3.5" aria-hidden="true" />
            </div>
            <div className="hidden sm:block text-left leading-tight">
              <p className="text-xs font-medium text-[#F8FAFC] whitespace-nowrap">
                {collaborator.name}
              </p>
              <p className="text-[10px] font-mono text-[#60A5FA] whitespace-nowrap">
                {collaborator.role}
              </p>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-[#94A3B8] hidden sm:block" />
          </button>

          {profileOpen && (
            <div className="absolute right-0 mt-2 w-72 bg-[#111D30] border border-white/[0.1] rounded-xl shadow-2xl z-50 p-4 space-y-3">
              <div>
                <p className="text-xs font-semibold text-[#F8FAFC]">
                  Collaborator Identity
                </p>
                <p className="text-[11px] text-[#94A3B8] mt-0.5">
                  All verifications, conflict resolutions, and sign-offs record this identity in the audit trail.
                </p>
              </div>

              <div>
                <label className="block text-[11px] text-[#94A3B8] mb-1">
                  Display Name
                </label>
                <input
                  type="text"
                  value={draftName}
                  onChange={(e) => {
                    setDraftName(e.target.value);
                    if (e.target.value.trim()) {
                      onUpdateCollaborator({
                        ...collaborator,
                        name: e.target.value.trim(),
                      });
                    }
                  }}
                  placeholder="Enter your name"
                  className="w-full bg-[#080D19] border border-white/[0.1] rounded-lg px-2.5 py-1.5 text-xs text-[#F8FAFC] focus:outline-none focus:border-[#3B82F6]"
                />
              </div>

              <div>
                <p className="text-[11px] text-[#94A3B8] mb-1.5">Handover Role</p>
                <div className="space-y-1">
                  {ROLES.map((role) => {
                    const selected = collaborator.role === role;
                    const presetName =
                      role === 'Outgoing Owner'
                        ? activeProject?.previousOwner || 'Rahul Sharma'
                        : role === 'Incoming Engineer'
                        ? activeProject?.incomingOwner === 'New Team Member'
                          ? 'Incoming Engineer'
                          : activeProject?.incomingOwner || 'Marcus Chen'
                        : 'Priya Nair';
                    return (
                      <button
                        key={role}
                        type="button"
                        onClick={() => {
                          onUpdateCollaborator({
                            name: presetName,
                            role,
                          });
                          setDraftName(presetName);
                        }}
                        className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between transition-colors cursor-pointer ${
                          selected
                            ? 'bg-[#3B82F6]/20 text-[#F8FAFC] border border-[#3B82F6]/40'
                            : 'bg-[#080D19] text-[#94A3B8] hover:text-[#F8FAFC] border border-white/[0.06]'
                        }`}
                      >
                        <span>{role}</span>
                        <span className="font-mono text-[10px] opacity-80">
                          {presetName}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
