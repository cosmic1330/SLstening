import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import enTranslation from "./locales/en.json";
import zhTranslation from "./locales/zh-tw.json";

export const normalizeLanguage = (language?: string) =>
  language?.toLowerCase().startsWith("zh") ? "zh-TW" : "en";

export const syncDocumentLanguage = (language?: string) => {
  if (typeof document === "undefined") return;
  const normalized = normalizeLanguage(language);
  document.documentElement.lang = normalized === "zh-TW" ? "zh-Hant" : "en";
  document.documentElement.dir = "ltr";
};

export const i18nOptions = {
  fallbackLng: "en",
  supportedLngs: ["en", "zh-TW"],
  // Only resolve exact resource keys. Region/browser values are normalized by
  // the detector below, so i18next never falls through to an unregistered `zh`.
  nonExplicitSupportedLngs: false,
  load: "currentOnly" as const,
  detection: {
    order: ["querystring", "cookie", "localStorage", "navigator", "htmlTag"],
    caches: ["localStorage", "cookie"],
    convertDetectedLanguage: (language: string) => normalizeLanguage(language),
  },
  interpolation: { escapeValue: false },
  resources: {
    en: { translation: enTranslation },
    "zh-TW": { translation: zhTranslation },
  },
};

i18n.on("initialized", () => syncDocumentLanguage(i18n.resolvedLanguage ?? i18n.language));
i18n.on("languageChanged", (language) => {
  const normalized = normalizeLanguage(language);
  if (language !== normalized) {
    void i18n.changeLanguage(normalized);
    return;
  }
  syncDocumentLanguage(normalized);
  i18n.services.languageDetector?.cacheUserLanguage(normalized);
});

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init(i18nOptions);

export default i18n;
