var SimpleUtils = require('../utils/simple-utils.js');
var Logger = require('../utils/logger.js');

var logger = new Logger();
logger.setLogView(ui.logContent);
logger.setLogLevel('INFO');

function SimpleEngine() {
    this.utils = new SimpleUtils();
    this.isStopped = false;
    this.currentExecution = null;
}

/**
 * 执行任务的核心方法
 * @param {Object} task 任务对象
 * @returns {Promise} 执行结果的Promise
 */
SimpleEngine.prototype.executeTask = function(task) {
    var self = this;
    self.isStopped = false;
    
    return new Promise(function(resolve, reject) {
        if (self.isStopped) {
            reject(new Error("引擎已被停止"));
            return;
        }
        
        self.currentExecution = {
            task: task,
            resolve: resolve,
            reject: reject
        };
        
        // 开始执行任务
        self.executeTaskSteps(task)
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
SimpleEngine.prototype.executeTaskSteps = function(task) {
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
                resolve({ success: true, message: "任务执行完成" });
                return;
            }
            
            var step = steps[currentStepIndex];
            
            // 执行当前步骤
            self.executeSingleStep(step, task)
                .then(function() {
                    currentStepIndex++;
                    // 步骤间延迟
                    return self.utils.sleep(2000);
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

                case 'click_img':
                    actionPromise = self.clickImage(step.params.selector, step.params.timeout);
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

SimpleEngine.prototype.clickImage = function(selector, timeout) {
    var self = this;
    timeout = timeout || 3000;
    
    return new Promise(function(resolve, reject) {
        try {
            // 准备OCR识别区域（默认为整个屏幕）
            logger.info("执行OCR识别，寻找文本: " + selector);
            var results = ocr.detect();
            
            // 查找目标文本
            var targetText = selector.replace(/"/g, ''); // 移除引号
            var targetFound = false;

            logger.info("OC识别结果: " + results);
            logger.info("OCR识别结果数量: " + results.length);
                        
            for (var i = 0; i < results.length; i++) {
                var result = results[i];
                logger.info("识别到文本: " + result.label + ", 置信度: " + result.confidence);
                
                if (result.label.includes(targetText) && result.confidence > 0.6) {
                    targetFound = true;
                    // 从bounds属性中提取坐标信息
                    var bounds = result.bounds;
                    // 计算文本区域中心点
                    var centerX = (bounds.left + bounds.right) / 2;
                    var centerY = (bounds.top + bounds.bottom) / 2;
                    
                    logger.info("找到目标文本，中心点坐标: x=" + centerX + ", y=" + centerY);
                    
                    // 执行点击操作
                    var clickSuccess = click(centerX, centerY);
                    
                    if (clickSuccess) {
                        logger.info("点击成功");
                        resolve({ success: true, method: "ocr", text: result.label, confidence: result.confidence, position: { x: centerX, y: centerY } });
                    } else {
                        throw new Error("点击失败");
                    }
                    break;
                }
            }
            
            if (!targetFound) {
                throw new Error("未找到目标文本: " + targetText);
            }
        } catch (error) {
            logger.error("OCR点击过程中发生错误: " + error.message);
            reject(error);
        }
    });
}

SimpleEngine.prototype.clickElement = function(selector, timeout) {
    var self = this;
    return new Promise(function(reject) {
        self.utils.findElement(selector, timeout)
            .then(function(element) {
                if (element) {
                    var clickSuccess = false;
                    try {
                        if (element.clickable()) {
                            // 如果元素可点击，使用正常的cLick方法
                            element.click();
                            clickSuccess = true;
                        } else {
                            logger.info("元素不可点击，使用坐标点击方式");
                            clickSuccess = click(element.centerX, element.centerY);
                        }
                        
                        if (clickSuccess) {
                            logger.info("点击操作执行完成");
                            resolve();
                        } else {
                            logger.error("点击操作失败");
                            reject(new Error("点击操作执行失败"));
                        }
                    } catch (error) {
                        logger.error("点击元素时发生错误: " + error.message);
                        reject(new Error("点击元素失败: " + error.message));
                    }
                } else {
                    var errorMsg = "未找到元素: " + selector;
                    logger.error(errorMsg);
                    reject(new Error(errorMsg));
                }
            })
            .catch(function(error) {
                logger.error("查找元素时发生错误: " + (error ? error.message : "未知错误"));
                reject(error);
            });
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
                        var clickSuccess = false;
                        
                        try {
                            if (element.clickable()) {
                                // 如果元素可点击，使用正常的click方法
                                element.click();
                                clickSuccess = true;
                            } else {
                                logger.info("元素不可点击，使用坐标点击方式");
                                clickSuccess = click(element.center().x, element.center().y);
                            }
                            if (clickSuccess) {
                                logger.info("点击操作执行完成");
                                resolve(); // 标记步骤成功完成
                            } else {
                                logger.error("点击操作失败");
                                reject(new Error("点击操作执行失败"));
                            }
                        } catch (error) {
                            logger.error("点击元素时发生错误: " + error.message);
                            reject(new Error("点击元素失败：" + error.message));
                        }
                    } else {
                        var errorMsg = "未找到元素： " + selector;
                        logger.info(errorMsg);
                        reject(new Error(errorMsg));
                    }
                })
                .catch(function(error) {
                    logger.error("查找元素时发生错误: " + (error ? error.message : "未知错误"));
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