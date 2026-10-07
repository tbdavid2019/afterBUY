import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Pill,
  Droplet,
  Tv,
  Laptop,
  Shirt,
  Scissors,
  Wind,
  Wrench,
  Package,
  Layers,
  ShieldCheck,
  Eye,
  Heart,
  Calendar,
} from 'lucide-react';
import { ItemCategory } from '../../shared/types.ts';

interface ItemBrandBadgeProps {
  name: string;
  category?: ItemCategory | string;
  imageUrl?: string | null;
  specModel?: string | null;
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'calendar';
  shape?: 'rounded' | 'circle';
}

// Brand SVG Icons
const NetflixIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-label="Netflix">
    <path d="M5.398 0v24c1.19-.24 2.37-.47 3.56-.72V0H5.398zm9.644 0v17.47c1.19-.22 2.38-.45 3.56-.69V0h-3.56zm-4.82 2.38L6.44 23.36c1.19-.24 2.37-.47 3.56-.72L13.78 4.76V2.38h-3.56z" fill="#E50914" />
  </svg>
);

const SpotifyIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-label="Spotify">
    <circle cx="12" cy="12" r="12" fill="#1DB954" />
    <path d="M17.5 15.6c-.2.3-.6.4-.9.2-2.5-1.5-5.6-1.9-9.3-1-.4.1-.7-.1-.8-.5-.1-.4.1-.7.5-.8 4.1-1 7.6-.5 10.3 1.2.4.2.5.6.2.9zm1.2-2.7c-.3.4-.8.5-1.2.3-2.9-1.8-7.3-2.3-10.7-1.3-.5.1-.9-.2-1.1-.6-.1-.5.2-.9.6-1.1 4-1.2 8.9-.6 12.1 1.4.4.3.5.8.3 1.3zm.1-2.9C15.3 8 9.3 7.8 5.8 8.9c-.6.2-1.2-.2-1.4-.7-.2-.6.2-1.2.7-1.4 4.1-1.3 10.7-1 14.7 1.4.5.3.7 1 .4 1.5-.3.5-1 .7-1.4.3z" fill="#FFFFFF" />
  </svg>
);

const ChatGPTIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-label="ChatGPT">
    <path d="M12 2a4 4 0 0 0-3.8 2.8A4 4 0 0 0 4.8 8a4 4 0 0 0 1 4.5A4 4 0 0 0 4.8 16a4 4 0 0 0 3.4 3.2A4 4 0 0 0 12 22a4 4 0 0 0 3.8-2.8A4 4 0 0 0 19.2 16a4 4 0 0 0-1-4.5A4 4 0 0 0 19.2 8a4 4 0 0 0-3.4-3.2A4 4 0 0 0 12 2z" className="text-emerald-500 fill-emerald-500/20" />
    <circle cx="12" cy="12" r="3" className="fill-emerald-500 text-emerald-500" />
  </svg>
);

const AppleIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 170 170" fill="currentColor" className={className} aria-label="Apple">
    <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.69-3.04-7.69-7.85-12-14.42-6-9.15-10.82-19.46-14.46-30.93-3.64-11.47-5.46-22.35-5.46-32.64 0-14.77 3.82-27.17 11.47-37.21 7.65-10.04 17.51-15.18 29.58-15.44 5.35 0 11.16 1.45 17.43 4.35 6.27 2.9 10.36 4.35 12.28 4.35 1.54 0 5.63-1.45 12.28-4.35 6.65-2.9 12.46-4.22 17.43-3.96 13.55.77 24.36 5.86 32.43 15.27-11.77 7.15-17.51 16.92-17.22 29.31.28 9.94 4.12 18.23 11.51 24.87 7.39 6.64 16.27 10.36 26.63 11.16-2.13 6.42-4.74 12.63-7.83 18.63zM119.22 31.84c0-7.72 2.76-14.93 8.28-21.63 5.53-6.7 12.33-10.21 20.4-10.21.26 1.03.39 1.93.39 2.7 0 7.72-2.83 15.05-8.49 22-5.66 6.95-12.54 10.55-20.64 10.81.06-1.29.06-2.52.06-3.67z" />
  </svg>
);

const ToothbrushIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M19 3l2 2-8 8-2-2 8-8z" />
    <path d="M11 11l-8 8a2 2 0 0 0 2.8 2.8l8-8" />
    <path d="M18 4l-3 3" />
    <path d="M16 6l-1 1" />
  </svg>
);

