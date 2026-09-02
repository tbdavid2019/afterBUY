import { ItemCategory, TrackingMode } from '../../shared/types.ts';

export interface CategoryMeta {
  id: ItemCategory;
  label: string;
  iconName: string;
  color: string;
  bg: string;
}

export const CATEGORIES: Record<ItemCategory, CategoryMeta> = {
  bathroom: { id: 'bathroom', label: '衛浴洗沐', iconName: 'Bath', color: 'text-cyan-400', bg: 'bg-cyan-500/10 border-cyan-500/20' },
  kitchen: { id: 'kitchen', label: '廚房飲食', iconName: 'Utensils', color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
  skincare: { id: 'skincare', label: '美妝保養', iconName: 'Sparkles', color: 'text-pink-400', bg: 'bg-pink-500/10 border-pink-500/20' },
  medicine: { id: 'medicine', label: '保健醫療', iconName: 'Pill', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
  appliances: { id: 'appliances', label: '家電家居', iconName: 'Tv', color: 'text-indigo-400', bg: 'bg-indigo-500/10 border-indigo-500/20' },
  electronics: { id: 'electronics', label: '3C 數位', iconName: 'Laptop', color: 'text-violet-400', bg: 'bg-violet-500/10 border-violet-500/20' },
  general: { id: 'general', label: '其他生活', iconName: 'Package', color: 'text-slate-400', bg: 'bg-slate-500/10 border-slate-500/20' },
};

export interface ItemPreset {
  name: string;
  category: ItemCategory;
  trackingMode: TrackingMode;
  cycleDays?: number;
  paoMonths?: number;
  minStockAlert: number;
  notes?: string;
}

export const ITEM_PRESETS: ItemPreset[] = [
  { name: '牙刷更換', category: 'bathroom', trackingMode: 'cycle', cycleDays: 90, minStockAlert: 2, notes: '牙醫師建議每 3 個月更換一次' },
  { name: '淨水器濾芯 (PP棉)', category: 'kitchen', trackingMode: 'cycle', cycleDays: 90, minStockAlert: 1, notes: '第一道前置濾芯' },
  { name: '淨水器活性碳濾芯', category: 'kitchen', trackingMode: 'cycle', cycleDays: 180, minStockAlert: 1, notes: '第二道/第三道濾芯' },
  { name: '冷氣機濾網清洗', category: 'appliances', trackingMode: 'cycle', cycleDays: 30, minStockAlert: 0, notes: '定期水洗維持冷房效率' },
  { name: '洗碗海綿菜瓜布', category: 'kitchen', trackingMode: 'cycle', cycleDays: 30, minStockAlert: 2, notes: '易滋生細菌，建議每月換新' },
  { name: '隱形眼鏡保養液', category: 'medicine', trackingMode: 'pao', paoMonths: 3, minStockAlert: 1, notes: '開封後 90 天內須用完' },
  { name: '防曬乳開封保存', category: 'skincare', trackingMode: 'pao', paoMonths: 12, minStockAlert: 1, notes: '開封後 12 個月防曬成分易變質' },
  { name: '眼藥水開封保存', category: 'medicine', trackingMode: 'pao', paoMonths: 1, minStockAlert: 1, notes: '開封後 1 個月內用畢' },
  { name: '刮鬍刀刀片', category: 'bathroom', trackingMode: 'cycle', cycleDays: 45, minStockAlert: 2, notes: '定期更換保持鋒利衛生' },
  { name: '空氣清淨機 HEPA 濾網', category: 'appliances', trackingMode: 'cycle', cycleDays: 365, minStockAlert: 1, notes: '原廠建議一年更換一次' },
];
