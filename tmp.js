import { NetworkInfo } from 'react-native-network-info';
import TcpSocket from 'react-native-tcp-socket';

export class NetworkScanner {
  // 常用端口及其服务
  static COMMON_PORTS = {
    22: 'SSH',
    23: 'Telnet',
    80: 'HTTP',
    443: 'HTTPS',
    8080: 'HTTP Alternate',
    554: 'RTSP',
    3389: 'RDP',
    5000: 'UPnP'
  };

  // Telnet验证凭据
  static TELNET_CREDENTIALS = {
    username: 'root',
    password: 'ya!2dkwy7-934^'
  };

  // 添加静态属性作为全局锁
  static _scanLock = false;

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
    // 将IP和子网掩码转换为二进制形式
    const ipBinary = ip.split('.').map(octet => 
      parseInt(octet).toString(2).padStart(8, '0')
    ).join('');
    
    const maskBinary = subnetMask.split('.').map(octet => 
      parseInt(octet).toString(2).padStart(8, '0')
    ).join('');
    
    // 计算网络地址和广播地址的二进制表示
    const networkBinary = ipBinary.split('').map((bit, i) => 
      maskBinary[i] === '1' ? bit : '0'
    ).join('');
    
    const broadcastBinary = ipBinary.split('').map((bit, i) => 
      maskBinary[i] === '1' ? bit : '1'
    ).join('');
    
    // 将二进制转换回十进制点分表示法
    const networkAddress = this.binaryToDecimalIP(networkBinary);
    const broadcastAddress = this.binaryToDecimalIP(broadcastBinary);
    
    // 计算主机地址范围
    const ipRangeStart = this.incrementIP(networkAddress);
    const ipRangeEnd = this.decrementIP(broadcastAddress);
    
    // 计算总IP数量
    const ipCount = this.calculateIPCount(maskBinary);
    
