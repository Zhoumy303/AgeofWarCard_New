/**
 * 纪元战争存档加密系统
 * 多层加密保护，防止轻易破解
 */

class SaveSystem {
    constructor() {
        // 加密密钥（多层）
        this.primaryKey = this.generateKey('纪元战争2024');
        this.secondaryKey = this.generateKey('SaveSystemV2');
        this.tertiaryKey = this.generateKey('AntiCheat');
        
        // 混淆参数
        this.salt = this.generateSalt();
        this.version = '2.1.0';
        
        // 验证参数
        this.checksumKey = this.generateKey('IntegrityCheck');
    }

    /**
     * 生成加密密钥
     */
    generateKey(seed) {
        let hash = 0;
        for (let i = 0; i < seed.length; i++) {
            const char = seed.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // 转换为32位整数
        }
        return Math.abs(hash).toString(16);
    }

    /**
     * 生成随机盐值
     */
    generateSalt() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        for (let i = 0; i < 16; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }

    /**
     * 基础字符串加密
     */
    encryptString(str, key) {
        let result = '';
        for (let i = 0; i < str.length; i++) {
            const charCode = str.charCodeAt(i);
            const keyChar = key.charCodeAt(i % key.length);
            const encrypted = charCode ^ keyChar;
            result += String.fromCharCode(encrypted);
        }
        return result;
    }

    /**
     * 基础字符串解密
     */
    decryptString(str, key) {
        return this.encryptString(str, key); // XOR操作是对称的
    }

    /**
     * Base64编码（自定义字符表）
     */
    customBase64Encode(str) {
        // XOR处理的是UTF-16码元，必须保留两个字节以及标准Base64填充。
        let bytes = '';
        for (let i = 0; i < str.length; i++) {
            const code = str.charCodeAt(i);
            bytes += String.fromCharCode(code >> 8, code & 255);
        }
        return btoa(bytes);
    }

    /**
     * Base64解码（自定义字符表）
     */
    customBase64Decode(str, encoding) {
        if (encoding === 'utf16') {
            const bytes = atob(str);
            let result = '';
            for (let i = 0; i < bytes.length; i += 2) {
                result += String.fromCharCode((bytes.charCodeAt(i) << 8) | bytes.charCodeAt(i + 1));
            }
            return result;
        }
        const customChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
        let result = '';
        let i = 0;
        
        while (i < str.length) {
            const a = customChars.indexOf(str.charAt(i++));
            const b = customChars.indexOf(str.charAt(i++));
            const c = customChars.indexOf(str.charAt(i++));
            const d = customChars.indexOf(str.charAt(i++));
            
            const byte1 = (a << 2) | (b >> 4);
            const byte2 = ((b & 15) << 4) | (c >> 2);
            const byte3 = ((c & 3) << 6) | d;
            
            result += String.fromCharCode(byte1);
            if (c !== -1) result += String.fromCharCode(byte2);
            if (d !== -1) result += String.fromCharCode(byte3);
        }
        
        return result;
    }

    /**
     * 生成数据校验和
     */
    generateChecksum(data) {
        let checksum = 0;
        const dataStr = JSON.stringify(data);
        for (let i = 0; i < dataStr.length; i++) {
            checksum = ((checksum << 5) - checksum + dataStr.charCodeAt(i)) & 0xFFFFFFFF;
        }
        return checksum.toString(16);
    }

    /**
     * 数据混淆
     */
    obfuscateData(data) {
        const dataStr = JSON.stringify(data);
        const timestamp = Date.now().toString();
        const randomId = Math.random().toString(36).substring(2, 15);
        
        // 添加虚假数据
        const fakeData = {
            _timestamp: timestamp,
            _randomId: randomId,
            _version: this.version,
            _checksum: this.generateChecksum(data),
            _data: dataStr
        };
        
        return fakeData;
    }

    /**
     * 数据反混淆
     */
    deobfuscateData(obfuscatedData) {
        if (!obfuscatedData._data) {
            throw new Error('无效的存档数据格式');
        }
        
        // 验证校验和
        const expectedChecksum = obfuscatedData._checksum;
        const actualChecksum = this.generateChecksum(JSON.parse(obfuscatedData._data));
        
        if (expectedChecksum !== actualChecksum) {
            throw new Error('存档数据完整性验证失败');
        }
        
        return JSON.parse(obfuscatedData._data);
    }

