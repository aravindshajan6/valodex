/** Every human-readable string from valorant-api.com, keyed by locale (`?language=all`). */
export type Localized = Partial<Record<Locale, string>>;

export const LOCALES = [
  "en-US", "es-MX", "es-ES", "it-IT", "ar-AE", "de-DE", "id-ID", "fr-FR", "ko-KR",
  "ja-JP", "pt-BR", "th-TH", "ru-RU", "pl-PL", "tr-TR", "vi-VN", "zh-CN", "zh-TW",
] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en-US";

/** Resolve a localized string, falling back to en-US, then to any available value. */
export function t(value: Localized | null | undefined, locale: Locale = DEFAULT_LOCALE): string {
  if (!value) return "";
  return value[locale] ?? value[DEFAULT_LOCALE] ?? Object.values(value).find(Boolean) ?? "";
}
