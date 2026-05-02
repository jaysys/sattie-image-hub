import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import en from "./en.json";
import ko from "./ko.json";

const localeStorageKey = "sattieLocale";
const messages = { en, ko } as const;

export type Locale = keyof typeof messages;
type MessageTree = (typeof messages)[Locale];

type I18nContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

function getInitialLocale(): Locale {
  if (typeof window === "undefined") {
    return "ko";
  }

  const saved = window.localStorage.getItem(localeStorageKey);
  return saved === "ko" || saved === "en" ? saved : "ko";
}

function resolveMessage(tree: MessageTree, key: string): string | null {
  const resolved = key.split(".").reduce<unknown>((current, segment) => {
    if (current && typeof current === "object" && segment in current) {
      return (current as Record<string, unknown>)[segment];
    }

    return null;
  }, tree);

  return typeof resolved === "string" ? resolved : null;
}

function interpolate(template: string, params?: Record<string, string | number>) {
  if (!params) {
    return template;
  }

  return template.replace(/\{(\w+)\}/g, (_, token: string) => String(params[token] ?? `{${token}}`));
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>(getInitialLocale);

  useEffect(() => {
    window.localStorage.setItem(localeStorageKey, locale);
    document.documentElement.lang = locale;
  }, [locale]);

  const value = useMemo<I18nContextValue>(
    () => ({
      locale,
      setLocale,
      t: (key, params) => {
        const template = resolveMessage(messages[locale], key) ?? resolveMessage(messages.ko, key) ?? key;
        return interpolate(template, params);
      },
    }),
    [locale],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);

  if (!context) {
    throw new Error("useI18n must be used within I18nProvider");
  }

  return context;
}
