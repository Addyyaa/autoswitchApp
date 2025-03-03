import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  FlatList, 
  StyleSheet, 
  Alert, 
  ActivityIndicator,
  Modal
} from 'react-native';
import { NetworkScanner } from '../tmp';
import { VersionSwitcher } from '../utils/VersionSwitcher';
import { useTranslation } from 'react-i18next';

// 设备项组件 - 修改选中状态文本为"取消"
const DeviceItem = ({ device, selected, onSelect, t }) => (
  <TouchableOpacity 
    style={[styles.deviceItem, selected && styles.selectedDeviceItem]}
    onPress={() => onSelect(device)}
  >
    <View style={styles.deviceHeader}>
      <Text style={styles.deviceHeaderText}>{device.ip}</Text>
      <Text style={selected ? styles.selectedText : styles.selectText}>
        {selected ? t('cancel') : t('select')}
      </Text>
    </View>
    <Text style={styles.deviceSubText}>
      {t('home.type')} {device.deviceType || t('home.telnetDevice')}
    </Text>
    <Text style={styles.deviceSubText}>ID: {device.deviceId || t('home.unknownDevice')}</Text>
  </TouchableOpacity>
);

// 全屏加载组件 - 适用于版本切换
const LoadingOverlay = ({ visible, message }) => (
  <Modal
    transparent
    animationType="fade"
    visible={visible}
  >
    <View style={styles.loadingOverlay}>
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#ffffff" />
        <Text style={styles.loadingText}>{message}</Text>
      </View>
    </View>
  </Modal>
);

