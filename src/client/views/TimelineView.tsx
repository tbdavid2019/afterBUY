import React, { useMemo } from 'react';
import { Calendar, Clock, RotateCcw, Edit2, Moon } from 'lucide-react';
import { ItemResponse } from '../../shared/types.ts';
import { CATEGORIES } from '../utils/category.ts';
import { formatRemainingDaysText } from '../../shared/lifecycle.ts';

interface TimelineViewProps {
  items: ItemResponse[];
  onReplace: (id: string) => void;
  onEdit: (item: ItemResponse) => void;
}

export const TimelineView: React.FC<TimelineViewProps> = ({ items, onReplace, onEdit }) => {
  const scheduledItems = useMemo(() => items
    .filter((item) => !item.isStored && item.healthStatus !== 'stored')
    .sort((a, b) => {
      const aDate = a.healthStatus === 'snoozed' && a.snoozeUntil ? a.snoozeUntil : a.nextDueDate;
      const bDate = b.healthStatus === 'snoozed' && b.snoozeUntil ? b.snoozeUntil : b.nextDueDate;
      return aDate.localeCompare(bDate);
    }), [items]);

  return (
    <div className="space-y-4 pb-32 pt-1">
      <header className="border-b border-[var(--app-border)] pb-4">
        <h2 className="ui-page-title flex items-center gap-2 text-[var(--app-text)]">
          <Calendar className="h-5 w-5 text-[var(--app-accent-strong)]" />
          <span>時程</span>
        </h2>
        <p className="ui-body mt-1 text-[var(--app-muted)]">依下一次處理或提醒日期排列。</p>
      </header>

      {scheduledItems.length === 0 ? (
        <div className="ui-body py-12 text-center text-[var(--app-muted)]">尚無需要排程的項目。</div>
      ) : (
        <div className="relative space-y-3 pl-6 before:absolute before:bottom-2 before:left-2.5 before:top-2 before:w-px before:bg-[var(--app-border)]">
          {scheduledItems.map((item) => {
            const category = CATEGORIES[item.category] || CATEGORIES.general;
            const statusInfo = formatRemainingDaysText(item.remainingDays, item.healthStatus);
            const dateOnly = item.trackingMode === 'expiry' || item.trackingMode === 'warranty';
            const displayDate = item.healthStatus === 'snoozed' && item.snoozeUntil ? item.snoozeUntil : item.nextDueDate;
            const dateLabel = item.healthStatus === 'snoozed' ? '延後至' : item.trackingMode === 'warranty' ? '保固至' : item.trackingMode === 'expiry' ? '有效期限' : '下次處理';
            return (
              <article key={item.id} className="relative">
                <div className={`absolute -left-6 top-4 h-3 w-3 rounded-full border-2 border-[var(--app-bg)] ${item.healthStatus === 'overdue' ? 'bg-rose-500' : item.healthStatus === 'due_soon' ? 'bg-amber-500' : item.healthStatus === 'snoozed' ? 'bg-sky-500' : 'bg-emerald-500'}`} />
                <div className="app-surface flex items-center justify-between gap-3 rounded-2xl border p-4 shadow-sm">
                  <button type="button" onClick={() => onEdit(item)} className="min-w-0 flex-1 text-left">
                    <div className="ui-meta flex flex-wrap items-center gap-2 text-[var(--app-muted)]">
                      <span className="flex items-center gap-1 font-semibold text-[var(--app-accent-strong)]"><Clock className="h-4 w-4" />{dateLabel} · {displayDate}</span>
                      <span className={`ui-badge rounded-full border px-2 py-0.5 ${statusInfo.badge}`}>{statusInfo.text}</span>
                    </div>
                    <h3 className="ui-item-title mt-1 truncate text-[var(--app-text)]">{item.name}</h3>
                    <p className="ui-meta mt-0.5 text-[var(--app-muted)]">{category.label} · 備品 {item.backupStock}{item.healthStatus === 'snoozed' && <span className="ml-1 inline-flex items-center gap-1"><Moon className="h-3 w-3" />延後提醒</span>}</p>
                  </button>
                  {dateOnly ? (
                    <button type="button" onClick={() => onEdit(item)} className="app-control ui-button flex min-h-11 shrink-0 items-center gap-1.5 rounded-xl border px-3"><Edit2 className="h-4 w-4 text-[var(--app-accent-strong)]" />編輯</button>
                  ) : (
                    <button type="button" onClick={() => onReplace(item.id)} className="app-primary ui-button flex min-h-11 shrink-0 items-center gap-1.5 rounded-xl px-3"><RotateCcw className="h-4 w-4" />已換</button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};
