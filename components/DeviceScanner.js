import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, FlatList, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { NetworkScanner } from '../tmp';
import { VersionSwitcher } from '../utils/VersionSwitcher';

const DeviceItem = ({ device, selected, onSelect }) => (
  <TouchableOpacity 
    style={[styles.deviceItem, selected && styles.selectedDeviceItem]}
    onPress={() => onSelect(device)}
  >
    <View style={styles.deviceHeader}>
      <Text style={styles.deviceHeaderText}>{device.ip}</Text>
      <Text style={selected ? styles.selectedText : styles.normalText}>
        {selected ? '已选择' : '选择'}
      </Text>
    </View>
    <Text style={styles.deviceSubText}>ID: {device.deviceId || '未知'}</Text>
  </TouchableOpacity>
);

export const DeviceScanner = () => {
  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [devices, setDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [processingVersion, setProcessingVersion] = useState(false);
  
  useEffect(() => {
    // 组件卸载时停止扫描
    return () => {
      if (scanning) {
        NetworkScanner.stopScan();
      }
    };
  }, [scanning]);
  
  const handleScanButtonPress = async () => {
    // 如果正在扫描，停止扫描
    if (scanning) {
      NetworkScanner.stopScan();
      setScanning(false);
      return;
    }
    
    // 开始新的扫描
    setScanning(true);
    setProgress(0);
    setDevices([]);
    
    try {
      const ip = await NetworkScanner.getLocalIp();
      const subnet = await NetworkScanner.getSubnetMask();
      
      // 创建中止控制器
      NetworkScanner._abortController = new AbortController();
      
      const result = await NetworkScanner.scanNetwork(ip, subnet, {
        progressCallback: (percent, scanned, total, foundDevices) => {
          setProgress(percent);
          setDevices(foundDevices || []);
        },
        abortSignal: NetworkScanner._abortController.signal
      });
      
      setDevices(result?.devices || []);
      console.log(`扫描${result?.aborted ? '已中止' : '完成'}，发现 ${result?.devices?.length || 0} 个设备`);
    } catch (error) {
      console.error('扫描出错:', error);
      Alert.alert('扫描错误', `扫描过程中出错: ${error.message}`);
    } finally {
      setScanning(false);
    }
  };
  
  const handleDeviceSelect = (device) => {
    setSelectedDevice(device.ip === selectedDevice?.ip ? null : device);
  };
  
  const handleSwitchVersionPress = () => {
    if (!selectedDevice) {
      Alert.alert('提示', '请先选择屏幕后再切换版本');
      return;
    }
    
    Alert.alert(
      '请选择要切换的版本',
      `将为 ${selectedDevice.ip} (${selectedDevice.deviceId || '未知ID'}) 切换版本`,
      [
        {
          text: '海外版',
          onPress: () => switchVersion('OVERSEAS')
        },
        {
          text: '中国大陆版',
          onPress: () => switchVersion('CHINA')
        },
        {
          text: '取消',
          style: 'cancel'
        }
      ]
    );
  };
  
  const switchVersion = async (versionType) => {
    if (processingVersion) return;
    
    setProcessingVersion(true);
    Alert.alert('处理中', '正在切换版本，请稍候...');
    
    try {
      const result = await VersionSwitcher.switchVersion(selectedDevice.ip, versionType);
      
      Alert.alert(
        result.success ? '成功' : '失败',
        result.message
      );
    } catch (error) {
      console.error('切换版本出错:', error);
      Alert.alert('错误', `切换版本时发生错误: ${error.message}`);
    } finally {
      setProcessingVersion(false);
    }
  };
  
  const getScanButtonText = () => {
    if (scanning) {
      return `正在扫描 (${progress}%) - 点击停止扫描`;
    }
    return '开始扫描';
  };
  
  return (
    <View style={styles.container}>
      <View style={styles.buttonRow}>
        <TouchableOpacity 
          style={[
            styles.button, 
            styles.halfButton,
            (processingVersion) && styles.buttonDisabled
          ]}
          onPress={handleScanButtonPress}
          disabled={processingVersion}
        >
          <View style={styles.buttonContent}>
            {scanning && <ActivityIndicator color="white" size="small" style={{marginRight: 10}} />}
            <Text style={styles.buttonText}>{getScanButtonText()}</Text>
          </View>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[
            styles.versionButton, 
            styles.halfButton,
            (scanning || processingVersion) && styles.buttonDisabled
          ]}
          onPress={handleSwitchVersionPress}
          disabled={scanning || processingVersion}
        >
          <View style={styles.buttonContent}>
            <Text style={styles.buttonText}>切换版本</Text>
          </View>
        </TouchableOpacity>
      </View>
      
      <Text style={styles.text}>
        找到 {devices?.length || 0} 个设备
        {selectedDevice ? ` (已选择: ${selectedDevice.ip})` : ''}
      </Text>
      
      <FlatList
        data={devices || []}
        keyExtractor={(item) => item.ip}
        renderItem={({ item }) => (
          <DeviceItem
            device={item}
            selected={selectedDevice?.ip === item.ip}
            onSelect={handleDeviceSelect}
          />
        )}
        style={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyList}>
            <Text>{scanning ? '正在扫描...' : '未找到任何设备'}</Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  halfButton: {
    flex: 0.48,
  },
  button: {
    backgroundColor: '#32b8a0',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  versionButton: {
    backgroundColor: '#4a90e2',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
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
  },
  text: {
    fontSize: 16,
    marginBottom: 15,
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
  selectedText: {
    color: '#1890ff',
    fontWeight: 'bold',
  },
  normalText: {
    color: '#555',
  },
  emptyList: {
    padding: 20,
    alignItems: 'center',
  },
}); 