import React from 'react';
import { HealthStatus } from '../../shared/types.ts';

interface CircularProgressRingProps {
  percentage: number;
  size?: number;
  strokeWidth?: number;
  healthStatus?: HealthStatus;
  showText?: boolean;
  textClassName?: string;
  className?: string;
  ariaLabel?: string;
  children?: React.ReactNode;
}

export const CircularProgressRing: React.FC<CircularProgressRingProps> = ({
  percentage,
  size = 44,
  strokeWidth = 3.5,
  healthStatus,
  showText = false,
  textClassName = '',
  className = '',
  ariaLabel,
  children,
}) => {
  const clampedPercent = Math.max(0, Math.min(100, Math.round(percentage)));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - clampedPercent / 100);

  const getStrokeColor = () => {
    if (healthStatus === 'overdue' || clampedPercent <= 0) {
      return 'stroke-rose-500 dark:stroke-rose-400';
    }
    if (healthStatus === 'due_soon' || clampedPercent <= 15) {
      return 'stroke-amber-500 dark:stroke-amber-400';
    }
    if (healthStatus === 'snoozed') {
      return 'stroke-blue-500 dark:stroke-blue-400';
    }
    if (healthStatus === 'stored') {
      return 'stroke-slate-300 dark:stroke-slate-600';
    }
    return 'stroke-emerald-500 dark:stroke-emerald-400';
  };

  const getTextColor = () => {
    if (healthStatus === 'overdue' || clampedPercent <= 0) {
      return 'text-rose-600 dark:text-rose-400';
    }
    if (healthStatus === 'due_soon' || clampedPercent <= 15) {
      return 'text-amber-600 dark:text-amber-400';
    }
    if (healthStatus === 'snoozed') {
      return 'text-blue-600 dark:text-blue-400';
    }
    return 'text-emerald-600 dark:text-emerald-400';
  };

  const defaultAriaLabel = ariaLabel || (children ? undefined : `週期剩餘比例 ${clampedPercent}%`);

  return (
    <div
      className={`relative inline-flex items-center justify-center shrink-0 ${className}`}
      style={{ width: size, height: size }}
      role={defaultAriaLabel ? 'progressbar' : undefined}
      aria-label={defaultAriaLabel}
      aria-valuenow={defaultAriaLabel ? clampedPercent : undefined}
      aria-valuemin={defaultAriaLabel ? 0 : undefined}
      aria-valuemax={defaultAriaLabel ? 100 : undefined}
      aria-hidden={!defaultAriaLabel}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="transform -rotate-90 origin-center"
      >
        {/* Subtle background track circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          fill="none"
          className="stroke-slate-100 dark:stroke-slate-800"
        />
        {/* Progress stroke with rounded cap */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className={`transition-[stroke-dashoffset] duration-500 ease-out ${getStrokeColor()}`}
        />
      </svg>

      {/* Center text if requested */}
      {showText && (
        <span
          className={`absolute inset-0 flex items-center justify-center font-black tabular-nums tracking-tighter ${getTextColor()} ${textClassName || 'text-[11px]'}`}
        >
          {clampedPercent}%
        </span>
      )}

      {/* Nested content if provided (e.g. centered icon) */}
      {children && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          {children}
        </div>
      )}
    </div>
  );
};
