import React, { useEffect, useState } from 'react';
import { X, History, RotateCcw, Loader2 } from 'lucide-react';
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
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="app-primary-soft w-9 h-9 rounded-xl border flex items-center justify-center shrink-0">
              <History className="w-4 h-4 text-[var(--app-accent-strong)]" />
            </div>
            <div className="min-w-0">
              <h2 className="ui-section-title text-[var(--app-text)] truncate">{item.name}</h2>
              <p className="ui-meta text-[var(--app-muted)]">更換與庫存扣減履歷</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="關閉履歷視窗"
            className="app-control ui-button min-h-11 min-w-11 -mr-2 flex items-center justify-center rounded-xl border hover:border-[var(--app-accent)] transition-colors shrink-0"
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
            <div className="text-center py-10 text-[var(--app-muted)] ui-body">
              <p>目前尚無更換紀錄。</p>
              <p className="ui-meta mt-1 text-[var(--app-muted-low)]">點擊卡片上的「今天已換」即可記錄更換歷程！</p>
            </div>
          ) : (
            historyList.map((record) => (
              <div
                key={record.id}
                className="app-surface-subtle border border-[var(--app-border)] p-3.5 rounded-xl flex items-start gap-3"
              >
                <div className="app-primary-soft w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 mt-0.5">
                  <RotateCcw className="w-4 h-4 text-[var(--app-accent-strong)]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-2 mb-1">
                    <span className="ui-item-title text-[var(--app-text)]">已完成更換</span>
                    <span className="ui-meta text-[var(--app-muted)] tabular-nums">
                      {record.replacedAt.split('T')[0]}
                    </span>
                  </div>
                  <div className="ui-meta text-[var(--app-muted)] space-y-0.5">
                    <p>前次啟用日: <span className="tabular-nums font-medium text-[var(--app-text)]">{record.previousStartDate}</span></p>
                    <p>更換後備品庫存: <span className="font-semibold text-[var(--app-text)] tabular-nums">{record.stockAfterReplace}</span></p>
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
