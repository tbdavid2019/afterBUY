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
    <span
      className={`inline-flex overflow-hidden ${sizeClasses} shrink-0 shadow-sm transition-transform active:scale-95 ${className}`}
      aria-label="補貨日記 · After Buy"
      role="img"
    >
      <img src="/icons/mark.svg" alt="" className="h-full w-full" />
    </span>
  );
};
