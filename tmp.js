import { NetworkInfo } from 'react-native-network-info';
import TcpSocket from 'react-native-tcp-socket';

export class NetworkScanner {
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

  static async isReachable(ip, port = 23, timeout = 500) {
    return new Promise((resolve) => {
      // 使用超时确保请求不会挂起太久
      const timer = setTimeout(() => {
        if (socket) {
          socket.destroy();
        }
        resolve(false);
      }, timeout);

      // 使用TcpSocket替代fetch
      const socket = TcpSocket.createConnection({
        host: ip,
        port: port,
      }, () => {
        clearTimeout(timer);
        socket.destroy();
        resolve(true);
      });

      socket.on('error', () => {
        clearTimeout(timer);
        socket.destroy();
        resolve(false);
      });
    });
  }

  // 批量扫描方法，替代Web Worker
  static async scanNetworkBatch(networkPrefix, batchSize = 10, progressCallback) {
    const devices = [];
    const total = 254;
    
    // 分批处理，每批batchSize个IP
    for (let start = 1; start <= total; start += batchSize) {
      const end = Math.min(start + batchSize - 1, total);
      const batchPromises = [];
      
      // 创建当前批次的所有请求
      for (let i = start; i <= end; i++) {
        const ip = `${networkPrefix}.${i}`;
        batchPromises.push(
          this.isReachable(ip).then(isReachable => {
            if (isReachable) {
              devices.push(ip);
            }
            return { ip, isReachable };
          })
        );
      }
      
      // 等待当前批次完成
      await Promise.all(batchPromises);
      
      // 报告进度
      if (progressCallback) {
        const progress = Math.floor((end / total) * 100);
        progressCallback(progress, end, devices);
      }
    }
    
    return devices;
  }

  // 如果需要，添加更多网络扫描相关的方法
  static getNetworkPrefix(ip) {
    return ip.substring(0, ip.lastIndexOf('.'));
  }
}

