import React, { useState, useMemo } from 'react';
import {
  Search,
  Plus,
  AlertTriangle,
  CheckCircle2,
  ShoppingBag,
  Sparkles,
  SlidersHorizontal,
  Camera,
  CheckSquare,
  RotateCcw,
  Trash2,
  MapPin,
} from 'lucide-react';
import { ItemResponse, HealthStatus, ItemCategory, UserSession } from '../../shared/types.ts';
import { ItemCard } from '../components/ItemCard.tsx';
import { BatchPhotoModal } from '../components/BatchPhotoModal.tsx';
import { CATEGORIES } from '../utils/category.ts';
import { useTranslation } from '../i18n/index.tsx';

interface DashboardViewProps {
  items: ItemResponse[];
  onReplace: (id: string) => void;
  onAdjustStock: (id: string, delta: number) => void;
  onEdit: (item: ItemResponse) => void;
  onDelete: (id: string) => void;
  onViewHistory: (item: ItemResponse) => void;
  onOpenNewItem: () => void;
  onStartUsing?: (id: string) => void;
  onSnooze?: (id: string, days: number) => void;
  onBatchReplace?: (ids: string[]) => Promise<void>;
  onBatchStock?: (ids: string[], delta: number) => Promise<void>;
  onBatchDelete?: (ids: string[]) => Promise<void>;
  onRefreshItems?: () => void;
  user?: UserSession | null;
  onAddGuestItems?: (items: ItemResponse[]) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  items,
  onReplace,
  onAdjustStock,
  onEdit,
  onDelete,
  onViewHistory,
  onOpenNewItem,
  onStartUsing,
  onSnooze,
  onBatchReplace,
  onBatchStock,
  onBatchDelete,
  onRefreshItems,
  user,
  onAddGuestItems,
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

  // Summary counts
  const overdueCount = items.filter((i) => i.healthStatus === 'overdue' || i.healthStatus === 'due_soon').length;
  const healthyCount = items.filter((i) => i.healthStatus === 'healthy').length;
  const restockCount = items.filter((i) => i.needsRestock).length;
  const snoozedCount = items.filter((i) => i.healthStatus === 'snoozed').length;
  const storedCount = items.filter((i) => i.isStored || i.healthStatus === 'stored').length;

  // Extract unique locations
  const uniqueLocations = useMemo(() => {
    const locSet = new Set<string>();
    items.forEach((i) => {
      if (i.location && i.location.trim()) {
        locSet.add(i.location.trim());
      }
    });
    return Array.from(locSet);
  }, [items]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // 1. Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = item.name.toLowerCase().includes(q);
        const matchNotes = item.notes?.toLowerCase().includes(q);
        const matchLocation = item.location?.toLowerCase().includes(q);
        if (!matchName && !matchNotes && !matchLocation) return false;
      }

      // 2. Status filter
      if (statusFilter === 'due') {
        if (item.healthStatus !== 'overdue' && item.healthStatus !== 'due_soon') return false;
      } else if (statusFilter === 'healthy') {
        if (item.healthStatus !== 'healthy') return false;
      } else if (statusFilter === 'restock') {
        if (!item.needsRestock) return false;
      } else if (statusFilter === 'snoozed') {
        if (item.healthStatus !== 'snoozed') return false;
      } else if (statusFilter === 'stored') {
        if (!item.isStored && item.healthStatus !== 'stored') return false;
      }

      // 3. Category filter
      if (selectedCategory !== 'all' && item.category !== selectedCategory) {
        return false;
      }

      // 4. Location filter
      if (selectedLocation !== 'all' && item.location !== selectedLocation) {
        return false;
      }

