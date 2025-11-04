
"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import ar from "./ar.json";
import en from "./en.json";

type Locale = "ar" | "en";
type Direction = "ltr" | "rtl";

type TranslationOptions = Record<string, string | number>;

type TranslationContextValue = {
  locale: Locale;
  direction: Direction;
  setLocale: (nextLocale: Locale) => void;
  toggleLocale: () => void;
  t: (key: string, options?: TranslationOptions) => string;
  tm: <T = unknown>(key: string) => T;
};

const resources = {
  ar,
  en,
} as const satisfies Record<Locale, Record<string, unknown>>;

const DEFAULT_LOCALE: Locale = "ar";

const TranslationContext = createContext<TranslationContextValue | undefined>(undefined);

const resolveMessage = (messages: Record<string, unknown>, key: string): unknown => {
  return key.split(".").reduce<unknown>((accumulator, segment) => {
    if (accumulator && typeof accumulator === "object" && segment in accumulator) {
      return (accumulator as Record<string, unknown>)[segment];
    }
    return undefined;
  }, messages);
};

const formatMessage = (message: string, options?: TranslationOptions): string => {
  if (!options) {
    return message;
  }

  return message.replace(/\{\{\s*(\w+)\s*\}\}/g, (_match, token) => {
    const value = options[token];
    return value !== undefined ? String(value) : _match;
  });
};

const detectBrowserLocale = (): Locale => {
  if (typeof window === "undefined") {
    return DEFAULT_LOCALE;
  }

  const storedLocale = window.localStorage.getItem("locale");
  if (storedLocale === "ar" || storedLocale === "en") {
    return storedLocale;
  }

  const [browserLanguage] = window.navigator.language.toLowerCase().split("-");
  return browserLanguage === "ar" ? "ar" : "en";
};

export const TranslationProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  // Initialize with a non-browser-dependent default
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);

  // Defer browser-specific logic to useEffect
  useEffect(() => {
    const initialLocale = detectBrowserLocale();
    setLocaleState(initialLocale);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    window.localStorage.setItem("locale", locale);
    document.documentElement.lang = locale;
    document.documentElement.dir = locale === "ar" ? "rtl" : "ltr";
  }, [locale]);

  const direction: Direction = locale === "ar" ? "rtl" : "ltr";

  const tm = useCallback(<T,>(key: string): T => {
    const currentMessages = resources[locale] as Record<string, unknown>;
    const fallbackMessages = resources.en as Record<string, unknown>;

    const message = resolveMessage(currentMessages, key);
    if (message !== undefined) {
      return message as T;
    }

    const fallbackMessage = resolveMessage(fallbackMessages, key);
    return (fallbackMessage ?? key) as T;
  }, [locale]);

  const t = useCallback((key: string, options?: TranslationOptions): string => {
    const message = tm<string>(key);
    if (typeof message !== "string") {
      return Array.isArray(message) ? key : String(message ?? key);
    }
    return formatMessage(message, options);
  }, [tm]);

  const setLocale = useCallback((nextLocale: Locale) => {
    setLocaleState(nextLocale);
  }, []);

  const toggleLocale = useCallback(() => {
    setLocaleState(prev => (prev === "ar" ? "en" : "ar"));
  }, []);

  const value = useMemo<TranslationContextValue>(() => ({
    locale,
    direction,
    setLocale,
    toggleLocale,
    t,
    tm,
  }), [direction, locale, setLocale, t, tm, toggleLocale]);

  return (
    <TranslationContext.Provider value={value}>
      {children}
    </TranslationContext.Provider>
  );
};

export const useTranslation = (): TranslationContextValue => {
  const context = useContext(TranslationContext);
  if (!context) {
    throw new Error("useTranslation must be used within a TranslationProvider");
  }
  return context;
};
