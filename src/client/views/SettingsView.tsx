import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Bell,
  Fingerprint,
  Mail,
  RotateCw,
  Copy,
  Check,
  ShieldCheck,
  Smartphone,
  Trash2,
  ExternalLink,
  Crown,
  LogOut,
  Loader2,
  AlertTriangle,
  Languages,
} from 'lucide-react';
import { UserSession, UserNotificationSettings } from '../../shared/types.ts';
import { api } from '../api.ts';
import { useTranslation } from '../i18n/index.tsx';

interface SettingsViewProps {
  user: UserSession | null;
  devices: Array<{ id: string; deviceName: string; createdAt: string; lastUsedAt: string | null }>;
  onOpenAuth: () => void;
  onLogout: () => void;
  onRefreshUser: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  user,
  devices,
  onOpenAuth,
  onLogout,
  onRefreshUser,
}) => {
  const [copied, setCopied] = useState(false);
  const [rotating, setRotating] = useState(false);
  const [enrollingPasskey, setEnrollingPasskey] = useState(false);
  const [pushStatus, setPushStatus] = useState<'default' | 'granted' | 'denied'>('default');
  const [pushSubscribing, setPushSubscribing] = useState(false);
  const [settings, setSettings] = useState<UserNotificationSettings>({
    emailEnabled: true,
    pushEnabled: true,
    warningDaysBefore: 3,
    warningDayOf: true,
    preferredHour: 8,
  });

  useEffect(() => {
    if ('Notification' in window) {
      setPushStatus(Notification.permission);
    }
    if (user) {
      api.getSettings()
        .then((res) => setSettings(res.settings))
        .catch((err) => console.error(err));
    }
  }, [user]);

  if (!user) {
    return (
      <div className="py-16 text-center space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-sky-500/10 border border-sky-500/20 text-sky-400 mx-auto flex items-center justify-center">
          <Fingerprint className="w-7 h-7" />
        </div>
        <h2 className="text-base font-bold text-[var(--app-text)]">請先登入帳戶</h2>
        <p className="text-xs text-[var(--app-muted)] max-w-xs mx-auto">
          登入後即可啟用 WebCal 行事曆訂閱、Web Push 網頁推播與生物辨識 Passkey。
        </p>
        <button
          onClick={onOpenAuth}
          className="app-primary inline-flex items-center gap-2 font-semibold text-xs px-5 py-2.5 rounded-full shadow-lg shadow-sky-500/20 active:scale-[0.98]"
        >
          <Fingerprint className="w-4 h-4" />
          <span>立即無密碼登入</span>
        </button>
      </div>
    );
  }

  // Calendar URL handling
  const calendarUrl = api.getCalendarUrl(user.calendarToken);
  const webcalUrl = api.getWebCalUrl(user.calendarToken);

  const handleCopyCalendar = () => {
    navigator.clipboard.writeText(calendarUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRotateToken = async () => {
    if (!confirm('確定要重新產生行事曆金鑰？舊的訂閱連結將立即全面失效，您需要在手機日曆中重新訂閱一次。')) {
      return;
    }
    setRotating(true);
    try {
      await api.rotateCalendarToken();
      onRefreshUser();
      alert('已重新產生專屬行事曆金鑰！');
    } catch (err: any) {
      alert(err.message || '金鑰更新失敗');
    } finally {
      setRotating(false);
    }
  };

  // Passkey enrollment
  const handleAddPasskey = async () => {
    setEnrollingPasskey(true);
    try {
      const deviceName = prompt('請為此生物辨識裝置輸入名稱：', navigator.userAgent.includes('iPhone') ? '我的 iPhone' : '我的電腦');
      if (deviceName === null) return;
      await api.registerPasskey(deviceName || '我的裝置');
      onRefreshUser();
      alert('Passkey 綁定成功！');
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Passkey 綁定失敗或已取消');
    } finally {
      setEnrollingPasskey(false);
    }
  };

  const handleDeletePasskey = async (id: string) => {
    if (!confirm('確定要移除此裝置的 Passkey？')) return;
    try {
      await api.deletePasskey(id);
      onRefreshUser();
    } catch (err: any) {
      alert(err.message || '刪除失敗');
    }
  };

  // Web Push Subscription
  const handleEnablePush = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      alert('此瀏覽器不支援 Web Push 通知，建議使用 WebCal 行事曆訂閱。');
      return;
    }

    setPushSubscribing(true);
    try {
      const permission = await Notification.requestPermission();
      setPushStatus(permission);

      if (permission === 'granted') {
        const reg = await navigator.serviceWorker.ready;
        const { publicKey } = await api.getVapidKey();

        // Convert base64 url to Uint8Array
        const padding = '='.repeat((4 - (publicKey.length % 4)) % 4);
        const base64 = (publicKey + padding).replace(/-/g, '+').replace(/_/g, '/');
        const rawData = atob(base64);
        const outputArray = new Uint8Array(rawData.length);
        for (let i = 0; i < rawData.length; ++i) {
          outputArray[i] = rawData.charCodeAt(i);
        }

        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: outputArray,
        });

        await api.subscribePush(sub);
        alert('Web Push 通知已成功啟用！');
      }
    } catch (err: any) {
      console.error(err);
      alert('推播訂閱失敗，請檢查瀏覽器通知權限。');
    } finally {
      setPushSubscribing(false);
    }
  };

  // Update Settings
  const handleToggleEmail = async (enabled: boolean) => {
    setSettings((prev) => ({ ...prev, emailEnabled: enabled }));
    await api.updateSettings({ emailEnabled: enabled });
  };

  const handleChangeWarningDays = async (days: number) => {
    setSettings((prev) => ({ ...prev, warningDaysBefore: days }));
    await api.updateSettings({ warningDaysBefore: days });
  };

  const { locale, setLocale, t } = useTranslation();

  return (
    <div className="space-y-6 pb-28 pt-1 text-xs">
      {/* 0. Language Selector Card */}
      <div className="app-surface border border-[var(--app-border)] p-4 rounded-2xl flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-600 dark:text-purple-400 flex items-center justify-center">
            <Languages className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-base font-bold text-[var(--app-text)]">{t('languageToggle')}</h3>
            <span className="text-xs text-[var(--app-muted)]">
              {locale === 'zh-TW' ? '繁體中文 (Traditional Chinese)' : 'English (英文)'}
            </span>
          </div>
        </div>
        <div className="flex bg-[var(--app-surface-subtle)] border border-[var(--app-border)] rounded-xl p-1 gap-1">
          <button
            type="button"
            onClick={() => setLocale('zh-TW')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
              locale === 'zh-TW' ? 'app-primary shadow-sm' : 'text-[var(--app-muted)] hover:text-[var(--app-text)]'
            }`}
          >
            繁中
          </button>
          <button
            type="button"
            onClick={() => setLocale('en')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
              locale === 'en' ? 'app-primary shadow-sm' : 'text-[var(--app-muted)] hover:text-[var(--app-text)]'
            }`}
          >
            EN
          </button>
        </div>
      </div>

      {/* 1. Account Info Card */}
      <div className="app-surface border border-[var(--app-border)] p-4 rounded-2xl flex items-center justify-between shadow-sm">
        <div>
          <span className="text-xs text-[var(--app-muted)]">{locale === 'zh-TW' ? '目前登入帳號' : 'Signed In As'}</span>
          <h3 className="text-base font-bold text-[var(--app-text)] mt-0.5">{user.email}</h3>
        </div>
        <button
          onClick={onLogout}
          className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400 hover:text-rose-700 bg-rose-500/10 border border-rose-500/20 px-3 py-1.5 rounded-xl font-semibold transition-all active:scale-95"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>{t('logoutBtn')}</span>
        </button>
      </div>

      {/* 2. WebCal Calendar Subscription (Feature Highlight!) */}
      <div className="app-surface border border-[var(--app-border)] p-4 rounded-2xl space-y-3 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="app-primary-soft w-8 h-8 rounded-xl flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[var(--app-text)]">WebCal 行事曆自動同步</h3>
              <span className="text-xs text-[var(--app-accent-strong)] font-semibold">最強免裝 App 手機原生鬧鐘提醒</span>
            </div>
          </div>
          <button
            onClick={handleRotateToken}
            disabled={rotating}
            title="更換金鑰（防止舊連結洩漏）"
            className="text-[var(--app-muted)] hover:text-[var(--app-text)] p-1.5 rounded-lg hover:bg-[var(--app-surface-subtle)] transition-colors"
          >
            <RotateCw className={`w-3.5 h-3.5 ${rotating ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <p className="text-[var(--app-text)] leading-relaxed text-xs">
          訂閱後，所有更換日與保固到期日將**自動同步到 iPhone/Android 行事曆**。系統具備版本號追蹤與 30 天刪除墓碑機制，修改或刪除時日曆舊事件將乾淨消除！
        </p>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <a
            href={webcalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="app-primary flex items-center justify-center gap-1.5 hover:brightness-105 font-bold py-2.5 rounded-xl shadow-sm active:scale-[0.98] transition-all text-center"
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>加入 Apple 日曆</span>
          </a>

          <button
            onClick={handleCopyCalendar}
            className="app-control flex items-center justify-center gap-1.5 hover:border-[var(--app-accent)] font-semibold py-2.5 rounded-xl border active:scale-95 transition-all"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-[var(--app-accent-strong)]" />}
            <span>{copied ? '已複製！' : '複製訂閱網址'}</span>
          </button>
        </div>

        <div className="text-xs text-[var(--app-muted)] bg-[var(--app-surface-subtle)] border border-[var(--app-border)] p-2.5 rounded-xl font-mono break-all select-all">
          {calendarUrl}
        </div>
      </div>

      {/* 3. Passkey Biometrics Management */}
      <div className="app-surface border border-[var(--app-border)] p-4 rounded-2xl space-y-3 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center">
              <Fingerprint className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[var(--app-text)]">Passkey 生物辨識憑證</h3>
              <span className="text-xs text-[var(--app-muted)]">Touch ID / Face ID 免密秒登</span>
            </div>
          </div>
          <button
            onClick={handleAddPasskey}
            disabled={enrollingPasskey}
            className="app-control flex items-center gap-1 hover:border-[var(--app-accent)] px-3 py-1.5 rounded-xl font-semibold transition-all active:scale-95"
          >
            {enrollingPasskey ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <>+ 綁定此裝置</>}
          </button>
        </div>

        {/* Devices list */}
        <div className="space-y-2 pt-1">
          {devices.length === 0 ? (
            <p className="text-[var(--app-muted)] text-xs py-2">
              尚未綁定任何 Passkey 裝置。點擊右上角立即啟用！
            </p>
          ) : (
            devices.map((d) => (
              <div
                key={d.id}
                className="app-surface-subtle border border-[var(--app-border)] p-2.5 rounded-xl flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <div>
                    <span className="text-[var(--app-text)] font-semibold">{d.deviceName}</span>
                    <span className="text-xs text-[var(--app-muted-low)] block">
                      建立於: {d.createdAt.split('T')[0]}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => handleDeletePasskey(d.id)}
                  className="text-[var(--app-muted)] hover:text-rose-600 dark:hover:text-rose-400 p-1.5 rounded-lg hover:bg-[var(--app-surface)] transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 4. Notification Preferences */}
      <div className="app-surface border border-[var(--app-border)] p-4 rounded-2xl space-y-3 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <Bell className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-base font-bold text-[var(--app-text)]">通知偏好設定</h3>
            <span className="text-xs text-[var(--app-muted)]">Web Push 與 Email 晨間摘要</span>
          </div>
        </div>

        <div className="space-y-3 pt-2">
          {/* Web Push */}
          <div className="flex items-center justify-between app-surface-subtle p-3 rounded-xl border border-[var(--app-border)]">
            <div>
              <span className="text-[var(--app-text)] font-semibold block">PWA 網頁系統推播</span>
              <span className="text-xs text-[var(--app-muted)]">
                權限狀態: {pushStatus === 'granted' ? '已允許 ✅' : pushStatus === 'denied' ? '已封鎖 ❌' : '尚未啟用'}
              </span>
            </div>
            {pushStatus !== 'granted' ? (
              <button
                onClick={handleEnablePush}
                disabled={pushSubscribing}
                className="app-primary hover:brightness-105 font-bold px-3 py-1.5 rounded-xl transition-all shadow-sm"
              >
                {pushSubscribing ? '授權中...' : '啟用推播'}
              </button>
            ) : (
              <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">運作中</span>
            )}
          </div>

          {/* Email Digest */}
          <div className="flex items-center justify-between app-surface-subtle p-3 rounded-xl border border-[var(--app-border)]">
            <div>
              <span className="text-[var(--app-text)] font-semibold block">Email 晨間提醒信</span>
              <span className="text-xs text-[var(--app-muted)]">每日早上 08:00 寄發即將到期耗材</span>
            </div>
            <button
              onClick={() => handleToggleEmail(!settings.emailEnabled)}
              className={`w-10 h-6 rounded-full transition-colors p-0.5 flex items-center ${
                settings.emailEnabled ? 'app-primary justify-end' : 'bg-[var(--app-surface)] border border-[var(--app-border)] justify-start'
              }`}
            >
              <div className="w-5 h-5 rounded-full bg-white shadow-sm" />
            </button>
          </div>

          {/* Lead Days */}
          <div>
            <label className="block text-[var(--app-muted)] text-xs mb-1.5 font-semibold">提前提醒天數</label>
            <div className="grid grid-cols-3 gap-2">
              {[1, 3, 7].map((days) => (
                <button
                  key={days}
                  onClick={() => handleChangeWarningDays(days)}
                  className={`py-2 rounded-xl border font-semibold text-center transition-all ${
                    settings.warningDaysBefore === days
                      ? 'app-primary font-bold shadow-sm'
                      : 'app-control text-[var(--app-muted)] hover:text-[var(--app-text)]'
                  }`}
                >
                  提前 {days} 天
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 5. Phase 2 VIP Tier Preview */}
      <div className="app-surface-subtle border border-[var(--app-border)] p-4 rounded-2xl flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Crown className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          <div>
            <span className="text-[var(--app-text)] font-bold block">VIP 簡訊通知服務 (Phase 2)</span>
            <span className="text-xs text-[var(--app-muted)]">耗材耗盡或緊急到期時直發簡訊</span>
          </div>
        </div>
        <span className="text-[11px] bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full font-semibold">
          即將推出
        </span>
      </div>
    </div>
  );
};
