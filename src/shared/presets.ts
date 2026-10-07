import type { ItemCategory, TrackingMode } from './types.ts';

export interface CategoryMeta {
  id: ItemCategory;
  label: string;
  iconName: string;
  color: string;
  bg: string;
}

export const CATEGORIES: Record<ItemCategory, CategoryMeta> = {
  bathroom: { id: 'bathroom', label: '衛浴洗沐', iconName: 'Bath', color: 'text-slate-700 dark:text-slate-300', bg: 'bg-slate-100/90 border-slate-200 dark:bg-slate-800 dark:border-slate-700' },
  kitchen: { id: 'kitchen', label: '廚房飲食', iconName: 'Utensils', color: 'text-slate-700 dark:text-slate-300', bg: 'bg-slate-100/90 border-slate-200 dark:bg-slate-800 dark:border-slate-700' },
  skincare: { id: 'skincare', label: '美妝保養', iconName: 'Sparkles', color: 'text-slate-700 dark:text-slate-300', bg: 'bg-slate-100/90 border-slate-200 dark:bg-slate-800 dark:border-slate-700' },
  medicine: { id: 'medicine', label: '保健醫療', iconName: 'Pill', color: 'text-slate-700 dark:text-slate-300', bg: 'bg-slate-100/90 border-slate-200 dark:bg-slate-800 dark:border-slate-700' },
  appliances: { id: 'appliances', label: '家電家居', iconName: 'Tv', color: 'text-slate-700 dark:text-slate-300', bg: 'bg-slate-100/90 border-slate-200 dark:bg-slate-800 dark:border-slate-700' },
  electronics: { id: 'electronics', label: '3C 數位', iconName: 'Laptop', color: 'text-slate-700 dark:text-slate-300', bg: 'bg-slate-100/90 border-slate-200 dark:bg-slate-800 dark:border-slate-700' },
  clothing: { id: 'clothing', label: '貼身穿戴', iconName: 'Shirt', color: 'text-slate-700 dark:text-slate-300', bg: 'bg-slate-100/90 border-slate-200 dark:bg-slate-800 dark:border-slate-700' },
  general: { id: 'general', label: '其他生活', iconName: 'Package', color: 'text-slate-700 dark:text-slate-300', bg: 'bg-slate-100/90 border-slate-200 dark:bg-slate-800 dark:border-slate-700' },
};

export interface ItemPreset {
  id?: string;
  name: string;
  category: ItemCategory;
  trackingMode: TrackingMode;
  cycleDays?: number;
  paoMonths?: number;
  initialQuantity?: number;
  dailyUsage?: number;
  quantityUnit?: string;
  minStockAlert: number;
  notes?: string;
  imageUrl?: string;
  defaultPrice?: number;
  defaultSpecModel?: string;
}

