var Logger = require('../utils/logger.js');
var CommonUtils = require('../utils/common.js');

function TaskEngine() {
    this.logger = new Logger();
    this.utils = new CommonUtils();
    this.runningTasks = {};
    this.isStopped = false;
    this.currentTask = null;
}

TaskEngine.prototype.executeAllTasks = function(tasks, progressCallback) {
    var self = this;
    this.isStopped = false;
    var startTime = Date.now();
    var completedCount = 0;
    
    this.logger.info("开始执行 " + tasks.length + " 个任务");
    
    // 使用Promise链来顺序执行任务
    var promiseChain = Promise.resolve();
    
    for (var i = 0; i < tasks.length; i++) {
        (function(index) {
            promiseChain = promiseChain.then(function() {
                if (self.isStopped) {
                    self.logger.info("任务被用户停止");
                    return Promise.reject(new Error("任务被用户停止"));
                }
                
                var task = tasks[index];
                self.currentTask = task;
                
                self.logger.info("执行任务 " + (index + 1) + "/" + tasks.length + ": " + task.name);
                
                return self.executeSingleTask(task, index, progressCallback).then(function() {
                    completedCount++;
                    
                    // 任务间延迟（最后一个任务不延迟）
                    if (index < tasks.length - 1 && !self.isStopped) {
                        var delay = task.config.betweenTaskDelay || 2000;
                        self.logger.debug("任务间延迟 " + delay + "ms");
                        return self.utils.sleep(delay);
                    }
                });
            }).catch(function(error) {
                self.logger.error("任务执行失败: " + task.name + " - " + error);
            });
        })(i);
    }
    
    return promiseChain.then(function() {
        var totalTime = Date.now() - startTime;
        self.logger.info("任务执行完成: " + completedCount + "/" + tasks.length + " 成功, 总耗时: " + (totalTime / 1000).toFixed(1) + "s");
        self.currentTask = null;
        
        return {
            total: tasks.length,
            completed: completedCount,
            totalTime: totalTime
        };
    });
};

TaskEngine.prototype.executeSingleTask = function(task, taskId, progressCallback) {
    var self = this;
    
    if (this.isStopped) {
        return Promise.reject(new Error("任务已被停止"));
    }
    
    var taskStartTime = Date.now();
    
    return new Promise(function(resolve, reject) {
        try {
            // 初始化进度
            progressCallback(taskId, 5, '准备中', '#2196F3');
            
            var steps = task.config.steps || [];
            var totalSteps = steps.length;
            
            if (totalSteps === 0) {
                reject(new Error("任务没有配置步骤"));
                return;
            }
            
            self.logger.info('任务 "' + task.name + '" 开始执行，共 ' + totalSteps + ' 个步骤');
            
            var stepPromise = Promise.resolve();
            
            for (var stepIndex = 0; stepIndex < totalSteps; stepIndex++) {
                (function(stepIdx) {
                    stepPromise = stepPromise.then(function() {
                        if (self.isStopped) {
                            throw new Error("任务被用户停止");
                        }
                        
                        var step = steps[stepIdx];
                        var progress = 5 + Math.floor((stepIdx / totalSteps) * 85);
                        
                        // 更新进度
                        progressCallback(taskId, progress, '执行中 (' + (stepIdx + 1) + '/' + totalSteps + ')', '#FF9800');
                        
                        self.logger.debug("执行步骤 " + (stepIdx + 1) + ": " + (step.description || step.action));
                        
                        // 执行步骤
                        return self.executeStep(step, task).then(function() {
                            // 步骤间延迟
                            var stepDelay = step.delay || 1000;
                            if (stepDelay > 0) {
                                return self.utils.sleep(stepDelay);
                            }
                        });
                    });
                })(stepIndex);
            }
            
            stepPromise.then(function() {
                // 任务完成
                var taskTime = Date.now() - taskStartTime;
                progressCallback(taskId, 100, '签到成功', '#4CAF50');
                self.logger.info("任务完成: " + task.name + " (耗时: " + (taskTime / 1000).toFixed(1) + "s)");
                resolve();
            }).catch(function(error) {
                var taskTime = Date.now() - taskStartTime;
                self.logger.error("任务失败: " + task.name + " - " + error + " (耗时: " + (taskTime / 1000).toFixed(1) + "s)");
                progressCallback(taskId, 0, "失败: " + error.message, '#F44336');
                reject(error);
            });
            
        } catch (error) {
            var taskTime = Date.now() - taskStartTime;
            self.logger.error("任务失败: " + task.name + " - " + error + " (耗时: " + (taskTime / 1000).toFixed(1) + "s)");
            progressCallback(taskId, 0, "失败: " + error.message, '#F44336');
            reject(error);
        }
    });
};

