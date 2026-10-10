import type { ItemResponse } from '../../shared/types.ts';
import { computeItemStatus } from '../../shared/lifecycle.ts';

export const GUEST_ITEMS_KEY = 'afterbuy_guest_items_v1';
export const GUEST_DELETED_DEMOS_KEY = 'afterbuy_guest_deleted_demos_v1';
export const GUEST_MODIFIED_DEMOS_KEY = 'afterbuy_guest_modified_demos_v1';
export const GUEST_DEMOS_CLEARED_KEY = 'afterbuy_guest_demos_cleared_v1';
export const DEMO_ITEM_IDS = new Set(['demo-1', 'demo-2', 'demo-3', 'demo-4', 'demo-5']);

export function readGuestItems(): ItemResponse[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(GUEST_ITEMS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    const validItems = parsed.filter((item): item is ItemResponse => Boolean(item && typeof item.id === 'string'));
    const ownItems: ItemResponse[] = [];
    const legacyDemos: ItemResponse[] = [];

    for (const item of validItems) {
      if (DEMO_ITEM_IDS.has(item.id)) {
        legacyDemos.push(item);
      } else {
        ownItems.push(item);
      }
    }

    if (legacyDemos.length > 0) {
      try {
        if (!isDemoCleared()) {
          const existingModified = readModifiedDemoItems();
          const existingModifiedIds = new Set(existingModified.map((d) => d.id));
          const deletedIds = readDeletedDemoIds();
          const toAdd = legacyDemos.filter((d) => !existingModifiedIds.has(d.id) && !deletedIds.has(d.id));
          if (toAdd.length > 0) {
            writeModifiedDemoItems([...existingModified, ...toAdd]);
          }
        }
        window.localStorage.setItem(GUEST_ITEMS_KEY, JSON.stringify(ownItems));
      } catch {
        // Non-blocking cleanup: preserve legacy data if writing to storage fails (e.g. quota exceeded)
      }
    }

    return ownItems;
  } catch (error) {
    console.warn('Unable to read guest items from local storage', error);
    return [];
  }
}

