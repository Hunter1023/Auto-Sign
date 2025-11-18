var Logger = require('./logger.js');
var logger = new Logger();
logger.setLogView(ui.logContent);

function FindElementUtils() {
}

/**
 * 非阻塞方式查找元素
 * 使用线程来执行阻塞操作，避免在UI线程中执行
 */
FindElementUtils.prototype.findElement = function(selector) {
    var self = this;
    return new Promise(function(resolve) {
        // 在新线程中执行查找操作
        threads.start(function() {
            var element = null;
            try {
                if (selector.startsWith('text(')) {
                    var str = selector.match(/text\("([^"]+)"\)/)[1];
                    element = text(str).findOne(100);
                } else if (selector.startsWith('desc(')) {
                    var match = selector.match(/desc\("([^"]+)"\)/);
                    if (match) {
                        // 普通文本匹配
                        var str = match[1];
                        element = desc(str).findOne(100);
                    } else {
                        var regexMatch = selector.match(/desc\(\/(.+)\/\)/);
                        // 正则表达式匹配
                        var regex = new RegExp(regexMatch[1]);
                        element = descMatch(regex).findOne(1000);
                    }
                } else if (selector.startsWith('id(')) {
                    var id = selector.match(/id\("([^"]+)"\)/)[1];
                    element = id(id).findOne(100);
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

            // 超时仍未找到元素
            resolve(null);
        });
    });
};

/**
 * 等待元素出现（非阻塞版本）
 */
FindElementUtils.prototype.waitForElement = function(selector, timeout) {
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

module.exports = FindElementUtils;