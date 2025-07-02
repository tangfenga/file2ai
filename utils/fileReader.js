/**
 * 文件读取工具类
 * 负责处理文件选择、读取和验证
 */
class FileReaderUtil {
  constructor() {
    // 支持的文件类型
    this.supportedTypes = ['.txt', '.md', '.json', '.csv', '.js', '.ts', '.html', '.css', '.xml', '.yaml', '.yml'];
    // 文件大小限制 (1MB)
    this.maxFileSize = 1024 * 1024;
  }

  /**
   * 创建文件选择器
   * @returns {HTMLInputElement} 文件输入元素
   */
  createFileInput() {
    const input = document.createElement('input');
    input.type = 'file';
    input.style.display = 'none';
    input.accept = this.supportedTypes.join(',');
    return input;
  }

  /**
   * 验证文件是否符合要求
   * @param {File} file - 要验证的文件
   * @returns {Object} 验证结果 {valid: boolean, error: string}
   */
  validateFile(file) {
    // 检查文件大小
    if (file.size > this.maxFileSize) {
      return {
        valid: false,
        error: `文件大小超过限制 (${(this.maxFileSize / 1024 / 1024).toFixed(1)}MB)`
      };
    }

    // 检查文件类型
    const fileName = file.name.toLowerCase();
    const isSupported = this.supportedTypes.some(type => fileName.endsWith(type));
    
    if (!isSupported) {
      return {
        valid: false,
        error: `不支持的文件类型。支持的格式: ${this.supportedTypes.join(', ')}`
      };
    }

    return { valid: true, error: null };
  }

  /**
   * 读取文件内容
   * @param {File} file - 要读取的文件
   * @returns {Promise<string>} 文件内容
   */
  readFileContent(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          let content = e.target.result;
          
          // 对于JSON文件，尝试格式化
          if (file.name.toLowerCase().endsWith('.json')) {
            try {
              const parsed = JSON.parse(content);
              content = JSON.stringify(parsed, null, 2);
            } catch (jsonError) {
              // 如果JSON解析失败，保持原内容
              console.warn('JSON格式化失败，使用原始内容:', jsonError);
            }
          }
          
          resolve(content);
        } catch (error) {
          reject(new Error(`文件读取失败: ${error.message}`));
        }
      };
      
      reader.onerror = () => {
        reject(new Error('文件读取失败'));
      };
      
      // 以文本形式读取文件
      reader.readAsText(file, 'UTF-8');
    });
  }

  /**
   * 选择并读取文件
   * @returns {Promise<Object>} 包含文件名和内容的对象 {fileName: string, content: string}
   */
  selectAndReadFile() {
    return new Promise((resolve, reject) => {
      const input = this.createFileInput();
      
      input.onchange = async (e) => {
        try {
          const file = e.target.files[0];
          if (!file) {
            reject(new Error('未选择文件'));
            return;
          }

          // 验证文件
          const validation = this.validateFile(file);
          if (!validation.valid) {
            reject(new Error(validation.error));
            return;
          }

          // 读取文件内容
          const content = await this.readFileContent(file);
          
          resolve({
            fileName: file.name,
            content: content,
            size: file.size
          });
        } catch (error) {
          reject(error);
        } finally {
          // 清理DOM
          document.body.removeChild(input);
        }
      };

      input.oncancel = () => {
        document.body.removeChild(input);
        reject(new Error('用户取消选择文件'));
      };

      // 添加到DOM并触发点击
      document.body.appendChild(input);
      input.click();
    });
  }

  /**
   * 格式化文件大小显示
   * @param {number} bytes - 字节数
   * @returns {string} 格式化后的大小字符串
   */
  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

// 导出工具类实例
window.FileReaderUtil = FileReaderUtil;
