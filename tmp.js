const ping = require('ping');
const portscanner = require('portscanner');
const { Worker } = require('worker_threads');
const path = require('path');

// 获取设备的局域网 IP
const getLocalIp = () => {
  return new Promise((resolve, reject) => {
    try {
      const { networkInterfaces } = require('os');
      const nets = networkInterfaces();
      
      for (const name of Object.keys(nets)) {
        for (const net of nets[name]) {
          // 跳过内部 IP 和非 IPv4 地址
          if (net.family === 'IPv4' && !net.internal) {
            console.log('找到IP地址:', net.address);
            return resolve(net.address);
          }
        }
      }
      reject(new Error('未找到有效的 IPv4 地址'));
    } catch (error) {
      console.error('获取IP地址时出错:', error);
      reject(error);
    }
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

// 扫描单个设备的 23 端口
const scanDevice = async (ip) => {
  if (await checkIP(ip)) {  // 如果设备在线
    const isTelnetOpen = await checkTelnetPort(ip);
    if (isTelnetOpen) {
      return ip;  // 如果 Telnet 端口开放，返回设备 IP
    }
  }
  return null;  // 如果设备不在线或者 Telnet 端口没有开放，返回 null
};

async function scanNetwork(subnet, startIP, endIP) {
    console.log('开始扫描网络...');
    
    const workers = [];
    const maxWorkers = 100;
    const results = [];
    let scannedCount = 0;
    const totalIPs = endIP - startIP + 1;
    
    // 创建 IP 地址数组
    const ipList = [];
    for (let i = startIP; i <= endIP; i++) {
        ipList.push(`${subnet}${i}`);  // 使用动态获取的网段
    }
    
    const handleResult = (result) => {
        scannedCount++;
        if (result) {
            results.push(result);
        }
        // 每扫描10个IP就输出一次进度
        if (scannedCount % 100 === 0 || scannedCount === totalIPs) {
            const progress = ((scannedCount / totalIPs) * 100).toFixed(1);
            console.log(`已扫描: ${scannedCount}/${totalIPs} (${progress}%)`);
        }
    };

    return new Promise((resolve) => {
        let currentIndex = 0;

        const startNewWorker = () => {
            if (currentIndex >= ipList.length) {
                if (workers.length === 0) {
                    console.log('扫描完成！');
                    resolve(results);
                }
                return;
            }

            const ip = ipList[currentIndex++];
            console.log(`开始扫描: ${ip}`);  // 添加日志
            
            const worker = new Worker(path.join(__dirname, 'portScanWorker.js'));
            workers.push(worker);

            worker.on('message', ({ result }) => {
                if (result) {
                    console.log(`发现设备: ${result}`);  // 添加日志
                }
                handleResult(result);
                
                worker.terminate();
                workers.splice(workers.indexOf(worker), 1);
                startNewWorker();
            });

            worker.on('error', (error) => {
                console.error(`扫描 ${ip} 时出错: ${error}`);  // 添加日志
                handleResult(null);
                worker.terminate();
                workers.splice(workers.indexOf(worker), 1);
                startNewWorker();
            });

            worker.postMessage({ ipRange: ip });
        };

        // 启动初始的 worker 数量
        for (let i = 0; i < Math.min(maxWorkers, ipList.length); i++) {
            startNewWorker();
        }
    });
}

// 主函数
async function main() {
    try {
        const localIp = await getLocalIp();
        console.log('当前设备的 IP 地址:', localIp);
        
        const subnet = getNetworkRange(localIp);  // 获取当前网段
        console.log(`扫描网段: ${subnet}`);

        const devices = await scanNetwork(subnet, 0, 254);  // 传入动态获取的网段
        
        if (devices.length > 0) {
            console.log('找到的设备：', devices);
        } else {
            console.log('未找到任何设备');
        }
        
        process.exit(0);
    } catch (error) {
        console.error('发生错误:', error);
        process.exit(1);
    }
}

main();

