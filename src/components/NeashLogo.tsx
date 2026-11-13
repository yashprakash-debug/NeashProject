import React from 'react';

interface NeashLogoProps {
  size?: number;
  showWordmark?: boolean;
}

export const NeashLogo: React.FC<NeashLogoProps> = ({
  size = 28,
  showWordmark = true,
}) => {
  return (
    <div className="inline-flex items-center gap-2.5 select-none">
      <svg
        width={size}
        height={size}
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        className="shrink-0"
      >
        {/* Outer geometric frame */}
        <rect
          x="2"
          y="2"
          width="28"
          height="28"
          rx="6"
          fill="#0F1B33"
          stroke="#2A4375"
          strokeWidth="1.5"
        />
        {/* Left continuity pillar (outgoing knowledge) */}
        <path
          d="M9 22V10L16 16.5"
          stroke="#60A5FA"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Right continuity pillar (incoming handover) */}
        <path
          d="M16 15.5L23 22V10"
          stroke="#3B82F6"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Continuity bridge node */}
        <rect x="14.25" y="14.25" width="3.5" height="3.5" rx="0.75" fill="#F8FAFC" />
      </svg>
      {showWordmark && (
        <span className="font-display text-lg font-bold tracking-tight text-[#F8FAFC] whitespace-nowrap">
          NEASH
        </span>
      )}
    </div>
  );
};
