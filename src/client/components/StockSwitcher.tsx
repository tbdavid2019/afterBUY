import React, { useState } from 'react';
import { createPortal } from 'react-dom';
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

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'owner':
        return {
          label: t('roleOwner'),
          cls: 'bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/30',
        };
      case 'admin':
        return {
          label: t('roleAdmin'),
          cls: 'bg-sky-500/15 text-sky-800 dark:text-sky-300 border-sky-500/30',
        };
      case 'member':
        return {
          label: t('roleMember'),
          cls: 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border-emerald-500/30',
        };
      case 'viewer':
      default:
        return {
          label: t('roleViewer'),
          cls: 'bg-purple-500/15 text-purple-800 dark:text-purple-300 border-purple-500/30',
        };
    }
  };

  const modalContent = isOpen && (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={() => setIsOpen(false)}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="app-surface border border-[var(--app-border)] rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col w-full sm:max-w-md max-h-[85vh] animate-in slide-in-from-bottom duration-250 pb-safe"
      >
        {/* Mobile handle pull bar */}
        <div className="sm:hidden pt-3 flex justify-center">
          <div className="w-10 h-1.5 rounded-full bg-[var(--app-border)] opacity-80" />
        </div>

        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[var(--app-border)] bg-[var(--app-surface)]">
          <div className="flex items-center gap-2">
            <span className="text-base">📦</span>
            <h3 className="font-bold text-[var(--app-text)] text-base">
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
            aria-label="Close"
            className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--app-muted)] hover:text-[var(--app-text)] hover:bg-[var(--app-surface-subtle)] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 overflow-y-auto space-y-3 flex-1 text-[var(--app-text)]">
          {mode === 'list' && (
            <>
              {/* Option 1: All Stocks (Default Aggregated View) */}
              <button
                type="button"
                onClick={() => {
                  onSelectStock('all');
                  setIsOpen(false);
                }}
                className={`w-full flex items-center justify-between p-3.5 rounded-2xl border transition-all text-left ${
                  currentStockId === 'all'
                    ? 'border-[var(--app-accent)] bg-[var(--app-accent-soft)] shadow-sm'
                    : 'border-[var(--app-border)] bg-[var(--app-surface)] hover:bg-[var(--app-surface-subtle)]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[var(--app-surface-subtle)] border border-[var(--app-border)] flex items-center justify-center text-lg shrink-0">
                    🌟
                  </div>
                  <div>
                    <div className="font-bold text-sm text-[var(--app-text)] flex items-center gap-1.5">
                      <span>{t('allStocks')}</span>
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full border border-[var(--app-border)] bg-[var(--app-surface-subtle)] text-[var(--app-muted)]">
                        {locale === 'zh-TW' ? '總覽' : 'All'}
                      </span>
                    </div>
                    <p className="text-xs text-[var(--app-muted)] mt-0.5">{t('allStocksDesc')}</p>
                  </div>
                </div>
                {currentStockId === 'all' && (
                  <Check className="w-5 h-5 text-[var(--app-accent-strong)] stroke-[2.5]" />
                )}
              </button>

              <div className="pt-2 pb-1 flex items-center justify-between text-xs font-semibold text-[var(--app-muted)] px-1">
                <span>{t('myStocks')}</span>
                <span className="text-[11px] text-[var(--app-muted-low)]">{stocks.length} 個</span>
              </div>

              {/* Stock List */}
              <div className="space-y-2">
                {stocks.map((stock) => {
                  const isSelected = currentStockId === stock.id;
                  const roleMeta = getRoleBadge(stock.myRole);

                  return (
                    <div
                      key={stock.id}
                      className={`flex items-center justify-between p-3 rounded-2xl border transition-all ${
                        isSelected
                          ? 'border-[var(--app-accent)] bg-[var(--app-accent-soft)] shadow-sm'
                          : 'border-[var(--app-border)] bg-[var(--app-surface)] hover:bg-[var(--app-surface-subtle)]'
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
                        <div className="w-10 h-10 rounded-xl bg-[var(--app-surface-subtle)] border border-[var(--app-border)] flex items-center justify-center text-lg shrink-0">
                          {stock.icon}
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-sm text-[var(--app-text)] truncate flex items-center gap-2">
                            <span className="truncate">{stock.name}</span>
                            <span
                              className={`text-[10px] font-medium px-1.5 py-0.5 rounded-md border shrink-0 ${roleMeta.cls}`}
                            >
                              {roleMeta.label}
                            </span>
                          </div>
                          <div className="text-xs text-[var(--app-muted)] flex items-center gap-2 mt-0.5">
                            {stock.description && (
                              <span className="truncate max-w-[140px] text-[var(--app-muted-low)]">
                                {stock.description}
                              </span>
                            )}
                            <span className="flex items-center gap-1 text-[11px] text-[var(--app-muted)] shrink-0">
                              <Users className="w-3 h-3 opacity-70" />
                              <span>{stock.memberCount || 1}</span>
                            </span>
                          </div>
                        </div>
                      </button>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {isSelected && (
                          <Check className="w-4 h-4 text-[var(--app-accent-strong)] stroke-[2.5] mr-1" />
                        )}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setIsOpen(false);
                            onOpenStockSettings(stock.id);
                          }}
                          aria-label={t('stockSettings')}
                          className="w-8 h-8 rounded-xl flex items-center justify-center text-[var(--app-muted)] hover:text-[var(--app-text)] hover:bg-[var(--app-surface-subtle)] transition-colors"
                        >
                          <Settings className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Actions Footer */}
              <div className="pt-3 grid grid-cols-2 gap-2 border-t border-[var(--app-border)]">
                <button
                  type="button"
                  onClick={() => {
                    setCreateError('');
                    setMode('create');
                  }}
                  className="app-primary flex items-center justify-center gap-1.5 p-2.5 rounded-xl text-xs font-bold transition-all shadow-sm active:scale-[0.98]"
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
                  className="app-control flex items-center justify-center gap-1.5 p-2.5 rounded-xl border text-xs font-bold transition-all hover:border-[var(--app-accent)] active:scale-[0.98]"
                >
                  <UserPlus className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>{t('joinStock')}</span>
                </button>
              </div>
            </>
          )}

          {/* Mode: Create Stock */}
          {mode === 'create' && (
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[var(--app-text)] mb-1.5">
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
                          ? 'bg-[var(--app-accent-soft)] border-[var(--app-accent)] scale-105 shadow-sm'
                          : 'bg-[var(--app-surface-subtle)] border-[var(--app-border)] hover:bg-[var(--app-surface)]'
                      }`}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--app-text)] mb-1">
                  {t('stockName')} *
                </label>
                <input
                  type="text"
                  required
                  placeholder={locale === 'zh-TW' ? '例：甜蜜的家、電子工作室、露營裝備' : 'e.g., Sweet Home, Workshop'}
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full bg-[var(--app-bg)] border border-[var(--app-border)] rounded-xl px-3.5 py-2.5 text-sm text-[var(--app-text)] focus:outline-none focus:border-[var(--app-accent)] placeholder:text-[var(--app-muted-low)]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--app-text)] mb-1">
                  {t('stockDesc')}
                </label>
                <input
                  type="text"
                  placeholder={locale === 'zh-TW' ? '選填，簡短說明' : 'Optional description'}
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="w-full bg-[var(--app-bg)] border border-[var(--app-border)] rounded-xl px-3.5 py-2.5 text-sm text-[var(--app-text)] focus:outline-none focus:border-[var(--app-accent)] placeholder:text-[var(--app-muted-low)]"
                />
              </div>

              {createError && (
                <div className="text-xs text-rose-600 dark:text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-xl p-2.5">
                  {createError}
                </div>
              )}

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setMode('list')}
                  className="app-control flex-1 py-2.5 rounded-xl border text-xs font-bold"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  disabled={createLoading || !newName.trim()}
                  className="app-primary flex-1 py-2.5 rounded-xl disabled:opacity-50 text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-sm"
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
                <label className="block text-xs font-semibold text-[var(--app-text)] mb-1">
                  {t('inviteCode')} (8 碼英數字)
                </label>
                <input
                  type="text"
                  required
                  maxLength={12}
                  placeholder="e.g. A1B2C3D4"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  className="w-full font-mono uppercase tracking-widest text-center text-lg bg-[var(--app-bg)] border border-[var(--app-border)] rounded-xl px-3 py-2.5 text-[var(--app-text)] focus:outline-none focus:border-[var(--app-accent)]"
                />
                <p className="text-[11px] text-[var(--app-muted)] mt-1.5">
                  {locale === 'zh-TW'
                    ? '輸入備品庫成員提供給您的 8 碼邀請代碼。'
                    : 'Enter the 8-character invite code provided by a stock member.'}
                </p>
              </div>

              {joinError && (
                <div className="text-xs text-rose-600 dark:text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-xl p-2.5">
                  {joinError}
                </div>
              )}

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setMode('list')}
                  className="app-control flex-1 py-2.5 rounded-xl border text-xs font-bold"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  disabled={joinLoading || !joinCode.trim()}
                  className="app-primary flex-1 py-2.5 rounded-xl disabled:opacity-50 text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-sm"
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
  );

  return (
    <>
      {/* Trigger Capsule Button in Header */}
      <button
        type="button"
        onClick={() => {
          setMode('list');
          setIsOpen(true);
        }}
        aria-label={t('switchStock')}
        className="app-control inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-semibold hover:border-[var(--app-accent)] transition-all active:scale-[0.97]"
      >
        <span className="text-sm">{activeStock ? activeStock.icon : '🌟'}</span>
        <span className="max-w-[110px] sm:max-w-[150px] truncate text-[var(--app-text)]">
          {activeStock ? activeStock.name : t('allStocks')}
        </span>
        <ChevronDown className="w-3 h-3 text-[var(--app-muted)] shrink-0 opacity-80" />
      </button>

      {/* Render via Portal to document.body so it NEVER gets trapped in header's backdrop-filter */}
      {typeof document !== 'undefined' && modalContent ? createPortal(modalContent, document.body) : null}
    </>
  );
};
