import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import HttpBackend from 'i18next-http-backend';

i18n
  .use(HttpBackend) // Load translations via HTTP
  .use(LanguageDetector) // Detect user language
  .use(initReactI18next) // Pass i18n instance to react-i18next
  .init({
    fallbackLng: 'en',
    debug: false,
    
    // Phase 1 MVP languages: English, Hindi, Marathi, Bengali + South Indian languages
    supportedLngs: ['en', 'hi', 'mr', 'bn', 'ta', 'te', 'kn', 'ml'],
    
    interpolation: {
      escapeValue: false, // React already escapes
    },
    
    backend: {
      // Load from public/locales/{lng}/translation.json
      loadPath: '/locales/{{lng}}/translation.json',
    },
    
    detection: {
      // Order of detection methods
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'i18nextLng',
    },
    
    react: {
      useSuspense: false, // Disable suspense for now (avoids loading flicker)
    },
  });

export default i18n;
