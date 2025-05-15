import React, { useEffect, useState, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Switch, useColorScheme, Button } from 'react-native';
import { NetworkScanner } from '../tmp';
import { useTranslation } from 'react-i18next';
import { useFocusEffect } from '@react-navigation/native';
import { DeviceScanner } from '../components/DeviceScanner';
import { NativeModules } from 'react-native';

const { TelnetScanner } = NativeModules;

export default function HomeScreen() {
  const [testResult, setTestResult] = useState(null);
  const [error, setError] = useState(null);

  // 测试原生模块方法
  const handleTestNativeModule = () => {
    setTestResult(null);
    setError(null);

    if (!TelnetScanner || !TelnetScanner.scan) {
      setError('未找到原生模块 TelnetScanner 或 scan 方法');
      return;
    }

    // 示例IP和端口
    const testIPs = ['192.168.1.1', '192.168.1.2'];
    const testPort = 23;

    TelnetScanner.scan(testIPs, testPort, (err, onlineIps) => {
      if (err) {
        setError(err);
      } else {
        setTestResult(onlineIps);
      }
    });
  };

  return (
    <View style={styles.container}>
      <DeviceScanner />

      <Button title="测试原生模块" onPress={handleTestNativeModule} />

      {testResult && (
        <Text style={styles.resultText}>
          原生模块返回: {JSON.stringify(testResult)}
        </Text>
      )}
      {error && (
        <Text style={styles.errorText}>
          错误: {error}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  infoContainer: {
    marginBottom: 20,
  },
  text: {
    fontSize: 16,
    marginBottom: 10,
  },
  button: {
    backgroundColor: '#32b8a0',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 20,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#eeeeee',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  list: {
    flex: 1,
  },
  deviceItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    backgroundColor: '#eeeeee',
    borderRadius: 8,
    marginBottom: 8,
  },
  selectedDeviceItem: {
    backgroundColor: '#a0ddd2ed',
    borderColor: '#1890ff',
    borderWidth: 1,
  },
  deviceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  deviceHeaderText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  deviceSubText: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  emptyList: {
    padding: 20,
    alignItems: 'center',
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  versionButton: {
    backgroundColor: '#4a90e2',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 20,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfButton: {
    flex: 0.48,
  },
  resultText: { marginTop: 16, color: 'green' },
  errorText: { marginTop: 16, color: 'red' },
});
