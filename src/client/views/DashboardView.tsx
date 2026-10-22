import React, { useMemo, useState } from 'react';
import { Search, Plus, AlertTriangle, CheckCircle2, ShoppingBag, Sparkles, SlidersHorizontal, Camera, CheckSquare, RotateCcw, Trash2, MapPin, Fingerprint, Moon, Package, LayoutGrid, List, Minimize2, Maximize2 } from 'lucide-react';
import { ItemResponse, ItemCategory, UserSession } from '../../shared/types.ts';
import { ItemCard } from '../components/ItemCard.tsx';
import { CATEGORIES } from '../utils/category.ts';
import { useTranslation } from '../i18n/index.tsx';
import { DEMO_ITEM_IDS } from '../utils/guestStorage.ts';

interface DashboardViewProps {
  items: ItemResponse[];
  onReplace: (id: string, unitId?: string) => void | Promise<void>;
  onAdjustStock: (id: string, delta: number) => void | Promise<void>;
  onEdit: (item: ItemResponse) => void;
  onDelete: (id: string) => boolean | Promise<boolean | void> | void;
  onViewHistory: (item: ItemResponse) => void;
  onOpenNewItem: () => void;
  onStartUsing?: (id: string) => void | Promise<void>;
  onSnooze?: (id: string, days: number) => void | Promise<void>;
  onConsume?: (id: string, amount: number) => void | Promise<void>;
  onBatchReplace?: (ids: string[]) => Promise<void>;
  onBatchStock?: (ids: string[], delta: number) => Promise<void>;
  onBatchDelete?: (ids: string[]) => boolean | Promise<boolean | void> | void;
  onRefreshItems?: () => void;
  user?: UserSession | null;
  onAddGuestItems?: (items: ItemResponse[]) => void;
  onOpenAuth?: () => void;
  onClearDemoItems?: () => void;
  onRestoreDemoItems?: () => void;
  onOpenPresetCatalog?: () => void;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  onOpenBatchPhoto?: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  items, onReplace, onAdjustStock, onEdit, onDelete, onViewHistory, onOpenNewItem, onStartUsing, onSnooze, onConsume,
  onBatchReplace, onBatchStock, onBatchDelete, onRefreshItems, user, onAddGuestItems, onOpenAuth, onClearDemoItems, onRestoreDemoItems,
  onOpenPresetCatalog, searchQuery: externalSearchQuery, onSearchChange: externalOnSearchChange,
}) => {
  const { t, locale } = useTranslation();
  const [internalSearchQuery, setInternalSearchQuery] = useState('');
  const searchQuery = externalSearchQuery !== undefined ? externalSearchQuery : internalSearchQuery;
  const setSearchQuery = (val: string) => {
    if (externalOnSearchChange) externalOnSearchChange(val);
    else setInternalSearchQuery(val);
  };

  const [statusFilter, setStatusFilter] = useState<'all' | 'due' | 'healthy' | 'restock' | 'snoozed' | 'stored'>('all');
  const [selectedCategory, setSelectedCategory] = useState<ItemCategory | 'all'>('all');
  const [selectedLocation, setSelectedLocation] = useState<string | 'all'>('all');
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [batchActionLoading, setBatchActionLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(() => {
    try {
      return (localStorage.getItem('afterbuy_view_mode') as 'grid' | 'list') || 'list';
    } catch {
      return 'list';
    }
  });

  const toggleViewMode = () => {
    const next = viewMode === 'grid' ? 'list' : 'grid';
    setViewMode(next);
    try {
      localStorage.setItem('afterbuy_view_mode', next);
    } catch {}
  };

  const [densityMode, setDensityMode] = useState<'compact' | 'detailed'>(() => {
    try {
      return (localStorage.getItem('afterbuy_density_mode') as 'compact' | 'detailed') || 'compact';
    } catch {
      return 'compact';
    }
  });

  const toggleDensityMode = () => {
    const next = densityMode === 'compact' ? 'detailed' : 'compact';
    setDensityMode(next);
    try {
      localStorage.setItem('afterbuy_density_mode', next);
    } catch {}
  };

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

  const runBatch = async (action: () => Promise<any> | any, onSuccess?: () => void) => {
    setBatchActionLoading(true);
    try {
      const res = await action();
      if (res !== false) {
        onSuccess?.();
      }
    }
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
    { id: 'due' as const, label: locale === 'zh-TW' ? '待處理' : 'Due', count: counts.due, dotClass: 'bg-rose-500' },
    { id: 'healthy' as const, label: locale === 'zh-TW' ? '狀態良好' : 'Healthy', count: counts.healthy, dotClass: 'bg-emerald-500' },
    { id: 'restock' as const, label: locale === 'zh-TW' ? '要補貨' : 'Restock', count: counts.restock, dotClass: 'bg-amber-500' },
    ...(counts.snoozed ? [{ id: 'snoozed' as const, label: locale === 'zh-TW' ? '延後' : 'Snoozed', count: counts.snoozed, dotClass: 'bg-sky-500' }] : []),
    ...(counts.stored ? [{ id: 'stored' as const, label: locale === 'zh-TW' ? '存放中' : 'Stored', count: counts.stored, dotClass: 'bg-slate-400' }] : []),
  ];

  return (
    <div className="space-y-3.5 pb-36 sm:pb-40">
      {!user && (
        <div className="flex flex-wrap gap-2">
          {items.some((i) => DEMO_ITEM_IDS.has(i.id)) && onClearDemoItems && <button type="button" onClick={onClearDemoItems} className="app-control ui-button min-h-11 rounded-xl px-3">{t('guestModeClearDemoBtn')}</button>}
          {!items.some((i) => DEMO_ITEM_IDS.has(i.id)) && onRestoreDemoItems && <button type="button" onClick={onRestoreDemoItems} className="app-control ui-button min-h-11 rounded-xl px-3">{t('guestModeRestoreDemoBtn')}</button>}
        </div>
      )}

      {/* Mobile Search Bar (Only shown on mobile, since desktop header has search) */}
      <div className="md:hidden relative w-full">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--app-muted)]" />
        <input
          id="dashboard-search-mobile"
          type="search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={locale === 'zh-TW' ? '搜尋物品、型號或備註...' : 'Search items, models, or notes...'}
          className="w-full bg-[var(--app-input-bg)] border border-[var(--app-border)] rounded-xl pl-9 pr-9 py-2 text-sm text-[var(--app-text)] placeholder:text-[var(--app-muted)] focus:outline-hidden focus:border-[var(--app-accent)] transition-colors font-medium"
        />
        {Boolean(searchQuery) && (
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            aria-label="清除搜尋"
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--app-muted)] hover:text-[var(--app-text)] font-bold w-6 h-6 flex items-center justify-center rounded-full hover:bg-[var(--app-surface-subtle)]"
          >
            ×
          </button>
        )}
      </div>

      {/* Status Filter Chips Row & Toolbar Controls */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2.5 sm:gap-3">
        {/* Status Chips */}
        <section aria-label={locale === 'zh-TW' ? '狀態篩選' : 'Status filters'} className="flex gap-2 sm:gap-2.5 overflow-x-auto no-scrollbar py-0.5 shrink-0">
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            className={`px-3.5 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-bold rounded-xl border transition-all shrink-0 tactile-press ${
              statusFilter === 'all'
                ? 'bg-[#17324D] text-[#FFF9E8] border-[#17324D] dark:bg-[#FFB010] dark:text-[#2B251A] dark:border-[#FFB010] shadow-xs'
                : 'bg-[var(--app-surface)] text-[var(--app-text)] border-[var(--app-border)] hover:bg-[var(--app-surface-subtle)]'
            }`}
          >
            {locale === 'zh-TW' ? '全部' : 'All'}
            <span className="tabular-nums ml-1.5 opacity-80 font-black">{items.length}</span>
          </button>

          {statusChips.map(({ id, label, count, dotClass }) => (
            <button
              key={id}
              type="button"
              onClick={() => setStatusFilter(statusFilter === id ? 'all' : id)}
              aria-pressed={statusFilter === id}
              className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-2 sm:py-2.5 text-xs sm:text-sm font-bold rounded-xl border transition-all shrink-0 tactile-press ${
                statusFilter === id
                  ? 'bg-[#17324D] text-[#FFF9E8] border-[#17324D] dark:bg-[#FFB010] dark:text-[#2B251A] dark:border-[#FFB010] shadow-xs'
                  : 'bg-[var(--app-surface)] text-[var(--app-text)] border-[var(--app-border)] hover:bg-[var(--app-surface-subtle)]'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${dotClass}`} />
              <span>{label}</span>
              <span className="tabular-nums font-black ml-0.5">{count}</span>
            </button>
          ))}
        </section>

        {/* Secondary Toolbar Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar py-0.5 shrink-0 self-start md:self-auto">
          {hasFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="text-xs sm:text-sm font-bold text-[var(--app-accent-strong)] hover:underline shrink-0 px-2 py-1 tactile-press"
            >
              {locale === 'zh-TW' ? '重設' : 'Reset'}
            </button>
          )}

          <button
            type="button"
            onClick={() => setShowFilters((open) => !open)}
            aria-label={locale === 'zh-TW' ? '分類與位置篩選' : 'Filter by category and location'}
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-2 text-xs sm:text-sm font-medium rounded-xl border transition-colors tactile-press shrink-0 ${
              showFilters || selectedCategory !== 'all' || selectedLocation !== 'all'
                ? 'bg-[var(--app-surface-subtle)] border-[var(--app-border)] text-[var(--app-text)] font-semibold'
                : 'bg-[var(--app-surface)] border-[var(--app-border)] text-[var(--app-muted)] hover:text-[var(--app-text)] hover:bg-[var(--app-surface-subtle)]'
            }`}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{locale === 'zh-TW' ? '篩選' : 'Filter'}</span>
            {(selectedCategory !== 'all' || selectedLocation !== 'all') && (
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--app-accent)]" />
            )}
          </button>

          <button
            type="button"
            onClick={toggleViewMode}
            aria-label={viewMode === 'grid' ? (locale === 'zh-TW' ? '切換為清單模式' : 'Switch to list view') : (locale === 'zh-TW' ? '切換為雙欄網格' : 'Switch to grid view')}
            title={viewMode === 'grid' ? (locale === 'zh-TW' ? '切換為清單模式' : 'Switch to list view') : (locale === 'zh-TW' ? '切換為雙欄網格' : 'Switch to grid view')}
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-2 text-xs sm:text-sm font-medium rounded-xl border transition-colors tactile-press shrink-0 ${
              viewMode === 'grid'
                ? 'bg-[var(--app-surface-subtle)] border-[var(--app-border)] text-[var(--app-text)] font-semibold'
                : 'bg-[var(--app-surface)] border-[var(--app-border)] text-[var(--app-muted)] hover:text-[var(--app-text)] hover:bg-[var(--app-surface-subtle)]'
            }`}
          >
            {viewMode === 'grid' ? <List className="h-3.5 w-3.5" /> : <LayoutGrid className="h-3.5 w-3.5" />}
            <span className="hidden sm:inline">{viewMode === 'grid' ? (locale === 'zh-TW' ? '清單' : 'List') : (locale === 'zh-TW' ? '網格' : 'Grid')}</span>
          </button>

          <button
            type="button"
            onClick={toggleDensityMode}
            aria-label={densityMode === 'compact' ? (locale === 'zh-TW' ? '切換為詳細卡片' : 'Switch to detailed') : (locale === 'zh-TW' ? '切換為精簡卡片' : 'Switch to compact')}
            title={densityMode === 'compact' ? (locale === 'zh-TW' ? '切換為詳細卡片' : 'Switch to detailed') : (locale === 'zh-TW' ? '切換為精簡卡片' : 'Switch to compact')}
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-2 text-xs sm:text-sm font-medium rounded-xl border transition-colors tactile-press shrink-0 ${
              densityMode === 'compact'
                ? 'bg-[var(--app-surface-subtle)] border-[var(--app-border)] text-[var(--app-text)] font-semibold'
                : 'bg-[var(--app-surface)] border-[var(--app-border)] text-[var(--app-muted)] hover:text-[var(--app-text)] hover:bg-[var(--app-surface-subtle)]'
            }`}
          >
            {densityMode === 'compact' ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
            <span>{densityMode === 'compact' ? (locale === 'zh-TW' ? '精簡' : 'Compact') : (locale === 'zh-TW' ? '詳細' : 'Detailed')}</span>
          </button>

          <button
            type="button"
            onClick={() => { setIsSelecting((value) => !value); setSelectedIds(new Set()); }}
            aria-label={isSelecting ? t('cancelSelect') : t('batchMode')}
            title={isSelecting ? t('cancelSelect') : t('batchMode')}
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-2 text-xs sm:text-sm font-medium rounded-xl border transition-colors tactile-press shrink-0 ${
              isSelecting
                ? 'bg-[var(--app-accent-soft)] border-[var(--app-accent)] text-[var(--app-accent-strong)] font-semibold'
                : 'border-[var(--app-border)] bg-[var(--app-surface)] text-[var(--app-muted)] hover:text-[var(--app-text)] hover:bg-[var(--app-surface-subtle)]'
            }`}
          >
            <CheckSquare className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{isSelecting ? t('cancelSelect') : t('batchMode')}</span>
          </button>
        </div>
      </div>

      <p className="sm:hidden ui-meta text-[var(--app-muted)]">右滑物品：今天已換，可復原 · 左滑：更多操作。空白處左右滑可切換頁面。</p>

      {/* Filter Drawer */}
      {showFilters && (
        <div className="rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] p-3.5 space-y-3 sheet-content-animate shadow-xs text-xs">
          <div>
            <span className="font-semibold text-[var(--app-text)] block mb-2">
              {locale === 'zh-TW' ? '耗材分類' : 'Category'}
            </span>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setSelectedCategory('all')}
                className={`px-2.5 py-1 rounded-md border font-medium transition-colors tactile-press ${
                  selectedCategory === 'all'
                    ? 'app-primary border-transparent'
                    : 'border-[var(--app-border)] text-[var(--app-muted)] hover:text-[var(--app-text)] hover:bg-[var(--app-surface-subtle)]'
                }`}
              >
                {locale === 'zh-TW' ? '全部類別' : 'All categories'}
              </button>
              {Object.values(CATEGORIES).map((category) => (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => setSelectedCategory(selectedCategory === category.id ? 'all' : category.id)}
                  className={`px-2.5 py-1 rounded-md border font-medium transition-colors tactile-press ${
                    selectedCategory === category.id
                      ? 'app-primary border-transparent'
                      : 'border-[var(--app-border)] text-[var(--app-muted)] hover:text-[var(--app-text)] hover:bg-[var(--app-surface-subtle)]'
                  }`}
                >
                  {category.label}
                </button>
              ))}
            </div>
          </div>

          {uniqueLocations.length > 0 && (
            <div className="border-t border-[var(--app-border)] pt-3">
              <span className="font-semibold text-[var(--app-text)] block mb-2">
                {locale === 'zh-TW' ? '放置位置' : 'Location'}
              </span>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => setSelectedLocation('all')}
                  className={`px-2.5 py-1 rounded-md border font-medium transition-colors tactile-press ${
                    selectedLocation === 'all'
                      ? 'app-primary border-transparent'
                      : 'border-[var(--app-border)] text-[var(--app-muted)] hover:text-[var(--app-text)] hover:bg-[var(--app-surface-subtle)]'
                  }`}
                >
                  {locale === 'zh-TW' ? '全部位置' : 'All locations'}
                </button>
                {uniqueLocations.map((loc) => (
                  <button
                    key={loc}
                    type="button"
                    onClick={() => setSelectedLocation(selectedLocation === loc ? 'all' : loc)}
                    className={`px-2.5 py-1 rounded-md border font-medium transition-colors tactile-press ${
                      selectedLocation === loc
                        ? 'app-primary border-transparent'
                        : 'border-[var(--app-border)] text-[var(--app-muted)] hover:text-[var(--app-text)] hover:bg-[var(--app-surface-subtle)]'
                    }`}
                  >
                    {loc}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Items Section */}
      <section>
        {filteredItems.length === 0 ? (
          <div className="app-surface rounded-xl border border-[var(--app-border)] p-8 text-center shadow-xs">
            <Package className="mx-auto mb-2 h-8 w-8 text-[var(--app-muted-low)]" />
            <h3 className="text-base font-semibold text-[var(--app-text)]">
              {items.length === 0 ? (!user ? t('guestModeClearedTitle') : t('emptyItemsTitle')) : (locale === 'zh-TW' ? '沒有符合條件的耗材' : 'No matching items')}
            </h3>
            <p className="text-sm text-[var(--app-muted)] mx-auto mt-1 max-w-xs font-medium">
              {items.length === 0 ? (!user ? t('guestModeClearedDesc') : t('emptyItemsDesc')) : (locale === 'zh-TW' ? '請嘗試清除篩選或調整搜尋關鍵字。' : 'Try clearing filters.')}
            </p>
            {items.length === 0 && (
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {onOpenPresetCatalog && (
                  <button
                    type="button"
                    onClick={onOpenPresetCatalog}
                    className="app-primary px-4 py-2 text-sm font-bold rounded-xl shadow-xs tactile-press flex items-center gap-1.5"
                  >
                    <Sparkles className="h-4 w-4" />
                    {locale === 'zh-TW' ? '從範本庫挑選 (30+)' : 'Browse Presets'}
                  </button>
                )}
                <button type="button" onClick={onOpenNewItem} className="app-control border border-[var(--app-border)] px-4 py-2 text-sm font-bold rounded-xl tactile-press flex items-center gap-1.5">
                  <Plus className="h-4 w-4" />{locale === 'zh-TW' ? '自訂建立耗材' : 'Add custom item'}
                </button>
                {!user && onRestoreDemoItems && (
                  <button type="button" onClick={onRestoreDemoItems} className="px-3.5 py-2 text-sm font-bold rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-subtle)] text-[var(--app-text)] hover:bg-[var(--app-surface)] tactile-press">
                    {t('guestModeRestoreDemoBtn')}
                  </button>
                )}
              </div>
            )}
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            {filteredItems.map((item) => (
              <ItemCard
                key={item.id}
                item={item}
                viewMode="grid"
                isCompact={densityMode === 'compact'}
                onReplace={onReplace}
                onAdjustStock={onAdjustStock}
                onEdit={onEdit}
                onDelete={onDelete}
                onViewHistory={onViewHistory}
                onStartUsing={onStartUsing}
                onSnooze={onSnooze}
                onConsume={onConsume}
                selectable={isSelecting}
                isSelected={selectedIds.has(item.id)}
                onToggleSelect={toggleSelected}
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-4">
            {filteredItems.map((item) => (
              <ItemCard
                key={item.id}
                item={item}
                viewMode="list"
                isCompact={densityMode === 'compact'}
                onReplace={onReplace}
                onAdjustStock={onAdjustStock}
                onEdit={onEdit}
                onDelete={onDelete}
                onViewHistory={onViewHistory}
                onStartUsing={onStartUsing}
                onSnooze={onSnooze}
                onConsume={onConsume}
                selectable={isSelecting}
                isSelected={selectedIds.has(item.id)}
                onToggleSelect={toggleSelected}
              />
            ))}
          </div>
        )}
      </section>

      {/* Mobile Floating Action Button (FAB) in Thumb Zone */}
      {!isSelecting && (
        <button
          type="button"
          onClick={onOpenNewItem}
          aria-label={t('addItem')}
          className="sm:hidden fixed bottom-24 right-4 z-30 h-12 px-4 rounded-full app-primary shadow-lg flex items-center gap-2 font-bold text-sm tactile-press transition-all"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>{locale === 'zh-TW' ? '買了新東西' : t('addItem')}</span>
        </button>
      )}

      {isSelecting && selectedIds.size > 0 && <div className="fixed bottom-24 left-3 right-3 z-40 mx-auto max-w-xl"><div className="app-surface flex items-center justify-between gap-2 rounded-2xl border p-2.5 shadow-xl"><div className="flex min-w-0 items-center gap-2"><span className="ui-button truncate font-bold">{t('selectedItems', { n: selectedIds.size })}</span><button type="button" onClick={selectAll} className="ui-button shrink-0 text-[var(--app-accent-strong)] font-bold">{selectedIds.size === filteredItems.length ? '取消全選' : '全選'}</button></div><div className="flex shrink-0 gap-1"><button type="button" disabled={batchActionLoading} onClick={batchReplace} className="app-primary ui-button min-h-11 rounded-xl px-2.5"><RotateCcw className="inline h-4 w-4" /></button><button type="button" disabled={batchActionLoading} onClick={() => batchStock(1)} className="app-control ui-button min-h-11 rounded-xl border px-2.5 font-bold">+1</button><button type="button" disabled={batchActionLoading} onClick={batchDelete} className="app-control min-h-11 rounded-xl border px-2.5 text-rose-600"><Trash2 className="h-4 w-4" /></button></div></div></div>}
    </div>
  );
};
