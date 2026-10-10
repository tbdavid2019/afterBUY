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
import { CategoryIcon } from './CategoryIcon.tsx';
import { ItemBrandBadge } from './ItemBrandBadge.tsx';
import { DEMO_ITEM_IDS } from '../utils/guestStorage.ts';
import { useSwipeGesture } from '../hooks/useSwipeGesture.ts';

interface ItemCardProps {
  item: ItemResponse;
  onReplace: (id: string) => void | Promise<void>;
  onAdjustStock: (id: string, delta: number) => void | Promise<void>;
  onEdit: (item: ItemResponse) => void;
  onDelete: (id: string) => boolean | Promise<boolean | void> | void;
  onViewHistory: (item: ItemResponse) => void;
  onStartUsing?: (id: string) => void | Promise<void>;
  onSnooze?: (id: string, days: number) => void | Promise<void>;
  onConsume?: (id: string, amount: number) => void | Promise<void>;
  selectable?: boolean;
  isSelected?: boolean;
  onToggleSelect?: (id: string) => void;
  viewMode?: 'grid' | 'list';
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
  onConsume,
  selectable,
  isSelected,
  onToggleSelect,
  viewMode = 'list',
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const [showSnoozeMenu, setShowSnoozeMenu] = useState(false);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const categoryMeta = CATEGORIES[item.category] || CATEGORIES.general;
  const statusInfo = formatRemainingDaysText(
    item.remainingDays,
    item.healthStatus,
    {
      remainingQuantity: item.remainingQuantity,
      quantityUnit: item.quantityUnit,
      daysUntilStart: item.daysUntilStart,
    }
  );
  const isStored = item.isStored || item.healthStatus === 'stored';
  const isQuantityMode = item.trackingMode === 'quantity';
  const dateOnly = item.trackingMode === 'expiry' || item.trackingMode === 'warranty';

