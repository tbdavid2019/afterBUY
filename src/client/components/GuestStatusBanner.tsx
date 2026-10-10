import React from 'react';
import { Fingerprint, Upload, AlertCircle } from 'lucide-react';
import { useTranslation } from '../i18n/index.tsx';

interface Props {
  signedIn: boolean;
  localCount: number;
  storageError: string | null;
  importMessage: string | null;
  importing: boolean;
  destination?: string;
  onLogin: () => void;
  onImport: () => void;
  onRetrySave: () => void;
}

export function GuestStatusBanner({ signedIn, localCount, storageError, importMessage, importing, destination, onLogin, onImport, onRetrySave }: Props) {
  const { locale } = useTranslation();
  const zh = locale === 'zh-TW';
  if (signedIn && localCount === 0 && !importMessage) return null;
  return (
    <section aria-label={zh ? '試用與資料儲存狀態' : 'Trial and storage status'} className="mb-4 rounded-xl bg-[var(--app-surface-subtle)] border border-[var(--app-border)] p-4 text-[var(--app-text)]">
      <h2 className="ui-section-title">
        {signedIn ? (localCount > 0 ? (zh ? '試用物品尚未帶入帳號' : 'Trial items are still on this device') : (zh ? '試用物品已帶入帳號' : 'Trial items imported')) : (zh ? '目前為試用模式 · 尚未登入' : 'Trial mode · Not signed in')}
      </h2>
      <p className="ui-body mt-2">
        {signedIn
          ? (zh ? `本機有 ${localCount} 項自訂物品。帶入後會保留目前的週期、剩餘數量、備品與照片。示範物品不會帶入。` : `${localCount} custom items are stored locally. Import preserves their dates, remaining quantities, spare stock and photos. Demo items are excluded.`)
          : (zh ? '物品與操作狀態會儲存在這個瀏覽器，重新整理後仍保留。尚未同步到帳號；換裝置或清除網站資料就無法取回。' : 'Items and changes are saved in this browser and survive a refresh. They are not synced to an account. They are unavailable on another device or after clearing site data.')}
      </p>
      {!signedIn && <p className="ui-meta mt-2 text-[var(--app-muted)]">{zh ? `已新增 ${localCount} 項自訂物品；登入／註冊後可帶入帳號。清單中的「示範」是範例資料。` : `${localCount} custom items added. Sign in or register to import them. Items marked “Demo” are examples.`}</p>}
      {storageError && !signedIn && (
        <div role="alert" className="mt-3 ui-body">
          <p className="flex items-start gap-2"><AlertCircle className="w-5 h-5 shrink-0" />{zh ? `最新變更未成功儲存：${storageError} 請保留此頁並重試。` : 'Recent changes could not be saved. Keep this page open and retry.'}</p>
          <button type="button" onClick={onRetrySave} className="app-control ui-button min-h-11 rounded-xl px-4 mt-2">{zh ? '重試本機儲存' : 'Retry local save'}</button>
        </div>
      )}
      {importMessage && <p role="status" className="ui-body mt-3">{importMessage}</p>}
      <div className="mt-3 flex flex-wrap items-center gap-3">
        {!signedIn ? (
          <button type="button" onClick={onLogin} className="app-primary ui-button rounded-xl min-h-11 px-4 flex items-center gap-2"><Fingerprint className="w-5 h-5" />{zh ? '登入／註冊，保留試用物品' : 'Sign in / Register to keep your items'}</button>
        ) : localCount > 0 && (
          <button type="button" onClick={onImport} disabled={importing || !destination} className="app-primary ui-button rounded-xl min-h-11 px-4 flex items-center gap-2 disabled:opacity-60"><Upload className="w-5 h-5" />{zh ? (importing ? '正在帶入…' : `帶入「${destination || '尚無可編輯空間'}」`) : (importing ? 'Importing…' : `Import to ${destination || 'an editable stock'}`)}</button>
        )}
      </div>
    </section>
  );
}
