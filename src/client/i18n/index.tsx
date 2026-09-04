import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { DICTIONARIES, Locale, TranslationKey } from './dictionaries.ts';

interface I18nContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  toggleLocale: () => void;
  t: (key: TranslationKey, params?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

const STORAGE_KEY = 'afterbuy_language';

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [locale, setLocaleState] = useState<Locale>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY) as Locale;
      if (saved === 'zh-TW' || saved === 'en') return saved;
      if (navigator.language && !navigator.language.toLowerCase().startsWith('zh')) {
        return 'en';
      }
    }
    return 'zh-TW';
  });

  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale);
    try {
      localStorage.setItem(STORAGE_KEY, newLocale);
      document.documentElement.lang = newLocale === 'zh-TW' ? 'zh-Hant' : 'en';
    } catch {
      // Ignore storage errors in private browsing
    }
  };

  const toggleLocale = () => {
    setLocale(locale === 'zh-TW' ? 'en' : 'zh-TW');
  };

  useEffect(() => {
    document.documentElement.lang = locale === 'zh-TW' ? 'zh-Hant' : 'en';
  }, [locale]);

  const t = useMemo(() => {
    const dict = DICTIONARIES[locale] || DICTIONARIES['zh-TW'];
    return (key: TranslationKey, params?: Record<string, string | number>): string => {
      let val = (dict as any)[key] || (DICTIONARIES['zh-TW'] as any)[key] || key;
      if (params) {
        Object.entries(params).forEach(([k, v]) => {
          val = val.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
        });
      }
      return val;
    };
  }, [locale]);

  return (
    <I18nContext.Provider value={{ locale, setLocale, toggleLocale, t }}>
      {children}
    </I18nContext.Provider>
  );
};

export function useTranslation() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useTranslation must be used within an I18nProvider');
  }
  return context;
}
