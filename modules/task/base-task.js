// modules/tasks/base-task.js
function BaseTask(config) {
    this.config = config;
    this.name = config.name;
    this.packageName = config.packageName;
    this.logger = null;
    this.utils = null;
}

BaseTask.prototype.setLogger = function(logger) {
    this.logger = logger;
};

BaseTask.prototype.setUtils = function(utils) {
    this.utils = utils;
};

BaseTask.prototype.execute = function() {
    throw new Error("子类必须实现 execute 方法");
};

BaseTask.prototype.launchApp = function(timeout) {
    var self = this;
    timeout = timeout || 5000;
    
    return new Promise(function(resolve) {
        self.logger.info("启动应用: " + self.packageName);
        app.launch(self.packageName);
        setTimeout(resolve, timeout);
    });
};

BaseTask.prototype.safeClick = function(selector, timeout) {
    var self = this;
    timeout = timeout || 5000;
    
    return this.utils.findElement(selector, timeout).then(function(element) {
        if (element) {
            var bounds = element.bounds();
            click(bounds.centerX(), bounds.centerY());
            self.logger.debug("点击元素: " + selector);
            return true;
        }
        return false;
    });
};

BaseTask.prototype.waitForElement = function(selector, timeout) {
    var self = this;
    timeout = timeout || 10000;
    
    return new Promise(function(resolve, reject) {
        var startTime = Date.now();
        
        function checkElement() {
            if (Date.now() - startTime >= timeout) {
                reject(new Error("等待元素超时: " + selector));
                return;
            }
            
            self.utils.findElement(selector, 1000).then(function(element) {
                if (element) {
                    resolve(element);
                } else {
                    setTimeout(checkElement, 500);
                }
            });
        }
        
        checkElement();
    });
};

BaseTask.prototype.takeScreenshot = function(name) {
    var self = this;
    var path = "/sdcard/Pictures/autosign_" + this.name + "_" + name + "_" + Date.now() + ".png";
    
    return new Promise(function(resolve) {
        var result = self.utils.takeScreenshot(path);
        if (result) {
            self.logger.info("截图保存: " + path);
        }
        resolve(result);
    });
};

BaseTask.prototype.validate = function() {
    if (!this.packageName) {
        throw new Error("任务必须包含 packageName");
    }
    if (!this.name) {
        throw new Error("任务必须包含 name");
    }
    return true;
};

module.exports = BaseTask;