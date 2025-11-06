function AppConfig() {
    this.tasks = this.loadTasks();
    this.loadSettings();
}

AppConfig.prototype.loadTasks = function() {
    // 这里可以改为从文件加载配置
    return [
        {
            id: 1,
            name: "示例论坛",
            packageName: "com.example.bbs",
            enabled: true,
            description: "论坛每日签到任务",
            config: {
                launchTimeout: 5000,
                steps: [
                    { 
                        action: "launch", 
                        description: "启动应用",
                        params: { timeout: 5000 }
                    },
                    { 
                        action: "wait_click", 
                        description: "点击签到按钮",
                        params: { selector: 'text("签到").clickable(true)', timeout: 8000 }
                    },
                    { 
                        action: "wait_click", 
                        description: "点击立即签到",
                        params: { selector: 'text("立即签到")', timeout: 5000 }
                    },
                    { 
                        action: "screenshot", 
                        description: "保存签到结果截图",
                        params: { path: "/sdcard/Pictures/sign_bbs_{{timestamp}}.png" }
                    },
                    { 
                        action: "back", 
                        description: "返回退出",
                        params: { }
                    }
                ]
            }
        },
        {
            id: 2,
            name: "示例商城",
            packageName: "com.example.shop",
            enabled: true,
            description: "商城每日任务领取",
            config: {
                launchTimeout: 6000,
                steps: [
                    { 
                        action: "launch", 
                        description: "启动商城应用",
                        params: { timeout: 6000 }
                    },
                    { 
                        action: "wait_click", 
                        description: "进入任务中心",
                        params: { selector: 'desc("任务中心")', timeout: 8000 }
                    },
                    { 
                        action: "click", 
                        description: "领取每日奖励",
                        params: { selector: 'text("领取") && clickable(true)', timeout: 5000 }
                    },
                    { 
                        action: "swipe", 
                        description: "滑动查看其他任务",
                        params: { start: [500, 1500], end: [500, 500], duration: 800 }
                    },
                    { 
                        action: "click", 
                        description: "领取额外奖励",
                        params: { selector: 'text("立即领取")', timeout: 5000 }
                    }
                ]
            }
        },
        {
            id: 3,
            name: "新闻App",
            packageName: "com.example.news",
            enabled: false,
            description: "新闻阅读奖励任务",
            config: {
                launchTimeout: 5000,
                steps: [
                    { 
                        action: "launch", 
                        description: "启动新闻应用",
                        params: { timeout: 5000 }
                    },
                    { 
                        action: "click", 
                        description: "点击我的页面",
                        params: { selector: 'text("我的")', timeout: 5000 }
                    },
                    { 
                        action: "click", 
                        description: "领取阅读奖励",
                        params: { selector: 'text("领取金币")', timeout: 5000 }
                    },
                    { 
                        action: "swipe_up", 
                        description: "滑动阅读文章",
                        params: { count: 5, duration: 1000 }
                    }
                ]
            }
        },
        // 测试任务
        {
            id: 99,
            name: "自动化测试任务",
            packageName: "com.android.settings", // 使用系统设置应用进行测试
            enabled: true,
            description: "用于测试引擎和工具模块的功能",
            config: {
                steps: [
                    { 
                        action: "launch", 
                        description: "启动设置应用",
                        params: { timeout: 3000 }
                    },
                    { 
                        action: "wait_exists", 
                        description: "检查设置界面",
                        params: { selector: 'text("设置") || text("Settings")', timeout: 5000 }
                    },
                    { 
                        action: "click", 
                        description: "点击搜索框",
                        params: { selector: 'text("搜索") || desc("搜索")', timeout: 3000 }
                    }
                ]
            }
        }
    ];
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