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
      <Text style={styles.deviceHeaderText}>{t('home.screen')}{device.deviceId || t('home.unknownDevice')}</Text>
      <Text style={selected ? styles.selectedText : styles.selectText}>
        {selected ? t('cancel') : t('select')}
      </Text>
    </View>
    <View style={[styles.deviceSubText, {flexDirection: 'row', justifyContent: 'space-between'}]}>
        <Text style={styles.deviceSubText}>
        {t('home.type')} {device.deviceType || t('home.telnetDevice')}
        </Text>
        <Text style={styles.deviceSubText}>IP: {device.ip}</Text>
    </View>
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
  const [switchingMessage, setSwitchingMessage] = useState('');
  
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
          
          // 修复：确保设备被正确添加到UI
          if (foundDevices && foundDevices.length > 0) {
            console.log(`进度回调: 发现了 ${foundDevices.length} 个设备`);
            discoveredDevices = [...foundDevices];
            setDevices(prev => {
              // 检查是否有新设备被添加
              if (foundDevices.length > prev.length) {
                console.log(`设备列表更新: ${prev.length} -> ${foundDevices.length}`);
                return [...foundDevices];
              }
              return prev;
            });
          }
        },
        abortSignal: NetworkScanner._abortController.signal
      });
      
      // 确保最终结果不会丢失设备
      console.log(`扫描完成: API返回${result?.devices?.length || 0}个设备, 进度回调中发现${discoveredDevices.length}个设备`);
      
      if (result?.devices?.length > 0) {
        if (result.devices.length > discoveredDevices.length) {
          console.log(`使用API返回的设备列表: ${result.devices.length}个设备`);
          setDevices(result.devices);
        } else if (discoveredDevices.length > 0 && devices.length === 0) {
          console.log(`使用进度回调中的设备列表: ${discoveredDevices.length}个设备`);
          setDevices(discoveredDevices);
        }
      }
      
      // 如果扫描完成但没有设备，检查是否有成功登录的日志
      if ((devices.length === 0 || discoveredDevices.length === 0) && result?.debugInfo?.loginSuccessIPs?.length > 0) {
        console.log(`扫描完成但UI无设备, 尝试从登录成功的IP创建设备列表`);
        // 从登录成功的IP创建默认设备对象
        const recoveredDevices = result.debugInfo.loginSuccessIPs.map(ip => ({
          ip,
          deviceId: 'unknown',
          deviceType: t('home.telnetDevice')
        }));
        
        if (recoveredDevices.length > 0) {
          console.log(`从登录成功记录恢复了 ${recoveredDevices.length} 个设备`);
          setDevices(recoveredDevices);
        }
      }
      
      console.log(`扫描${result?.aborted ? '已中止' : '完成'}，最终发现 ${devices.length} 个设备`);
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

  // 执行版本切换 - 改进提示逻辑
  const switchVersion = async (versionType) => {
    if (!selectedDevice) {
      return;
    }
    
    setProcessingVersion(true);
    setSwitchingMessage(t('switching') + ' ' + selectedDevice.ip);
    
    try {
      const versionName = versionType === 'OVERSEAS' ? t('overseasVersion') : t('chinaVersion');
      console.log(`开始将设备 ${selectedDevice.ip} 切换到${versionName}...`);
      
      // 保留选中设备的引用
      const currentDevice = {...selectedDevice};
      
      // 执行版本切换
      const result = await VersionSwitcher.switchVersion(selectedDevice.ip, versionType);
      
      console.log('切换结果:', result);
      
      // 确保选择状态不丢失
      setSelectedDevice(currentDevice);
      
      // 显示详细的结果提示
      let alertTitle = result.success ? t('success') : t('failure');
      let alertMessage = `${t('switchingDevice')}: ${selectedDevice.ip}\n`;
      alertMessage += `${t('targetVersion')}: ${versionName}\n`;
      alertMessage += `${t('result')}: ${result.success ? t('switchSuccess') : t('switchFailure')}\n`;
      
      if (result.details) {
        alertMessage += `${t('details')}: ${result.details}`;
      }
      
      Alert.alert(
        alertTitle,
        alertMessage,
        [{ text: t('confirm') }]
      );
    } catch (error) {
      console.error('切换版本时出错:', error);
      Alert.alert(
        t('error'), 
        `${t('switchingErrorDevice')}: ${selectedDevice.ip}\n${error.message}`
      );
    } finally {
      setProcessingVersion(false);
      setSwitchingMessage('');
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
            (!selectedDevice || scanning || processingVersion) && styles.buttonDisabled,
            !selectedDevice && {backgroundColor: 'gray'}
          ]}
          onPress={handleSwitchVersionPress}
          disabled={!selectedDevice || scanning || processingVersion}
        >
          <View style={[styles.buttonContent]}>
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
      
      {/* 版本切换加载遮罩 - 更新以显示正在处理的设备 */}
      <LoadingOverlay 
        visible={processingVersion} 
        message={switchingMessage || t('switching')}
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
    marginBottom: "3%",
    backgroundColor: '#f5f5f5',
    padding: "3%",
    borderRadius: 8,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 5,
  },
  infoLabel: {
    fontWeight: 'bold',
    marginRight: "3%",
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
    marginBottom: "5%",
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
    justifyContent: 'center',
    marginBottom: "5%",
    width: "auto"
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
    color: '#eee',
    fontSize: 16,
    marginLeft: "2%",
  },
  list: {
    flex: 1,
  },
  deviceItem: {
    padding: "4%",
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    backgroundColor: '#eeeeee',
    borderRadius: 8,
    marginBottom: "3%",
  },
  selectedDeviceItem: {
    backgroundColor: '#a0ddd2ed',
    borderColor: '#1890ff',
    borderWidth: 1,
  },
  deviceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: "2%",
  },
  deviceHeaderText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  deviceSubText: {
    fontSize: 14,
    color: '#666',
    marginTop: "1%",
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
    padding: "2%",
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: "5%",
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
    padding: "3%",
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