import React, { useEffect, useRef, useState } from 'react';
import { watchPwaUpdates } from '../utils/pwaUpdates.ts';
import { useTranslation } from '../i18n/index.tsx';

export function PwaUpdateNotice({ busy }: { busy: boolean }) {
  const { locale } = useTranslation();
  const [available, setAvailable] = useState(false);
  const [applying, setApplying] = useState(false);
  const [failed, setFailed] = useState(false);
  const updates = useRef<ReturnType<typeof watchPwaUpdates> | null>(null);

  useEffect(() => {
    if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;
    const watcher = watchPwaUpdates(
      navigator.serviceWorker,
      () => setAvailable(true),
      () => window.location.reload(),
      (error) => console.warn('PWA update check failed:', error),
      `${import.meta.env.BASE_URL}sw.js`,
    );
    updates.current = watcher;
    const check = () => {
      if (document.visibilityState === 'visible') void watcher.check();
    };
    document.addEventListener('visibilitychange', check);
    return () => {
      document.removeEventListener('visibilitychange', check);
      watcher.dispose();
      updates.current = null;
    };
  }, []);

  if (!available || busy) return null;
  const apply = async () => {
    if (busy || applying || !updates.current) return;
    setApplying(true);
    setFailed(false);
    try {
      await updates.current.apply();
    } catch {
      setFailed(true);
      setApplying(false);
    }
  };

  return (
    <div role="status" className="fixed top-4 left-4 right-4 z-40 mx-auto max-w-lg app-surface rounded-xl shadow-lg p-4 flex flex-wrap items-center gap-3">
      <p className="ui-body flex-1 text-[var(--app-text)]">
        {failed
          ? (locale === 'zh-TW' ? '更新失敗，請稍後重試。' : 'Update failed. Please try again.')
          : (locale === 'zh-TW' ? '新版已準備好，可以更新了。' : 'An update is ready.')}
      </p>
      <button type="button" disabled={applying} onClick={apply} className="app-primary ui-button rounded-xl min-h-11 px-4 disabled:opacity-60">
        {locale === 'zh-TW' ? (applying ? '更新中…' : '更新') : (applying ? 'Updating…' : 'Update')}
      </button>
      <button type="button" disabled={applying} onClick={() => setAvailable(false)} className="app-control ui-button rounded-xl min-h-11 px-3">
        {locale === 'zh-TW' ? '稍後' : 'Later'}
      </button>
    </div>
  );
}
