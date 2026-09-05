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
  Sparkles,
  Moon,
  MapPin,
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
      setFeedback(error instanceof Error ? error.message : '操作失敗，請再試一次');
    } finally {
      setBusy(false);
      window.setTimeout(() => setFeedback(null), 2400);
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
      className={`app-surface relative rounded-2xl border p-4 shadow-sm transition-colors ${
        isSelected ? 'border-[var(--app-accent)] ring-2 ring-[var(--app-accent)]/30' : 'border-[var(--app-border)] hover:border-[var(--app-accent)]'
      } ${selectable ? 'cursor-pointer select-none' : ''}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
          {selectable && (
            <button
              type="button"
              aria-label={isSelected ? '取消選取' : '選取物品'}
              onClick={(event) => { event.stopPropagation(); onToggleSelect?.(item.id); }}
              className={`min-h-11 min-w-11 -ml-2 flex items-center justify-center rounded-xl ${isSelected ? 'text-[var(--app-accent-strong)]' : 'text-[var(--app-muted)]'}`}
            >
              <span className={`w-5 h-5 rounded-md border flex items-center justify-center ${isSelected ? 'app-primary border-transparent' : 'border-[var(--app-border)]'}`}>
                {isSelected && <Check className="w-3.5 h-3.5" />}
              </span>
            </button>
          )}
          <span className={`ui-badge rounded-full border px-2 py-0.5 ${categoryMeta.bg} ${categoryMeta.color}`}>
            {categoryMeta.label}
          </span>
          <span className={`ui-badge inline-flex items-center gap-1 rounded-full border px-2 py-0.5 ${statusInfo.badge}`}>
            <span className="h-1.5 w-1.5 rounded-full bg-current" />
            {statusInfo.text}
          </span>
          {item.location && (
            <span className="app-control ui-badge inline-flex items-center gap-1 rounded-full border px-2 py-0.5">
              <MapPin className="h-3 w-3 text-[var(--app-accent-strong)]" />{item.location}
            </span>
          )}
        </div>

        <div className="relative shrink-0">
          <button
            type="button"
            aria-label={`開啟 ${item.name} 的更多操作`}
            aria-expanded={showMenu}
            onClick={(event) => { event.stopPropagation(); setShowMenu((open) => !open); }}
            className="min-h-11 min-w-11 -mr-2 flex items-center justify-center rounded-xl text-[var(--app-muted)] hover:bg-[var(--app-surface-subtle)]"
          >
            <MoreVertical className="h-5 w-5" />
          </button>
          {showMenu && (
            <>
              <button aria-label="關閉選單" className="fixed inset-0 z-20 cursor-default" onClick={() => setShowMenu(false)} />
              <div className="ui-button absolute right-0 top-11 z-30 w-44 overflow-hidden rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] py-1 shadow-xl">
                <button type="button" onClick={(event) => { event.stopPropagation(); setShowMenu(false); onEdit(item); }} className="flex min-h-11 w-full items-center gap-2 px-3 text-left hover:bg-[var(--app-surface-subtle)]"><Edit2 className="h-4 w-4 text-[var(--app-accent-strong)]" />編輯內容</button>
                <button type="button" onClick={(event) => { event.stopPropagation(); setShowMenu(false); onViewHistory(item); }} className="flex min-h-11 w-full items-center gap-2 px-3 text-left hover:bg-[var(--app-surface-subtle)]"><History className="h-4 w-4 text-indigo-500" />更換記錄</button>
                <button type="button" onClick={(event) => { event.stopPropagation(); setShowMenu(false); void runAction(() => onDelete(item.id)); }} className="flex min-h-11 w-full items-center gap-2 px-3 text-left font-semibold text-rose-600 hover:bg-rose-500/10"><Trash2 className="h-4 w-4" />刪除物品</button>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="mt-2 flex items-center gap-3">
        <div className="app-surface-subtle flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-[var(--app-border)]">
          {item.imageUrl ? <img src={item.imageUrl} alt="" className="h-full w-full object-contain p-1.5" loading="lazy" /> : <Package className="h-6 w-6 text-[var(--app-muted)]" />}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="ui-item-title truncate tracking-tight text-[var(--app-text)]">{item.name}</h3>
          <div className="ui-meta mt-0.5 flex flex-wrap items-center gap-2 text-[var(--app-muted)]">
            {item.stockName && <span className="truncate">{item.stockIcon || '🏠'} {item.stockName}</span>}
            {item.specModel && <span className="truncate">{item.specModel}</span>}
            {item.price !== null && item.price !== undefined && <span className="tabular-nums">NT$ {item.price.toLocaleString()}</span>}
          </div>
        </div>
      </div>

      {isStored ? (
        <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-indigo-500/25 bg-indigo-500/10 p-3">
          <Package className="mt-0.5 h-5 w-5 shrink-0 text-indigo-500" />
          <div>
            <p className="ui-body font-semibold text-[var(--app-text)]">未拆封備品，尚未開始計時</p>
            <p className="ui-meta mt-0.5 text-[var(--app-muted)]">開始使用後才會計算更換週期。</p>
          </div>
        </div>
      ) : (
        <div className="mt-4">
          <div className="ui-meta flex items-center justify-between gap-2 text-[var(--app-muted)]">
            <span className="flex min-w-0 items-center gap-1.5 truncate tabular-nums"><Clock className="h-4 w-4 shrink-0" />{dateOnly ? (item.trackingMode === 'warranty' ? '保固至' : '有效期限') : '下次處理'} · {item.nextDueDate}</span>
            {item.healthStatus === 'snoozed' && item.snoozeUntil && <span className="flex shrink-0 items-center gap-1 text-[var(--app-accent-strong)] tabular-nums"><Moon className="h-3.5 w-3.5" />{item.snoozeUntil}</span>}
          </div>
          {!dateOnly && <div className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--app-surface-subtle)]" role="progressbar" aria-valuenow={item.percentageRemaining} aria-valuemin={0} aria-valuemax={100} aria-label={`${item.name} 週期剩餘比例`}><div className={`h-full rounded-full ${progressColor}`} style={{ width: `${item.percentageRemaining}%` }} /></div>}
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--app-border-subtle)] pt-3">
        <div className="app-surface-subtle flex min-h-11 items-center gap-1 rounded-xl border px-2">
          <Package className={`h-4 w-4 ${item.needsRestock ? 'text-amber-600' : 'text-[var(--app-muted)]'}`} />
          <span className="ui-meta text-[var(--app-muted)]">備品</span>
          <span className={`ui-body min-w-5 text-center font-semibold tabular-nums ${item.backupStock === 0 ? 'text-rose-600' : 'text-[var(--app-text)]'}`}>{item.backupStock}</span>
          <button type="button" disabled={busy || item.backupStock <= 0} aria-label={`減少 ${item.name} 備品庫存`} onClick={(event) => { event.stopPropagation(); void runAction(() => onAdjustStock(item.id, -1)); }} className="min-h-11 min-w-9 rounded-lg text-[var(--app-muted)] hover:bg-[var(--app-surface)] disabled:opacity-40 flex items-center justify-center transition-transform active:scale-90"><Minus className="mx-auto h-4 w-4" /></button>
          <button type="button" disabled={busy} aria-label={`增加 ${item.name} 備品庫存`} onClick={(event) => { event.stopPropagation(); void runAction(() => onAdjustStock(item.id, 1)); }} className="min-h-11 min-w-9 rounded-lg text-[var(--app-muted)] hover:bg-[var(--app-surface)] disabled:opacity-40 flex items-center justify-center transition-transform active:scale-90"><Plus className="mx-auto h-4 w-4" /></button>
        </div>

        {isStored ? (
          <button type="button" disabled={busy} onClick={(event) => { event.stopPropagation(); if (onStartUsing) void runAction(() => onStartUsing(item.id), '✨ 已開始使用！週期開始計時'); }} className="app-primary ui-button flex min-h-11 items-center gap-1.5 rounded-xl px-4 shadow-sm disabled:opacity-60 transition-transform active:scale-95"><Sparkles className="h-4 w-4" />開始使用</button>
        ) : dateOnly ? (
          <button type="button" onClick={(event) => { event.stopPropagation(); onEdit(item); }} className="app-control ui-button flex min-h-11 items-center gap-1.5 rounded-xl border px-4 hover:border-[var(--app-accent)] transition-transform active:scale-95"><Edit2 className="h-4 w-4 text-[var(--app-accent-strong)]" />編輯日期</button>
        ) : (
          <div className="relative flex items-center gap-2">
            {(item.healthStatus === 'overdue' || item.healthStatus === 'due_soon') && onSnooze && (
              <div className="relative">
                <button type="button" disabled={busy} onClick={(event) => { event.stopPropagation(); setShowSnoozeMenu((open) => !open); }} className="app-control ui-button flex min-h-11 items-center gap-1 rounded-xl border px-3 transition-transform active:scale-95"><Moon className="h-4 w-4 text-[var(--app-accent-strong)]" />稍後</button>
                {showSnoozeMenu && <div className="ui-meta absolute bottom-12 right-0 z-30 w-32 overflow-hidden rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] py-1 shadow-xl"><button type="button" onClick={(event) => { event.stopPropagation(); setShowSnoozeMenu(false); void runAction(() => onSnooze(item.id, 3), '提醒已延後 3 天'); }} className="min-h-11 w-full px-3 text-left hover:bg-[var(--app-surface-subtle)]">延後 3 天</button><button type="button" onClick={(event) => { event.stopPropagation(); setShowSnoozeMenu(false); void runAction(() => onSnooze(item.id, 7), '提醒已延後 7 天'); }} className="min-h-11 w-full px-3 text-left hover:bg-[var(--app-surface-subtle)]">延後 7 天</button></div>}
              </div>
            )}
            <button type="button" disabled={busy} onClick={(event) => { event.stopPropagation(); void runAction(() => onReplace(item.id), '🎉 耗材已更換！生活煥然一新'); }} className="app-primary ui-button flex min-h-11 items-center gap-1.5 rounded-xl px-3.5 shadow-sm disabled:opacity-60 transition-transform active:scale-95"><RotateCcw className={`h-4 w-4 ${busy ? 'animate-spin' : ''}`} />今天已換</button>
          </div>
        )}
      </div>
      {feedback && (
        <div role="status" className={`ui-meta mt-2.5 flex items-center justify-end gap-1.5 ${feedback.includes('失敗') ? 'text-rose-600' : 'text-emerald-600 dark:text-emerald-400 font-semibold animate-bounce-gentle'}`}>
          {!feedback.includes('失敗') && <Sparkles className="h-3.5 w-3.5 shrink-0" />}
          <span>{feedback}</span>
        </div>
      )}
    </article>
  );
};
