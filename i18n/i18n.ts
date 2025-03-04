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
    // Android 的语言检测更新 - 尝试多种方法
    deviceLanguage = 
      NativeModules.I18nManager?.localeIdentifier ||
      NativeModules.I18nManager?.locale ||
      NativeModules.SettingsManager?.settings?.locale ||
      'zh';
    
    console.log('Android 原始语言值:', deviceLanguage);
  }
  
  console.log('设备语言原始值:', deviceLanguage);
  
  // 处理语言代码格式
  if (deviceLanguage) {
    // 处理类似 zh-CN, zh_CN, zh_Hans_CN 等格式
    if (deviceLanguage.includes('-')) {
      deviceLanguage = deviceLanguage.split('-')[0];
    }
    if (deviceLanguage.includes('_')) {
      deviceLanguage = deviceLanguage.split('_')[0];
    }
    
    // 如果检测到 zh 的任何变体，统一返回 zh
    if (deviceLanguage.toLowerCase().startsWith('zh')) {
      return 'zh';
    }
    
    return deviceLanguage.slice(0, 2).toLowerCase();
  }
  
  return 'en'; // 默认返回英文
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