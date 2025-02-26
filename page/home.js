import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { NetworkScanner } from '../tmp';
import { useTranslation } from 'react-i18next';

function calculateNetworkRange(ip, netmask) {
  // 从原始实现中保留此函数逻辑
  // ...如果有的话
}

export default function Home() {
  const [localIp, setLocalIp] = useState('');
  const [netmask, setNetmask] = useState('');
  const [networkRange, setNetworkRange] = useState([]);
  const [progress, setProgress] = useState(0);
  const [devices, setDevices] = useState([]);
  const [selectedDevices, setSelectedDevices] = useState([]);
  const [isScanning, setIsScanning] = useState(false);
  const [totalScanned, setTotalScanned] = useState(0);
  const [currentIp, setCurrentIp] = useState('');
  const { t } = useTranslation();

  useEffect(() => {
    initNetwork();
  }, []);

  const initNetwork = async () => {
    try {
      const ip = await NetworkScanner.getLocalIp();
      setLocalIp(ip);
      // 获取子网掩码，如果您的库支持的话
      // const mask = await NetworkScanner.getSubnetMask();
      // setNetmask(mask);
      
      // 假设使用标准子网掩码
      setNetmask('255.255.255.0');
    } catch (error) {
      console.error('初始化网络信息失败:', error);
    }
  };

  const startScan = async () => {
    setIsScanning(true);
    setProgress(0);
    setTotalScanned(0);
    setDevices([]);
    
    try {
      console.log('开始扫描网络:', localIp.substring(0, localIp.lastIndexOf('.')));
      const networkPrefix = localIp.substring(0, localIp.lastIndexOf('.'));
      
      // 使用批量扫描方法，每批处理10个IP
      await NetworkScanner.scanNetworkBatch(
        networkPrefix, 
        10, // 批量大小
        (progress, scanned, foundDevices) => {
          setProgress(progress);
          setTotalScanned(scanned);
          setDevices([...foundDevices]); // 更新已找到的设备
        }
      );
    } catch (error) {
      console.error('扫描出错:', error);
    } finally {
      setIsScanning(false);
      setProgress(100);
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
    const isSelected = selectedDevices.includes(item);
    return (
      <TouchableOpacity
        style={[styles.deviceItem, isSelected && styles.selectedDeviceItem]}
        onPress={() => toggleDeviceSelection(item)}
      >
        <Text style={styles.deviceText}>{item}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.infoContainer}>
        <Text style={styles.text}>本机IP: {localIp}</Text>
        <Text style={styles.text}>子网掩码: {netmask}</Text>
        {isScanning && (
          <Text style={styles.text}>
            正在扫描: {currentIp} ({progress}%, {totalScanned}/254)
          </Text>
        )}
        <Text style={styles.text}>已选择: {selectedDevices.length} 个设备</Text>
      </View>

      <TouchableOpacity 
        style={[styles.button, isScanning && styles.buttonDisabled]}
        onPress={startScan}
        disabled={isScanning}
      >
        <Text style={styles.buttonText}>
          {isScanning ? `扫描中... (${progress}%)` : '开始扫描'}
        </Text>
      </TouchableOpacity>

      <FlatList
        data={devices}
        renderItem={renderDeviceItem}
        keyExtractor={item => item}
        style={styles.list}
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
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
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
  deviceText: {
    fontSize: 16,
  }
});
