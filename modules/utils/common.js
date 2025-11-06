// modules/utils/common.js
function CommonUtils() {
    this.deviceInfo = this.getDeviceInfo();
}

CommonUtils.prototype.sleep = function(ms) {
    return new Promise(function(resolve) {
        setTimeout(resolve, ms);
    });
};

CommonUtils.prototype.findElement = function(selector, timeout) {
    var self = this;
    timeout = timeout || 5000;
    
    return new Promise(function(resolve) {
        var startTime = Date.now();
        
        function search() {
            if (Date.now() - startTime >= timeout) {
                resolve(null);
                return;
            }
            
            try {
                var element = null;
                
                // 根据选择器类型查找元素
                if (selector.startsWith('text(')) {
                    var text = selector.match(/text\("([^"]+)"\)/)[1];
                    element = text(text).findOne(100);
                } else if (selector.startsWith('desc(')) {
                    var desc = selector.match(/desc\("([^"]+)"\)/)[1];
                    element = desc(desc).findOne(100);
                } else if (selector.startsWith('id(')) {
                    var id = selector.match(/id\("([^"]+)"\)/)[1];
                    element = id(id).findOne(100);
                } else if (selector.includes('&&')) {
                    // 复合选择器
                    var conditions = selector.split('&&').map(function(s) { return s.trim(); });
                    element = self.findElementWithConditions(conditions, 100);
                } else {
                    // 默认按文本查找
                    element = text(selector).findOne(100);
                }
                
                if (element) {
                    resolve(element);
                } else {
                    setTimeout(search, 200);
                }
            } catch (e) {
                // 忽略查找过程中的异常，继续重试
                setTimeout(search, 200);
            }
        }
        
        search();
    });
};

CommonUtils.prototype.findElementWithConditions = function(conditions, timeout) {
    timeout = timeout || 1000;
    
    var query = null;
    
    for (var i = 0; i < conditions.length; i++) {
        var condition = conditions[i];
        var currentQuery = null;
        
        if (condition.startsWith('text(')) {
            var text = condition.match(/text\("([^"]+)"\)/)[1];
            currentQuery = text(text);
        } else if (condition.startsWith('desc(')) {
            var desc = condition.match(/desc\("([^"]+)"\)/)[1];
            currentQuery = desc(desc);
        } else if (condition.startsWith('id(')) {
            var id = condition.match(/id\("([^"]+)"\)/)[1];
            currentQuery = id(id);
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
    
    return query ? query.findOne(timeout) : null;
};

CommonUtils.prototype.getDeviceInfo = function() {
    return {
        width: device.width,
        height: device.height,
        brand: device.brand,
        model: device.model,
        sdk: device.sdkInt,
        androidVersion: device.release
    };
};

CommonUtils.prototype.formatTime = function(timestamp) {
    return new Date(timestamp).toLocaleString();
};

CommonUtils.prototype.formatDuration = function(ms) {
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

CommonUtils.prototype.randomDelay = function(min, max) {
    var delay = Math.random() * (max - min) + min;
    return this.sleep(delay);
};

CommonUtils.prototype.isAppInstalled = function(packageName) {
    try {
        var pm = context.getPackageManager();
        var info = pm.getPackageInfo(packageName, 0);
        return info !== null;
    } catch (e) {
        return false;
    }
};

CommonUtils.prototype.takeScreenshot = function(path) {
    try {
        if (!path) {
            var timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            path = "/sdcard/Pictures/autosign_" + timestamp + ".png";
        }
        
        var result = captureScreen(path);
        return result ? path : null;
    } catch (e) {
        console.error("截图失败:", e);
        return null;
    }
};

CommonUtils.prototype.hexToRgb = function(hex) {
    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
};

CommonUtils.prototype.adaptCoordinate = function(x, y) {
    var baseWidth = 1080;
    var baseHeight = 1920;
    
    return {
        x: Math.floor(x * this.deviceInfo.width / baseWidth),
        y: Math.floor(y * this.deviceInfo.height / baseHeight)
    };
};

CommonUtils.prototype.logObject = function(obj, prefix) {
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

module.exports = CommonUtils;