var SimpleUtils = require('../utils/simple-utils.js');

function SimpleEngine() {
    this.utils = new SimpleUtils();
    this.isStopped = false;
    this.currentExecution = null;
}

/**
 * 执行任务的核心方法
 * @param {Object} task 任务对象
 * @param {Function} progressCallback 进度回调函数
 * @returns {Promise} 执行结果的Promise
 */
SimpleEngine.prototype.executeTask = function(task, progressCallback) {
    var self = this;
    self.isStopped = false;
    
    return new Promise(function(resolve, reject) {
        if (self.isStopped) {
            reject(new Error("引擎已被停止"));
            return;
        }
        
        self.currentExecution = {
            task: task,
            progressCallback: progressCallback,
            resolve: resolve,
            reject: reject
        };
        
        // 开始执行任务
        self.executeTaskSteps(task, progressCallback)
            .then(function(result) {
                if (self.currentExecution) {
                    self.currentExecution = null;
                }
                resolve(result);
            })
            .catch(function(error) {
                if (self.currentExecution) {
                    self.currentExecution = null;
                }
                reject(error);
            });
    });
};

/**
 * 执行任务的所有步骤
 */
SimpleEngine.prototype.executeTaskSteps = function(task, progressCallback) {
    var self = this;
    
    return new Promise(function(resolve, reject) {
        if (!task.config || !task.config.steps) {
            reject(new Error("任务没有配置步骤"));
            return;
        }
        
        var steps = task.config.steps;
        var currentStepIndex = 0;
        var totalSteps = steps.length;
        
        function executeNextStep() {
            if (self.isStopped) {
                reject(new Error("任务执行被停止"));
                return;
            }
            
            if (currentStepIndex >= totalSteps) {
                // 所有步骤完成
                if (progressCallback) {
                    progressCallback(100, "任务完成");
                }
                resolve({ success: true, message: "任务执行完成" });
                return;
            }
            
            var step = steps[currentStepIndex];
            var progress = Math.floor((currentStepIndex / totalSteps) * 100);
            
            // 更新进度
            if (progressCallback) {
                progressCallback(progress, "执行步骤: " + (step.description || step.action));
            }
            
            // 执行当前步骤
            self.executeSingleStep(step, task)
                .then(function() {
                    currentStepIndex++;
                    // 步骤间延迟
                    return self.utils.sleep(1000);
                })
                .then(function() {
                    executeNextStep();
                })
                .catch(function(error) {
                    reject(new Error("步骤执行失败: " + (step.description || step.action) + " - " + error));
                });
        }
        
        executeNextStep();
    });
};

/**
 * 执行单个步骤
 */
SimpleEngine.prototype.executeSingleStep = function(step, task) {
    var self = this;
    
    return new Promise(function(resolve, reject) {
        if (self.isStopped) {
            reject(new Error("任务执行被停止"));
            return;
        }
        
        try {
            var actionPromise;
            
            switch (step.action) {
                case 'launch':
                    actionPromise = self.launchApp(task.packageName, step.params.timeout);
                    break;
                    
                case 'click':
                    actionPromise = self.clickElement(step.params.selector, step.params.timeout);
                    break;
                    
                case 'wait_click':
                    actionPromise = self.waitAndClick(step.params.selector, step.params.timeout);
                    break;
                    
                case 'wait_exists':
                    actionPromise = self.waitElementExists(step.params.selector, step.params.timeout);
                    break;
                    
                case 'screenshot':
                    actionPromise = self.takeScreenshot(step.params.path);
                    break;
                    
                case 'swipe':
                    actionPromise = self.swipeScreen(step.params.start, step.params.end, step.params.duration);
                    break;
                    
                case 'back':
                    actionPromise = self.pressBack();
                    break;
                    
                case 'home':
                    actionPromise = self.pressHome();
                    break;
                    
                case 'sleep':
                    actionPromise = self.utils.sleep(step.params.duration);
                    break;
                    
                default:
                    reject(new Error("未知的操作类型: " + step.action));
                    return;
            }
            
            actionPromise.then(resolve).catch(reject);
            
        } catch (error) {
            reject(error);
        }
    });
};

