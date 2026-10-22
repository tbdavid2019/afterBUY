import React from 'react';
import { Plus, Fingerprint, Search, X, Sparkles, Camera } from 'lucide-react';
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
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  onOpenPresetCatalog?: () => void;
  onOpenBatchPhoto?: () => void;
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
  searchQuery,
  onSearchChange,
  onOpenPresetCatalog,
  onOpenBatchPhoto,
}) => {
  const { locale, t } = useTranslation();

  return (
    <header className="bg-[#FFB010] dark:bg-[#17324D] border-b border-[#DDC58B] dark:border-[#2E3F54] text-[#2B251A] dark:text-[#FFF9E8] sticky top-0 z-30 pt-safe transition-colors shadow-[0_4px_14px_rgba(79,58,14,0.08)]">
      <div className="max-w-3xl md:max-w-4xl lg:max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-2.5 sm:gap-3">
        {/* Left: Logo & StockSwitcher */}
        <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 flex-1 md:flex-initial">
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

        {/* Center: Desktop search bar */}
        {onSearchChange !== undefined && (
          <div className="hidden md:flex flex-1 max-w-xs lg:max-w-md mx-2 items-center relative">
            <Search className="w-3.5 h-3.5 text-[#4A3C1D] dark:text-[#8899A6] absolute left-3 pointer-events-none" />
            <input
              type="text"
              value={searchQuery || ''}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={locale === 'zh-TW' ? '搜尋耗材名稱、品牌或位置…' : 'Search items, brands, locations…'}
              className="w-full pl-8 pr-8 py-1.5 text-xs rounded-xl border border-[#DDC58B] dark:border-[#2E3F54] bg-[#FFF9E8] dark:bg-[#101F30] text-[#2B251A] dark:text-[#FFF9E8] placeholder-[#7D6843] dark:placeholder-[#6E8299] focus:outline-hidden focus:ring-2 focus:ring-[#17324D] dark:focus:ring-[#FFB010] transition-colors"
            />
            {Boolean(searchQuery) && (
              <button
                type="button"
                onClick={() => onSearchChange('')}
                className="absolute right-2.5 text-[#7D6843] hover:text-[#2B251A] dark:text-[#6E8299] dark:hover:text-[#FFF9E8] p-0.5 rounded-full"
                aria-label={locale === 'zh-TW' ? '清除搜尋' : 'Clear search'}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}

        {/* Right: Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {onOpenPresetCatalog && (
            <button
              type="button"
              onClick={onOpenPresetCatalog}
              aria-label={locale === 'zh-TW' ? '常用耗材範本庫' : 'Templates'}
              title={locale === 'zh-TW' ? '常用耗材範本庫' : 'Templates'}
              className="bg-[#FFF9E8] dark:bg-[#182230] border border-[#CDB57A] dark:border-[#2E3F54] text-[#2B251A] dark:text-[#FFF9E8] hover:bg-[#FFF0CC] dark:hover:bg-[#212E40] h-9 px-2 sm:px-2.5 flex items-center gap-1 rounded-xl text-xs font-semibold tactile-press transition-colors shadow-2xs"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#17324D] dark:text-[#FFD166]" />
              <span className="hidden sm:inline">{locale === 'zh-TW' ? '範本庫' : 'Templates'}</span>
            </button>
          )}

          {onOpenBatchPhoto && (
            <button
              type="button"
              onClick={onOpenBatchPhoto}
              aria-label={t('batchIntake')}
              title={t('batchIntake')}
              className="bg-[#FFF9E8] dark:bg-[#182230] border border-[#CDB57A] dark:border-[#2E3F54] text-[#2B251A] dark:text-[#FFF9E8] hover:bg-[#FFF0CC] dark:hover:bg-[#212E40] h-9 px-2 sm:px-2.5 flex items-center gap-1 rounded-xl text-xs font-semibold tactile-press transition-colors shadow-2xs"
            >
              <Camera className="w-3.5 h-3.5 text-[#17324D] dark:text-[#FFD166]" />
              <span className="hidden sm:inline">{t('batchIntake')}</span>
            </button>
          )}

          <button
            onClick={onOpenNewItem}
            aria-label={t('addItem')}
            className="bg-[#17324D] text-[#FFF9E8] hover:bg-[#1E3F60] dark:bg-[#FFB010] dark:text-[#2B251A] dark:hover:bg-[#FFC038] h-9 flex items-center gap-1.5 active:scale-[0.98] tactile-press px-2.5 sm:px-3.5 rounded-xl shadow-xs text-xs font-semibold transition-all"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span className="hidden min-[360px]:inline">{locale === 'zh-TW' ? '買了新東西' : t('addItem')}</span>
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