    /**
     * 多层加密
     */
    encrypt(data) {
        try {
            // 第一层：数据混淆
            const obfuscated = this.obfuscateData(data);
            const obfuscatedStr = JSON.stringify(obfuscated);
            
            // 第二层：基础加密
            const encrypted1 = this.encryptString(obfuscatedStr, this.primaryKey);
            
            // 第三层：再次加密
            const encrypted2 = this.encryptString(encrypted1, this.secondaryKey);
            
            // 第四层：最终加密
            const encrypted3 = this.encryptString(encrypted2, this.tertiaryKey);
            
            // 第五层：Base64编码
            const base64Encoded = this.customBase64Encode(encrypted3);
            
            // 第六层：添加盐值和版本信息
            const finalData = {
                v: this.version,
                encoding: 'utf16',
                s: this.salt,
                d: base64Encoded,
                t: Date.now()
            };
            
            return JSON.stringify(finalData);
        } catch (error) {
            console.error('加密失败:', error);
            throw new Error('存档加密失败');
        }
    }

    /**
     * 多层解密
     */
    decrypt(encryptedData) {
        try {
            // 解析外层结构
            const parsed = JSON.parse(encryptedData);
            
            // 验证版本
            if (parsed.v !== this.version) {
                throw new Error('存档版本不兼容');
            }
            
            // 第一层：移除外层结构
            const base64Data = parsed.d;
            
            // 第二层：Base64解码
            const decoded = this.customBase64Decode(base64Data, parsed.encoding);
            
            // 第三层：解密
            const decrypted1 = this.decryptString(decoded, this.tertiaryKey);
            
            // 第四层：再次解密
            const decrypted2 = this.decryptString(decrypted1, this.secondaryKey);
            
            // 第五层：最终解密
            const decrypted3 = this.decryptString(decrypted2, this.primaryKey);
            
            // 第六层：反混淆
            // 旧版会在末尾补入多余字节，保留能够通过校验的旧存档。
            const json = parsed.encoding ? decrypted3 : decrypted3.slice(0, decrypted3.lastIndexOf('}') + 1);
            const deobfuscated = this.deobfuscateData(JSON.parse(json));
            
            return deobfuscated;
        } catch (error) {
            console.error('解密失败:', error);
            throw new Error('存档解密失败');
        }
    }

    /**
     * 保存数据到localStorage
     */
    saveData(key, data) {
        try {
            const encrypted = this.encrypt(data);
            localStorage.setItem(key, encrypted);
            console.log(`数据已加密保存: ${key}`);
            return true;
        } catch (error) {
            console.error('保存数据失败:', error);
            return false;
        }
    }

    /**
     * 从localStorage加载数据
     */
    loadData(key) {
        try {
            const encrypted = localStorage.getItem(key);
            if (!encrypted) {
                return null;
            }
            
            const decrypted = this.decrypt(encrypted);
            console.log(`数据已解密加载: ${key}`);
            return decrypted;
        } catch (error) {
            console.error('加载数据失败:', error);
            return null;
        }
    }

    /**
     * 删除数据
     */
    deleteData(key) {
        try {
            localStorage.removeItem(key);
            console.log(`数据已删除: ${key}`);
            return true;
        } catch (error) {
            console.error('删除数据失败:', error);
            return false;
        }
    }

    /**
     * 验证存档完整性
     */
    validateData(key) {
        try {
            const encrypted = localStorage.getItem(key);
            if (!encrypted) {
                return false;
            }
            
            this.decrypt(encrypted);
            return true;
        } catch (error) {
            console.error('存档验证失败:', error);
            return false;
        }
    }

    /**
     * 导出存档数据（用于备份）
     */
    exportData(key) {
        try {
            const encrypted = localStorage.getItem(key);
            if (!encrypted) {
                return null;
            }
            
            const exportData = {
                key: key,
                data: encrypted,
                timestamp: Date.now(),
                version: this.version
            };
            
            return JSON.stringify(exportData);
        } catch (error) {
            console.error('导出数据失败:', error);
            return null;
        }
    }

    /**
     * 导入存档数据（从备份恢复）
     */
    importData(importStr) {
        try {
            const importData = JSON.parse(importStr);
            
            // 验证导入数据格式
            if (!importData.key || !importData.data) {
                throw new Error('无效的导入数据格式');
            }
            
            // 验证数据完整性
            this.decrypt(importData.data);
            
            // 保存到localStorage
            localStorage.setItem(importData.key, importData.data);
            console.log(`数据已导入: ${importData.key}`);
            return true;
        } catch (error) {
            console.error('导入数据失败:', error);
            return false;
        }
    }
}

// 创建全局实例
window.saveSystem = new SaveSystem();
