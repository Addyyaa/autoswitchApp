import { NativeModules } from 'react-native';

const { TelnetScanner } = NativeModules;

// 添加调试代码
console.log('所有原生模块:', Object.keys(NativeModules));
console.log('TelnetScanner 模块:', NativeModules.TelnetScanner);

describe('TelnetScaner 原生模块测试', () => {
  // 测试用的IP地址列表
  const testIPs = ['192.168.1.1', '192.168.1.2', '192.168.1.3'];
  const testPort = 23; // Telnet 默认端口

  // 测试扫描功能
  test('测试IP扫描功能', async () => {
    try {
      const result = await new Promise((resolve, reject) => {
        TelnetScanner.scan(testIPs, testPort, (err, onlineIps) => {
          if (err) {
            reject(err);
          } else {
            resolve(onlineIps);
          }
        });
      });

      console.log('扫描结果:', result);
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeLessThanOrEqual(testIPs.length);
    } catch (error) {
      console.error('扫描测试失败:', error);
      throw error;
    }
  });

  // 测试空IP列表
  test('测试空IP列表', async () => {
    try {
      const result = await new Promise((resolve, reject) => {
        TelnetScanner.scan([], testPort, (onlineIps) => {
          resolve(onlineIps);
        });
      });

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
    } catch (error) {
      console.error('空IP列表测试失败:', error);
      throw error;
    }
  });

  // 测试无效IP
  test('测试无效IP', async () => {
    const invalidIPs = ['256.256.256.256', 'invalid.ip'];
    try {
      const result = await new Promise((resolve, reject) => {
        TelnetScanner.scan(invalidIPs, testPort, (onlineIps) => {
          resolve(onlineIps);
        });
      });

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
    } catch (error) {
      console.error('无效IP测试失败:', error);
      throw error;
    }
  });

  // 测试超时情况
  test('测试扫描超时', async () => {
    const largeIPList = Array.from({ length: 100 }, (_, i) => `192.168.1.${i}`);
    try {
      const result = await new Promise((resolve, reject) => {
        TelnetScanner.scan(largeIPList, testPort, (onlineIps) => {
          resolve(onlineIps);
        });
      });

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeLessThanOrEqual(largeIPList.length);
    } catch (error) {
      console.error('超时测试失败:', error);
      throw error;
    }
  });
});
