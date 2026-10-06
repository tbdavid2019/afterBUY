import React, { useState, useMemo } from 'react';
import {
  Calendar as CalendarIcon,
  List as ListIcon,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Edit2,
  Clock,
  Moon,
  CheckCircle2,
  Package,
  Sparkles,
} from 'lucide-react';
import { ItemResponse } from '../../shared/types.ts';
import { CATEGORIES } from '../utils/category.ts';
import { formatRemainingDaysText } from '../../shared/lifecycle.ts';
import { businessDate, parseBusinessDate } from '../../shared/date.ts';
import { CategoryIcon } from '../components/CategoryIcon.tsx';
import { useTranslation } from '../i18n/index.tsx';

interface TimelineViewProps {
  items: ItemResponse[];
  onReplace: (id: string) => void | Promise<void>;
  onEdit: (item: ItemResponse) => void;
}

const WEEKDAYS_ZH = ['一', '二', '三', '四', '五', '六', '日'];
const WEEKDAYS_EN = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

export const TimelineView: React.FC<TimelineViewProps> = ({ items, onReplace, onEdit }) => {
  const { locale } = useTranslation();
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');

  const todayStr = useMemo(() => businessDate(new Date()), []);
  const todayMonthStr = useMemo(() => todayStr.slice(0, 7), [todayStr]);

  // Current displayed month: YYYY-MM
  const [currentMonth, setCurrentMonth] = useState<string>(todayMonthStr);

  // Selected date on the calendar: YYYY-MM-DD
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);

  // Filter out items that are purely stored in reserve and not in active countdown
  const activeScheduledItems = useMemo(() => {
    return items
      .filter((item) => !item.isStored && item.healthStatus !== 'stored')
      .sort((a, b) => {
        const aDate = a.healthStatus === 'snoozed' && a.snoozeUntil ? a.snoozeUntil : a.nextDueDate;
        const bDate = b.healthStatus === 'snoozed' && b.snoozeUntil ? b.snoozeUntil : b.nextDueDate;
        return aDate.localeCompare(bDate);
      });
  }, [items]);

  // Map of date string -> items due on that date
  const itemsByDate = useMemo(() => {
    const map = new Map<string, ItemResponse[]>();
    for (const item of activeScheduledItems) {
      const d = item.healthStatus === 'snoozed' && item.snoozeUntil ? item.snoozeUntil : item.nextDueDate;
      if (!d) continue;
      const list = map.get(d) || [];
      list.push(item);
      map.set(d, list);
    }
    return map;
  }, [activeScheduledItems]);

  // Items due in current selected month
  const itemsInCurrentMonth = useMemo(() => {
    return activeScheduledItems.filter((item) => {
      const d = item.healthStatus === 'snoozed' && item.snoozeUntil ? item.snoozeUntil : item.nextDueDate;
      return d && d.startsWith(currentMonth);
    });
  }, [activeScheduledItems, currentMonth]);

  // Total replacement cost estimated for current month
  const currentMonthEstimatedCost = useMemo(() => {
    return itemsInCurrentMonth.reduce((acc, curr) => acc + (curr.price || 0), 0);
  }, [itemsInCurrentMonth]);

  // Navigation handlers for month
  const handlePrevMonth = () => {
    const [y, m] = currentMonth.split('-').map(Number);
    const prev = new Date(Date.UTC(y, m - 2, 1));
    const nextStr = `${prev.getUTCFullYear()}-${String(prev.getUTCMonth() + 1).padStart(2, '0')}`;
    setCurrentMonth(nextStr);
  };

  const handleNextMonth = () => {
    const [y, m] = currentMonth.split('-').map(Number);
    const next = new Date(Date.UTC(y, m, 1));
    const nextStr = `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, '0')}`;
    setCurrentMonth(nextStr);
  };

  const handleGoToday = () => {
    setCurrentMonth(todayMonthStr);
    setSelectedDate(todayStr);
  };

  // Calendar matrix calculations
  const [yearNum, monthNum] = currentMonth.split('-').map(Number);
  const daysInMonth = useMemo(() => {
    return new Date(Date.UTC(yearNum, monthNum, 0)).getUTCDate();
  }, [yearNum, monthNum]);

  // Monday = 0, Sunday = 6
  const firstDayOfWeek = useMemo(() => {
    return (new Date(Date.UTC(yearNum, monthNum - 1, 1)).getUTCDay() + 6) % 7;
  }, [yearNum, monthNum]);

  // Today's day of week index (Monday = 0, Sunday = 6)
  const todayDayOfWeekIndex = useMemo(() => {
    const parsedToday = parseBusinessDate(todayStr);
    return (parsedToday.getUTCDay() + 6) % 7;
  }, [todayStr]);

  // Items for selected day
  const selectedDayItems = itemsByDate.get(selectedDate) || [];

  // Helper for status dot
  const getStatusColor = (item: ItemResponse) => {
    if (item.healthStatus === 'overdue') return 'bg-rose-500';
    if (item.healthStatus === 'due_soon') return 'bg-amber-500';
    if (item.healthStatus === 'snoozed') return 'bg-sky-500';
    if (item.trackingMode === 'warranty') return 'bg-blue-500';
    return 'bg-emerald-500';
  };

  const weekdays = locale === 'zh-TW' ? WEEKDAYS_ZH : WEEKDAYS_EN;

  return (
    <div className="space-y-4 pt-1 pb-10">
      {/* 1. Header with Mode Toggle & Month Selector */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/80 dark:border-slate-800 pb-3">
        {/* Left: View Mode Segmented Switch */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/60 w-fit">
          <button
            type="button"
            onClick={() => setViewMode('calendar')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all tactile-press ${
              viewMode === 'calendar'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <CalendarIcon className="w-4 h-4 text-[var(--app-accent)]" />
            <span>{locale === 'zh-TW' ? '月曆視圖' : 'Calendar'}</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('list')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all tactile-press ${
              viewMode === 'list'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <ListIcon className="w-4 h-4 text-[var(--app-accent)]" />
            <span>{locale === 'zh-TW' ? '時程清單' : 'List'}</span>
          </button>
        </div>

        {/* Right: Month Controls (Active in Calendar Mode) */}
        {viewMode === 'calendar' && (
          <div className="flex items-center gap-2">
            {currentMonth !== todayMonthStr && (
              <button
                type="button"
                onClick={handleGoToday}
                className="px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 tactile-press transition-colors"
              >
                {locale === 'zh-TW' ? '回今天' : 'Today'}
              </button>
            )}
            <div className="flex items-center border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 shadow-2xs">
              <button
                type="button"
                onClick={handlePrevMonth}
                aria-label={locale === 'zh-TW' ? '上個月' : 'Previous month'}
                className="w-8 h-8 flex items-center justify-center rounded-l-xl text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 tactile-press transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-3 text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                {locale === 'zh-TW' ? `${yearNum} 年 ${monthNum} 月` : `${currentMonth}`}
              </span>
              <button
                type="button"
                onClick={handleNextMonth}
                aria-label={locale === 'zh-TW' ? '下個月' : 'Next month'}
                className="w-8 h-8 flex items-center justify-center rounded-r-xl text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 tactile-press transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </header>

      {/* 2. CALENDAR VIEW CONTENT */}
      {viewMode === 'calendar' && (
        <div className="space-y-4">
          {/* Monthly Summary Bar & Legend */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-3.5 sm:p-4 shadow-xs">
            <div className="flex items-center gap-4">
              <div>
                <span className="text-xs text-slate-500 dark:text-slate-400 block font-medium">
                  {locale === 'zh-TW' ? '本月待更換' : 'Due this month'}
                </span>
                <span className="text-lg sm:text-xl font-black text-slate-900 dark:text-slate-100 tabular-nums">
                  {itemsInCurrentMonth.length}{' '}
                  <span className="text-xs font-normal text-slate-500">{locale === 'zh-TW' ? '件' : 'items'}</span>
                </span>
              </div>
              {currentMonthEstimatedCost > 0 && (
                <div className="border-l border-slate-200 dark:border-slate-800 pl-4">
                  <span className="text-xs text-slate-500 dark:text-slate-400 block font-medium">
                    {locale === 'zh-TW' ? '預估更換支出' : 'Monthly total'}
                  </span>
                  <span className="text-lg sm:text-xl font-black text-[var(--app-accent-strong)] tabular-nums">
                    NT$ {currentMonthEstimatedCost.toLocaleString()}
                  </span>
                </div>
              )}
            </div>

            {/* Status Indicator Legend */}
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400 font-medium">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-500" />
                {locale === 'zh-TW' ? '已過期' : 'Overdue'}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                {locale === 'zh-TW' ? '即將到期' : 'Due Soon'}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                {locale === 'zh-TW' ? '週期正常' : 'Cycle'}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                {locale === 'zh-TW' ? '保固/期限' : 'Warranty'}
              </span>
            </div>
          </div>

          {/* Calendar Month Matrix Container */}
          <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-2 sm:p-4 shadow-xs">
            {/* Weekday Row */}
            <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2">
              {weekdays.map((day, idx) => {
                const isTodayDOW = currentMonth === todayMonthStr && todayDayOfWeekIndex === idx;
                return (
                  <div
                    key={day}
                    className={`py-1 text-center text-xs font-bold rounded-lg transition-colors ${
                      isTodayDOW
                        ? 'bg-[var(--app-accent-soft)] text-[var(--app-accent-strong)] dark:bg-[var(--app-accent-strong)]/20'
                        : 'text-slate-400 dark:text-slate-500'
                    }`}
                  >
                    {day}
                  </div>
                );
              })}
            </div>

            {/* Day Cells Grid */}
            <div className="grid grid-cols-7 gap-1 sm:gap-2">
              {/* Empty leading offset days */}
              {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                <div key={`empty-${i}`} className="aspect-square min-h-[50px] sm:min-h-[64px] rounded-xl opacity-20 bg-slate-50 dark:bg-slate-900/40" />
              ))}

              {/* Days of the month */}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const dayDateStr = `${currentMonth}-${String(day).padStart(2, '0')}`;
                const dayItems = itemsByDate.get(dayDateStr) || [];
                const isToday = dayDateStr === todayStr;
                const isSelected = dayDateStr === selectedDate;
                const hasItems = dayItems.length > 0;
                const primaryItem = dayItems[0];

                return (
                  <button
                    key={dayDateStr}
                    type="button"
                    onClick={() => setSelectedDate(dayDateStr)}
                    className={`relative aspect-square min-h-[50px] sm:min-h-[64px] rounded-xl sm:rounded-2xl p-1 flex flex-col justify-between items-center transition-all tactile-press ${
                      isSelected
                        ? 'ring-2 ring-[var(--app-accent)] bg-white dark:bg-slate-850 shadow-md z-10'
                        : isToday
                          ? 'border-2 border-[var(--app-accent)] bg-[var(--app-accent-soft)]/30 dark:bg-[var(--app-accent-strong)]/10'
                          : hasItems
                            ? 'border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800'
                            : 'border border-slate-100 dark:border-slate-800/60 bg-transparent hover:bg-slate-50 dark:hover:bg-slate-850/60'
                    }`}
                  >
                    {/* Top: Item Indicator or Dot */}
                    <div className="w-full flex items-center justify-between px-0.5 min-h-[20px]">
                      {hasItems ? (
                        <div className="flex items-center gap-0.5">
                          <span className={`w-1.5 h-1.5 rounded-full ${getStatusColor(primaryItem)}`} />
                          {dayItems.length > 1 && (
                            <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 tabular-nums">
                              +{dayItems.length - 1}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span />
                      )}

                      {/* Day Number */}
                      <span
                        className={`text-[11px] sm:text-xs font-bold tabular-nums ${
                          isSelected
                            ? 'text-[var(--app-accent-strong)] font-black'
                            : isToday
                              ? 'text-[var(--app-accent)] font-extrabold'
                              : 'text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {day}
                      </span>
                    </div>

                    {/* Middle: Miniature Brand / Item Icon */}
                    {hasItems && (
                      <div className="my-auto flex items-center justify-center">
                        {primaryItem.imageUrl ? (
                          <img
                            src={primaryItem.imageUrl}
                            alt=""
                            className="w-5 h-5 sm:w-7 sm:h-7 object-contain drop-shadow-2xs"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-md bg-slate-200/80 dark:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300">
                            <CategoryIcon category={primaryItem.category} className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                          </div>
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Selected Day Detailed Inspector */}
          <section className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-[var(--app-accent)]" />
                <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                  {selectedDate}{' '}
                  {selectedDate === todayStr && (
                    <span className="ml-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-[var(--app-accent-soft)] text-[var(--app-accent-strong)]">
                      {locale === 'zh-TW' ? '今天' : 'Today'}
                    </span>
                  )}
                </h3>
              </div>
              <span className="text-xs text-slate-500 font-medium tabular-nums">
                {selectedDayItems.length}{' '}
                {locale === 'zh-TW' ? '項需處理' : 'items'}
              </span>
            </div>

            {selectedDayItems.length === 0 ? (
              <div className="py-6 text-center text-slate-400 dark:text-slate-500 text-xs sm:text-sm">
                <Sparkles className="w-6 h-6 mx-auto mb-1 text-slate-300 dark:text-slate-600" />
                <p>{locale === 'zh-TW' ? '本日生活安好，沒有需更換的排程耗材。' : 'No items scheduled for this day.'}</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {selectedDayItems.map((item) => {
                  const categoryMeta = CATEGORIES[item.category] || CATEGORIES.general;
                  const statusInfo = formatRemainingDaysText(
                    item.remainingDays,
                    item.healthStatus,
                    item.trackingMode === 'quantity'
                      ? { remainingQuantity: item.remainingQuantity, quantityUnit: item.quantityUnit }
                      : undefined
                  );
                  const isDateOnly = item.trackingMode === 'expiry' || item.trackingMode === 'warranty';

                  return (
                    <div
                      key={item.id}
                      className="flex items-center justify-between gap-3 p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 hover:bg-slate-50 dark:hover:bg-slate-850 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="w-10 h-10 rounded-xl border border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-800 p-1 flex items-center justify-center shrink-0">
                          {item.imageUrl ? (
                            <img src={item.imageUrl} alt="" className="h-full w-full object-contain" />
                          ) : (
                            <CategoryIcon category={item.category} className="w-5 h-5 text-slate-400" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">{item.name}</h4>
                          <div className="flex flex-wrap items-center gap-1.5 mt-0.5 text-xs text-slate-500">
                            <span>{categoryMeta.label}</span>
                            <span>·</span>
                            <span>備品 {item.backupStock}</span>
                            <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-semibold border ${statusInfo.badge}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${statusInfo.dot || 'bg-current'}`} />
                              {statusInfo.text}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {isDateOnly ? (
                          <button
                            type="button"
                            onClick={() => onEdit(item)}
                            className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 tactile-press"
                          >
                            <Edit2 className="w-3.5 h-3.5 inline mr-1" />
                            {locale === 'zh-TW' ? '編輯' : 'Edit'}
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => onReplace(item.id)}
                            className="app-primary px-3 py-1.5 rounded-lg text-xs font-semibold shadow-xs tactile-press flex items-center gap-1"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>{locale === 'zh-TW' ? '今天已換' : 'Replaced'}</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      )}

      {/* 4. LIST VIEW (CHRONOLOGICAL TIMELINE) */}
      {viewMode === 'list' && (
        <div>
          {activeScheduledItems.length === 0 ? (
            <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 text-center shadow-xs">
              <CalendarIcon className="mx-auto mb-2 h-8 w-8 text-[var(--app-accent-strong)]" />
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">目前沒有待排程項目</h3>
              <p className="text-xs text-slate-500 mx-auto mt-1 max-w-xs">
                所有物品都在正常週期內，或存放中尚未啟用。
              </p>
            </div>
          ) : (
            <div className="relative space-y-3 pl-6 before:absolute before:bottom-2 before:left-2.5 before:top-2 before:w-px before:bg-slate-200 dark:before:bg-slate-800">
              {activeScheduledItems.map((item) => {
                const category = CATEGORIES[item.category] || CATEGORIES.general;
                const statusInfo = formatRemainingDaysText(
                  item.remainingDays,
                  item.healthStatus,
                  item.trackingMode === 'quantity'
                    ? { remainingQuantity: item.remainingQuantity, quantityUnit: item.quantityUnit }
                    : undefined
                );
                const dateOnly = item.trackingMode === 'expiry' || item.trackingMode === 'warranty';
                const displayDate = item.healthStatus === 'snoozed' && item.snoozeUntil ? item.snoozeUntil : item.nextDueDate;
                const dateLabel =
                  item.healthStatus === 'snoozed'
                    ? '延後至'
                    : item.trackingMode === 'warranty'
                      ? '保固至'
                      : item.trackingMode === 'expiry'
                        ? '有效期限'
                        : item.trackingMode === 'quantity'
                          ? '預計用盡'
                          : '下次處理';

                return (
                  <article key={item.id} className="relative">
                    <div
                      className={`absolute -left-6 top-4 h-3 w-3 rounded-full border-2 border-white dark:border-slate-900 ${getStatusColor(item)}`}
                    />
                    <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xs flex items-center justify-between gap-3">
                      <button type="button" onClick={() => onEdit(item)} className="min-w-0 flex-1 text-left tactile-press">
                        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                          <span className="flex items-center gap-1 font-bold text-[var(--app-accent-strong)] tabular-nums">
                            <Clock className="h-3.5 w-3.5" />
                            {dateLabel} · {displayDate}
                          </span>
                          <span className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-semibold ${statusInfo.badge}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${statusInfo.dot || 'bg-current'}`} />
                            {statusInfo.text}
                          </span>
                        </div>
                        <h3 className="mt-1 text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 truncate">
                          {item.name}
                        </h3>
                        <p className="mt-0.5 text-xs text-slate-500 flex items-center gap-2">
                          <span>{category.label}</span>
                          <span>·</span>
                          <span>
                            備品 <span className="tabular-nums font-semibold">{item.backupStock}</span>
                          </span>
                          {item.healthStatus === 'snoozed' && (
                            <span className="inline-flex items-center gap-1 text-sky-500">
                              <Moon className="h-3 w-3" />
                              延後提醒
                            </span>
                          )}
                        </p>
                      </button>

                      {dateOnly ? (
                        <button
                          type="button"
                          onClick={() => onEdit(item)}
                          className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 tactile-press shrink-0"
                        >
                          <Edit2 className="h-3.5 w-3.5 inline mr-1 text-[var(--app-accent-strong)]" />
                          編輯
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onReplace(item.id)}
                          className="app-primary px-3.5 py-2 rounded-xl text-xs font-semibold shadow-xs tactile-press shrink-0 flex items-center gap-1.5"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                          <span>已換</span>
                        </button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
