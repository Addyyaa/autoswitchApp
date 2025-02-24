const { parentPort } = require('worker_threads');
const ping = require('ping');
const portscanner = require('portscanner');

// 检查 Telnet 端口是否开放
async function checkTelnetPort(ip) {
    const port = 23;  // Telnet 默认端口
    const status = await portscanner.checkPortStatus(port, ip);
    return status === 'open';
}

// 检查设备是否在线
async function checkIP(ip) {
    const res = await ping.promise.probe(ip);
    return res.alive;
}

// 扫描单个设备
async function scanDevice(ip) {
    if (await checkIP(ip)) {
        const isTelnetOpen = await checkTelnetPort(ip);
        if (isTelnetOpen) {
            return ip;
        }
    }
    return null;
}

// 监听主线程发来的消息
parentPort.on('message', async ({ ipRange }) => {
    try {
        const result = await scanDevice(ipRange);
        parentPort.postMessage({ result });
    } catch (error) {
        console.error(`Worker 扫描 ${ipRange} 时出错:`, error);
        parentPort.postMessage({ result: null });
    }
}); 