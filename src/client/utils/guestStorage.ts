import type { ItemResponse } from '../../shared/types.ts';

export const GUEST_ITEMS_KEY = 'afterbuy_guest_items_v1';
export const DEMO_ITEM_IDS = new Set(['demo-1', 'demo-2', 'demo-3', 'demo-4']);

export function readGuestItems(): ItemResponse[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(GUEST_ITEMS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((item) => item && typeof item.id === 'string') : [];
  } catch (error) {
    console.warn('Unable to read guest items from local storage', error);
    return [];
  }
}

/** Persist only user-created guest items. Demo data can be cleared/restored safely. */
export function writeGuestItems(items: ItemResponse[]): void {
  if (typeof window === 'undefined') return;
  const ownItems = items.filter((item) => !DEMO_ITEM_IDS.has(item.id));
  try {
    window.localStorage.setItem(GUEST_ITEMS_KEY, JSON.stringify(ownItems));
  } catch (error: any) {
    const quotaError = error?.name === 'QuotaExceededError' || error?.code === 22;
    throw new Error(quotaError
      ? '本機儲存空間不足，照片可能太大。請移除照片或清理瀏覽器儲存空間後再試。'
      : '訪客資料無法保存到本機，請確認瀏覽器允許網站儲存資料。');
  }
}

export function mergeGuestItems(items: ItemResponse[]): ItemResponse[] {
  const byId = new Map<string, ItemResponse>();
  for (const item of items) byId.set(item.id, item);
  for (const item of readGuestItems()) byId.set(item.id, item);
  return [...byId.values()];
}

export function clearGuestItems(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(GUEST_ITEMS_KEY);
}
