import React, { useState, useMemo } from 'react';
import { Search, X, Plus, Check, Sparkles, SlidersHorizontal } from 'lucide-react';
import { ITEM_PRESETS, CATEGORIES, ItemPreset } from '../utils/category.ts';
import { ItemBrandBadge } from './ItemBrandBadge.tsx';
import { ItemCategory } from '../../shared/types.ts';

interface PresetCatalogModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPreset: (preset: ItemPreset) => void;
  onDirectAdd?: (preset: ItemPreset) => Promise<void> | void;
}

export const PresetCatalogModal: React.FC<PresetCatalogModalProps> = ({
  isOpen,
  onClose,
  onSelectPreset,
  onDirectAdd,
}) => {
  const [search, setSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState<string>('all');
  const [addedIds, setAddedIds] = useState<Record<string, boolean>>({});
  const [addingId, setAddingId] = useState<string | null>(null);

  const categoriesList = useMemo(() => {
    return [
      { id: 'all', label: '全部' },
      { id: 'bathroom', label: '個人衛浴' },
      { id: 'kitchen', label: '廚房飲食' },
      { id: 'medicine', label: '健康保健' },
      { id: 'skincare', label: '美妝保養' },
      { id: 'appliances', label: '家電家居' },
      { id: 'clothing', label: '貼身穿戴' },
      { id: 'electronics', label: '3C 數位' },
      { id: 'general', label: '其他生活' },
    ];
  }, []);

  const filteredPresets = useMemo(() => {
    const q = search.trim().toLowerCase();
    return ITEM_PRESETS.filter((p) => {
      const matchCat = selectedCat === 'all' || p.category === selectedCat;
      if (!matchCat) return false;
      if (!q) return true;

      const nameMatch = p.name.toLowerCase().includes(q);
      const notesMatch = p.notes ? p.notes.toLowerCase().includes(q) : false;
      const specMatch = p.defaultSpecModel ? p.defaultSpecModel.toLowerCase().includes(q) : false;
      const catMeta = CATEGORIES[p.category as ItemCategory];
      const catMatch = catMeta ? catMeta.label.toLowerCase().includes(q) : false;

      return nameMatch || notesMatch || specMatch || catMatch;
    });
  }, [search, selectedCat]);

  if (!isOpen) return null;

  const handleDirectAddClick = async (e: React.MouseEvent, preset: ItemPreset) => {
    e.stopPropagation();
    if (!onDirectAdd) {
      onSelectPreset(preset);
      return;
    }

    setAddingId(preset.name);
    try {
      await onDirectAdd(preset);
      setAddedIds((prev) => ({ ...prev, [preset.name]: true }));
      setTimeout(() => {
        setAddedIds((prev) => ({ ...prev, [preset.name]: false }));
      }, 2500);
    } finally {
      setAddingId(null);
    }
  };

  const formatTrackingBadge = (preset: ItemPreset) => {
    if (preset.trackingMode === 'cycle' && preset.cycleDays) {
      return `${preset.cycleDays} 天週期`;
    }
    if (preset.trackingMode === 'pao' && preset.paoMonths) {
      return `PAO ${preset.paoMonths} 個月`;
    }
    if (preset.trackingMode === 'quantity' && preset.initialQuantity) {
      return `${preset.initialQuantity} ${preset.quantityUnit || '份'}`;
    }
    if (preset.trackingMode === 'warranty') {
      return '保固追蹤';
    }
    return '週期更換';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm modal-backdrop-animate">
      <div className="app-surface border border-[var(--app-border)] rounded-t-3xl sm:rounded-2xl w-full max-w-xl max-h-[92dvh] flex flex-col shadow-2xl overflow-hidden sheet-content-animate sm:modal-content-animate">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-[var(--app-border)]">
          <div className="min-w-0 pr-2">
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-[var(--app-accent-strong)]" />
              <h2 className="ui-section-title text-[var(--app-text)] tracking-tight">預設物品範本庫</h2>
            </div>
            <p className="ui-meta text-[var(--app-muted)] mt-0.5 truncate">
              選一個後會帶入圖片、名稱、分類與建議週期
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="關閉範本庫"
            className="app-control ui-button min-h-11 min-w-11 -mr-2 flex items-center justify-center rounded-xl border hover:border-[var(--app-accent)] shrink-0 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Bar & Category Filters */}
        <div className="p-4 border-b border-[var(--app-border)] bg-[var(--app-surface-subtle)] space-y-3">
          {/* Search Box */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--app-muted-low)]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="搜尋物品名稱或備註（如：魚油、垃圾袋、濾網）"
              className="w-full bg-[var(--app-surface)] border border-[var(--app-border)] focus:border-[var(--app-accent)] rounded-xl pl-10 pr-9 min-h-11 ui-body text-[var(--app-text)] outline-none placeholder:text-[var(--app-muted-low)] transition-all shadow-xs"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                aria-label="清除搜尋"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--app-muted)] hover:text-[var(--app-text)] p-1 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Category Filter Pills */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar text-sm">
            {categoriesList.map((cat) => {
              const isSelected = selectedCat === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCat(cat.id)}
                  className={`flex-shrink-0 min-h-8 px-3.5 rounded-full ui-button transition-all text-xs font-bold border ${
                    isSelected
                      ? 'app-primary shadow-xs border-transparent'
                      : 'app-surface border-[var(--app-border)] text-[var(--app-muted)] hover:text-[var(--app-text)]'
                  }`}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Presets List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          <div className="flex items-center justify-between text-xs text-[var(--app-muted)] font-semibold px-1 pb-1">
            <span>共 {filteredPresets.length} 款生活耗材範本</span>
            <span>點擊自訂 · 或點右側直接加入</span>
          </div>

          {filteredPresets.length === 0 ? (
            <div className="text-center py-12 px-4 space-y-3">
              <div className="w-12 h-12 rounded-2xl app-primary-soft border mx-auto flex items-center justify-center">
                <SlidersHorizontal className="w-5 h-5 text-[var(--app-accent-strong)]" />
              </div>
              <p className="ui-body text-[var(--app-text)] font-semibold">找不到符合「{search}」的範本</p>
              <p className="ui-meta text-[var(--app-muted)]">您可以自訂名稱新增物品，或嘗試更換關鍵字。</p>
              <button
                type="button"
                onClick={() => {
                  onSelectPreset({
                    name: search.trim() || '自訂耗材',
                    category: (selectedCat !== 'all' ? selectedCat : 'general') as any,
                    trackingMode: 'cycle',
                    cycleDays: 30,
                    minStockAlert: 1,
                  });
                }}
                className="app-primary ui-button min-h-10 px-4 rounded-xl text-sm font-bold shadow-xs inline-flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                以「{search || '自訂耗材'}」開啟建立表單
              </button>
            </div>
          ) : (
            filteredPresets.map((preset) => {
              const isAdded = addedIds[preset.name];
              const isAdding = addingId === preset.name;
              const catMeta = CATEGORIES[preset.category as ItemCategory];

              return (
                <div
                  key={preset.name}
                  onClick={() => onSelectPreset(preset)}
                  className="app-surface border border-[var(--app-border)] hover:border-[var(--app-accent)] rounded-2xl p-3.5 flex items-center justify-between gap-3 shadow-xs hover:shadow-sm cursor-pointer transition-all active:scale-[0.99] group"
                >
                  {/* Left: Avatar / Badge */}
                  <div className="shrink-0">
                    <ItemBrandBadge
                      name={preset.name}
                      category={preset.category}
                      imageUrl={preset.imageUrl}
                      specModel={preset.defaultSpecModel}
                      size="lg"
                      shape="rounded"
                    />
                  </div>

                  {/* Center: Details */}
                  <div className="min-w-0 flex-1">
                    <h3 className="ui-item-title text-[var(--app-text)] group-hover:text-[var(--app-accent-strong)] transition-colors truncate">
                      {preset.name}
                    </h3>
                    {preset.notes && (
                      <p className="ui-meta text-[var(--app-muted)] truncate mt-0.5">
                        {preset.notes}
                      </p>
                    )}

                    {/* Meta Tags */}
                    <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                      <span className="ui-badge bg-[var(--app-surface-subtle)] border text-[var(--app-text)] font-semibold text-[11px] px-2 py-0.5 rounded-full">
                        {formatTrackingBadge(preset)}
                      </span>
                      {catMeta && (
                        <span className="ui-badge bg-[var(--app-surface-subtle)] border text-[var(--app-muted)] font-medium text-[11px] px-2 py-0.5 rounded-full">
                          {catMeta.label}
                        </span>
                      )}
                      {preset.defaultSpecModel && (
                        <span className="ui-badge text-[var(--app-muted-low)] text-[11px] truncate max-w-[120px]">
                          {preset.defaultSpecModel}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Right: Direct Add Button */}
                  <button
                    type="button"
                    onClick={(e) => handleDirectAddClick(e, preset)}
                    disabled={isAdding}
                    className={`shrink-0 min-h-9 px-3 rounded-xl ui-button text-xs font-bold flex items-center gap-1 transition-all ${
                      isAdded
                        ? 'bg-emerald-500 text-white shadow-xs'
                        : 'app-primary-soft text-[var(--app-accent-strong)] hover:app-primary border border-[var(--app-accent)]/30 active:scale-95'
                    }`}
                    title="點擊直接加入當前備品庫"
                  >
                    {isAdded ? (
                      <>
                        <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                        <span>已加入</span>
                      </>
                    ) : isAdding ? (
                      <span>加入中...</span>
                    ) : (
                      <>
                        <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                        <span>直接加入</span>
                      </>
                    )}
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 border-t border-[var(--app-border)] bg-[var(--app-surface-subtle)] flex items-center justify-between">
          <span className="ui-meta text-[var(--app-muted)] text-xs">
            沒找到適合的？點擊右側建立全新物品
          </span>
          <button
            type="button"
            onClick={() => {
              onSelectPreset({
                name: '',
                category: 'general',
                trackingMode: 'cycle',
                cycleDays: 30,
                minStockAlert: 1,
              });
            }}
            className="app-control ui-button min-h-9 px-3.5 rounded-xl border hover:border-[var(--app-accent)] text-xs font-semibold text-[var(--app-text)]"
          >
            自行新增自訂物品
          </button>
        </div>
      </div>
    </div>
  );
};
