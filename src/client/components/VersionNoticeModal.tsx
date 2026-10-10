import React from 'react';
import { Sparkles, Check, X, ArrowRight } from 'lucide-react';

interface VersionNoticeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAction?: () => void;
  actionLabel?: string;
}

export const CURRENT_APP_RELEASE_DATE = '2026-10-10';

export const VersionNoticeModal: React.FC<VersionNoticeModalProps> = ({
  isOpen,
  onClose,
  onAction,
  actionLabel = '去逛逛範本庫',
}) => {
  if (!isOpen) return null;

  const handleDismiss = () => {
    localStorage.setItem('afterbuy_last_seen_date', CURRENT_APP_RELEASE_DATE);
    onClose();
  };

  const handleAction = () => {
    localStorage.setItem('afterbuy_last_seen_date', CURRENT_APP_RELEASE_DATE);
    onClose();
    onAction?.();
  };

  const features = [
    {
      title: '試用狀態與物品帶入',
      desc: '清楚標示尚未登入與本機保存方式；登入後可帶入自訂物品，保留數量、備品及照片。',
    },
    {
      title: '手機滑動與復原',
      desc: '右滑物品記錄今天已換，左滑開啟操作；空白區左右滑切換頁面，標題區下滑關閉表單。',
    },
    {
      title: '輸入不再被背景更新打斷',
      desc: '表單開啟期間保留輸入，PWA 更新由你主動套用，背景點擊不會關閉表單。',
    },
    {
      title: '補齊洗沐與口腔範本',
      desc: '新增洗髮精、普通牙刷、舌苔刷；電動牙刷刷頭獨立管理。',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm modal-backdrop-animate">
      <div className="app-surface border border-[var(--app-border)] rounded-t-3xl sm:rounded-3xl w-full max-w-md flex flex-col shadow-2xl overflow-hidden sheet-content-animate sm:modal-content-animate">
        {/* Close Button top-right */}
        <div className="flex justify-end pt-3 pr-3">
          <button
            type="button"
            onClick={handleDismiss}
            aria-label="關閉"
            className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--app-muted)] hover:text-[var(--app-text)] hover:bg-[var(--app-surface-subtle)] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="px-6 pb-6 pt-1 space-y-4">
          {/* Header Icon & Tag */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl app-primary-soft border border-[var(--app-accent)]/30 flex items-center justify-center shadow-xs shrink-0">
              <Sparkles className="w-6 h-6 text-[var(--app-accent-strong)]" />
            </div>
            <div>
              <span className="inline-block text-xs font-bold text-[var(--app-accent-strong)] tracking-wider">
                這版新增
              </span>
              <h2 className="ui-section-title text-[var(--app-text)] text-lg sm:text-xl font-bold leading-tight">
                試用資料保留與手機操作更新
              </h2>
            </div>
          </div>

          <p className="ui-body text-[var(--app-muted)] leading-relaxed text-sm">
            先試用、再登入帶入物品；手機滑動操作與輸入穩定性同步改善。
          </p>

          {/* Checklist */}
          <div className="space-y-3 pt-1">
            {features.map((item, idx) => (
              <div key={idx} className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full app-primary-soft border border-[var(--app-accent)]/40 flex items-center justify-center shrink-0 mt-0.5">
                  <Check className="w-3.5 h-3.5 text-[var(--app-accent-strong)] stroke-[3]" />
                </div>
                <div className="min-w-0 flex-1 text-sm">
                  <span className="font-bold text-[var(--app-text)] mr-1.5">{item.title}：</span>
                  <span className="text-[var(--app-muted)] leading-snug">{item.desc}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Bottom Dual Action Buttons */}
          <div className="grid grid-cols-2 gap-2.5 pt-3">
            <button
              type="button"
              onClick={handleDismiss}
              className="min-h-11 rounded-2xl app-control border border-[var(--app-border)] hover:border-[var(--app-accent)] text-[var(--app-muted)] hover:text-[var(--app-text)] ui-button font-bold text-sm transition-all"
            >
              稍後再看
            </button>
            <button
              type="button"
              onClick={handleAction}
              className="min-h-11 rounded-2xl app-primary ui-button font-bold text-sm shadow-sm hover:shadow-md flex items-center justify-center gap-1.5 transition-all active:scale-95"
            >
              <span>{actionLabel}</span>
              <ArrowRight className="w-4 h-4 stroke-[2.5]" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
