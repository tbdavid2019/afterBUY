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
      <div className="border-b border-slate-800/80 pb-5">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-[-0.03em] text-white flex items-center gap-2 mb-2">
          <Calendar className="w-4 h-4 text-sky-400" />
          <span>耗材與保固時程表</span>
        </h2>
        <p className="text-sm text-slate-400 max-w-xl">
          按到期時間先後順序排列，方便提早規劃採購與定期保養。
        </p>
      </div>

      {sortedItems.length === 0 ? (
        <div className="text-center py-12 text-slate-500 text-xs">
          尚無任何排程項目。
        </div>
      ) : (
        <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-px before:bg-slate-800">
          {sortedItems.map((item) => {
            const cat = CATEGORIES[item.category] || CATEGORIES.general;
            const statusInfo = formatRemainingDaysText(item.remainingDays);

            return (
              <div key={item.id} className="relative group">
                {/* Timeline node dot */}
                <div
                  className={`absolute -left-6 top-3 w-3 h-3 rounded-full border-2 border-slate-950 ${
                    item.healthStatus === 'overdue'
                      ? 'bg-rose-500 animate-pulse'
                      : item.healthStatus === 'due_soon'
                      ? 'bg-amber-400'
                      : 'bg-sky-500'
                  }`}
                />

                {/* Card */}
                <div className="app-surface border rounded-2xl p-4 hover:border-slate-700 transition-all flex items-center justify-between gap-3">
                  <button type="button" className="flex-1 min-w-0 text-left" onClick={() => onEdit(item)}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[11px] font-mono text-sky-300 font-bold">
                        {item.nextDueDate}
                      </span>
                      <span className={`text-[10px] px-1.5 py-0.2 rounded-full border font-semibold ${statusInfo.badge}`}>
                        {statusInfo.text}
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-white truncate hover:text-sky-300">
                      {item.name}
                    </h3>
                    <span className="text-xs text-slate-400">
                      {cat.label} · 備品庫存: {item.backupStock}
                    </span>
                  </button>

                  <button
                    onClick={() => onReplace(item.id)}
                    aria-label={`標記 ${item.name} 今天已換`}
                    className="flex items-center gap-1 bg-sky-300 hover:bg-sky-200 active:scale-[0.98] text-sky-950 text-xs px-3 py-2 rounded-xl transition-all font-bold"
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
