import React, { useState } from 'react';
import {
  RotateCcw,
  Plus,
  Minus,
  MoreVertical,
  Calendar,
  Package,
  History,
  Trash2,
  Edit2,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Check,
  Sparkles,
  Moon,
  MapPin,
} from 'lucide-react';
import { ItemResponse } from '../../shared/types.ts';
import { CATEGORIES } from '../utils/category.ts';
import { formatRemainingDaysText } from '../../shared/lifecycle.ts';

interface ItemCardProps {
  item: ItemResponse;
  onReplace: (id: string) => void;
  onAdjustStock: (id: string, delta: number) => void;
  onEdit: (item: ItemResponse) => void;
  onDelete: (id: string) => void;
  onViewHistory: (item: ItemResponse) => void;
  onStartUsing?: (id: string) => void;
  onSnooze?: (id: string, days: number) => void;
  selectable?: boolean;
  isSelected?: boolean;
  onToggleSelect?: (id: string) => void;
}

export const ItemCard: React.FC<ItemCardProps> = ({
  item,
  onReplace,
  onAdjustStock,
  onEdit,
  onDelete,
  onViewHistory,
  onStartUsing,
  onSnooze,
  selectable,
  isSelected,
  onToggleSelect,
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const [showSnoozeMenu, setShowSnoozeMenu] = useState(false);
  const [replacing, setReplacing] = useState(false);

  const categoryMeta = CATEGORIES[item.category] || CATEGORIES.general;
  const statusInfo = formatRemainingDaysText(item.remainingDays, item.healthStatus);

  const handleQuickReplace = async () => {
    setReplacing(true);
    await onReplace(item.id);
    setTimeout(() => setReplacing(false), 400);
  };

  // Progress Bar color calculation
  const getProgressColor = () => {
    if (item.healthStatus === 'overdue') return 'bg-rose-400';
    if (item.healthStatus === 'due_soon') return 'bg-amber-300';
    return 'bg-emerald-400';
  };

  const getBorderColor = () => {
    if (item.healthStatus === 'overdue') return 'border-rose-400/45';
    if (item.healthStatus === 'due_soon') return 'border-amber-300/45';
    return 'border-slate-800/90 hover:border-slate-700';
  };

  return (
    <div
      onClick={selectable ? () => onToggleSelect?.(item.id) : undefined}
      className={`app-surface relative rounded-2xl border ${
        isSelected ? 'ring-2 ring-sky-500 border-sky-500/80 bg-sky-950/20' : getBorderColor()
      } p-4 sm:p-5 shadow-[0_12px_30px_-24px_rgba(2,6,23,0.9)] transition-all duration-200 overflow-hidden ${
        selectable ? 'cursor-pointer select-none' : ''
      }`}
    >
      {/* Top row: Category + Status + Action Menu */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          {selectable && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleSelect?.(item.id);
              }}
              className={`w-5 h-5 rounded-lg flex items-center justify-center border transition-all ${
                isSelected ? 'bg-sky-500 border-sky-400 text-white' : 'border-slate-600 bg-slate-800'
              }`}
            >
              {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
            </button>
          )}
          <span
            className={`inline-flex shrink-0 items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-full border ${categoryMeta.bg} ${categoryMeta.color}`}
          >
            {categoryMeta.label}
          </span>
          {item.stockName && (
            <span className="app-control inline-flex shrink-0 items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full border">
              <span>{item.stockIcon || '🏠'}</span>
              <span className="truncate max-w-[100px]">{item.stockName}</span>
            </span>
          )}
          {item.location && (
            <span className="app-control inline-flex shrink-0 items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full border">
              <MapPin className="w-2.5 h-2.5 text-sky-500 dark:text-sky-400" />
              <span>{item.location}</span>
            </span>
          )}
          <span className={`inline-flex shrink-0 items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-full border ${statusInfo.badge}`}>
            <span className="w-1.5 h-1.5 rounded-full bg-current" aria-hidden="true" />
            {statusInfo.text}
          </span>
        </div>

        {/* Action Menu */}
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            aria-label={`開啟 ${item.name} 的更多操作`}
            aria-expanded={showMenu}
            className="shrink-0 text-slate-400 hover:text-white p-2 -mr-2 rounded-xl hover:bg-slate-800 transition-colors active:scale-[0.96]"
          >
            <MoreVertical className="w-4 h-4" />
          </button>

          {showMenu && (
            <>
              <div className="fixed inset-0 z-20" onClick={() => setShowMenu(false)} />
              <div className="absolute right-0 top-10 z-30 w-40 bg-slate-800 border border-slate-700 rounded-2xl shadow-xl py-1 text-xs text-slate-200 animate-in fade-in zoom-in-95 duration-100">
                <button
                  onClick={() => {
                    setShowMenu(false);
                    onEdit(item);
                  }}
                  className="w-full min-h-10 flex items-center gap-2 px-3 hover:bg-slate-700/80 transition-colors"
                >
                  <Edit2 className="w-3.5 h-3.5 text-sky-400" />
                  <span>編輯內容</span>
                </button>
                <button
                  onClick={() => {
                    setShowMenu(false);
                    onViewHistory(item);
                  }}
                  className="w-full min-h-10 flex items-center gap-2 px-3 hover:bg-slate-700/80 transition-colors"
                >
                  <History className="w-3.5 h-3.5 text-indigo-400" />
                  <span>更換記錄</span>
                </button>
                <div className="border-t border-slate-700 my-1"></div>
                <button
                  onClick={() => {
                    setShowMenu(false);
                    onDelete(item.id);
                  }}
                  className="w-full min-h-10 flex items-center gap-2 px-3 text-rose-300 hover:bg-rose-500/10 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>刪除物品</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3 mb-4">
        <div className="app-surface-subtle w-14 h-14 shrink-0 rounded-2xl border flex items-center justify-center overflow-hidden">
          {item.imageUrl ? (
            <img src={item.imageUrl} alt="" className="w-full h-full object-contain p-1.5" loading="lazy" />
          ) : (
            <Package className="w-5 h-5 text-slate-500" aria-hidden="true" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-[17px] font-bold tracking-[-0.015em] text-white truncate">{item.name}</h3>
          {(item.specModel || (item.price !== null && item.price !== undefined)) && (
            <div className="flex items-center gap-2 mt-0.5 text-xs">
              {item.specModel && (
                <span className="truncate bg-slate-800/80 px-1.5 py-0.5 rounded text-[11px] text-slate-300">
                  {item.specModel}
                </span>
              )}
              {item.price !== null && item.price !== undefined && (
                <span className="text-[11px] font-semibold text-emerald-400">
                  NT$ {item.price.toLocaleString()}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Progress & Countdown Section OR Stored Mode Banner */}
      {item.isStored ? (
        <div className="bg-indigo-500/10 border border-indigo-500/20 p-3 rounded-2xl flex items-center gap-2.5 mb-4">
          <Package className="w-5 h-5 text-indigo-400 shrink-0" />
          <div className="text-xs">
            <p className="font-bold text-indigo-200">先存放中（未拆封備品）</p>
            <p className="text-[10px] text-slate-400 mt-0.5">拆封時點擊下方「開始使用」即可啟動更換週期計時</p>
          </div>
        </div>
      ) : (
        <div className="mb-4">
          <div className="flex items-baseline justify-between mb-1.5">
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <Clock className="w-3.5 h-3.5 text-slate-500" />
              <span>下次處理 · {item.nextDueDate}</span>
            </div>
            {item.healthStatus === 'snoozed' && item.snoozeUntil && (
              <span className="text-[10px] font-semibold text-sky-400 flex items-center gap-1">
                <Moon className="w-3 h-3" />
                延後至 {item.snoozeUntil}
              </span>
            )}
          </div>

          {/* Lifespan Progress Bar */}
          <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden" role="progressbar" aria-valuenow={item.percentageRemaining} aria-valuemin={0} aria-valuemax={100} aria-label={`${item.name} 週期剩餘比例`}>
            <div
              className={`h-full ${getProgressColor()} rounded-full transition-[width] duration-500`}
              style={{ width: `${item.percentageRemaining}%` }}
            />
          </div>
          <div className="flex items-center justify-between mt-2 text-[11px]">
            <span className={statusInfo.color}>{item.remainingDays < 0 ? '需要立即處理' : statusInfo.text}</span>
            <span className="text-slate-500">已使用 {Math.max(0, Math.min(100, 100 - item.percentageRemaining))}%</span>
          </div>
        </div>
      )}

      {/* Bottom Info: Stock Counter & Actions */}
      <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-800/60">
        {/* Backup Stock Adjustment */}
        <div className="app-surface-subtle flex items-center gap-1.5 border px-2.5 py-1.5 rounded-xl">
          <Package className={`w-3.5 h-3.5 ${item.needsRestock ? 'text-amber-400' : 'text-slate-400'}`} />
          <span className="text-xs text-slate-400 font-medium">備品:</span>
          <span className={`text-xs font-bold ${item.backupStock === 0 ? 'text-rose-400' : 'text-white'}`}>
            {item.backupStock}
          </span>
          <div className="flex items-center ml-1 space-x-0.5">
            <button
              onClick={() => onAdjustStock(item.id, -1)}
              disabled={item.backupStock <= 0}
              aria-label={`減少 ${item.name} 備品庫存`}
              className="w-7 h-7 rounded-lg hover:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white disabled:opacity-30 active:scale-90 transition-all"
            >
              <Minus className="w-3 h-3" />
            </button>
            <button
              onClick={() => onAdjustStock(item.id, 1)}
              aria-label={`增加 ${item.name} 備品庫存`}
              className="w-7 h-7 rounded-lg hover:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white active:scale-90 transition-all"
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        {item.isStored ? (
          <button
            type="button"
            onClick={() => onStartUsing?.(item.id)}
            className="app-primary flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold shadow-md shadow-indigo-500/25 active:scale-[0.98] transition-all"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>開始使用</span>
          </button>
        ) : (
          <div className="flex items-center gap-1.5 relative">
            {/* Snooze button when due or overdue */}
            {(item.healthStatus === 'overdue' || item.healthStatus === 'due_soon') && onSnooze && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowSnoozeMenu(!showSnoozeMenu)}
                  title="稍後再說（延後提醒）"
                  className="app-control px-2.5 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white flex items-center gap-1 transition-colors"
                >
                  <Moon className="w-3.5 h-3.5 text-sky-400" />
                  <span>稍後</span>
                </button>
                {showSnoozeMenu && (
                  <>
                    <div className="fixed inset-0 z-20" onClick={() => setShowSnoozeMenu(false)} />
                    <div className="absolute right-0 bottom-11 z-30 w-32 bg-slate-800 border border-slate-700 rounded-2xl shadow-xl py-1 text-xs text-slate-200">
                      <button
                        type="button"
                        onClick={() => {
                          setShowSnoozeMenu(false);
                          onSnooze(item.id, 3);
                        }}
                        className="w-full text-left px-3 py-2 hover:bg-slate-700 transition-colors"
                      >
                        延後 3 天
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowSnoozeMenu(false);
                          onSnooze(item.id, 7);
                        }}
                        className="w-full text-left px-3 py-2 hover:bg-slate-700 transition-colors"
                      >
                        延後 7 天
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* 1-Tap "Replaced Today" Action */}
            <button
              onClick={handleQuickReplace}
              disabled={replacing}
              aria-busy={replacing}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all active:scale-[0.98] shadow-md ${
                replacing
                  ? 'bg-emerald-300 text-emerald-950 scale-[0.98]'
                  : 'app-primary hover:brightness-105 shadow-sky-500/20'
              }`}
            >
              <RotateCcw className={`w-3.5 h-3.5 ${replacing ? 'animate-spin' : ''}`} />
              <span>{replacing ? '已更新！' : '今天已換'}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
