import React, { useState, useMemo } from 'react';
import { Search, Plus, AlertTriangle, CheckCircle2, ShoppingBag, Sparkles, SlidersHorizontal } from 'lucide-react';
import { ItemResponse, HealthStatus, ItemCategory } from '../../shared/types.ts';
import { ItemCard } from '../components/ItemCard.tsx';
import { CATEGORIES } from '../utils/category.ts';

interface DashboardViewProps {
  items: ItemResponse[];
  onReplace: (id: string) => void;
  onAdjustStock: (id: string, delta: number) => void;
  onEdit: (item: ItemResponse) => void;
  onDelete: (id: string) => void;
  onViewHistory: (item: ItemResponse) => void;
  onOpenNewItem: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  items,
  onReplace,
  onAdjustStock,
  onEdit,
  onDelete,
  onViewHistory,
  onOpenNewItem,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'due' | 'healthy' | 'restock'>('all');
  const [selectedCategory, setSelectedCategory] = useState<ItemCategory | 'all'>('all');

  // Summary counts
  const overdueCount = items.filter((i) => i.healthStatus === 'overdue' || i.healthStatus === 'due_soon').length;
  const healthyCount = items.filter((i) => i.healthStatus === 'healthy').length;
  const restockCount = items.filter((i) => i.needsRestock).length;

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // 1. Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = item.name.toLowerCase().includes(q);
        const matchNotes = item.notes?.toLowerCase().includes(q);
        if (!matchName && !matchNotes) return false;
      }

      // 2. Status filter
      if (statusFilter === 'due') {
        if (item.healthStatus !== 'overdue' && item.healthStatus !== 'due_soon') return false;
      } else if (statusFilter === 'healthy') {
        if (item.healthStatus !== 'healthy') return false;
      } else if (statusFilter === 'restock') {
        if (!item.needsRestock) return false;
      }

      // 3. Category filter
      if (selectedCategory !== 'all' && item.category !== selectedCategory) {
        return false;
      }

      return true;
    });
  }, [items, searchQuery, statusFilter, selectedCategory]);

  const hasFilters = Boolean(searchQuery.trim()) || statusFilter !== 'all' || selectedCategory !== 'all';

  const clearFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setSelectedCategory('all');
  };

  return (
    <div className="space-y-6 pb-28">
      <section className="pt-1">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-[-0.03em] text-white">先處理今天的日常</h2>
            <p className="text-sm text-slate-400 mt-2">快速看見要換什麼、還缺哪些備品。</p>
          </div>
          <span className="hidden sm:inline-flex shrink-0 items-center rounded-full border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-400">
            {items.length} 項追蹤中
          </span>
        </div>
      </section>

      {/* 1. Metric Overview */}
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
            <span className="text-[11px] font-semibold">該處理</span>
            <AlertTriangle className="w-4 h-4 text-rose-300" />
          </div>
          <span className="text-3xl leading-none font-bold tabular-nums text-white">{overdueCount}</span>
          <span className="block text-[11px] text-slate-500 mt-2">到期或快到期</span>
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
            <span className="text-[11px] font-semibold">狀態良好</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-300" />
          </div>
          <span className="text-3xl leading-none font-bold tabular-nums text-white">{healthyCount}</span>
          <span className="block text-[11px] text-slate-500 mt-2">目前不需處理</span>
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
            <span className="text-[11px] font-semibold">要補貨</span>
            <ShoppingBag className="w-4 h-4 text-amber-300" />
          </div>
          <span className="text-3xl leading-none font-bold tabular-nums text-white">{restockCount}</span>
          <span className="block text-[11px] text-slate-500 mt-2">備品低於門檻</span>
        </button>
      </div>

      {/* 2. Search & Category Filters */}
      <section className="space-y-3">
        {/* Search input */}
        <div className="relative">
          <label htmlFor="dashboard-search" className="sr-only">搜尋物品</label>
          <Search className="w-4 h-4 text-slate-500 absolute left-4 top-3.5" />
          <input
            id="dashboard-search"
            type="text"
            placeholder="搜尋物品名稱或備註..."
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
            全部類別
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
      </section>

      {/* 3. Items List */}
      <section>
        <div className="flex items-center justify-between gap-3 mb-3">
          <h3 className="text-sm font-semibold text-white">追蹤中的物品 <span className="text-slate-500 font-normal">{filteredItems.length}</span></h3>
          {hasFilters && (
            <button onClick={clearFilters} className="text-xs font-semibold text-sky-300 hover:text-sky-200 underline underline-offset-4">
              清除篩選
            </button>
          )}
        </div>
      {filteredItems.length === 0 ? (
        <div className="text-center py-14 bg-slate-900/40 rounded-3xl border border-slate-800/60 p-6">
          <div className="w-12 h-12 rounded-2xl bg-sky-400/10 border border-sky-400/20 text-sky-300 mx-auto flex items-center justify-center mb-3">
            <Sparkles className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-white mb-1">
            {items.length === 0 ? '尚未加入任何追蹤物品' : '沒有符合條件的物品'}
          </h3>
          <p className="text-xs text-slate-400 max-w-xs mx-auto mb-4">
            {items.length === 0
              ? '立即新增牙刷、淨水濾芯、隱形眼鏡或保養品，不再忘記更換！'
              : '試著清除搜尋條件或切換分類標籤。'}
          </p>
          {items.length === 0 && (
            <button
              onClick={onOpenNewItem}
              className="inline-flex items-center gap-1.5 bg-sky-300 hover:bg-sky-200 text-sky-950 text-xs font-bold px-4 py-2.5 rounded-full shadow-lg shadow-sky-500/20 active:scale-[0.98] transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>新增第一個物品</span>
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
            />
          ))}
        </div>
      )}
      </section>
    </div>
  );
};
