const ping = require('ping');
const portscanner = require('portscanner');

// 获取设备的局域网 IP
const getLocalIp = () => {
  return new Promise((resolve, reject) => {
    const exec = require('child_process').exec;
    exec('ipconfig', (err, stdout, stderr) => {
      if (err || stderr) {
        reject(err || stderr);
      } else {
        // 修改正则表达式以适应不同的格式
        const matches = stdout.match(/IPv4.*?(\d+\.\d+\.\d+\.\d+)/);
        if (matches) {
          resolve(matches[1]);
        } else {
          // 尝试其他可能的格式
          const altMatches = stdout.match(/以太网适配器.*?IPv4.*?(\d+\.\d+\.\d+\.\d+)/s);
          if (altMatches) {
            resolve(altMatches[1]);
          } else {
            reject('无法获取本地 IP 地址');
          }
        }
      }
    });
  });
};

// 获取局域网 IP 范围
const getNetworkRange = (ip) => {
  const parts = ip.split('.');
  return `${parts[0]}.${parts[1]}.${parts[2]}.`;  // 返回例如 "192.168.1."
};

// 扫描设备是否在线
const checkIP = async (ip) => {
  const res = await ping.promise.probe(ip);
  return res.alive;  // 判断设备是否在线
};

// 检查 Telnet 端口是否开放
const checkTelnetPort = async (ip) => {
  const port = 23;  // Telnet 默认端口
  const status = await portscanner.checkPortStatus(port, ip);
  return status === 'open';  // 如果端口开放，返回 true
};

// 扫描整个网段
const scanNetwork = async (subnet) => {
  let telnetDevices = [];
  for (let i = 1; i <= 254; i++) {
    let ip = `${subnet}${i}`;
    console.log(`扫描 IP: ${ip}`);
    
    if (await checkIP(ip)) {  // 如果设备在线
      const isTelnetOpen = await checkTelnetPort(ip);
      if (isTelnetOpen) {
        telnetDevices.push(ip);  // 如果 Telnet 端口开放，加入列表
      }
    }
  }
  return telnetDevices;
};

// 主函数
const main = async () => {
  try {
    const localIp = await getLocalIp();
    console.log('当前设备的 IP 地址:', localIp);
    
    const subnet = getNetworkRange(localIp);  // 获取当前网段
    console.log(`扫描网段: ${subnet}0-254`);

    const devices = await scanNetwork(subnet);
    console.log('找到以下开放 Telnet 的设备:', devices);
  } catch (error) {
    console.error('发生错误:', error);
  }
};

main();
