/**
 * Content Script - 核心功能实现
 * 负责监听用户输入、处理@触发、文件上传和内容插入
 */
class FileUploaderContent {
  constructor() {
    this.fileReader = new FileReaderUtil();
    this.fileCache = new Map(); // 缓存已上传的文件内容
    this.isEnabled = true;
    this.lastAtPosition = null;
    this.currentInputElement = null;
    
    this.init();
  }

  /**
   * 初始化插件
   */
  init() {
    console.log('File Uploader Assistant 已加载');
    
    // 监听DOM变化，处理动态加载的输入框
    this.observeDOM();
    
    // 绑定现有的输入框
    this.bindExistingInputs();
    
    // 监听发送事件
    this.bindSendEvents();
  }

  /**
   * 观察DOM变化，处理动态加载的元素
   */
  observeDOM() {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            this.bindInputsInElement(node);
          }
        });
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  /**
   * 绑定现有的输入框
   */
  bindExistingInputs() {
    this.bindInputsInElement(document);
  }

  /**
   * 在指定元素中绑定输入框
   * @param {Element} element - 要搜索的元素
   */
  bindInputsInElement(element) {
    // 查找所有可编辑的输入框
    const selectors = [
      'textarea',
      'input[type="text"]',
      'input[type="search"]',
      '[contenteditable="true"]',
      '[contenteditable=""]'
    ];

    selectors.forEach(selector => {
      const inputs = element.querySelectorAll ? element.querySelectorAll(selector) : [];
      inputs.forEach(input => {
        if (!input.dataset.fileUploaderBound) {
          this.bindInputEvents(input);
          input.dataset.fileUploaderBound = 'true';
        }
      });
    });

    // 如果element本身就是输入框
    if (element.matches && selectors.some(selector => element.matches(selector))) {
      if (!element.dataset.fileUploaderBound) {
        this.bindInputEvents(element);
        element.dataset.fileUploaderBound = 'true';
      }
    }
  }

  /**
   * 绑定输入框事件
   * @param {Element} input - 输入框元素
   */
  bindInputEvents(input) {
    // 监听键盘输入
    input.addEventListener('input', (e) => this.handleInput(e));
    input.addEventListener('keydown', (e) => this.handleKeyDown(e));
    
    // 监听焦点事件
    input.addEventListener('focus', (e) => {
      this.currentInputElement = e.target;
    });
  }

  /**
   * 处理输入事件
   * @param {Event} e - 输入事件
   */
  handleInput(e) {
    if (!this.isEnabled) return;

    const input = e.target;
    const value = this.getInputValue(input);
    const cursorPos = this.getCursorPosition(input);

    // 检查是否输入了@符号
    if (e.inputType === 'insertText' && e.data === '@') {
      this.lastAtPosition = cursorPos - 1;
      this.currentInputElement = input;
      
      // 延迟触发文件选择，避免干扰正常输入
      setTimeout(() => {
        this.triggerFileSelection(input, cursorPos - 1);
      }, 100);
    }
  }

  /**
   * 处理键盘按下事件
   * @param {Event} e - 键盘事件
   */
  handleKeyDown(e) {
    // 监听Enter键，用于发送消息时附加文件内容
    if (e.key === 'Enter' && !e.shiftKey) {
      this.handleSendMessage(e.target);
    }
  }

  /**
   * 触发文件选择
   * @param {Element} input - 输入框元素
   * @param {number} atPosition - @符号的位置
   */
  async triggerFileSelection(input, atPosition) {
    try {
      // 显示加载提示
      this.showLoadingIndicator(input, atPosition);
      
      // 选择并读取文件
      const fileData = await this.fileReader.selectAndReadFile();
      
      // 隐藏加载提示
      this.hideLoadingIndicator();
      
      // 插入文件名占位符
      this.insertFileName(input, atPosition, fileData.fileName);
      
      // 缓存文件内容
      const fileId = this.generateFileId(fileData.fileName);
      this.fileCache.set(fileId, fileData);
      
      // 显示成功提示
      this.showSuccessMessage(`文件 "${fileData.fileName}" 已准备就绪`);
      
    } catch (error) {
      this.hideLoadingIndicator();
      
      if (error.message !== '用户取消选择文件') {
        this.showErrorMessage(error.message);
      }
    }
  }

  /**
   * 插入文件名到输入框
   * @param {Element} input - 输入框元素
   * @param {number} atPosition - @符号位置
   * @param {string} fileName - 文件名
   */
  insertFileName(input, atPosition, fileName) {
    const value = this.getInputValue(input);
    const beforeAt = value.substring(0, atPosition);
    const afterAt = value.substring(atPosition + 1);
    
    const newValue = beforeAt + `@${fileName}` + afterAt;
    this.setInputValue(input, newValue);
    
    // 设置光标位置到文件名后面
    const newCursorPos = atPosition + fileName.length + 1;
    this.setCursorPosition(input, newCursorPos);
  }

  /**
   * 处理发送消息
   * @param {Element} input - 输入框元素
   */
  handleSendMessage(input) {
    const value = this.getInputValue(input);
    console.log('处理发送消息，输入内容:', value);
    
    // 查找所有@文件名引用
    const fileReferences = this.findFileReferences(value);
    console.log('找到的文件引用:', fileReferences);
    
    if (fileReferences.length > 0) {
      // 构建包含文件内容的完整消息
      let fullMessage = value;
      
      fileReferences.forEach(ref => {
        const fileData = this.fileCache.get(ref.fileId);
        if (fileData) {
          fullMessage += `\n\n[${fileData.fileName}]:\n${fileData.content}`;
          console.log(`附加文件内容: ${fileData.fileName}`);
        } else {
          console.log(`未找到文件内容: ${ref.fileName}`);
        }
      });
      
      // 更新输入框内容
      this.setInputValue(input, fullMessage);
      console.log('已更新输入框内容，包含文件内容');
      
      // 清理已使用的文件缓存
      fileReferences.forEach(ref => {
        this.fileCache.delete(ref.fileId);
      });
    } else {
      console.log('未找到文件引用，不附加文件内容');
    }
  }

  /**
   * 查找消息中的文件引用
   * @param {string} message - 消息内容
   * @returns {Array} 文件引用数组
   */
  findFileReferences(message) {
    const references = [];
    const regex = /@([^\s@]+)/g;
    let match;
    
    while ((match = regex.exec(message)) !== null) {
      const fileName = match[1];
      const fileId = this.generateFileId(fileName);
      
      if (this.fileCache.has(fileId)) {
        references.push({
          fileName: fileName,
          fileId: fileId,
          match: match[0]
        });
      }
    }
    
    return references;
  }

  /**
   * 绑定发送事件监听
   */
  bindSendEvents() {
    // 监听常见的发送按钮点击
    document.addEventListener('click', (e) => {
      const button = e.target.closest('button');
      if (button && this.isSendButton(button)) {
        const input = this.findNearbyInput(button);
        if (input) {
          this.handleSendMessage(input);
        }
      }
    });
  }

  /**
   * 判断是否为发送按钮
   * @param {Element} button - 按钮元素
   * @returns {boolean} 是否为发送按钮
   */
  isSendButton(button) {
    const text = button.textContent.toLowerCase().trim();
    const commonSendTexts = ['send', '发送', 'submit', '提交', '→', '▶'];
    
    return commonSendTexts.some(sendText => text.includes(sendText)) ||
           button.type === 'submit' ||
           button.classList.contains('send') ||
           button.classList.contains('submit');
  }

  /**
   * 查找按钮附近的输入框
   * @param {Element} button - 按钮元素
   * @returns {Element|null} 输入框元素
   */
  findNearbyInput(button) {
    // 在按钮的父容器中查找输入框
    let container = button.parentElement;
    let attempts = 0;
    
    while (container && attempts < 5) {
      const input = container.querySelector('textarea, input[type="text"], [contenteditable="true"]');
      if (input) {
        return input;
      }
      container = container.parentElement;
      attempts++;
    }
    
    return this.currentInputElement;
  }

  /**
   * 获取输入框的值
   * @param {Element} input - 输入框元素
   * @returns {string} 输入框的值
   */
  getInputValue(input) {
    if (input.contentEditable === 'true') {
      return input.textContent || input.innerText || '';
    }
    return input.value || '';
  }

  /**
   * 设置输入框的值
   * @param {Element} input - 输入框元素
   * @param {string} value - 要设置的值
   */
  setInputValue(input, value) {
    if (input.contentEditable === 'true') {
      input.textContent = value;
    } else {
      input.value = value;
    }
    
    // 触发input事件，通知页面内容已改变
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }

  /**
   * 获取光标位置
   * @param {Element} input - 输入框元素
   * @returns {number} 光标位置
   */
  getCursorPosition(input) {
    if (input.contentEditable === 'true') {
      const selection = window.getSelection();
      if (selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        return range.startOffset;
      }
      return 0;
    }
    return input.selectionStart || 0;
  }

  /**
   * 设置光标位置
   * @param {Element} input - 输入框元素
   * @param {number} position - 光标位置
   */
  setCursorPosition(input, position) {
    if (input.contentEditable === 'true') {
      const range = document.createRange();
      const selection = window.getSelection();
      
      if (input.firstChild) {
        range.setStart(input.firstChild, Math.min(position, input.textContent.length));
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
      }
    } else {
      input.setSelectionRange(position, position);
    }
  }

  /**
   * 生成文件ID
   * @param {string} fileName - 文件名
   * @returns {string} 文件ID
   */
  generateFileId(fileName) {
    return `file_${Date.now()}_${fileName}`;
  }

  /**
   * 显示加载指示器
   * @param {Element} input - 输入框元素
   * @param {number} position - 位置
   */
  showLoadingIndicator(input, position) {
    // 简单的加载提示实现
    console.log('正在选择文件...');
  }

  /**
   * 隐藏加载指示器
   */
  hideLoadingIndicator() {
    console.log('文件选择完成');
  }

  /**
   * 显示成功消息
   * @param {string} message - 消息内容
   */
  showSuccessMessage(message) {
    console.log('✅', message);
    this.showToast(message, 'success');
  }

  /**
   * 显示错误消息
   * @param {string} message - 错误消息
   */
  showErrorMessage(message) {
    console.error('❌', message);
    this.showToast(message, 'error');
  }

  /**
   * 显示Toast提示
   * @param {string} message - 消息内容
   * @param {string} type - 消息类型 (success|error|info)
   */
  showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `file-uploader-toast file-uploader-toast-${type}`;
    toast.textContent = message;
    
    document.body.appendChild(toast);
    
    // 显示动画
    setTimeout(() => toast.classList.add('show'), 100);
    
    // 自动隐藏
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => document.body.removeChild(toast), 300);
    }, 3000);
  }
}

// 初始化插件
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new FileUploaderContent();
  });
} else {
  new FileUploaderContent();
}
