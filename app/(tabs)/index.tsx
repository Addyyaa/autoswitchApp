/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import React from 'react';
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

function App(): React.JSX.Element {
  return (
    <Stack.Navigator>
      <Stack.Screen name="Welcome" component={WelcomeScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Home" component={Home} />
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
  }
});

export default App;