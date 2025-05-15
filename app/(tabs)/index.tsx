/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import React, { useState, useEffect } from 'react';
import type {PropsWithChildren} from 'react';
import {
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  useColorScheme,
  View,
} from 'react-native';

import {
  Colors,
  DebugInstructions,
  Header,
  LearnMoreLinks,
  ReloadInstructions,
} from 'react-native/Libraries/NewAppScreen';
import { AnimatedTypewriterText } from '../../components/AnimatedTyping.js';
import { Logo } from '../../components/logo.js';
import WaveHand from '../../components/AnimatedWave.js';
import { useTranslation } from 'react-i18next';
import '../../i18n/i18n';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Home from '../../page/home';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

type SectionProps = PropsWithChildren<{
  title: string;
}>;
 
const Stack = createNativeStackNavigator();

type RootStackParamList = {
  Welcome: undefined;
  Home: undefined;
};

// 修改后的语言切换按钮组件
const LanguageToggleButton = () => {
  const { i18n, t } = useTranslation();
  const [, forceRender] = useState(0);
  
  const toggleLanguage = () => {
    console.log('======= 语言切换按钮被点击 =======');
    console.log('当前语言设置:', i18n.language);
    
    try {
      const newLanguage = i18n.language === 'zh' ? 'en' : 'zh';
      console.log('准备切换到语言:', newLanguage);
      
      i18n.changeLanguage(newLanguage)
        .then(() => {
          console.log('✅ 语言切换成功，新语言:', i18n.language);
          forceRender(prev => prev + 1);
        })
        .catch(error => {
          console.error('❌ 语言切换失败:', error);
        });
    } catch (error) {
      console.error('❌ 切换语言过程中发生错误:', error);
    }
  };
  
  return (
    <TouchableOpacity 
      style={[styles.languageButton, { backgroundColor: '#ff4757' }]}
      onPress={toggleLanguage}
      activeOpacity={0.5}
    >
      <Text style={styles.languageButtonText}>
        {i18n.language === 'zh' ? 'EN' : '中文'}
      </Text>
    </TouchableOpacity>
  );
};

function App(): React.JSX.Element {
  const { t, i18n } = useTranslation();
  
  // 记录App组件渲染并检查i18n配置
  useEffect(() => {
    console.log('==== i18n配置检查 ====');
    console.log('初始化状态:', i18n.isInitialized);
    console.log('当前语言:', i18n.language);
    console.log('可用语言:', Object.keys(i18n.options.resources || {}));
  }, [i18n]);
  
  // 监听语言变化
  useEffect(() => {
    const handleChange = (lng) => {
      console.log('🔔 检测到语言变化事件:', lng);
    };
    
    i18n.on('languageChanged', handleChange);
    return () => i18n.off('languageChanged', handleChange);
  }, [i18n]);
  
  return (
    <Stack.Navigator>
      <Stack.Screen 
        name="Welcome" 
        component={WelcomeScreen} 
        options={{ 
          headerShown: false 
        }} 
      />
      <Stack.Screen 
        name="Home" 
        component={Home} 
        options={{ 
          headerRight: () => <LanguageToggleButton />,
          title: t('home.title', '设备扫描'),
          headerStyle: {
            backgroundColor: '#f8f8f8',
          },
          headerTitleStyle: {
            fontWeight: 'bold',
          }
        }} 
      />
    </Stack.Navigator>
  );
}

function WelcomeScreen({ navigation }: { 
  navigation: NativeStackNavigationProp<RootStackParamList, 'Welcome'> 
}) {
  const isDarkMode = useColorScheme() === 'dark';
  const { t } = useTranslation();

  const backgroundStyle = {
    backgroundColor: isDarkMode ? Colors.darker : Colors.lighter,
  };

  /*
   * To keep the template simple and small we're adding padding to prevent view
   * from rendering under the System UI.
   * For bigger apps the reccomendation is to use `react-native-safe-area-context`:
   * https://github.com/AppAndFlow/react-native-safe-area-context
   *
   * You can read more about it here:
   * https://github.com/react-native-community/discussions-and-proposals/discussions/827
   */
  const safePadding = '5%';

  return (
    <View style={[backgroundStyle, styles.pageContainer]}>
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor={backgroundStyle.backgroundColor}
      />
      <AnimatedTypewriterText
        sentences={[
          'Pintura Life!',
          'Discover the world through the lens of Pintura.',
        ] as any}
        delay={1000}
        speed={70}
        style={{
          ...styles.typeText,
          color: isDarkMode ? 'white' : 'black'
        }}
      />
      <WaveHand><Logo onPress={() => {}} /></WaveHand>
      <TouchableOpacity 
        style={styles.button}
        onPress={() => navigation.navigate('Home')}
      >
        <Text style={[styles.buttonText, isDarkMode ? { color: 'white' } : { color: 'black' }]}>
          {t('splashButton')}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  typeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'black',
    marginBottom: "2%",
  },
  pageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  button: {
    backgroundColor: 'pink',
    alignSelf: 'center',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 5,
    marginTop: "4%",
  },
  buttonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'black',
    textAlign: 'center',
    backgroundColor: 'transparent',
  },
  languageButton: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: '#ff4757', // 更醒目的红色
    borderRadius: 5,
    marginRight: 15,
    minWidth: 70, // 更大的按钮
    alignItems: 'center',
    elevation: 3, // Android阴影
    shadowColor: '#000', // iOS阴影
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  languageButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16, // 更大的文本
  }
});

export default App;