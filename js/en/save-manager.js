/**
 * Save Manager界面
 * 提供加密存档的导入导出和管理功能
 */

class SaveManager {
    constructor() {
        this.createUI();
        this.bindEvents();
    }

    createUI() {
        // 创建Save Manager面板
        const saveManagerHTML = `
            <div id="save-manager-modal" style="display:none;position:fixed;left:0;top:0;width:100vw;height:100vh;background:rgba(24,28,42,0.98);z-index:5000;align-items:center;justify-content:center;">
                <div style="background:#23263a;padding:48px 64px;border-radius:24px;min-width:600px;max-width:90vw;max-height:80vh;overflow:auto;box-shadow:0 8px 48px #000b;color:#fff;">
                    <div style="font-size:2em;font-weight:bold;margin-bottom:32px;text-align:center;">Save Manager</div>
                    
                    <div style="margin-bottom:32px;">
                        <h3 style="margin-bottom:16px;">Save Status</h3>
                        <div id="save-status" style="background:#1a1d2a;padding:16px;border-radius:12px;font-family:monospace;font-size:0.9em;">
                            Checking save status...
                        </div>
                    </div>
                    
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-bottom:32px;">
                        <div>
                            <h3 style="margin-bottom:16px;">Export Save</h3>
                            <div style="background:#1a1d2a;padding:16px;border-radius:12px;">
                                <div style="margin-bottom:12px;">
                                    <label style="display:block;margin-bottom:8px;">Save type:</label>
                                    <select id="export-save-type" style="width:100%;padding:8px;background:#2a2d3a;border:1px solid #4af;border-radius:6px;color:#fff;">
                                        <option value="aiLearningData">AI Learning Data</option>
                                        <option value="gameProgress">Game Progress</option>
                                        <option value="settings">Game Settings</option>
                                    </select>
                                </div>
                                <button id="btn-export-save" style="width:100%;padding:12px;background:#4af;color:#fff;border:none;border-radius:8px;cursor:pointer;">Export Save</button>
                            </div>
                        </div>
                        
                        <div>
                            <h3 style="margin-bottom:16px;">Import Save</h3>
                            <div style="background:#1a1d2a;padding:16px;border-radius:12px;">
                                <div style="margin-bottom:12px;">
                                    <label style="display:block;margin-bottom:8px;">Choose a save file:</label>
                                    <input type="file" id="import-save-file" accept=".json" style="width:100%;padding:8px;background:#2a2d3a;border:1px solid #4af;border-radius:6px;color:#fff;">
                                </div>
                                <button id="btn-import-save" style="width:100%;padding:12px;background:#4af;color:#fff;border:none;border-radius:8px;cursor:pointer;">Import Save</button>
                            </div>
                        </div>
                    </div>
                    
                    <div style="margin-bottom:32px;">
                        <h3 style="margin-bottom:16px;">Save Actions</h3>
                        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
                            <button id="btn-validate-saves" style="padding:12px;background:#2a2d3a;color:#fff;border:1px solid #4af;border-radius:8px;cursor:pointer;">Validate Saves</button>
                            <button id="btn-clear-all-saves" style="padding:12px;background:#d44;color:#fff;border:none;border-radius:8px;cursor:pointer;">Clear All English Saves</button>
                        </div>
                    </div>
                    
                    <div style="text-align:center;">
                        <button id="btn-close-save-manager" style="padding:14px 48px;font-size:1.2em;background:#666;color:#fff;border:none;border-radius:12px;cursor:pointer;">Close</button>
                    </div>
                </div>
            </div>
        `;
        
        // 添加到页面
        document.body.insertAdjacentHTML('beforeend', saveManagerHTML);
    }

    bindEvents() {
        // 绑定事件
        document.getElementById('btn-close-save-manager').addEventListener('click', () => {
            this.hide();
        });

        document.getElementById('btn-export-save').addEventListener('click', () => {
            this.exportSave();
        });

        document.getElementById('btn-import-save').addEventListener('click', () => {
            this.importSave();
        });

        document.getElementById('btn-validate-saves').addEventListener('click', () => {
            this.validateSaves();
        });

        document.getElementById('btn-clear-all-saves').addEventListener('click', () => {
            this.clearAllSaves();
        });

        // 文件选择事件
        document.getElementById('import-save-file').addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this.handleFileSelect(e.target.files[0]);
            }
        });
    }

    show() {
        document.getElementById('save-manager-modal').style.display = 'flex';
        this.updateSaveStatus();
    }

    hide() {
        document.getElementById('save-manager-modal').style.display = 'none';
    }

    updateSaveStatus() {
        const statusDiv = document.getElementById('save-status');
        const saveKeys = ['aiLearningData', 'gameProgress', 'settings'];
        let statusHTML = '';

        saveKeys.forEach(key => {
            const isValid = window.saveSystem.validateData(key);
            const status = isValid ? '✅ Valid' : '❌ Invalid or missing';
            statusHTML += `<div>${key}: ${status}</div>`;
        });

        statusDiv.innerHTML = statusHTML;
    }

    exportSave() {
        const saveType = document.getElementById('export-save-type').value;
        
        try {
            const exportData = window.saveSystem.exportData(saveType);
            if (!exportData) {
                alert('No save data found for this type.');
                return;
            }

            // 创建下载链接
            const blob = new Blob([exportData], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${saveType}-backup-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            alert('Save exported successfully.');
        } catch (error) {
            console.error('Failed to export save:', error);
            alert('Failed to export save: ' + error.message);
        }
    }

    importSave() {
        const fileInput = document.getElementById('import-save-file');
        if (fileInput.files.length === 0) {
            alert('Choose a save file first.');
            return;
        }

        const file = fileInput.files[0];
        this.handleFileSelect(file);
    }

    handleFileSelect(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const importData = e.target.result;
                const success = window.saveSystem.importData(importData);
                
                if (success) {
                    alert('Save imported successfully.');
                    this.updateSaveStatus();
                    if (typeof updateContinueButton === 'function') updateContinueButton();
                } else {
                    alert('Save import failed. Check the file format.');
                }
            } catch (error) {
                console.error('Failed to import save:', error);
                alert('Failed to import save: ' + error.message);
            }
        };
        reader.readAsText(file);
    }

    validateSaves() {
        const saveKeys = ['aiLearningData', 'gameProgress', 'settings'];
        let validCount = 0;
        let totalCount = 0;

        saveKeys.forEach(key => {
            totalCount++;
            if (window.saveSystem.validateData(key)) {
                validCount++;
            }
        });

        alert(`Save validation complete.\nValid saves: ${validCount}/${totalCount}`);
        this.updateSaveStatus();
    }

    clearAllSaves() {
        if (confirm('Clear all English-version saves? This cannot be undone. Chinese-version saves are not affected.')) {
            const saveKeys = ['aiLearningData', 'gameProgress', 'settings'];
            
            saveKeys.forEach(key => {
                window.saveSystem.deleteData(key);
            });

            alert('All English-version saves cleared.');
            this.updateSaveStatus();
            if (typeof updateContinueButton === 'function') updateContinueButton();
        }
    }
}

// 创建全局实例
window.saveManager = new SaveManager();
