import React from 'react';
import {
  AlertOctagon,
  AlertTriangle,
  CheckCircle2,
  Clock,
  HelpCircle,
  XCircle,
} from 'lucide-react';
import {
  ClaimCategory,
  ConfidenceLevel,
  ProjectStatus,
  ReviewStatus,
} from '../types/neash';

export const ReviewStatusIndicator: React.FC<{ status: ReviewStatus }> = ({
  status,
}) => {
  if (status === 'Verified') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#22C55E] whitespace-nowrap shrink-0">
        <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
        Verified
      </span>
    );
  }
  if (status === 'Rejected') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#EF4444] whitespace-nowrap shrink-0">
        <XCircle className="w-3.5 h-3.5" aria-hidden="true" />
        Rejected
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#F59E0B] whitespace-nowrap shrink-0">
      <Clock className="w-3.5 h-3.5" aria-hidden="true" />
      Pending Review
    </span>
  );
};

export const CategoryLabel: React.FC<{ category: ClaimCategory }> = ({
  category,
}) => {
  const colorMap: Record<ClaimCategory, string> = {
    Decision: 'text-[#60A5FA]',
    Task: 'text-[#94A3B8]',
    Blocker: 'text-[#EF4444]',
    Risk: 'text-[#F59E0B]',
    Milestone: 'text-[#22C55E]',
    'Knowledge Gap': 'text-[#F59E0B]',
    'Next Action': 'text-[#60A5FA]',
  };

  return (
    <span className={`text-xs font-medium ${colorMap[category]} whitespace-nowrap`}>
      {category}
    </span>
  );
};

export const ConfidenceIndicator: React.FC<{ confidence: ConfidenceLevel }> = ({
  confidence,
}) => {
  const styles: Record<ConfidenceLevel, string> = {
    High: 'text-[#22C55E]',
    Medium: 'text-[#F59E0B]',
    Low: 'text-[#94A3B8]',
  };

  return (
    <span className="inline-flex items-center gap-1 text-xs text-[#94A3B8] tabular-nums whitespace-nowrap">
      <span>Confidence:</span>
      <span className={`font-medium ${styles[confidence]}`}>{confidence}</span>
    </span>
  );
};

export const ProjectStatusLabel: React.FC<{ status: ProjectStatus }> = ({
  status,
}) => {
  if (status === 'Completed' || status === 'Ready for Transition') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#22C55E] whitespace-nowrap">
        <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
        {status}
      </span>
    );
  }
  if (status === 'Handover in Progress') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#60A5FA] whitespace-nowrap">
        <Clock className="w-3.5 h-3.5" aria-hidden="true" />
        {status}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#F59E0B] whitespace-nowrap">
      <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" />
      {status}
    </span>
  );
};

export const CategoryIcon: React.FC<{ category: ClaimCategory }> = ({
  category,
}) => {
  switch (category) {
    case 'Blocker':
      return <AlertOctagon className="w-4 h-4 text-[#EF4444] shrink-0" />;
    case 'Risk':
      return <AlertTriangle className="w-4 h-4 text-[#F59E0B] shrink-0" />;
    case 'Knowledge Gap':
      return <HelpCircle className="w-4 h-4 text-[#F59E0B] shrink-0" />;
    case 'Milestone':
      return <CheckCircle2 className="w-4 h-4 text-[#22C55E] shrink-0" />;
    default:
      return null;
  }
};
