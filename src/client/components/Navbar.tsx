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
    <nav aria-label="主要導覽" className="fixed bottom-0 left-0 right-0 z-40 px-3 pb-safe pointer-events-none mb-1 sm:mb-3">
      <div className="max-w-lg mx-auto pointer-events-auto backdrop-blur-xl bg-white/95 dark:bg-slate-900/95 border border-slate-200/90 dark:border-slate-800/90 shadow-[0_10px_35px_rgb(0,0,0,0.1)] dark:shadow-[0_10px_35px_rgb(0,0,0,0.4)] rounded-2xl flex items-center justify-around min-h-[4.25rem] px-3 py-1.5">
        {/* 1. Dashboard Tab */}
        <button
          onClick={() => onSelectTab('dashboard')}
          aria-label={t('navDashboard')}
          aria-current={currentTab === 'dashboard' ? 'page' : undefined}
          className={`app-nav-item relative flex flex-col items-center justify-center flex-1 min-h-12 max-w-[6.2rem] rounded-xl py-1 transition-all tactile-press ${
            currentTab === 'dashboard'
              ? 'app-nav-item-active font-bold text-[var(--app-accent-strong)] dark:text-white'
              : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 font-semibold'
          }`}
        >
          <div className="relative">
            <Layers className="w-5 h-5 sm:w-5.5 sm:h-5.5 mb-1" />
            {overdueCount > 0 && (
              <span className="absolute -top-1.5 -right-2.5 min-w-5 h-5 px-1 bg-rose-500 text-white rounded-full flex items-center justify-center font-bold text-xs leading-none shadow-sm tabular-nums">
                {overdueCount > 9 ? '9+' : overdueCount}
              </span>
            )}
          </div>
          <span className="text-xs sm:text-[13px] font-bold tracking-normal">{t('navDashboard')}</span>
        </button>

        {/* 2. Timeline Tab */}
        <button
          onClick={() => onSelectTab('timeline')}
          aria-label={t('navCalendar')}
          aria-current={currentTab === 'timeline' ? 'page' : undefined}
          className={`app-nav-item relative flex flex-col items-center justify-center flex-1 min-h-12 max-w-[6.2rem] rounded-xl py-1 transition-all tactile-press ${
            currentTab === 'timeline'
              ? 'app-nav-item-active font-bold text-[var(--app-accent-strong)] dark:text-white'
              : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 font-semibold'
          }`}
        >
          <CalendarDays className="w-5 h-5 sm:w-5.5 sm:h-5.5 mb-1" />
          <span className="text-xs sm:text-[13px] font-bold tracking-normal">{t('navCalendar')}</span>
        </button>

        {/* 3. Shopping / Stock Tab */}
        <button
          onClick={() => onSelectTab('shopping')}
          aria-label={t('navShopping')}
          aria-current={currentTab === 'shopping' ? 'page' : undefined}
          className={`app-nav-item relative flex flex-col items-center justify-center flex-1 min-h-12 max-w-[6.2rem] rounded-xl py-1 transition-all tactile-press ${
            currentTab === 'shopping'
              ? 'app-nav-item-active font-bold text-[var(--app-accent-strong)] dark:text-white'
              : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 font-semibold'
          }`}
        >
          <div className="relative">
            <ShoppingBag className="w-5 h-5 sm:w-5.5 sm:h-5.5 mb-1" />
            {restockCount > 0 && (
              <span className="absolute -top-1.5 -right-2.5 min-w-5 h-5 px-1 bg-amber-500 text-amber-950 rounded-full flex items-center justify-center font-bold text-xs leading-none shadow-sm tabular-nums">
                {restockCount > 9 ? '9+' : restockCount}
              </span>
            )}
          </div>
          <span className="text-xs sm:text-[13px] font-bold tracking-normal">{t('navShopping')}</span>
        </button>

        {/* 4. Settings Tab */}
        <button
          onClick={() => onSelectTab('settings')}
          aria-label={t('navSettings')}
          aria-current={currentTab === 'settings' ? 'page' : undefined}
          className={`app-nav-item relative flex flex-col items-center justify-center flex-1 min-h-12 max-w-[6.2rem] rounded-xl py-1 transition-all tactile-press ${
            currentTab === 'settings'
              ? 'app-nav-item-active font-bold text-[var(--app-accent-strong)] dark:text-white'
              : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 font-semibold'
          }`}
        >
          <Settings2 className="w-5 h-5 sm:w-5.5 sm:h-5.5 mb-1" />
          <span className="text-xs sm:text-[13px] font-bold tracking-normal">{t('navSettings')}</span>
        </button>
      </div>
    </nav>
  );
};
