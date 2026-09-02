import React from 'react';
import { Plus, Fingerprint, Moon, Sun } from 'lucide-react';
import { UserSession } from '../../shared/types.ts';
import type { ThemeMode } from '../utils/theme.ts';

interface HeaderProps {
  user: UserSession | null;
  onOpenAuth: () => void;
  onOpenNewItem: () => void;
  theme: ThemeMode;
  onToggleTheme: () => void;
}

export const Header: React.FC<HeaderProps> = ({ user, onOpenAuth, onOpenNewItem, theme, onToggleTheme }) => {
  return (
    <header className="app-header sticky top-0 z-30 backdrop-blur-md border-b pt-safe">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Logo & Slogan */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-sky-300 flex items-center justify-center shadow-[0_8px_24px_-10px_rgba(56,189,248,0.8)]">
            <span className="text-slate-950 font-black text-sm tracking-tight">aB</span>
          </div>
          <div>
            <h1 className="text-[15px] font-bold tracking-tight text-white flex items-center gap-1.5">
              afterBUY
              <span className="text-[9px] font-bold tracking-[0.12em] uppercase text-sky-300 border border-sky-400/25 px-1.5 py-0.5 rounded-full">
                PWA
              </span>
            </h1>
            <p className="text-[11px] text-slate-500 mt-0.5">日常保養清單</p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onToggleTheme}
            aria-label={theme === 'light' ? '切換至青花瓷藍深色模式' : '切換至無印良品淺色模式'}
            className="app-control w-9 h-9 flex items-center justify-center rounded-xl border text-slate-400 hover:text-white transition-colors active:scale-[0.96]"
          >
            {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
          </button>
          {user ? (
            <button
              onClick={onOpenNewItem}
              aria-label="新增追蹤物品"
              className="app-primary flex items-center gap-1.5 hover:brightness-105 active:scale-[0.98] text-xs font-bold px-3.5 py-2 rounded-full shadow-md shadow-sky-500/20 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>新增物品</span>
            </button>
          ) : (
            <button
              onClick={onOpenAuth}
              aria-label="登入或註冊帳戶"
              className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 active:scale-[0.98] text-sky-300 border border-sky-400/35 text-xs font-bold px-3.5 py-2 rounded-full transition-all"
            >
              <Fingerprint className="w-4 h-4" />
              <span>登入 / 註冊</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
