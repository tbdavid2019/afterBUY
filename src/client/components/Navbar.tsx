import React from 'react';
import { Layers, CalendarDays, ShoppingBag, Settings2 } from 'lucide-react';
import { useTranslation } from '../i18n/index.tsx';

export type NavTab = 'dashboard' | 'timeline' | 'shopping' | 'settings';

interface NavbarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  overdueCount: number;
  restockCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onSelectTab,
  overdueCount,
  restockCount,
}) => {
  const { t } = useTranslation();

  return (
    <nav aria-label="主要導覽" className="app-navbar fixed bottom-0 left-0 right-0 z-40 backdrop-blur-md border-t pb-safe">
      <div className="max-w-3xl mx-auto flex items-center justify-around min-h-[4.25rem] px-2 sm:px-6">
        {/* 1. Dashboard Tab */}
        <button
          onClick={() => onSelectTab('dashboard')}
          aria-label={t('navDashboard')}
          aria-current={currentTab === 'dashboard' ? 'page' : undefined}
          className={`app-nav-item relative flex flex-col items-center justify-center flex-1 min-h-11 max-w-[6rem] rounded-lg py-1 tactile-press ${
            currentTab === 'dashboard'
              ? 'app-nav-item-active font-semibold'
              : 'text-[var(--app-muted)] [@media(hover:hover)]:hover:bg-[var(--app-surface-subtle)] [@media(hover:hover)]:hover:text-[var(--app-text)] font-medium'
          }`}
        >
          <div className="relative">
            <Layers className="w-5 h-5 mb-0.5" />
            {overdueCount > 0 && (
              <span className="absolute -top-1.5 -right-2.5 min-w-5 h-5 px-1 bg-rose-500 text-white rounded-full flex items-center justify-center font-bold text-[11px] leading-none shadow-sm tabular-nums">
                {overdueCount > 9 ? '9+' : overdueCount}
              </span>
            )}
          </div>
          <span className="text-xs tracking-tight">{t('navDashboard')}</span>
        </button>

        {/* 2. Timeline Tab */}
        <button
          onClick={() => onSelectTab('timeline')}
          aria-label={t('navCalendar')}
          aria-current={currentTab === 'timeline' ? 'page' : undefined}
          className={`app-nav-item relative flex flex-col items-center justify-center flex-1 min-h-11 max-w-[6rem] rounded-lg py-1 tactile-press ${
            currentTab === 'timeline'
              ? 'app-nav-item-active font-semibold'
              : 'text-[var(--app-muted)] [@media(hover:hover)]:hover:bg-[var(--app-surface-subtle)] [@media(hover:hover)]:hover:text-[var(--app-text)] font-medium'
          }`}
        >
          <CalendarDays className="w-5 h-5 mb-0.5" />
          <span className="text-xs tracking-tight">{t('navCalendar')}</span>
        </button>

        {/* 3. Shopping / Stock Tab */}
        <button
          onClick={() => onSelectTab('shopping')}
          aria-label={t('navShopping')}
          aria-current={currentTab === 'shopping' ? 'page' : undefined}
          className={`app-nav-item relative flex flex-col items-center justify-center flex-1 min-h-11 max-w-[6rem] rounded-lg py-1 tactile-press ${
            currentTab === 'shopping'
              ? 'app-nav-item-active font-semibold'
              : 'text-[var(--app-muted)] [@media(hover:hover)]:hover:bg-[var(--app-surface-subtle)] [@media(hover:hover)]:hover:text-[var(--app-text)] font-medium'
          }`}
        >
          <div className="relative">
            <ShoppingBag className="w-5 h-5 mb-0.5" />
            {restockCount > 0 && (
              <span className="absolute -top-1.5 -right-2.5 min-w-5 h-5 px-1 bg-amber-500 text-slate-950 rounded-full flex items-center justify-center font-bold text-[11px] leading-none shadow-sm tabular-nums">
                {restockCount > 9 ? '9+' : restockCount}
              </span>
            )}
          </div>
          <span className="text-xs tracking-tight">{t('navShopping')}</span>
        </button>

        {/* 4. Settings Tab */}
        <button
          onClick={() => onSelectTab('settings')}
          aria-label={t('navSettings')}
          aria-current={currentTab === 'settings' ? 'page' : undefined}
          className={`app-nav-item relative flex flex-col items-center justify-center flex-1 min-h-11 max-w-[6rem] rounded-lg py-1 tactile-press ${
            currentTab === 'settings'
              ? 'app-nav-item-active font-semibold'
              : 'text-[var(--app-muted)] [@media(hover:hover)]:hover:bg-[var(--app-surface-subtle)] [@media(hover:hover)]:hover:text-[var(--app-text)] font-medium'
          }`}
        >
          <Settings2 className="w-5 h-5 mb-0.5" />
          <span className="text-xs tracking-tight">{t('navSettings')}</span>
        </button>
      </div>
    </nav>
  );
};
