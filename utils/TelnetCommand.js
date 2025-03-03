import TcpSocket from 'react-native-tcp-socket';

export class TelnetCommand {
  // Telnet验证凭据
  static TELNET_CREDENTIALS = {
    username: 'root',
    password: 'ya!2dkwy7-934^'
  };
  
  // 创建一个Telnet连接
  static async connect(ip, credentials = this.TELNET_CREDENTIALS, timeout = 5000) {
    console.log(`尝试连接到 ${ip}:23...`);
    
    return new Promise((resolve, reject) => {
      const buffer = [];
      let socket = null;
      let timer = null;
      let connectionClosed = false;
      let loginPromptReceived = false;
      let passwordPromptReceived = false;
      
      const closeConnection = (error = null) => {
        if (connectionClosed) return;
        connectionClosed = true;
        
        if (timer) {
          clearTimeout(timer);
          timer = null;
        }
        
        if (socket) {
          socket.removeAllListeners();
          socket.end();
          socket.destroy();
        }
        
        if (error) {
          reject(error);
        }
      };
      
      timer = setTimeout(() => {
        closeConnection(new Error('连接超时'));
      }, timeout);
      
      try {
        socket = TcpSocket.createConnection({
          host: ip,
          port: 23,
          timeout: timeout / 2,
          localAddress: '0.0.0.0',
          noDelay: true,
          keepAlive: true
        }, () => {
          console.log(`已连接到 ${ip}:23, 等待登录提示...`);
        });
        
        socket.on('data', (data) => {
          try {
            const text = data.toString('utf8');
            buffer.push(text);
            const fullText = buffer.join('');
            console.log(`收到数据: ${text.replace(/\n/g, '\\n').replace(/\r/g, '\\r')}`);
            
            if (!loginPromptReceived) {
              // 登录提示，发送用户名
              console.log(`发送用户名: ${credentials.username}`);
              socket.write(`${credentials.username}\r\n`);
              loginPromptReceived = true;
              return;
            }
            
            if (loginPromptReceived && !passwordPromptReceived) {
              // 密码提示，发送密码
              console.log(`发送密码`);
              socket.write(`${credentials.password}\r\n`);
              passwordPromptReceived = true;
              return;
            }
            
            if (loginPromptReceived && passwordPromptReceived) {
              if (fullText.includes('#') || fullText.includes('$') || fullText.includes('>')) {
                console.log(`登录成功! ${ip}:23`);
                clearTimeout(timer);
                resolve(socket);
              }
            }
          } catch (e) {
            console.error(`处理数据时出错: ${e.message}`);
            closeConnection(e);
          }
        });
        
        socket.on('error', (error) => {
          console.error(`连接错误: ${error.message}`);
          closeConnection(error);
        });
        
        socket.on('close', () => {
          if (!connectionClosed) {
            closeConnection(new Error('连接已关闭'));
          }
        });
      } catch (e) {
        closeConnection(e);
      }
    });
  }
  
  // 执行单个命令
  static async executeCommand(socket, command, timeout = 2000) {
    console.log(`执行命令: ${command}`);
    
    return new Promise((resolve, reject) => {
      const buffer = [];
      let commandTimeout = null;
      let commandCompleted = false;
      
      const completeCommand = (result) => {
        if (commandCompleted) return;
        commandCompleted = true;
        
        if (commandTimeout) {
          clearTimeout(commandTimeout);
        }
        
        resolve(result);
      };
      
      const dataHandler = (data) => {
        try {
          const text = data.toString('utf8');
          buffer.push(text);
          const output = buffer.join('');
          console.log(`命令输出: ${text.replace(/\n/g, '\\n').replace(/\r/g, '\\r')}`);
          
          // 检查命令提示符，表示命令已完成
          if (output.includes('#') || output.includes('$') || output.includes('>')) {
            socket.removeListener('data', dataHandler);
            completeCommand(output);
          }
        } catch (e) {
          console.error(`处理命令输出时出错: ${e.message}`);
          socket.removeListener('data', dataHandler);
          reject(e);
        }
      };
      
      commandTimeout = setTimeout(() => {
        socket.removeListener('data', dataHandler);
        completeCommand(buffer.join('')); // 超时后也返回已收集的输出
      }, timeout);
      
      socket.on('data', dataHandler);
      
      try {
        socket.write(`${command}\r\n`);
      } catch (e) {
        socket.removeListener('data', dataHandler);
        reject(e);
      }
    });
  }
  
  // 执行一系列命令
  static async executeCommands(ip, commands) {
    console.log(`准备在 ${ip} 上执行 ${commands.length} 个命令...`);
    let connection = null;
    
    try {
      // 建立连接
      connection = await this.connect(ip);
      console.log(`连接成功，开始执行命令...`);
      
      const results = [];
      
      // 依次执行每个命令
      for (const cmd of commands) {
        if (typeof cmd === 'string') {
          // 如果是字符串，使用默认超时
          const output = await this.executeCommand(connection, cmd);
          results.push({ cmd, output });
        } else {
          // 如果是对象，包含自定义选项
          const { cmd: cmdStr, timeout = 2000, delay = 0 } = cmd;
          
          // 执行命令
          const output = await this.executeCommand(connection, cmdStr, timeout);
          results.push({ cmd: cmdStr, output });
          
          // 如果需要延迟，则等待指定时间
          if (delay > 0) {
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      }
      
      return {
        success: true,
        results,
        debugInfo: { connectionEstablished: true }  // 添加调试信息
      };
    } catch (error) {
      console.error(`执行命令序列时出错: ${error.message}`);
      return {
        success: false,
        error: error.message,
        debugInfo: { errorDetails: error.stack }  // 添加错误详情
      };
    } finally {
      if (connection) {
        try {
          this.closeConnection(connection);
        } catch (e) {
          console.error(`关闭连接时出错: ${e.message}`);
        }
      }
    }
  }
  
  // 关闭连接
  static closeConnection(socket) {
    if (socket) {
      try {
        socket.removeAllListeners();
        socket.end();
        socket.destroy();
      } catch (e) {
        console.error(`关闭连接时出错: ${e.message}`);
      }
    }
  }
} 