// 扫描指定范围的IP
self.onmessage = async function(e) {
  const { subnet, start, end } = e.data;
  
  for (let i = start; i <= end; i++) {
    const ip = `${subnet}${i}`;
    try {
      const isOpen = await checkTelnetPort(ip);
      if (isOpen) {
        self.postMessage({ type: 'found', ip });
      }
      // 发送进度更新
      self.postMessage({ type: 'progress', progress: Math.floor((i - start) / (end - start) * 100) });
    } catch (error) {
      console.error(`扫描 ${ip} 失败:`, error);
    }
  }
  
  self.postMessage({ type: 'complete' });
};

async function checkTelnetPort(ip) {
  try {
    const response = await fetch(`http://${ip}:23`, { 
      timeout: 1000,
      method: 'HEAD'
    });
    return true;
  } catch (error) {
    return false;
  }
} 