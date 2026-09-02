import React, { useState } from 'react';
import { ShoppingBag, Copy, Check, Plus, Minus, Package, CheckCircle2 } from 'lucide-react';
import { ItemResponse } from '../../shared/types.ts';
import { CATEGORIES } from '../utils/category.ts';

interface ShoppingViewProps {
  items: ItemResponse[];
  onAdjustStock: (id: string, delta: number) => void;
}

export const ShoppingView: React.FC<ShoppingViewProps> = ({ items, onAdjustStock }) => {
  const [copied, setCopied] = useState(false);

  // Filter items needing replenishment
  const restockItems = items.filter((i) => i.needsRestock);

  const handleCopyList = () => {
    if (restockItems.length === 0) return;
    const textList = restockItems
      .map((i) => `• ${i.name} (目前庫存: ${i.backupStock}, 建議補貨至 ${i.minStockAlert})`)
      .join('\n');
    const fullText = `afterBUY 待採購耗材備品清單：\n${textList}`;

    navigator.clipboard.writeText(fullText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6 pb-28 pt-1">
      {/* Banner */}
      <div className="border-b border-slate-800/80 pb-5 flex items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-[-0.03em] text-white flex items-center gap-2 mb-2">
            <ShoppingBag className="w-4 h-4 text-amber-400" />
            <span>備品庫存與採購清單</span>
          </h2>
          <p className="text-sm text-slate-400 max-w-xl">
            自動彙整備品低於門檻或庫存歸零的耗材，方便採購補貨。
          </p>
        </div>

        {restockItems.length > 0 && (
          <button
            onClick={handleCopyList}
            aria-label="複製待採購清單"
            className="flex-shrink-0 flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-sky-300 border border-slate-700 text-xs font-semibold px-3 py-2 rounded-xl transition-all active:scale-[0.98]"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? '已複製！' : '複製清單'}</span>
          </button>
        )}
      </div>

      {/* Restock Needed Section */}
      <div>
        <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-1.5">
          <Package className="w-3.5 h-3.5" />
          <span>急需採購補貨 ({restockItems.length})</span>
        </h3>

        {restockItems.length === 0 ? (
          <div className="text-center py-10 bg-slate-900/40 rounded-2xl border border-slate-800/60 p-4">
            <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
            <p className="text-xs font-semibold text-slate-200">備品庫存充足！</p>
            <p className="text-[11px] text-slate-500 mt-1">目前所有耗材備品均在安全數量以上。</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {restockItems.map((item) => {
              const cat = CATEGORIES[item.category] || CATEGORIES.general;

              return (
                <div
                  key={item.id}
                  className="app-surface border border-amber-400/30 rounded-2xl p-4 flex items-center justify-between gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-1.5 py-0.5 rounded-md font-semibold">
                        庫存: {item.backupStock} (警示門檻: {item.minStockAlert})
                      </span>
                      <span className="text-xs text-slate-500">{cat.label}</span>
                    </div>
                    <h4 className="text-sm font-bold text-white truncate">{item.name}</h4>
                    {item.notes && <p className="text-[11px] text-slate-400 truncate mt-0.5">{item.notes}</p>}
                  </div>

                  {/* Stock Quick Adjustment */}
                  <div className="flex items-center gap-1 bg-slate-950 px-2 py-1 rounded-xl border border-slate-800">
                    <button
                      onClick={() => onAdjustStock(item.id, -1)}
                      disabled={item.backupStock <= 0}
                      className="w-6 h-6 rounded hover:bg-slate-800 flex items-center justify-center text-slate-400 disabled:opacity-20 active:scale-90"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="w-6 text-center text-xs font-bold font-mono text-white">
                      {item.backupStock}
                    </span>
                    <button
                      onClick={() => onAdjustStock(item.id, 1)}
                      className="w-6 h-6 rounded hover:bg-slate-800 flex items-center justify-center text-sky-400 active:scale-90"
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
        <h3 className="text-sm font-semibold text-white mb-3">
          全部物品備品概況
        </h3>
        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl divide-y divide-slate-800/60 overflow-hidden">
          {items.map((item) => (
            <div key={item.id} className="p-3 flex items-center justify-between text-xs">
              <span className="text-slate-200 font-medium truncate flex-1 pr-2">{item.name}</span>
              <div className="flex items-center gap-2">
                <span className="text-slate-400">庫存: <b className="text-white">{item.backupStock}</b></span>
                <button
                  onClick={() => onAdjustStock(item.id, 1)}
                  className="bg-slate-800 hover:bg-slate-700 text-sky-400 p-1 rounded-lg transition-colors"
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