export function readDeletedDemoIds(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = window.localStorage.getItem(GUEST_DELETED_DEMOS_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

function handleStorageError(error: any): never {
  if (error instanceof Error && (error.message.includes('本機儲存空間不足') || error.message.includes('訪客資料無法保存到本機'))) {
    throw error;
  }
  const quotaError = error?.name === 'QuotaExceededError' || error?.code === 22;
  throw new Error(quotaError
    ? '本機儲存空間不足，照片可能太大。請移除照片或清理瀏覽器儲存空間後再試。'
    : '訪客資料無法保存到本機，請確認瀏覽器允許網站儲存資料。');
}

export function writeDeletedDemoIds(ids: Set<string> | string[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(GUEST_DELETED_DEMOS_KEY, JSON.stringify([...ids]));
  } catch (error: any) {
    handleStorageError(error);
  }
}

export function deleteGuestDemoItem(id: string): void {
  if (!DEMO_ITEM_IDS.has(id)) return;
  const prevModifiedRaw = typeof window !== 'undefined' ? window.localStorage.getItem(GUEST_MODIFIED_DEMOS_KEY) : null;
  const prevGuestItemsRaw = typeof window !== 'undefined' ? window.localStorage.getItem(GUEST_ITEMS_KEY) : null;
  const prevDeletedRaw = typeof window !== 'undefined' ? window.localStorage.getItem(GUEST_DELETED_DEMOS_KEY) : null;

  try {
    const modified = readModifiedDemoItems().filter((item) => item.id !== id);
    writeModifiedDemoItems(modified);

    if (typeof window !== 'undefined' && prevGuestItemsRaw && prevGuestItemsRaw.includes(id)) {
      try {
        const parsed = JSON.parse(prevGuestItemsRaw);
        if (Array.isArray(parsed)) {
          window.localStorage.setItem(GUEST_ITEMS_KEY, JSON.stringify(parsed.filter((i) => i.id !== id)));
        }
      } catch {}
    }

    const deleted = readDeletedDemoIds();
    deleted.add(id);
    writeDeletedDemoIds(deleted);
  } catch (error: any) {
    if (typeof window !== 'undefined') {
      try {
        if (prevDeletedRaw !== null) window.localStorage.setItem(GUEST_DELETED_DEMOS_KEY, prevDeletedRaw);
        else window.localStorage.removeItem(GUEST_DELETED_DEMOS_KEY);

        if (prevModifiedRaw !== null) window.localStorage.setItem(GUEST_MODIFIED_DEMOS_KEY, prevModifiedRaw);
        else window.localStorage.removeItem(GUEST_MODIFIED_DEMOS_KEY);

        if (prevGuestItemsRaw !== null) window.localStorage.setItem(GUEST_ITEMS_KEY, prevGuestItemsRaw);
        else window.localStorage.removeItem(GUEST_ITEMS_KEY);
      } catch {}
    }
    handleStorageError(error);
  }
}

export function deleteGuestDemoItems(ids: string[]): void {
  const targetIds = ids.filter((id) => DEMO_ITEM_IDS.has(id));
  if (targetIds.length === 0) return;
  const targetSet = new Set(targetIds);

  const prevModifiedRaw = typeof window !== 'undefined' ? window.localStorage.getItem(GUEST_MODIFIED_DEMOS_KEY) : null;
  const prevGuestItemsRaw = typeof window !== 'undefined' ? window.localStorage.getItem(GUEST_ITEMS_KEY) : null;
  const prevDeletedRaw = typeof window !== 'undefined' ? window.localStorage.getItem(GUEST_DELETED_DEMOS_KEY) : null;

  try {
    const modified = readModifiedDemoItems().filter((item) => !targetSet.has(item.id));
    writeModifiedDemoItems(modified);

    if (typeof window !== 'undefined' && prevGuestItemsRaw) {
      try {
        const parsed = JSON.parse(prevGuestItemsRaw);
        if (Array.isArray(parsed)) {
          window.localStorage.setItem(GUEST_ITEMS_KEY, JSON.stringify(parsed.filter((i) => !targetSet.has(i.id))));
        }
      } catch {}
    }

    const deleted = readDeletedDemoIds();
    for (const id of targetIds) deleted.add(id);
    writeDeletedDemoIds(deleted);
  } catch (error: any) {
    if (typeof window !== 'undefined') {
      try {
        if (prevDeletedRaw !== null) window.localStorage.setItem(GUEST_DELETED_DEMOS_KEY, prevDeletedRaw);
        else window.localStorage.removeItem(GUEST_DELETED_DEMOS_KEY);

        if (prevModifiedRaw !== null) window.localStorage.setItem(GUEST_MODIFIED_DEMOS_KEY, prevModifiedRaw);
        else window.localStorage.removeItem(GUEST_MODIFIED_DEMOS_KEY);

        if (prevGuestItemsRaw !== null) window.localStorage.setItem(GUEST_ITEMS_KEY, prevGuestItemsRaw);
        else window.localStorage.removeItem(GUEST_ITEMS_KEY);
      } catch {}
    }
    handleStorageError(error);
  }
}

export function readModifiedDemoItems(): ItemResponse[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(GUEST_MODIFIED_DEMOS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((item) => item && typeof item.id === 'string') : [];
  } catch {
    return [];
  }
}

export function writeModifiedDemoItems(items: ItemResponse[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(GUEST_MODIFIED_DEMOS_KEY, JSON.stringify(items));
  } catch (error: any) {
    handleStorageError(error);
  }
}

export function isDemoCleared(): boolean {
  if (typeof window === 'undefined') return false;
  return window.localStorage.getItem(GUEST_DEMOS_CLEARED_KEY) === 'true';
}

export function setDemoCleared(cleared: boolean): void {
  if (typeof window === 'undefined') return;
  if (cleared) {
    window.localStorage.setItem(GUEST_DEMOS_CLEARED_KEY, 'true');
  } else {
    window.localStorage.removeItem(GUEST_DEMOS_CLEARED_KEY);
  }
}

export function readUnmigratedLegacyDemos(): ItemResponse[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(GUEST_ITEMS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is ItemResponse => Boolean(item && typeof item.id === 'string' && DEMO_ITEM_IDS.has(item.id)));
  } catch {
    return [];
  }
}

/** Persist user-created guest items, deleted demo IDs, and modified demo items. */
export function writeGuestItems(items: ItemResponse[], options?: { preserveDemos?: boolean }): void {
  if (typeof window === 'undefined') return;
  const ownItems = items.filter((item) => !DEMO_ITEM_IDS.has(item.id));
  const deletedDemoIds = readDeletedDemoIds();
  const demoItemsInList = items.filter((item) => DEMO_ITEM_IDS.has(item.id) && !deletedDemoIds.has(item.id));

  if (!options?.preserveDemos && demoItemsInList.length > 0) {
    try {
      writeModifiedDemoItems(demoItemsInList);
      try {
        window.localStorage.setItem(GUEST_ITEMS_KEY, JSON.stringify(ownItems));
      } catch (error: any) {
        handleStorageError(error);
      }
    } catch (error: any) {
      // Writing to modified demos key directly failed (e.g. storage near quota).
      // Free space by writing ownItems into GUEST_ITEMS_KEY first, then retry saving modified demos.
      const previousRaw = window.localStorage.getItem(GUEST_ITEMS_KEY);
      const previousModifiedRaw = window.localStorage.getItem(GUEST_MODIFIED_DEMOS_KEY);
      try {
        window.localStorage.setItem(GUEST_ITEMS_KEY, JSON.stringify(ownItems));
        writeModifiedDemoItems(demoItemsInList);
      } catch (retryError: any) {
        // Still failed to save in modified demos key. Restore original stored values so data is not lost.
        try {
          if (previousRaw !== null) {
            window.localStorage.setItem(GUEST_ITEMS_KEY, previousRaw);
          } else {
            window.localStorage.removeItem(GUEST_ITEMS_KEY);
          }
          if (previousModifiedRaw !== null) {
            window.localStorage.setItem(GUEST_MODIFIED_DEMOS_KEY, previousModifiedRaw);
          } else {
            window.localStorage.removeItem(GUEST_MODIFIED_DEMOS_KEY);
          }
        } catch {}
        handleStorageError(retryError);
      }
    }

    const currentDemoIds = new Set(demoItemsInList.map((i) => i.id));
    let changed = false;
    for (const id of DEMO_ITEM_IDS) {
      if (!currentDemoIds.has(id) && !deletedDemoIds.has(id)) {
        deletedDemoIds.add(id);
        changed = true;
      }
    }
    if (changed) {
      writeDeletedDemoIds(deletedDemoIds);
    }
  } else {
    try {
      const unmigrated = options?.preserveDemos ? readUnmigratedLegacyDemos() : [];
      window.localStorage.setItem(GUEST_ITEMS_KEY, JSON.stringify([...ownItems, ...unmigrated]));
    } catch (error: any) {
      handleStorageError(error);
    }
  }
}

export function mergeGuestItems(items: ItemResponse[]): ItemResponse[] {
  const now = new Date();
  const ownItems = readGuestItems().map((item) => ({
    ...item,
    ...(item.startDate ? computeItemStatus(item, now) : {}),
  }));
  if (isDemoCleared()) {
    return ownItems;
  }

  const deletedDemos = readDeletedDemoIds();
  const modifiedDemoMap = new Map(readModifiedDemoItems().map((i) => [i.id, i]));

  // If local storage quota prevented migrating some legacy demo items, incorporate them
  for (const unmigrated of readUnmigratedLegacyDemos()) {
    if (!modifiedDemoMap.has(unmigrated.id) && !deletedDemos.has(unmigrated.id)) {
      modifiedDemoMap.set(unmigrated.id, unmigrated);
    }
  }

  const byId = new Map<string, ItemResponse>();

  for (const item of items) {
    if (deletedDemos.has(item.id)) continue;
    const modified = modifiedDemoMap.get(item.id);
    const merged = modified ? { ...item, ...modified } : item;
    const derived = merged.startDate ? computeItemStatus(merged, now) : {};
    byId.set(item.id, {
      ...merged,
      ...derived,
    });
  }

  for (const item of ownItems) {
    byId.set(item.id, item);
  }

  return [...byId.values()];
}

export function clearGuestItems(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(GUEST_ITEMS_KEY);
  window.localStorage.removeItem(GUEST_DELETED_DEMOS_KEY);
  window.localStorage.removeItem(GUEST_MODIFIED_DEMOS_KEY);
  setDemoCleared(true);
}

export function restoreGuestDemoItems(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(GUEST_DELETED_DEMOS_KEY);
  window.localStorage.removeItem(GUEST_MODIFIED_DEMOS_KEY);
  setDemoCleared(false);
}
