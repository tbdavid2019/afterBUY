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
      <div className="max-w-md md:max-w-3xl mx-auto flex items-center justify-around h-[4.25rem] px-2 sm:px-6">
        {/* 1. Dashboard Tab */}
        <button
          onClick={() => onSelectTab('dashboard')}
          aria-label={t('navDashboard')}
          aria-current={currentTab === 'dashboard' ? 'page' : undefined}
          className={`app-nav-item relative flex flex-col items-center justify-center flex-1 h-12 max-w-[5rem] rounded-2xl transition-all duration-200 active:scale-[0.97] ${
            currentTab === 'dashboard' ? 'app-nav-item-active font-semibold' : 'text-slate-300 hover:bg-slate-900 hover:text-white'
          }`}
        >
          <div className="relative">
            <Layers className="w-5 h-5 mb-0.5 transition-transform active:scale-90" />
            {overdueCount > 0 && (
              <span className="absolute -top-1 -right-2 w-4 h-4 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
                {overdueCount > 9 ? '9+' : overdueCount}
              </span>
            )}
          </div>
          <span className="text-[11px] tracking-tight">{t('navDashboard')}</span>
        </button>

        {/* 2. Timeline Tab */}
        <button
          onClick={() => onSelectTab('timeline')}
          aria-label={t('navCalendar')}
          aria-current={currentTab === 'timeline' ? 'page' : undefined}
          className={`app-nav-item relative flex flex-col items-center justify-center flex-1 h-12 max-w-[5rem] rounded-2xl transition-all duration-200 active:scale-[0.97] ${
            currentTab === 'timeline' ? 'app-nav-item-active font-semibold' : 'text-slate-300 hover:bg-slate-900 hover:text-white'
          }`}
        >
          <CalendarDays className="w-5 h-5 mb-0.5 transition-transform active:scale-90" />
          <span className="text-[11px] tracking-tight">{t('navCalendar')}</span>
        </button>

        {/* 3. Shopping / Stock Tab */}
        <button
          onClick={() => onSelectTab('shopping')}
          aria-label={t('navShopping')}
          aria-current={currentTab === 'shopping' ? 'page' : undefined}
          className={`app-nav-item relative flex flex-col items-center justify-center flex-1 h-12 max-w-[5rem] rounded-2xl transition-all duration-200 active:scale-[0.97] ${
            currentTab === 'shopping' ? 'app-nav-item-active font-semibold' : 'text-slate-300 hover:bg-slate-900 hover:text-white'
          }`}
        >
          <div className="relative">
            <ShoppingBag className="w-5 h-5 mb-0.5 transition-transform active:scale-90" />
            {restockCount > 0 && (
              <span className="absolute -top-1 -right-2 w-4 h-4 bg-amber-500 text-amber-950 text-[10px] font-bold rounded-full flex items-center justify-center">
                {restockCount > 9 ? '9+' : restockCount}
              </span>
            )}
          </div>
          <span className="text-[11px] tracking-tight">{t('navShopping')}</span>
        </button>

        {/* 4. Settings Tab */}
        <button
          onClick={() => onSelectTab('settings')}
          aria-label={t('navSettings')}
          aria-current={currentTab === 'settings' ? 'page' : undefined}
          className={`app-nav-item relative flex flex-col items-center justify-center flex-1 h-12 max-w-[5rem] rounded-2xl transition-all duration-200 active:scale-[0.97] ${
            currentTab === 'settings' ? 'app-nav-item-active font-semibold' : 'text-slate-300 hover:bg-slate-900 hover:text-white'
          }`}
        >
          <Settings2 className="w-5 h-5 mb-0.5 transition-transform active:scale-90" />
          <span className="text-[11px] tracking-tight">{t('navSettings')}</span>
        </button>
      </div>
    </nav>
  );
};
