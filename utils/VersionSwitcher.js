import { TelnetCommand } from './TelnetCommand';

export class VersionSwitcher {
  // 版本配置 - 交换了海外版和国内版的域名，与需求匹配
  static VERSIONS = {
    OVERSEAS: {
      name: '海外版',
      cn_host: 'cloud-service-us.austinelec.com', // 修改为正确域名
      en_host: 'cloud-service-us.austinelec.com'  // 修改为正确域名
    },
    CHINA: {
      name: '中国大陆版',
      cn_host: 'cloud-service.austinelec.com',    // 修改为正确域名
      en_host: 'cloud-service.austinelec.com'     // 修改为正确域名
    }
  };
  
  // 检查系统版本并决定配置路径
  static async checkSystemVersion(ip) {
    try {
      const result = await TelnetCommand.executeCommands(ip, [
        { cmd: 'ls -la /tmp/app_version' }
      ]);
      
      // 检查命令执行结果
      const output = result.results?.[0]?.output || '';
      const isNewSystem = !output.includes('No such file');
      
      return {
        isNewSystem,
        configPath: isNewSystem ? '/customer/config/mqtt.ini' : '/software/mqtt.ini',
        logPath: isNewSystem ? '/software/log/mymqtt.log' : '/software/mqtt/mymqtt.log'
      };
    } catch (error) {
      console.error('检查系统版本出错:', error);
      throw error;
    }
  }
  
  // 切换到指定版本
  static async switchVersion(ip, versionType) {
    try {
      // 添加调试日志
      console.log(`切换版本类型: ${versionType}`);
      console.log('可用版本配置:', JSON.stringify(this.VERSIONS));
      
      if (!this.VERSIONS[versionType]) {
        throw new Error(`无效的版本类型: ${versionType}`);
      }
      
      // 获取版本配置
      const version = this.VERSIONS[versionType];
      console.log(`准备将 ${ip} 切换到${version.name}...`);
      console.log(`域名配置: cn_host=${version.cn_host}, en_host=${version.en_host}`);
      
      // 1. 检查系统版本
      const { isNewSystem, configPath, logPath } = await this.checkSystemVersion(ip);
      console.log(`设备使用${isNewSystem ? '新' : '旧'}系统, 配置路径: ${configPath}, 日志路径: ${logPath}`);
      
      // 2. 构建命令序列
      const commands = [
        // a. 备份并修改配置文件
        { cmd: `cp ${configPath} ${configPath}.bak` },
        { cmd: `cat ${configPath}`, timeout: 3000 }, // 查看当前配置
        
        // 使用echo命令完全替换配置文件内容，避免sed命令的问题
        { cmd: `echo -e "[mqtt]\\ncn_host=${version.cn_host}\\ncn_port=1883\\nen_host=${version.en_host}\\nen_port=1883" > ${configPath}` },
        
        // b. 校验修改是否成功
        { cmd: `cat ${configPath}`, timeout: 3000 },
        
        // c. 执行sync指令
        { cmd: 'sync' },
        
        // d. 清空日志文件 - 处理新旧系统路径区别
        { cmd: `echo "" > ${logPath}` },
        
        // e. 杀掉mymqtt进程
        { cmd: 'kill -9 $(pidof mymqtt)' },
        
        // 等待3秒确保服务重启
        { cmd: 'echo "等待服务重启..."', delay: 3000 },
        
        // f. 检查日志 - 增加超时时间
        { cmd: `cat ${logPath} | grep ${version.cn_host}`, timeout: 5000 }
      ];
      
      // 3. 执行命令序列
      const result = await TelnetCommand.executeCommands(ip, commands);
      
      // 4. 分析执行结果
      if (!result.success) {
        throw new Error(`命令执行失败: ${result.error}`);
      }
      
      // 获取验证结果
      const verifyConfigResult = result.results[3]?.output || '';
      if (!verifyConfigResult.includes(`cn_host=${version.cn_host}`) || 
          !verifyConfigResult.includes(`en_host=${version.en_host}`)) {
        return {
          success: false,
          message: '配置文件修改验证失败，未找到预期的配置项'
        };
      }
      
      // 检查日志中是否包含期望的域名
      const logCheckResult = result.results[result.results.length - 1]?.output || '';
      const success = logCheckResult.includes(version.cn_host);
      
      return {
        success,
        message: success 
          ? `设备 ${ip} 已成功切换到${version.name}` 
          : '版本切换可能未完全生效，未在日志中找到域名'
      };
    } catch (error) {
      console.error('切换版本出错:', error);
      return {
        success: false,
        message: `切换版本失败: ${error.message}`
      };
    }
  }
} 