      return true;
    });
  }, [items, searchQuery, statusFilter, selectedCategory, selectedLocation]);

  const hasFilters = Boolean(searchQuery.trim()) || statusFilter !== 'all' || selectedCategory !== 'all' || selectedLocation !== 'all';

  const clearFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setSelectedCategory('all');
    setSelectedLocation('all');
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedIds.size === filteredItems.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredItems.map((i) => i.id)));
    }
  };

  const handleRunBatchReplace = async () => {
    if (selectedIds.size === 0 || !onBatchReplace) return;
    setBatchActionLoading(true);
    try {
      await onBatchReplace(Array.from(selectedIds));
      setSelectedIds(new Set());
      setIsSelecting(false);
    } catch (err: any) {
      alert(err.message || (locale === 'zh-TW' ? '批次換新失敗' : 'Batch replace failed'));
    } finally {
      setBatchActionLoading(false);
    }
  };

  const handleRunBatchStock = async (delta: number) => {
    if (selectedIds.size === 0 || !onBatchStock) return;
    setBatchActionLoading(true);
    try {
      await onBatchStock(Array.from(selectedIds), delta);
    } catch (err: any) {
      alert(err.message || (locale === 'zh-TW' ? '批次調整庫存失敗' : 'Batch stock update failed'));
    } finally {
      setBatchActionLoading(false);
    }
  };

  const handleRunBatchDelete = async () => {
    if (selectedIds.size === 0 || !onBatchDelete) return;
    if (!confirm(t('batchDeleteConfirm', { n: selectedIds.size }))) return;
    setBatchActionLoading(true);
    try {
      await onBatchDelete(Array.from(selectedIds));
      setSelectedIds(new Set());
      setIsSelecting(false);
    } catch (err: any) {
      alert(err.message || (locale === 'zh-TW' ? '批次刪除失敗' : 'Batch delete failed'));
    } finally {
      setBatchActionLoading(false);
    }
  };

  return (
    <div className="space-y-6 pb-32">
      <section className="pt-1">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-[-0.03em] text-white">
              {locale === 'zh-TW' ? '先處理今天的日常' : "Today's Consumables"}
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              {locale === 'zh-TW' ? '及時看見該換什麼、還缺哪些備品。' : 'See what needs replacing and restock in time.'}
            </p>
          </div>
          <span className="hidden sm:inline-flex shrink-0 items-center rounded-full border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-400">
            {locale === 'zh-TW' ? `${items.length} 項追蹤中` : `${items.length} tracked`}
          </span>
        </div>
      </section>

      {/* Inbox Zero Emotional Card (When all items are healthy or snoozed) */}
      {items.length > 0 && overdueCount === 0 && (
        <div className="bg-emerald-500/10 border border-emerald-500/25 rounded-2xl p-4 flex items-center gap-3.5 shadow-sm animate-in fade-in duration-300">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/30">
            <Sparkles className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <span>{t('allSettledTitle')}</span>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold">
                100% 最佳狀態
              </span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">{t('allSettledSubtitle')}</p>
          </div>
        </div>
      )}

      {/* 1. Metric Overview */}
      <div className="space-y-2">
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          <button
            onClick={() => setStatusFilter(statusFilter === 'due' ? 'all' : 'due')}
            aria-pressed={statusFilter === 'due'}
            className={`p-3.5 sm:p-4 rounded-2xl border transition-all text-left active:scale-[0.98] ${
              statusFilter === 'due'
                ? 'bg-rose-400/10 border-rose-400/50 text-rose-200 ring-1 ring-rose-400/50'
                : 'bg-slate-900/70 border-slate-800 text-slate-400 hover:border-slate-700 hover:bg-slate-900'
            }`}
          >
            <div className="flex items-center justify-between gap-1 mb-3">
              <span className="text-[11px] font-semibold">{locale === 'zh-TW' ? '該換/到期' : 'Due / Alert'}</span>
              <AlertTriangle className="w-4 h-4 text-rose-300" />
            </div>
            <span className="text-3xl leading-none font-bold tabular-nums text-white">{overdueCount}</span>
            <span className="block text-[11px] text-slate-500 mt-2">{locale === 'zh-TW' ? '今天或已過期' : 'Overdue or today'}</span>
          </button>

          <button
            onClick={() => setStatusFilter(statusFilter === 'healthy' ? 'all' : 'healthy')}
            aria-pressed={statusFilter === 'healthy'}
            className={`p-3.5 sm:p-4 rounded-2xl border transition-all text-left active:scale-[0.98] ${
              statusFilter === 'healthy'
                ? 'bg-emerald-400/10 border-emerald-400/50 text-emerald-200 ring-1 ring-emerald-400/50'
                : 'bg-slate-900/70 border-slate-800 text-slate-400 hover:border-slate-700 hover:bg-slate-900'
            }`}
          >
            <div className="flex items-center justify-between gap-1 mb-3">
              <span className="text-[11px] font-semibold">{t('statusHealthy')}</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-300" />
            </div>
            <span className="text-3xl leading-none font-bold tabular-nums text-white">{healthyCount}</span>
            <span className="block text-[11px] text-slate-500 mt-2">{locale === 'zh-TW' ? '目前不需處理' : 'Good condition'}</span>
          </button>

          <button
            onClick={() => setStatusFilter(statusFilter === 'restock' ? 'all' : 'restock')}
            aria-pressed={statusFilter === 'restock'}
            className={`p-3.5 sm:p-4 rounded-2xl border transition-all text-left active:scale-[0.98] ${
              statusFilter === 'restock'
                ? 'bg-amber-400/10 border-amber-400/50 text-amber-200 ring-1 ring-amber-400/50'
                : 'bg-slate-900/70 border-slate-800 text-slate-400 hover:border-slate-700 hover:bg-slate-900'
            }`}
          >
            <div className="flex items-center justify-between gap-1 mb-3">
              <span className="text-[11px] font-semibold">{locale === 'zh-TW' ? '要補貨' : 'Restock'}</span>
              <ShoppingBag className="w-4 h-4 text-amber-300" />
            </div>
            <span className="text-3xl leading-none font-bold tabular-nums text-white">{restockCount}</span>
            <span className="block text-[11px] text-slate-500 mt-2">{locale === 'zh-TW' ? '備品低於門檻' : 'Low on backup'}</span>
          </button>
        </div>

        {/* Secondary Filter Chips: Snoozed & Stored */}
        {(snoozedCount > 0 || storedCount > 0) && (
          <div className="flex items-center gap-2 pt-1">
            {snoozedCount > 0 && (
              <button
                type="button"
                onClick={() => setStatusFilter(statusFilter === 'snoozed' ? 'all' : 'snoozed')}
                className={`text-xs px-3 py-1 rounded-full border transition-all font-medium flex items-center gap-1.5 ${
                  statusFilter === 'snoozed'
                    ? 'bg-sky-500/20 border-sky-400 text-sky-300 font-bold'
                    : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <span>💤 延後中</span>
                <span className="text-[10px] bg-sky-500/30 text-sky-200 px-1.5 rounded-full font-bold">
                  {snoozedCount}
                </span>
              </button>
            )}
            {storedCount > 0 && (
              <button
                type="button"
                onClick={() => setStatusFilter(statusFilter === 'stored' ? 'all' : 'stored')}
                className={`text-xs px-3 py-1 rounded-full border transition-all font-medium flex items-center gap-1.5 ${
                  statusFilter === 'stored'
                    ? 'bg-indigo-500/20 border-indigo-400 text-indigo-300 font-bold'
                    : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <span>📦 存放備品</span>
                <span className="text-[10px] bg-indigo-500/30 text-indigo-200 px-1.5 rounded-full font-bold">
                  {storedCount}
                </span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* 2. Search & Category Filters */}
      <section className="space-y-3">
        {/* Search input */}
        <div className="relative">
          <label htmlFor="dashboard-search" className="sr-only">{locale === 'zh-TW' ? '搜尋物品' : 'Search'}</label>
          <Search className="w-4 h-4 text-slate-500 absolute left-4 top-3.5" />
          <input
            id="dashboard-search"
            type="text"
            placeholder={locale === 'zh-TW' ? '搜尋物品名稱、備註或型號...' : 'Search items, notes, models...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900/80 border border-slate-800 focus:border-sky-400 focus:ring-2 focus:ring-sky-400/15 rounded-2xl pl-11 pr-4 py-3 text-sm text-white placeholder:text-slate-500 outline-none transition-colors"
          />
        </div>

        {/* Category horizontal scroll */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          <SlidersHorizontal className="w-4 h-4 shrink-0 text-slate-500" aria-hidden="true" />
          <button
            onClick={() => setSelectedCategory('all')}
            aria-pressed={selectedCategory === 'all'}
            className={`flex-shrink-0 text-xs px-3.5 py-2 rounded-full border transition-all font-semibold active:scale-[0.98] ${
              selectedCategory === 'all'
                ? 'bg-sky-300 text-sky-950 border-sky-200'
                : 'bg-slate-900/70 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
            }`}
          >
            {locale === 'zh-TW' ? '全部類別' : 'All Categories'}
          </button>
          {Object.values(CATEGORIES).map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(selectedCategory === cat.id ? 'all' : cat.id)}
              aria-pressed={selectedCategory === cat.id}
              className={`flex-shrink-0 text-xs px-3.5 py-2 rounded-full border transition-all font-semibold active:scale-[0.98] ${
                selectedCategory === cat.id
                  ? 'bg-sky-300 text-sky-950 border-sky-200'
                  : 'bg-slate-900/70 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Location horizontal scroll if locations exist */}
        {uniqueLocations.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar pt-1">
            <MapPin className="w-3.5 h-3.5 shrink-0 text-slate-500" aria-hidden="true" />
            <button
              onClick={() => setSelectedLocation('all')}
              aria-pressed={selectedLocation === 'all'}
              className={`flex-shrink-0 text-xs px-3 py-1.5 rounded-full border transition-all font-semibold active:scale-[0.98] ${
                selectedLocation === 'all'
                  ? 'bg-amber-300 text-amber-950 border-amber-200'
                  : 'bg-slate-900/70 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
              }`}
            >
              {locale === 'zh-TW' ? '全部位置' : 'All Locations'}
            </button>
            {uniqueLocations.map((loc) => (
              <button
                key={loc}
                onClick={() => setSelectedLocation(selectedLocation === loc ? 'all' : loc)}
                aria-pressed={selectedLocation === loc}
                className={`flex-shrink-0 text-xs px-3 py-1.5 rounded-full border transition-all font-semibold active:scale-[0.98] ${
                  selectedLocation === loc
                    ? 'bg-amber-300 text-amber-950 border-amber-200'
                    : 'bg-slate-900/70 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                }`}
              >
                📍 {loc}
              </button>
            ))}
          </div>
        )}
      </section>

      {/* 3. Items List Header with Batch Actions Toolbar */}
      <section>
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2 min-w-0">
            <h3 className="text-sm font-bold text-white truncate">
              {locale === 'zh-TW' ? '追蹤中的物品' : 'Tracked Items'}{' '}
              <span className="text-slate-500 font-normal">{filteredItems.length}</span>
            </h3>
            {hasFilters && (
              <button
                onClick={clearFilters}
                className="text-xs font-semibold text-sky-300 hover:text-sky-200 underline underline-offset-4 shrink-0"
              >
                {locale === 'zh-TW' ? '清除篩選' : 'Clear'}
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Batch Photo Intake */}
            <button
              type="button"
              onClick={() => setIsPhotoModalOpen(true)}
              className="app-control flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold text-sky-300 hover:text-white transition-all active:scale-95"
            >
              <Camera className="w-3.5 h-3.5 text-sky-400" />
              <span>{t('batchIntake')}</span>
            </button>

            {/* Multi-Select Toggle */}
            <button
              type="button"
              onClick={() => {
                setIsSelecting(!isSelecting);
                if (isSelecting) setSelectedIds(new Set());
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all active:scale-95 ${
                isSelecting ? 'bg-sky-500 text-slate-950 border-sky-400 font-bold' : 'app-control text-slate-300'
              }`}
            >
              <CheckSquare className="w-3.5 h-3.5" />
              <span>{isSelecting ? t('cancelSelect') : t('batchMode')}</span>
            </button>
          </div>
        </div>

        {filteredItems.length === 0 ? (
          <div className="text-center py-14 bg-slate-900/40 rounded-3xl border border-slate-800/60 p-6">
            <div className="w-12 h-12 rounded-2xl bg-sky-400/10 border border-sky-400/20 text-sky-300 mx-auto flex items-center justify-center mb-3">
              <Sparkles className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-white mb-1">
              {items.length === 0 ? t('emptyItemsTitle') : (locale === 'zh-TW' ? '沒有符合條件的物品' : 'No items match filters')}
            </h3>
            <p className="text-xs text-slate-400 max-w-xs mx-auto mb-4">
              {items.length === 0
                ? t('emptyItemsDesc')
                : (locale === 'zh-TW' ? '試著清除搜尋條件或切換分類標籤。' : 'Try clearing filters or changing category.')}
            </p>
            {items.length === 0 && (
              <button
                onClick={onOpenNewItem}
                className="inline-flex items-center gap-1.5 bg-sky-300 hover:bg-sky-200 text-sky-950 text-xs font-bold px-4 py-2.5 rounded-full shadow-lg shadow-sky-500/20 active:scale-[0.98] transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>{locale === 'zh-TW' ? '新增第一個物品' : 'Add First Item'}</span>
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredItems.map((item) => (
              <ItemCard
                key={item.id}
                item={item}
                onReplace={onReplace}
                onAdjustStock={onAdjustStock}
                onEdit={onEdit}
                onDelete={onDelete}
                onViewHistory={onViewHistory}
                onStartUsing={onStartUsing}
                onSnooze={onSnooze}
                selectable={isSelecting}
                isSelected={selectedIds.has(item.id)}
                onToggleSelect={handleToggleSelect}
              />
            ))}
          </div>
        )}
      </section>

      {/* Floating Batch Action Bar */}
      {isSelecting && selectedIds.size > 0 && (
        <div className="fixed bottom-20 left-4 right-4 z-40 max-w-lg mx-auto animate-in slide-in-from-bottom-5 duration-200">
          <div className="bg-slate-900/95 border border-sky-500/40 rounded-2xl p-3 shadow-2xl backdrop-blur-md flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 pl-1 min-w-0">
              <span className="text-xs font-bold text-white truncate">
                {t('selectedItems', { n: selectedIds.size })}
              </span>
              <button
                type="button"
                onClick={handleSelectAll}
                className="text-[11px] text-sky-400 hover:underline shrink-0"
              >
                {selectedIds.size === filteredItems.length
                  ? (locale === 'zh-TW' ? '取消全選' : 'Deselect')
                  : (locale === 'zh-TW' ? '全選' : 'Select All')}
              </button>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {/* Batch Replace */}
              <button
                type="button"
                disabled={batchActionLoading}
                onClick={handleRunBatchReplace}
                className="app-primary px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 shadow-md shadow-sky-500/20 active:scale-95 disabled:opacity-50"
              >
                <RotateCcw className={`w-3.5 h-3.5 ${batchActionLoading ? 'animate-spin' : ''}`} />
                <span>{t('batchReplaceBtn')}</span>
              </button>

              {/* Batch Stock +1 */}
              <button
                type="button"
                disabled={batchActionLoading}
                onClick={() => handleRunBatchStock(1)}
                className="app-control px-2.5 py-1.5 rounded-xl text-xs font-semibold text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10 active:scale-95 disabled:opacity-50"
              >
                <span>{t('batchStockAdd')}</span>
              </button>

              {/* Batch Delete */}
              <button
                type="button"
                disabled={batchActionLoading}
                onClick={handleRunBatchDelete}
                className="app-control px-2.5 py-1.5 rounded-xl text-xs font-semibold text-rose-400 border-rose-500/30 hover:bg-rose-500/10 active:scale-95 disabled:opacity-50"
                aria-label="Delete selected"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Batch Photo Intake Modal */}
      <BatchPhotoModal
        isOpen={isPhotoModalOpen}
        onClose={() => setIsPhotoModalOpen(false)}
        onSuccess={() => onRefreshItems?.()}
        user={user}
        onAddGuestItems={onAddGuestItems}
      />
    </div>
  );
};
