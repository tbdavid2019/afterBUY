import React, { useMemo, useState } from 'react';
import { Search, Plus, AlertTriangle, CheckCircle2, ShoppingBag, Sparkles, SlidersHorizontal, Camera, CheckSquare, RotateCcw, Trash2, MapPin, Fingerprint, Moon, Package, LayoutGrid, List } from 'lucide-react';
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
  onConsume?: (id: string, amount: number) => void | Promise<void>;
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
  items, onReplace, onAdjustStock, onEdit, onDelete, onViewHistory, onOpenNewItem, onStartUsing, onSnooze, onConsume,
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
    { id: 'due' as const, label: locale === 'zh-TW' ? '待處理' : 'Due', count: counts.due, dotClass: 'bg-rose-500' },
    { id: 'healthy' as const, label: locale === 'zh-TW' ? '狀態良好' : 'Healthy', count: counts.healthy, dotClass: 'bg-emerald-500' },
    { id: 'restock' as const, label: locale === 'zh-TW' ? '要補貨' : 'Restock', count: counts.restock, dotClass: 'bg-amber-500' },
    ...(counts.snoozed ? [{ id: 'snoozed' as const, label: locale === 'zh-TW' ? '延後' : 'Snoozed', count: counts.snoozed, dotClass: 'bg-sky-500' }] : []),
    ...(counts.stored ? [{ id: 'stored' as const, label: locale === 'zh-TW' ? '存放中' : 'Stored', count: counts.stored, dotClass: 'bg-slate-400' }] : []),
  ];

  return (
    <div className="space-y-4 pb-36 sm:pb-40">
      {/* Hero Life Status Overview */}
      <section className="relative overflow-hidden rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-gradient-to-br from-white via-slate-50/60 to-slate-100/60 dark:from-slate-900 dark:via-slate-900/95 dark:to-slate-850 p-4 sm:p-5 shadow-xs">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3.5 min-w-0">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 shadow-2xs ${
              counts.due > 0
                ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/25'
                : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/25'
            }`}>
              {counts.due > 0 ? (
                <AlertTriangle className="w-5.5 h-5.5 stroke-[2.2]" />
              ) : (
                <Sparkles className="w-5.5 h-5.5 stroke-[2.2]" />
              )}
            </div>
            <div className="min-w-0">
              <h2 className="text-lg sm:text-xl font-black tracking-tight text-slate-900 dark:text-slate-100 leading-snug">
                {counts.due > 0
                  ? (locale === 'zh-TW' ? `${counts.due} 項耗材即將到期或需處理` : `${counts.due} items need attention`)
                  : (locale === 'zh-TW' ? '生活耗材狀態一切就緒' : 'All items in good standing')}
              </h2>
              <p className="text-sm sm:text-[15px] text-slate-600 dark:text-slate-400 mt-1 leading-normal font-medium">
                {counts.due > 0
                  ? (locale === 'zh-TW' ? '及時更換確保生活品質，保持安心使用' : 'Replace in time to maintain optimal living quality')
                  : (locale === 'zh-TW'
                      ? `${counts.healthy} 項定期運作中 · ${counts.stored} 項備品存放中`
                      : `${counts.healthy} active · ${counts.stored} stored in reserve`)}
              </p>
            </div>
          </div>

          {hasFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="text-sm font-bold text-[var(--app-accent-strong)] hover:underline shrink-0 pt-0.5 tactile-press"
            >
              {locale === 'zh-TW' ? '重設篩選' : 'Reset'}
            </button>
          )}
        </div>
      </section>

      {/* Guest Mode Banner */}
      {!user && (
        <details className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3.5 shadow-xs text-sm">
          <summary className="font-semibold cursor-pointer list-none flex items-center justify-between text-slate-700 dark:text-slate-200 tactile-press">
            <span className="flex items-center gap-1.5">
              <Fingerprint className="h-4 w-4 text-[var(--app-accent)]" />
              {t('guestModeBannerTitle')}
            </span>
            <span className="text-slate-400 font-normal">{t('guestModeBannerBadge')} ▾</span>
          </summary>
          <div className="mt-2.5 border-t border-slate-100 dark:border-slate-800 pt-2 text-slate-600 dark:text-slate-400 leading-relaxed">
            <p>{t('guestModeBannerDesc')}</p>
            <div className="mt-2.5 flex flex-wrap gap-2">
              {items.length > 0 && onClearDemoItems && (
                <button type="button" onClick={onClearDemoItems} className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium text-sm tactile-press">
                  {t('guestModeClearDemoBtn')}
                </button>
              )}
              {items.length === 0 && onRestoreDemoItems && (
                <button type="button" onClick={onRestoreDemoItems} className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium text-sm tactile-press flex items-center gap-1.5">
                  <RotateCcw className="h-4 w-4" />{t('guestModeRestoreDemoBtn')}
                </button>
              )}
              {onOpenAuth && (
                <button type="button" onClick={onOpenAuth} className="app-primary px-3.5 py-2 rounded-xl text-sm font-semibold tactile-press flex items-center gap-1.5">
                  <Fingerprint className="h-4 w-4" />{t('guestModeLoginBtn')}
                </button>
              )}
            </div>
          </div>
        </details>
      )}

      {/* Segmented Status Filter Bar */}
      <section aria-label={locale === 'zh-TW' ? '狀態篩選' : 'Status filters'} className="flex gap-2.5 overflow-x-auto no-scrollbar py-0.5">
        <button
          type="button"
          onClick={() => setStatusFilter('all')}
          className={`px-4 py-2.5 text-sm sm:text-base font-bold rounded-xl border transition-all shrink-0 tactile-press ${
            statusFilter === 'all'
              ? 'bg-slate-900 text-white border-slate-900 dark:bg-slate-100 dark:text-slate-900 dark:border-slate-100 shadow-xs'
              : 'bg-white text-slate-700 border-slate-200/90 hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-800'
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
            className={`flex items-center gap-2 px-4 py-2.5 text-sm sm:text-base font-bold rounded-xl border transition-all shrink-0 tactile-press ${
              statusFilter === id
                ? 'bg-slate-900 text-white border-slate-900 dark:bg-slate-100 dark:text-slate-900 dark:border-slate-100 shadow-xs'
                : 'bg-white text-slate-700 border-slate-200/90 hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-800'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${dotClass}`} />
            <span>{label}</span>
            <span className="tabular-nums font-black ml-0.5">{count}</span>
          </button>
        ))}
      </section>

      {/* Unified Search, Filter and Actions Toolbar */}
      <section className="space-y-3">
        <div className="flex items-center gap-2.5">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
            <input
              id="dashboard-search"
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={locale === 'zh-TW' ? '搜尋物品、型號或備註...' : 'Search items, models, or notes...'}
              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl pl-10 pr-9 py-2.5 text-base text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-slate-400 dark:focus:border-slate-600 transition-colors font-medium"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="清除搜尋"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-bold w-6 h-6 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                ×
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => setShowFilters((open) => !open)}
            aria-label={locale === 'zh-TW' ? '分類與位置篩選' : 'Filter by category and location'}
            className={`flex items-center gap-1.5 px-3 sm:px-3.5 py-2.5 text-sm font-medium rounded-xl border transition-colors tactile-press shrink-0 ${
              showFilters || selectedCategory !== 'all' || selectedLocation !== 'all'
                ? 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60'
            }`}
          >
            <SlidersHorizontal className="h-4 w-4" />
            <span className="hidden sm:inline">{locale === 'zh-TW' ? '篩選' : 'Filter'}</span>
            {(selectedCategory !== 'all' || selectedLocation !== 'all') && (
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--app-accent)]" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setIsPhotoModalOpen(true)}
            aria-label={t('batchIntake')}
            title={t('batchIntake')}
            className="flex items-center gap-1.5 px-3 sm:px-3.5 py-2.5 text-sm font-medium rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors tactile-press shrink-0"
          >
            <Camera className="h-4 w-4" />
            <span className="hidden sm:inline">{t('batchIntake')}</span>
          </button>

          <button
            type="button"
            onClick={toggleViewMode}
            aria-label={viewMode === 'grid' ? (locale === 'zh-TW' ? '切換為清單模式' : 'Switch to list view') : (locale === 'zh-TW' ? '切換為雙欄網格' : 'Switch to grid view')}
            title={viewMode === 'grid' ? (locale === 'zh-TW' ? '切換為清單模式' : 'Switch to list view') : (locale === 'zh-TW' ? '切換為雙欄網格' : 'Switch to grid view')}
            className={`flex items-center gap-1.5 px-3 sm:px-3.5 py-2.5 text-sm font-medium rounded-xl border transition-colors tactile-press shrink-0 ${
              viewMode === 'grid'
                ? 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60'
            }`}
          >
            {viewMode === 'grid' ? <List className="h-4 w-4" /> : <LayoutGrid className="h-4 w-4" />}
            <span className="hidden sm:inline">{viewMode === 'grid' ? (locale === 'zh-TW' ? '清單' : 'List') : (locale === 'zh-TW' ? '網格' : 'Grid')}</span>
          </button>

          <button
            type="button"
            onClick={() => { setIsSelecting((value) => !value); setSelectedIds(new Set()); }}
            aria-label={isSelecting ? t('cancelSelect') : t('batchMode')}
            title={isSelecting ? t('cancelSelect') : t('batchMode')}
            className={`flex items-center gap-1.5 px-3 sm:px-3.5 py-2.5 text-sm font-medium rounded-xl border transition-colors tactile-press shrink-0 ${
              isSelecting
                ? 'bg-[var(--app-accent-soft)] border-[var(--app-accent)] text-[var(--app-accent-strong)] font-semibold'
                : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60'
            }`}
          >
            <CheckSquare className="h-4 w-4" />
            <span className="hidden sm:inline">{isSelecting ? t('cancelSelect') : t('batchMode')}</span>
          </button>
        </div>

        {/* Filter Drawer */}
        {showFilters && (
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3.5 space-y-3 sheet-content-animate shadow-xs text-xs">
            <div>
              <span className="font-semibold text-slate-700 dark:text-slate-300 block mb-2">
                {locale === 'zh-TW' ? '耗材分類' : 'Category'}
              </span>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => setSelectedCategory('all')}
                  className={`px-2.5 py-1 rounded-md border font-medium transition-colors tactile-press ${
                    selectedCategory === 'all'
                      ? 'app-primary border-transparent'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
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
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
                    }`}
                  >
                    {category.label}
                  </button>
                ))}
              </div>
            </div>

            {uniqueLocations.length > 0 && (
              <div className="border-t border-slate-100 dark:border-slate-800 pt-3">
                <span className="font-semibold text-slate-700 dark:text-slate-300 block mb-2">
                  {locale === 'zh-TW' ? '放置位置' : 'Location'}
                </span>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => setSelectedLocation('all')}
                    className={`px-2.5 py-1 rounded-md border font-medium transition-colors tactile-press ${
                      selectedLocation === 'all'
                        ? 'app-primary border-transparent'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
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
                          : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
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
      </section>

      {/* Items Section */}
      <section>
        {filteredItems.length === 0 ? (
          <div className="app-surface rounded-xl border border-slate-200 dark:border-slate-800 p-8 text-center shadow-xs">
            <Package className="mx-auto mb-2 h-8 w-8 text-slate-400" />
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              {items.length === 0 ? (!user ? t('guestModeClearedTitle') : t('emptyItemsTitle')) : (locale === 'zh-TW' ? '沒有符合條件的耗材' : 'No matching items')}
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mx-auto mt-1 max-w-xs font-medium">
              {items.length === 0 ? (!user ? t('guestModeClearedDesc') : t('emptyItemsDesc')) : (locale === 'zh-TW' ? '請嘗試清除篩選或調整搜尋關鍵字。' : 'Try clearing filters.')}
            </p>
            {items.length === 0 && (
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                <button type="button" onClick={onOpenNewItem} className="app-primary px-4 py-2 text-sm font-bold rounded-xl shadow-xs tactile-press flex items-center gap-1.5">
                  <Plus className="h-4 w-4" />{locale === 'zh-TW' ? '新增第一個耗材' : 'Add first item'}
                </button>
                {!user && onRestoreDemoItems && (
                  <button type="button" onClick={onRestoreDemoItems} className="px-3.5 py-2 text-sm font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 tactile-press">
                    {t('guestModeRestoreDemoBtn')}
                  </button>
                )}
              </div>
            )}
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            {filteredItems.map((item) => (
              <ItemCard
                key={item.id}
                item={item}
                viewMode="grid"
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
          <div className="space-y-2.5">
            {filteredItems.map((item) => (
              <ItemCard
                key={item.id}
                item={item}
                viewMode="list"
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
          className="sm:hidden fixed bottom-24 right-4 z-30 h-12 px-4 rounded-full bg-[var(--app-accent)] hover:brightness-105 active:scale-95 text-white shadow-lg shadow-sky-600/30 flex items-center gap-2 font-bold text-sm tactile-press transition-all"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>{locale === 'zh-TW' ? '新增耗材' : 'Add Item'}</span>
        </button>
      )}

      {isSelecting && selectedIds.size > 0 && <div className="fixed bottom-24 left-3 right-3 z-40 mx-auto max-w-xl"><div className="app-surface flex items-center justify-between gap-2 rounded-2xl border p-2.5 shadow-xl"><div className="flex min-w-0 items-center gap-2"><span className="ui-button truncate font-bold">{t('selectedItems', { n: selectedIds.size })}</span><button type="button" onClick={selectAll} className="ui-button shrink-0 text-[var(--app-accent-strong)] font-bold">{selectedIds.size === filteredItems.length ? '取消全選' : '全選'}</button></div><div className="flex shrink-0 gap-1"><button type="button" disabled={batchActionLoading} onClick={batchReplace} className="app-primary ui-button min-h-11 rounded-xl px-2.5"><RotateCcw className="inline h-4 w-4" /></button><button type="button" disabled={batchActionLoading} onClick={() => batchStock(1)} className="app-control ui-button min-h-11 rounded-xl border px-2.5 font-bold">+1</button><button type="button" disabled={batchActionLoading} onClick={batchDelete} className="app-control min-h-11 rounded-xl border px-2.5 text-rose-600"><Trash2 className="h-4 w-4" /></button></div></div></div>}
      <BatchPhotoModal isOpen={isPhotoModalOpen} onClose={() => setIsPhotoModalOpen(false)} onSuccess={() => onRefreshItems?.()} user={user} onAddGuestItems={onAddGuestItems} />
    </div>
  );
};
