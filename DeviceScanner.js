import React, { useState, useEffect } from 'react';
import { View, Text, Button, FlatList, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { NetworkScanner } from './NetworkScanner';
import { VersionSwitcher } from './VersionSwitcher';

const DeviceItem = ({ device, selected, onSelect }) => (
  <TouchableOpacity 
    style={[styles.deviceItem, selected && styles.selectedDevice]} 
    onPress={() => onSelect(device)}
  >
    <View>
      <Text style={styles.deviceIp}>{device.ip}</Text>
      <Text style={styles.deviceId}>ID: {device.deviceId || '未知'}</Text>
    </View>
    <View style={styles.selectButton}>
      <Text style={selected ? styles.selectedText : styles.selectText}>
        {selected ? '已选择' : '选择'}
      </Text>
    </View>
  </TouchableOpacity>
);

export const DeviceScanner = () => {
  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [devices, setDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [processingVersion, setProcessingVersion] = useState(false);
  
  useEffect(() => {
    // 组件卸载时确保停止扫描
    return () => {
      if (scanning) {
        NetworkScanner.stopScan();
      }
    };
  }, [scanning]);
  
  const handleScanButtonPress = async () => {
    // 如果正在扫描，则停止扫描
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
      
      const result = await NetworkScanner.scanNetwork(ip, subnet, {
        progressCallback: (percent, scanned, total, foundDevices) => {
          setProgress(percent);
          setDevices(foundDevices);
        }
      });
      
      setDevices(result.devices);
      console.log(`扫描${result.aborted ? '已中止' : '完成'}，发现 ${result.devices.length} 个设备`);
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
      <View style={styles.header}>
        <Text style={styles.title}>设备扫描器</Text>
      </View>
      
      <View style={styles.buttonContainer}>
        <Button
          title={getScanButtonText()}
          onPress={handleScanButtonPress}
          disabled={processingVersion}
        />
        <Button
          title="切换版本"
          onPress={handleSwitchVersionPress}
          disabled={scanning || processingVersion}
        />
      </View>
      
      <Text style={styles.deviceCountText}>
        找到 {devices.length} 个设备
        {selectedDevice ? ` (已选择: ${selectedDevice.ip})` : ''}
      </Text>
      
      <FlatList
        data={devices}
        keyExtractor={(item) => item.ip}
        renderItem={({ item }) => (
          <DeviceItem
            device={item}
            selected={selectedDevice?.ip === item.ip}
            onSelect={handleDeviceSelect}
          />
        )}
        style={styles.deviceList}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  deviceCountText: {
    fontSize: 16,
    marginBottom: 8,
    color: '#555',
  },
  deviceList: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 20,
  },
  deviceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 8,
    marginBottom: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
  },
  selectedDevice: {
    backgroundColor: '#e6f7ff',
    borderColor: '#1890ff',
    borderWidth: 1,
  },
  deviceIp: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  deviceId: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  selectButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    backgroundColor: '#f0f0f0',
  },
  selectedText: {
    color: '#1890ff',
    fontWeight: 'bold',
  },
  selectText: {
    color: '#555',
  },
}); 