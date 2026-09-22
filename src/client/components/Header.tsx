import React from 'react';
import { Plus, Fingerprint, Languages } from 'lucide-react';
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
  const { locale, toggleLocale, t } = useTranslation();

  return (
    <header className="app-header sticky top-0 z-30 backdrop-blur-md border-b pt-safe">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 min-h-14 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <BrandLogo size="md" />
          <div className="min-w-0">
            <div className="flex items-baseline gap-1 leading-none">
              <span className="font-black text-xl tracking-tight text-[var(--app-accent-strong)] font-sans">
                888
              </span>
              <h1 className="ui-section-title tracking-tight text-[var(--app-text)] truncate font-black leading-none">
                該換囉
              </h1>
            </div>
            {user && onSelectStock && onOpenStockSettings && onRefreshStocks ? (
              <div className="mt-1 max-w-[11rem]">
                <StockSwitcher
                  currentStockId={currentStockId}
                  stocks={stocks}
                  onSelectStock={onSelectStock}
                  onOpenStockSettings={onOpenStockSettings}
                  onRefreshStocks={onRefreshStocks}
                />
              </div>
            ) : <p className="ui-meta leading-tight text-[var(--app-muted)] truncate mt-0.5">{t('appSubtitle')}</p>}
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <button
            type="button"
            onClick={toggleLocale}
            aria-label={locale === 'zh-TW' ? '切換為英文 (English)' : 'Switch to Traditional Chinese (繁體中文)'}
            className="h-9 px-2 sm:px-2.5 flex items-center justify-center gap-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/80 tactile-press text-slate-700 dark:text-slate-300 text-xs font-semibold"
            title={locale === 'zh-TW' ? 'Switch to English' : '切換為繁體中文'}
          >
            <Languages className="w-3.5 h-3.5 text-slate-500" />
            <span className="tabular-nums font-bold">{locale === 'zh-TW' ? 'EN' : '中'}</span>
          </button>

          <button
            onClick={onOpenNewItem}
            aria-label={t('addItem')}
            className="app-primary h-9 flex items-center gap-1.5 hover:brightness-105 tactile-press px-3.5 rounded-lg shadow-xs text-xs font-semibold"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{locale === 'zh-TW' ? '新增耗材' : 'Add Item'}</span>
          </button>
          {!user && (
            <button
              onClick={onOpenAuth}
              aria-label={locale === 'zh-TW' ? '登入' : 'Sign in'}
              className="h-9 w-9 flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/80 text-slate-600 dark:text-slate-300 tactile-press"
            >
              <Fingerprint className="w-4 h-4 text-slate-600 dark:text-slate-400" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
