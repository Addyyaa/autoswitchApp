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

  // 添加中止扫描功能
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
    return new Promise((resolve, reject) => {
      const buffer = [];
      let readTimeout = null;
      
      const readCommand = 'cat customer/screenId.ini\r\n';
      
      // 设置超时
      readTimeout = setTimeout(() => {
        console.log(`读取设备ID超时: ${ip}`);
        socket.removeListener('data', dataHandler);
        resolve(null); // 超时返回null
      }, 4000);  // 增加超时时间
      
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
          
          // 检查是否为命令不存在或文件不存在的情况
          if (fullText.includes('No such file') || 
              fullText.includes('not found') ||
              fullText.includes('cat:') || 
              fullText.includes('command not found')) {
            console.log(`设备ID文件不存在: ${ip}`);
            clearTimeout(readTimeout);
            socket.removeListener('data', dataHandler);
            resolve('未找到ID文件');
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
        socket.removeListener('data', dataHandler);
        reject(e);
      }
    });
  }

  // 尝试Telnet登录
  static async tryTelnetLogin(ip, credentials = this.TELNET_CREDENTIALS, timeout = 5000) {
    console.log(`尝试连接到 ${ip}:23...`);
    
    return new Promise((resolve) => {
      const buffer = [];
      let loginPromptReceived = false;
      let passwordPromptReceived = false;
      let loginSuccessful = false;
      let connectionClosed = false;
      let socket = null;
      let deviceId = null;
      let timer = null;
      let isGettingDeviceId = false;
      let retryCount = 0;
      let hadResponse = false;
      
      // 发送额外命令以激活shell
      const sendExtraCommands = () => {
        if (connectionClosed || loginSuccessful) return;
        
        console.log(`向 ${ip} 发送额外命令以激活shell`);
        try {
          // 发送多个回车和常用命令尝试激活shell
          socket.write('\r\n');
          
          // 设置检查登录成功的延迟器
          setTimeout(() => {
            if (!connectionClosed && !loginSuccessful && buffer.length > 0) {
              // 如果依然未检测到登录成功，但有数据返回，尝试发送"ls"命令
              console.log(`${ip} 发送ls命令尝试触发提示符`);
              socket.write('ls\r\n');
            }
          }, 800);
        } catch(e) {
          console.error(`发送额外命令时出错: ${e.message}`);
        }
      };
      
      // 重新实现关闭连接函数，包含完整的重试逻辑
      const closeConnection = (success, shouldRetry = false) => {
        if (!connectionClosed) {
          connectionClosed = true;
          
          // 清除计时器
          if (timer) {
            clearTimeout(timer);
            timer = null;
          }
          
          console.log(`关闭Telnet连接 ${ip}:23, 登录${success ? '成功' : '失败'}`);
          
          // 处理重试逻辑
          if (!success && shouldRetry && hadResponse && retryCount < 3) {
            retryCount++;
            console.log(`正在为 ${ip} 开始第 ${retryCount} 次重试...`);
            
            // 确保socket被清理
            if (socket) {
              try {
                socket.removeAllListeners();
                socket.end();
                socket.destroy();
                socket = null;
              } catch (e) {
                console.error(`重试前清理socket出错: ${e.message}`);
              }
            }
            
            // 延迟后重新连接
            setTimeout(() => {
              console.log(`开始第 ${retryCount} 次重试连接 ${ip}...`);
              
              // 重置所有状态
              connectionClosed = false;
              loginPromptReceived = false;
              passwordPromptReceived = false;
              loginSuccessful = false;
              isGettingDeviceId = false;
              buffer.length = 0;  // 清空buffer
              
              // 设置新的超时
              timer = setTimeout(() => {
                console.log(`重试 #${retryCount} Telnet登录 ${ip}:23 超时`);
                closeConnection(false, hadResponse);  // 如果仍有响应，可以继续尝试
              }, timeout);
              
              // 重新建立连接
              try {
                socket = TcpSocket.createConnection({
                  host: ip,
                  port: 23,
                  timeout: timeout / 2,
                  localAddress: '0.0.0.0',
                  noDelay: true,
                  keepAlive: false
                }, () => {
                  console.log(`重试连接到 ${ip}:23, 等待登录提示...`);
                });
                
                // 绑定数据事件处理器
                socket.on('data', (data) => {
                  if (connectionClosed) return;
                  
                  try {
                    const text = data.toString('utf8');
                    buffer.push(text);
                    hadResponse = true;
                    
                    const fullText = buffer.join('');
                    console.log(`重试中收到数据: ${text.replace(/\n/g, '\\n').replace(/\r/g, '\\r')}`);
                    
                    // 检测登录提示并发送用户名
                    if (!loginPromptReceived && 
                        (fullText.toLowerCase().includes('login:') || 
                         fullText.toLowerCase().includes('username:'))) {
                      console.log(`重试中检测到登录提示，发送用户名: ${credentials.username}`);
                      socket.write(`${credentials.username}\r\n`);
                      loginPromptReceived = true;
                      return;
                    }
                    
                    // 检测密码提示并发送密码
                    if (loginPromptReceived && !passwordPromptReceived && 
                        fullText.toLowerCase().includes('password:')) {
                      console.log(`重试中检测到密码提示，发送密码`);
                      socket.write(`${credentials.password}\r\n`);
                      passwordPromptReceived = true;
                      
                      setTimeout(() => {
                        if (!connectionClosed && !loginSuccessful) {
                          sendExtraCommands();
                        }
                      }, 1000);
                      return;
                    }
                    
                    // 检查登录结果
                    if (loginPromptReceived && passwordPromptReceived && !loginSuccessful && !isGettingDeviceId) {
                      if (fullText.includes('#') || 
                          fullText.includes('$') || 
                          fullText.includes('>') ||
                          fullText.includes('shell') ||
                          fullText.includes('bash') ||
                          fullText.includes('/bin/sh') ||
                          fullText.includes('/bin/ash') ||
                          fullText.includes('登录成功') ||
                          fullText.includes('Welcome') ||
                          fullText.includes('success')) {
                        
                        console.log(`重试登录成功! ${ip}:23`);
                        loginSuccessful = true;
                        isGettingDeviceId = true;
                        
                        // 重置超时计时器
                        if (timer) {
                          clearTimeout(timer);
                        }
                        timer = setTimeout(() => {
                          console.log(`重试中获取设备ID超时 ${ip}:23`);
                          closeConnection(true, false);
                        }, 6000);
                        
                        // 登录成功后获取设备ID
                        NetworkScanner.getDeviceId(ip, socket).then(id => {
                          deviceId = id;
                          closeConnection(true, false);
                        }).catch(err => {
                          console.error(`重试中获取设备ID失败: ${err.message}`);
                          closeConnection(true, false);
                        });
                      }
                    }
                  } catch (e) {
                    console.error(`重试中处理数据出错: ${e.message}`);
                  }
                });
                
                // 绑定错误和关闭事件
                socket.on('error', (error) => {
                  console.log(`重试中 ${ip} 连接错误: ${error.message}`);
                  closeConnection(false, hadResponse);
                });
                
                socket.on('close', (hadError) => {
                  console.log(`重试中 ${ip} 连接关闭，错误状态: ${hadError}`);
                  closeConnection(loginSuccessful, !loginSuccessful && hadResponse);
                });
                
              } catch (e) {
                console.error(`重试创建连接时出错: ${e.message}`);
                closeConnection(false, false);
              }
            }, 500);  // 重试前等待500ms
            
          } else {
            // 不重试，直接结束
            if (socket) {
              try {
                socket.removeAllListeners();
                socket.end();
                
                setTimeout(() => {
                  try {
                    if (socket) {
                      socket.destroy();
                      socket = null;
                    }
                  } catch (e) {
                    console.error(`销毁socket时出错: ${e.message}`);
                  } finally {
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
        }
      };
      
      // 主超时定时器
      timer = setTimeout(() => {
        console.log(`Telnet登录 ${ip}:23 超时`);
        if (hadResponse) {
          console.log(`${ip} 有响应但登录超时，符合重试条件`);
          closeConnection(false, true);
        } else {
          console.log(`${ip} 无响应，不进行重试`);
          closeConnection(false, false);
        }
      }, timeout);
      
      try {
        socket = TcpSocket.createConnection({
          host: ip,
          port: 23,
          timeout: timeout / 2,
          localAddress: '0.0.0.0',
          noDelay: true,
          keepAlive: false
        }, () => {
          console.log(`已连接到 ${ip}:23, 等待登录提示...`);
          // 不再自动发送用户名，而是等待数据事件中检测到登录提示
        });
        
        socket.on('data', (data) => {
          if (connectionClosed) return;
          
          try {
            const text = data.toString('utf8');
            buffer.push(text);
            hadResponse = true; // 标记有响应
            
            const fullText = buffer.join('');
            console.log(`收到数据: ${text.replace(/\n/g, '\\n').replace(/\r/g, '\\r')}`);
            
            // 检测登录提示并发送用户名
            if (!loginPromptReceived && 
                (fullText.toLowerCase().includes('login:') || 
                 fullText.toLowerCase().includes('username:'))) {
              console.log(`检测到登录提示，发送用户名: ${credentials.username}`);
              socket.write(`${credentials.username}\r\n`);
              loginPromptReceived = true;
              return; // 发送用户名后返回，等待密码提示
            }
            
            // 检测密码提示并发送密码
            if (loginPromptReceived && !passwordPromptReceived && 
                fullText.toLowerCase().includes('password:')) {
              console.log(`检测到密码提示，发送密码`);
              socket.write(`${credentials.password}\r\n`);
              passwordPromptReceived = true;
              
              // 密码输入后等待一段时间，如果需要发送额外命令
              setTimeout(() => {
                if (!connectionClosed && !loginSuccessful) {
                  sendExtraCommands();
                }
              }, 1000);
              return;
            }
            
            // 检查登录结果
            if (loginPromptReceived && passwordPromptReceived && !loginSuccessful && !isGettingDeviceId) {
              // 登录成功判断条件不变...
              if (fullText.includes('#') || 
                  fullText.includes('$') || 
                  fullText.includes('>') ||
                  fullText.includes('shell') ||
                  fullText.includes('bash') ||
                  fullText.includes('/bin/sh') ||
                  fullText.includes('/bin/ash') ||
                  fullText.includes('登录成功') ||
                  fullText.includes('Welcome') ||
                  fullText.includes('success')) {
                
                console.log(`登录成功! ${ip}:23`);
                loginSuccessful = true;
                isGettingDeviceId = true;
                
                // 重置超时计时器
                if (timer) {
                  clearTimeout(timer);
                }
                timer = setTimeout(() => {
                  console.log(`获取设备ID超时 ${ip}:23`);
                  closeConnection(true, false);
                }, 6000);
                
                // 登录成功后获取设备ID
                this.getDeviceId(ip, socket).then(id => {
                  deviceId = id;
                  closeConnection(true, false);
                }).catch(err => {
                  console.error(`获取设备ID失败: ${err.message}`);
                  closeConnection(true, false);
                });
              }
              // 失败判断条件不变...
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
          
          closeConnection(false, false);
        });
        
        socket.on('close', (hadError) => {
          if (connectionClosed) return; // 忽略已关闭连接的事件
          
          console.log(`${ip} 连接关闭，错误状态: ${hadError}`);
          closeConnection(loginSuccessful, false);
        }); 
      } catch (e) {
        console.error(`创建连接时出错: ${e.message}`);
        closeConnection(false, false);
      }
    });
  }
  
  // 停止当前扫描
  static stopScan() {
    if (this._abortController) {
      this._abortController.abort();
      console.log('扫描已手动中止');
      return true;
    }
    return false;
  }

  // 修改扫描方法以支持中止
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

  // 添加一个执行命令序列的专用方法
  static async executeCommandSequence(ip, commands, credentials = this.TELNET_CREDENTIALS, timeout = 10000) {
    console.log(`准备在 ${ip} 上执行 ${commands.length} 个命令...`);
    
    return new Promise(async (resolve, reject) => {
      let socket = null;
      let connectionActive = false;
      let loginSuccessful = false;
      let commandIndex = 0;
      let buffer = [];
      let commandTimer = null;
      let globalTimer = null;
      
      // 设置全局操作超时
      globalTimer = setTimeout(() => {
        console.error(`在 ${ip} 上执行命令序列超时`);
        cleanup();
        reject(new Error("命令序列执行超时"));
      }, timeout * 2);  // 给整个序列双倍时间
      
      // 清理函数
      const cleanup = () => {
        if (commandTimer) {
          clearTimeout(commandTimer);
          commandTimer = null;
        }
        
        if (globalTimer) {
          clearTimeout(globalTimer);
          globalTimer = null;
        }
        
        if (socket) {
          try {
            socket.removeAllListeners();
            socket.end();
            setTimeout(() => {
              try {
                if (socket) {
                  socket.destroy();
                  socket = null;
                }
              } catch (e) {}
            }, 100);
          } catch (e) {}
        }
        
        connectionActive = false;
      };
      
      // 发送下一个命令
      const sendNextCommand = () => {
        if (!connectionActive || !loginSuccessful) {
          console.error(`无法发送命令，连接状态: ${connectionActive}, 登录状态: ${loginSuccessful}`);
          cleanup();
          reject(new Error("连接或登录状态异常"));
          return;
        }
        
        if (commandIndex >= commands.length) {
          console.log(`所有命令执行完成 (${commands.length}/${commands.length})`);
          cleanup();
          resolve(true);
          return;
        }
        
        const command = commands[commandIndex];
        console.log(`执行命令------》 (${commandIndex+1}/${commands.length}): ${command}`);
        
        buffer = []; // 清空缓冲区
        
        try {
          socket.write(`${command}\r\n`);
          
          // 设置单个命令超时
          if (commandTimer) clearTimeout(commandTimer);
          commandTimer = setTimeout(() => {
            console.error(`命令超时: ${command}`);
            commandIndex++; // 跳过这个命令
            sendNextCommand();
          }, timeout);
          
        } catch (e) {
          console.error(`发送命令出错: ${e.message}`);
          cleanup();
          reject(new Error(`发送命令出错: ${e.message}`));
        }
      };
      
      // 连接和事件处理
      try {
        console.log(`为执行命令序列连接到 ${ip}:23...`);
        
        socket = TcpSocket.createConnection({
          host: ip,
          port: 23,
          timeout: timeout / 2,
          localAddress: '0.0.0.0',
          noDelay: true,
          keepAlive: true  // 保持连接活跃
        }, () => {
          console.log(`命令序列连接已建立，等待登录提示...`);
          connectionActive = true;
        });
        
        // 处理数据接收
        socket.on('data', (data) => {
          try {
            const text = data.toString('utf8');
            buffer.push(text);
            console.log(`命令输出: ${text.replace(/\n/g, '\\n').replace(/\r/g, '\\r')}`);
            
            const fullText = buffer.join('');
            
            // 未登录时，处理登录过程
            if (!loginSuccessful) {
              // 检测登录提示并发送用户名
              if (fullText.toLowerCase().includes('login:') || 
                  fullText.toLowerCase().includes('username:')) {
                console.log(`发送用户名: ${credentials.username}`);
                socket.write(`${credentials.username}\r\n`);
                return;
              }
              
              // 检测密码提示并发送密码
              if (fullText.toLowerCase().includes('password:')) {
                console.log(`发送密码`);
                socket.write(`${credentials.password}\r\n`);
                return;
              }
              
              // 检测登录成功
              if (fullText.includes('#') || 
                  fullText.includes('$') || 
                  fullText.includes('>')) {
                console.log(`命令序列登录成功`);
                loginSuccessful = true;
                // 开始发送命令
                sendNextCommand();
                return;
              }
            } 
            // 已登录，处理命令响应
            else {
              // 检测命令提示符，表示命令执行完成
              if (fullText.includes('#') || 
                  fullText.includes('$') || 
                  fullText.includes('>')) {
                
                // 清除命令超时
                if (commandTimer) {
                  clearTimeout(commandTimer);
                  commandTimer = null;
                }
                
                // 处理命令输出
                const output = fullText.trim();
                console.log(`命令 ${commandIndex+1} 执行完成，输出: ${output.length} 字符`);
                
                // 移动到下一个命令
                commandIndex++;
                setTimeout(sendNextCommand, 200); // 短暂延迟避免太快发送下一命令
              }
            }
          } catch (e) {
            console.error(`处理数据出错: ${e.message}`);
            cleanup();
            reject(new Error(`处理数据出错: ${e.message}`));
          }
        });
        
        // 错误处理
        socket.on('error', (error) => {
          console.error(`命令序列连接错误: ${error.message}`);
          cleanup();
          reject(new Error(`连接错误: ${error.message}`));
        });
        
        socket.on('close', () => {
          console.log(`命令序列连接关闭`);
          connectionActive = false;
          if (commandIndex < commands.length) {
            cleanup();
            reject(new Error("连接意外关闭"));
          }
        });
        
      } catch (e) {
        console.error(`创建命令序列连接出错: ${e.message}`);
        cleanup();
        reject(new Error(`创建连接出错: ${e.message}`));
      }
    });
  }

  // 修正检查设备版本和配置路径的方法
  static async checkDeviceVersion(ip, credentials = this.TELNET_CREDENTIALS) {
    console.log(`检查 ${ip} 的设备版本...`);
    
    try {
      // 检查是否为新系统 - 通过/tmp/app_versions文件判断
      const versionCheckCommand = "ls -la /tmp/app_versions 2>/dev/null && echo 'NEW_SYSTEM' || echo 'OLD_SYSTEM'";
      const versionResult = await this.executeCommand(ip, versionCheckCommand, credentials);
      
      console.log(`系统类型检查结果: ${versionResult}`);
      
      // 根据检查结果确定配置路径
      let configPath = null;
      let logPath = null;
      let isNewSystem = false;
      
      if (versionResult.includes('NEW_SYSTEM')) {
        // 新系统 - 有/tmp/app_versions文件
        configPath = '/customer/config/mqtt.ini';
        logPath = '/customer/log/mqtt.log';
        isNewSystem = true;
        console.log(`设备使用新系统, 配置路径: ${configPath}, 日志路径: ${logPath}`);
      } else {
        // 旧系统 - 没有/tmp/app_versions文件
        configPath = '/software/mqtt.ini';
        logPath = '/software/mqtt/mymqtt.log';
        console.log(`设备使用旧系统, 配置路径: ${configPath}, 日志路径: ${logPath}`);
      }
      
      // 验证配置文件是否存在
      const configCheckCommand = `ls -la ${configPath} 2>/dev/null && echo 'CONFIG_EXISTS' || echo 'CONFIG_NOT_FOUND'`;
      const configResult = await this.executeCommand(ip, configCheckCommand, credentials);
      
      if (configResult.includes('CONFIG_NOT_FOUND')) {
        console.error(`警告: 配置文件 ${configPath} 不存在`);
        
        // 尝试查找配置文件
        const findCommand = "find / -name mqtt.ini 2>/dev/null | head -n 1";
        const findResult = await this.executeCommand(ip, findCommand, credentials);
        
        if (findResult && findResult.trim().length > 0) {
          configPath = findResult.trim();
          console.log(`已找到替代配置文件: ${configPath}`);
        } else {
          throw new Error(`找不到配置文件，无法继续操作`);
        }
      }
      
      return {
        configPath,
        logPath,
        isNewSystem
      };
    } catch (e) {
      console.error(`检查设备版本出错: ${e.message}`);
      throw e;
    }
  }

  // 使用修正后的逻辑改进切换版本方法
  static async switchToOverseasVersion(ip, credentials = this.TELNET_CREDENTIALS) {
    console.log(`尝试将设备 ${ip} 切换到海外版...`);
    
    try {
      // 首先检查设备版本和配置文件位置 - 使用正确的判断标准
      const versionInfo = await this.checkDeviceVersion(ip, credentials);
      console.log(`设备版本信息: ${JSON.stringify(versionInfo)}`);
      
      const configPath = versionInfo.configPath;
      const logPath = versionInfo.logPath;
      const isNewSystem = versionInfo.isNewSystem;
      
      if (!configPath) {
        throw new Error("无法确定配置文件路径");
      }
      
      // 准备命令序列 - 更详细且带验证步骤
      const commands = [
        // 1. 显示当前配置
        `echo "当前配置:"`,
        `cat ${configPath}`,
        
        // 2. 备份当前配置
        `cp ${configPath} ${configPath}.bak`,
        
        // 3. 使用sed修改配置 - 更精确的替换
        `sed -i 's|en_host=.*|en_host=cloud-service-us.austinelec.com|g' ${configPath}`,
        
        // 4. 确认修改后的配置
        `echo "修改后配置:"`,
        `cat ${configPath}`,
        
        // 5. 停止服务 - 根据系统类型选择命令
        isNewSystem 
          ? `killall -9 mqtt_client || echo "服务未运行"`
          : `killall -9 mymqtt || kill -9 $(pidof mymqtt) || echo "服务未运行"`,
        
        // 6. 等待片刻
        `echo "等待服务重启..."`,
        `sleep 2`,
        
        // 7. 确认配置再次
        `grep "en_host=" ${configPath}`,
      ];
      
      // 执行命令序列
      console.log(`准备执行 ${commands.length} 个命令来切换到海外版...`);
      await this.executeCommandSequence(ip, commands, credentials, 30000);
      
      // 最终配置验证
      const finalCheck = await this.executeCommand(ip, 
        `grep "en_host=cloud-service-us.austinelec.com" ${configPath}`,
        credentials
      );
      
      if (finalCheck.includes("cloud-service-us.austinelec.com")) {
        console.log(`✓ 最终验证通过: ${finalCheck}`);
        return {
          success: true,
          message: `设备 ${ip} 已成功切换到海外版`
        };
      } else {
        console.error(`✗ 最终验证失败: ${finalCheck}`);
        return {
          success: false,
          message: "配置修改未成功应用，请检查设备"
        };
      }
    } catch (error) {
      console.error(`切换版本出错: ${error}`);
      return {
        success: false,
        message: `切换版本失败: ${error.message}`
      };
    }
  }

  // 增加配置检查方法
  static async verifyConfiguration(ip, credentials = this.TELNET_CREDENTIALS) {
    try {
      const commands = [
        // 检查可能的配置文件位置
        "ls -la /software/mqtt.ini || ls -la /customer/config/mqtt.ini || ls -la /etc/mqtt.ini",
        "cat /software/mqtt.ini 2>/dev/null || cat /customer/config/mqtt.ini 2>/dev/null || cat /etc/mqtt.ini 2>/dev/null"
      ];
      
      await this.executeCommandSequence(ip, commands, credentials, 10000);
      return true;
    } catch (e) {
      console.error(`验证配置出错: ${e.message}`);
      return false;
    }
  }
}

