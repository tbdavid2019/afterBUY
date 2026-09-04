import React, { useState, useEffect } from 'react';
import {
  X,
  Users,
  Shield,
  Trash2,
  LogOut,
  Copy,
  Check,
  Plus,
  Loader2,
  AlertTriangle,
  ArrowRightLeft,
  Settings,
  UserCheck,
} from 'lucide-react';
import { StockResponse, StockMemberResponse, StockInviteResponse, StockRole, UserSession } from '../../shared/types.ts';
import { useTranslation } from '../i18n/index.tsx';
import { api } from '../api.ts';

const STOCK_ICONS = ['🏠', '⚡', '🧴', '🍳', '🚗', '💼', '🌿', '🛠️', '👶', '🐾'];

interface StockSettingsModalProps {
  isOpen: boolean;
  stockId: string | null;
  user: UserSession | null;
  onClose: () => void;
  onStockUpdated: () => void;
  onStockDeleted: () => void;
}

export const StockSettingsModal: React.FC<StockSettingsModalProps> = ({
  isOpen,
  stockId,
  user,
  onClose,
  onStockUpdated,
  onStockDeleted,
}) => {
  const { t, locale } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copiedInvite, setCopiedInvite] = useState(false);

  // Stock Details
  const [stock, setStock] = useState<StockResponse | null>(null);
  const [members, setMembers] = useState<StockMemberResponse[]>([]);
  const [invites, setInvites] = useState<StockInviteResponse[]>([]);

  // Editing state
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('🏠');
  const [description, setDescription] = useState('');
  const [savingDetails, setSavingDetails] = useState(false);

  // Invites state
  const [generatingInvite, setGeneratingInvite] = useState(false);
  const [inviteRole, setInviteRole] = useState<StockRole>('member');

  // Ownership transfer state
  const [showTransferConfirm, setShowTransferConfirm] = useState(false);
  const [transferTargetUserId, setTransferTargetUserId] = useState('');
  const [transferConfirmName, setTransferConfirmName] = useState('');
  const [transferring, setTransferring] = useState(false);

  const isOwner = stock?.myRole === 'owner';
  const isAdminOrOwner = stock?.myRole === 'owner' || stock?.myRole === 'admin';

  const loadStockData = async () => {
    if (!stockId) return;
    setLoading(true);
    setError('');
    try {
      const res = await api.getStock(stockId);
      setStock(res.stock);
      setName(res.stock.name);
      setIcon(res.stock.icon);
      setDescription(res.stock.description || '');
      setMembers(res.members);
      setInvites(res.invites);
    } catch (err: any) {
      setError(err.message || (locale === 'zh-TW' ? '無法載入備品庫資訊' : 'Failed to load stock details'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && stockId) {
      loadStockData();
      setShowTransferConfirm(false);
      setTransferTargetUserId('');
      setTransferConfirmName('');
    }
  }, [isOpen, stockId]);

  if (!isOpen || !stockId) return null;

  const handleSaveDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSavingDetails(true);
    setError('');
    try {
      await api.updateStock(stockId, {
        name: name.trim(),
        icon,
        description: description.trim() || undefined,
      });
      onStockUpdated();
      alert(locale === 'zh-TW' ? '備品庫設定已更新' : 'Stock updated successfully');
    } catch (err: any) {
      setError(err.message || '更新失敗');
    } finally {
      setSavingDetails(false);
    }
  };

  const handleCreateInvite = async () => {
    setGeneratingInvite(true);
    setError('');
    try {
      const res = await api.createInvite(stockId, { role: inviteRole, expiresInDays: 7, maxUses: 10 });
      setInvites((prev) => [res.invite, ...prev]);
    } catch (err: any) {
      setError(err.message || '無法產生邀請碼');
    } finally {
      setGeneratingInvite(false);
    }
  };

  const handleCopyInviteLink = (code: string) => {
    const url = `${window.location.origin}?joinStock=${code}`;
    navigator.clipboard.writeText(url);
    setCopiedInvite(true);
    setTimeout(() => setCopiedInvite(false), 2000);
  };

  const handleChangeMemberRole = async (memberUserId: string, newRole: StockRole) => {
    try {
      await api.updateMemberRole(stockId, memberUserId, newRole);
      setMembers((prev) =>
        prev.map((m) => (m.userId === memberUserId ? { ...m, role: newRole } : m))
      );
    } catch (err: any) {
      alert(err.message || '更改角色失敗');
    }
  };

  const handleRemoveMember = async (memberUserId: string, memberNickname?: string | null) => {
    if (!confirm(locale === 'zh-TW' ? `確定要將成員「${memberNickname || '成員'}」移出此備品庫？` : 'Remove this member?')) {
      return;
    }
    try {
      await api.removeMember(stockId, memberUserId);
      setMembers((prev) => prev.filter((m) => m.userId !== memberUserId));
      onStockUpdated();
    } catch (err: any) {
      alert(err.message || '移除成員失敗');
    }
  };

  const handleTransferOwnership = async () => {
    if (!transferTargetUserId) return;
    if (transferConfirmName.trim() !== stock?.name) {
      alert(locale === 'zh-TW' ? '輸入的備品庫名稱不相符，轉移已取消' : 'Stock name does not match');
      return;
    }

    setTransferring(true);
    setError('');
    try {
      await api.transferOwnership(stockId, transferTargetUserId);
      alert(locale === 'zh-TW' ? '擁有權已成功轉移！您現在是管理員。' : 'Ownership transferred! You are now an Admin.');
      setShowTransferConfirm(false);
      await loadStockData();
      onStockUpdated();
    } catch (err: any) {
      setError(err.message || '轉移失敗');
    } finally {
      setTransferring(false);
    }
  };

  const handleLeaveStock = async () => {
    if (!confirm(locale === 'zh-TW' ? '確定要退出此備品庫？退出後您將無法查看此庫中的物品。' : 'Leave this stock?')) {
      return;
    }
    try {
      await api.leaveStock(stockId);
      onStockDeleted();
      onClose();
    } catch (err: any) {
      alert(err.message || '退出失敗');
    }
  };

  const handleDeleteStock = async () => {
    const promptText = locale === 'zh-TW'
      ? `確定要永久刪除「${stock?.name}」及其內部的所有耗材項目嗎？此操作無法還原！請輸入備品庫名稱以確認刪除：`
      : `Are you sure you want to permanently delete "${stock?.name}"? Enter stock name to confirm:`;
    const input = window.prompt(promptText);
    if (input !== stock?.name) {
      if (input !== null) alert(locale === 'zh-TW' ? '名稱不相符，已取消刪除' : 'Name does not match');
      return;
    }

    try {
      await api.deleteStock(stockId);
      onStockDeleted();
      onClose();
    } catch (err: any) {
      alert(err.message || '刪除失敗');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-2.5">
            <span className="text-xl">{icon}</span>
            <div>
              <h3 className="font-bold text-white text-base">
                {stock?.name || t('stockSettings')}
              </h3>
              <p className="text-[11px] text-slate-400">
                {t('roleOwner')}: {stock?.ownerId === user?.id ? (locale === 'zh-TW' ? '您' : 'You') : '成員'} · {members.length} 位成員
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-200 text-sm">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-3 text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin text-sky-400" />
              <span>載入備品庫資訊中...</span>
            </div>
          ) : (
            <>
              {error && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs">
                  {error}
                </div>
              )}

              {/* 1. Basic Info (Editable for Owner & Admin) */}
              <section className="space-y-3">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Settings className="w-3.5 h-3.5 text-sky-400" />
                  <span>基本資訊</span>
                </h4>

                <form onSubmit={handleSaveDetails} className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                      {t('stockIcon')}
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {STOCK_ICONS.map((i) => (
                        <button
                          key={i}
                          type="button"
                          disabled={!isAdminOrOwner}
                          onClick={() => setIcon(i)}
                          className={`w-9 h-9 rounded-xl text-lg flex items-center justify-center border transition-all ${
                            icon === i
                              ? 'bg-sky-500/20 border-sky-400 scale-105'
                              : 'bg-slate-800 border-slate-700 hover:bg-slate-700'
                          } ${!isAdminOrOwner ? 'opacity-60 cursor-not-allowed' : ''}`}
                        >
                          {i}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 mb-1">
                        {t('stockName')}
                      </label>
                      <input
                        type="text"
                        disabled={!isAdminOrOwner}
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-400 disabled:opacity-60"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 mb-1">
                        {t('stockDesc')}
                      </label>
                      <input
                        type="text"
                        disabled={!isAdminOrOwner}
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="選填說明"
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-400 disabled:opacity-60"
                      />
                    </div>
                  </div>

                  {isAdminOrOwner && (
                    <div className="flex justify-end pt-1">
                      <button
                        type="submit"
                        disabled={savingDetails || !name.trim()}
                        className="px-4 py-2 bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-slate-950 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all"
                      >
                        {savingDetails ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                        <span>儲存修改</span>
                      </button>
                    </div>
                  )}
                </form>
              </section>

              <hr className="border-slate-800" />

              {/* 2. Members Management */}
              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{t('members')} ({members.length})</span>
                  </h4>
                </div>

                <div className="space-y-2">
                  {members.map((member) => {
                    const isSelf = member.userId === user?.id;
                    const isMemberOwner = member.role === 'owner';

                    return (
                      <div
                        key={member.id}
                        className="flex items-center justify-between p-3 rounded-2xl bg-slate-800/40 border border-slate-800"
                      >
                        <div className="flex items-center gap-2.5 min-w-0 pr-2">
                          <div className="w-8 h-8 rounded-full bg-slate-700 border border-slate-600 flex items-center justify-center text-xs font-bold text-white shrink-0">
                            {member.nickname ? member.nickname.slice(0, 1) : member.email?.slice(0, 1).toUpperCase() || 'U'}
                          </div>
                          <div className="min-w-0">
                            <div className="font-semibold text-xs text-white truncate flex items-center gap-1.5">
                              <span>{member.nickname || member.email || '成員'}</span>
                              {isSelf && (
                                <span className="text-[10px] text-sky-400 bg-sky-950/60 px-1 py-0.2 rounded border border-sky-400/20">
                                  我
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-slate-500">
                              加入於 {new Date(member.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>

                        {/* Member Role & Actions */}
                        <div className="flex items-center gap-2 shrink-0">
                          {isAdminOrOwner && !isMemberOwner && !isSelf ? (
                            <select
                              value={member.role}
                              onChange={(e) => handleChangeMemberRole(member.userId, e.target.value as StockRole)}
                              className="bg-slate-800 border border-slate-700 rounded-lg text-xs px-2 py-1 text-slate-300 focus:outline-none"
                            >
                              <option value="admin">管理員</option>
                              <option value="member">成員</option>
                              <option value="viewer">檢視者</option>
                            </select>
                          ) : (
                            <span
                              className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
                                isMemberOwner
                                  ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                                  : member.role === 'admin'
                                  ? 'bg-sky-500/15 text-sky-300 border-sky-500/30'
                                  : 'bg-slate-700/50 text-slate-300 border-slate-600'
                              }`}
                            >
                              {member.role === 'owner'
                                ? '擁有者'
                                : member.role === 'admin'
                                ? '管理員'
                                : member.role === 'member'
                                ? '成員'
                                : '檢視者'}
                            </span>
                          )}

                          {isAdminOrOwner && !isMemberOwner && !isSelf && (
                            <button
                              type="button"
                              onClick={() => handleRemoveMember(member.userId, member.nickname || member.email)}
                              className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                              title="移出備品庫"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Invite section */}
                {isAdminOrOwner && (
                  <div className="pt-2 p-3.5 rounded-2xl bg-sky-950/20 border border-sky-500/20 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-bold text-sky-300 flex items-center gap-1.5">
                        <Plus className="w-3.5 h-3.5" />
                        <span>邀請新成員加入</span>
                      </div>
                      <select
                        value={inviteRole}
                        onChange={(e) => setInviteRole(e.target.value as StockRole)}
                        className="bg-slate-900 border border-slate-700 rounded-lg text-xs px-2 py-1 text-slate-300"
                      >
                        <option value="member">預設身分：一般成員</option>
                        <option value="viewer">預設身分：僅能檢視</option>
                        <option value="admin">預設身分：共同管理員</option>
                      </select>
                    </div>

                    <button
                      type="button"
                      onClick={handleCreateInvite}
                      disabled={generatingInvite}
                      className="w-full py-2 bg-sky-500/20 hover:bg-sky-500/30 border border-sky-400/30 text-sky-300 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all"
                    >
                      {generatingInvite ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                      <span>產生 8 碼邀請代碼與專屬連結</span>
                    </button>

                    {invites.length > 0 && (
                      <div className="space-y-1.5 pt-1">
                        <div className="text-[11px] text-slate-400">有效邀請代碼：</div>
                        {invites.map((inv) => (
                          <div
                            key={inv.id}
                            className="flex items-center justify-between p-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono"
                          >
                            <span className="font-bold text-sky-400 tracking-wider">{inv.code}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] text-slate-500 font-sans">
                                可用 {inv.maxUses - inv.usedCount} 次
                              </span>
                              <button
                                type="button"
                                onClick={() => handleCopyInviteLink(inv.code)}
                                className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg flex items-center gap-1 text-[11px] font-sans"
                              >
                                {copiedInvite ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                                <span>{copiedInvite ? '已複製' : '複製連結'}</span>
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </section>

              <hr className="border-slate-800" />

              {/* 3. Danger Zone (Ownership Transfer / Leave / Delete) */}
              <section className="space-y-3 pt-1">
                <h4 className="text-xs font-bold text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>管理權限與危險區域</span>
                </h4>

                {/* Ownership Transfer (Owner Only) */}
                {isOwner && (
                  <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-bold text-xs text-amber-300 flex items-center gap-1.5">
                          <ArrowRightLeft className="w-3.5 h-3.5" />
                          <span>{t('transferOwnership')}</span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          將此備品庫的最高擁有權轉交給其他成員。轉移後，您將自動轉為管理員 (Admin)。
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowTransferConfirm(!showTransferConfirm)}
                        className="px-3 py-1.5 rounded-xl border border-amber-500/40 text-amber-300 hover:bg-amber-500/20 text-xs font-bold shrink-0 transition-all"
                      >
                        {showTransferConfirm ? t('cancel') : t('transferOwnership')}
                      </button>
                    </div>

                    {showTransferConfirm && (
                      <div className="pt-2 border-t border-amber-500/20 space-y-3">
                        <div>
                          <label className="block text-xs font-semibold text-slate-300 mb-1">
                            選擇接任的擁有者成員：
                          </label>
                          <select
                            value={transferTargetUserId}
                            onChange={(e) => setTransferTargetUserId(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                          >
                            <option value="">-- 請選擇成員 --</option>
                            {members
                              .filter((m) => m.userId !== user?.id)
                              .map((m) => (
                                <option key={m.userId} value={m.userId}>
                                  {m.nickname || m.email || m.userId} ({m.role})
                                </option>
                              ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-300 mb-1">
                            請輸入備品庫名稱「<span className="text-amber-400">{stock?.name}</span>」以確認：
                          </label>
                          <input
                            type="text"
                            placeholder={stock?.name}
                            value={transferConfirmName}
                            onChange={(e) => setTransferConfirmName(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                          />
                        </div>

                        <button
                          type="button"
                          disabled={transferring || !transferTargetUserId || transferConfirmName.trim() !== stock?.name}
                          onClick={handleTransferOwnership}
                          className="w-full py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all"
                        >
                          {transferring ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserCheck className="w-3.5 h-3.5" />}
                          <span>確認轉移擁有權</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Leave Stock (Non-Owner Only) */}
                {!isOwner && (
                  <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-800/40 border border-slate-800">
                    <div>
                      <div className="font-semibold text-xs text-white">退出備品庫</div>
                      <p className="text-[11px] text-slate-400">退出後將不再能查看與協作此備品庫。</p>
                    </div>
                    <button
                      type="button"
                      onClick={handleLeaveStock}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-xl text-xs font-bold transition-all flex items-center gap-1"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>{t('leaveStock')}</span>
                    </button>
                  </div>
                )}

                {/* Delete Stock (Owner Only) */}
                {isOwner && (
                  <div className="flex items-center justify-between p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20">
                    <div>
                      <div className="font-semibold text-xs text-rose-300">刪除備品庫</div>
                      <p className="text-[11px] text-slate-400">永久刪除此備品庫與所有包含的物品。</p>
                    </div>
                    <button
                      type="button"
                      onClick={handleDeleteStock}
                      className="px-3 py-1.5 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1 shadow-md shadow-rose-500/20"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>{t('deleteStock')}</span>
                    </button>
                  </div>
                )}
              </section>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