export const ItemBrandBadge: React.FC<ItemBrandBadgeProps> = ({
  name,
  category,
  imageUrl,
  className = '',
  size = 'md',
  shape = 'rounded',
}) => {
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setImgError(false);
  }, [imageUrl]);

  const lowerName = name.toLowerCase();
  const isCircle = shape === 'circle' || size === 'calendar';

  // Dimensions
  const dimClasses = {
    xs: 'w-6 h-6 text-xs',
    sm: 'w-7 h-7 text-xs',
    md: 'w-9 h-9 text-sm',
    lg: 'w-11 h-11 text-base',
    xl: 'w-14 h-14 text-lg',
    calendar: 'w-9 h-9 sm:w-11 sm:h-11 text-sm sm:text-base',
  }[size];

  const roundedClass = isCircle
    ? 'rounded-full'
    : {
        xs: 'rounded-lg',
        sm: 'rounded-xl',
        md: 'rounded-xl',
        lg: 'rounded-2xl',
        xl: 'rounded-2xl',
        calendar: 'rounded-full',
      }[size];

  const sizeClasses = `${dimClasses} ${roundedClass}`;

  const iconClass =
    size === 'xl'
      ? 'w-7 h-7'
      : size === 'lg' || size === 'calendar'
        ? 'w-5 h-5 sm:w-6 sm:h-6'
        : size === 'md'
          ? 'w-4.5 h-4.5'
          : size === 'sm'
            ? 'w-4 h-4'
            : 'w-3.5 h-3.5';

  // 1. Direct custom user image with circular mask or squircle
  if (imageUrl && !imgError) {
    return (
      <div
        className={`relative overflow-hidden bg-white dark:bg-slate-800 ${
          isCircle
            ? 'rounded-full ring-2 ring-white/90 dark:ring-white/15 shadow-xs'
            : `${roundedClass} p-0.5 border border-slate-200/90 dark:border-slate-700/80 shadow-2xs`
        } flex items-center justify-center shrink-0 ${dimClasses} ${className}`}
      >
        <img
          src={imageUrl}
          alt={name}
          className={`w-full h-full ${isCircle ? 'object-cover rounded-full' : 'object-contain rounded-md'}`}
          loading="lazy"
          onError={() => setImgError(true)}
        />
      </div>
    );
  }

  // 2. Popular Digital / Streaming Brands
  if (lowerName.includes('netflix')) {
    return (
      <div className={`relative bg-black border border-red-900/40 shadow-xs flex items-center justify-center shrink-0 ${sizeClasses} ${className}`}>
        <NetflixIcon className={iconClass} />
      </div>
    );
  }

  if (lowerName.includes('spotify')) {
    return (
      <div className={`relative bg-[#121212] border border-emerald-900/40 shadow-xs flex items-center justify-center shrink-0 ${sizeClasses} ${className}`}>
        <SpotifyIcon className={iconClass} />
      </div>
    );
  }

  if (lowerName.includes('chatgpt') || lowerName.includes('openai')) {
    return (
      <div className={`relative bg-[#10A37F] text-white border border-emerald-400/30 shadow-xs flex items-center justify-center shrink-0 ${sizeClasses} ${className}`}>
        <ChatGPTIcon className={`${iconClass} text-white fill-white`} />
      </div>
    );
  }

  if (lowerName.includes('apple') || lowerName.includes('icloud')) {
    return (
      <div className={`relative bg-slate-900 dark:bg-white text-white dark:text-slate-900 border border-slate-700 dark:border-slate-200 shadow-xs flex items-center justify-center shrink-0 ${sizeClasses} ${className}`}>
        <AppleIcon className={iconClass} />
      </div>
    );
  }

  // 3. Consumable Keywords matching with vibrant gradient palettes
  // A. 牙刷 / 刷頭 / 口腔
  if (lowerName.includes('牙刷') || lowerName.includes('刷頭') || lowerName.includes('牙線') || lowerName.includes('oral-b')) {
    return (
      <div className={`relative bg-gradient-to-br from-cyan-500 to-blue-600 text-white border border-cyan-400/30 shadow-xs flex items-center justify-center shrink-0 ${sizeClasses} ${className}`}>
        <ToothbrushIcon className={`${iconClass} stroke-[2.2]`} />
      </div>
    );
  }

  // B. 濾芯 / 淨水 / 水壺
  if (lowerName.includes('濾芯') || lowerName.includes('淨水') || lowerName.includes('濾水') || lowerName.includes('brita') || lowerName.includes('濾網')) {
    return (
      <div className={`relative bg-gradient-to-br from-blue-500 to-indigo-600 text-white border border-blue-400/30 shadow-xs flex items-center justify-center shrink-0 ${sizeClasses} ${className}`}>
        <Droplet className={`${iconClass} fill-white/30 stroke-[2]`} />
      </div>
    );
  }

  // C. 魚油 / 維他命 / 藥品 / 膠囊 / 保健
  if (lowerName.includes('魚油') || lowerName.includes('維他命') || lowerName.includes('膠囊') || lowerName.includes('錠') || category === 'medicine') {
    return (
      <div className={`relative bg-gradient-to-br from-amber-500 to-orange-600 text-white border border-amber-400/30 shadow-xs flex items-center justify-center shrink-0 ${sizeClasses} ${className}`}>
        <Pill className={`${iconClass} fill-white/20 stroke-[2]`} />
      </div>
    );
  }

  // D. 隱形眼鏡 / 保養液 / 眼藥水
  if (lowerName.includes('隱形眼鏡') || lowerName.includes('眼藥水') || lowerName.includes('保養液') || lowerName.includes('人工淚液')) {
    return (
      <div className={`relative bg-gradient-to-br from-teal-400 to-emerald-600 text-white border border-teal-300/30 shadow-xs flex items-center justify-center shrink-0 ${sizeClasses} ${className}`}>
        <Eye className={`${iconClass} stroke-[2.2]`} />
      </div>
    );
  }

  // E. 防曬 / 保養 / 乳液 / 精華 / 美妝
  if (lowerName.includes('防曬') || lowerName.includes('乳液') || lowerName.includes('精華') || category === 'skincare') {
    return (
      <div className={`relative bg-gradient-to-br from-pink-500 to-rose-600 text-white border border-pink-400/30 shadow-xs flex items-center justify-center shrink-0 ${sizeClasses} ${className}`}>
        <Sparkles className={`${iconClass} fill-white/30 stroke-[2]`} />
      </div>
    );
  }

  // F. 刮鬍刀 / 修容 / 刀片
  if (lowerName.includes('刮鬍') || lowerName.includes('刀片') || lowerName.includes('剃鬚')) {
    return (
      <div className={`relative bg-gradient-to-br from-slate-700 to-slate-900 text-white border border-slate-600/50 shadow-xs flex items-center justify-center shrink-0 ${sizeClasses} ${className}`}>
        <Scissors className={`${iconClass} stroke-[2]`} />
      </div>
    );
  }

  // G. 冷氣 / 空調 / 清淨機 / 風扇
  if (lowerName.includes('冷氣') || lowerName.includes('空調') || lowerName.includes('清淨機') || lowerName.includes('除濕')) {
    return (
      <div className={`relative bg-gradient-to-br from-sky-400 to-blue-500 text-white border border-sky-300/30 shadow-xs flex items-center justify-center shrink-0 ${sizeClasses} ${className}`}>
        <Wind className={`${iconClass} stroke-[2.2]`} />
      </div>
    );
  }

  // H. 衛生紙 / 紙巾 / 垃圾袋
  if (lowerName.includes('衛生紙') || lowerName.includes('紙巾') || lowerName.includes('垃圾袋')) {
    return (
      <div className={`relative bg-gradient-to-br from-violet-500 to-purple-600 text-white border border-violet-400/30 shadow-xs flex items-center justify-center shrink-0 ${sizeClasses} ${className}`}>
        <Layers className={`${iconClass} stroke-[2]`} />
      </div>
    );
  }

  // I. 車輛 / 機油 / 保養
  if (lowerName.includes('機油') || lowerName.includes('輪胎') || lowerName.includes('汽車') || lowerName.includes('機車')) {
    return (
      <div className={`relative bg-gradient-to-br from-red-600 to-rose-700 text-white border border-red-500/30 shadow-xs flex items-center justify-center shrink-0 ${sizeClasses} ${className}`}>
        <Wrench className={`${iconClass} stroke-[2]`} />
      </div>
    );
  }

  // J. 貼身衣物 / 內衣 / 襪子
  if (category === 'clothing' || lowerName.includes('內衣') || lowerName.includes('內褲') || lowerName.includes('襪')) {
    return (
      <div className={`relative bg-gradient-to-br from-amber-600 to-stone-700 text-white border border-amber-500/30 shadow-xs flex items-center justify-center shrink-0 ${sizeClasses} ${className}`}>
        <Shirt className={`${iconClass} stroke-[2]`} />
      </div>
    );
  }

  // K. 3C / 家電 / 原廠保固
  if (category === 'electronics' || category === 'appliances' || lowerName.includes('保固')) {
    return (
      <div className={`relative bg-gradient-to-br from-indigo-500 to-blue-700 text-white border border-indigo-400/30 shadow-xs flex items-center justify-center shrink-0 ${sizeClasses} ${className}`}>
        <Laptop className={`${iconClass} stroke-[2]`} />
      </div>
    );
  }

  // L. Default fallback with vibrant theme accent
  return (
    <div className={`relative bg-gradient-to-br from-[var(--app-accent)] to-[var(--app-accent-strong)] text-white border border-white/20 shadow-xs flex items-center justify-center shrink-0 ${sizeClasses} ${className}`}>
      <Package className={`${iconClass} stroke-[2]`} />
    </div>
  );
};