// 具体的操作实现方法
SimpleEngine.prototype.launchApp = function(packageName, timeout) {
    var self = this;
    timeout = timeout || 5000;
    
    return new Promise(function(resolve) {
        // 停止应用以确保干净状态
        try {
            shell("am force-stop " + packageName, true);
        } catch (e) {
            // 忽略停止应用的错误
        }
        
        // 等待一段时间后启动应用
        setTimeout(function() {
            app.launch(packageName);
            setTimeout(resolve, timeout);
        }, 1000);
    });
};

SimpleEngine.prototype.clickElement = function(selector, timeout) {
    var self = this;
    
    return self.utils.findElement(selector, timeout)
        .then(function(element) {
            if (element) {
                element.click();
                return true;
            } else {
                throw new Error("未找到元素: " + selector);
            }
        });
};

SimpleEngine.prototype.waitAndClick = function(selector, timeout) {
    var self = this;
    timeout = timeout || 10000;
    var startTime = Date.now();
    
    return new Promise(function(resolve, reject) {
        function checkAndClick() {
            if (Date.now() - startTime > timeout) {
                reject(new Error("等待元素超时: " + selector));
                return;
            }
            
            if (self.isStopped) {
                reject(new Error("任务被停止"));
                return;
            }
            
            self.utils.findElement(selector, 1000)
                .then(function(element) {
                    if (element) {
                        element.click();
                        resolve();
                    } else {
                        setTimeout(checkAndClick, 500);
                    }
                })
                .catch(function() {
                    setTimeout(checkAndClick, 500);
                });
        }
        
        checkAndClick();
    });
};

SimpleEngine.prototype.waitElementExists = function(selector, timeout) {
    var self = this;
    timeout = timeout || 10000;
    var startTime = Date.now();
    console.log("startTime: ", startTime);
    return new Promise(function(resolve, reject) {
        function checkExists() {
            if (Date.now() - startTime > timeout) {
                console.log("Date.now() - startTime: ", Date.now() - startTime);
                reject(new Error("等待元素出现超时: " + selector));
                return;
            }
            
            if (self.isStopped) {
                reject(new Error("任务被停止"));
                return;
            }
            
            self.utils.findElement(selector, 1000)
                .then(function(element) {
                    if (element) {
                        resolve();
                    } else {
                        setTimeout(checkExists, 500);
                    }
                })
                .catch(function() {
                    setTimeout(checkExists, 500);
                });
        }
        
        checkExists();
    });
};

SimpleEngine.prototype.takeScreenshot = function(path) {
    return new Promise(function(resolve) {
        if (typeof captureScreen === 'function') {
            var timestamp = new Date().getTime();
            var actualPath = path.replace('{{timestamp}}', timestamp);
            captureScreen(actualPath);
        }
        resolve();
    });
};

SimpleEngine.prototype.swipeScreen = function(start, end, duration) {
    return new Promise(function(resolve) {
        duration = duration || 500;
        swipe(start[0], start[1], end[0], end[1], duration);
        setTimeout(resolve, duration + 100);
    });
};

SimpleEngine.prototype.pressBack = function() {
    return new Promise(function(resolve) {
        back();
        setTimeout(resolve, 500);
    });
};

SimpleEngine.prototype.pressHome = function() {
    return new Promise(function(resolve) {
        home();
        setTimeout(resolve, 500);
    });
};

/**
 * 停止当前执行的任务
 */
SimpleEngine.prototype.stopCurrentTask = function() {
    this.isStopped = true;
    if (this.currentExecution) {
        this.currentExecution = null;
    }
};

/**
 * 获取引擎状态
 */
SimpleEngine.prototype.getStatus = function() {
    return {
        isStopped: this.isStopped,
        isRunning: !!this.currentExecution
    };
};

module.exports = SimpleEngine;