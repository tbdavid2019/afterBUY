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
  Sparkles,
  ShoppingBag,
  Filter,
} from 'lucide-react';
import { ItemResponse } from '../../shared/types.ts';
import { CATEGORIES } from '../utils/category.ts';
import { formatRemainingDaysText } from '../../shared/lifecycle.ts';
import { businessDate, parseBusinessDate } from '../../shared/date.ts';
import { CategoryIcon } from '../components/CategoryIcon.tsx';
import { ItemBrandBadge } from '../components/ItemBrandBadge.tsx';
import { useTranslation } from '../i18n/index.tsx';

export type TimelineEventType = 'due' | 'start';

export interface TimelineEvent {
  id: string;
  type: TimelineEventType;
  date: string; // YYYY-MM-DD
  item: ItemResponse;
}

interface TimelineViewProps {
  items: ItemResponse[];
  onReplace: (id: string, unitId?: string) => void | Promise<void>;
  onEdit: (item: ItemResponse) => void;
}

const WEEKDAYS_ZH = ['週一', '週二', '週三', '週四', '週五', '週六', '週日'];
const WEEKDAYS_EN = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

export const TimelineView: React.FC<TimelineViewProps> = ({ items, onReplace, onEdit }) => {
  const { locale } = useTranslation();
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');
  const [filterMode, setFilterMode] = useState<'all' | 'due' | 'start'>('all');

  const todayStr = useMemo(() => businessDate(new Date()), []);
  const todayMonthStr = useMemo(() => todayStr.slice(0, 7), [todayStr]);

  // Current displayed month: YYYY-MM
  const [currentMonth, setCurrentMonth] = useState<string>(todayMonthStr);

  // Selected date on the calendar: YYYY-MM-DD
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);

  // Unified timeline events (both purchase/start dates and due dates)
  const allEvents = useMemo(() => {
    const list: TimelineEvent[] = [];

    for (const item of items) {
      // 1. Purchase / Activation milestone (startDate)
      if (item.startDate) {
        list.push({
          id: `${item.id}-start`,
          type: 'start',
          date: item.startDate,
          item,
        });
      }

      // 2. Due / Replacement milestone (only for active non-stored items)
      if (!item.isStored && item.healthStatus !== 'stored') {
        const dueDate = item.healthStatus === 'snoozed' && item.snoozeUntil ? item.snoozeUntil : item.nextDueDate;
        if (dueDate) {
          list.push({
            id: `${item.id}-due`,
            type: 'due',
            date: dueDate,
            item,
          });
        }
      }
    }

    // Sort chronologically: earliest date first
    return list.sort((a, b) => a.date.localeCompare(b.date));
  }, [items]);

  // Events filtered by user preference ('all' | 'due' | 'start')
  const filteredEvents = useMemo(() => {
    if (filterMode === 'due') return allEvents.filter((e) => e.type === 'due');
    if (filterMode === 'start') return allEvents.filter((e) => e.type === 'start');
    return allEvents;
  }, [allEvents, filterMode]);

  // Map of date string -> events on that date matching filterMode
  const eventsByDate = useMemo(() => {
    const map = new Map<string, TimelineEvent[]>();
    for (const ev of filteredEvents) {
      const list = map.get(ev.date) || [];
      list.push(ev);
      map.set(ev.date, list);
    }
    return map;
  }, [filteredEvents]);

  // Map of all events by date (unfiltered, for inspector fallback)
  const allEventsByDate = useMemo(() => {
    const map = new Map<string, TimelineEvent[]>();
    for (const ev of allEvents) {
      const list = map.get(ev.date) || [];
      list.push(ev);
      map.set(ev.date, list);
    }
    return map;
  }, [allEvents]);

  // Current month's due events (independent of filterMode for summary stats)
  const dueEventsInCurrentMonth = useMemo(() => {
    return allEvents.filter((e) => e.type === 'due' && e.date.startsWith(currentMonth));
  }, [allEvents, currentMonth]);

  // Current month's purchase / start events
  const startEventsInCurrentMonth = useMemo(() => {
    return allEvents.filter((e) => e.type === 'start' && e.date.startsWith(currentMonth));
  }, [allEvents, currentMonth]);

  // Current month's total events
  const totalEventsInCurrentMonth = useMemo(() => {
    return allEvents.filter((e) => e.date.startsWith(currentMonth));
  }, [allEvents, currentMonth]);

  // Total replacement cost estimated for current month
  const currentMonthEstimatedDueCost = useMemo(() => {
    return dueEventsInCurrentMonth.reduce((acc, curr) => acc + (curr.item.price || 0), 0);
  }, [dueEventsInCurrentMonth]);

  // Total purchase expenditure for current month
  const currentMonthPurchaseCost = useMemo(() => {
    return startEventsInCurrentMonth.reduce((acc, curr) => acc + (curr.item.price || 0), 0);
  }, [startEventsInCurrentMonth]);

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

  // Events for selected day (respects filterMode, or falls back to all events if filtered is empty)
  const selectedDayFilteredEvents = eventsByDate.get(selectedDate) || [];
  const selectedDayAllEvents = allEventsByDate.get(selectedDate) || [];
  const selectedDayEvents = selectedDayFilteredEvents.length > 0 ? selectedDayFilteredEvents : (filterMode === 'all' ? [] : selectedDayAllEvents);

  // Helper for status dot
  const getStatusColor = (item: ItemResponse) => {
    if (item.healthStatus === 'overdue') return 'bg-rose-500';
    if (item.healthStatus === 'due_soon') return 'bg-amber-500';
    if (item.healthStatus === 'snoozed') return 'bg-sky-500';
    if (item.trackingMode === 'warranty') return 'bg-blue-500';
    return 'bg-emerald-500';
  };

  // Helper for dot color on an event (purchase vs due)
  const getEventDotColor = (ev: TimelineEvent) => {
    if (ev.type === 'start') return 'bg-[#17324D] dark:bg-[#FFD166]';
    return getStatusColor(ev.item);
  };

  const weekdays = locale === 'zh-TW' ? WEEKDAYS_ZH : WEEKDAYS_EN;

  return (
    <div className="space-y-4 pt-1 pb-36 sm:pb-40">
      {/* 1. Header with Mode Toggle & Month Selector */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--app-border)] pb-3">
        {/* Left: View Mode Segmented Switch */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[var(--app-surface-subtle)] border border-[var(--app-border)] w-fit">
          <button
            type="button"
            onClick={() => setViewMode('calendar')}
            className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-lg text-sm sm:text-base font-bold transition-all tactile-press ${
              viewMode === 'calendar'
                ? 'bg-[var(--app-surface)] text-[var(--app-text)] shadow-xs'
                : 'text-[var(--app-muted)] hover:text-[var(--app-text)] font-semibold'
            }`}
          >
            <CalendarIcon className="w-4 h-4 sm:w-5 sm:h-5 text-[var(--app-accent-strong)]" />
            <span>{locale === 'zh-TW' ? '月曆視圖' : 'Calendar'}</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('list')}
            className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-lg text-sm sm:text-base font-bold transition-all tactile-press ${
              viewMode === 'list'
                ? 'bg-[var(--app-surface)] text-[var(--app-text)] shadow-xs'
                : 'text-[var(--app-muted)] hover:text-[var(--app-text)] font-semibold'
            }`}
          >
            <ListIcon className="w-4 h-4 sm:w-5 sm:h-5 text-[var(--app-accent-strong)]" />
            <span>{locale === 'zh-TW' ? '時程清單' : 'List'}</span>
          </button>
        </div>

        {/* Right: Month Controls (Active in Calendar Mode) */}
        {viewMode === 'calendar' && (
          <div className="flex items-center gap-2.5">
            {currentMonth !== todayMonthStr && (
              <button
                type="button"
                onClick={handleGoToday}
                className="px-3 py-1.5 text-sm font-bold rounded-xl border border-[var(--app-border)] hover:bg-[var(--app-surface-subtle)] text-[var(--app-text)] tactile-press transition-colors"
              >
                {locale === 'zh-TW' ? '回今天' : 'Today'}
              </button>
            )}
            <div className="flex items-center border border-[var(--app-border)] rounded-xl bg-[var(--app-surface)] shadow-2xs">
              <button
                type="button"
                onClick={handlePrevMonth}
                aria-label={locale === 'zh-TW' ? '上個月' : 'Previous month'}
                className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-l-xl text-[var(--app-muted)] hover:bg-[var(--app-surface-subtle)] tactile-press transition-colors"
              >
                <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
              <span className="px-3.5 text-sm sm:text-base font-black text-[var(--app-text)] tabular-nums tracking-tight">
                {locale === 'zh-TW' ? `${yearNum} 年 ${monthNum} 月` : `${currentMonth}`}
              </span>
              <button
                type="button"
                onClick={handleNextMonth}
                aria-label={locale === 'zh-TW' ? '下個月' : 'Next month'}
                className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-r-xl text-[var(--app-muted)] hover:bg-[var(--app-surface-subtle)] tactile-press transition-colors"
              >
                <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>
          </div>
        )}
      </header>

      {/* 2. CALENDAR VIEW CONTENT */}
      {viewMode === 'calendar' && (
        <div className="space-y-4">
          {/* Monthly Summary Bar, Metrics, Filter Chips & Legend */}
          <div className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-4 sm:p-5 shadow-xs space-y-4">
            {/* Top Row: Metrics & Event Filter */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              {/* Metrics */}
              <div className="flex flex-wrap items-center gap-5 sm:gap-8">
                {/* Metric 1: Due This Month */}
                <div>
                  <span className="text-sm font-semibold text-[var(--app-muted)] block mb-0.5">
                    {locale === 'zh-TW' ? '本月待更換' : 'Due this month'}
                  </span>
                  <span className="text-2xl sm:text-3xl font-black text-[var(--app-text)] tabular-nums">
                    {dueEventsInCurrentMonth.length}{' '}
                    <span className="text-sm sm:text-base font-bold text-[var(--app-muted)]">{locale === 'zh-TW' ? '件' : 'items'}</span>
                  </span>
                </div>

                {/* Metric 2: Purchased / Started This Month */}
                <div className="border-l border-[var(--app-border)] pl-5 sm:pl-8">
                  <span className="text-sm font-semibold text-[var(--app-muted)] block mb-0.5">
                    {locale === 'zh-TW' ? '本月購買 / 啟用' : 'Purchased / Started'}
                  </span>
                  <span className="text-2xl sm:text-3xl font-black text-[#17324D] dark:text-[#FFD166] tabular-nums">
                    {startEventsInCurrentMonth.length}{' '}
                    <span className="text-sm sm:text-base font-bold text-[var(--app-muted)]">{locale === 'zh-TW' ? '件' : 'items'}</span>
                  </span>
                </div>

                {/* Metric 3: Cost / Expenditure */}
                {(currentMonthPurchaseCost > 0 || currentMonthEstimatedDueCost > 0) && (
                  <div className="border-l border-[var(--app-border)] pl-5 sm:pl-8">
                    <span className="text-sm font-semibold text-[var(--app-muted)] block mb-0.5">
                      {locale === 'zh-TW' ? '本月支出 / 預估' : 'Monthly cost'}
                    </span>
                    <div className="flex items-baseline gap-2.5">
                      {currentMonthPurchaseCost > 0 && (
                        <span className="text-lg sm:text-2xl font-black text-[#17324D] dark:text-[#FFD166] tabular-nums">
                          <span className="text-xs font-bold text-[var(--app-muted)] mr-1">{locale === 'zh-TW' ? '已購' : 'Bought'}</span>
                          NT$ {currentMonthPurchaseCost.toLocaleString()}
                        </span>
                      )}
                      {currentMonthPurchaseCost > 0 && currentMonthEstimatedDueCost > 0 && (
                        <span className="text-[var(--app-border)] font-bold">·</span>
                      )}
                      {currentMonthEstimatedDueCost > 0 && (
                        <span className="text-lg sm:text-2xl font-black text-[var(--app-accent-strong)] tabular-nums">
                          <span className="text-xs font-bold text-[var(--app-muted)] mr-1">{locale === 'zh-TW' ? '預估' : 'Est.'}</span>
                          NT$ {currentMonthEstimatedDueCost.toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Event Filter Chips */}
              <div className="flex items-center gap-1 p-1 rounded-xl bg-[var(--app-surface-subtle)] border border-[var(--app-border)] w-fit self-start lg:self-auto">
                <button
                  type="button"
                  onClick={() => setFilterMode('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-all tactile-press ${
                    filterMode === 'all'
                      ? 'bg-[var(--app-surface)] text-[var(--app-text)] shadow-xs'
                      : 'text-[var(--app-muted)] hover:text-[var(--app-text)]'
                  }`}
                >
                  {locale === 'zh-TW' ? `全部 (${totalEventsInCurrentMonth.length})` : `All (${totalEventsInCurrentMonth.length})`}
                </button>
                <button
                  type="button"
                  onClick={() => setFilterMode('due')}
                  className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-all tactile-press ${
                    filterMode === 'due'
                      ? 'bg-[var(--app-surface)] text-[var(--app-text)] shadow-xs'
                      : 'text-[var(--app-muted)] hover:text-[var(--app-text)]'
                  }`}
                >
                  🔄 {locale === 'zh-TW' ? `待更換 (${dueEventsInCurrentMonth.length})` : `Due (${dueEventsInCurrentMonth.length})`}
                </button>
                <button
                  type="button"
                  onClick={() => setFilterMode('start')}
                  className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-all tactile-press ${
                    filterMode === 'start'
                      ? 'bg-[var(--app-surface)] text-[var(--app-text)] shadow-xs'
                      : 'text-[var(--app-muted)] hover:text-[var(--app-text)]'
                  }`}
                >
                  🛍️ {locale === 'zh-TW' ? `購買啟用 (${startEventsInCurrentMonth.length})` : `Purchased (${startEventsInCurrentMonth.length})`}
                </button>
              </div>
            </div>

            {/* Status Indicator Legend */}
            <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs sm:text-sm font-semibold text-[var(--app-muted)] border-t border-[var(--app-border)] pt-3">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#17324D] dark:bg-[#FFD166] ring-2 ring-[#17324D]/20 dark:ring-[#FFD166]/30" />
                {locale === 'zh-TW' ? '購買 / 啟用' : 'Purchased / Started'}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                {locale === 'zh-TW' ? '週期正常' : 'Cycle'}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                {locale === 'zh-TW' ? '即將到期' : 'Due Soon'}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                {locale === 'zh-TW' ? '已過期' : 'Overdue'}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                {locale === 'zh-TW' ? '保固/期限' : 'Warranty'}
              </span>
            </div>
          </div>

          {/* Calendar Month Matrix Container */}
          <div className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-2.5 sm:p-5 shadow-xs">
            {/* Weekday Row */}
            <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2">
              {weekdays.map((day, idx) => {
                const isTodayDOW = currentMonth === todayMonthStr && todayDayOfWeekIndex === idx;
                return (
                  <div
                    key={day}
                    className={`py-1.5 text-center text-xs sm:text-sm font-bold rounded-xl transition-colors ${
                      isTodayDOW
                        ? 'bg-[#17324D] text-[#FFF9E8] dark:bg-[#FFB010] dark:text-[#2B251A] shadow-xs font-black'
                        : 'bg-[var(--app-surface-subtle)] text-[var(--app-muted)] font-semibold'
                    }`}
                  >
                    {day}
                  </div>
                );
              })}
            </div>

            {/* Day Cells Grid */}
            <div className="grid grid-cols-7 gap-1 sm:gap-2.5">
              {/* Empty leading offset days */}
              {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                <div key={`empty-${i}`} className="aspect-square min-h-[58px] sm:min-h-[74px] rounded-2xl opacity-30 bg-[var(--app-surface-subtle)]/50" />
              ))}

              {/* Days of the month */}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const dayDateStr = `${currentMonth}-${String(day).padStart(2, '0')}`;
                const dayEvents = eventsByDate.get(dayDateStr) || [];
                const isToday = dayDateStr === todayStr;
                const isSelected = dayDateStr === selectedDate;
                const hasEvents = dayEvents.length > 0;

                // Priority sort: due events (overdue/due_soon) take priority for visual warning dot
                const sortedDayEvents = [...dayEvents].sort((a, b) => {
                  if (a.type === 'due' && b.type === 'start') return -1;
                  if (a.type === 'start' && b.type === 'due') return 1;
                  return 0;
                });
                const primaryEvent = sortedDayEvents[0];
                const primaryItem = primaryEvent?.item;

                return (
                  <button
                    key={dayDateStr}
                    type="button"
                    onClick={() => setSelectedDate(dayDateStr)}
                    className={`relative aspect-square min-h-[58px] sm:min-h-[74px] rounded-2xl p-1 sm:p-1.5 flex flex-col justify-between items-center transition-all tactile-press ${
                      isSelected
                        ? 'ring-2 ring-[var(--app-accent)] bg-[var(--app-surface)] shadow-md z-10 scale-[1.03]'
                        : isToday
                          ? 'border-2 border-[var(--app-accent)] bg-[var(--app-accent-soft)]/40 dark:bg-[var(--app-accent-strong)]/20 shadow-xs'
                          : hasEvents
                            ? 'bg-[var(--app-surface-subtle)]/90 hover:bg-[var(--app-surface-subtle)] border border-[var(--app-border)] shadow-2xs'
                            : 'bg-[var(--app-surface)] hover:bg-[var(--app-surface-subtle)]/60 border border-[var(--app-border)]/50'
                    }`}
                  >
                    {/* Top / Center: Product Icon with Event Dot & Multi-item Badge */}
                    <div className="w-full flex-1 flex items-center justify-center pt-0.5 relative">
                      {hasEvents && primaryItem && (
                        <div className="relative inline-flex items-center justify-center">
                          <ItemBrandBadge
                            name={primaryItem.name}
                            category={primaryItem.category}
                            imageUrl={primaryItem.imageUrl}
                            specModel={primaryItem.specModel}
                            size="calendar"
                            shape="circle"
                          />
                          {/* Dot: Floating on top-right of the circular badge */}
                          <span
                            className={`absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full ring-2 ring-[var(--app-surface)] ${getEventDotColor(primaryEvent)} shadow-xs z-10`}
                          />
                          {/* Multi-Item Pill: e.g. +2 */}
                          {dayEvents.length > 1 && (
                            <span className="absolute -bottom-1 -right-1 text-[10px] sm:text-xs font-black px-1.5 py-0.5 rounded-full bg-[#17324D] text-[#FFF9E8] dark:bg-[#FFB010] dark:text-[#2B251A] shadow-sm tabular-nums leading-none ring-1.5 ring-[var(--app-surface)] z-10">
                              +{dayEvents.length - 1}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Bottom: Date number */}
                    <div className="w-full text-center pb-0.5">
                      <span
                        className={`text-xs sm:text-sm font-black tabular-nums transition-colors ${
                          isSelected
                            ? 'text-[var(--app-accent-strong)] dark:text-[#FFD166] font-black'
                            : isToday
                              ? 'text-[var(--app-accent-strong)] font-black'
                              : hasEvents
                                ? 'text-[var(--app-text)] font-bold'
                                : 'text-[var(--app-muted)] font-medium'
                        }`}
                      >
                        {day}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Selected Day Detailed Inspector */}
          <section className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-4 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--app-border)] pb-3">
              <div className="flex items-center gap-2.5">
                <Clock className="w-5 h-5 text-[var(--app-accent-strong)]" />
                <h3 className="text-base sm:text-lg font-black text-[var(--app-text)] tabular-nums">
                  {selectedDate}{' '}
                  {selectedDate === todayStr && (
                    <span className="ml-2 px-2.5 py-0.5 rounded-full text-xs sm:text-sm font-bold bg-[var(--app-accent-soft)] text-[var(--app-accent-strong)]">
                      {locale === 'zh-TW' ? '今天' : 'Today'}
                    </span>
                  )}
                </h3>
              </div>
              <span className="text-sm font-bold text-[var(--app-muted)] tabular-nums">
                {selectedDayEvents.length}{' '}
                {locale === 'zh-TW' ? '項記錄' : 'items'}
              </span>
            </div>

            {selectedDayEvents.length === 0 ? (
              <div className="py-8 text-center text-[var(--app-muted)] text-sm sm:text-base">
                <Sparkles className="w-7 h-7 mx-auto mb-2 text-[var(--app-muted-low)]" />
                <p className="font-medium">
                  {locale === 'zh-TW' ? '本日生活安好，沒有需更換的排程耗材或購買記錄。' : 'No items scheduled or purchased on this day.'}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {selectedDayEvents.map((ev) => {
                  const item = ev.item;
                  const isStart = ev.type === 'start';
                  const categoryMeta = CATEGORIES[item.category] || CATEGORIES.general;

                  if (isStart) {
                    return (
                      <div
                        key={ev.id}
                        className="flex items-center justify-between gap-3 p-3.5 sm:p-4 rounded-xl border border-[#17324D]/20 dark:border-[#FFD166]/20 bg-[#17324D]/5 dark:bg-[#FFD166]/10 hover:bg-[#17324D]/10 dark:hover:bg-[#FFD166]/15 transition-colors"
                      >
                        <div className="flex items-center gap-3.5 min-w-0 flex-1">
                          <ItemBrandBadge
                            name={item.name}
                            category={item.category}
                            imageUrl={item.imageUrl}
                            specModel={item.specModel}
                            size="lg"
                            shape="circle"
                          />
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <h4 className="text-base sm:text-[17px] font-bold text-[var(--app-text)] truncate">{item.name}</h4>
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-bold bg-[#17324D]/10 text-[#17324D] border-[#17324D]/25 dark:bg-[#FFD166]/15 dark:text-[#FFD166] dark:border-[#FFD166]/30 shrink-0">
                                <ShoppingBag className="w-3 h-3" />
                                {item.isStored
                                   ? (locale === 'zh-TW' ? '備品購入' : 'Stored')
                                   : (locale === 'zh-TW' ? '購買啟用' : 'Purchased')}
                              </span>
                            </div>
                            <div className="flex flex-wrap items-center gap-2 mt-1 text-sm text-[var(--app-muted)]">
                              <span className="font-semibold">{categoryMeta.label}</span>
                              <span>·</span>
                              <span>備品 <span className="font-bold tabular-nums text-[var(--app-text)]">{item.backupStock}</span></span>
                              {item.price != null && item.price > 0 && (
                                <>
                                  <span>·</span>
                                  <span className="font-bold text-[#17324D] dark:text-[#FFD166] tabular-nums">
                                    NT$ {item.price.toLocaleString()}
                                  </span>
                                </>
                              )}
                              {item.cycleDays ? (
                                <>
                                  <span>·</span>
                                  <span>每 {item.cycleDays} 天更換</span>
                                </>
                              ) : item.paoMonths ? (
                                <>
                                  <span>·</span>
                                  <span>開封保存 {item.paoMonths} 個月</span>
                                </>
                              ) : item.warrantyDate ? (
                                <>
                                  <span>·</span>
                                  <span>保固至 {item.warrantyDate}</span>
                                </>
                              ) : null}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => onEdit(item)}
                            className="px-3.5 py-2 rounded-xl border border-[var(--app-border)] text-sm font-bold text-[var(--app-text)] hover:bg-[var(--app-surface-subtle)] tactile-press"
                          >
                            <Edit2 className="w-4 h-4 inline mr-1" />
                            {locale === 'zh-TW' ? '編輯' : 'Edit'}
                          </button>
                        </div>
                      </div>
                    );
                  }

                  // Due event
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
                      key={ev.id}
                      className="flex items-center justify-between gap-3 p-3.5 sm:p-4 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-subtle)]/60 hover:bg-[var(--app-surface-subtle)] transition-colors"
                    >
                      <div className="flex items-center gap-3.5 min-w-0 flex-1">
                        <ItemBrandBadge
                          name={item.name}
                          category={item.category}
                          imageUrl={item.imageUrl}
                          specModel={item.specModel}
                          size="lg"
                          shape="circle"
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="text-base sm:text-[17px] font-bold text-[var(--app-text)] truncate">{item.name}</h4>
                            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-bold border ${statusInfo.badge} shrink-0`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${statusInfo.dot || 'bg-current'}`} />
                              {statusInfo.text}
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-2 mt-1 text-sm text-[var(--app-muted)]">
                            <span className="font-semibold">{categoryMeta.label}</span>
                            <span>·</span>
                            <span>備品 <span className="font-bold tabular-nums text-[var(--app-text)]">{item.backupStock}</span></span>
                            {item.price != null && item.price > 0 && (
                              <>
                                <span>·</span>
                                <span className="font-bold text-[var(--app-muted)] tabular-nums">
                                  預估 NT$ {item.price.toLocaleString()}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {isDateOnly ? (
                          <button
                            type="button"
                            onClick={() => onEdit(item)}
                            className="px-3.5 py-2 rounded-xl border border-[var(--app-border)] text-sm font-bold text-[var(--app-text)] hover:bg-[var(--app-surface-subtle)] tactile-press"
                          >
                            <Edit2 className="w-4 h-4 inline mr-1" />
                            {locale === 'zh-TW' ? '編輯' : 'Edit'}
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => onReplace(item.id)}
                            className="app-primary px-4 py-2 rounded-xl text-sm font-bold shadow-xs tactile-press flex items-center gap-1.5"
                          >
                            <RotateCcw className="w-4 h-4" />
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
        <div className="space-y-4">
          {/* List View Filter Chips */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[var(--app-surface-subtle)] border border-[var(--app-border)] w-fit">
            <button
              type="button"
              onClick={() => setFilterMode('all')}
              className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-all tactile-press ${
                filterMode === 'all'
                  ? 'bg-[var(--app-surface)] text-[var(--app-text)] shadow-xs'
                  : 'text-[var(--app-muted)] hover:text-[var(--app-text)]'
              }`}
            >
              {locale === 'zh-TW' ? `全部 (${allEvents.length})` : `All (${allEvents.length})`}
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('due')}
              className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-all tactile-press ${
                filterMode === 'due'
                  ? 'bg-[var(--app-surface)] text-[var(--app-text)] shadow-xs'
                  : 'text-[var(--app-muted)] hover:text-[var(--app-text)]'
              }`}
            >
              🔄 {locale === 'zh-TW' ? `待更換 (${allEvents.filter((e) => e.type === 'due').length})` : `Due (${allEvents.filter((e) => e.type === 'due').length})`}
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('start')}
              className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-all tactile-press ${
                filterMode === 'start'
                  ? 'bg-[var(--app-surface)] text-[var(--app-text)] shadow-xs'
                  : 'text-[var(--app-muted)] hover:text-[var(--app-text)]'
              }`}
            >
              🛍️ {locale === 'zh-TW' ? `購買啟用 (${allEvents.filter((e) => e.type === 'start').length})` : `Purchased (${allEvents.filter((e) => e.type === 'start').length})`}
            </button>
          </div>

          {filteredEvents.length === 0 ? (
            <div className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-8 text-center shadow-xs">
              <CalendarIcon className="mx-auto mb-2 h-8 w-8 text-[var(--app-accent-strong)]" />
              <h3 className="text-base sm:text-lg font-bold text-[var(--app-text)]">
                {locale === 'zh-TW' ? '目前沒有符合條件的項目' : 'No items match current filter'}
              </h3>
              <p className="text-sm text-[var(--app-muted)] mx-auto mt-1 max-w-xs font-medium">
                {locale === 'zh-TW' ? '您可以切換上方篩選條件，或在物品庫中新增耗材。' : 'Try switching filter options or track new items.'}
              </p>
            </div>
          ) : (
            <div className="relative space-y-3.5 pl-6 before:absolute before:bottom-2 before:left-2.5 before:top-2 before:w-px before:bg-[var(--app-border)]">
              {filteredEvents.map((ev) => {
                const item = ev.item;
                const isStart = ev.type === 'start';
                const category = CATEGORIES[item.category] || CATEGORIES.general;

                if (isStart) {
                  return (
                    <article key={ev.id} className="relative">
                      <div className="absolute -left-6 top-4 h-3.5 w-3.5 rounded-full border-2 border-[var(--app-surface)] bg-[#17324D] dark:bg-[#FFD166]" />
                      <div className="rounded-2xl border border-[#17324D]/20 dark:border-[#FFD166]/20 bg-[var(--app-surface)] p-4 sm:p-5 shadow-xs flex items-center justify-between gap-3">
                        <div className="flex items-start gap-3 min-w-0 flex-1">
                          <ItemBrandBadge
                            name={item.name}
                            category={item.category}
                            imageUrl={item.imageUrl}
                            specModel={item.specModel}
                            size="lg"
                            shape="circle"
                          />
                          <button type="button" onClick={() => onEdit(item)} className="min-w-0 flex-1 text-left tactile-press">
                            <div className="flex flex-wrap items-center gap-2 text-sm text-[var(--app-muted)]">
                              <span className="flex items-center gap-1 font-bold text-[#17324D] dark:text-[#FFD166] tabular-nums">
                                <ShoppingBag className="h-4 w-4" />
                                {item.isStored ? (locale === 'zh-TW' ? '備品購入' : 'Stored') : (locale === 'zh-TW' ? '購買啟用' : 'Purchased')} · {ev.date}
                              </span>
                              <span className="inline-flex items-center gap-1 rounded-md border border-[#17324D]/25 dark:border-[#FFD166]/30 bg-[#17324D]/10 text-[#17324D] dark:bg-[#FFD166]/15 dark:text-[#FFD166] px-2 py-0.5 text-xs font-bold">
                                {item.isStored ? (locale === 'zh-TW' ? '庫存中' : 'In stock') : (locale === 'zh-TW' ? '啟用中' : 'Active')}
                              </span>
                            </div>
                            <h3 className="mt-1.5 text-base sm:text-lg font-bold text-[var(--app-text)] truncate">
                              {item.name}
                            </h3>
                            <p className="mt-1 text-sm text-[var(--app-muted)] flex flex-wrap items-center gap-2 font-medium">
                              <span>{category.label}</span>
                              <span>·</span>
                              <span>
                                備品 <span className="tabular-nums font-bold text-[var(--app-text)]">{item.backupStock}</span>
                              </span>
                              {item.price != null && item.price > 0 && (
                                <>
                                  <span>·</span>
                                  <span className="font-bold text-[#17324D] dark:text-[#FFD166] tabular-nums">
                                    NT$ {item.price.toLocaleString()}
                                  </span>
                                </>
                              )}
                              {item.cycleDays ? (
                                <>
                                  <span>·</span>
                                  <span>每 {item.cycleDays} 天更換</span>
                                </>
                              ) : null}
                            </p>
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => onEdit(item)}
                          className="px-3.5 py-2 rounded-xl border border-[var(--app-border)] text-sm font-bold text-[var(--app-text)] hover:bg-[var(--app-surface-subtle)] tactile-press shrink-0"
                        >
                          <Edit2 className="h-4 w-4 inline mr-1 text-[var(--app-accent-strong)]" />
                          {locale === 'zh-TW' ? '編輯' : 'Edit'}
                        </button>
                      </div>
                    </article>
                  );
                }

                // Due event
                const statusInfo = formatRemainingDaysText(
                  item.remainingDays,
                  item.healthStatus,
                  item.trackingMode === 'quantity'
                    ? { remainingQuantity: item.remainingQuantity, quantityUnit: item.quantityUnit }
                    : undefined
                );
                const isDateOnly = item.trackingMode === 'expiry' || item.trackingMode === 'warranty';
                const dateLabel =
                  item.healthStatus === 'snoozed'
                    ? '延後至'
                    : item.trackingMode === 'warranty'
                      ? '保固至'
                      : item.trackingMode === 'expiry'
                        ? '有效期限'
                        : item.trackingMode === 'quantity'
                          ? '預計用盡'
                          : '下次更換';

                return (
                  <article key={ev.id} className="relative">
                    <div
                      className={`absolute -left-6 top-4 h-3.5 w-3.5 rounded-full border-2 border-[var(--app-surface)] ${getStatusColor(item)}`}
                    />
                    <div className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-4 sm:p-5 shadow-xs flex items-center justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        <ItemBrandBadge
                          name={item.name}
                          category={item.category}
                          imageUrl={item.imageUrl}
                          specModel={item.specModel}
                          size="lg"
                          shape="circle"
                        />
                        <button type="button" onClick={() => onEdit(item)} className="min-w-0 flex-1 text-left tactile-press">
                          <div className="flex flex-wrap items-center gap-2 text-sm text-[var(--app-muted)]">
                            <span className="flex items-center gap-1 font-bold text-[var(--app-accent-strong)] tabular-nums">
                              <Clock className="h-4 w-4" />
                              {dateLabel} · {ev.date}
                            </span>
                            <span className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-0.5 text-xs font-bold ${statusInfo.badge}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${statusInfo.dot || 'bg-current'}`} />
                              {statusInfo.text}
                            </span>
                          </div>
                          <h3 className="mt-1.5 text-base sm:text-lg font-bold text-[var(--app-text)] truncate">
                            {item.name}
                          </h3>
                          <p className="mt-1 text-sm text-[var(--app-muted)] flex items-center gap-2 font-medium">
                            <span>{category.label}</span>
                            <span>·</span>
                            <span>
                              備品 <span className="tabular-nums font-bold text-[var(--app-text)]">{item.backupStock}</span>
                            </span>
                            {item.healthStatus === 'snoozed' && (
                              <span className="inline-flex items-center gap-1 text-sky-500 font-bold">
                                <Moon className="h-3.5 w-3.5" />
                                延後提醒
                              </span>
                            )}
                          </p>
                        </button>
                      </div>

                      {isDateOnly ? (
                        <button
                          type="button"
                          onClick={() => onEdit(item)}
                          className="px-3.5 py-2 rounded-xl border border-[var(--app-border)] text-sm font-bold text-[var(--app-text)] hover:bg-[var(--app-surface-subtle)] tactile-press shrink-0"
                        >
                          <Edit2 className="h-4 w-4 inline mr-1 text-[var(--app-accent-strong)]" />
                          {locale === 'zh-TW' ? '編輯' : 'Edit'}
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onReplace(item.id)}
                          className="app-primary px-4 py-2.5 rounded-xl text-sm font-bold shadow-xs tactile-press shrink-0 flex items-center gap-1.5"
                        >
                          <RotateCcw className="h-4 w-4" />
                          <span>{locale === 'zh-TW' ? '已換' : 'Replaced'}</span>
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
