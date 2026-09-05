import React from 'react';
import { Plus, Fingerprint, Moon, Sun, Languages } from 'lucide-react';
import { UserSession, StockResponse } from '../../shared/types.ts';
import type { ThemeMode } from '../utils/theme.ts';
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
  theme: ThemeMode;
  onToggleTheme: () => void;
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
  theme,
  onToggleTheme,
}) => {
  const { locale, toggleLocale, t } = useTranslation();

  return (
    <header className="app-header sticky top-0 z-30 backdrop-blur-md border-b pt-safe">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Logo & Slogan */}
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-sky-400 dark:bg-sky-300 flex items-center justify-center shadow-[0_8px_24px_-10px_rgba(56,189,248,0.8)] shrink-0">
            <span className="text-slate-950 font-black text-sm tracking-tight">aB</span>
          </div>
          <div className="min-w-0">
            <h1 className="text-base font-bold tracking-tight text-[var(--app-text)] flex items-center gap-1.5 truncate">
              <span>afterBuy</span>
              <span className="text-[var(--app-accent-strong)] font-extrabold text-sm">該換囉</span>
            </h1>
            {user && onSelectStock && onOpenStockSettings && onRefreshStocks ? (
              <div className="mt-0.5">
                <StockSwitcher
                  currentStockId={currentStockId}
                  stocks={stocks}
                  onSelectStock={onSelectStock}
                  onOpenStockSettings={onOpenStockSettings}
                  onRefreshStocks={onRefreshStocks}
                />
              </div>
            ) : (
              <p className="text-xs text-[var(--app-muted)] mt-0.5 hidden sm:block truncate">{t('appSubtitle')}</p>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Language Toggle */}
          <button
            type="button"
            onClick={toggleLocale}
            aria-label={locale === 'zh-TW' ? 'Switch to English' : '切換至繁體中文'}
            className="app-control h-9 px-2 sm:px-2.5 flex items-center justify-center gap-1 sm:gap-1.5 rounded-xl border text-xs font-bold transition-colors active:scale-[0.96] shrink-0"
          >
            <Languages className="w-3.5 h-3.5 text-sky-500 dark:text-sky-400 hidden sm:inline-block shrink-0" />
            <span>{locale === 'zh-TW' ? 'EN' : '繁中'}</span>
          </button>

          {/* Theme Toggle */}
          <button
            type="button"
            onClick={onToggleTheme}
            aria-label={theme === 'light' ? '深色模式' : '淺色模式'}
            className="app-control w-9 h-9 flex items-center justify-center rounded-xl border text-[var(--app-muted)] hover:text-[var(--app-text)] transition-colors active:scale-[0.96] shrink-0"
          >
            {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
          </button>

          {user ? (
            <button
              onClick={onOpenNewItem}
              aria-label={t('addItem')}
              className="app-primary h-9 flex items-center gap-1.5 hover:brightness-105 active:scale-[0.96] text-xs font-bold px-3 sm:px-3.5 rounded-xl shadow-sm transition-all shrink-0"
            >
              <Plus className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline">{t('addItem')}</span>
              <span className="sm:hidden">{locale === 'zh-TW' ? '新增' : 'Add'}</span>
            </button>
          ) : (
            <button
              onClick={onOpenAuth}
              aria-label="Sign In"
              className="app-control h-9 hover:border-[var(--app-accent)] active:scale-[0.96] text-xs font-bold px-2.5 sm:px-3.5 rounded-xl transition-all flex items-center gap-1.5 border border-sky-500/40 dark:border-sky-400/30 bg-sky-500/5 hover:bg-sky-500/10 shrink-0"
            >
              <Fingerprint className="w-4 h-4 text-sky-500 dark:text-sky-400 shrink-0" />
              <span className="hidden sm:inline">{locale === 'zh-TW' ? '登入 / 註冊' : 'Sign In'}</span>
              <span className="sm:hidden">{locale === 'zh-TW' ? '登入' : 'Sign In'}</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
