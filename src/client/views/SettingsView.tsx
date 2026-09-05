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

  const { locale, setLocale, t } = useTranslation();

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
        <div className="w-14 h-14 rounded-2xl app-primary-soft border mx-auto flex items-center justify-center">
          <Fingerprint className="w-7 h-7" />
        </div>
        <h2 className="ui-section-title text-[var(--app-text)]">{locale === 'zh-TW' ? '請先登入帳戶' : 'Sign in required'}</h2>
        <p className="ui-body text-[var(--app-muted)] max-w-xs mx-auto">
          {locale === 'zh-TW'
            ? '登入後即可啟用 WebCal 行事曆訂閱、Web Push 網頁推播與生物辨識 Passkey。'
            : 'Sign in to enable WebCal calendar subscriptions, Web Push, and Passkeys.'}
        </p>
        <button
          type="button"
          onClick={onOpenAuth}
          className="app-primary ui-button min-h-11 inline-flex items-center gap-2 px-5 rounded-xl shadow-sm transition-transform active:scale-95"
        >
          <Fingerprint className="w-4 h-4" />
          <span>{locale === 'zh-TW' ? '立即無密碼登入' : 'Sign in with Passkey / OTP'}</span>
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
    if (!confirm(locale === 'zh-TW' ? '確定要重新產生行事曆金鑰？舊的訂閱連結將立即全面失效，您需要在手機日曆中重新訂閱一次。' : 'Rotate calendar token? Previous links will become invalid.')) {
      return;
    }
    setRotating(true);
    try {
      await api.rotateCalendarToken();
      onRefreshUser();
      alert(locale === 'zh-TW' ? '已重新產生專屬行事曆金鑰！' : 'New calendar token generated!');
    } catch (err: any) {
      alert(err.message || (locale === 'zh-TW' ? '金鑰更新失敗' : 'Token rotation failed'));
    } finally {
      setRotating(false);
    }
  };

  // Passkey enrollment
  const handleAddPasskey = async () => {
    setEnrollingPasskey(true);
    try {
      const deviceName = prompt(
        locale === 'zh-TW' ? '請為此生物辨識裝置輸入名稱：' : 'Device name for Passkey:',
        navigator.userAgent.includes('iPhone') ? '我的 iPhone' : (locale === 'zh-TW' ? '我的裝置' : 'My Device')
      );
      if (deviceName === null) return;
      await api.registerPasskey(deviceName || (locale === 'zh-TW' ? '我的裝置' : 'My Device'));
      onRefreshUser();
      alert(locale === 'zh-TW' ? 'Passkey 綁定成功！' : 'Passkey enrolled successfully!');
    } catch (err: any) {
      console.error(err);
      alert(err.message || (locale === 'zh-TW' ? 'Passkey 綁定失敗或已取消' : 'Passkey enrollment cancelled'));
    } finally {
      setEnrollingPasskey(false);
    }
  };

  const handleDeletePasskey = async (id: string) => {
    if (!confirm(locale === 'zh-TW' ? '確定要移除此裝置的 Passkey？' : 'Remove this passkey?')) return;
    try {
      await api.deletePasskey(id);
      onRefreshUser();
    } catch (err: any) {
      alert(err.message || (locale === 'zh-TW' ? '刪除失敗' : 'Deletion failed'));
    }
  };

  // Web Push Subscription
  const handleEnablePush = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      alert(locale === 'zh-TW' ? '此瀏覽器不支援 Web Push 通知，建議使用 WebCal 行事曆訂閱。' : 'Web Push not supported in this browser.');
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
        alert(locale === 'zh-TW' ? 'Web Push 通知已成功啟用！' : 'Web Push enabled!');
      }
    } catch (err: any) {
      console.error(err);
      alert(locale === 'zh-TW' ? '推播訂閱失敗，請檢查瀏覽器通知權限。' : 'Failed to enable push notifications.');
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

  return (
    <div className="space-y-4 pb-32 pt-1">
      {/* 0. Language Selector Card */}
      <div className="app-surface border p-4 rounded-2xl flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl app-primary-soft border flex items-center justify-center shrink-0">
            <Languages className="w-4 h-4 text-[var(--app-accent-strong)]" />
          </div>
          <div>
            <h3 className="ui-item-title text-[var(--app-text)]">{t('languageToggle')}</h3>
            <p className="ui-meta text-[var(--app-muted)]">
              {locale === 'zh-TW' ? '繁體中文 (Traditional Chinese)' : 'English (英文)'}
            </p>
          </div>
        </div>
        <div className="flex bg-[var(--app-surface-subtle)] border rounded-xl p-1 gap-1">
          <button
            type="button"
            onClick={() => setLocale('zh-TW')}
            className={`min-h-9 px-3.5 ui-button rounded-lg transition-all ${
              locale === 'zh-TW' ? 'app-primary shadow-sm' : 'text-[var(--app-muted)] hover:text-[var(--app-text)]'
            }`}
          >
            繁中
          </button>
          <button
            type="button"
            onClick={() => setLocale('en')}
            className={`min-h-9 px-3.5 ui-button rounded-lg transition-all ${
              locale === 'en' ? 'app-primary shadow-sm' : 'text-[var(--app-muted)] hover:text-[var(--app-text)]'
            }`}
          >
            EN
          </button>
        </div>
      </div>

      {/* 1. Account Info Card */}
      <div className="app-surface border p-4 rounded-2xl flex items-center justify-between gap-3 shadow-sm">
        <div className="min-w-0 flex-1">
          <span className="ui-meta text-[var(--app-muted)]">{locale === 'zh-TW' ? '目前登入帳號' : 'Signed In As'}</span>
          <h3 className="ui-item-title text-[var(--app-text)] truncate mt-0.5">{user.email}</h3>
        </div>
        <button
          type="button"
          onClick={onLogout}
          className="app-control ui-button min-h-11 flex items-center gap-1.5 border border-rose-500/20 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 px-3.5 rounded-xl transition-transform active:scale-95 shrink-0"
        >
          <LogOut className="w-4 h-4" />
          <span>{t('logoutBtn')}</span>
        </button>
      </div>

      {/* 2. WebCal Calendar Subscription (Feature Highlight!) */}
      <div className="app-surface border p-4 rounded-2xl space-y-3 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="app-primary-soft w-9 h-9 rounded-xl border flex items-center justify-center shrink-0">
              <Calendar className="w-4 h-4 text-[var(--app-accent-strong)]" />
            </div>
            <div className="min-w-0">
              <h3 className="ui-item-title text-[var(--app-text)] truncate">WebCal 行事曆自動同步</h3>
              <p className="ui-meta text-[var(--app-accent-strong)] font-semibold truncate">免裝 App · 手機原生提醒</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleRotateToken}
            disabled={rotating}
            aria-label="更換金鑰（防止舊連結洩漏）"
            className="app-control ui-button min-h-11 min-w-11 flex items-center justify-center rounded-xl border hover:border-[var(--app-accent)] shrink-0 transition-colors"
          >
            <RotateCw className={`w-4 h-4 ${rotating ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <p className="ui-body text-[var(--app-muted)] leading-relaxed">
          訂閱後，所有更換日與保固到期日將自動同步至 iPhone / Android 行事曆。更新或刪除時舊事件自動消除。
        </p>

        {/* Action Buttons with 44px touch targets */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <a
            href={webcalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="app-primary ui-button min-h-11 flex items-center justify-center gap-1.5 rounded-xl shadow-sm active:scale-95 transition-transform text-center"
          >
            <Smartphone className="w-4 h-4" />
            <span>加入 Apple 日曆</span>
          </a>

          <button
            type="button"
            onClick={handleCopyCalendar}
            className="app-control ui-button min-h-11 flex items-center justify-center gap-1.5 rounded-xl border hover:border-[var(--app-accent)] active:scale-95 transition-transform"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> : <Copy className="w-4 h-4 text-[var(--app-accent-strong)]" />}
            <span>{copied ? '已複製！' : '複製訂閱網址'}</span>
          </button>
        </div>

        <div className="ui-meta text-[var(--app-muted)] bg-[var(--app-surface-subtle)] border p-3 rounded-xl break-all select-all tabular-nums">
          {calendarUrl}
        </div>
      </div>

      {/* 3. Passkey Biometrics Management */}
      <div className="app-surface border p-4 rounded-2xl space-y-3 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="app-primary-soft w-9 h-9 rounded-xl border flex items-center justify-center shrink-0">
              <Fingerprint className="w-4 h-4 text-[var(--app-accent-strong)]" />
            </div>
            <div className="min-w-0">
              <h3 className="ui-item-title text-[var(--app-text)] truncate">Passkey 生物辨識憑證</h3>
              <p className="ui-meta text-[var(--app-muted)] truncate">Touch ID / Face ID 免密秒登</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleAddPasskey}
            disabled={enrollingPasskey}
            className="app-control ui-button min-h-11 flex items-center gap-1 px-3.5 rounded-xl border hover:border-[var(--app-accent)] active:scale-95 transition-transform shrink-0"
          >
            {enrollingPasskey ? <Loader2 className="w-4 h-4 animate-spin" /> : <>+ 綁定此裝置</>}
          </button>
        </div>

        {/* Devices list */}
        <div className="space-y-2 pt-1">
          {devices.length === 0 ? (
            <p className="ui-meta text-[var(--app-muted)] py-2">
              尚未綁定任何 Passkey 裝置。點擊右上角立即啟用！
            </p>
          ) : (
            devices.map((d) => (
              <div
                key={d.id}
                className="app-surface-subtle border p-3 rounded-xl flex items-center justify-between gap-2"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <div className="min-w-0">
                    <span className="ui-item-title text-[var(--app-text)] truncate block">{d.deviceName}</span>
                    <span className="ui-meta text-[var(--app-muted-low)] tabular-nums block">
                      建立於: {d.createdAt.split('T')[0]}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleDeletePasskey(d.id)}
                  aria-label={`移除 ${d.deviceName} 的 Passkey`}
                  className="app-control ui-button min-h-11 min-w-11 flex items-center justify-center rounded-xl border hover:border-rose-500 text-[var(--app-muted)] hover:text-rose-600 shrink-0 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 4. Notification Preferences */}
      <div className="app-surface border p-4 rounded-2xl space-y-3 shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="app-primary-soft w-9 h-9 rounded-xl border flex items-center justify-center shrink-0">
            <Bell className="w-4 h-4 text-[var(--app-accent-strong)]" />
          </div>
          <div>
            <h3 className="ui-item-title text-[var(--app-text)]">通知偏好設定</h3>
            <p className="ui-meta text-[var(--app-muted)]">Web Push 與 Email 晨間摘要</p>
          </div>
        </div>

        <div className="space-y-3 pt-2">
          {/* Web Push */}
          <div className="flex items-center justify-between gap-3 app-surface-subtle p-3.5 rounded-xl border">
            <div>
              <span className="ui-button text-[var(--app-text)] block">PWA 系統推播通知</span>
              <span className="ui-meta text-[var(--app-muted)]">
                狀態: {pushStatus === 'granted' ? '已允許 ✅' : pushStatus === 'denied' ? '已封鎖 ❌' : '尚未啟用'}
              </span>
            </div>
            {pushStatus !== 'granted' ? (
              <button
                type="button"
                onClick={handleEnablePush}
                disabled={pushSubscribing}
                className="app-primary ui-button min-h-11 px-4 rounded-xl shadow-sm transition-transform active:scale-95"
              >
                {pushSubscribing ? '授權中...' : '啟用推播'}
              </button>
            ) : (
              <span className="ui-meta text-emerald-600 dark:text-emerald-400 font-semibold">運作中</span>
            )}
          </div>

          {/* Email Digest */}
          <div className="flex items-center justify-between gap-3 app-surface-subtle p-3.5 rounded-xl border">
            <div>
              <span className="ui-button text-[var(--app-text)] block">Email 晨間提醒信</span>
              <span className="ui-meta text-[var(--app-muted)]">每日早上 08:00 寄發即將到期耗材</span>
            </div>
            <button
              type="button"
              onClick={() => handleToggleEmail(!settings.emailEnabled)}
              aria-label={settings.emailEnabled ? '停用 Email 晨間信' : '啟用 Email 晨間信'}
              className={`w-12 h-7 rounded-full transition-colors p-1 flex items-center shrink-0 ${
                settings.emailEnabled ? 'app-primary justify-end' : 'bg-[var(--app-surface)] border justify-start'
              }`}
            >
              <div className="w-5 h-5 rounded-full bg-white shadow-sm" />
            </button>
          </div>

          {/* Lead Days */}
          <div>
            <label className="block ui-meta text-[var(--app-muted)] mb-1.5 font-semibold">提前提醒天數</label>
            <div className="grid grid-cols-3 gap-2">
              {[1, 3, 7].map((days) => (
                <button
                  key={days}
                  type="button"
                  onClick={() => handleChangeWarningDays(days)}
                  className={`min-h-11 rounded-xl border ui-button text-center transition-all ${
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
      <div className="app-surface-subtle border p-4 rounded-2xl flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <Crown className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
          <div>
            <span className="ui-item-title text-[var(--app-text)] block">VIP 簡訊通知服務 (Phase 2)</span>
            <span className="ui-meta text-[var(--app-muted)]">耗材耗盡或緊急到期時直發簡訊</span>
          </div>
        </div>
        <span className="ui-badge bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full font-semibold shrink-0">
          即將推出
        </span>
      </div>
    </div>
  );
};
