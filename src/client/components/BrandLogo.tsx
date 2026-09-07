import React from 'react';

interface BrandLogoProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({ size = 'md', className = '' }) => {
  const sizeClasses = {
    sm: 'w-8 h-8 rounded-lg',
    md: 'w-10 h-10 rounded-xl',
    lg: 'w-14 h-14 rounded-2xl',
  }[size];

  return (
    <div
      className={`relative ${sizeClasses} overflow-hidden shadow-sm shrink-0 border border-white/20 transition-transform active:scale-95 ${className}`}
      style={{
        background: 'linear-gradient(135deg, var(--app-accent) 0%, var(--app-accent-strong) 100%)',
      }}
      aria-label="888 該換囉 Logo"
    >
      <svg viewBox="0 0 100 100" fill="none" className="w-full h-full p-0.5">
        {/* Subtle top reflection */}
        <rect width="100" height="50" fill="url(#brandTopGlow)" opacity="0.15" />

        {/* Dynamic renewal cycle arc */}
        <path
          d="M 23 62 A 31 31 0 1 1 73 24"
          stroke="rgba(255, 255, 255, 0.85)"
          strokeWidth="4.5"
          strokeLinecap="round"
        />
        {/* Sleek arrowhead pointing clockwise */}
        <polygon points="73,20 80,27 72,28" fill="#ffffff" />

        {/* Central Brand Number 888 */}
        <text
          x="50"
          y="52"
          textAnchor="middle"
          fill="#ffffff"
          fontSize="27"
          fontWeight="900"
          letterSpacing="-1.2"
          fontFamily="-apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif"
        >
          888
        </text>

        {/* 該換囉 Sub-pill */}
        <rect
          x="20"
          y="61"
          width="60"
          height="17"
          rx="8.5"
          fill="rgba(255, 255, 255, 0.22)"
          stroke="rgba(255, 255, 255, 0.35)"
          strokeWidth="0.8"
        />
        <text
          x="50"
          y="73"
          textAnchor="middle"
          fill="#ffffff"
          fontSize="10"
          fontWeight="800"
          letterSpacing="1.2"
          fontFamily="-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'PingFang TC', 'Microsoft JhengHei', sans-serif"
        >
          該換囉
        </text>

        {/* Freshness Green Checkmark Badge at top-right */}
        <circle cx="77" cy="22" r="7.5" fill="#10b981" stroke="#ffffff" strokeWidth="1.2" />
        <path
          d="M 74 22 L 76.5 24.5 L 80.5 20"
          stroke="#ffffff"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
};
