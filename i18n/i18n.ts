import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './translations/en';
import zh from './translations/zh';

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    zh: { translation: zh },
  },
  lng: 'zh', // 默认语言
  fallbackLng: 'en', // 回退语言
  interpolation: {
    escapeValue: false,
  },
});

export default i18n; 