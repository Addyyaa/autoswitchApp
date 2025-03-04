import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { NativeModules, Platform } from 'react-native';
import en from './translations/en';
import zh from './translations/zh';

// 获取设备语言
const getDeviceLanguage = () => {
  let deviceLanguage;
  
  if (Platform.OS === 'ios') {
    deviceLanguage = NativeModules.LanguageManager?.language || 
                   NativeModules.SettingsManager?.settings?.AppleLocale || 
                   NativeModules.SettingsManager?.settings?.AppleLanguages?.[0];
  } else {
    deviceLanguage = NativeModules.I18nManager?.localeIdentifier;
  }
  
  console.log('设备语言原始值:', deviceLanguage);
  
  // 转换为简单语言代码 (例如 'en', 'zh')
  return deviceLanguage ? deviceLanguage.slice(0, 2) : 'en';
};

const detectedLanguage = getDeviceLanguage();
console.log('检测到的语言代码:', detectedLanguage);

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    zh: { translation: zh },
  },
  lng: detectedLanguage, // 使用检测到的语言
  fallbackLng: 'en', // 回退语言
  interpolation: {
    escapeValue: false,
  },
});

console.log('i18n当前使用的语言:', i18n.language);

export default i18n; 