import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import ko from './locales/ko.json';
import en from './locales/en.json';

const getStoredLanguage = () => {
  try {
    const stored = window.localStorage.getItem('language');
    return stored === 'en' || stored === 'ko' ? stored : 'ko';
  } catch {
    return 'ko';
  }
};

const setDocumentLanguage = (lng) => {
  try {
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('lang', String(lng || 'ko').startsWith('en') ? 'en' : 'ko');
    }
  } catch {
    // Ignore DOM access failures (e.g. non-browser environments).
  }
};

const resources = {
  ko: { translation: ko },
  en: { translation: en },
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: getStoredLanguage(), // Korean is the default language
    fallbackLng: 'ko',
    interpolation: {
      escapeValue: false, // React already handles XSS
    },
    react: {
      useSuspense: false,
    },
  });

setDocumentLanguage(i18n.language);
i18n.on('languageChanged', setDocumentLanguage);

export default i18n;