export const ITEM_PRESETS: ItemPreset[] = [
  { id: 'costco-fish-oil', name: '好市多 Kirkland 深海魚油膠囊 (150顆)', category: 'medicine', trackingMode: 'quantity', initialQuantity: 150, dailyUsage: 2, quantityUnit: '顆', minStockAlert: 1, notes: '好市多常備 Kirkland 150 粒魚油，每天 2 顆隨餐食用，約 75 天份', defaultSpecModel: '150顆/瓶', defaultPrice: 699 },
  { id: 'tissue-paper', name: '抽取式衛生紙 / 面紙', category: 'general', trackingMode: 'quantity', initialQuantity: 24, dailyUsage: 0.2, quantityUnit: '包', minStockAlert: 3, notes: '好市多 24 包一串，平均 5 天使用 1 包約 120 天份', defaultSpecModel: '24包/串', defaultPrice: 389 },
  { id: 'garbage-bags', name: '環保抽取垃圾袋', category: 'kitchen', trackingMode: 'quantity', initialQuantity: 50, dailyUsage: 1, quantityUnit: '個', minStockAlert: 2, notes: '居家日用品，中型 20L 環保袋，每天 1 個約 50 天份', defaultSpecModel: '50入/包', defaultPrice: 120 },
  { id: 'laundry-pods', name: '洗衣膠囊 / 洗衣精補充包', category: 'kitchen', trackingMode: 'quantity', initialQuantity: 60, dailyUsage: 1, quantityUnit: '顆', minStockAlert: 1, notes: '洗衣常備耗材，每天 1 顆洗滌使用，約 60 天份', defaultSpecModel: '60顆/盒', defaultPrice: 399 },
  { id: 'dish-soap-refill', name: '洗碗精補充包', category: 'kitchen', trackingMode: 'cycle', cycleDays: 60, minStockAlert: 1, notes: '廚房洗滌常備耗材，約每 2 個月用完補充', defaultSpecModel: '1000ml 補充包', defaultPrice: 139 },
  { id: 'vitamin-c', name: '綜合維他命C / B群', category: 'medicine', trackingMode: 'quantity', initialQuantity: 100, dailyUsage: 1, quantityUnit: '錠', minStockAlert: 1, notes: '每天 1 錠補充日常所需，約 100 天份', defaultSpecModel: '100錠/瓶', defaultPrice: 550 },
  { id: 'contact-lenses-daily', name: '日拋隱形眼鏡', category: 'bathroom', trackingMode: 'quantity', initialQuantity: 30, dailyUsage: 2, quantityUnit: '片', minStockAlert: 1, notes: '一盒 30 片，每天雙眼 2 片約 15 天份', defaultSpecModel: '30片/盒', defaultPrice: 550 },
  { id: 'toothbrush-head', name: '牙刷更換', category: 'bathroom', trackingMode: 'cycle', cycleDays: 90, minStockAlert: 2, notes: '牙醫師建議每 3 個月更換一次', imageUrl: '/images/items/toothbrush-head.png', defaultPrice: 150 },
  { id: 'underwear-renew', name: '貼身內褲換新', category: 'clothing', trackingMode: 'cycle', cycleDays: 90, minStockAlert: 3, notes: '衛生專家建議 3~6 個月淘汰換新防細菌滋生', defaultPrice: 200 },
  { id: 'bra-renew', name: '貼身內衣/運動內衣', category: 'clothing', trackingMode: 'cycle', cycleDays: 180, minStockAlert: 2, notes: '定期檢視彈性與支撐力', defaultPrice: 800 },
  { id: 'socks-renew', name: '運動襪/棉襪換新', category: 'clothing', trackingMode: 'cycle', cycleDays: 90, minStockAlert: 3, notes: '襪口鬆脫或腳跟變薄失去避震時換新', defaultPrice: 150 },
  { id: 'helmet-renew', name: '機車安全帽更換', category: 'clothing', trackingMode: 'cycle', cycleDays: 1095, minStockAlert: 1, notes: '交通安全建議 3 年換新，防護發泡材老化', defaultPrice: 1800 },
  { id: 'printer-ink', name: '印表機墨水/碳粉', category: 'electronics', trackingMode: 'cycle', cycleDays: 180, minStockAlert: 1, notes: '定期檢查墨水量防噴頭乾涸', defaultSpecModel: '黑色墨水', defaultPrice: 650 },
  { id: 'dry-battery', name: '3號/4號 乾電池 (AA/AAA)', category: 'electronics', trackingMode: 'cycle', cycleDays: 180, minStockAlert: 4, notes: '常備備用電池，定期檢查防漏液', defaultSpecModel: '3號 (AA)', defaultPrice: 180 },
  { id: 'brita-filter', name: 'Brita 淨水濾芯 (MAXTRA+)', category: 'kitchen', trackingMode: 'cycle', cycleDays: 30, minStockAlert: 2, notes: '建議硬水區域每月定期更換濾芯', imageUrl: '/images/items/water-filter.png', defaultSpecModel: 'MAXTRA+ 全效型', defaultPrice: 220 },
  { id: 'water-filter-pp', name: '淨水器濾芯 (PP棉)', category: 'kitchen', trackingMode: 'cycle', cycleDays: 90, minStockAlert: 1, notes: '第一道前置濾芯，過濾泥沙鐵鏽', imageUrl: '/images/items/water-filter.png', defaultPrice: 150 },
  { id: 'water-filter-carbon', name: '淨水器活性碳濾芯', category: 'kitchen', trackingMode: 'cycle', cycleDays: 180, minStockAlert: 1, notes: '第二道/第三道濾芯，吸附餘氯異味', imageUrl: '/images/items/carbon-filter.png', defaultPrice: 350 },
  { id: 'aircon-filter-clean', name: '冷氣機濾網清洗', category: 'appliances', trackingMode: 'cycle', cycleDays: 30, minStockAlert: 0, notes: '夏季每月水洗濾網，維持冷房效率與節能', imageUrl: '/images/items/aircon-filter.png' },
  { id: 'dish-sponge', name: '洗碗海綿菜瓜布', category: 'kitchen', trackingMode: 'cycle', cycleDays: 30, minStockAlert: 2, notes: '易滋生細菌，衛生專家建議每月換新', imageUrl: '/images/items/dish-sponge.png', defaultPrice: 40 },
  { id: 'contact-lens-solution', name: '隱形眼鏡保養液', category: 'medicine', trackingMode: 'pao', paoMonths: 3, minStockAlert: 1, notes: '開封後 90 天內須用完防感染', imageUrl: '/images/items/contact-lens-solution.png', defaultPrice: 280 },
  { id: 'sunscreen', name: '防曬乳開封保存', category: 'skincare', trackingMode: 'pao', paoMonths: 12, minStockAlert: 1, notes: '開封後 12 個月防曬成分易變質失效', imageUrl: '/images/items/sunscreen.png', defaultPrice: 750 },
  { id: 'face-serum', name: '保濕精華 / 眼霜', category: 'skincare', trackingMode: 'pao', paoMonths: 6, minStockAlert: 1, notes: '活性保養品建議開封 6 個月內使用完畢', defaultPrice: 1200 },
  { id: 'eye-drops', name: '眼藥水開封保存', category: 'medicine', trackingMode: 'pao', paoMonths: 1, minStockAlert: 1, notes: '開封後 1 個月內用畢，防無菌防腐劑失效', imageUrl: '/images/items/eye-drops.png', defaultPrice: 220 },
  { id: 'razor-cartridge', name: '刮鬍刀刀片', category: 'bathroom', trackingMode: 'cycle', cycleDays: 45, minStockAlert: 2, notes: '定期更換保持鋒利衛生與防刮傷皮膚', imageUrl: '/images/items/razor-cartridge.png', defaultPrice: 120 },
  { id: 'hepa-filter', name: '空氣清淨機 HEPA 濾網', category: 'appliances', trackingMode: 'cycle', cycleDays: 365, minStockAlert: 1, notes: '原廠建議一年更換一次維持過濾效能', imageUrl: '/images/items/hepa-filter.png', defaultPrice: 1200 },
  { id: 'dehumidifier-filter', name: '除濕機濾網清潔', category: 'appliances', trackingMode: 'cycle', cycleDays: 30, minStockAlert: 0, notes: '每月水洗維護除濕效能與空氣清新' },
  { id: 'motorcycle-oil', name: '機車機油更換 (1000km)', category: 'general', trackingMode: 'cycle', cycleDays: 90, minStockAlert: 1, notes: '每行駛 1,000 公里或每 3 個月定期換油保養', defaultPrice: 250 },
  { id: 'wardrobe-dehumidifier', name: '衣櫥除濕盒 / 除濕袋', category: 'general', trackingMode: 'cycle', cycleDays: 60, minStockAlert: 2, notes: '吸水滿飽和時即時替換防衣物發霉', defaultPrice: 65 },
];
