import React, { useState, useEffect } from 'react';
import { View, Text, Button, FlatList } from 'react-native';
import { NetworkScanner } from './NetworkScanner';

export default function NetworkScannerScreen() {
  const [devices, setDevices] = useState([]);
  const [scanning, setScanning] = useState(false);

  const startScan = async () => {
    try {
      setScanning(true);
      const localIp = await NetworkScanner.getLocalIp();
      console.log('当前设备的 IP 地址:', localIp);
      
      const subnet = NetworkScanner.getNetworkRange(localIp);
      console.log(`扫描网段: ${subnet}`);

      const foundDevices = await NetworkScanner.scanNetwork(subnet);
      setDevices(foundDevices);
    } catch (error) {
      console.error('扫描出错:', error);
    } finally {
      setScanning(false);
    }
  };

  return (
    <View style={{ flex: 1, padding: 20 }}>
      <Button 
        title={scanning ? "正在扫描..." : "开始扫描"} 
        onPress={startScan}
        disabled={scanning}
      />
      
      <FlatList
        data={devices}
        renderItem={({ item }) => (
          <Text style={{ padding: 10 }}>{item}</Text>
        )}
        keyExtractor={item => item}
        ListEmptyComponent={
          <Text style={{ textAlign: 'center', marginTop: 20 }}>
            {scanning ? "正在扫描..." : "暂无设备"}
          </Text>
        }
      />
    </View>
  );
} 