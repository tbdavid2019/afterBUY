import React, { useEffect, useState } from 'react';
import { X, History, RotateCcw, Calendar, Loader2 } from 'lucide-react';
import { ItemResponse, ItemHistoryRecord } from '../../shared/types.ts';
import { api } from '../api.ts';

interface HistoryModalProps {
  item: ItemResponse | null;
  onClose: () => void;
}

export const HistoryModal: React.FC<HistoryModalProps> = ({ item, onClose }) => {
  const [historyList, setHistoryList] = useState<ItemHistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!item) return;
    setLoading(true);
    api.getItemHistory(item.id)
      .then((res) => setHistoryList(res.history))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [item]);

  if (!item) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="app-surface border border-[var(--app-border)] rounded-2xl w-full max-w-md p-5 shadow-2xl flex flex-col max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[var(--app-border)]">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
            <div>
              <h2 className="text-base font-bold text-[var(--app-text)]">{item.name}</h2>
              <span className="text-xs text-[var(--app-muted)]">更換與庫存扣減履歷</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[var(--app-muted)] hover:text-[var(--app-text)] p-1 rounded-lg hover:bg-[var(--app-surface-subtle)] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto py-4 space-y-3">
          {loading ? (
            <div className="flex justify-center py-8 text-[var(--app-muted)]">
              <Loader2 className="w-6 h-6 animate-spin text-[var(--app-accent)]" />
            </div>
          ) : historyList.length === 0 ? (
            <div className="text-center py-10 text-[var(--app-muted)] text-xs">
              <p>目前尚無更換紀錄。</p>
              <p className="mt-1">點擊「今天已換」即可記錄更換歷程！</p>
            </div>
          ) : (
            historyList.map((record) => (
              <div
                key={record.id}
                className="app-surface-subtle border border-[var(--app-border)] p-3 rounded-xl flex items-start gap-3"
              >
                <div className="w-7 h-7 rounded-lg bg-sky-500/10 border border-sky-500/20 text-[var(--app-accent-strong)] flex items-center justify-center flex-shrink-0 mt-0.5">
                  <RotateCcw className="w-3.5 h-3.5" />
                </div>
                <div className="flex-1 text-xs">
                  <div className="flex items-baseline justify-between text-[var(--app-text)] font-semibold mb-1">
                    <span>已完成更換</span>
                    <span className="text-xs text-[var(--app-muted)] font-mono">
                      {record.replacedAt.split('T')[0]}
                    </span>
                  </div>
                  <div className="text-[var(--app-muted)] space-y-0.5">
                    <p>前次啟用日: {record.previousStartDate}</p>
                    <p>更換後備品庫存: <span className="font-bold text-[var(--app-text)]">{record.stockAfterReplace}</span></p>
                    {record.notes && <p className="text-[var(--app-muted-low)] italic">{record.notes}</p>}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