  const runAction = async (action: () => any, successMessage?: string) => {
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

  const swipe = useSwipeGesture({
    disabled: Boolean(selectable || busy || showMenu || showSnoozeMenu),
    onSwipe(direction) {
      if (direction === 'left') setShowMenu(true);
      if (direction === 'right' && !isStored && !dateOnly) void runAction(() => onReplace(item.id));
    },
  });
  const swipeStyle = { touchAction: 'pan-y pinch-zoom', transform: swipe.offset ? `translateX(${swipe.offset}px)` : undefined };
  const swipeHint = swipe.offset !== 0 && <span className="absolute top-2 left-3 right-3 ui-meta text-[var(--app-accent-strong)] bg-[var(--app-surface)] rounded-lg px-2 py-1 pointer-events-none z-10">{swipe.offset < 0 ? '繼續左滑，更多操作' : (isStored || dateOnly ? '此物品不適用今天已換' : '繼續右滑，今天已換')}</span>;

  const progressColor = item.healthStatus === 'overdue'
    ? 'bg-rose-500'
    : item.healthStatus === 'due_soon'
      ? 'bg-amber-500'
      : 'bg-emerald-500';

  const frequencyTag = isQuantityMode
    ? '每日扣減'
    : item.trackingMode === 'cycle'
      ? `${item.cycleDays || 90} 天週期`
      : item.trackingMode === 'pao'
        ? `${item.paoMonths || 6} 月開封`
        : item.trackingMode === 'warranty'
          ? '原廠保固'
          : '有效期限';

  // -------------------------------------------------------------
  // GRID VIEW (2-Column Portrait Card with Hero Metric)
  // -------------------------------------------------------------
  if (viewMode === 'grid') {
    return (
      <article
        {...swipe.handlers}
        style={swipeStyle}
        data-swipe-surface="item"
        onClick={selectable ? () => onToggleSelect?.(item.id) : undefined}
        className={`relative rounded-2xl border p-3.5 sm:p-5 flex flex-col justify-between transition-all duration-200 ${
          isSelected
            ? 'bg-[var(--app-surface)] border-[var(--app-accent)] ring-2 ring-[var(--app-accent)]/30 shadow-md'
            : 'bg-white dark:bg-slate-900 border-slate-200/90 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-xs hover:shadow-md'
        } ${selectable ? 'cursor-pointer select-none' : ''}`}
      >
        {swipeHint}
        {/* Top: Thumbnail + Tag + More Menu */}
        <div className="flex items-start justify-between gap-2">
          <ItemBrandBadge
            name={item.name}
            category={item.category}
            imageUrl={item.imageUrl}
            specModel={item.specModel}
            size="lg"
          />

          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-200/80 dark:border-slate-700/80 truncate max-w-[90px]">
              {frequencyTag}
            </span>
            <div className="relative">
              <button
                type="button"
                aria-label={`更多操作`}
                onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <MoreVertical className="w-4 h-4" />
              </button>
              {showMenu && (
                <>
                  <button aria-label="關閉" className="fixed inset-0 z-20 cursor-default" onClick={() => setShowMenu(false)} />
                  <div className="absolute right-0 top-9 z-30 w-40 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 py-1.5 shadow-lg popover-animate text-sm font-medium">
                    <button type="button" onClick={(e) => { e.stopPropagation(); setShowMenu(false); onEdit(item); }} className="flex w-full items-center gap-2.5 px-3.5 py-2 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"><Edit2 className="w-4 h-4" />編輯內容</button>
                    <button type="button" onClick={(e) => { e.stopPropagation(); setShowMenu(false); onViewHistory(item); }} className="flex w-full items-center gap-2.5 px-3.5 py-2 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"><History className="w-4 h-4 text-blue-500" />更換記錄</button>
                    <button type="button" onClick={(e) => { e.stopPropagation(); setShowMenu(false); void runAction(() => onDelete(item.id)); }} className="flex w-full items-center gap-2.5 px-3.5 py-2 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40"><Trash2 className="w-4 h-4" />刪除物品</button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Item Title */}
        <div className="mt-3">
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 leading-snug tracking-tight line-clamp-1" title={item.name}>
            {item.name}
          </h3>
          {DEMO_ITEM_IDS.has(item.id) && <span className="ui-meta text-[var(--app-muted)]">示範</span>}
          {item.location && (
            <p className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 mt-1 truncate">
              <MapPin className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{item.location}</span>
            </p>
          )}
        </div>

        {/* HERO METRIC DISPLAY (Bold, readable Chinese metrics) */}
        <div className="mt-3.5 my-auto">
          {isStored ? (
            <div className="py-1">
              <span className="text-lg sm:text-xl font-black text-slate-700 dark:text-slate-300">
                未拆封
              </span>
              <p className="text-xs text-slate-400 mt-0.5 font-medium">拆封後開始計算</p>
            </div>
          ) : isQuantityMode ? (
            <div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-sm text-slate-500 font-semibold">現存</span>
                <span className="text-3xl sm:text-4xl font-black tabular-nums tracking-tight text-slate-900 dark:text-slate-100">
                  {item.remainingQuantity ?? 0}
                </span>
                <span className="text-sm text-slate-600 dark:text-slate-400 font-semibold">{item.quantityUnit || '顆'}</span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 mt-1 font-medium">
                約剩 <span className="font-bold tabular-nums text-slate-800 dark:text-slate-200">{item.remainingDays}</span> 天
              </p>
            </div>
          ) : dateOnly ? (
            <div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-sm text-slate-500 font-semibold">{item.trackingMode === 'warranty' ? '保固' : '到期'}</span>
                <span className="text-xl sm:text-2xl font-black tabular-nums tracking-tight text-slate-900 dark:text-slate-100">
                  {item.nextDueDate.slice(5)}
                </span>
              </div>
              <p className={`text-xs sm:text-sm font-bold mt-1 ${item.remainingDays < 0 ? 'text-rose-600' : item.remainingDays <= 30 ? 'text-amber-600' : 'text-slate-500'}`}>
                {item.remainingDays < 0 ? `已逾期 ${Math.abs(item.remainingDays)} 天` : `剩餘 ${item.remainingDays} 天`}
              </p>
            </div>
          ) : item.daysUntilStart && item.daysUntilStart > 0 ? (
            <div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-sm text-indigo-600 dark:text-indigo-400 font-semibold">距啟用</span>
                <span className="text-3xl sm:text-4xl font-black tabular-nums tracking-tight text-indigo-600 dark:text-indigo-400">
                  {item.daysUntilStart}
                </span>
                <span className="text-sm text-indigo-600 dark:text-indigo-400 font-semibold">天</span>
              </div>
              <p className="text-xs sm:text-sm font-semibold mt-1 text-slate-500 dark:text-slate-400 truncate">
                預計 {item.startDate.slice(5)} 開始啟用
              </p>
            </div>
          ) : (
            <div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-sm text-slate-500 font-semibold">已用</span>
                <span className="text-3xl sm:text-4xl font-black tabular-nums tracking-tight text-slate-900 dark:text-slate-100">
                  {item.elapsedDays ?? 0}
                </span>
                <span className="text-sm text-slate-600 dark:text-slate-400 font-semibold">天</span>
              </div>
              <p className={`text-xs sm:text-sm font-bold mt-1 ${
                item.healthStatus === 'overdue'
                  ? 'text-rose-600 dark:text-rose-400'
                  : item.healthStatus === 'due_soon'
                    ? 'text-amber-600 dark:text-amber-400'
                    : 'text-slate-500 dark:text-slate-400'
              }`}>
                {item.healthStatus === 'overdue'
                  ? `已逾期 ${Math.abs(item.remainingDays)} 天`
                  : `剩餘 ${item.remainingDays} 天`}
              </p>
            </div>
          )}

          {/* Slim Progress Bar */}
          {!dateOnly && !isStored && (
            <div className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              <div className={`h-full rounded-full transition-[width] duration-300 ${progressColor}`} style={{ width: `${item.percentageRemaining}%` }} />
            </div>
          )}
        </div>

        {/* Bottom: Stock Count & Quick Action */}
        <div className="mt-3.5 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
          <div className="flex flex-col text-xs text-slate-600 dark:text-slate-400 font-medium min-w-0">
            {item.activeUnits && item.activeUnits > 1 ? (
              <span className="text-[11px] font-bold text-[var(--app-accent-strong)] truncate">
                {item.activeUnits} {isQuantityMode ? (item.quantityUnit || '包') : '件'}使用中
              </span>
            ) : null}
            <div className="flex items-center text-sm">
              <span>備品:</span>
              <span className={`ml-1 text-base font-black tabular-nums ${item.backupStock === 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-slate-100'}`}>
                {item.backupStock}
              </span>
            </div>
          </div>

          {/* Action CTA */}
          {isStored ? (
            <button
              type="button"
              disabled={busy}
              onClick={(e) => { e.stopPropagation(); if (onStartUsing) void runAction(() => onStartUsing(item.id), '已開始使用'); }}
              className="app-primary px-3 py-1.5 text-xs sm:text-sm font-bold rounded-xl shadow-2xs tactile-press flex items-center gap-1.5"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>啟用</span>
            </button>
          ) : dateOnly ? (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onEdit(item); }}
              className="px-3 py-1.5 text-xs sm:text-sm font-bold rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 tactile-press"
            >
              編輯
            </button>
          ) : isQuantityMode ? (
            <button
              type="button"
              disabled={busy}
              onClick={(e) => {
                e.stopPropagation();
                void runAction(() => onReplace(item.id), '已開啟新備品');
              }}
              className="app-primary px-3 py-1.5 text-xs sm:text-sm font-bold rounded-xl shadow-2xs tactile-press flex items-center gap-1"
              title={item.activeUnits && item.activeUnits > 1 ? `目前 ${item.activeUnits} 在用。開啟 1 件新備品並扣減庫存` : '開新瓶：已用完，重設滿容量並扣減備品庫存'}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{item.activeUnits && item.activeUnits > 1 ? '開新備品' : '開新瓶'}</span>
            </button>
          ) : (
            <button
              type="button"
              disabled={busy}
              onClick={(e) => { e.stopPropagation(); void runAction(() => onReplace(item.id), '已更新更換！'); }}
              className="app-primary px-3 py-1.5 text-xs sm:text-sm font-bold rounded-xl shadow-2xs tactile-press flex items-center gap-1"
              title={item.activeUnits && item.activeUnits > 1 ? `目前 ${item.activeUnits} 件在用。換新 1 件並從備品扣 1` : '記錄更換'}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{item.activeUnits && item.activeUnits > 1 ? '換新 1 件' : '已換'}</span>
            </button>
          )}
        </div>
      </article>
    );
  }

