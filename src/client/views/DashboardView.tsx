import React, { useMemo, useState } from 'react';
import { Search, Plus, AlertTriangle, CheckCircle2, ShoppingBag, Sparkles, SlidersHorizontal, Camera, CheckSquare, RotateCcw, Trash2, MapPin, Fingerprint, Moon, Package } from 'lucide-react';
import { ItemResponse, ItemCategory, UserSession } from '../../shared/types.ts';
import { ItemCard } from '../components/ItemCard.tsx';
import { BatchPhotoModal } from '../components/BatchPhotoModal.tsx';
import { CATEGORIES } from '../utils/category.ts';
import { useTranslation } from '../i18n/index.tsx';

interface DashboardViewProps {
  items: ItemResponse[];
  onReplace: (id: string) => void | Promise<void>;
  onAdjustStock: (id: string, delta: number) => void | Promise<void>;
  onEdit: (item: ItemResponse) => void;
  onDelete: (id: string) => void | Promise<void>;
  onViewHistory: (item: ItemResponse) => void;
  onOpenNewItem: () => void;
  onStartUsing?: (id: string) => void | Promise<void>;
  onSnooze?: (id: string, days: number) => void | Promise<void>;
  onBatchReplace?: (ids: string[]) => Promise<void>;
  onBatchStock?: (ids: string[], delta: number) => Promise<void>;
  onBatchDelete?: (ids: string[]) => Promise<void>;
  onRefreshItems?: () => void;
  user?: UserSession | null;
  onAddGuestItems?: (items: ItemResponse[]) => void;
  onOpenAuth?: () => void;
  onClearDemoItems?: () => void;
  onRestoreDemoItems?: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  items, onReplace, onAdjustStock, onEdit, onDelete, onViewHistory, onOpenNewItem, onStartUsing, onSnooze,
  onBatchReplace, onBatchStock, onBatchDelete, onRefreshItems, user, onAddGuestItems, onOpenAuth, onClearDemoItems, onRestoreDemoItems,
}) => {
  const { t, locale } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'due' | 'healthy' | 'restock' | 'snoozed' | 'stored'>('all');
  const [selectedCategory, setSelectedCategory] = useState<ItemCategory | 'all'>('all');
  const [selectedLocation, setSelectedLocation] = useState<string | 'all'>('all');
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
  const [batchActionLoading, setBatchActionLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const counts = useMemo(() => ({
    due: items.filter((i) => i.healthStatus === 'overdue' || i.healthStatus === 'due_soon').length,
    healthy: items.filter((i) => i.healthStatus === 'healthy').length,
    restock: items.filter((i) => i.needsRestock).length,
    snoozed: items.filter((i) => i.healthStatus === 'snoozed').length,
    stored: items.filter((i) => i.isStored || i.healthStatus === 'stored').length,
  }), [items]);

  const uniqueLocations = useMemo(() => Array.from(new Set(items.map((item) => item.location?.trim()).filter(Boolean) as string[])), [items]);
  const filteredItems = useMemo(() => items.filter((item) => {
    const query = searchQuery.trim().toLowerCase();
    if (query && ![item.name, item.notes, item.location, item.specModel].some((value) => value?.toLowerCase().includes(query))) return false;
    if (statusFilter === 'due' && item.healthStatus !== 'overdue' && item.healthStatus !== 'due_soon') return false;
    if (statusFilter === 'healthy' && item.healthStatus !== 'healthy') return false;
    if (statusFilter === 'restock' && !item.needsRestock) return false;
    if (statusFilter === 'snoozed' && item.healthStatus !== 'snoozed') return false;
    if (statusFilter === 'stored' && !item.isStored && item.healthStatus !== 'stored') return false;
    if (selectedCategory !== 'all' && item.category !== selectedCategory) return false;
    if (selectedLocation !== 'all' && item.location !== selectedLocation) return false;
    return true;
  }), [items, searchQuery, statusFilter, selectedCategory, selectedLocation]);
  const hasFilters = Boolean(searchQuery.trim()) || statusFilter !== 'all' || selectedCategory !== 'all' || selectedLocation !== 'all';
  const clearFilters = () => { setSearchQuery(''); setStatusFilter('all'); setSelectedCategory('all'); setSelectedLocation('all'); };
  const toggleSelected = (id: string) => setSelectedIds((current) => { const next = new Set(current); next.has(id) ? next.delete(id) : next.add(id); return next; });
  const selectAll = () => setSelectedIds(selectedIds.size === filteredItems.length ? new Set() : new Set(filteredItems.map((item) => item.id)));

  const runBatch = async (action: () => Promise<void>, onSuccess?: () => void) => {
    setBatchActionLoading(true);
    try { await action(); onSuccess?.(); }
    catch (error) { alert(error instanceof Error ? error.message : (locale === 'zh-TW' ? '操作失敗' : 'Action failed')); }
    finally { setBatchActionLoading(false); }
  };
  const batchReplace = () => selectedIds.size && onBatchReplace ? void runBatch(() => onBatchReplace(Array.from(selectedIds)), () => { setSelectedIds(new Set()); setIsSelecting(false); }) : undefined;
  const batchStock = (delta: number) => selectedIds.size && onBatchStock ? void runBatch(() => onBatchStock(Array.from(selectedIds), delta)) : undefined;
  const batchDelete = () => {
    if (!selectedIds.size || !onBatchDelete || !confirm(t('batchDeleteConfirm', { n: selectedIds.size }))) return;
    void runBatch(() => onBatchDelete(Array.from(selectedIds)), () => { setSelectedIds(new Set()); setIsSelecting(false); });
  };

  const statusChips = [
    { id: 'due' as const, label: locale === 'zh-TW' ? '待處理' : 'Due', count: counts.due, icon: AlertTriangle, tone: 'text-rose-600' },
    { id: 'healthy' as const, label: locale === 'zh-TW' ? '狀態良好' : 'Healthy', count: counts.healthy, icon: CheckCircle2, tone: 'text-emerald-600' },
    { id: 'restock' as const, label: locale === 'zh-TW' ? '要補貨' : 'Restock', count: counts.restock, icon: ShoppingBag, tone: 'text-amber-600' },
    ...(counts.snoozed ? [{ id: 'snoozed' as const, label: locale === 'zh-TW' ? '延後' : 'Snoozed', count: counts.snoozed, icon: Moon, tone: 'text-sky-600' }] : []),
    ...(counts.stored ? [{ id: 'stored' as const, label: locale === 'zh-TW' ? '存放中' : 'Stored', count: counts.stored, icon: Package, tone: 'text-indigo-600' }] : []),
  ];

  return (
    <div className="space-y-4 pb-32">
      <section className="pt-1">
        <div className="flex items-end justify-between gap-3">
          <div className="min-w-0">
            <h2 className="ui-page-title tracking-tight text-[var(--app-text)]">{locale === 'zh-TW' ? '物品' : 'Items'}</h2>
            <p className="ui-body mt-1 text-[var(--app-muted)]">{locale === 'zh-TW' ? `${items.length} 件物品 · 快速掌握下一步` : `${items.length} tracked · see what needs attention`}</p>
          </div>
          <button type="button" onClick={onOpenNewItem} className="app-primary ui-button flex min-h-11 shrink-0 items-center gap-1.5 rounded-xl px-3 shadow-sm"><Plus className="h-4 w-4" />{locale === 'zh-TW' ? '新增' : 'Add'}</button>
        </div>
      </section>

      {!user && (
        <details className="app-surface rounded-xl border border-sky-500/30 p-3 shadow-sm">
          <summary className="ui-button flex min-h-11 cursor-pointer list-none items-center gap-2 text-[var(--app-text)]"><Sparkles className="h-4 w-4 text-sky-600" />{t('guestModeBannerTitle')}<span className="ui-meta ml-auto text-[var(--app-muted)]">{t('guestModeBannerBadge')}</span></summary>
          <div className="ui-meta mt-2 border-t border-[var(--app-border-subtle)] pt-2 text-[var(--app-muted)]">
            <p>{t('guestModeBannerDesc')}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {items.length > 0 && onClearDemoItems && <button type="button" onClick={onClearDemoItems} className="app-control ui-button min-h-11 rounded-xl border px-3">{t('guestModeClearDemoBtn')}</button>}
              {items.length === 0 && onRestoreDemoItems && <button type="button" onClick={onRestoreDemoItems} className="app-control ui-button min-h-11 rounded-xl border px-3"><RotateCcw className="mr-1 inline h-4 w-4" />{t('guestModeRestoreDemoBtn')}</button>}
              {onOpenAuth && <button type="button" onClick={onOpenAuth} className="app-primary ui-button min-h-11 rounded-xl px-3"><Fingerprint className="mr-1 inline h-4 w-4" />{t('guestModeLoginBtn')}</button>}
            </div>
          </div>
        </details>
      )}

      <section aria-label={locale === 'zh-TW' ? '狀態篩選' : 'Status filters'} className="flex flex-wrap gap-2">
        {statusChips.map(({ id, label, count, icon: Icon, tone }) => <button key={id} type="button" onClick={() => setStatusFilter(statusFilter === id ? 'all' : id)} aria-pressed={statusFilter === id} className={`app-control ui-button flex min-h-11 items-center gap-1.5 rounded-full border px-3 ${statusFilter === id ? 'app-primary' : ''}`}><Icon className={`h-4 w-4 ${statusFilter === id ? '' : tone}`} />{label}<span className="tabular-nums">{count}</span></button>)}
      </section>

      <section className="space-y-2">
        <div className="relative">
          <label htmlFor="dashboard-search" className="sr-only">{locale === 'zh-TW' ? '搜尋物品' : 'Search items'}</label>
          <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-[var(--app-muted)]" />
          <input id="dashboard-search" type="search" value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder={locale === 'zh-TW' ? '搜尋物品、備註或型號' : 'Search items, notes, or models'} className="app-surface ui-body min-h-11 w-full rounded-xl border pl-10 pr-3 text-[var(--app-text)] outline-none placeholder:text-[var(--app-muted-low)] focus:border-[var(--app-accent)]" />
        </div>
        <button type="button" onClick={() => setShowFilters((open) => !open)} className="app-control ui-button flex min-h-11 w-full items-center justify-between rounded-xl border px-3 text-left"><span className="flex items-center gap-2"><SlidersHorizontal className="h-4 w-4 text-[var(--app-accent-strong)]" />{locale === 'zh-TW' ? '分類與位置' : 'Category and location'}{hasFilters && <span className="rounded-full bg-[var(--app-accent)] px-1.5 text-white">•</span>}</span><span className="text-[var(--app-muted)]">{showFilters ? '⌃' : '⌄'}</span></button>
        {showFilters && <div className="app-surface rounded-xl border p-3 space-y-3">
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setSelectedCategory('all')} className={`ui-button min-h-11 rounded-full border px-3 ${selectedCategory === 'all' ? 'app-primary' : 'app-control'}`}>{locale === 'zh-TW' ? '全部類別' : 'All categories'}</button>
            {Object.values(CATEGORIES).map((category) => <button key={category.id} type="button" onClick={() => setSelectedCategory(selectedCategory === category.id ? 'all' : category.id)} className={`ui-button min-h-11 rounded-full border px-3 ${selectedCategory === category.id ? 'app-primary' : 'app-control'}`}>{category.label}</button>)}
          </div>
          {uniqueLocations.length > 0 && <div className="flex flex-wrap gap-2 border-t border-[var(--app-border-subtle)] pt-3"><span className="ui-meta flex items-center text-[var(--app-muted)]"><MapPin className="mr-1 h-4 w-4" />位置</span><button type="button" onClick={() => setSelectedLocation('all')} className={`ui-button min-h-11 rounded-full border px-3 ${selectedLocation === 'all' ? 'app-primary' : 'app-control'}`}>全部</button>{uniqueLocations.map((location) => <button key={location} type="button" onClick={() => setSelectedLocation(selectedLocation === location ? 'all' : location)} className={`ui-button min-h-11 rounded-full border px-3 ${selectedLocation === location ? 'app-primary' : 'app-control'}`}>{location}</button>)}</div>}
        </div>}
      </section>

      <section>
        <div className="mb-2 flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2"><h3 className="ui-section-title truncate text-[var(--app-text)]">{locale === 'zh-TW' ? '追蹤中的物品' : 'Tracked items'} <span className="font-normal text-[var(--app-muted)]">{filteredItems.length}</span></h3>{hasFilters && <button type="button" onClick={clearFilters} className="ui-button shrink-0 text-[var(--app-accent-strong)]">清除</button>}</div>
          <div className="flex shrink-0 gap-1.5"><button type="button" onClick={() => setIsPhotoModalOpen(true)} className="app-control ui-button flex min-h-11 items-center gap-1 rounded-xl border px-2.5"><Camera className="h-4 w-4" /><span className="hidden sm:inline">{t('batchIntake')}</span></button><button type="button" onClick={() => { setIsSelecting((value) => !value); setSelectedIds(new Set()); }} className={`ui-button flex min-h-11 items-center gap-1 rounded-xl border px-2.5 ${isSelecting ? 'app-primary' : 'app-control'}`}><CheckSquare className="h-4 w-4" /><span className="hidden sm:inline">{isSelecting ? t('cancelSelect') : t('batchMode')}</span></button></div>
        </div>
        {filteredItems.length === 0 ? <div className="app-surface rounded-2xl border p-6 text-center shadow-sm"><Sparkles className="mx-auto mb-2 h-8 w-8 text-[var(--app-accent-strong)]" /><h3 className="ui-section-title text-[var(--app-text)]">{items.length === 0 ? (!user ? t('guestModeClearedTitle') : t('emptyItemsTitle')) : (locale === 'zh-TW' ? '沒有符合條件的物品' : 'No matching items')}</h3><p className="ui-body mx-auto mt-1 max-w-xs text-[var(--app-muted)]">{items.length === 0 ? (!user ? t('guestModeClearedDesc') : t('emptyItemsDesc')) : (locale === 'zh-TW' ? '試著清除篩選條件。' : 'Try clearing filters.')}</p>{items.length === 0 && <div className="mt-4 flex flex-wrap justify-center gap-2"><button type="button" onClick={onOpenNewItem} className="app-primary ui-button min-h-11 rounded-xl px-4"><Plus className="mr-1 inline h-4 w-4" />{locale === 'zh-TW' ? '新增第一個物品' : 'Add first item'}</button>{!user && onRestoreDemoItems && <button type="button" onClick={onRestoreDemoItems} className="app-control ui-button min-h-11 rounded-xl border px-3">{t('guestModeRestoreDemoBtn')}</button>}</div>}</div> : <div className="grid grid-cols-1 gap-3">{filteredItems.map((item) => <ItemCard key={item.id} item={item} onReplace={onReplace} onAdjustStock={onAdjustStock} onEdit={onEdit} onDelete={onDelete} onViewHistory={onViewHistory} onStartUsing={onStartUsing} onSnooze={onSnooze} selectable={isSelecting} isSelected={selectedIds.has(item.id)} onToggleSelect={toggleSelected} />)}</div>}
      </section>

      {isSelecting && selectedIds.size > 0 && <div className="fixed bottom-20 left-3 right-3 z-40 mx-auto max-w-xl"><div className="app-surface flex items-center justify-between gap-2 rounded-2xl border p-2.5 shadow-xl"><div className="flex min-w-0 items-center gap-2"><span className="ui-button truncate">{t('selectedItems', { n: selectedIds.size })}</span><button type="button" onClick={selectAll} className="ui-button shrink-0 text-[var(--app-accent-strong)]">{selectedIds.size === filteredItems.length ? '取消全選' : '全選'}</button></div><div className="flex shrink-0 gap-1"><button type="button" disabled={batchActionLoading} onClick={batchReplace} className="app-primary ui-button min-h-11 rounded-xl px-2.5"><RotateCcw className="inline h-4 w-4" /></button><button type="button" disabled={batchActionLoading} onClick={() => batchStock(1)} className="app-control ui-button min-h-11 rounded-xl border px-2.5">+1</button><button type="button" disabled={batchActionLoading} onClick={batchDelete} className="app-control min-h-11 rounded-xl border px-2.5 text-rose-600"><Trash2 className="h-4 w-4" /></button></div></div></div>}
      <BatchPhotoModal isOpen={isPhotoModalOpen} onClose={() => setIsPhotoModalOpen(false)} onSuccess={() => onRefreshItems?.()} user={user} onAddGuestItems={onAddGuestItems} />
    </div>
  );
};
