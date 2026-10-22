import React, { useState, useMemo, useRef } from 'react';
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
import { ItemResponse, ActiveUnitInstance } from '../../shared/types.ts';
import { CATEGORIES } from '../utils/category.ts';
import { formatRemainingDaysText } from '../../shared/lifecycle.ts';
import { CategoryIcon } from './CategoryIcon.tsx';
import { ItemBrandBadge } from './ItemBrandBadge.tsx';
import { CircularProgressRing } from './CircularProgressRing.tsx';
import { DEMO_ITEM_IDS } from '../utils/guestStorage.ts';
import { useSwipeGesture } from '../hooks/useSwipeGesture.ts';

interface ItemCardProps {
  item: ItemResponse;
  onReplace: (id: string, unitId?: string) => void | Promise<void>;
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
  isCompact?: boolean;
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
  isCompact = false,
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const [showSnoozeMenu, setShowSnoozeMenu] = useState(false);
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);
  const [expandedDetails, setExpandedDetails] = useState(false);
  const lastUnitContextMenu = useRef<{ id: string; at: number } | null>(null);
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

  const activeUnitsList: ActiveUnitInstance[] = useMemo(() => {
    if (Array.isArray(item.activeUnitsData)) return item.activeUnitsData;
    if (typeof item.activeUnitsData === 'string' && item.activeUnitsData.trim()) {
      try {
        const parsed = JSON.parse(item.activeUnitsData);
        if (Array.isArray(parsed)) return parsed;
      } catch {
        // ignore
      }
    }
    return [];
  }, [item.activeUnitsData]);

  const hasMultiUnits = activeUnitsList.length > 1;

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

  const renderActiveUnit = (unit: ActiveUnitInstance, compact = false) => {
    const remainingDays = unit.remainingDays ?? 0;
    const isOpen = selectedUnitId === unit.id;
    const remainingText = remainingDays < 0
      ? `已逾期 ${Math.abs(remainingDays)} 天`
      : remainingDays === 0 ? '今日該換' : `剩 ${remainingDays} 天`;
    const statusClass = remainingDays < 0
      ? 'text-rose-700 dark:text-rose-300'
      : remainingDays <= 7
        ? 'text-amber-700 dark:text-amber-300'
        : 'text-emerald-700 dark:text-emerald-300';

    return (
      <div key={unit.id} className="rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-subtle)]/70">
        <button
          type="button"
          disabled={busy}
          aria-expanded={isOpen}
          aria-label={`使用處 ${unit.label}，${remainingText}，查看換新操作`}
          onClick={(event) => {
            event.stopPropagation();
            if (lastUnitContextMenu.current?.id === unit.id && Date.now() - lastUnitContextMenu.current.at < 700) {
              lastUnitContextMenu.current = null;
              return;
            }
            setSelectedUnitId(isOpen ? null : unit.id);
          }}
          onContextMenu={(event) => {
            event.preventDefault();
            event.stopPropagation();
            lastUnitContextMenu.current = { id: unit.id, at: Date.now() };
            setSelectedUnitId(unit.id);
          }}
          className={`w-full min-h-14 text-left flex items-start gap-2.5 rounded-xl p-2.5 hover:bg-[var(--app-surface)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--app-accent)] disabled:opacity-60 ${compact ? 'sm:p-2' : ''}`}
        >
          <CircularProgressRing
            percentage={unit.percentageRemaining ?? 100}
            healthStatus={unit.healthStatus}
            size={compact ? 30 : 34}
            strokeWidth={3}
            showText={true}
            textClassName="text-[9px]"
            ariaLabel={`${unit.label} 剩餘比例`}
          />
          <span className="min-w-0 flex-1">
            <span className="flex items-start gap-1 text-sm font-bold text-slate-900 dark:text-slate-100">
              <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-500" />
              <span className="min-w-0 break-words">{unit.label}</span>
            </span>
            <span className="mt-1 block text-xs font-semibold">
              <span className={statusClass}>{remainingText}</span>
              <span className="text-slate-600 dark:text-slate-300"> · 已用 {unit.elapsedDays ?? 0} 天</span>
            </span>
            <span className="mt-0.5 block text-[11px] text-slate-500 dark:text-slate-400">{unit.startDate} 啟用</span>
          </span>
        </button>
        {isOpen && (
          <div className="flex items-center justify-end gap-2 px-2.5 pb-2.5">
            <button type="button" onClick={(event) => { event.stopPropagation(); setSelectedUnitId(null); }} className="min-h-10 px-3 text-xs font-semibold text-slate-600 dark:text-slate-300">取消</button>
            <button
              type="button"
              disabled={busy}
              onClick={(event) => {
                event.stopPropagation();
                setSelectedUnitId(null);
                void runAction(() => onReplace(item.id, unit.id), `已換新【${unit.label}】！備品扣減 1`);
              }}
              className="app-primary min-h-10 rounded-lg px-3 text-xs font-bold disabled:opacity-60"
            >
              確認換新此處
            </button>
          </div>
        )}
      </div>
    );
  };

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
            : 'bg-[var(--app-surface)] border-[var(--app-border)] hover:border-[var(--app-border)] shadow-xs hover:shadow-md'
        } ${selectable ? 'cursor-pointer select-none' : ''}`}
      >
        {swipeHint}
        {/* Top: Thumbnail + Tag + More Menu */}
        <div className="flex items-start justify-between gap-2">
          {!dateOnly && !isStored ? (
            <div className="relative inline-flex items-center justify-center shrink-0">
              <CircularProgressRing
                percentage={item.percentageRemaining ?? 100}
                healthStatus={item.healthStatus}
                size={54}
                strokeWidth={3}
                ariaLabel={`${item.name} 剩餘比例`}
              >
                <ItemBrandBadge
                  name={item.name}
                  category={item.category}
                  imageUrl={item.imageUrl}
                  specModel={item.specModel}
                  size="md"
                  shape="circle"
                />
              </CircularProgressRing>
              <span className="absolute -bottom-1 -right-1 px-1 py-0.2 rounded-md text-[9px] font-black bg-[var(--app-surface)] shadow-xs border border-[var(--app-border)] tabular-nums text-[var(--app-text)]">
                {item.percentageRemaining ?? 100}%
              </span>
            </div>
          ) : (
            <ItemBrandBadge
              name={item.name}
              category={item.category}
              imageUrl={item.imageUrl}
              specModel={item.specModel}
              size="lg"
            />
          )}

          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-[var(--app-text)] bg-[var(--app-surface-subtle)] px-2.5 py-1 rounded-lg border border-[var(--app-border)] truncate max-w-[90px]">
              {frequencyTag}
            </span>
            <div className="relative">
              <button
                type="button"
                aria-label={`更多操作`}
                onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-[var(--app-muted)] hover:text-[var(--app-text)] hover:bg-[var(--app-surface-subtle)]"
              >
                <MoreVertical className="w-4 h-4" />
              </button>
              {showMenu && (
                <>
                  <button aria-label="關閉" className="fixed inset-0 z-20 cursor-default" onClick={() => setShowMenu(false)} />
                  <div className="absolute right-0 top-9 z-30 w-40 overflow-hidden rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] py-1.5 shadow-lg popover-animate text-sm font-medium">
                    <button type="button" onClick={(e) => { e.stopPropagation(); setShowMenu(false); onEdit(item); }} className="flex w-full items-center gap-2.5 px-3.5 py-2 text-[var(--app-text)] hover:bg-[var(--app-surface-subtle)]"><Edit2 className="w-4 h-4" />編輯內容</button>
                    <button type="button" onClick={(e) => { e.stopPropagation(); setShowMenu(false); onViewHistory(item); }} className="flex w-full items-center gap-2.5 px-3.5 py-2 text-[var(--app-text)] hover:bg-[var(--app-surface-subtle)]"><History className="w-4 h-4 text-blue-500" />更換記錄</button>
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
            <p className="flex items-start gap-1 text-xs text-slate-500 dark:text-slate-400 mt-1">
              <MapPin className="w-3.5 h-3.5 shrink-0" />
              <span className="break-words">備品存放：{item.location}</span>
            </p>
          )}
        </div>

        {/* HERO METRIC DISPLAY (Bold, readable Chinese metrics) */}
        <div className="mt-3.5 my-auto">
          {isStored ? (
            <div className="py-1">
              <span className="text-lg sm:text-xl font-black text-[var(--app-text)]">
                未拆封
              </span>
              <p className="text-xs text-[var(--app-muted)] mt-0.5 font-medium">拆封後開始計算</p>
            </div>
          ) : isQuantityMode ? (
            <div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-sm text-[var(--app-muted)] font-semibold">現存</span>
                <span className="text-3xl sm:text-4xl font-black tabular-nums tracking-tight text-[var(--app-text)]">
                  {item.remainingQuantity ?? 0}
                </span>
                <span className="text-sm text-[var(--app-muted)] font-semibold">{item.quantityUnit || '顆'}</span>
              </div>
              <p className="text-xs sm:text-sm text-[var(--app-muted)] mt-1 font-medium">
                約剩 <span className="font-bold tabular-nums text-[var(--app-text)]">{item.remainingDays}</span> 天
              </p>
            </div>
          ) : dateOnly ? (
            <div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-sm text-[var(--app-muted)] font-semibold">{item.trackingMode === 'warranty' ? '保固' : '到期'}</span>
                <span className="text-xl sm:text-2xl font-black tabular-nums tracking-tight text-[var(--app-text)]">
                  {item.nextDueDate.slice(5)}
                </span>
              </div>
              <p className={`text-xs sm:text-sm font-bold mt-1 ${item.remainingDays < 0 ? 'text-rose-600' : item.remainingDays <= 30 ? 'text-[#A9471D] dark:text-amber-300' : 'text-[var(--app-muted)]'}`}>
                {item.remainingDays < 0 ? `已逾期 ${Math.abs(item.remainingDays)} 天` : `剩餘 ${item.remainingDays} 天`}
              </p>
            </div>
          ) : item.daysUntilStart && item.daysUntilStart > 0 ? (
            <div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-sm text-[#17324D] dark:text-[#FFD166] font-semibold">距啟用</span>
                <span className="text-3xl sm:text-4xl font-black tabular-nums tracking-tight text-[#17324D] dark:text-[#FFD166]">
                  {item.daysUntilStart}
                </span>
                <span className="text-sm text-[#17324D] dark:text-[#FFD166] font-semibold">天</span>
              </div>
              <p className="text-xs sm:text-sm font-semibold mt-1 text-[var(--app-muted)] truncate">
                預計 {item.startDate.slice(5)} 開始啟用
              </p>
            </div>
          ) : (
            <div>
              <div className="flex items-baseline justify-between gap-1.5">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-sm text-[var(--app-muted)] font-semibold">已用</span>
                  <span className="text-3xl sm:text-4xl font-black tabular-nums tracking-tight text-[var(--app-text)]">
                    {item.elapsedDays ?? 0}
                  </span>
                  <span className="text-sm text-[var(--app-muted)] font-semibold">天</span>
                </div>
                {!dateOnly && !isStored && (
                  <span className="text-xs font-bold text-[var(--app-muted)] tabular-nums">
                    {item.startDate.slice(5)} 啟用
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between gap-1 mt-1">
                <p className={`text-xs sm:text-sm font-bold ${
                  item.healthStatus === 'overdue'
                    ? 'text-rose-600 dark:text-rose-400'
                    : item.healthStatus === 'due_soon'
                      ? 'text-[#A9471D] dark:text-amber-300'
                      : 'text-[var(--app-muted)]'
                }`}>
                  {item.healthStatus === 'overdue'
                    ? `已逾期 ${Math.abs(item.remainingDays)} 天`
                    : `剩餘 ${item.remainingDays} 天`}
                </p>
                {!dateOnly && !isStored && (
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                    剩 {item.percentageRemaining ?? 100}%
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Slim Progress Bar */}
          {!dateOnly && !isStored && (
            <div className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-[var(--app-surface-subtle)] ring-1 ring-inset ring-[var(--app-border)]">
              <div className={`h-full rounded-full transition-[width] duration-300 ${progressColor}`} style={{ width: `${Math.max(0, Math.min(100, item.percentageRemaining ?? 100))}%` }} />
            </div>
          )}
        </div>

        {/* Multi-Unit List in Grid View */}
        {hasMultiUnits && !isStored && !dateOnly && (
          <div className="mt-3 pt-2.5 border-t border-[var(--app-border)] space-y-1.5">
            {isCompact && !expandedDetails ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setExpandedDetails(true);
                }}
                className="w-full flex items-center justify-between text-[11px] py-1 px-1.5 rounded-lg bg-[var(--app-surface-subtle)] text-[var(--app-muted)] hover:text-[var(--app-text)] font-semibold transition-colors"
              >
                <span className="truncate">
                  <strong className="text-[var(--app-accent-strong)]">{activeUnitsList.length} 處：</strong>
                  {activeUnitsList.map((u) => u.label).join('、')}
                </span>
                <span className="text-[10px] text-[var(--app-accent-strong)] shrink-0 ml-1">▼</span>
              </button>
            ) : (
              <>
                <div className="text-[11px] font-bold text-[var(--app-muted)] flex items-center justify-between">
                  <span>使用處 ({activeUnitsList.length})</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-[var(--app-muted)]">點選操作</span>
                    {isCompact && (
                      <button
                        type="button"
                        aria-label="收合明細"
                        onClick={(e) => {
                          e.stopPropagation();
                          setExpandedDetails(false);
                        }}
                        className="text-[10px] font-bold text-[var(--app-accent-strong)] px-1.5 py-0.5 rounded hover:underline"
                      >
                        收合 ▲
                      </button>
                    )}
                  </div>
                </div>
                {activeUnitsList.map((unit) => renderActiveUnit(unit, true))}
              </>
            )}
          </div>
        )}

        {/* Bottom: Stock Count & Quick Action */}
        <div className="mt-3.5 pt-3 border-t border-[var(--app-border)] flex items-center justify-between gap-2">
          <div className="flex flex-col text-xs text-[var(--app-muted)] font-medium min-w-0">
            <div className="flex items-center text-sm">
              <span>備品:</span>
              <span className={`ml-1 text-base font-black tabular-nums ${item.backupStock === 0 ? 'text-rose-600 dark:text-rose-400' : 'text-[var(--app-text)]'}`}>
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
              className="px-3 py-1.5 text-xs sm:text-sm font-bold rounded-xl border border-[var(--app-border)] text-[var(--app-text)] hover:bg-[var(--app-surface-subtle)] tactile-press"
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
              title={hasMultiUnits ? `目前 ${item.activeUnits} 處在用。可針對上方各處個別換新，或在此換新最急處` : '開新瓶：已用完，重設滿容量並扣減備品庫存'}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{hasMultiUnits ? '開新備品' : '開新瓶'}</span>
            </button>
          ) : (
            <button
              type="button"
              disabled={busy}
              onClick={(e) => { e.stopPropagation(); void runAction(() => onReplace(item.id), '已更新更換！'); }}
              className="app-primary px-3 py-1.5 text-xs sm:text-sm font-bold rounded-xl shadow-2xs tactile-press flex items-center gap-1"
              title={hasMultiUnits ? `目前 ${item.activeUnits} 處在用。可針對上方各處個別換新，或在此換新最急處` : '記錄更換'}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{hasMultiUnits ? '換新最急處' : '已換'}</span>
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
          : 'bg-[var(--app-surface)] border-[var(--app-border)] hover:border-[var(--app-border)] shadow-xs hover:shadow-md'
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
              className={`min-h-8 min-w-8 flex items-center justify-center rounded-lg ${isSelected ? 'text-[var(--app-accent-strong)]' : 'text-[var(--app-muted)]'}`}
            >
              <span className={`w-4 h-4 rounded-md border flex items-center justify-center ${isSelected ? 'app-primary border-transparent' : 'border-[var(--app-border)]'}`}>
                {isSelected && <Check className="w-3 h-3" />}
              </span>
            </button>
          )}
          <span className="inline-flex items-center px-3 py-1 rounded-lg text-xs sm:text-sm font-bold bg-[var(--app-surface-subtle)] text-[var(--app-text)] border border-[var(--app-border)]">
            {categoryMeta.label}
          </span>
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs sm:text-sm font-bold border ${statusInfo.badge}`}>
            <span className={`h-2 w-2 rounded-full ${statusInfo.dot || 'bg-current'}`} />
            {statusInfo.text}
          </span>
          {item.location && (
            <span className="inline-flex items-center gap-1 text-sm font-medium text-[var(--app-muted)]">
              <MapPin className="h-4 w-4 text-[var(--app-muted-low)]" />
              <span>備品存放：{item.location}</span>
            </span>
          )}
        </div>

        <div className="relative shrink-0">
          <button
            type="button"
            aria-label={`開啟 ${item.name} 的更多操作`}
            aria-expanded={showMenu}
            onClick={(event) => { event.stopPropagation(); setShowMenu((open) => !open); }}
            className="w-9 h-9 flex items-center justify-center rounded-xl text-[var(--app-muted)] hover:text-[var(--app-text)] hover:bg-[var(--app-surface-subtle)] transition-colors"
          >
            <MoreVertical className="h-4.5 w-4.5" />
          </button>
          {showMenu && (
            <>
              <button aria-label="關閉選單" className="fixed inset-0 z-20 cursor-default" onClick={() => setShowMenu(false)} />
              <div
                className="absolute right-0 top-10 z-30 w-44 overflow-hidden rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] py-1.5 shadow-lg popover-animate text-sm font-medium"
                style={{ '--transform-origin': 'top right' } as React.CSSProperties}
              >
                <button type="button" onClick={(event) => { event.stopPropagation(); setShowMenu(false); onEdit(item); }} className="flex min-h-10 w-full items-center gap-2.5 px-3.5 text-left text-[var(--app-text)] hover:bg-[var(--app-surface-subtle)]"><Edit2 className="h-4 w-4 text-[var(--app-muted)]" />編輯內容</button>
                <button type="button" onClick={(event) => { event.stopPropagation(); setShowMenu(false); onViewHistory(item); }} className="flex min-h-10 w-full items-center gap-2.5 px-3.5 text-left text-[var(--app-text)] hover:bg-[var(--app-surface-subtle)]"><History className="h-4 w-4 text-blue-500" />更換記錄</button>
                <div className="my-1 border-t border-[var(--app-border)]" />
                <button type="button" onClick={(event) => { event.stopPropagation(); setShowMenu(false); void runAction(() => onDelete(item.id)); }} className="flex min-h-10 w-full items-center gap-2.5 px-3.5 text-left text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40"><Trash2 className="h-4 w-4" />刪除物品</button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Middle Row: Avatar & Title & Hero Metrics */}
      <div className="mt-3.5 flex items-start gap-3.5">
        {!dateOnly && !isStored ? (
          <div className="relative inline-flex items-center justify-center shrink-0">
            <CircularProgressRing
              percentage={item.percentageRemaining ?? 100}
              healthStatus={item.healthStatus}
              size={54}
              strokeWidth={3}
              ariaLabel={`${item.name} 剩餘比例`}
            >
              <ItemBrandBadge
                name={item.name}
                category={item.category}
                imageUrl={item.imageUrl}
                specModel={item.specModel}
                size="md"
                shape="circle"
              />
            </CircularProgressRing>
            <span className="absolute -bottom-1 -right-1 px-1 py-0.2 rounded-md text-[9px] font-black bg-[var(--app-surface)] shadow-xs border border-[var(--app-border)] tabular-nums text-[var(--app-text)]">
              {item.percentageRemaining ?? 100}%
            </span>
          </div>
        ) : (
          <ItemBrandBadge
            name={item.name}
            category={item.category}
            imageUrl={item.imageUrl}
            specModel={item.specModel}
            size="lg"
          />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <h3 className="text-base sm:text-lg font-bold text-[var(--app-text)] leading-snug tracking-tight truncate">{item.name}</h3>
            {!isStored && !dateOnly && (
              item.daysUntilStart && item.daysUntilStart > 0 ? (
                <div className="text-right shrink-0">
                  <span className="text-sm font-bold text-[#17324D] dark:text-[#FFD166]">
                    距啟用 <span className="font-black tabular-nums">{item.daysUntilStart}</span> 天
                  </span>
                  <div className="text-[11px] text-[var(--app-muted)] font-medium tabular-nums">
                    {item.startDate} 啟用
                  </div>
                </div>
              ) : (
                <div className="text-right shrink-0">
                  <span className="text-sm font-bold text-[var(--app-muted)]">
                    已用 <span className="font-black tabular-nums text-[var(--app-text)]">{item.elapsedDays}</span> 天
                  </span>
                  <div className="text-[11px] text-[var(--app-muted)] font-medium tabular-nums">
                    {item.startDate} 啟用
                  </div>
                </div>
              )
            )}
          </div>
          {DEMO_ITEM_IDS.has(item.id) && <span className="ui-meta text-[var(--app-muted)]">示範</span>}
          <div className="text-sm text-[var(--app-muted)] mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 font-medium">
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
        <div className="mt-3 flex items-center gap-2 text-sm text-[var(--app-muted)] font-medium">
          <Package className="h-4.5 w-4.5 shrink-0 text-[var(--app-muted-low)]" />
          <span>未拆封備品 · 開始使用後才會計算更換週期</span>
        </div>
      ) : isCompact && !expandedDetails ? (
        <div className="mt-2 flex items-center justify-between gap-2 text-xs text-[var(--app-muted)]">
          <span className="flex items-center gap-1.5 font-semibold truncate min-w-0">
            <Clock className="h-3.5 w-3.5 shrink-0 text-[var(--app-muted)]" />
            <span className="truncate">{dateOnly ? (item.trackingMode === 'warranty' ? '保固至' : '有效期限') : isQuantityMode ? '預計用盡日' : '下次更換'} · <strong className="text-[var(--app-text)] tabular-nums">{item.nextDueDate}</strong></span>
            {item.healthStatus === 'snoozed' && item.snoozeUntil && (
              <span className="text-[#17324D] dark:text-sky-300 font-bold shrink-0">(延至 {item.snoozeUntil})</span>
            )}
          </span>
          {!hasMultiUnits && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setExpandedDetails(true);
              }}
              className="text-[11px] text-[var(--app-accent-strong)] font-bold shrink-0 hover:underline"
            >
              詳細 ▼
            </button>
          )}
        </div>
      ) : (
        <div className="mt-3 p-3 rounded-2xl bg-[var(--app-surface-subtle)]/70 border border-[var(--app-border)] flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex items-center justify-between gap-1.5 text-xs sm:text-sm text-[var(--app-text)] font-semibold">
              <span className="flex items-center gap-1.5 truncate">
                <Clock className="h-4 w-4 shrink-0 text-[var(--app-muted)]" />
                <span>{dateOnly ? (item.trackingMode === 'warranty' ? '保固至' : '有效期限') : isQuantityMode ? '預計用盡日' : '下次更換'} · {item.nextDueDate}</span>
              </span>
              {isCompact && !hasMultiUnits && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setExpandedDetails(false);
                  }}
                  className="text-[11px] text-[var(--app-accent-strong)] font-bold shrink-0 hover:underline"
                >
                  收合 ▲
                </button>
              )}
            </div>
            {!dateOnly && (
              <div className="text-xs font-medium text-[var(--app-muted)] flex flex-wrap items-center gap-x-2 gap-y-0.5 tabular-nums">
                <span>
                  已耗用 <strong className="text-[var(--app-text)]">{100 - (item.percentageRemaining ?? 100)}%</strong>
                  {isQuantityMode && item.initialQuantity && (
                    <span className="text-[11px] text-[var(--app-muted)] ml-0.5">
                      (約 {Math.max(0, Math.round((Number(item.initialQuantity) - Number(item.remainingQuantity ?? item.initialQuantity)) * 10) / 10)} {item.quantityUnit || '顆'})
                    </span>
                  )}
                </span>
                <span>·</span>
                <span>
                  剩餘 <strong className="text-emerald-600 dark:text-emerald-400">{item.percentageRemaining ?? 100}%</strong>
                  {isQuantityMode && item.remainingQuantity !== undefined && item.remainingQuantity !== null && (
                    <span className="text-[11px] text-emerald-600/80 dark:text-emerald-400/80 ml-0.5">
                      ({item.remainingQuantity} {item.quantityUnit || '顆'})
                    </span>
                  )}
                </span>
              </div>
            )}
            {item.healthStatus === 'snoozed' && item.snoozeUntil && (
              <div className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 font-bold">
                <Moon className="h-3.5 w-3.5" />延後至 {item.snoozeUntil}
              </div>
            )}
          </div>

          {!dateOnly && (
            <CircularProgressRing
              percentage={item.percentageRemaining ?? 100}
              healthStatus={item.healthStatus}
              size={44}
              strokeWidth={3.8}
              showText={true}
              textClassName="text-[11px]"
              ariaLabel={`${item.name} 剩餘比例`}
            />
          )}
        </div>
      )}

      {/* Multi-Unit Concurrent In-Use Breakdown (List View) */}
      {hasMultiUnits && !isStored && !dateOnly && (
        <div className="mt-2.5 pt-2.5 border-t border-[var(--app-border)] space-y-2">
          {isCompact && !expandedDetails ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setExpandedDetails(true);
              }}
              className="w-full flex items-center justify-between text-xs py-1.5 px-2.5 rounded-lg bg-[var(--app-surface-subtle)] text-[var(--app-muted)] hover:text-[var(--app-text)] font-semibold transition-colors"
            >
              <span className="truncate">
                <strong className="text-[var(--app-accent-strong)]">{activeUnitsList.length} 處在用：</strong>
                {activeUnitsList.map((u) => u.label).join('、')}
              </span>
              <span className="text-[11px] text-[var(--app-accent-strong)] shrink-0 ml-1.5 flex items-center gap-0.5 font-bold">
                展開明細 ▼
              </span>
            </button>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-1">
                <span className="text-xs font-bold text-[var(--app-text)] flex items-center gap-1.5">
                  <span>現役多處耗用明細</span>
                  <span className="px-1.5 py-0.5 rounded-md bg-[var(--app-surface-subtle)] text-[var(--app-accent-strong)] text-[11px] font-extrabold">
                    {activeUnitsList.length} 處在用
                  </span>
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-[var(--app-muted)] font-medium">點選使用處查看操作</span>
                  {isCompact && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setExpandedDetails(false);
                      }}
                      className="text-[11px] font-bold text-[var(--app-accent-strong)] hover:underline"
                    >
                      收合明細 ▲
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {activeUnitsList.map((unit) => renderActiveUnit(unit))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Bottom Row: Minimalist Stock Stepper & Primary CTA */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-[var(--app-border)] pt-3">
        {/* Stock Stepper */}
        <div className="flex items-center gap-2">
          <div className="flex items-center border border-[var(--app-border)] rounded-xl p-1 bg-[var(--app-surface-subtle)]/80">
            <span className="text-sm text-[var(--app-text)] px-3 font-bold">備品</span>
          <button
            type="button"
            disabled={busy || item.backupStock <= 0}
            aria-label={`減少 ${item.name} 備品庫存`}
            onClick={(event) => { event.stopPropagation(); void runAction(() => onAdjustStock(item.id, -1)); }}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--app-text)] hover:bg-[var(--app-surface)] disabled:opacity-30 active:scale-95 transition-all tactile-press touch-manipulation"
          >
            <Minus className="h-4 w-4" />
          </button>
          <span className={`text-base font-black tabular-nums min-w-8 text-center px-1.5 ${item.backupStock === 0 ? 'text-rose-600 dark:text-rose-400' : 'text-[var(--app-text)]'}`}>
            {item.backupStock}
          </span>
          <button
            type="button"
            disabled={busy}
            aria-label={`增加 ${item.name} 備品庫存`}
            onClick={(event) => { event.stopPropagation(); void runAction(() => onAdjustStock(item.id, 1)); }}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--app-text)] hover:bg-[var(--app-surface)] disabled:opacity-30 active:scale-95 transition-all tactile-press touch-manipulation"
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
            className="app-control ui-button min-h-11 flex items-center gap-1.5 px-4 py-2.5 text-sm sm:text-base font-semibold rounded-xl border border-[var(--app-border)] hover:border-[var(--app-border)] text-[var(--app-text)] active:scale-[0.98] transition-all tactile-press"
          >
            <Edit2 className="h-4 w-4 text-[var(--app-muted)]" />
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
                  className="app-control ui-button min-h-11 flex items-center gap-1 px-3 py-2.5 text-sm font-semibold rounded-xl border border-[var(--app-border)] hover:bg-[var(--app-surface-subtle)] text-[var(--app-text)] tactile-press"
                >
                  <Moon className="h-4 w-4 text-[var(--app-muted)]" />
                  <span>稍後</span>
                </button>
                {showSnoozeMenu && (
                  <div
                    className="absolute bottom-12 right-0 z-30 w-36 overflow-hidden rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] py-1.5 shadow-lg popover-animate text-sm font-medium"
                    style={{ '--transform-origin': 'bottom right' } as React.CSSProperties}
                  >
                    <button type="button" onClick={(event) => { event.stopPropagation(); setShowSnoozeMenu(false); void runAction(() => onSnooze(item.id, 3), '提醒已延後 3 天'); }} className="min-h-10 w-full px-3.5 text-left text-[var(--app-text)] hover:bg-[var(--app-surface-subtle)]">延後 3 天</button>
                    <button type="button" onClick={(event) => { event.stopPropagation(); setShowSnoozeMenu(false); void runAction(() => onSnooze(item.id, 7), '提醒已延後 7 天'); }} className="min-h-10 w-full px-3.5 text-left text-[var(--app-text)] hover:bg-[var(--app-surface-subtle)]">延後 7 天</button>
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
                  <span>{hasMultiUnits ? '開新備品' : '開新瓶'}</span>
                </button>
                {onConsume && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={(event) => {
                      event.stopPropagation();
                      void runAction(() => onConsume(item.id, item.dailyUsage || 1), `已手動扣減 ${item.dailyUsage || 1} ${item.quantityUnit || '顆'}`);
                    }}
                    className="app-control ui-button min-h-11 flex items-center gap-1 px-3 py-2 text-xs sm:text-sm font-semibold rounded-xl border border-[var(--app-border)] hover:bg-[var(--app-surface-subtle)] text-[var(--app-text)] tactile-press"
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
                  className="app-control ui-button min-h-11 flex items-center gap-1 px-3 py-2.5 text-sm font-semibold rounded-xl border border-[var(--app-border)] hover:bg-[var(--app-surface-subtle)] text-[var(--app-text)] tactile-press"
                >
                  <Moon className="h-4 w-4 text-[var(--app-muted)]" />
                  <span>稍後</span>
                </button>
                {showSnoozeMenu && (
                  <div
                    className="absolute bottom-12 right-0 z-30 w-36 overflow-hidden rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] py-1.5 shadow-lg popover-animate text-sm font-medium"
                    style={{ '--transform-origin': 'bottom right' } as React.CSSProperties}
                  >
                    <button type="button" onClick={(event) => { event.stopPropagation(); setShowMenu(false); void runAction(() => onSnooze(item.id, 3), '提醒已延後 3 天'); }} className="min-h-10 w-full px-3.5 text-left text-[var(--app-text)] hover:bg-[var(--app-surface-subtle)]">延後 3 天</button>
                    <button type="button" onClick={(event) => { event.stopPropagation(); setShowMenu(false); void runAction(() => onSnooze(item.id, 7), '提醒已延後 7 天'); }} className="min-h-10 w-full px-3.5 text-left text-[var(--app-text)] hover:bg-[var(--app-surface-subtle)]">延後 7 天</button>
                  </div>
                )}
              </div>
            )}
            <button
              type="button"
              disabled={busy}
              onClick={(event) => { event.stopPropagation(); void runAction(() => onReplace(item.id), '耗材已完成更換'); }}
              className="app-primary ui-button min-h-11 flex items-center gap-1.5 px-4 py-2.5 text-sm sm:text-base font-bold rounded-xl shadow-xs disabled:opacity-60 active:scale-[0.98] transition-all tactile-press"
              title={hasMultiUnits ? `目前 ${item.activeUnits} 處在用。可針對上方各處個別換新，或在此換新最急處` : '耗材已完成更換'}
            >
              <RotateCcw className={`h-4 w-4 ${busy ? 'animate-spin' : ''}`} />
              <span>{hasMultiUnits ? '換新最急處' : '今天已換'}</span>
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
