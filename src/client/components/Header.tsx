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
    <header className="bg-[#FFB010] dark:bg-[#17324D] border-b border-[#DDC58B] dark:border-[#2E3F54] text-[#2B251A] dark:text-[#FFF9E8] sticky top-0 z-30 pt-safe transition-colors shadow-[0_4px_14px_rgba(79,58,14,0.08)]">
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
              <h1 className="text-base sm:text-lg font-bold tracking-tight text-[#2B251A] dark:text-[#FFF9E8] truncate">
                {t('appName')}
              </h1>
              <span className="ui-meta font-bold text-[#17324D] dark:text-[#FFD166]">
                {locale === 'zh-TW' ? '試用 · 未登入' : 'Trial · Signed out'}
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onOpenNewItem}
            aria-label={t('addItem')}
            className="bg-[#17324D] text-[#FFF9E8] hover:bg-[#1E3F60] dark:bg-[#FFB010] dark:text-[#2B251A] dark:hover:bg-[#FFC038] h-9 flex items-center gap-1.5 active:scale-[0.98] tactile-press px-3.5 rounded-xl shadow-xs text-xs font-semibold transition-all"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span className="hidden min-[360px]:inline">{locale === 'zh-TW' ? '新增耗材' : 'Add Item'}</span>
          </button>
          {!user && (
            <button
              onClick={onOpenAuth}
              aria-label={locale === 'zh-TW' ? '登入／註冊' : 'Sign in / Register'}
              className="bg-[#FFF9E8] dark:bg-[#182230] border border-[#6B5B38] dark:border-[#6E8299] text-[#2B251A] dark:text-[#FFF9E8] hover:bg-[#FFF0CC] dark:hover:bg-[#212E40] h-9 px-3 flex items-center gap-1.5 rounded-xl text-xs font-semibold tactile-press transition-colors"
            >
              <Fingerprint className="w-4 h-4 text-[#17324D] dark:text-[#FFD166]" />
              <span>{locale === 'zh-TW' ? '登入' : 'Sign in'}</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
