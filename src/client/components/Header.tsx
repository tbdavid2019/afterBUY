import React from 'react';
import { Plus, Fingerprint } from 'lucide-react';
import { UserSession, StockResponse } from '../../shared/types.ts';
import { useTranslation } from '../i18n/index.tsx';
import { StockSwitcher } from './StockSwitcher.tsx';

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
    <header className="app-header sticky top-0 z-30 backdrop-blur-md border-b pt-safe">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 min-h-14 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg app-primary flex items-center justify-center shrink-0">
            <span className="font-black tracking-tight">aB</span>
          </div>
          <div className="min-w-0">
            <h1 className="ui-section-title tracking-tight text-[var(--app-text)] truncate">
              afterBuy
            </h1>
            {user && onSelectStock && onOpenStockSettings && onRefreshStocks ? (
              <div className="mt-0.5 max-w-[11rem]">
                <StockSwitcher
                  currentStockId={currentStockId}
                  stocks={stocks}
                  onSelectStock={onSelectStock}
                  onOpenStockSettings={onOpenStockSettings}
                  onRefreshStocks={onRefreshStocks}
                />
              </div>
            ) : <p className="ui-meta leading-tight text-[var(--app-muted)] truncate">{t('appSubtitle')}</p>}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onOpenNewItem}
            aria-label={t('addItem')}
            className="app-primary ui-button min-h-11 flex items-center gap-1.5 hover:brightness-105 active:scale-[0.96] px-3 rounded-xl shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>{locale === 'zh-TW' ? '新增' : 'Add'}</span>
          </button>
          {!user && (
            <button
              onClick={onOpenAuth}
              aria-label={locale === 'zh-TW' ? '登入' : 'Sign in'}
              className="app-control min-h-11 w-11 flex items-center justify-center rounded-xl border hover:border-[var(--app-accent)] active:scale-[0.96]"
            >
              <Fingerprint className="w-4 h-4 text-[var(--app-accent-strong)]" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
