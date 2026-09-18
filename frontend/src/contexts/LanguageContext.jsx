import React, { createContext, useContext, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

const LanguageContext = createContext();

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
};

export function LanguageProvider({ children }) {
  const { i18n } = useTranslation();
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // Initialize language from user profile on app load
    const initializeLanguage = async () => {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      
      // If user is logged in and has a preferred language, use it
      if (user.preferred_language) {
        await i18n.changeLanguage(user.preferred_language);
      } else {
        // Otherwise, use browser/localStorage detection (already handled by i18next-browser-languagedetector)
        // Default will be 'en' if no detection succeeds
      }
      
      setIsInitialized(true);
    };

    initializeLanguage();
  }, [i18n]);

  const value = {
    currentLanguage: i18n.language,
    changeLanguage: i18n.changeLanguage,
    isInitialized,
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}
