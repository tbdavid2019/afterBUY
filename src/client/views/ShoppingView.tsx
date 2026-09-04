import React, { useState } from 'react';
import { ShoppingBag, Copy, Check, Plus, Minus, Package, CheckCircle2, RotateCw } from 'lucide-react';
import { ItemResponse } from '../../shared/types.ts';
import { CATEGORIES } from '../utils/category.ts';
import { useTranslation } from '../i18n/index.tsx';

interface ShoppingViewProps {
  items: ItemResponse[];
  onAdjustStock: (id: string, delta: number) => void;
  onBatchStock?: (ids: string[], delta: number) => Promise<void>;
}

export const ShoppingView: React.FC<ShoppingViewProps> = ({ items, onAdjustStock, onBatchStock }) => {
  const { t, locale } = useTranslation();
  const [copied, setCopied] = useState(false);
  const [batchLoading, setBatchLoading] = useState(false);

  // Filter items needing replenishment
  const restockItems = items.filter((i) => i.needsRestock);

  const handleCopyList = () => {
    if (restockItems.length === 0) return;
    const textList = restockItems
      .map((i) => `• ${i.name} (${locale === 'zh-TW' ? '目前庫存' : 'Stock'}: ${i.backupStock}, ${locale === 'zh-TW' ? '門檻' : 'Threshold'}: ${i.minStockAlert})`)
      .join('\n');
    const fullText = `${t('appName')} - ${locale === 'zh-TW' ? '待採購耗材備品清單' : 'Shopping List'}:\n${textList}`;

    navigator.clipboard.writeText(fullText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleBatchReplenishAll = async () => {
    if (restockItems.length === 0 || !onBatchStock) return;
    setBatchLoading(true);
    try {
      await onBatchStock(restockItems.map((i) => i.id), 1);
    } catch (err: any) {
      alert(err.message || (locale === 'zh-TW' ? '批次補庫存失敗' : 'Batch replenish failed'));
    } finally {
      setBatchLoading(false);
    }
  };

  return (
    <div className="space-y-6 pb-28 pt-1">
      {/* Banner */}
      <div className="border-b border-[var(--app-border)] pb-5 flex items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--app-text)] flex items-center gap-2 mb-2">
            <ShoppingBag className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            <span>{locale === 'zh-TW' ? '備品庫存與採購清單' : 'Stock & Shopping List'}</span>
          </h2>
          <p className="text-xs sm:text-sm text-[var(--app-muted)] max-w-xl">
            {locale === 'zh-TW' ? '自動彙整備品低於門檻或庫存歸零的耗材，方便採購補貨。' : 'Auto aggregates consumables low on backup stock.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {restockItems.length > 0 && onBatchStock && (
            <button
              type="button"
              disabled={batchLoading}
              onClick={handleBatchReplenishAll}
              className="app-primary flex-shrink-0 flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl transition-all active:scale-[0.98] shadow-sm disabled:opacity-50"
            >
              <RotateCw className={`w-3.5 h-3.5 ${batchLoading ? 'animate-spin' : ''}`} />
              <span>{locale === 'zh-TW' ? '全部 +1 備品' : 'Replenish All +1'}</span>
            </button>
          )}

          {restockItems.length > 0 && (
            <button
              onClick={handleCopyList}
              aria-label="複製待採購清單"
              className="app-control flex-shrink-0 flex items-center gap-1.5 border text-xs font-semibold px-3 py-2 rounded-xl transition-all active:scale-[0.98] hover:border-[var(--app-accent)]"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> : <Copy className="w-4 h-4 text-[var(--app-accent-strong)]" />}
              <span>{copied ? (locale === 'zh-TW' ? '已複製！' : 'Copied!') : (locale === 'zh-TW' ? '複製清單' : 'Copy List')}</span>
            </button>
          )}
        </div>
      </div>

      {/* Restock Needed Section */}
      <div>
        <h3 className="text-sm font-bold text-[var(--app-text)] mb-3 flex items-center gap-1.5">
          <Package className="w-4 h-4 text-[var(--app-accent-strong)]" />
          <span>急需採購補貨 ({restockItems.length})</span>
        </h3>

        {restockItems.length === 0 ? (
          <div className="text-center py-10 app-surface rounded-2xl border border-[var(--app-border)] p-4 shadow-sm">
            <CheckCircle2 className="w-8 h-8 text-emerald-600 dark:text-emerald-400 mx-auto mb-2" />
            <p className="text-xs font-semibold text-[var(--app-text)]">備品庫存充足！</p>
            <p className="text-xs text-[var(--app-muted)] mt-1">目前所有耗材備品均在安全數量以上。</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {restockItems.map((item) => {
              const cat = CATEGORIES[item.category] || CATEGORIES.general;

              return (
                <div
                  key={item.id}
                  className="app-surface border border-amber-500/40 rounded-2xl p-4 flex items-center justify-between gap-3 shadow-sm"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[11px] bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full font-semibold">
                        庫存: {item.backupStock} (警示門檻: {item.minStockAlert})
                      </span>
                      <span className="text-xs text-[var(--app-muted)]">{cat.label}</span>
                    </div>
                    <h4 className="text-sm font-bold text-[var(--app-text)] truncate">{item.name}</h4>
                    {item.notes && <p className="text-xs text-[var(--app-muted)] truncate mt-0.5">{item.notes}</p>}
                  </div>

                  {/* Stock Quick Adjustment */}
                  <div className="flex items-center gap-1 app-surface-subtle px-2 py-1 rounded-xl border border-[var(--app-border)]">
                    <button
                      onClick={() => onAdjustStock(item.id, -1)}
                      disabled={item.backupStock <= 0}
                      className="w-6 h-6 rounded hover:bg-[var(--app-surface)] flex items-center justify-center text-[var(--app-muted)] hover:text-[var(--app-text)] disabled:opacity-20 active:scale-90 transition-all"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="w-6 text-center text-xs font-bold font-mono text-[var(--app-text)]">
                      {item.backupStock}
                    </span>
                    <button
                      onClick={() => onAdjustStock(item.id, 1)}
                      className="w-6 h-6 rounded hover:bg-[var(--app-surface)] flex items-center justify-center text-[var(--app-accent-strong)] active:scale-90 transition-all"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* All Other Items Inventory */}
      <div className="pt-2">
        <h3 className="text-sm font-bold text-[var(--app-text)] mb-3">
          全部物品備品概況
        </h3>
        <div className="app-surface border border-[var(--app-border)] rounded-2xl divide-y divide-[var(--app-border)] overflow-hidden shadow-sm">
          {items.map((item) => (
            <div key={item.id} className="p-3 flex items-center justify-between text-xs">
              <span className="text-[var(--app-text)] font-medium truncate flex-1 pr-2">{item.name}</span>
              <div className="flex items-center gap-2">
                <span className="text-[var(--app-muted)]">庫存: <b className="text-[var(--app-text)]">{item.backupStock}</b></span>
                <button
                  onClick={() => onAdjustStock(item.id, 1)}
                  className="app-control hover:border-[var(--app-accent)] text-[var(--app-accent-strong)] p-1.5 rounded-lg transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
