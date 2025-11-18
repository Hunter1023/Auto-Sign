var Logger = require('./logger.js');
var logger = new Logger();
logger.setLogView(ui.logContent);

function FindElementUtils() {
}

/**
 * 根据text查找元素
 * 
 * @param {String} targetText 目标文本
 * @returns 
 */
FindElementUtils.prototype.findElementByText = function(targetText) {
    return new Promise(function(resolve) {
        threads.start(function() {
            try {
                var element = text(targetText).findOne(1000);
                logger.info("根据targetText: " + targetText + " 找到元素: " + element);
                resolve(element);
                return;
            } catch (e) {
                logger.error("查找元素异常: " + e);
            }
        });
    });
}

/**
 * 根据desc查找元素
 */
FindElementUtils.prototype.findElementByDesc = function(targetDesc) {
    return new Promise(function(resolve) {
        threads.start(function() {
            try {
                var element = desc(targetDesc).findOne(1000);
                resolve(element);
                return;
            } catch (e) {
                logger.error("查找元素异常: " + e);
            }
        });
    });
}

/**
 * 根据desc的正则表达式查找元素
 */
FindElementUtils.prototype.findElementByDescRegExp = function(descRegex) {
    return new Promise(function(resolve) {
        threads.start(function() {
            try {
                var element = descMatch(descRegex).findOne(1000);
                resolve(element);
                return;
            } catch (e) {
                logger.error("查找元素异常: " + e);
            }
        });
    });
}

module.exports = FindElementUtils;