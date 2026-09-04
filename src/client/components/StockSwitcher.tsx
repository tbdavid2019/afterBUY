import React, { useState } from 'react';
import {
  ChevronDown,
  Sparkles,
  Check,
  Plus,
  UserPlus,
  Settings,
  X,
  Users,
  Loader2,
} from 'lucide-react';
import { StockResponse } from '../../shared/types.ts';
import { useTranslation } from '../i18n/index.tsx';
import { api } from '../api.ts';

const STOCK_ICONS = ['🏠', '⚡', '🧴', '🍳', '🚗', '💼', '🌿', '🛠️', '👶', '🐾'];

interface StockSwitcherProps {
  currentStockId: string;
  stocks: StockResponse[];
  onSelectStock: (stockId: string) => void;
  onOpenStockSettings: (stockId: string) => void;
  onRefreshStocks: () => Promise<void> | void;
}

export const StockSwitcher: React.FC<StockSwitcherProps> = ({
  currentStockId,
  stocks,
  onSelectStock,
  onOpenStockSettings,
  onRefreshStocks,
}) => {
  const { t, locale } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<'list' | 'create' | 'join'>('list');

  // Create Stock Form State
  const [newName, setNewName] = useState('');
  const [newIcon, setNewIcon] = useState('🏠');
  const [newDesc, setNewDesc] = useState('');
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState('');

  // Join Stock Form State
  const [joinCode, setJoinCode] = useState('');
  const [joinLoading, setJoinLoading] = useState(false);
  const [joinError, setJoinError] = useState('');

  const activeStock = currentStockId === 'all' ? null : stocks.find((s) => s.id === currentStockId);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreateLoading(true);
    setCreateError('');
    try {
      const res = await api.createStock({
        name: newName.trim(),
        icon: newIcon,
        description: newDesc.trim() || undefined,
      });
      await onRefreshStocks();
      onSelectStock(res.stock.id);
      setNewName('');
      setNewDesc('');
      setMode('list');
      setIsOpen(false);
    } catch (err: any) {
      setCreateError(err.message || (locale === 'zh-TW' ? '建立失敗' : 'Failed to create'));
    } finally {
      setCreateLoading(false);
    }
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim()) return;
    setJoinLoading(true);
    setJoinError('');
    try {
      const res = await api.joinStock(joinCode.trim().toUpperCase());
      await onRefreshStocks();
      onSelectStock(res.stock.id);
      setJoinCode('');
      setMode('list');
      setIsOpen(false);
    } catch (err: any) {
      setJoinError(err.message || (locale === 'zh-TW' ? '加入失敗，請檢查邀請碼' : 'Failed to join. Invalid code'));
    } finally {
      setJoinLoading(false);
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'owner':
        return { label: t('roleOwner'), color: 'bg-amber-500/15 text-amber-300 border-amber-500/30' };
      case 'admin':
        return { label: t('roleAdmin'), color: 'bg-sky-500/15 text-sky-300 border-sky-500/30' };
      case 'member':
        return { label: t('roleMember'), color: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' };
      case 'viewer':
      default:
        return { label: t('roleViewer'), color: 'bg-purple-500/15 text-purple-300 border-purple-500/30' };
    }
  };

  return (
    <>
      {/* Trigger Capsule Button */}
      <button
        type="button"
        onClick={() => {
          setMode('list');
          setIsOpen(true);
        }}
        aria-label={t('switchStock')}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-sky-400/30 bg-sky-950/40 hover:bg-sky-900/50 active:scale-[0.97] transition-all text-xs font-semibold text-sky-200"
      >
        <span>{activeStock ? activeStock.icon : '🌟'}</span>
        <span className="max-w-[110px] sm:max-w-[140px] truncate">
          {activeStock ? activeStock.name : t('allStocks')}
        </span>
        <ChevronDown className="w-3 h-3 text-sky-400 shrink-0 opacity-80" />
      </button>

      {/* Drawer / Modal Dialog */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            className="w-full sm:max-w-md bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in slide-in-from-bottom duration-250 pb-safe"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-900/80">
              <div className="flex items-center gap-2">
                <span className="text-base">📦</span>
                <h3 className="font-bold text-white text-base">
                  {mode === 'create'
                    ? t('createStock')
                    : mode === 'join'
                    ? t('joinStock')
                    : t('switchStock')}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-4 overflow-y-auto space-y-3 flex-1">
              {mode === 'list' && (
                <>
                  {/* Option 1: All Stocks (Default) */}
                  <button
                    type="button"
                    onClick={() => {
                      onSelectStock('all');
                      setIsOpen(false);
                    }}
                    className={`w-full flex items-center justify-between p-3.5 rounded-2xl border transition-all text-left ${
                      currentStockId === 'all'
                        ? 'border-sky-500/80 bg-sky-950/30 text-white'
                        : 'border-slate-800 bg-slate-800/50 hover:bg-slate-800 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-sky-500/20 border border-sky-500/30 flex items-center justify-center text-lg">
                        🌟
                      </div>
                      <div>
                        <div className="font-bold text-sm text-white flex items-center gap-1.5">
                          <span>{t('allStocks')}</span>
                          <span className="text-[10px] font-semibold text-sky-300 bg-sky-950 px-1.5 py-0.5 rounded-full border border-sky-400/20">
                            {locale === 'zh-TW' ? '總覽' : 'Aggregate'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">{t('allStocksDesc')}</p>
                      </div>
                    </div>
                    {currentStockId === 'all' && (
                      <Check className="w-5 h-5 text-sky-400 stroke-[2.5]" />
                    )}
                  </button>

                  <div className="pt-2 pb-1 flex items-center justify-between text-xs font-semibold text-slate-400 px-1">
                    <span>{t('myStocks')}</span>
                    <span className="text-[11px] text-slate-500">{stocks.length} 個</span>
                  </div>

                  {/* Stock List */}
                  <div className="space-y-2">
                    {stocks.map((stock) => {
                      const isSelected = currentStockId === stock.id;
                      const roleMeta = getRoleLabel(stock.myRole);

                      return (
                        <div
                          key={stock.id}
                          className={`flex items-center justify-between p-3 rounded-2xl border transition-all ${
                            isSelected
                              ? 'border-sky-500/80 bg-sky-950/30 text-white'
                              : 'border-slate-800 bg-slate-800/40 hover:bg-slate-800/70 text-slate-300'
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => {
                              onSelectStock(stock.id);
                              setIsOpen(false);
                            }}
                            className="flex-1 flex items-center gap-3 text-left min-w-0 pr-2"
                          >
                            <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-lg shrink-0">
                              {stock.icon}
                            </div>
                            <div className="min-w-0">
                              <div className="font-bold text-sm text-white truncate flex items-center gap-2">
                                <span className="truncate">{stock.name}</span>
                                <span
                                  className={`text-[10px] font-medium px-1.5 py-0.5 rounded-md border shrink-0 ${roleMeta.color}`}
                                >
                                  {roleMeta.label}
                                </span>
                              </div>
                              <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                                {stock.description && (
                                  <span className="truncate max-w-[140px] text-slate-500">
                                    {stock.description}
                                  </span>
                                )}
                                <span className="flex items-center gap-1 text-[11px] text-slate-400 shrink-0">
                                  <Users className="w-3 h-3 text-slate-500" />
                                  <span>{stock.memberCount || 1}</span>
                                </span>
                              </div>
                            </div>
                          </button>

                          <div className="flex items-center gap-1.5 shrink-0">
                            {isSelected && (
                              <Check className="w-4 h-4 text-sky-400 stroke-[2.5] mr-1" />
                            )}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setIsOpen(false);
                                onOpenStockSettings(stock.id);
                              }}
                              aria-label={t('stockSettings')}
                              className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
                            >
                              <Settings className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Actions Footer */}
                  <div className="pt-3 grid grid-cols-2 gap-2 border-t border-slate-800">
                    <button
                      type="button"
                      onClick={() => {
                        setCreateError('');
                        setMode('create');
                      }}
                      className="flex items-center justify-center gap-1.5 p-2.5 rounded-xl border border-sky-500/30 bg-sky-950/30 hover:bg-sky-900/40 text-sky-300 text-xs font-bold transition-all"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{t('createStock')}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setJoinError('');
                        setMode('join');
                      }}
                      className="flex items-center justify-center gap-1.5 p-2.5 rounded-xl border border-slate-700 bg-slate-800/60 hover:bg-slate-800 text-slate-200 text-xs font-bold transition-all"
                    >
                      <UserPlus className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{t('joinStock')}</span>
                    </button>
                  </div>
                </>
              )}

              {/* Mode: Create Stock */}
              {mode === 'create' && (
                <form onSubmit={handleCreate} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      {t('stockIcon')}
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {STOCK_ICONS.map((icon) => (
                        <button
                          key={icon}
                          type="button"
                          onClick={() => setNewIcon(icon)}
                          className={`w-9 h-9 rounded-xl text-lg flex items-center justify-center border transition-all ${
                            newIcon === icon
                              ? 'bg-sky-500/20 border-sky-400 scale-105'
                              : 'bg-slate-800 border-slate-700 hover:bg-slate-700'
                          }`}
                        >
                          {icon}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      {t('stockName')} *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder={locale === 'zh-TW' ? '例：甜蜜的家、電子工作室、露營裝備' : 'e.g., Sweet Home, Workshop'}
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-400"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      {t('stockDesc')}
                    </label>
                    <input
                      type="text"
                      placeholder={locale === 'zh-TW' ? '選填，簡短說明' : 'Optional description'}
                      value={newDesc}
                      onChange={(e) => setNewDesc(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-400"
                    />
                  </div>

                  {createError && (
                    <div className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-xl p-2.5">
                      {createError}
                    </div>
                  )}

                  <div className="flex items-center gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setMode('list')}
                      className="flex-1 py-2.5 rounded-xl border border-slate-700 text-xs font-bold text-slate-300 hover:bg-slate-800"
                    >
                      {t('cancel')}
                    </button>
                    <button
                      type="submit"
                      disabled={createLoading || !newName.trim()}
                      className="flex-1 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-slate-950 text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
                    >
                      {createLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                      <span>{t('createStock')}</span>
                    </button>
                  </div>
                </form>
              )}

              {/* Mode: Join Stock */}
              {mode === 'join' && (
                <form onSubmit={handleJoin} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      {t('inviteCode')} (8 碼英數字)
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={12}
                      placeholder="e.g. A1B2C3D4"
                      value={joinCode}
                      onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                      className="w-full font-mono uppercase tracking-widest text-center text-lg bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-sky-400"
                    />
                    <p className="text-[11px] text-slate-400 mt-1.5">
                      {locale === 'zh-TW'
                        ? '輸入備品庫成員提供給您的 8 碼邀請代碼。'
                        : 'Enter the 8-character invite code provided by a stock member.'}
                    </p>
                  </div>

                  {joinError && (
                    <div className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-xl p-2.5">
                      {joinError}
                    </div>
                  )}

                  <div className="flex items-center gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setMode('list')}
                      className="flex-1 py-2.5 rounded-xl border border-slate-700 text-xs font-bold text-slate-300 hover:bg-slate-800"
                    >
                      {t('cancel')}
                    </button>
                    <button
                      type="submit"
                      disabled={joinLoading || !joinCode.trim()}
                      className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
                    >
                      {joinLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserPlus className="w-3.5 h-3.5" />}
                      <span>{t('joinStock')}</span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
