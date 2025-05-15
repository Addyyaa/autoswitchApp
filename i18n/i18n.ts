import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { NativeModules, Platform } from 'react-native';
import en from './translations/en';
import zh from './translations/zh';
import * as Localization from 'expo-localization';

// 获取设备语言
const getDeviceLanguage = () => {
  let deviceLanguage;
  // 使用 Localization 获取语言
  const locales = Localization.getLocales();
  const locale = locales[0]?.languageCode || 'en';
  console.log('Expo Localization 检测到的语言:', locale);
  if (Platform.OS === 'ios') {
    // iOS 语言检测
    deviceLanguage = 
      Localization.getLocales()?.[0]?.languageCode ||
      NativeModules.LanguageManager?.language ||
      NativeModules.SettingsManager?.settings?.AppleLocale ||
      NativeModules.SettingsManager?.settings?.AppleLanguages?.[0];
      
    console.log('iOS 原始语言值:', deviceLanguage);
  } else {
    // 改进 Android 语言检测
    try {
      deviceLanguage = 
        Localization.getLocales()?.[0]?.languageCode ||
        NativeModules.I18nManager?.localeIdentifier ||
        NativeModules.I18nManager?.locale ||
        NativeModules.Settings?.settings?.locale ||
        NativeModules.ApplicationLanguages?.getLocales()?.[0]?.languageCode;
        
      console.log('Android 原始语言值:', deviceLanguage);
    } catch (error) {
      console.log('获取 Android 语言时出错:', error);
      deviceLanguage = 'en'; // 默认使用英语
    }
  }
  
  
  // 标准化语言代码
  if (deviceLanguage) {
    // 移除区域代码，只保留语言代码
    let languageCode = deviceLanguage.toLowerCase();
    
    // 处理各种格式的语言代码
    if (languageCode.includes('-')) {
      languageCode = languageCode.split('-')[0];
    } else if (languageCode.includes('_')) {
      languageCode = languageCode.split('_')[0];
    }
    
    console.log('处理后的语言代码:', languageCode);
    
    // 验证语言代码是否在支持的语言列表中
    if (['en', 'zh'].includes(languageCode)) {
      return languageCode;
    }
  }
  
  // 默认返回英文
  return 'en';
};

// 初始化前先打印检测到的语言
const detectedLanguage = getDeviceLanguage();
console.log('最终使用的语言代码:', detectedLanguage);

// 对i18n初始化进行调试
console.log('准备初始化i18n, 检测到的语言:', detectedLanguage);

if (!i18n.isInitialized) {
  i18n.use(initReactI18next).init({
    resources: {
      en: { translation: en },
      zh: { translation: zh },
    },
    lng: detectedLanguage,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
    debug: true,
    react: {
      useSuspense: false,
      bindI18n: 'languageChanged',
      bindI18nStore: 'added removed',
      transEmptyNodeValue: '',
    }
  }).then(() => {
    console.log('✅ i18n初始化成功');
    console.log('  当前语言:', i18n.language);
    console.log('  可用资源:', Object.keys(i18n.options.resources || {}));
  }).catch(error => {
    console.error('❌ i18n初始化失败:', error);
  });
} else {
  console.log('⚠️ i18n已经初始化, 当前语言:', i18n.language);
}

// 监听语言变化
i18n.on('languageChanged', (lng) => {
  console.log('语言已切换到:', lng);
});

export default i18n; 