TaskEngine.prototype.executeStep = function(step, task) {
    var self = this;
    var stepName = step.description || step.action;
    
    return new Promise(function(resolve, reject) {
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
                    
                case 'swipe_up':
                    actionPromise = self.swipeUp(step.params.count, step.params.duration);
                    break;
                    
                case 'swipe_down':
                    actionPromise = self.swipeDown(step.params.count, step.params.duration);
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
                    
                case 'input':
                    actionPromise = self.inputText(step.params.selector, step.params.text, step.params.timeout);
                    break;
                    
                default:
                    reject(new Error("未知的操作类型: " + step.action));
                    return;
            }
            
            actionPromise.then(function() {
                self.logger.debug("步骤完成: " + stepName);
                resolve();
            }).catch(function(error) {
                self.logger.error("步骤失败: " + stepName + " - " + error);
                reject(error);
            });
            
        } catch (error) {
            self.logger.error("步骤失败: " + stepName + " - " + error);
            reject(error);
        }
    });
};

TaskEngine.prototype.launchApp = function(packageName, timeout) {
    var self = this;
    timeout = timeout || 5000;
    
    return new Promise(function(resolve) {
        self.logger.info("启动应用: " + packageName);
        
        // 先尝试停止应用（清除状态）
        shell("am force-stop " + packageName, true);
        
        setTimeout(function() {
            // 启动应用
            app.launch(packageName);
            
            // 等待应用启动
            setTimeout(function() {
                self.logger.debug("应用启动完成: " + packageName);
                resolve();
            }, timeout);
        }, 1000);
    });
};

TaskEngine.prototype.clickElement = function(selector, timeout) {
    var self = this;
    timeout = timeout || 5000;
    
    return new Promise(function(resolve, reject) {
        self.logger.debug("查找并点击元素: " + selector);
        
        var element = self.utils.findElement(selector, timeout);
        if (element) {
            var bounds = element.bounds();
            var centerX = bounds.centerX();
            var centerY = bounds.centerY();
            
            // 点击元素中心点
            click(centerX, centerY);
            self.logger.debug("点击元素成功: " + selector + " (位置: " + centerX + ", " + centerY + ")");
            resolve();
        } else {
            reject(new Error("未找到元素: " + selector));
        }
    });
};

TaskEngine.prototype.waitAndClick = function(selector, timeout) {
    var self = this;
    timeout = timeout || 10000;
    
    return new Promise(function(resolve, reject) {
        self.logger.debug("等待并点击元素: " + selector + " (超时: " + timeout + "ms)");
        
        var startTime = Date.now();
        
        function checkElement() {
            if (Date.now() - startTime >= timeout) {
                reject(new Error("等待元素超时: " + selector));
                return;
            }
            
            if (self.isStopped) {
                reject(new Error("任务被用户停止"));
                return;
            }
            
            var element = self.utils.findElement(selector, 1000);
            if (element) {
                var bounds = element.bounds();
                click(bounds.centerX(), bounds.centerY());
                self.logger.debug("等待点击成功: " + selector);
                resolve();
            } else {
                setTimeout(checkElement, 500);
            }
        }
        
        checkElement();
    });
};

TaskEngine.prototype.waitElementExists = function(selector, timeout) {
    var self = this;
    timeout = timeout || 10000;
    
    return new Promise(function(resolve, reject) {
        self.logger.debug("等待元素出现: " + selector);
        
        var startTime = Date.now();
        
        function checkElement() {
            if (Date.now() - startTime >= timeout) {
                reject(new Error("等待元素出现超时: " + selector));
                return;
            }
            
            if (self.isStopped) {
                reject(new Error("任务被用户停止"));
                return;
            }
            
            var element = self.utils.findElement(selector, 1000);
            if (element) {
                self.logger.debug("元素已出现: " + selector);
                resolve();
            } else {
                setTimeout(checkElement, 500);
            }
        }
        
        checkElement();
    });
};

