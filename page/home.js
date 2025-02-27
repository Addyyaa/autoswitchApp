import React, { useEffect, useState, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Switch } from 'react-native';
import { NetworkScanner } from '../tmp';
import { useTranslation } from 'react-i18next';
import { useFocusEffect } from '@react-navigation/native';

export default function Home({ navigation }) {
  const [localIp, setLocalIp] = useState('');
  const [subnetMask, setSubnetMask] = useState('');
  const [progress, setProgress] = useState(0);
  const [devices, setDevices] = useState([]);
  const [selectedDevices, setSelectedDevices] = useState([]);
  const [isScanning, setIsScanning] = useState(false);
  const [scannedCount, setScannedCount] = useState(0);
  const [totalIPs, setTotalIPs] = useState(0);
  const [advancedMode, setAdvancedMode] = useState(false);
  // const [portsToScan, setPortsToScan] = useState([22, 23, 80, 443]);
  const [portsToScan, setPortsToScan] = useState([23]);
  const { t } = useTranslation();

  // 修改为 useRef 以避免在组件重新渲染时丢失
  const isMounted = useRef(true);
  const scanAbortController = useRef(null);
  
  // 使用 useFocusEffect 在页面获得焦点时进行初始化，失去焦点时清理
  useFocusEffect(
    useCallback(() => {
      console.log('Home页面获得焦点');
      
      // 页面获得焦点时重置扫描状态
      isMounted.current = true;
      
      // 返回清理函数
      return () => {
        console.log('Home页面失去焦点，执行清理');
        
        // 标记组件已卸载
        isMounted.current = false;
        
        // 如果正在扫描，停止扫描
        if (isScanning) {
          console.log('正在清理扫描过程...');
          stopScan();
        }
      };
    }, [isScanning])
  );
  
  // 停止扫描的函数 - 确保清理所有状态
  const stopScan = () => {
    try {
      // 中止扫描
      if (scanAbortController.current) {
        scanAbortController.current.abort();
        scanAbortController.current = null; // 清空引用
      }
      
      // 重置UI状态
      setIsScanning(false);
      setProgress(0);
      setScannedCount(0);
      setTotalIPs(0);
      
      console.log('扫描已停止，状态已重置');
    } catch (error) {
      console.error('停止扫描时出错:', error);
    }
  };

  useEffect(() => {
    initNetwork();
  }, []);

  const initNetwork = async () => {
    try {
      const ip = await NetworkScanner.getLocalIp();
      setLocalIp(ip);
      const mask = await NetworkScanner.getSubnetMask();
      setSubnetMask(mask);
    } catch (error) {
      console.error('初始化网络信息失败:', error);
      // 使用默认子网掩码作为备选
      if (!subnetMask) setSubnetMask('255.255.255.0');
    }
  };

  // 修改开始扫描函数，强制重新创建扫描器状态
  const startScan = async () => {
    // 如果之前有进行中的扫描，先停止
    if (isScanning) {
      stopScan();
      // 短暂延迟，确保上一次扫描完全停止
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    console.log('开始新的扫描...');
    setIsScanning(true);
    setDevices([]);
    setProgress(0);
    setScannedCount(0);
    setTotalIPs(0);
    
    // 创建新的中止控制器
    scanAbortController.current = new AbortController();
    
    try {
      const ip = await NetworkScanner.getLocalIp();
      const subnetMask = await NetworkScanner.getSubnetMask();
      
      console.log(`扫描网络 IP:${ip}, 子网掩码:${subnetMask}`);
      
      // 只在组件仍然挂载时继续
      if (!isMounted.current) {
        console.log('组件已卸载，取消扫描');
        return;
      }
      
      const foundDevices = await NetworkScanner.scanNetwork(ip, subnetMask, {
        progressCallback: (percent, scanned, total, currentDevices) => {
          // 只在组件仍然挂载时更新UI
          if (isMounted.current) {
            setProgress(percent);
            setScannedCount(scanned);
            setTotalIPs(total);
            setDevices([...currentDevices]);
          }
        },
        abortSignal: scanAbortController.current.signal,
        resetCache: true  // 告诉扫描器重置缓存
      });
      
      // 只在组件仍然挂载时更新UI
      if (isMounted.current) {
        setDevices(foundDevices);
        console.log(`扫描完成，发现 ${foundDevices.length} 个设备`);
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('扫描已中止');
      } else {
        console.error('扫描出错:', error);
      }
    } finally {
      // 只在组件仍然挂载时更新UI
      if (isMounted.current) {
        setIsScanning(false);
      }
    }
  };

  const toggleDeviceSelection = (ip) => {
    if (selectedDevices.includes(ip)) {
      setSelectedDevices(selectedDevices.filter(device => device !== ip));
    } else {
      setSelectedDevices([...selectedDevices, ip]);
    }
  };

  const renderDeviceItem = ({ item }) => {
    const isSelected = selectedDevices.includes(item.ip);
    const openPortsList = Object.entries(item.openPorts || {})
      .filter(([_, isOpen]) => isOpen)
      .map(([port]) => `${port}(${NetworkScanner.COMMON_PORTS[port] || t('home.unknownDevice')})`);
      
    return (
      <TouchableOpacity
        style={[styles.deviceItem, isSelected && styles.selectedDeviceItem]}
        onPress={() => toggleDeviceSelection(item.ip)}
      >
        <View style={styles.deviceHeader}>
          <Text style={styles.deviceHeaderText}>
            {t('home.screen')} {item.deviceId || '---'}
          </Text>
          <Text style={styles.deviceHeaderText}>
            {t('home.ip')} {item.ip}
          </Text>
        </View>
        
        <Text style={styles.deviceSubText}>
          {t('home.type')} {item.deviceType || t('home.unknownDevice')}
        </Text>
        
        {openPortsList.length > 0 && (
          <Text style={styles.deviceSubText}>
            {t('home.openPorts')} {openPortsList.join(', ')}
          </Text>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.infoContainer}>
        <Text style={styles.text}>{t('home.localIp')} {localIp}</Text>
        <Text style={styles.text}>{t('home.subnetMask')} {subnetMask}</Text>
        
        <View style={styles.settingsRow}>
          <Text style={styles.text}>{t('home.advancedMode')}</Text>
          <Switch 
            value={advancedMode} 
            onValueChange={setAdvancedMode}
          />
        </View>
        
        {advancedMode && (
          <Text style={styles.text}>
            {t('home.scanPorts')} {portsToScan.join(', ')}
          </Text>
        )}
        
        {isScanning && (
          <Text style={styles.text}>
            {t('home.scanning')} {progress}% ({scannedCount}/{totalIPs})
          </Text>
        )}
        <Text style={styles.text}>{t('home.discovered')} {devices.length} {t('home.devices')}</Text>
        <Text style={styles.text}>{t('home.selected')} {selectedDevices.length} {t('home.devices')}</Text>
      </View>

      <TouchableOpacity 
        style={[styles.button, isScanning && styles.buttonDisabled]}
        onPress={startScan}
        disabled={isScanning}
      >
        {isScanning ? (
          <View style={styles.buttonContent}>
            <ActivityIndicator color="white" size="small" />
            <Text style={styles.buttonText}>{t('home.scanningProgress')} ({progress}%)</Text>
          </View>
        ) : (
          <Text style={styles.buttonText}>{t('home.startScan')}</Text>
        )}
      </TouchableOpacity>

      <FlatList
        data={devices}
        renderItem={renderDeviceItem}
        keyExtractor={item => item.ip}
        style={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyList}>
            <Text>{isScanning ? t('home.scanningProgress') : t('home.noDevices')}</Text>
          </View>
        }
      />
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
    backgroundColor: '#007AFF',
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
    backgroundColor: '#ccc',
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
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    marginBottom: 8,
  },
  selectedDeviceItem: {
    backgroundColor: '#e6f7ff',
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
});