export const DeviceScanner = () => {
  const { t } = useTranslation();
  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [devices, setDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [processingVersion, setProcessingVersion] = useState(false);
  
  // 网络信息状态
  const [localIP, setLocalIP] = useState('');
  const [subnetMask, setSubnetMask] = useState('');
  const [currentScan, setCurrentScan] = useState({ current: 0, total: 0 });
  
  // 获取本地IP和子网掩码
  useEffect(() => {
    const fetchNetworkInfo = async () => {
      try {
        const ip = await NetworkScanner.getLocalIp();
        const subnet = await NetworkScanner.getSubnetMask();
        setLocalIP(ip);
        setSubnetMask(subnet);
      } catch (error) {
        console.error('获取网络信息出错:', error);
      }
    };
    
    fetchNetworkInfo();
  }, []);
  
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
    setCurrentScan({ current: 0, total: 0 });
    setDevices([]);
    setSelectedDevice(null); // 重置选中的设备
    
    try {
      const ip = await NetworkScanner.getLocalIp();
      const subnet = await NetworkScanner.getSubnetMask();
      
      // 更新网络信息
      setLocalIP(ip);
      setSubnetMask(subnet);
      
      // 创建中止控制器
      NetworkScanner._abortController = new AbortController();
      
      // 储存探测到的设备，避免进度回调导致的状态覆盖
      let discoveredDevices = [];
      
      const result = await NetworkScanner.scanNetwork(ip, subnet, {
        progressCallback: (percent, scanned, total, foundDevices) => {
          setProgress(percent);
          setCurrentScan({ current: scanned, total: total });
          if (foundDevices) {
            discoveredDevices = [...foundDevices];
            setDevices(discoveredDevices);
          }
        },
        abortSignal: NetworkScanner._abortController.signal
      });
      
      // 确保结果不会覆盖回调中已更新的设备列表
      if (result && (!discoveredDevices.length || result.devices?.length > discoveredDevices.length)) {
        setDevices(result.devices || []);
      }
      
      console.log(`扫描${result?.aborted ? '已中止' : '完成'}，发现 ${devices.length} 个设备`);
    } catch (error) {
      console.error('扫描出错:', error);
      Alert.alert(
        t('error'), 
        t('scanErrorMessage', { message: error.message })
      );
    } finally {
      setScanning(false);
    }
  };

  // 处理设备选择 - 修复选择后设备消失问题
  const handleDeviceSelect = (device) => {
    console.log(`选择设备: ${device.ip}`);
    // 如果当前已选中该设备，则取消选择
    if (selectedDevice && selectedDevice.ip === device.ip) {
      setSelectedDevice(null);
    } else {
      // 否则选中该设备
      setSelectedDevice(device);
    }
  };

  // 处理版本切换按钮点击
  const handleSwitchVersionPress = () => {
    if (!selectedDevice) {
      Alert.alert(t('selectVersion'), t('pleaseSelectDevice'));
      return;
    }
    
    Alert.alert(
      t('selectVersion'),
      t('selectVersionPrompt'),
      [
        {
          text: t('overseasVersion'),
          onPress: () => switchVersion('OVERSEAS')
        },
        {
          text: t('chinaVersion'),
          onPress: () => switchVersion('CHINA')
        },
        {
          text: t('cancel'),
          style: 'cancel'
        }
      ]
    );
  };

  // 执行版本切换
  const switchVersion = async (versionType) => {
    if (!selectedDevice) {
      return;
    }
    
    setProcessingVersion(true);
    
    try {
      console.log(`开始将设备 ${selectedDevice.ip} 切换到${versionType === 'OVERSEAS' ? t('overseasVersion') : t('chinaVersion')}...`);
      
      // 保留选中设备的引用
      const currentDevice = {...selectedDevice};
      
      // 执行版本切换
      const result = await VersionSwitcher.switchVersion(selectedDevice.ip, versionType);
      
      console.log('切换结果:', result);
      
      // 确保选择状态不丢失
      setSelectedDevice(currentDevice);
      
      // 显示结果提示
      Alert.alert(
        result.success ? t('success') : t('failure'),
        result.message,
        [{ text: t('confirm') }]
      );
    } catch (error) {
      console.error('切换版本时出错:', error);
      Alert.alert(t('error'), `${t('switching')} ${error.message}`);
    } finally {
      setProcessingVersion(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* 网络信息部分 */}
      <View style={styles.infoContainer}>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>{t('home.localIp')}</Text>
          <Text style={styles.infoValue}>{localIP || '---'}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>{t('home.subnetMask')}</Text>
          <Text style={styles.infoValue}>{subnetMask || '---'}</Text>
        </View>
      </View>
      
      {/* 扫描进度 */}
      {scanning && (
        <View style={styles.progressContainer}>
          <View style={styles.progressTextContainer}>
            <Text style={styles.progressPercentage}>{progress}%</Text>
            <Text style={styles.progressDetail}>
              {t('home.scanning')} {currentScan.current}/{currentScan.total}
            </Text>
          </View>
          <View style={styles.progressBar}>
            <View style={[styles.progressBarFill, { width: `${progress}%` }]} />
          </View>
        </View>
      )}
      
      {/* 设备信息 */}
      {selectedDevice && (
        <View style={styles.deviceInfoContainer}>
          <Text style={styles.deviceInfoText}>
            {t('home.selected')} {selectedDevice.ip} ({selectedDevice.deviceId || t('home.unknownDevice')})
          </Text>
        </View>
      )}
      
      {/* 操作按钮 */}
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
              {scanning ? t('home.startScan') + ' (' + t('cancel') + ')' : t('home.startScan')}
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
            <Text style={styles.buttonText}>
              {t('switchVersion')}
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
            t={t}
          />
        )}
        style={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyList}>
            <Text>{scanning ? t('home.scanningProgress') : t('home.noDevices')}</Text>
          </View>
        }
      />
      
      {/* 版本切换时的全屏加载指示器 */}
      <LoadingOverlay
        visible={processingVersion}
        message={t('pleaseWait')}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 15,
  },
  infoContainer: {
    marginBottom: 15,
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 8,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 5,
  },
  infoLabel: {
    fontWeight: 'bold',
    marginRight: 10,
    fontSize: 14,
    color: '#333',
  },
  infoValue: {
    fontSize: 14,
    color: '#333',
  },
  progressContainer: {
    marginBottom: 15,
    backgroundColor: '#f0f9f7',
    padding: 12,
    borderRadius: 8,
  },
  progressTextContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  progressPercentage: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#32b8a0',
  },
  progressDetail: {
    fontSize: 14,
    color: '#666',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#32b8a0',
  },
  deviceInfoContainer: {
    marginBottom: 15,
    backgroundColor: '#e6f7ff',
    padding: 12,
    borderRadius: 8,
  },
  deviceInfoText: {
    fontSize: 14,
    color: '#1890ff',
    fontWeight: 'bold',
  },
  button: {
    backgroundColor: '#32b8a0',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 15,
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
    marginLeft: 5,
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
  selectText: {
    color: '#555',
  },
  emptyList: {
    padding: 20,
    alignItems: 'center',
  },
  versionButton: {
    backgroundColor: '#4a90e2',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 15,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfButton: {
    flex: 0.48,
  },
  // 加载遮罩样式
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    padding: 20,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  loadingText: {
    marginTop: 15,
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
  }
}); 