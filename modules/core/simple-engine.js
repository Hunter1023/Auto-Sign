// modules/core/simple-engine.js
var SimpleUtils = require('./utils/simple-utils.js');

function SimpleEngine() {
    this.utils = new SimpleUtils();
    this.isStopped = false;
}

SimpleEngine.prototype.executeStep = function(step, task) {
    var self = this;
    
    return new Promise(function(resolve, reject) {
        if (self.isStopped) {
            reject(new Error("任务已停止"));
            return;
        }
        
        switch (step.action) {
            case 'launch':
                app.launch(task.packageName);
                setTimeout(resolve, step.timeout || 5000);
                break;
                
            case 'click':
                self.utils.findElement(step.selector, step.timeout).then(function(element) {
                    if (element) {
                        element.click();
                        resolve();
                    } else {
                        reject(new Error("未找到元素: " + step.selector));
                    }
                });
                break;
                
            default:
                reject(new Error("未知操作: " + step.action));
        }
    });
};

module.exports = SimpleEngine;