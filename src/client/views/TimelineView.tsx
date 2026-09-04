import React from 'react';
import { Calendar, Clock, RotateCcw, AlertCircle, CheckCircle } from 'lucide-react';
import { ItemResponse } from '../../shared/types.ts';
import { CATEGORIES } from '../utils/category.ts';
import { formatRemainingDaysText } from '../../shared/lifecycle.ts';

interface TimelineViewProps {
  items: ItemResponse[];
  onReplace: (id: string) => void;
  onEdit: (item: ItemResponse) => void;
}

export const TimelineView: React.FC<TimelineViewProps> = ({ items, onReplace, onEdit }) => {
  // Sort items strictly by nextDueDate
  const sortedItems = [...items].sort((a, b) => a.nextDueDate.localeCompare(b.nextDueDate));

  return (
    <div className="space-y-5 pb-28 pt-1">
      <div className="border-b border-[var(--app-border)] pb-5">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--app-text)] flex items-center gap-2 mb-2">
          <Calendar className="w-5 h-5 text-[var(--app-accent-strong)]" />
          <span>耗材與保固時程表</span>
        </h2>
        <p className="text-xs sm:text-sm text-[var(--app-muted)] max-w-xl">
          按到期時間先後順序排列，方便提早規劃採購與定期保養。
        </p>
      </div>

      {sortedItems.length === 0 ? (
        <div className="text-center py-12 text-[var(--app-muted)] text-xs">
          尚無任何排程項目。
        </div>
      ) : (
        <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-px before:bg-[var(--app-border)]">
          {sortedItems.map((item) => {
            const cat = CATEGORIES[item.category] || CATEGORIES.general;
            const statusInfo = formatRemainingDaysText(item.remainingDays);

            return (
              <div key={item.id} className="relative group">
                {/* Timeline node dot */}
                <div
                  className={`absolute -left-6 top-3.5 w-3 h-3 rounded-full border-2 border-[var(--app-bg)] ${
                    item.healthStatus === 'overdue'
                      ? 'bg-rose-500 animate-pulse'
                      : item.healthStatus === 'due_soon'
                      ? 'bg-amber-500'
                      : 'bg-emerald-500'
                  }`}
                />

                {/* Card */}
                <div className="app-surface border border-[var(--app-border)] rounded-2xl p-4 hover:border-[var(--app-accent)] transition-all flex items-center justify-between gap-3 shadow-sm">
                  <button type="button" className="flex-1 min-w-0 text-left" onClick={() => onEdit(item)}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-mono text-[var(--app-accent-strong)] font-bold">
                        {item.nextDueDate}
                      </span>
                      <span className={`text-[11px] px-2 py-0.5 rounded-full border font-semibold ${statusInfo.badge}`}>
                        {statusInfo.text}
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-[var(--app-text)] truncate hover:text-[var(--app-accent-strong)]">
                      {item.name}
                    </h3>
                    <span className="text-xs text-[var(--app-muted)]">
                      {cat.label} · 備品庫存: {item.backupStock}
                    </span>
                  </button>

                  <button
                    onClick={() => onReplace(item.id)}
                    aria-label={`標記 ${item.name} 今天已換`}
                    className="app-primary active:scale-[0.98] text-xs px-3.5 py-2 rounded-xl transition-all font-bold shadow-sm flex items-center gap-1 shrink-0"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>已換</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
