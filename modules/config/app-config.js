// 引入任务文件
var createLongforTask = require('../task/longfor-task.js');

function AppConfig() {
    this.tasks = this.loadTasks();
    this.loadSettings();
}

AppConfig.prototype.loadTasks = function() {
    // 从独立文件加载任务配置，实现更好的解耦
    var tasks = [];
    
    try {
        // 添加龙湖签到任务
        var longforTask = createLongforTask();
        tasks.push(longforTask);
        
        // 可以在这里添加更多任务
        
    } catch (e) {
        console.error("加载任务配置失败:", e);
    }
    
    return tasks;
};

AppConfig.prototype.loadSettings = function() {
    this.settings = {
        globalTimeout: 300000, // 5分钟全局超时
        betweenTaskDelay: 3000, // 任务间延迟3秒
        stepDelay: 1000, // 步骤间延迟1秒
        enableScreenshot: true,
        saveLogs: true,
        maxRetryCount: 3
    };
};

AppConfig.prototype.getActiveTasks = function() {
    return this.tasks.filter(function(task) { return task.enabled; });
};

AppConfig.prototype.getTaskById = function(id) {
    for (var i = 0; i < this.tasks.length; i++) {
        if (this.tasks[i].id === id) {
            return this.tasks[i];
        }
    }
    return null;
};

AppConfig.prototype.toggleTask = function(id) {
    var task = this.getTaskById(id);
    if (task) {
        task.enabled = !task.enabled;
        return true;
    }
    return false;
};

AppConfig.prototype.updateTaskConfig = function(id, newConfig) {
    var task = this.getTaskById(id);
    if (task) {
        for (var key in newConfig) {
            if (newConfig.hasOwnProperty(key)) {
                task.config[key] = newConfig[key];
            }
        }
        this.saveConfig();
        return true;
    }
    return false;
};

AppConfig.prototype.addTask = function(newTask) {
    var maxId = 0;
    for (var i = 0; i < this.tasks.length; i++) {
        if (this.tasks[i].id > maxId) {
            maxId = this.tasks[i].id;
        }
    }
    newTask.id = maxId + 1;
    this.tasks.push(newTask);
    this.saveConfig();
    return newTask.id;
};

AppConfig.prototype.removeTask = function(id) {
    for (var i = 0; i < this.tasks.length; i++) {
        if (this.tasks[i].id === id) {
            this.tasks.splice(i, 1);
            this.saveConfig();
            return true;
        }
    }
    return false;
};

AppConfig.prototype.saveConfig = function() {
    // 这里可以实现保存配置到文件
    try {
        var configPath = files.join(files.getSdcardPath(), "AutoSign/config.json");
        files.ensureDir(configPath);
        files.write(configPath, JSON.stringify({
            tasks: this.tasks,
            settings: this.settings
        }, null, 2));
        return true;
    } catch (error) {
        console.error("保存配置失败:", error);
        return false;
    }
};

AppConfig.prototype.loadConfigFromFile = function() {
    try {
        var configPath = files.join(files.getSdcardPath(), "AutoSign/config.json");
        if (files.exists(configPath)) {
            var configData = JSON.parse(files.read(configPath));
            this.tasks = configData.tasks || this.tasks;
            this.settings = configData.settings || this.settings;
            return true;
        }
    } catch (error) {
        console.error("加载配置失败:", error);
    }
    return false;
};

AppConfig.prototype.getSettings = function() {
    return this.settings;
};

AppConfig.prototype.updateSettings = function(newSettings) {
    for (var key in newSettings) {
        if (newSettings.hasOwnProperty(key)) {
            this.settings[key] = newSettings[key];
        }
    }
    this.saveConfig();
};

module.exports = AppConfig;