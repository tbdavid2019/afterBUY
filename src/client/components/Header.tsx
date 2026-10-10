import React from 'react';
import { Plus, Fingerprint } from 'lucide-react';
import { UserSession, StockResponse } from '../../shared/types.ts';
import { useTranslation } from '../i18n/index.tsx';
import { StockSwitcher } from './StockSwitcher.tsx';
import { BrandLogo } from './BrandLogo.tsx';

interface HeaderProps {
  user: UserSession | null;
  stocks?: StockResponse[];
  currentStockId?: string;
  onSelectStock?: (stockId: string) => void;
  onOpenStockSettings?: (stockId: string) => void;
  onRefreshStocks?: () => Promise<void> | void;
  onOpenAuth: () => void;
  onOpenNewItem: () => void;
  /** Kept optional while the shell migrates theme controls to Settings. */
  theme?: unknown;
  onToggleTheme?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  stocks = [],
  currentStockId = 'all',
  onSelectStock,
  onOpenStockSettings,
  onRefreshStocks,
  onOpenAuth,
  onOpenNewItem,
}) => {
  const { locale, t } = useTranslation();

  return (
    <header className="app-header sticky top-0 z-30 backdrop-blur-md border-b pt-safe bg-white/85 dark:bg-slate-950/85 border-slate-200/80 dark:border-slate-800/80 transition-colors">
      <div className="max-w-3xl md:max-w-4xl lg:max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <BrandLogo size="sm" className="shadow-2xs" />
          {user && onSelectStock && onOpenStockSettings && onRefreshStocks ? (
            <StockSwitcher
              variant="title"
              currentStockId={currentStockId}
              stocks={stocks}
              onSelectStock={onSelectStock}
              onOpenStockSettings={onOpenStockSettings}
              onRefreshStocks={onRefreshStocks}
            />
          ) : (
            <div className="flex flex-col min-w-0">
              <h1 className="text-base sm:text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100 truncate">
                {t('appName')}
              </h1>
              <span className="ui-meta font-semibold text-[var(--app-accent-strong)]">
                {locale === 'zh-TW' ? '試用 · 未登入' : 'Trial · Signed out'}
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onOpenNewItem}
            aria-label={t('addItem')}
            className="app-primary h-9 flex items-center gap-1.5 hover:brightness-105 active:scale-[0.98] tactile-press px-3.5 rounded-xl shadow-xs text-xs font-semibold transition-all"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span className="hidden min-[360px]:inline">{locale === 'zh-TW' ? '新增耗材' : 'Add Item'}</span>
          </button>
          {!user && (
            <button
              onClick={onOpenAuth}
              aria-label={locale === 'zh-TW' ? '登入／註冊' : 'Sign in / Register'}
              className="h-9 px-3 flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/80 text-slate-700 dark:text-slate-300 text-xs font-semibold tactile-press transition-colors"
            >
              <Fingerprint className="w-4 h-4 text-[var(--app-accent)]" />
              <span>{locale === 'zh-TW' ? '登入' : 'Sign in'}</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
