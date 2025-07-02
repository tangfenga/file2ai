/**
 * Background Script - 后台服务工作者
 * 处理插件的后台逻辑和消息传递
 */

// 插件安装时的初始化
chrome.runtime.onInstalled.addListener((details) => {
  console.log('File Uploader Assistant 已安装');
  
  if (details.reason === 'install') {
    // 首次安装时的设置
    chrome.storage.sync.set({
      enabled: true,
      maxFileSize: 1024 * 1024, // 1MB
      supportedTypes: ['.txt', '.md', '.json', '.csv', '.js', '.ts', '.html', '.css', '.xml', '.yaml', '.yml'],
      showToasts: true,
      autoTrigger: true
    });
    
    // 打开欢迎页面或设置页面
    // chrome.tabs.create({ url: 'popup/popup.html' });
  }
});

// 监听来自content script的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('收到消息:', request);
  
  switch (request.action) {
    case 'getSettings':
      handleGetSettings(sendResponse);
      return true; // 保持消息通道开放
      
    case 'updateSettings':
      handleUpdateSettings(request.settings, sendResponse);
      return true;
      
    case 'fileUploaded':
      handleFileUploaded(request.data, sender);
      break;
      
    case 'logError':
      console.error('Content Script错误:', request.error);
      break;
      
    case 'logInfo':
      console.log('Content Script信息:', request.info);
      break;
      
    default:
      console.warn('未知的消息类型:', request.action);
  }
});

/**
 * 获取插件设置
 * @param {Function} sendResponse - 响应函数
 */
async function handleGetSettings(sendResponse) {
  try {
    const settings = await chrome.storage.sync.get([
      'enabled',
      'maxFileSize',
      'supportedTypes',
      'showToasts',
      'autoTrigger'
    ]);
    
    // 设置默认值
    const defaultSettings = {
      enabled: true,
      maxFileSize: 1024 * 1024,
      supportedTypes: ['.txt', '.md', '.json', '.csv', '.js', '.ts', '.html', '.css', '.xml', '.yaml', '.yml'],
      showToasts: true,
      autoTrigger: true
    };
    
    const finalSettings = { ...defaultSettings, ...settings };
    sendResponse({ success: true, settings: finalSettings });
  } catch (error) {
    console.error('获取设置失败:', error);
    sendResponse({ success: false, error: error.message });
  }
}

/**
 * 更新插件设置
 * @param {Object} settings - 新的设置
 * @param {Function} sendResponse - 响应函数
 */
async function handleUpdateSettings(settings, sendResponse) {
  try {
    await chrome.storage.sync.set(settings);
    sendResponse({ success: true });
    
    // 通知所有标签页设置已更新
    const tabs = await chrome.tabs.query({});
    tabs.forEach(tab => {
      chrome.tabs.sendMessage(tab.id, {
        action: 'settingsUpdated',
        settings: settings
      }).catch(() => {
        // 忽略无法发送消息的标签页（如chrome://页面）
      });
    });
  } catch (error) {
    console.error('更新设置失败:', error);
    sendResponse({ success: false, error: error.message });
  }
}

/**
 * 处理文件上传事件
 * @param {Object} data - 文件数据
 * @param {Object} sender - 发送者信息
 */
function handleFileUploaded(data, sender) {
  console.log('文件已上传:', {
    fileName: data.fileName,
    size: data.size,
    url: sender.tab?.url
  });
  
  // 可以在这里添加统计、日志记录等功能
  updateBadge(sender.tab?.id);
}

/**
 * 更新插件图标徽章
 * @param {number} tabId - 标签页ID
 */
function updateBadge(tabId) {
  if (!tabId) return;
  
  // 显示一个简单的成功指示
  chrome.action.setBadgeText({
    text: '✓',
    tabId: tabId
  });
  
  chrome.action.setBadgeBackgroundColor({
    color: '#10b981',
    tabId: tabId
  });
  
  // 3秒后清除徽章
  setTimeout(() => {
    chrome.action.setBadgeText({
      text: '',
      tabId: tabId
    });
  }, 3000);
}

// 监听标签页更新，清理徽章
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'loading') {
    chrome.action.setBadgeText({
      text: '',
      tabId: tabId
    });
  }
});

// 监听存储变化
chrome.storage.onChanged.addListener((changes, namespace) => {
  console.log('存储已更改:', changes, namespace);
  
  // 如果设置发生变化，可以在这里处理
  if (changes.enabled) {
    console.log('插件启用状态已更改:', changes.enabled.newValue);
  }
});

// 处理插件图标点击事件（如果需要）
chrome.action.onClicked.addListener((tab) => {
  // 这里可以添加点击插件图标时的行为
  // 由于我们有popup，这个事件通常不会触发
  console.log('插件图标被点击:', tab.url);
});

// 错误处理
chrome.runtime.onSuspend.addListener(() => {
  console.log('Background script 即将被挂起');
});

// 启动时的日志
console.log('File Uploader Assistant Background Script 已启动');

// 导出一些工具函数供其他脚本使用
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    handleGetSettings,
    handleUpdateSettings,
    handleFileUploaded
  };
}
