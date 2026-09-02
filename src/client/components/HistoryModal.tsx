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
      <div className="app-surface border rounded-2xl w-full max-w-md p-5 shadow-2xl flex flex-col max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-indigo-400" />
            <div>
              <h2 className="text-base font-bold text-white">{item.name}</h2>
              <span className="text-xs text-slate-400">更換與庫存扣減履歷</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-1 rounded-lg hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto py-4 space-y-3">
          {loading ? (
            <div className="flex justify-center py-8 text-slate-500">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : historyList.length === 0 ? (
            <div className="text-center py-10 text-slate-500 text-xs">
              <p>目前尚無更換紀錄。</p>
              <p className="mt-1">點擊「今天已換」即可記錄更換歷程！</p>
            </div>
          ) : (
            historyList.map((record) => (
              <div
                key={record.id}
                className="app-surface-subtle border p-3 rounded-xl flex items-start gap-3"
              >
                <div className="w-7 h-7 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <RotateCcw className="w-3.5 h-3.5" />
                </div>
                <div className="flex-1 text-xs">
                  <div className="flex items-baseline justify-between text-slate-300 font-semibold mb-1">
                    <span>已完成更換</span>
                    <span className="text-[11px] text-slate-500 font-mono">
                      {record.replacedAt.split('T')[0]}
                    </span>
                  </div>
                  <div className="text-slate-400 space-y-0.5">
                    <p>前次啟用日: {record.previousStartDate}</p>
                    <p>更換後備品庫存: <span className="font-bold text-white">{record.stockAfterReplace}</span></p>
                    {record.notes && <p className="text-slate-500 italic">{record.notes}</p>}
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
