var Logger = require('./logger.js');

var logger = new Logger();
logger.setLogView(ui.logContent);
logger.setLogLevel('INFO');

function SimpleUtils() {
    this.deviceInfo = this.getDeviceInfo();
}

SimpleUtils.prototype.sleep = function(ms) {
    return new Promise(function(resolve) {
        setTimeout(resolve, ms);
    });
};

/**
 * 非阻塞方式查找元素
 * 使用线程来执行阻塞操作，避免在UI线程中执行
 */
SimpleUtils.prototype.findElement = function(selector, timeout) {
    var self = this;
    timeout = timeout || 5000;

    return new Promise(function(resolve) {
        // 在新线程中执行查找操作
        threads.start(function() {
            var startTime = Date.now();
            var element = null;
            
            while (Date.now() - startTime < timeout && !element) {
                try {
                    if (selector.startsWith('text(')) {
                        var str = selector.match(/text\("([^"]+)"\)/)[1];
                        element = text(str).findOne(100);
                        logger.log("text(\"" + str + "\"): ", element);
                    } else if (selector.startsWith('desc(')) {
                        var str = selector.match(/desc\("([^"]+)"\)/)[1];
                        element = desc(str).findOne(100);
                    } else if (selector.startsWith('id(')) {
                        var id = selector.match(/id\("([^"]+)"\)/)[1];
                        element = id(id).find0ne(100);
                    } else if (selector.includes('&&')) {
                        //复合选择器
                        var conditions = selector.split('&&').map(function(s) { return s.trim(); });
                        element = self.findElementWithConditions(conditions, 100);
                    } else {
                        //默认按文本查找
                        element = text(selector).findOne(100);
                    }
                    
                    if (element) {
                        resolve(element);
                        return;
                    }
                } catch (e) {
                    // 忽略查找过程中的异常，继续重试
                    console.verbose("查找元素异常: " + e);
                }
                
                // 短暂延迟后继续查找
                sleep(200);
            }

            // 超时仍未找到元素
            resolve(null);
        });
    });
};

/**
 * 使用条件查找元素（同样需要在子线程中执行）
 */
SimpleUtils.prototype.findElementWithConditions = function(conditions, timeout) {
    return new Promise(function(resolve) {
        threads.start(function() {
            var query = null;
            
            for (var i = 0; i < conditions.length; i++) {
                var condition = conditions[i];
                var currentQuery = null;
                
                if (condition.startsWith('text(')) {
                    var str = condition.match(/text\("([^"]+)"\)/)[1];
                    currentQuery = text(str);
                } else if (condition.startsWith('desc(')) {
                    var str = condition.match(/desc\("([^"]+)"\)/)[1];
                    currentQuery = desc(str);
                } else if (condition.startsWith('id(')) {
                    var str = condition.match(/id\("([^"]+)"\)/)[1];
                    currentQuery = id(str);
                } else if (condition === 'clickable(true)') {
                    currentQuery = clickable(true);
                } else if (condition === 'clickable(false)') {
                    currentQuery = clickable(false);
                }
                
                if (currentQuery) {
                    if (query === null) {
                        query = currentQuery;
                    } else {
                        query = query.filter(currentQuery);
                    }
                }
            }
            
            var element = query ? query.findOne(timeout || 1000) : null;
            resolve(element);
        });
    });
};

/**
 * 等待元素出现（非阻塞版本）
 */
SimpleUtils.prototype.waitForElement = function(selector, timeout) {
    var self = this;
    timeout = timeout || 10000;
    
    return new Promise(function(resolve, reject) {
        threads.start(function() {
            var startTime = Date.now();
            
            function checkElement() {
                if (Date.now() - startTime >= timeout) {
                    reject(new Error("等待元素超时: " + selector));
                    return;
                }
                
                self.findElement(selector, 1000).then(function(element) {
                    if (element) {
                        resolve(element);
                    } else {
                        // 继续等待
                        setTimeout(checkElement, 500);
                    }
                });
            }
            
            checkElement();
        });
    });
};

/**
 * 延迟函数
 */
SimpleUtils.prototype.sleep = function(ms) {
    return new Promise(function(resolve) {
        setTimeout(resolve, ms);
    });
};

/**
 * 获取设备信息
 */
SimpleUtils.prototype.getDeviceInfo = function() {
    return {
        width: device.width,
        height: device.height,
        brand: device.brand,
        model: device.model,
        sdk: device.sdkInt,
        androidVersion: device.release
    };
};

/**
 * 格式化时间
 */
SimpleUtils.prototype.formatTime = function(timestamp) {
    return new Date(timestamp).toLocaleString();
};

/**
 * 格式化时长
 */
SimpleUtils.prototype.formatDuration = function(ms) {
    var seconds = Math.floor(ms / 1000);
    var minutes = Math.floor(seconds / 60);
    var hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
        return hours + "h " + (minutes % 60) + "m " + (seconds % 60) + "s";
    } else if (minutes > 0) {
        return minutes + "m " + (seconds % 60) + "s";
    } else {
        return seconds + "s";
    }
};

/**
 * 随机延迟
 */
SimpleUtils.prototype.randomDelay = function(min, max) {
    var delay = Math.random() * (max - min) + min;
    return this.sleep(delay);
};

/**
 * 检查应用是否安装
 */
SimpleUtils.prototype.isAppInstalled = function(packageName) {
    try {
        var pm = context.getPackageManager();
        var info = pm.getPackageInfo(packageName, 0);
        return info !== null;
    } catch (e) {
        return false;
    }
};

/**
 * 截图
 */
SimpleUtils.prototype.takeScreenshot = function(path) {
    return new Promise(function(resolve) {
        threads.start(function() {
            try {
                if (!path) {
                    var timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                    path = "/sdcard/Pictures/autosign_" + timestamp + ".png";
                }
                
                var result = captureScreen(path);
                resolve(result ? path : null);
            } catch (e) {
                console.error("截图失败:", e);
                resolve(null);
            }
        });
    });
};

/**
 * 坐标转换（针对不同分辨率）
 */
SimpleUtils.prototype.adaptCoordinate = function(x, y) {
    var baseWidth = 1080;
    var baseHeight = 1920;
    
    return {
        x: Math.floor(x * this.deviceInfo.width / baseWidth),
        y: Math.floor(y * this.deviceInfo.height / baseHeight)
    };
};

/**
 * 日志记录辅助
 */
SimpleUtils.prototype.logObject = function(obj, prefix) {
    prefix = prefix || "";
    
    if (typeof obj !== 'object') {
        return String(obj);
    }
    
    var entries = Object.entries(obj);
    if (entries.length === 0) {
        return "{}";
    }
    
    return entries.map(function(entry) {
        var key = entry[0];
        var value = entry[1];
        var formattedValue = typeof value === 'object' ? 
            this.logObject(value, prefix + "  ") : 
            String(value);
        return prefix + key + ": " + formattedValue;
    }).join('\n');
};

module.exports = SimpleUtils;