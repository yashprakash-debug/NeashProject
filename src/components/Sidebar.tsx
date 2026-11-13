import React from 'react';
import {
  BookOpen,
  CalendarClock,
  CheckSquare,
  Compass,
  FileText,
  FolderKanban,
  LayoutDashboard,
  Settings,
  UploadCloud,
  X,
} from 'lucide-react';
import { NavRoute } from '../types/neash';
import { NeashLogo } from './NeashLogo';

interface SidebarProps {
  activeRoute: NavRoute;
  onNavigate: (route: NavRoute) => void;
  pendingReviewCount: number;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

interface NavItem {
  id: NavRoute;
  label: string;
  icon: React.FC<{ className?: string }>;
  badgeCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeRoute,
  onNavigate,
  pendingReviewCount,
  mobileOpen,
  onCloseMobile,
}) => {
  const primaryNav: NavItem[] = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'projects', label: 'Projects', icon: FolderKanban },
    { id: 'sources', label: 'Sources', icon: UploadCloud },
    { id: 'knowledge', label: 'Knowledge Hub', icon: BookOpen },
    {
      id: 'verification',
      label: 'Verification Center',
      icon: CheckSquare,
      badgeCount: pendingReviewCount,
    },
    { id: 'reports', label: 'Handover Reports', icon: FileText },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const continuityNav: NavItem[] = [
    { id: 'first-day', label: 'Your First Day', icon: Compass },
    { id: 'timeline', label: 'Project Timeline', icon: CalendarClock },
  ];

  const handleSelect = (route: NavRoute) => {
    onNavigate(route);
    onCloseMobile();
  };

  const renderNavList = (items: NavItem[]) => (
    <ul className="space-y-1">
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = activeRoute === item.id;
        return (
          <li key={item.id}>
            <button
              type="button"
              onClick={() => handleSelect(item.id)}
              className={`w-full flex items-center justify-between gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3B82F6] ${
                isActive
                  ? 'bg-[#3B82F6]/15 text-[#F8FAFC]'
                  : 'text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-white/[0.04]'
              }`}
            >
              <span className="flex items-center gap-2.5 min-w-0">
                <Icon
                  className={`w-4 h-4 shrink-0 ${
                    isActive ? 'text-[#60A5FA]' : 'text-[#94A3B8]'
                  }`}
                />
                <span className="truncate">{item.label}</span>
              </span>
              {typeof item.badgeCount === 'number' && item.badgeCount > 0 && (
                <span className="font-mono text-xs tabular-nums text-[#F59E0B] shrink-0">
                  {item.badgeCount}
                </span>
              )}
            </button>
          </li>
        );
      })}
    </ul>
  );

  const sidebarContent = (
    <div className="flex flex-col h-full bg-[#0C1424] border-r border-white/[0.07] w-[248px] shrink-0">
      <div className="h-16 px-5 flex items-center justify-between border-b border-white/[0.07]">
        <button
          type="button"
          onClick={() => handleSelect('overview')}
          className="text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3B82F6] rounded-md"
        >
          <NeashLogo />
        </button>
        <button
          type="button"
          onClick={onCloseMobile}
          aria-label="Close navigation menu"
          className="lg:hidden p-1.5 text-[#94A3B8] hover:text-[#F8FAFC] rounded-md"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6" aria-label="Main navigation">
        <div>
          <p className="px-3 mb-2 text-xs font-medium text-[#94A3B8]/70">
            Workspace
          </p>
          {renderNavList(primaryNav)}
        </div>

        <div className="pt-4 border-t border-white/[0.06]">
          <p className="px-3 mb-2 text-xs font-medium text-[#94A3B8]/70">
            Incoming Onboarding
          </p>
          {renderNavList(continuityNav)}
        </div>
      </nav>

      <div className="p-4 border-t border-white/[0.07] text-xs text-[#94A3B8] leading-relaxed">
        <p className="font-medium text-[#F8FAFC]/90">Knowledge Should Never Leave With People.</p>
        <p className="mt-1 text-[11px] text-[#94A3B8]/80">
          Browser-local prototype. Sample records are labeled DEMO DATA.
        </p>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:block no-print">{sidebarContent}</aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex no-print">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs"
            onClick={onCloseMobile}
          />
          <div className="relative z-10 h-full">{sidebarContent}</div>
        </div>
      )}
    </>
  );
};
