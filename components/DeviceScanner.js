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
    setSelectedDevice(null); // 重置选中的设备
    
    try {
      const ip = await NetworkScanner.getLocalIp();
      const subnet = await NetworkScanner.getSubnetMask();
      
      // 创建中止控制器
      NetworkScanner._abortController = new AbortController();
      
      const result = await NetworkScanner.scanNetwork(ip, subnet, {
        progressCallback: (percent, scanned, total, foundDevices) => {
          setProgress(percent);
          setDevices(foundDevices || []); // 添加空数组默认值
        },
        abortSignal: NetworkScanner._abortController.signal
      });
      
      // 添加空数组默认值，防止result.devices为undefined
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
    console.log(`选择设备: ${device.ip}`);
    setSelectedDevice(device);
  };
  
  const handleSwitchVersionPress = () => {
    if (!selectedDevice) {
      Alert.alert('提示', '请先选择设备后再切换版本');
      return;
    }
    
    Alert.alert(
      '选择版本',
      '请选择要切换的版本',
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
    if (!selectedDevice) {
      return;
    }
    
    setProcessingVersion(true);
    
    try {
      console.log(`开始将设备 ${selectedDevice.ip} 切换到${versionType === 'OVERSEAS' ? '海外版' : '中国大陆版'}...`);
      
      // 保留选中设备的引用
      const currentDevice = {...selectedDevice};
      
      // 执行版本切换
      const result = await VersionSwitcher.switchVersion(selectedDevice.ip, versionType);
      
      console.log('切换结果:', result);
      
      // 确保选择状态不丢失
      setSelectedDevice(currentDevice);
      
      // 显示结果提示
      Alert.alert(
        result.success ? '成功' : '失败',
        result.message,
        [{ text: '确定' }]
      );
    } catch (error) {
      console.error('切换版本时出错:', error);
      Alert.alert('错误', `切换版本时出错: ${error.message}`);
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
      <View style={styles.infoContainer}>
        <Text style={styles.text}>
          找到 {devices?.length || 0} 个设备
          {selectedDevice ? ` (已选择: ${selectedDevice.ip})` : ''}
        </Text>
      </View>
      
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
            {scanning && <ActivityIndicator color="#fff" size="small" style={{marginRight: 8}} />}
            <Text style={styles.buttonText}>
              {scanning ? '扫描中...点击停止' : '扫描设备'}
            </Text>
          </View>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[
            styles.versionButton, 
            styles.halfButton,
            (!selectedDevice || scanning || processingVersion) && styles.buttonDisabled
          ]}
          onPress={handleSwitchVersionPress}
          disabled={!selectedDevice || scanning || processingVersion}
        >
          <View style={styles.buttonContent}>
            {processingVersion && <ActivityIndicator color="#fff" size="small" style={{marginRight: 8}} />}
            <Text style={styles.buttonText}>
              {processingVersion ? '切换中...' : '切换版本'}
            </Text>
          </View>
        </TouchableOpacity>
      </View>
      
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