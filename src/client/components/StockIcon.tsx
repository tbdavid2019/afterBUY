import React from 'react';
import {
  Home,
  Zap,
  Droplets,
  Utensils,
  Car,
  Briefcase,
  Leaf,
  Wrench,
  Baby,
  PawPrint,
  Package,
  Boxes,
  Sparkles,
  type LucideIcon,
} from 'lucide-react';

export const STOCK_ICON_MAP: Record<string, LucideIcon> = {
  // Legacy / Emoji mappings
  '🏠': Home,
  '⚡': Zap,
  '🧴': Droplets,
  '🍳': Utensils,
  '🚗': Car,
  '💼': Briefcase,
  '🌿': Leaf,
  '🛠️': Wrench,
  '🛠': Wrench,
  '👶': Baby,
  '🐾': PawPrint,
  '📦': Package,
  '🌟': Boxes,
  // Key names
  home: Home,
  zap: Zap,
  droplets: Droplets,
  utensils: Utensils,
  car: Car,
  briefcase: Briefcase,
  leaf: Leaf,
  wrench: Wrench,
  baby: Baby,
  paw: PawPrint,
  'paw-print': PawPrint,
  package: Package,
  boxes: Boxes,
  all: Boxes,
  sparkles: Sparkles,
};

export const STOCK_ICON_LIST = [
  { key: '🏠', id: 'home', icon: Home, label: '居家' },
  { key: '⚡', id: 'zap', icon: Zap, label: '耗材' },
  { key: '🧴', id: 'droplets', icon: Droplets, label: '衛浴洗沐' },
  { key: '🍳', id: 'utensils', icon: Utensils, label: '廚房' },
  { key: '🚗', id: 'car', icon: Car, label: '車輛' },
  { key: '💼', id: 'briefcase', icon: Briefcase, label: '辦公' },
  { key: '🌿', id: 'leaf', icon: Leaf, label: '植栽' },
  { key: '🛠️', id: 'wrench', icon: Wrench, label: '工具' },
  { key: '👶', id: 'baby', icon: Baby, label: '母嬰' },
  { key: '🐾', id: 'paw', icon: PawPrint, label: '寵物' },
];

export interface StockIconProps {
  icon?: string | null;
  className?: string;
}

export const StockIcon: React.FC<StockIconProps> = ({ icon, className = 'w-5 h-5' }) => {
  if (!icon) return <Package className={className} />;
  const IconComponent = STOCK_ICON_MAP[icon] || STOCK_ICON_MAP[icon.trim()] || Package;
  return <IconComponent className={className} />;
};
