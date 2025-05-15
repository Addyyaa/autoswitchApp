import { NetworkInfo } from 'react-native-network-info';
import TcpSocket from 'react-native-tcp-socket';
import { TelnetScanner } from 'react-native-telnet-scanner';

export class NetworkScanner {
  // Telnet验证凭据
  static TELNET_CREDENTIALS = {
    username: 'root',
    password: 'ya!2dkwy7-934^'
  };

  // 添加静态属性作为全局锁
  static _scanLock = false;
  
  // 用于控制扫描中止
  static _abortController = null;

  static async getLocalIp() {
    try {
      const ip = await NetworkInfo.getIPV4Address();
      console.log('找到IP地址:', ip);
      return ip;
    } catch (error) {
      console.error('获取IP地址时出错:', error);
      throw error;
    }
  }

  static async getSubnetMask() {
    try {
      const mask = await NetworkInfo.getSubnet();
      console.log('找到子网掩码:', mask);
      return mask;
    } catch (error) {
      console.error('获取子网掩码时出错:', error);
      throw error;
    }
  }

  // 根据IP和子网掩码计算网络范围
  static calculateNetworkRange(ip, subnetMask) {
    // ... existing code ...
  }
  
  // 二进制IP转为点分十进制表示
  static binaryToDecimalIP(binaryIP) {
    // ... existing code ...
  }
  
  // IP地址操作工具函数
  static incrementIP(ip) {
    // ... existing code ...
  }
  
  static decrementIP(ip) {
    // ... existing code ...
  }
  
  static calculateIPCount(maskBinary) {
    // ... existing code ...
  }

  static compareIPs(ip1, ip2) {
    // ... existing code ...
  }
  
  static ipToNumber(ip) {
    // ... existing code ...
  }

  // 从设备读取配置文件获取设备ID
  static async getDeviceId(ip, socket) {
    // ... existing code ...
  }

  // 尝试Telnet登录
  static async tryTelnetLogin(ip, credentials = this.TELNET_CREDENTIALS, timeout = 3000) {
    // ... existing code ...
  }
  
  // 添加静态方法来重置扫描锁
  static resetScanLock() {
    if (this._scanLock) {
      console.log('手动重置扫描锁');
      this._scanLock = false;
      return true;
    }
    return false;
  }
  
  // 停止当前扫描
  static stopScan() {
    if (this._abortController) {
      this._abortController.abort();
      console.log('扫描已手动中止');
      
      // 确保在中止扫描时也释放锁
      this._scanLock = false;
      
      return true;
    }
    return false;
  }
  
  // 扫描整个网络寻找可登录的Telnet设备（支持中止）
  static async scanNetwork(ip, subnetMask, options = {}) {
    if (this._scanLock) {
      console.log('已有扫描任务正在进行，请等待...');
      throw new Error('ScanInProgress');
    }
    
    this._scanLock = true;
    
    try {
      const {
        batchSize = 50,
        timeout = 700,
        progressCallback,
        telnetCredentials = this.TELNET_CREDENTIALS,
        abortSignal,  // 中止信号
        resetCache = false
      } = options;
      
      if (resetCache) {
        console.log('重置扫描器缓存');
      }
      
      console.log('开始扫描网络寻找可Telnet登录的设备...');
      
      const networkRange = this.calculateNetworkRange(ip, subnetMask);
      console.log('网络范围:', networkRange);
      
      const ipAddresses = [];
      let currentIP = networkRange.ipRangeStart;
      
      while (this.compareIPs(currentIP, networkRange.ipRangeEnd) <= 0) {
        ipAddresses.push(currentIP);
        currentIP = this.incrementIP(currentIP);
      }
      
      console.log(`预计算完成，将扫描 ${ipAddresses.length} 个IP地址`);
      
      const devices = [];
      let scannedCount = 0;
      const totalIPs = ipAddresses.length;
      const betweenIpDelay = 50; // ms
      
      for (let i = 0; i < totalIPs; i += batchSize) {
        if (abortSignal && abortSignal.aborted) {
          console.log('扫描已被用户中止');
          break;
        }
        
        const batchIPs = ipAddresses.slice(i, i + batchSize);
        console.log(`扫描批次 ${Math.floor(i/batchSize)+1}/${Math.ceil(totalIPs/batchSize)}, IPs: ${batchIPs.join(', ')}`);
        
        if (i > 0) {
          await new Promise(resolve => setTimeout(resolve, 300));
        }
        
        for (const ipToScan of batchIPs) {
          if (abortSignal && abortSignal.aborted) {
            console.log('扫描已被用户中止');
            break;
          }
          
          try {
            if (batchIPs.indexOf(ipToScan) > 0) {
              await new Promise(resolve => setTimeout(resolve, betweenIpDelay));
            }
            
            const result = await this.tryTelnetLogin(ipToScan, telnetCredentials, timeout);
            if (result.success) {
              const device = {
                ip: ipToScan,
                loginSuccess: true,
                deviceType: 'Telnet设备',
                deviceId: result.deviceId || '未知ID'
              };
              console.log(`✓✓✓ 发现可登录设备: ${ipToScan}, ID: ${device.deviceId}`);
              
              const existingIndex = devices.findIndex(d => d.ip === ipToScan);
              if (existingIndex >= 0) {
                devices[existingIndex] = device;
              } else {
                devices.push(device);
              }
            }
          } catch (err) {
            console.error(`扫描 ${ipToScan} 时出错:`, err);
          }
          
          scannedCount++;
          if (progressCallback) {
            const progress = Math.floor((scannedCount / totalIPs) * 100);
            const devicesCopy = JSON.parse(JSON.stringify(devices));
            progressCallback(progress, scannedCount, totalIPs, devicesCopy);
          }
        }
      }
      
      await new Promise(resolve => setTimeout(resolve, 500));
      
      console.log(`扫描完成，共发现 ${devices.length} 个可登录设备`);
      return {
        devices: JSON.parse(JSON.stringify(devices)),
        aborted: abortSignal && abortSignal.aborted
      };
    } catch (error) {
      console.error('扫描网络出错:', error);
      if (abortSignal && abortSignal.aborted && error.name !== 'AbortError') {
        const abortError = new Error('扫描已中止');
        abortError.name = 'AbortError';
        throw abortError;
      }
      throw error;
    } finally {
      this._scanLock = false;
    }
  }
} 