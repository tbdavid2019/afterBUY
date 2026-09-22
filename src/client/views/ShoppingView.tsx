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
  const [feedback, setFeedback] = useState<string | null>(null);

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
      setFeedback(locale === 'zh-TW' ? '✨ 所有急需備品已全部 +1 補貨！' : '✨ All restock items replenished +1!');
      setTimeout(() => setFeedback(null), 3000);
    } catch (err: any) {
      alert(err.message || (locale === 'zh-TW' ? '批次補庫存失敗' : 'Batch replenish failed'));
    } finally {
      setBatchLoading(false);
    }
  };

  return (
    <div className="space-y-6 pt-1">
      {/* Banner */}
      <div className="border-b border-[var(--app-border)] pb-4 flex items-end justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="ui-page-title tracking-tight text-[var(--app-text)] flex items-center gap-2">
            <ShoppingBag className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0" />
            <span className="truncate">{locale === 'zh-TW' ? '備品庫存與採購' : 'Stock & Shopping'}</span>
          </h2>
          <p className="ui-body mt-1 text-[var(--app-muted)] max-w-xl">
            {locale === 'zh-TW' ? '自動彙整備品低於門檻或庫存歸零的耗材，方便採購補貨。' : 'Auto aggregates consumables low on backup stock.'}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {restockItems.length > 0 && onBatchStock && (
            <button
              type="button"
              disabled={batchLoading}
              onClick={handleBatchReplenishAll}
              className="app-primary ui-button flex min-h-10 shrink-0 items-center gap-1.5 rounded-md px-3 text-sm font-medium shadow-sm tactile-press disabled:opacity-50"
            >
              <RotateCw className={`h-3.5 w-3.5 ${batchLoading ? 'animate-spin' : ''}`} />
              <span>{locale === 'zh-TW' ? '全部 +1' : 'All +1'}</span>
            </button>
          )}

          {restockItems.length > 0 && (
            <button
              type="button"
              onClick={handleCopyList}
              aria-label="複製待採購清單"
              className="app-control ui-button flex min-h-10 shrink-0 items-center gap-1.5 rounded-md border px-3 text-sm font-medium tactile-press hover:border-[var(--app-accent)]"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" /> : <Copy className="h-3.5 w-3.5 text-[var(--app-accent-strong)]" />}
              <span>{copied ? (locale === 'zh-TW' ? '已複製' : 'Copied!') : (locale === 'zh-TW' ? '複製清單' : 'Copy')}</span>
            </button>
          )}
        </div>
      </div>

      {feedback && (
        <div className="app-surface-subtle border border-emerald-500/30 rounded-lg p-3 flex items-center gap-2 text-emerald-600 dark:text-emerald-400 text-sm font-medium transition-opacity duration-150">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Restock Needed Section */}
      <section>
        <h3 className="ui-section-title text-[var(--app-text)] mb-3 flex items-center gap-2">
          <Package className="h-4 w-4 text-[var(--app-accent-strong)]" />
          <span>{locale === 'zh-TW' ? '急需採購補貨' : 'Restock Needed'}</span>
          <span className="inline-flex items-center rounded border px-1.5 py-0.2 bg-amber-500/10 text-amber-800 dark:text-amber-300 border-amber-500/30 tabular-nums text-xs font-semibold">
            {restockItems.length}
          </span>
        </h3>

        {restockItems.length === 0 ? (
          <div className="app-surface rounded-xl border p-6 text-center shadow-sm">
            <CheckCircle2 className="mx-auto mb-2 h-8 w-8 text-emerald-600 dark:text-emerald-400" />
            <h4 className="ui-item-title text-[var(--app-text)]">{locale === 'zh-TW' ? '備品庫存充足' : 'Inventory Healthy'}</h4>
            <p className="ui-body mt-1 text-[var(--app-muted)]">
              {locale === 'zh-TW' ? '目前所有耗材備品均在安全數量以上。' : 'All items have sufficient backup stock.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {restockItems.map((item) => {
              const cat = CATEGORIES[item.category] || CATEGORIES.general;

              return (
                <article
                  key={item.id}
                  className="app-surface rounded-xl border border-amber-500/40 p-3.5 flex items-center justify-between gap-3 shadow-sm"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5 mb-1">
                      <span className="inline-flex items-center rounded border px-1.5 py-0.5 bg-amber-500/10 text-amber-800 dark:text-amber-300 border-amber-500/30 text-xs font-medium tabular-nums">
                        庫存: {item.backupStock} (門檻: {item.minStockAlert})
                      </span>
                      <span className={`inline-flex items-center rounded border px-1.5 py-0.5 text-xs font-medium ${cat.bg} ${cat.color}`}>
                        {cat.label}
                      </span>
                    </div>
                    <h4 className="ui-item-title text-[var(--app-text)] truncate">{item.name}</h4>
                    {item.notes && <p className="ui-meta text-[var(--app-muted)] truncate mt-0.5">{item.notes}</p>}
                  </div>

                  {/* Stock Quick Adjustment with 44px touch targets */}
                  <div className="app-surface-subtle flex min-h-10 items-center gap-1 rounded-lg border px-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => onAdjustStock(item.id, -1)}
                      disabled={item.backupStock <= 0}
                      aria-label={`減少 ${item.name} 備品庫存`}
                      className="min-h-10 min-w-8 rounded text-[var(--app-muted)] hover:bg-[var(--app-surface)] disabled:opacity-30 flex items-center justify-center tactile-press"
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <span className="min-w-6 text-center text-sm font-semibold tabular-nums text-[var(--app-text)]">
                      {item.backupStock}
                    </span>
                    <button
                      type="button"
                      onClick={() => onAdjustStock(item.id, 1)}
                      aria-label={`增加 ${item.name} 備品庫存`}
                      className="min-h-10 min-w-8 rounded text-[var(--app-accent-strong)] hover:bg-[var(--app-surface)] flex items-center justify-center tactile-press"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* All Other Items Inventory */}
      <section className="pt-2">
        <h3 className="ui-section-title text-[var(--app-text)] mb-3">
          {locale === 'zh-TW' ? '全部物品備品概況' : 'All Items Overview'}
        </h3>
        <div className="app-surface border rounded-xl divide-y divide-[var(--app-border)] overflow-hidden shadow-sm">
          {items.map((item) => (
            <div key={item.id} className="min-h-12 px-4 py-2 flex items-center justify-between gap-3">
              <span className="ui-body text-[var(--app-text)] font-medium truncate flex-1 pr-2">{item.name}</span>
              <div className="flex items-center gap-3 shrink-0">
                <span className="ui-meta text-[var(--app-muted)]">
                  庫存: <strong className="ui-body font-semibold text-[var(--app-text)] tabular-nums">{item.backupStock}</strong>
                </span>
                <button
                  type="button"
                  onClick={() => onAdjustStock(item.id, 1)}
                  aria-label={`為 ${item.name} 補充一份備品`}
                  className="app-control min-h-9 min-w-9 flex items-center justify-center rounded-md border hover:border-[var(--app-accent)] text-[var(--app-accent-strong)] tactile-press"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