    return {
      networkAddress,
      broadcastAddress,
      ipRangeStart,
      ipRangeEnd,
      ipCount: ipCount - 2 // 减去网络地址和广播地址
    };
  }
  
  // 二进制IP转为点分十进制表示
  static binaryToDecimalIP(binaryIP) {
    const octets = [];
    for (let i = 0; i < 32; i += 8) {
      octets.push(parseInt(binaryIP.substr(i, 8), 2));
    }
    return octets.join('.');
  }
  
  // 增加IP地址值
  static incrementIP(ip) {
    const parts = ip.split('.').map(Number);
    let carry = 1;
    
    for (let i = 3; i >= 0; i--) {
      parts[i] += carry;
      if (parts[i] <= 255) {
        carry = 0;
        break;
      }
      parts[i] = 0;
    }
    
    return parts.join('.');
  }
  
  // 减少IP地址值
  static decrementIP(ip) {
    const parts = ip.split('.').map(Number);
    let borrow = 1;
    
    for (let i = 3; i >= 0; i--) {
      parts[i] -= borrow;
      if (parts[i] >= 0) {
        borrow = 0;
        break;
      }
      parts[i] = 255;
    }
    
    return parts.join('.');
  }
  
  // 计算子网中的IP数量
  static calculateIPCount(maskBinary) {
    const hostBits = maskBinary.split('0').length - 1;
    return Math.pow(2, hostBits);
  }

  // 检查端口是否开放
  static async isPortOpen(ip, port, timeout = 500) {
    console.log(`测试 ${ip}:${port}`);
    return new Promise((resolve) => {
      let connectionClosed = false;
      let socket = null;
      
      try {
        const timer = setTimeout(() => {
          if (!connectionClosed) {
            console.log(`${ip}:${port} 连接超时`);
            if (socket) {
              socket.destroy();
            }
            resolve(false);
          }
        }, timeout);

        socket = TcpSocket.createConnection({
          host: ip,
          port: port,
          timeout: timeout
        }, () => {
          // 连接成功
          console.log(`✓✓✓ ${ip}:${port} 端口开放!`);
          clearTimeout(timer);
          connectionClosed = true;
          socket.destroy();
          resolve(true);
        });

        socket.on('error', (error) => {
          if (!connectionClosed) {
            console.log(`${ip}:${port} 连接错误: ${error.message}`);
            clearTimeout(timer);
            connectionClosed = true;
            socket.destroy();
            resolve(false);
          }
        });
        
        socket.on('close', (hadError) => {
          console.log(`关闭到 ${ip}:${port} 的连接，${hadError ? '有错误' : '无错误'}`);
          if (!connectionClosed) {
            if (!hadError) {
              console.log(`通过关闭事件确认 ${ip}:${port} 端口开放!`);
              clearTimeout(timer);
              connectionClosed = true;
              resolve(true);
            }
          }
        });
      } catch (e) {
        console.error(`尝试连接 ${ip}:${port} 时发生异常:`, e);
        resolve(false);
      }
    });
  }

  // 从设备读取配置文件获取设备ID
  static async getDeviceId(ip, socket) {
    console.log(`尝试获取 ${ip} 的设备ID...`);
    return new Promise((resolve) => {
      const buffer = [];
      let readTimeout = null;
      
      const readCommand = 'cat customer/screenId.ini\r\n';
      
      // 设置超时
      readTimeout = setTimeout(() => {
        console.log(`读取设备ID超时: ${ip}`);
        resolve(null); // 超时返回null
      }, 2000);
      
      // 处理数据响应
      const dataHandler = (data) => {
        try {
          const text = data.toString('utf8');
          buffer.push(text);
          const fullText = buffer.join('');
          console.log(`设备ID响应: ${text.replace(/\n/g, '\\n').replace(/\r/g, '\\r')}`);
          
          // 检查是否包含deviceId
          const match = fullText.match(/deviceId=([A-Za-z0-9]+)/);
          if (match && match[1]) {
            console.log(`找到设备ID: ${match[1]}`);
            clearTimeout(readTimeout);
            socket.removeListener('data', dataHandler);
            resolve(match[1]);
          }
        } catch (e) {
          console.error(`处理设备ID数据时出错: ${e.message}`);
        }
      };
      
      // 添加数据处理器
      socket.on('data', dataHandler);
      
      // 发送读取命令
      try {
        socket.write(readCommand);
      } catch (e) {
        console.error(`发送读取ID命令时出错: ${e.message}`);
        clearTimeout(readTimeout);
        resolve(null);
      }
    });
  }

  // 尝试Telnet登录
  static async tryTelnetLogin(ip, credentials = this.TELNET_CREDENTIALS, timeout = 3000) {
    console.log(`尝试Telnet登录 ${ip}:23 用户名: ${credentials.username}`);
    
    return new Promise((resolve) => {
      const buffer = [];
      let loginPromptReceived = false;
      let passwordPromptReceived = false;
      let loginSuccessful = false;
      let connectionClosed = false;
      let socket = null;
      let deviceId = null;
      let timer = null;
      
      const closeConnection = (success) => {
        if (!connectionClosed) {
          connectionClosed = true;
          console.log(`关闭Telnet连接 ${ip}:23, 登录${success ? '成功' : '失败'}`);
          
          // 清除计时器
          if (timer) {
            clearTimeout(timer);
            timer = null;
          }
          
          if (socket) {
            try {
              // 首先移除所有事件监听器，避免事件循环和内存泄漏
              socket.removeAllListeners();
              // 确保连接结束
              socket.end();
              // 给end一些时间处理
              setTimeout(() => {
                try {
                  // 然后强制销毁
                  socket.destroy();
                  socket = null;
                } catch (e) {
                  console.error(`销毁socket时出错: ${e.message}`);
                } finally {
                  // 无论如何确保resolve
                  resolve({success, deviceId});
                }
              }, 50);
            } catch (e) {
              console.error(`关闭socket时出错: ${e.message}`);
              resolve({success, deviceId});
            }
          } else {
            resolve({success, deviceId});
          }
        }
      };
      
      timer = setTimeout(() => {
        console.log(`Telnet登录 ${ip}:23 超时`);
        closeConnection(false);
      }, timeout);
      
      try {
        // 使用本地随机端口，避免TIME_WAIT问题
        socket = TcpSocket.createConnection({
          host: ip,
          port: 23,
          timeout: timeout / 2,
          localAddress: '0.0.0.0', // 使用任意本地地址
          noDelay: true, // 禁用Nagle算法，立即发送数据
          keepAlive: false
        }, () => {
          console.log(`已连接到 ${ip}:23, 等待登录提示...`);
          // 连接成功后等待一段时间再发送用户名
          setTimeout(() => {
            if (!connectionClosed) {
              try {
                console.log(`发送用户名: ${credentials.username}`);
                socket.write(`${credentials.username}\r\n`);
                loginPromptReceived = true;
                
                // 等待一段时间后发送密码
                setTimeout(() => {
                  if (!connectionClosed) {
                    try {
                      console.log(`发送密码`);
                      socket.write(`${credentials.password}\r\n`);
                      passwordPromptReceived = true;
                    } catch (e) {
                      console.error(`发送密码时出错: ${e.message}`);
                      closeConnection(false);
                    }
                  }
                }, 300);
              } catch (e) {
                console.error(`发送用户名时出错: ${e.message}`);
                closeConnection(false);
              }
            }
          }, 100);
        });
        
        socket.on('data', (data) => {
          if (connectionClosed) return; // 忽略已关闭连接的数据
          
          try {
            const text = data.toString('utf8');
            buffer.push(text);
            const fullText = buffer.join('');
            console.log(`${ip} 收到数据: ${text.replace(/\n/g, '\\n').replace(/\r/g, '\\r')}`);
            
            // 只有在已发送用户名和密码后才检查登录结果
            if (loginPromptReceived && passwordPromptReceived) {
              if (fullText.includes('#') || 
                  fullText.includes('$') || 
                  fullText.includes('>')) {
                console.log(`登录成功! ${ip}:23`);
                loginSuccessful = true;
                
                // 登录成功后获取设备ID
                this.getDeviceId(ip, socket).then(id => {
                  deviceId = id;
                  closeConnection(true);
                });
              }
            }
          } catch (e) {
            console.error(`处理数据时出错: ${e.message}`);
          }
        });
        
        socket.on('error', (error) => {
          if (connectionClosed) return; // 忽略已关闭连接的错误
          
          // 详细记录错误对象
          const errorMsg = error.message || '未知错误';
          const errorName = error.name || 'Error';
          const errorStack = error.stack || 'No stack';
          console.log(`${ip} 连接错误 [${errorName}]: ${errorMsg}`);
          console.log(`错误堆栈: ${errorStack}`);
          
          closeConnection(false);
        });
        
        socket.on('close', (hadError) => {
          if (connectionClosed) return; // 忽略已关闭连接的事件
          
          console.log(`${ip} 连接关闭，错误状态: ${hadError}`);
          closeConnection(loginSuccessful);
        });
      } catch (e) {
        console.error(`创建连接时出错: ${e.message}, 堆栈: ${e.stack}`);
        closeConnection(false);
      }
    });
  }
  
  // 扫描整个网络寻找可登录的Telnet设备
  static async scanNetwork(ip, subnetMask, options = {}) {
    // 检查全局锁，防止并发扫描
    if (this._scanLock) {
      console.log('已有扫描任务正在进行，请等待...');
      throw new Error('ScanInProgress');
    }
    
    // 设置锁
    this._scanLock = true;
    
    try {
      const {
        batchSize = 50,
        timeout = 700,
        progressCallback,
        telnetCredentials = this.TELNET_CREDENTIALS,
        abortSignal,
        resetCache = false
      } = options;
      
      if (resetCache) {
        console.log('重置扫描器缓存');
        // 清除任何可能的静态缓存
      }
      
      console.log('开始扫描网络寻找可Telnet登录的设备...');
      
      // 计算网络范围
      const networkRange = this.calculateNetworkRange(ip, subnetMask);
      console.log('网络范围:', networkRange);
      
      // 预生成IP地址数组
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
      
      // 每个IP间额外间隔
      const betweenIpDelay = 50; // ms
      
      // 分批处理IP扫描
      for (let i = 0; i < totalIPs; i += batchSize) {
        if (abortSignal && abortSignal.aborted) {
          console.log('扫描已被用户中止');
          break;
        }
        
        const batchIPs = ipAddresses.slice(i, i + batchSize);
        console.log(`扫描批次 ${Math.floor(i/batchSize)+1}/${Math.ceil(totalIPs/batchSize)}, IPs: ${batchIPs.join(', ')}`);
        
        // 等待一段时间，让系统资源恢复
        if (i > 0) {
          await new Promise(resolve => setTimeout(resolve, 300));
        }
        
        // 逐个处理IP，而不是并行，避免资源竞争
        for (const ipToScan of batchIPs) {
          if (abortSignal && abortSignal.aborted) {
            console.log('扫描已被用户中止');
            break;
          }
          
          try {
            // 在每个IP之间添加短暂延迟
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
              
              // 确保设备被添加到列表，并且不重复
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
          
          // 更新扫描进度
          scannedCount++;
          if (progressCallback) {
            const progress = Math.floor((scannedCount / totalIPs) * 100);
            const devicesCopy = JSON.parse(JSON.stringify(devices));
            progressCallback(progress, scannedCount, totalIPs, devicesCopy);
            
            console.log(`进度更新: ${progress}%, 发现 ${devices.length} 个设备`);
            if (devices.length > 0) {
              console.log('当前发现的设备:', devices.map(d => `${d.ip} (${d.deviceId})`).join(', '));
            }
          }
        }
      }
      
      // 延迟一段时间，确保所有TCP连接都已关闭
      await new Promise(resolve => setTimeout(resolve, 500));
      
      console.log(`扫描完成，共发现 ${devices.length} 个可登录设备`);
      return JSON.parse(JSON.stringify(devices));
    } catch (error) {
      console.error('扫描网络出错:', error);
      if (abortSignal && abortSignal.aborted && error.name !== 'AbortError') {
        const abortError = new Error('扫描已中止');
        abortError.name = 'AbortError';
        throw abortError;
      }
      throw error;
    } finally {
      // 无论如何都释放锁
      this._scanLock = false;
    }
  }

  // 比较两个IP地址
  static compareIPs(ip1, ip2) {
    const num1 = this.ipToNumber(ip1);
    const num2 = this.ipToNumber(ip2);
    
    if (num1 < num2) return -1;
    if (num1 > num2) return 1;
    return 0;
  }
  
  // 转换IP为数字便于比较
  static ipToNumber(ip) {
    return ip.split('.')
      .map(octet => parseInt(octet))
      .reduce((acc, octet) => (acc << 8) + octet, 0) >>> 0;
  }
}