TaskEngine.prototype.takeScreenshot = function(path) {
    var self = this;
    
    return new Promise(function(resolve) {
        var timestamp = new Date().getTime();
        var actualPath = path.replace('{{timestamp}}', timestamp);
        
        self.logger.debug("截图保存到: " + actualPath);
        
        if (typeof captureScreen === 'function') {
            var result = captureScreen(actualPath);
            if (result) {
                self.logger.info("截图成功: " + actualPath);
            } else {
                self.logger.warn("截图失败");
            }
        } else {
            self.logger.warn("截图功能不可用");
        }
        resolve();
    });
};

TaskEngine.prototype.swipeScreen = function(start, end, duration) {
    var self = this;
    duration = duration || 500;
    
    return new Promise(function(resolve) {
        self.logger.debug("滑动屏幕: [" + start + "] -> [" + end + "], 时长: " + duration + "ms");
        swipe(start[0], start[1], end[0], end[1], duration);
        setTimeout(resolve, duration + 100);
    });
};

TaskEngine.prototype.swipeUp = function(count, duration) {
    var self = this;
    count = count || 1;
    duration = duration || 500;
    
    return new Promise(function(resolve) {
        var width = device.width;
        var height = device.height;
        var current = 0;
        
        function doSwipe() {
            if (current >= count) {
                resolve();
                return;
            }
            
            self.logger.debug("向上滑动 " + (current + 1) + "/" + count);
            swipe(width / 2, height * 0.7, width / 2, height * 0.3, duration);
            current++;
            
            if (current < count) {
                setTimeout(doSwipe, 800);
            } else {
                setTimeout(resolve, 800);
            }
        }
        
        doSwipe();
    });
};

TaskEngine.prototype.swipeDown = function(count, duration) {
    var self = this;
    count = count || 1;
    duration = duration || 500;
    
    return new Promise(function(resolve) {
        var width = device.width;
        var height = device.height;
        var current = 0;
        
        function doSwipe() {
            if (current >= count) {
                resolve();
                return;
            }
            
            self.logger.debug("向下滑动 " + (current + 1) + "/" + count);
            swipe(width / 2, height * 0.3, width / 2, height * 0.7, duration);
            current++;
            
            if (current < count) {
                setTimeout(doSwipe, 800);
            } else {
                setTimeout(resolve, 800);
            }
        }
        
        doSwipe();
    });
};

TaskEngine.prototype.pressBack = function() {
    var self = this;
    
    return new Promise(function(resolve) {
        self.logger.debug("按下返回键");
        back();
        setTimeout(resolve, 500);
    });
};

TaskEngine.prototype.pressHome = function() {
    var self = this;
    
    return new Promise(function(resolve) {
        self.logger.debug("按下Home键");
        home();
        setTimeout(resolve, 500);
    });
};

TaskEngine.prototype.inputText = function(selector, text, timeout) {
    var self = this;
    timeout = timeout || 5000;
    
    return new Promise(function(resolve, reject) {
        self.logger.debug("在元素 " + selector + " 中输入文本: " + text);
        
        var element = self.utils.findElement(selector, timeout);
        if (element) {
            element.setText(text);
            self.logger.debug("输入文本成功: " + text);
            resolve();
        } else {
            reject(new Error("未找到输入框元素: " + selector));
        }
    });
};

TaskEngine.prototype.stopAllTasks = function() {
    this.isStopped = true;
    this.logger.info("停止所有任务");
    
    if (this.currentTask) {
        this.logger.info('当前任务 "' + this.currentTask.name + '" 将被停止');
    }
};

TaskEngine.prototype.getCurrentTask = function() {
    return this.currentTask;
};

TaskEngine.prototype.isRunning = function() {
    return !this.isStopped && this.currentTask !== null;
};

module.exports = TaskEngine;