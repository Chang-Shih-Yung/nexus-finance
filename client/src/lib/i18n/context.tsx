"use client"

import * as React from "react"

import zhTW from "./locales/zh-TW.json"
import en from "./locales/en.json"

export type Locale = "zh-TW" | "en"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const dictionaries: Record<Locale, Record<string, any>> = {
  "zh-TW": zhTW,
  en: en,
}

type I18nContextValue = {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: (key: string) => string
}

const I18nContext = React.createContext<I18nContextValue | null>(null)

function flatten(
  obj: Record<string, unknown>,
  prefix = ""
): Record<string, string> {
  const result: Record<string, string> = {}
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key
    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      Object.assign(result, flatten(value as Record<string, unknown>, fullKey))
    } else {
      result[fullKey] = String(value)
    }
  }
  return result
}

const flatCache = new Map<Locale, Record<string, string>>()

function getFlat(locale: Locale): Record<string, string> {
  if (!flatCache.has(locale)) {
    flatCache.set(locale, flatten(dictionaries[locale]))
  }
  return flatCache.get(locale)!
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = React.useState<Locale>(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("locale") as Locale) || "zh-TW"
    }
    return "zh-TW"
  })

  const setLocale = React.useCallback((l: Locale) => {
    setLocaleState(l)
    localStorage.setItem("locale", l)
    document.documentElement.lang = l
  }, [])

  const t = React.useCallback(
    (key: string) => {
      const flat = getFlat(locale)
      if (process.env.NODE_ENV === 'development' && !(key in flat)) {
        console.warn(`[i18n] Missing key "${key}" for locale "${locale}"`)
      }
      return flat[key] ?? key
    },
    [locale]
  )

  const value = React.useMemo(
    () => ({ locale, setLocale, t }),
    [locale, setLocale, t]
  )

  return <I18nContext value={value}>{children}</I18nContext>
}

export function useI18n() {
  const ctx = React.useContext(I18nContext)
  if (!ctx) throw new Error("useI18n must be used within I18nProvider")
  return ctx
}
