import React, { useState } from 'react';
import {
  RotateCcw,
  Plus,
  Minus,
  MoreVertical,
  Package,
  History,
  Trash2,
  Edit2,
  Clock,
  Check,
  Moon,
  MapPin,
  Play,
} from 'lucide-react';
import { ItemResponse } from '../../shared/types.ts';
import { CATEGORIES } from '../utils/category.ts';
import { formatRemainingDaysText } from '../../shared/lifecycle.ts';

interface ItemCardProps {
  item: ItemResponse;
  onReplace: (id: string) => void | Promise<void>;
  onAdjustStock: (id: string, delta: number) => void | Promise<void>;
  onEdit: (item: ItemResponse) => void;
  onDelete: (id: string) => void | Promise<void>;
  onViewHistory: (item: ItemResponse) => void;
  onStartUsing?: (id: string) => void | Promise<void>;
  onSnooze?: (id: string, days: number) => void | Promise<void>;
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
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const categoryMeta = CATEGORIES[item.category] || CATEGORIES.general;
  const statusInfo = formatRemainingDaysText(item.remainingDays, item.healthStatus);
  const isStored = item.isStored || item.healthStatus === 'stored';
  const dateOnly = item.trackingMode === 'expiry' || item.trackingMode === 'warranty';

  const runAction = async (action: () => void | Promise<void>, successMessage?: string) => {
    setBusy(true);
    setFeedback(null);
    try {
      await action();
      if (successMessage) setFeedback(successMessage);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : '操作失敗，請稍後重試');
    } finally {
      setBusy(false);
      window.setTimeout(() => setFeedback(null), 2200);
    }
  };

  const progressColor = item.healthStatus === 'overdue'
    ? 'bg-rose-500'
    : item.healthStatus === 'due_soon'
      ? 'bg-amber-500'
      : 'bg-emerald-500';

  return (
    <article
      onClick={selectable ? () => onToggleSelect?.(item.id) : undefined}
      className={`app-surface relative rounded-xl border p-4 shadow-xs transition-colors ${
        isSelected
          ? 'border-[var(--app-accent)] ring-1 ring-[var(--app-accent)]'
          : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
      } ${selectable ? 'cursor-pointer select-none' : ''}`}
    >
      {/* Top Header Row: Category, Status dot badge, Location, Overflow Menu */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
          {selectable && (
            <button
              type="button"
              aria-label={isSelected ? '取消選取' : '選取物品'}
              onClick={(event) => { event.stopPropagation(); onToggleSelect?.(item.id); }}
              className={`min-h-8 min-w-8 flex items-center justify-center rounded-md ${isSelected ? 'text-[var(--app-accent)]' : 'text-slate-400'}`}
            >
              <span className={`w-4 h-4 rounded border flex items-center justify-center ${isSelected ? 'app-primary border-transparent' : 'border-slate-300 dark:border-slate-600'}`}>
                {isSelected && <Check className="w-3 h-3" />}
              </span>
            </button>
          )}
          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[13px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700">
            {categoryMeta.label}
          </span>
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[13px] font-medium border ${statusInfo.badge}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${statusInfo.dot || 'bg-current'}`} />
            {statusInfo.text}
          </span>
          {item.location && (
            <span className="inline-flex items-center gap-1 text-[13px] text-slate-600 dark:text-slate-400">
              <MapPin className="h-3.5 w-3.5 text-slate-400" />
              <span>{item.location}</span>
            </span>
          )}
        </div>

        <div className="relative shrink-0">
          <button
            type="button"
            aria-label={`開啟 ${item.name} 的更多操作`}
            aria-expanded={showMenu}
            onClick={(event) => { event.stopPropagation(); setShowMenu((open) => !open); }}
            className="w-9 h-9 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <MoreVertical className="h-4 w-4" />
          </button>
          {showMenu && (
            <>
              <button aria-label="關閉選單" className="fixed inset-0 z-20 cursor-default" onClick={() => setShowMenu(false)} />
              <div
                className="absolute right-0 top-10 z-30 w-44 overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 py-1 shadow-lg popover-animate text-sm font-medium"
                style={{ '--transform-origin': 'top right' } as React.CSSProperties}
              >
                <button type="button" onClick={(event) => { event.stopPropagation(); setShowMenu(false); onEdit(item); }} className="flex min-h-10 w-full items-center gap-2.5 px-3.5 text-left text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"><Edit2 className="h-4 w-4 text-slate-500" />編輯內容</button>
                <button type="button" onClick={(event) => { event.stopPropagation(); setShowMenu(false); onViewHistory(item); }} className="flex min-h-10 w-full items-center gap-2.5 px-3.5 text-left text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"><History className="h-4 w-4 text-blue-500" />更換記錄</button>
                <div className="my-1 border-t border-slate-100 dark:border-slate-800" />
                <button type="button" onClick={(event) => { event.stopPropagation(); setShowMenu(false); void runAction(() => onDelete(item.id)); }} className="flex min-h-10 w-full items-center gap-2.5 px-3.5 text-left text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40"><Trash2 className="h-4 w-4" />刪除物品</button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Middle Row: Avatar & Title & Sub-metadata */}
      <div className="mt-3.5 flex items-start gap-3.5">
        <div className="w-13 h-13 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 p-1 flex items-center justify-center shrink-0 overflow-hidden">
          {item.imageUrl ? <img src={item.imageUrl} alt="" className="h-full w-full object-contain" loading="lazy" /> : <Package className="h-6 w-6 text-slate-400" />}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-[17px] font-semibold text-slate-900 dark:text-slate-100 leading-snug tracking-tight truncate">{item.name}</h3>
          <div className="text-[13.5px] text-slate-500 dark:text-slate-400 mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-0.5">
            {item.stockName && <span className="truncate">{item.stockName}</span>}
            {item.specModel && <span className="truncate">型號: {item.specModel}</span>}
            {item.price !== null && item.price !== undefined && <span className="tabular-nums">NT$ {item.price.toLocaleString()}</span>}
          </div>
        </div>
      </div>

      {/* Lifecycle Status: Clean Inline Row (NO NESTED CARDS!) */}
      {isStored ? (
        <div className="mt-3 flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-400">
          <Package className="h-4 w-4 shrink-0 text-slate-400" />
          <span>未拆封備品 · 開始使用後才會計算更換週期</span>
        </div>
      ) : (
        <div className="mt-3 space-y-1.5">
          <div className="flex items-center justify-between gap-2 text-sm text-slate-600 dark:text-slate-400">
            <span className="flex min-w-0 items-center gap-1.5 truncate tabular-nums font-medium">
              <Clock className="h-4 w-4 shrink-0 text-slate-400" />
              {dateOnly ? (item.trackingMode === 'warranty' ? '保固至' : '有效期限') : '下次處理'} · {item.nextDueDate}
            </span>
            {item.healthStatus === 'snoozed' && item.snoozeUntil && (
              <span className="flex shrink-0 items-center gap-1 text-blue-600 dark:text-blue-400 tabular-nums font-medium">
                <Moon className="h-3.5 w-3.5" />{item.snoozeUntil}
              </span>
            )}
          </div>
          {!dateOnly && (
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800" role="progressbar" aria-valuenow={item.percentageRemaining} aria-valuemin={0} aria-valuemax={100} aria-label={`${item.name} 週期剩餘比例`}>
              <div className={`h-full rounded-full transition-[width] duration-300 ease-out ${progressColor}`} style={{ width: `${item.percentageRemaining}%` }} />
            </div>
          )}
        </div>
      )}

      {/* Bottom Row: Minimalist Stock Stepper & Primary CTA */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 dark:border-slate-800/80 pt-3">
        {/* Stock Stepper */}
        <div className="flex items-center border border-slate-200 dark:border-slate-800 rounded-lg p-0.5 bg-slate-50/60 dark:bg-slate-800/40">
          <span className="text-[13px] text-slate-500 dark:text-slate-400 px-2.5 font-medium">備品</span>
          <button
            type="button"
            disabled={busy || item.backupStock <= 0}
            aria-label={`減少 ${item.name} 備品庫存`}
            onClick={(event) => { event.stopPropagation(); void runAction(() => onAdjustStock(item.id, -1)); }}
            className="w-8 h-8 rounded flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 disabled:opacity-30 active:scale-95 transition-all tactile-press"
          >
            <Minus className="h-3.5 w-3.5" />
          </button>
          <span className={`text-[15px] font-semibold tabular-nums min-w-6 text-center px-1 ${item.backupStock === 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-slate-100'}`}>
            {item.backupStock}
          </span>
          <button
            type="button"
            disabled={busy}
            aria-label={`增加 ${item.name} 備品庫存`}
            onClick={(event) => { event.stopPropagation(); void runAction(() => onAdjustStock(item.id, 1)); }}
            className="w-8 h-8 rounded flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 disabled:opacity-30 active:scale-95 transition-all tactile-press"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Action Button */}
        {isStored ? (
          <button
            type="button"
            disabled={busy}
            onClick={(event) => { event.stopPropagation(); if (onStartUsing) void runAction(() => onStartUsing(item.id), '已開始使用'); }}
            className="app-primary ui-button min-h-10 flex items-center gap-1.5 px-4 py-2 text-[14px] font-semibold rounded-lg shadow-xs disabled:opacity-60 tactile-press"
          >
            <Play className="h-4 w-4 fill-current" />
            <span>開始使用</span>
          </button>
        ) : dateOnly ? (
          <button
            type="button"
            onClick={(event) => { event.stopPropagation(); onEdit(item); }}
            className="app-control ui-button min-h-10 flex items-center gap-1.5 px-4 py-2 text-[14px] font-medium rounded-lg border border-slate-200 dark:border-slate-700 hover:border-slate-300 text-slate-700 dark:text-slate-300 tactile-press"
          >
            <Edit2 className="h-4 w-4 text-slate-400" />
            <span>編輯日期</span>
          </button>
        ) : (
          <div className="relative flex items-center gap-1.5">
            {(item.healthStatus === 'overdue' || item.healthStatus === 'due_soon') && onSnooze && (
              <div className="relative">
                <button
                  type="button"
                  disabled={busy}
                  onClick={(event) => { event.stopPropagation(); setShowSnoozeMenu((open) => !open); }}
                  className="app-control ui-button min-h-10 flex items-center gap-1 px-3 py-2 text-[14px] font-medium rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 tactile-press"
                >
                  <Moon className="h-4 w-4 text-slate-400" />
                  <span>稍後</span>
                </button>
                {showSnoozeMenu && (
                  <div
                    className="absolute bottom-11 right-0 z-30 w-32 overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 py-1 shadow-lg popover-animate text-sm font-medium"
                    style={{ '--transform-origin': 'bottom right' } as React.CSSProperties}
                  >
                    <button type="button" onClick={(event) => { event.stopPropagation(); setShowSnoozeMenu(false); void runAction(() => onSnooze(item.id, 3), '提醒已延後 3 天'); }} className="min-h-9 w-full px-3.5 text-left hover:bg-slate-100 dark:hover:bg-slate-800">延後 3 天</button>
                    <button type="button" onClick={(event) => { event.stopPropagation(); setShowSnoozeMenu(false); void runAction(() => onSnooze(item.id, 7), '提醒已延後 7 天'); }} className="min-h-9 w-full px-3.5 text-left hover:bg-slate-100 dark:hover:bg-slate-800">延後 7 天</button>
                  </div>
                )}
              </div>
            )}
            <button
              type="button"
              disabled={busy}
              onClick={(event) => { event.stopPropagation(); void runAction(() => onReplace(item.id), '耗材已完成更換'); }}
              className="app-primary ui-button min-h-10 flex items-center gap-1.5 px-4 py-2 text-[14px] font-semibold rounded-lg shadow-xs disabled:opacity-60 tactile-press"
            >
              <RotateCcw className={`h-4 w-4 ${busy ? 'animate-spin' : ''}`} />
              <span>今天已換</span>
            </button>
          </div>
        )}
      </div>

      {feedback && (
        <div role="status" className={`mt-2 flex items-center justify-end gap-1.5 text-sm font-medium transition-opacity duration-150 ${feedback.includes('失敗') ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
          {!feedback.includes('失敗') && <Check className="h-4 w-4 shrink-0" />}
          <span>{feedback}</span>
        </div>
      )}
    </article>
  );
};
