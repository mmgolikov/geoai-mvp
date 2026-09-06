"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import {
  interpolatePointObjectCopy,
  normalizePointObjectLocale,
  POINT_OBJECT_LOCALE_COOKIE,
  pointObjectCopy,
  type PointObjectCopyKey,
  type PointObjectLocale
} from "@/src/lib/prototype/point-to-object-i18n";

type LocaleContextValue = {
  locale: PointObjectLocale;
  setLocale: (locale: PointObjectLocale) => void;
  t: (key: PointObjectCopyKey, parameters?: Record<string, string | number>) => string;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function PointObjectLocaleProvider({ initialLocale, children }: { initialLocale: PointObjectLocale; children: ReactNode }) {
  const [locale, setLocaleState] = useState(initialLocale);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = useCallback((nextLocale: PointObjectLocale) => {
    const normalized = normalizePointObjectLocale(nextLocale);
    document.cookie = `${POINT_OBJECT_LOCALE_COOKIE}=${normalized}; Path=/; Max-Age=31536000; SameSite=Lax`;
    document.documentElement.lang = normalized;
    setLocaleState(normalized);
  }, []);

  const value = useMemo<LocaleContextValue>(() => ({
    locale,
    setLocale,
    t: (key, parameters) => interpolatePointObjectCopy(pointObjectCopy[locale][key], parameters)
  }), [locale, setLocale]);

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function usePointObjectLocale(): LocaleContextValue {
  const context = useContext(LocaleContext);
  if (!context) throw new Error("usePointObjectLocale must be used inside PointObjectLocaleProvider");
  return context;
}
