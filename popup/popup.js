/**
 * Popup 页面脚本
 * 处理弹窗页面的交互逻辑和设置管理
 */

class PopupManager {
  constructor() {
    this.settings = {};
    this.stats = {
      totalFiles: 0,
      totalSize: 0
    };
    
    this.init();
  }

  /**
   * 初始化弹窗
   */
  async init() {
    console.log('Popup 初始化中...');
    
    // 加载设置和统计数据
    await this.loadSettings();
    await this.loadStats();
    
    // 绑定事件监听器
    this.bindEvents();
    
    // 更新UI
    this.updateUI();
    
    console.log('Popup 初始化完成');
  }

  /**
   * 加载设置
   */
  async loadSettings() {
    try {
      const response = await chrome.runtime.sendMessage({ action: 'getSettings' });
      if (response.success) {
        this.settings = response.settings;
      } else {
        console.error('加载设置失败:', response.error);
        this.settings = {
          enabled: true,
          maxFileSize: 1024 * 1024,
          supportedTypes: ['.txt', '.md', '.json', '.csv', '.js', '.ts', '.html', '.css', '.xml', '.yaml', '.yml'],
          showToasts: true,
          autoTrigger: true
        };
      }
    } catch (error) {
      console.error('加载设置时出错:', error);
    }
  }

  /**
   * 加载统计数据
   */
  async loadStats() {
    try {
      const stats = await chrome.storage.local.get(['totalFiles', 'totalSize']);
      this.stats.totalFiles = stats.totalFiles || 0;
      this.stats.totalSize = stats.totalSize || 0;
    } catch (error) {
      console.error('加载统计数据时出错:', error);
    }
  }

  /**
   * 绑定事件监听器
   */
  bindEvents() {
    // 切换插件启用状态
    document.getElementById('toggleBtn').addEventListener('click', () => {
      this.togglePlugin();
    });

    // 测试功能按钮
    document.getElementById('testBtn').addEventListener('click', () => {
      this.testFunction();
    });

    // 设置项变化监听
    document.getElementById('showToasts').addEventListener('change', (e) => {
      this.updateSetting('showToasts', e.target.checked);
    });

    document.getElementById('autoTrigger').addEventListener('change', (e) => {
      this.updateSetting('autoTrigger', e.target.checked);
    });

    document.getElementById('maxFileSize').addEventListener('change', (e) => {
      this.updateSetting('maxFileSize', parseInt(e.target.value));
    });

    // 底部链接
    document.getElementById('helpLink').addEventListener('click', (e) => {
      e.preventDefault();
      this.openHelp();
    });

    document.getElementById('feedbackLink').addEventListener('click', (e) => {
      e.preventDefault();
      this.openFeedback();
    });

    document.getElementById('aboutLink').addEventListener('click', (e) => {
      e.preventDefault();
      this.openAbout();
    });
  }

  /**
   * 更新UI元素
   */
  updateUI() {
    // 更新状态指示器
    const statusDot = document.getElementById('statusDot');
    const statusText = document.getElementById('statusText');
    const toggleBtn = document.getElementById('toggleBtn');
    const toggleText = document.getElementById('toggleText');

    if (this.settings.enabled) {
      statusDot.classList.remove('disabled');
      statusText.textContent = '已启用';
      toggleBtn.classList.remove('disabled');
      toggleText.textContent = '禁用插件';
    } else {
      statusDot.classList.add('disabled');
      statusText.textContent = '已禁用';
      toggleBtn.classList.add('disabled');
      toggleText.textContent = '启用插件';
    }

    // 更新设置项
    document.getElementById('showToasts').checked = this.settings.showToasts;
    document.getElementById('autoTrigger').checked = this.settings.autoTrigger;
    document.getElementById('maxFileSize').value = this.settings.maxFileSize;

    // 更新统计数据
    document.getElementById('totalFiles').textContent = this.stats.totalFiles;
    document.getElementById('totalSize').textContent = this.formatFileSize(this.stats.totalSize);
  }

  /**
   * 切换插件启用状态
   */
  async togglePlugin() {
    const newState = !this.settings.enabled;
    await this.updateSetting('enabled', newState);
    this.updateUI();
  }

  /**
   * 测试功能
   */
  testFunction() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'testPlugin' }, (response) => {
          if (chrome.runtime.lastError) {
            console.error('测试功能失败:', chrome.runtime.lastError);
            alert('测试失败：无法连接到页面');
          } else {
            alert('测试成功：插件正在运行');
          }
        });
      }
    });
  }

  /**
   * 更新设置项
   * @param {string} key - 设置项键名
   * @param {any} value - 设置项值
   */
  async updateSetting(key, value) {
    try {
      this.settings[key] = value;
      const response = await chrome.runtime.sendMessage({
        action: 'updateSettings',
        settings: this.settings
      });
      
      if (response.success) {
        console.log(`设置更新成功: ${key} = ${value}`);
        this.updateUI();
      } else {
        console.error('更新设置失败:', response.error);
      }
    } catch (error) {
      console.error('更新设置时出错:', error);
    }
  }

  /**
   * 打开帮助页面
   */
  openHelp() {
    window.open('https://github.com/file-uploader-assistant/help', '_blank');
  }

  /**
   * 打开反馈页面
   */
  openFeedback() {
    window.open('https://github.com/file-uploader-assistant/feedback', '_blank');
  }

  /**
   * 打开关于页面
   */
  openAbout() {
    window.open('https://github.com/file-uploader-assistant/about', '_blank');
  }

  /**
   * 格式化文件大小
   * @param {number} bytes - 文件大小（字节）
   * @returns {string} 格式化后的文件大小
   */
  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

// 当DOM加载完成时初始化
document.addEventListener('DOMContentLoaded', () => {
  new PopupManager();
});