  // -------------------------------------------------------------
  // LIST VIEW (1-Column Detailed Card)
  // -------------------------------------------------------------
  return (
    <article
      {...swipe.handlers}
      style={swipeStyle}
      data-swipe-surface="item"
      onClick={selectable ? () => onToggleSelect?.(item.id) : undefined}
      className={`relative rounded-2xl border p-4 sm:p-5 transition-all duration-200 ${
        isSelected
          ? 'bg-[var(--app-surface)] border-[var(--app-accent)] ring-2 ring-[var(--app-accent)]/30 shadow-md'
          : 'bg-white dark:bg-slate-900 border-slate-200/90 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-xs hover:shadow-md'
      } ${selectable ? 'cursor-pointer select-none' : ''}`}
    >
      {swipeHint}
      {/* Top Header Row: Category, Status dot badge, Location, Overflow Menu */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          {selectable && (
            <button
              type="button"
              aria-label={isSelected ? '取消選取' : '選取物品'}
              onClick={(event) => { event.stopPropagation(); onToggleSelect?.(item.id); }}
              className={`min-h-8 min-w-8 flex items-center justify-center rounded-lg ${isSelected ? 'text-[var(--app-accent)]' : 'text-slate-400'}`}
            >
              <span className={`w-4 h-4 rounded-md border flex items-center justify-center ${isSelected ? 'app-primary border-transparent' : 'border-slate-300 dark:border-slate-600'}`}>
                {isSelected && <Check className="w-3 h-3" />}
              </span>
            </button>
          )}
          <span className="inline-flex items-center px-3 py-1 rounded-lg text-xs sm:text-sm font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700/80">
            {categoryMeta.label}
          </span>
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs sm:text-sm font-bold border ${statusInfo.badge}`}>
            <span className={`h-2 w-2 rounded-full ${statusInfo.dot || 'bg-current'}`} />
            {statusInfo.text}
          </span>
          {item.location && (
            <span className="inline-flex items-center gap-1 text-sm font-medium text-slate-600 dark:text-slate-400">
              <MapPin className="h-4 w-4 text-slate-400" />
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
            className="w-9 h-9 flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <MoreVertical className="h-4.5 w-4.5" />
          </button>
          {showMenu && (
            <>
              <button aria-label="關閉選單" className="fixed inset-0 z-20 cursor-default" onClick={() => setShowMenu(false)} />
              <div
                className="absolute right-0 top-10 z-30 w-44 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 py-1.5 shadow-lg popover-animate text-sm font-medium"
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

      {/* Middle Row: Avatar & Title & Hero Metrics */}
      <div className="mt-3.5 flex items-start gap-3.5">
        <ItemBrandBadge
          name={item.name}
          category={item.category}
          imageUrl={item.imageUrl}
          specModel={item.specModel}
          size="lg"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 leading-snug tracking-tight truncate">{item.name}</h3>
            {!isStored && !dateOnly && (
              item.daysUntilStart && item.daysUntilStart > 0 ? (
                <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400 shrink-0">
                  距啟用 <span className="font-black tabular-nums">{item.daysUntilStart}</span> 天
                </span>
              ) : (
                <span className="text-sm font-bold text-slate-500 shrink-0">
                  已用 <span className="font-black tabular-nums text-slate-900 dark:text-slate-100">{item.elapsedDays}</span> 天
                </span>
              )
            )}
          </div>
          {DEMO_ITEM_IDS.has(item.id) && <span className="ui-meta text-[var(--app-muted)]">示範</span>}
          <div className="text-sm text-slate-500 dark:text-slate-400 mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 font-medium">
            {item.stockName && <span className="truncate">{item.stockName}</span>}
            {item.specModel && <span className="truncate">型號: {item.specModel}</span>}
            {isQuantityMode && (
              <span className="tabular-nums font-semibold text-emerald-600 dark:text-emerald-400">
                每日 {item.dailyUsage || 1} {item.quantityUnit || '顆'} · 每日自動倒數 · 單瓶 {item.initialQuantity || 60}
              </span>
            )}
            {item.price !== null && item.price !== undefined && <span className="tabular-nums font-semibold">NT$ {item.price.toLocaleString()}</span>}
          </div>
        </div>
      </div>

      {/* Lifecycle Status: Clean Inline Row */}
      {isStored ? (
        <div className="mt-3 flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 font-medium">
          <Package className="h-4.5 w-4.5 shrink-0 text-slate-400" />
          <span>未拆封備品 · 開始使用後才會計算更換週期</span>
        </div>
      ) : (
        <div className="mt-3 space-y-2">
          <div className="flex items-center justify-between gap-2 text-sm text-slate-600 dark:text-slate-400">
            <span className="flex min-w-0 items-center gap-1.5 truncate tabular-nums font-semibold">
              <Clock className="h-4 w-4 shrink-0 text-slate-400" />
              {dateOnly ? (item.trackingMode === 'warranty' ? '保固至' : '有效期限') : isQuantityMode ? '預計用盡日' : '下次處理'} · {item.nextDueDate}
            </span>
            {item.healthStatus === 'snoozed' && item.snoozeUntil && (
              <span className="flex shrink-0 items-center gap-1 text-blue-600 dark:text-blue-400 tabular-nums font-bold">
                <Moon className="h-4 w-4" />{item.snoozeUntil}
              </span>
            )}
          </div>
          {!dateOnly && (
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800" role="progressbar" aria-valuenow={item.percentageRemaining} aria-valuemin={0} aria-valuemax={100} aria-label={`${item.name} 週期剩餘比例`}>
              <div className={`h-full rounded-full transition-[width] duration-300 ease-out ${progressColor}`} style={{ width: `${item.percentageRemaining}%` }} />
            </div>
          )}
        </div>
      )}

      {/* Bottom Row: Minimalist Stock Stepper & Primary CTA */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 dark:border-slate-800/80 pt-3">
        {/* Stock Stepper & In-Use Badge */}
        <div className="flex items-center gap-2">
          {item.activeUnits && item.activeUnits > 1 ? (
            <div
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-[var(--app-accent-strong)]"
              title={`目前有 ${item.activeUnits} ${isQuantityMode ? (item.quantityUnit || '包') : '件'}在不同處同時使用中`}
            >
              <span>{item.activeUnits} {isQuantityMode ? (item.quantityUnit || '包') : '件'}使用中</span>
            </div>
          ) : null}
          <div className="flex items-center border border-slate-200 dark:border-slate-800 rounded-xl p-1 bg-slate-50/80 dark:bg-slate-800/50">
            <span className="text-sm text-slate-600 dark:text-slate-400 px-3 font-bold">備品</span>
          <button
            type="button"
            disabled={busy || item.backupStock <= 0}
            aria-label={`減少 ${item.name} 備品庫存`}
            onClick={(event) => { event.stopPropagation(); void runAction(() => onAdjustStock(item.id, -1)); }}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 disabled:opacity-30 active:scale-95 transition-all tactile-press touch-manipulation"
          >
            <Minus className="h-4 w-4" />
          </button>
          <span className={`text-base font-black tabular-nums min-w-8 text-center px-1.5 ${item.backupStock === 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-slate-100'}`}>
            {item.backupStock}
          </span>
          <button
            type="button"
            disabled={busy}
            aria-label={`增加 ${item.name} 備品庫存`}
            onClick={(event) => { event.stopPropagation(); void runAction(() => onAdjustStock(item.id, 1)); }}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 disabled:opacity-30 active:scale-95 transition-all tactile-press touch-manipulation"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>

        {/* Action Button */}
        {isStored ? (
          <button
            type="button"
            disabled={busy}
            onClick={(event) => { event.stopPropagation(); if (onStartUsing) void runAction(() => onStartUsing(item.id), '已開始使用'); }}
            className="app-primary ui-button min-h-11 flex items-center gap-1.5 px-4 py-2.5 text-sm sm:text-base font-bold rounded-xl shadow-xs disabled:opacity-60 active:scale-[0.98] transition-all tactile-press"
          >
            <Play className="h-4 w-4 fill-current" />
            <span>開始使用</span>
          </button>
        ) : dateOnly ? (
          <button
            type="button"
            onClick={(event) => { event.stopPropagation(); onEdit(item); }}
            className="app-control ui-button min-h-11 flex items-center gap-1.5 px-4 py-2.5 text-sm sm:text-base font-semibold rounded-xl border border-slate-200 dark:border-slate-700 hover:border-slate-300 text-slate-700 dark:text-slate-300 active:scale-[0.98] transition-all tactile-press"
          >
            <Edit2 className="h-4 w-4 text-slate-400" />
            <span>編輯日期</span>
          </button>
        ) : isQuantityMode ? (
          <div className="relative flex items-center gap-2">
            {(item.healthStatus === 'overdue' || item.healthStatus === 'due_soon') && onSnooze && (
              <div className="relative">
                <button
                  type="button"
                  disabled={busy}
                  onClick={(event) => { event.stopPropagation(); setShowSnoozeMenu((open) => !open); }}
                  className="app-control ui-button min-h-11 flex items-center gap-1 px-3 py-2.5 text-sm font-semibold rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 tactile-press"
                >
                  <Moon className="h-4 w-4 text-slate-400" />
                  <span>稍後</span>
                </button>
                {showSnoozeMenu && (
                  <div
                    className="absolute bottom-12 right-0 z-30 w-36 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 py-1.5 shadow-lg popover-animate text-sm font-medium"
                    style={{ '--transform-origin': 'bottom right' } as React.CSSProperties}
                  >
                    <button type="button" onClick={(event) => { event.stopPropagation(); setShowSnoozeMenu(false); void runAction(() => onSnooze(item.id, 3), '提醒已延後 3 天'); }} className="min-h-10 w-full px-3.5 text-left hover:bg-slate-100 dark:hover:bg-slate-800">延後 3 天</button>
                    <button type="button" onClick={(event) => { event.stopPropagation(); setShowSnoozeMenu(false); void runAction(() => onSnooze(item.id, 7), '提醒已延後 7 天'); }} className="min-h-10 w-full px-3.5 text-left hover:bg-slate-100 dark:hover:bg-slate-800">延後 7 天</button>
                  </div>
                )}
              </div>
            )}
            {(item.remainingQuantity ?? 1) > 0 ? (
              <>
                <button
                  type="button"
                  disabled={busy}
                  title="開新一瓶/包（扣減備品並重新裝滿）"
                  onClick={(event) => {
                    event.stopPropagation();
                    void runAction(() => onReplace(item.id), '已開啟新備品');
                  }}
                  className="app-primary ui-button min-h-11 flex items-center gap-1.5 px-4 py-2.5 text-sm sm:text-base font-bold rounded-xl shadow-xs disabled:opacity-60 active:scale-[0.98] transition-all tactile-press"
                >
                  <RotateCcw className={`h-4 w-4 ${busy ? 'animate-spin' : ''}`} />
                  <span>{item.activeUnits && item.activeUnits > 1 ? '開新備品' : '開新瓶'}</span>
                </button>
                {onConsume && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={(event) => {
                      event.stopPropagation();
                      void runAction(() => onConsume(item.id, item.dailyUsage || 1), `已手動扣減 ${item.dailyUsage || 1} ${item.quantityUnit || '顆'}`);
                    }}
                    className="app-control ui-button min-h-11 flex items-center gap-1 px-3 py-2 text-xs sm:text-sm font-semibold rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 tactile-press"
                    title="手動扣減（系統每日會自動隨時間扣減，免天天手動打卡）"
                  >
                    <span>-{item.dailyUsage || 1} {item.quantityUnit || '顆'}</span>
                  </button>
                )}
              </>
            ) : (
              <button
                type="button"
                disabled={busy}
                onClick={(event) => {
                  event.stopPropagation();
                  void runAction(() => onReplace(item.id), '已開啟新備品');
                }}
                className="app-primary ui-button min-h-11 flex items-center gap-1.5 px-4 py-2.5 text-sm sm:text-base font-bold rounded-xl shadow-xs disabled:opacity-60 active:scale-[0.98] transition-all tactile-press"
              >
                <RotateCcw className={`h-4 w-4 ${busy ? 'animate-spin' : ''}`} />
                <span>開啟新備品</span>
              </button>
            )}
          </div>
        ) : (
          <div className="relative flex items-center gap-2">
            {(item.healthStatus === 'overdue' || item.healthStatus === 'due_soon') && onSnooze && (
              <div className="relative">
                <button
                  type="button"
                  disabled={busy}
                  onClick={(event) => { event.stopPropagation(); setShowSnoozeMenu((open) => !open); }}
                  className="app-control ui-button min-h-11 flex items-center gap-1 px-3 py-2.5 text-sm font-semibold rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 tactile-press"
                >
                  <Moon className="h-4 w-4 text-slate-400" />
                  <span>稍後</span>
                </button>
                {showSnoozeMenu && (
                  <div
                    className="absolute bottom-12 right-0 z-30 w-36 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 py-1.5 shadow-lg popover-animate text-sm font-medium"
                    style={{ '--transform-origin': 'bottom right' } as React.CSSProperties}
                  >
                    <button type="button" onClick={(event) => { event.stopPropagation(); setShowMenu(false); void runAction(() => onSnooze(item.id, 3), '提醒已延後 3 天'); }} className="min-h-10 w-full px-3.5 text-left hover:bg-slate-100 dark:hover:bg-slate-800">延後 3 天</button>
                    <button type="button" onClick={(event) => { event.stopPropagation(); setShowMenu(false); void runAction(() => onSnooze(item.id, 7), '提醒已延後 7 天'); }} className="min-h-10 w-full px-3.5 text-left hover:bg-slate-100 dark:hover:bg-slate-800">延後 7 天</button>
                  </div>
                )}
              </div>
            )}
            <button
              type="button"
              disabled={busy}
              onClick={(event) => { event.stopPropagation(); void runAction(() => onReplace(item.id), '耗材已完成更換'); }}
              className="app-primary ui-button min-h-11 flex items-center gap-1.5 px-4 py-2.5 text-sm sm:text-base font-bold rounded-xl shadow-xs disabled:opacity-60 active:scale-[0.98] transition-all tactile-press"
              title={item.activeUnits && item.activeUnits > 1 ? `目前 ${item.activeUnits} 件在用。換新 1 件並從備品扣 1` : '耗材已完成更換'}
            >
              <RotateCcw className={`h-4 w-4 ${busy ? 'animate-spin' : ''}`} />
              <span>{item.activeUnits && item.activeUnits > 1 ? '換新 1 件' : '今天已換'}</span>
            </button>
          </div>
        )}
      </div>

      {feedback && (
        <div role="status" className={`mt-2.5 flex items-center justify-end gap-1.5 text-sm font-bold transition-opacity duration-150 ${feedback.includes('失敗') ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
          {!feedback.includes('失敗') && <Check className="h-4 w-4 shrink-0" />}
          <span>{feedback}</span>
        </div>
      )}
    </article>
  );
};
