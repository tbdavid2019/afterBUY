import React, { useState, useEffect, useMemo } from 'react';
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
  Palette,
  Sun,
  Moon,
  Clock,
  Sparkles,
  Package,
  Droplets,
  Info,
  ChevronRight,
  BookOpen,
  Bot,
  Key,
  Terminal,
  Plus,
} from 'lucide-react';
import { UserSession, UserNotificationSettings } from '../../shared/types.ts';
import { api } from '../api.ts';
import { useTranslation } from '../i18n/index.tsx';
import { THEME_PALETTES, type ThemeMode, type ThemePalette } from '../utils/theme.ts';
import { businessDate } from '../../shared/date.ts';

interface SettingsViewProps {
  user: UserSession | null;
  devices: Array<{ id: string; deviceName: string; createdAt: string; lastUsedAt: string | null }>;
  onOpenAuth: () => void;
  onLogout: () => void;
  onRefreshUser: () => void;
  themeMode?: ThemeMode;
  onToggleThemeMode?: () => void;
  currentPalette?: ThemePalette;
  onSelectPalette?: (palette: ThemePalette) => void;
  onOpenVersionNotice?: () => void;
  onOpenPresetCatalog?: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  user,
  devices,
  onOpenAuth,
  onLogout,
  onRefreshUser,
  themeMode = 'light',
  onToggleThemeMode,
  currentPalette = 'coral',
  onSelectPalette,
  onOpenVersionNotice,
  onOpenPresetCatalog,
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
    preferredHour: 9,
    cycleExpiryAlert: true,
    stockLowAlert: true,
    usageLowAlert: true,
    expiryWarningDays: 7,
  });

  const { locale, setLocale, t } = useTranslation();

  // API Keys & Agent Integration State
  const [apiKeys, setApiKeys] = useState<
    Array<{
      id: string;
      name: string;
      keyPrefix: string;
      stockId: string | null;
      scopes: string[];
      createdAt: string;
      lastUsedAt: string | null;
      isRevoked: boolean;
    }>
  >([]);
  const [loadingKeys, setLoadingKeys] = useState(false);
  const [showCreateKeyModal, setShowCreateKeyModal] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyStockId, setNewKeyStockId] = useState('');
  const [creatingKey, setCreatingKey] = useState(false);
  const [createdSecret, setCreatedSecret] = useState<{ rawKey: string; name: string } | null>(null);
  const [copiedRawKey, setCopiedRawKey] = useState(false);
  const [copiedOpenApi, setCopiedOpenApi] = useState(false);
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [agentTab, setAgentTab] = useState<'chatgpt' | 'claude_cursor'>('chatgpt');
  const [stockSpaces, setStockSpaces] = useState<Array<{ id: string; name: string; icon: string }>>([]);

  const systemPromptText = useMemo(() => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://afterbuy.david888.com';
    return `# Role & Purpose
你是 afterBUY（補貨日記）的專屬生活耗材與週期管理助理。

# ⚠️ 強制先驗對齊協定 (Pre-flight Alignment Protocol)
在與使用者進行耗材會話或執行任何操作前，請先調用 GET 讀取最新規範對齊能力：
- 主規範: ${origin}/skill.md (完整技能規範與搜尋表)
- OpenAPI: ${origin}/api/v1/openapi.json (OpenAPI 3.1 規格)
- 備援鏡像: https://afterbuy.create360.ai/skill.md

# API 設定
- Base URL: ${origin}/api/v1
- Header: Authorization: Bearer <填入您的 API Key>
- 時區: Asia/Taipei (所有日期皆為 YYYY-MM-DD)

# 核心概念與欄位說明（重要區分）
1. 【範本庫 Presets】: 常用台灣生活耗材預設庫（如好市多 150 顆魚油、Brita 濾芯、衛生紙 24 包、洗衣膠囊 60 顆）。
   - 查詢範本: GET /presets?q=魚油
   - 快速建檔: POST /items 時可直接帶入 { presetId: "costco-fish-oil" } 自動帶入預設規格與用量。
2. 【備品庫存 backupStock】: 存放於抽屜/櫃子中「未開封的全新備用件數量」。
   - 安全庫存警戒 (minStockAlert): 當 backupStock < minStockAlert 時，系統標記 needsRestock: true。
   - 採購補貨: POST /items/:id/restock { delta: 2 } 增加備品庫存（亦支援直接指定 backupStock）。
   - 換新替換: POST /items/:id/replace 會自動將 backupStock 扣減 1 並重設使用週期。
3. 【使用中容量 currentQuantity / initialQuantity】: 當前「開啟用中」那一瓶/包的剩餘量。
   - 記錄消耗: POST /items/:id/consume { amount: 2 } 扣減當前使用量。
4. 【五種追蹤模式 trackingMode】:
   - cycle: 依天數循環更換（如牙刷 cycleDays: 90 天、淨水濾芯 cycleDays: 30 天）
   - quantity: 數量消耗倒數（如好市多魚油 initialQuantity: 150, dailyUsage: 2, quantityUnit: "顆"）
   - pao: 開封後保期（如防曬乳 paoMonths: 12 個月、眼藥水 paoMonths: 1 個月）
   - expiry: 固定有效日期（如成藥、食品 expiryDate: "2027-06-30"）
   - warranty: 家電設備保固倒數（如冷氣保固 warrantyDate: "2029-05-01"）

# 全維度進階特殊搜尋 (Special Search Matrix)
端點: GET /items
- 缺貨/備品用罄: ?status=out_of_stock 或 ?stockStatus=out_of_stock
- 現存備品盤點: ?status=in_stock 或 ?stockStatus=in_stock&sortBy=backupStock&sortOrder=desc
- 待採購清單: ?status=needs_restock (備品不足或當前用量見底)
- 今天到期: ?status=due_today
- 已逾期: ?status=overdue
- 短期到期 (自訂天數): ?status=due_soon&dueWithinDays=3 (支援 3, 7, 14, 30 天)
- 使用中容量已耗盡: ?status=quantity_depleted
- 純備品存放在庫: ?isStored=true
- 時間區間 (YYYY-MM-DD): ?dueAfter=2026-10-01&dueBefore=2026-10-31
- 排序: ?sortBy=dueDate|backupStock|quantity|price&sortOrder=asc|desc
- 回應 summary 涵蓋 10 項全局指標 (total, overdue, dueToday, dueSoon, lowStock, outOfStock, inStock, quantityDepleted, needsRestock, stored)

# 核心端點
1. 查詢耗材: GET /items (支援上述豐富特殊搜尋篩選)
2. 查詢範本: GET /presets?q=關鍵字
3. 建立耗材: POST /items (支援 presetId 或手動指定 trackingMode 各欄位)
4. 記錄更換: POST /items/:id/replace (重設使用週期並自動扣減備品 1 件)
5. 採購補貨: POST /items/:id/restock (增加備品庫存 { delta: 2, note: "採購備註" })
6. 記錄用量: POST /items/:id/consume (扣減當前使用量 { amount: 2 })
7. 空間列表: GET /stocks

# 助理行為規則
- 使用者詢問「有什麼快沒了或該換了」，調用 GET /items?status=needs_restock 或 ?status=due_soon。
- 使用者詢問「今天有什麼要換」，調用 GET /items?status=due_today。
- 使用者詢問「家裡抽屜還有什麼備品」，調用 GET /items?status=in_stock&sortBy=backupStock&sortOrder=desc。
- 使用者說「買了/補貨了」，調用 POST /items/:id/restock。
- 使用者說「剛換了新的」，調用 POST /items/:id/replace。
- 使用者說「吃了/用了一份」，調用 POST /items/:id/consume。`;
  }, []);

  useEffect(() => {
    if ('Notification' in window) {
      setPushStatus(Notification.permission);
    }
    const savedLocal = localStorage.getItem('afterbuy_local_notification_settings');
    if (savedLocal) {
      try {
        setSettings((prev) => ({ ...prev, ...JSON.parse(savedLocal) }));
      } catch (e) {}
    }
    if (user) {
      api.getSettings()
        .then((res) => setSettings((prev) => ({ ...prev, ...res.settings })))
        .catch((err) => console.error(err));

      setLoadingKeys(true);
      api.listApiKeys()
        .then((res) => setApiKeys(res.keys || []))
        .catch((err) => console.error('Failed to load api keys:', err))
        .finally(() => setLoadingKeys(false));

      api.getStocks()
        .then((res) => setStockSpaces(res.stocks || []))
        .catch(() => {});
    }
  }, [user]);

  const handleCreateApiKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (creatingKey) return;
    setCreatingKey(true);
    try {
      const res = await api.createApiKey(
        newKeyName.trim() || (locale === 'zh-TW' ? '我的 AI Agent' : 'My AI Agent'),
        newKeyStockId || undefined
      );
      setApiKeys((prev) => [
        {
          id: res.apiKey.id,
          name: res.apiKey.name,
          keyPrefix: res.apiKey.keyPrefix,
          stockId: res.apiKey.stockId,
          scopes: res.apiKey.scopes,
          createdAt: res.apiKey.createdAt,
          lastUsedAt: res.apiKey.lastUsedAt,
          isRevoked: false,
        },
        ...prev,
      ]);
      setCreatedSecret({ rawKey: res.rawKey, name: res.apiKey.name });
      setShowCreateKeyModal(false);
      setNewKeyName('');
      setNewKeyStockId('');
    } catch (err: any) {
      alert(err.message || '建立 API Key 失敗');
    } finally {
      setCreatingKey(false);
    }
  };

  const handleRevokeApiKey = async (id: string, name: string) => {
    const msg =
      locale === 'zh-TW'
        ? `確定要廢止金鑰「${name}」嗎？\n廢止後，所有使用此金鑰的外部 AI 助理將立即無法存取資料。`
        : `Revoke API key "${name}"? External AI agents using this key will immediately lose access.`;
    if (!confirm(msg)) return;

    try {
      await api.revokeApiKey(id);
      setApiKeys((prev) => prev.filter((k) => k.id !== id));
      alert(locale === 'zh-TW' ? '金鑰已成功廢止' : 'API Key revoked successfully');
    } catch (err: any) {
      alert(err.message || '廢止金鑰失敗');
    }
  };

  const handleToggleSetting = async (key: keyof UserNotificationSettings, value: any) => {
    setSettings((prev) => {
      const updated = { ...prev, [key]: value };
      localStorage.setItem('afterbuy_local_notification_settings', JSON.stringify(updated));
      return updated;
    });
    if (user) {
      try {
        await api.updateSettings({ [key]: value });
      } catch (err) {
        console.error('Failed to update settings:', err);
      }
    }
  };

  const handleCycleHour = () => {
    const hours = [8, 9, 12, 18, 20];
    const currentHour = settings.preferredHour || 9;
    const currentIdx = hours.indexOf(currentHour);
    const nextHour = hours[(currentIdx + 1) % hours.length];
    handleToggleSetting('preferredHour', nextHour);
  };

  const formatHour = (hour: number) => {
    return `${hour.toString().padStart(2, '0')}:00`;
  };

  const renderAppearanceCard = () => (
    <div className="app-surface border p-4 rounded-2xl space-y-3.5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl app-primary-soft border flex items-center justify-center shrink-0">
            <Palette className="w-4 h-4 text-[var(--app-accent-strong)]" />
          </div>
          <div className="min-w-0">
            <h3 className="ui-item-title text-[var(--app-text)]">{t('appearanceTitle')}</h3>
            <p className="ui-meta text-[var(--app-muted)]">
              {t('chooseThemeColor')}
            </p>
          </div>
        </div>

        {/* Light / Dark Mode Toggle */}
        <div className="flex bg-[var(--app-surface-subtle)] border rounded-xl p-1 gap-1 shrink-0">
          <button
            type="button"
            onClick={() => onToggleThemeMode && themeMode !== 'light' && onToggleThemeMode()}
            className={`min-h-9 px-2.5 sm:px-3 ui-button rounded-lg flex items-center gap-1.5 transition-all ${
              themeMode === 'light' ? 'app-primary shadow-sm' : 'text-[var(--app-muted)] hover:text-[var(--app-text)]'
            }`}
            aria-label={t('themeModeLight')}
          >
            <Sun className="w-4 h-4" />
            <span className="text-sm font-semibold">{t('themeModeLight')}</span>
          </button>
          <button
            type="button"
            onClick={() => onToggleThemeMode && themeMode !== 'dark' && onToggleThemeMode()}
            className={`min-h-9 px-2.5 sm:px-3 ui-button rounded-lg flex items-center gap-1.5 transition-all ${
              themeMode === 'dark' ? 'app-primary shadow-sm' : 'text-[var(--app-muted)] hover:text-[var(--app-text)]'
            }`}
            aria-label={t('themeModeDark')}
          >
            <Moon className="w-4 h-4" />
            <span className="text-sm font-semibold">{t('themeModeDark')}</span>
          </button>
        </div>
      </div>

      {/* 5-Color Theme Palette Selector */}
      <div className="bg-[var(--app-surface-subtle)] border border-[var(--app-border)] rounded-2xl p-3 sm:p-4">
        <div className="grid grid-cols-5 gap-2 sm:gap-3">
          {THEME_PALETTES.map((p) => {
            const isSelected = currentPalette === p.id;
            const paletteLabel = locale === 'zh-TW' ? p.label : p.labelEn;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => onSelectPalette?.(p.id)}
                className="flex flex-col items-center gap-2 group focus:outline-none"
                aria-pressed={isSelected}
                aria-label={`${paletteLabel} 主題`}
              >
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                    isSelected
                      ? 'ring-2 ring-offset-2 ring-offset-[var(--app-surface)] shadow-md scale-105'
                      : 'hover:scale-105 opacity-85 hover:opacity-100'
                  }`}
                  style={{
                    backgroundColor: `${p.dotColor}22`,
                    boxShadow: isSelected ? `0 0 0 2px ${p.dotColor}` : undefined,
                  }}
                >
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center shadow-sm"
                    style={{ backgroundColor: p.dotColor }}
                  >
                    {isSelected && <Check className="w-4 h-4 text-white stroke-[3]" />}
                  </div>
                </div>
                <span
                  className={`ui-meta text-xs sm:text-sm font-semibold transition-colors ${
                    isSelected ? 'text-[var(--app-text)] font-bold' : 'text-[var(--app-muted)] group-hover:text-[var(--app-text)]'
                  }`}
                >
                  {paletteLabel}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );

  const renderLanguageCard = () => (
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
  );

  if (!user) {
    return (
      <div className="space-y-4 pt-1">
        {renderAppearanceCard()}
        {renderLanguageCard()}

        <div className="app-surface border p-6 rounded-2xl text-center space-y-4 shadow-sm">
          <div className="w-14 h-14 rounded-2xl app-primary-soft border mx-auto flex items-center justify-center">
            <Fingerprint className="w-7 h-7 text-[var(--app-accent-strong)]" />
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
            className="app-primary ui-button min-h-11 inline-flex items-center gap-2 px-5 rounded-xl shadow-sm tactile-press"
          >
            <Fingerprint className="w-4 h-4" />
            <span>{locale === 'zh-TW' ? '立即無密碼登入' : 'Sign in with Passkey / OTP'}</span>
          </button>
        </div>
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
    <div className="space-y-4 pt-1">
      {/* 0. Appearance & Color Palette Card */}
      {renderAppearanceCard()}

      {/* 1. Language Selector Card */}
      {renderLanguageCard()}

      {/* 1. Account Info Card */}
      <div className="app-surface border p-4 rounded-2xl flex items-center justify-between gap-3 shadow-sm">
        <div className="min-w-0 flex-1">
          <span className="ui-meta text-[var(--app-muted)]">{locale === 'zh-TW' ? '目前登入帳號' : 'Signed In As'}</span>
          <h3 className="ui-item-title text-[var(--app-text)] truncate mt-0.5">{user.email}</h3>
        </div>
        <button
          type="button"
          onClick={onLogout}
          className="app-control ui-button min-h-11 flex items-center gap-1.5 border border-rose-500/20 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 px-3.5 rounded-xl tactile-press shrink-0"
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
                      建立於: {businessDate(new Date(d.createdAt))}
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

      {/* 3.5. AI Agent 連動與 API Key */}
      <div className="app-surface border p-4 rounded-2xl space-y-4 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="app-primary-soft w-9 h-9 rounded-xl border flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4 text-[var(--app-accent-strong)]" />
            </div>
            <div className="min-w-0">
              <h3 className="ui-item-title text-[var(--app-text)] truncate">AI Agent 連動與 API Key</h3>
              <p className="ui-meta text-[var(--app-muted)] truncate">串接 ChatGPT Actions、Claude、Cursor、Antigravity</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowCreateKeyModal(true)}
            className="app-primary ui-button min-h-11 flex items-center gap-1.5 px-3.5 rounded-xl shadow-xs text-xs font-bold transition-transform active:scale-95 shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>建立新金鑰</span>
          </button>
        </div>

        <p className="ui-body text-[var(--app-muted)] leading-relaxed text-xs sm:text-sm">
          產生個人專屬 Bearer Token，讓外部 AI 助理直接查詢耗材狀態、新增備忘、一鍵記錄今日已換或扣減日常用量。
        </p>

        {/* API Key List */}
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between px-1">
            <span className="ui-meta text-[var(--app-muted)] font-bold text-xs">已啟用的 API 金鑰</span>
            {loadingKeys && <Loader2 className="w-3.5 h-3.5 animate-spin text-[var(--app-muted)]" />}
          </div>

          {apiKeys.length === 0 ? (
            <div className="bg-[var(--app-surface-subtle)] border border-dashed border-[var(--app-border)] p-4 rounded-xl text-center space-y-1">
              <p className="ui-meta text-[var(--app-muted)] text-xs">
                尚未建立任何 API Key。點擊右上角「建立新金鑰」開始串接！
              </p>
            </div>
          ) : (
            apiKeys.map((k) => (
              <div
                key={k.id}
                className="app-surface-subtle border p-3 rounded-xl flex items-center justify-between gap-2"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Key className="w-4 h-4 text-[var(--app-accent-strong)] shrink-0" />
                  <div className="min-w-0 space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="ui-item-title text-[var(--app-text)] text-sm font-semibold truncate block">
                        {k.name}
                      </span>
                      <code className="text-[11px] px-1.5 py-0.5 rounded bg-[var(--app-surface)] border border-[var(--app-border)] text-[var(--app-muted)] font-mono">
                        {k.keyPrefix}
                      </code>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-[var(--app-muted)]">
                      <span>建立：{k.createdAt ? businessDate(new Date(k.createdAt)) : '-'}</span>
                      <span>·</span>
                      <span>{k.lastUsedAt ? `上次使用：${businessDate(new Date(k.lastUsedAt))}` : '尚未調用'}</span>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleRevokeApiKey(k.id, k.name)}
                  aria-label={`廢止 ${k.name} 的 API Key`}
                  className="app-control ui-button min-h-10 min-w-10 flex items-center justify-center rounded-xl border hover:border-rose-500 text-[var(--app-muted)] hover:text-rose-600 shrink-0 transition-colors"
                  title="廢止此金鑰"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Integration Instructions Card with Dual Tabs */}
        <div className="bg-[var(--app-surface-subtle)] border border-[var(--app-border)] rounded-2xl p-3.5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="ui-meta font-bold text-[var(--app-text)] text-xs flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5 text-[var(--app-accent-strong)]" />
              <span>外部 AI 助理串接指引</span>
            </span>
            <div className="flex bg-[var(--app-surface)] border border-[var(--app-border)] rounded-lg p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setAgentTab('chatgpt')}
                className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                  agentTab === 'chatgpt'
                    ? 'app-primary text-xs shadow-xs font-bold'
                    : 'text-[var(--app-muted)] hover:text-[var(--app-text)]'
                }`}
              >
                ChatGPT Actions
              </button>
              <button
                type="button"
                onClick={() => setAgentTab('claude_cursor')}
                className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                  agentTab === 'claude_cursor'
                    ? 'app-primary text-xs shadow-xs font-bold'
                    : 'text-[var(--app-muted)] hover:text-[var(--app-text)]'
                }`}
              >
                Claude / Cursor Prompt
              </button>
            </div>
          </div>

          {agentTab === 'chatgpt' ? (
            <div className="space-y-2.5 text-xs text-[var(--app-muted)]">
              <p className="leading-relaxed">
                在 ChatGPT「My GPTs」&gt;「Configure」&gt;「Actions」點擊 <strong>Import from URL</strong>，輸入下方 OpenAPI 網址；認證選擇 <strong>API Key</strong>（Bearer），貼入您的金鑰即可：
              </p>
              <div className="flex items-center gap-1.5 bg-[var(--app-surface)] border border-[var(--app-border)] p-2 rounded-xl">
                <code className="text-[11px] font-mono select-all break-all flex-1 text-[var(--app-text)]">
                  {typeof window !== 'undefined' ? `${window.location.origin}/api/v1/openapi.json` : 'https://afterbuy.david888.com/api/v1/openapi.json'}
                </code>
                <button
                  type="button"
                  onClick={() => {
                    const url = typeof window !== 'undefined' ? `${window.location.origin}/api/v1/openapi.json` : 'https://afterbuy.david888.com/api/v1/openapi.json';
                    navigator.clipboard.writeText(url);
                    setCopiedOpenApi(true);
                    setTimeout(() => setCopiedOpenApi(false), 2000);
                  }}
                  className="app-control ui-button min-h-8 px-2.5 rounded-lg border hover:border-[var(--app-accent)] shrink-0 flex items-center gap-1"
                >
                  {copiedOpenApi ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedOpenApi ? '已複製' : '複製 URL'}</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2.5 text-xs text-[var(--app-muted)]">
              <p className="leading-relaxed">
                將以下 Prompt 貼至 Claude Projects、Cursor Rules 或自訂 Agent System Prompt，即可讓 LLM 理解 afterBUY 的資料結構與調用方式：
              </p>
              <div className="relative bg-[var(--app-surface)] border border-[var(--app-border)] p-3 rounded-xl max-h-56 overflow-y-auto font-mono text-[11px] leading-relaxed text-[var(--app-text)] select-all whitespace-pre-wrap">
                {systemPromptText}
              </div>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(systemPromptText);
                  setCopiedPrompt(true);
                  setTimeout(() => setCopiedPrompt(false), 2000);
                }}
                className="w-full app-control ui-button min-h-9 flex items-center justify-center gap-1.5 rounded-xl border hover:border-[var(--app-accent)] font-semibold transition-transform active:scale-95"
              >
                {copiedPrompt ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4 text-[var(--app-accent-strong)]" />}
                <span>{copiedPrompt ? 'Prompt 已複製至剪貼簿！' : '一鍵複製完整 System Prompt'}</span>
              </button>
            </div>
          )}

          {/* Quick doc link */}
          <div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-[var(--app-border)] text-[11px]">
            <a
              href="/skill.md"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--app-accent-strong)] hover:underline inline-flex items-center gap-1 font-semibold"
            >
              <span>Agent Skill.md</span>
              <ExternalLink className="w-3 h-3" />
            </a>
            <a
              href="/llms.txt"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--app-muted)] hover:text-[var(--app-text)] inline-flex items-center gap-1 font-medium"
            >
              <span>llms.txt</span>
              <ExternalLink className="w-3 h-3" />
            </a>
            <a
              href="/api/v1/openapi.json"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--app-muted)] hover:text-[var(--app-text)] inline-flex items-center gap-1"
            >
              <span>OpenAPI 3.1 JSON</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </div>

      {/* Modal: 建立新 API Key */}
      {showCreateKeyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm modal-backdrop-animate">
          <div className="app-surface border border-[var(--app-border)] rounded-2xl p-5 max-w-sm w-full space-y-4 shadow-xl">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl app-primary-soft border flex items-center justify-center shrink-0">
                <Key className="w-4 h-4 text-[var(--app-accent-strong)]" />
              </div>
              <div>
                <h3 className="ui-item-title text-[var(--app-text)]">建立 AI Agent API Key</h3>
                <p className="ui-meta text-[var(--app-muted)] text-xs">授權外部助理讀寫耗材資料</p>
              </div>
            </div>

            <form onSubmit={handleCreateApiKey} className="space-y-3.5">
              <div>
                <label className="ui-meta text-[var(--app-muted)] text-xs block mb-1 font-medium">
                  金鑰名稱 / 用途
                </label>
                <input
                  type="text"
                  required
                  placeholder="例如：ChatGPT GPTs, Cursor, 個人助理"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  className="w-full min-h-11 px-3.5 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] text-[var(--app-text)] placeholder-[var(--app-muted-low)] text-sm focus:outline-none focus:border-[var(--app-accent)]"
                />
              </div>

              {stockSpaces.length > 0 && (
                <div>
                  <label className="ui-meta text-[var(--app-muted)] text-xs block mb-1 font-medium">
                    綁定空間（可選）
                  </label>
                  <select
                    value={newKeyStockId}
                    onChange={(e) => setNewKeyStockId(e.target.value)}
                    className="w-full min-h-11 px-3.5 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] text-[var(--app-text)] text-sm focus:outline-none focus:border-[var(--app-accent)]"
                  >
                    <option value="">全部空間（預設無限制）</option>
                    {stockSpaces.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.icon} {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateKeyModal(false);
                    setNewKeyName('');
                    setNewKeyStockId('');
                  }}
                  className="flex-1 app-control ui-button min-h-11 rounded-xl border text-sm font-semibold"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={creatingKey}
                  className="flex-1 app-primary ui-button min-h-11 rounded-xl text-sm font-bold flex items-center justify-center gap-1.5 shadow-xs"
                >
                  {creatingKey ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>立即建立</span>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: 一次性金鑰顯示 */}
      {createdSecret && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm modal-backdrop-animate">
          <div className="app-surface border border-[var(--app-border)] rounded-2xl p-5 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <h3 className="ui-item-title text-[var(--app-text)]">API Key 已建立成功！</h3>
                <p className="ui-meta text-[var(--app-muted)] text-xs">金鑰名稱：{createdSecret.name}</p>
              </div>
            </div>

            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-800 dark:text-amber-300 text-xs leading-relaxed space-y-1">
              <div className="font-bold">⚠️ 請立即複製並保存此金鑰</div>
              <p>
                為了安全保護，<strong>完整金鑰只會顯示這一次</strong>。關閉此視窗後您將無法再次查看完整金鑰！
              </p>
            </div>

            <div className="space-y-1.5">
              <div className="p-3 bg-black/90 text-emerald-400 font-mono text-xs break-all select-all rounded-xl border border-emerald-500/30 shadow-inner">
                {createdSecret.rawKey}
              </div>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(createdSecret.rawKey);
                  setCopiedRawKey(true);
                  setTimeout(() => setCopiedRawKey(false), 2000);
                }}
                className="w-full app-primary ui-button min-h-11 flex items-center justify-center gap-1.5 rounded-xl font-bold text-sm shadow-xs transition-transform active:scale-95"
              >
                {copiedRawKey ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copiedRawKey ? '金鑰已成功複製！' : '複製完整金鑰'}</span>
              </button>
            </div>

            <div className="pt-1">
              <button
                type="button"
                onClick={() => {
                  setCreatedSecret(null);
                  setCopiedRawKey(false);
                }}
                className="w-full app-control ui-button min-h-11 rounded-xl border font-semibold text-sm hover:border-[var(--app-accent)]"
              >
                我已妥善儲存金鑰（關閉視窗）
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Notification Settings (Matching Reference Design) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <div>
            <h2 className="ui-section-title text-[var(--app-text)]">通知設定</h2>
            <p className="ui-meta text-[var(--app-muted)]">
              {(!(settings.cycleExpiryAlert ?? true) && !(settings.stockLowAlert ?? true) && !(settings.usageLowAlert ?? true) && !settings.emailEnabled && pushStatus !== 'granted')
                ? '提醒目前已全部關閉'
                : `提醒運作中 · 每日 ${formatHour(settings.preferredHour || 9)} 派發`}
            </p>
          </div>
        </div>

        {/* Card 1: 到期提醒 */}
        <div className="app-surface border p-4 rounded-2xl flex items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3 min-w-0">
            <div className="app-primary-soft w-10 h-10 rounded-xl border flex items-center justify-center shrink-0">
              <Calendar className="w-5 h-5 text-[var(--app-accent-strong)]" />
            </div>
            <div className="min-w-0">
              <h3 className="ui-item-title text-[var(--app-text)]">到期提醒</h3>
              <p className="ui-meta text-[var(--app-muted)]">週期更換與有效期限提醒。</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={handleCycleHour}
              className="app-control ui-meta font-semibold border rounded-lg px-2.5 py-1 text-xs text-[var(--app-muted)] hover:text-[var(--app-text)] hover:border-[var(--app-accent)] flex items-center gap-1 transition-colors"
              title="點擊切換每日提醒時間"
            >
              <Clock className="w-3.5 h-3.5" />
              <span>{formatHour(settings.preferredHour || 9)}</span>
            </button>
            <button
              type="button"
              role="switch"
              aria-checked={settings.cycleExpiryAlert ?? true}
              onClick={() => handleToggleSetting('cycleExpiryAlert', !(settings.cycleExpiryAlert ?? true))}
              className={`w-12 h-7 rounded-full transition-colors p-1 flex items-center ${
                (settings.cycleExpiryAlert ?? true)
                  ? 'app-primary justify-end'
                  : 'bg-[var(--app-surface-subtle)] border border-[var(--app-border)] justify-start'
              }`}
            >
              <div className="w-5 h-5 rounded-full bg-white shadow-xs" />
            </button>
          </div>
        </div>

        {/* Card 2: 備品庫存提醒 */}
        <div className="app-surface border p-4 rounded-2xl flex items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3 min-w-0">
            <div className="app-primary-soft w-10 h-10 rounded-xl border flex items-center justify-center shrink-0">
              <Package className="w-5 h-5 text-[var(--app-accent-strong)]" />
            </div>
            <div className="min-w-0">
              <h3 className="ui-item-title text-[var(--app-text)]">備品庫存提醒</h3>
              <p className="ui-meta text-[var(--app-muted)]">備品低於安全庫存時提醒。</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={handleCycleHour}
              className="app-control ui-meta font-semibold border rounded-lg px-2.5 py-1 text-xs text-[var(--app-muted)] hover:text-[var(--app-text)] hover:border-[var(--app-accent)] flex items-center gap-1 transition-colors"
              title="點擊切換每日提醒時間"
            >
              <Clock className="w-3.5 h-3.5" />
              <span>{formatHour(settings.preferredHour || 9)}</span>
            </button>
            <button
              type="button"
              role="switch"
              aria-checked={settings.stockLowAlert ?? true}
              onClick={() => handleToggleSetting('stockLowAlert', !(settings.stockLowAlert ?? true))}
              className={`w-12 h-7 rounded-full transition-colors p-1 flex items-center ${
                (settings.stockLowAlert ?? true)
                  ? 'app-primary justify-end'
                  : 'bg-[var(--app-surface-subtle)] border border-[var(--app-border)] justify-start'
              }`}
            >
              <div className="w-5 h-5 rounded-full bg-white shadow-xs" />
            </button>
          </div>
        </div>

        {/* Card 3: 用量提醒 */}
        <div className="app-surface border p-4 rounded-2xl flex items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3 min-w-0">
            <div className="app-primary-soft w-10 h-10 rounded-xl border flex items-center justify-center shrink-0">
              <Droplets className="w-5 h-5 text-[var(--app-accent-strong)]" />
            </div>
            <div className="min-w-0">
              <h3 className="ui-item-title text-[var(--app-text)]">用量提醒</h3>
              <p className="ui-meta text-[var(--app-muted)]">剩餘量偏低與預估快用完時提醒。</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={handleCycleHour}
              className="app-control ui-meta font-semibold border rounded-lg px-2.5 py-1 text-xs text-[var(--app-muted)] hover:text-[var(--app-text)] hover:border-[var(--app-accent)] flex items-center gap-1 transition-colors"
              title="點擊切換每日提醒時間"
            >
              <Clock className="w-3.5 h-3.5" />
              <span>{formatHour(settings.preferredHour || 9)}</span>
            </button>
            <button
              type="button"
              role="switch"
              aria-checked={settings.usageLowAlert ?? true}
              onClick={() => handleToggleSetting('usageLowAlert', !(settings.usageLowAlert ?? true))}
              className={`w-12 h-7 rounded-full transition-colors p-1 flex items-center ${
                (settings.usageLowAlert ?? true)
                  ? 'app-primary justify-end'
                  : 'bg-[var(--app-surface-subtle)] border border-[var(--app-border)] justify-start'
              }`}
            >
              <div className="w-5 h-5 rounded-full bg-white shadow-xs" />
            </button>
          </div>
        </div>

        {/* Section: 預設提醒天數 */}
        <div className="space-y-2 pt-2">
          <span className="ui-meta text-[var(--app-muted)] px-1 font-bold block">預設提醒天數</span>

          {/* 預設更換前提醒 */}
          <div className="app-surface border p-4 rounded-2xl space-y-2.5 shadow-xs">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <RotateCw className="w-4 h-4 text-[var(--app-accent-strong)]" />
                <h4 className="ui-item-title text-[var(--app-text)]">預設更換前提醒</h4>
              </div>
              <div className="flex gap-1.5">
                {[1, 3, 7].map((days) => (
                  <button
                    key={days}
                    type="button"
                    onClick={() => handleToggleSetting('warningDaysBefore', days)}
                    className={`min-h-8 px-2.5 rounded-lg ui-button text-xs font-bold transition-all border ${
                      settings.warningDaysBefore === days
                        ? 'app-primary shadow-xs border-transparent'
                        : 'app-surface border-[var(--app-border)] text-[var(--app-muted)] hover:text-[var(--app-text)]'
                    }`}
                  >
                    {days} 天
                  </button>
                ))}
              </div>
            </div>
            <p className="ui-meta text-[var(--app-muted)] text-xs">
              調整更換週期預設提前幾天顯示與通知。
            </p>
          </div>

          {/* 預設有效期限提醒 */}
          <div className="app-surface border p-4 rounded-2xl space-y-2.5 shadow-xs">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <Calendar className="w-4 h-4 text-[var(--app-accent-strong)]" />
                <h4 className="ui-item-title text-[var(--app-text)]">預設有效期限提醒</h4>
              </div>
              <div className="flex gap-1.5">
                {[3, 7, 14, 30].map((days) => {
                  const currentDays = settings.expiryWarningDays || 7;
                  return (
                    <button
                      key={days}
                      type="button"
                      onClick={() => handleToggleSetting('expiryWarningDays', days)}
                      className={`min-h-8 px-2.5 rounded-lg ui-button text-xs font-bold transition-all border ${
                        currentDays === days
                          ? 'app-primary shadow-xs border-transparent'
                          : 'app-surface border-[var(--app-border)] text-[var(--app-muted)] hover:text-[var(--app-text)]'
                      }`}
                    >
                      {days} 天
                    </button>
                  );
                })}
              </div>
            </div>
            <p className="ui-meta text-[var(--app-muted)] text-xs">
              調整有效期限前幾天顯示與通知，包含使用中與庫存。
            </p>
          </div>
        </div>

        {/* Section: 手機 PWA 系統推播通知 (Web Push) & iOS 指引 */}
        <div className="app-surface border p-4 rounded-2xl space-y-3 shadow-xs">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="app-primary-soft w-9 h-9 rounded-xl border flex items-center justify-center shrink-0">
                <Smartphone className="w-4 h-4 text-[var(--app-accent-strong)]" />
              </div>
              <div className="min-w-0">
                <h3 className="ui-item-title text-[var(--app-text)] truncate">手機 PWA 系統推播通知</h3>
                <p className="ui-meta text-[var(--app-muted)] truncate">iOS 16.4+ 與 Android 鎖定螢幕橫幅</p>
              </div>
            </div>
            <div className="shrink-0">
              {pushStatus !== 'granted' ? (
                <button
                  type="button"
                  onClick={handleEnablePush}
                  disabled={pushSubscribing}
                  className="app-primary ui-button min-h-9 px-3.5 rounded-xl shadow-xs text-xs font-bold transition-transform active:scale-95"
                >
                  {pushSubscribing ? '授權中...' : '啟用推播'}
                </button>
              ) : (
                <span className="ui-badge bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 px-2.5 py-1 rounded-full text-xs font-bold">
                  推播運作中
                </span>
              )}
            </div>
          </div>

          {/* iOS Add to Home Screen tip */}
          <div className="bg-[var(--app-surface-subtle)] border border-[var(--app-border)] p-3 rounded-xl text-xs space-y-1 text-[var(--app-muted)]">
            <div className="flex items-center gap-1.5 font-bold text-[var(--app-text)]">
              <Info className="w-3.5 h-3.5 text-[var(--app-accent-strong)]" />
              <span>iPhone (iOS) 使用者設定指引</span>
            </div>
            <p className="leading-relaxed">
              自 iOS 16.4 起，只要在 Safari 點擊底部的「<strong>分享 ⎋</strong>」並選擇「<strong>加入主畫面 ⊞</strong>」，即可與 App Store 原生 App 一樣享有系統級鎖定螢幕橫幅通知！
            </p>
          </div>

          {/* Email Digest toggle */}
          <div className="flex items-center justify-between gap-3 pt-1 border-t border-[var(--app-border)]">
            <div className="min-w-0">
              <span className="ui-item-title text-sm text-[var(--app-text)] block">Email 晨間摘要信</span>
              <span className="ui-meta text-xs text-[var(--app-muted)]">每日定期寄發即將到期之耗材彙整</span>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={settings.emailEnabled}
              onClick={() => handleToggleSetting('emailEnabled', !settings.emailEnabled)}
              className={`w-12 h-7 rounded-full transition-colors p-1 flex items-center shrink-0 ${
                settings.emailEnabled ? 'app-primary justify-end' : 'bg-[var(--app-surface-subtle)] border border-[var(--app-border)] justify-start'
              }`}
            >
              <div className="w-5 h-5 rounded-full bg-white shadow-xs" />
            </button>
          </div>
        </div>
      </div>

      {/* 5.生活工具與版本資訊 (Quick Shortcuts) */}
      <div className="space-y-2 pt-1">
        <span className="ui-meta text-[var(--app-muted)] px-1 font-bold block">生活工具與版本資訊</span>

        {/* Preset catalog shortcut */}
        {onOpenPresetCatalog && (
          <button
            type="button"
            onClick={onOpenPresetCatalog}
            className="w-full app-surface border p-3.5 rounded-2xl flex items-center justify-between gap-3 text-left hover:border-[var(--app-accent)] transition-all shadow-xs group"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl app-primary-soft border flex items-center justify-center shrink-0">
                <BookOpen className="w-4 h-4 text-[var(--app-accent-strong)]" />
              </div>
              <div>
                <span className="ui-item-title text-[var(--app-text)] group-hover:text-[var(--app-accent-strong)] transition-colors block">
                  常用耗材範本庫
                </span>
                <span className="ui-meta text-[var(--app-muted)] block text-xs">
                  好市多 150 顆魚油等 30+ 款常見耗材，一鍵入庫
                </span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-[var(--app-muted)] group-hover:text-[var(--app-text)] transition-transform group-hover:translate-x-0.5" />
          </button>
        )}

        {/* Version Notice / What's New shortcut */}
        {onOpenVersionNotice && (
          <button
            type="button"
            onClick={onOpenVersionNotice}
            className="w-full app-surface border p-3.5 rounded-2xl flex items-center justify-between gap-3 text-left hover:border-[var(--app-accent)] transition-all shadow-xs group"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl app-primary-soft border flex items-center justify-center shrink-0">
                <Sparkles className="w-4 h-4 text-[var(--app-accent-strong)]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="ui-item-title text-[var(--app-text)] group-hover:text-[var(--app-accent-strong)] transition-colors block">
                    這版新增 · 版本更新紀錄
                  </span>
                  <span className="ui-badge bg-[var(--app-accent-strong)] text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full">
                    NEW
                  </span>
                </div>
                <span className="ui-meta text-[var(--app-muted)] block text-xs">
                  查看常用耗材庫、細緻通知與月曆時程升級亮點
                </span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-[var(--app-muted)] group-hover:text-[var(--app-text)] transition-transform group-hover:translate-x-0.5" />
          </button>
        )}
      </div>

      {/* 6. Phase 2 VIP Tier Preview */}
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
