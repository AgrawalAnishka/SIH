import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// ── Translations bundled directly — no HTTP loading, no race conditions ──────
import en from '../public/locales/en/translation.json';
import hi from '../public/locales/hi/translation.json';
import mr from '../public/locales/mr/translation.json';
import bn from '../public/locales/bn/translation.json';
import ta from '../public/locales/ta/translation.json';
import te from '../public/locales/te/translation.json';
import kn from '../public/locales/kn/translation.json';
import ml from '../public/locales/ml/translation.json';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    // All translations available immediately — no async fetch needed
    resources: {
      en: { translation: en },
      hi: { translation: hi },
      mr: { translation: mr },
      bn: { translation: bn },
      ta: { translation: ta },
      te: { translation: te },
      kn: { translation: kn },
      ml: { translation: ml },
    },

    fallbackLng: 'en',
    supportedLngs: ['en', 'hi', 'mr', 'bn', 'ta', 'te', 'kn', 'ml'],

    interpolation: {
      escapeValue: false,
    },

    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'i18nextLng',
    },

    react: {
      useSuspense: false,
      bindI18n: 'languageChanged',
    },
  });

export default i18n;
