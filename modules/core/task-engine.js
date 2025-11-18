var FindElementUtils = require('../utils/find-element-utils.js');
var Logger = require('../utils/logger.js');

var logger = new Logger();
logger.setLogView(ui.logContent);

function TaskEngine() {
    this.findElementUtils = new FindElementUtils();
    this.isStopped = false;
    this.currentExecution = null;
}

/**
 * 执行任务
 * @param {Object} task 任务对象
 * @returns {Promise} Promise表示一个异步操作的最终完成结果
 */
TaskEngine.prototype.executeTask = function(task) {
    var self = this; // 确保在异步操作中对TaskEngine实例的引用不会丢失
    self.isStopped = false;
    return new Promise(function(resolve, reject) {
        if (self.isStopped) {
            reject(new Error("引擎已被停止"));
            return;
        }
        // 开始执行任务
        self.executeTaskSteps(task)
            .then(function(result) {
                resolve(result); // 返回执行结果
            })
            .catch(function(error) {
                reject(error);
            });
    });
};

/**
 * 执行任务的所有步骤
 * @param {Object} task 任务对象
 * @returns {Promise} Promise表示一个异步操作的最终完成结果
 */
TaskEngine.prototype.executeTaskSteps = function(task) {
    var self = this;
    return new Promise(function(resolve, reject) {
        if (!task.config || !task.config.steps) {
            reject(new Error("任务没有配置步骤"));
        }
        
        var steps = task.config.steps;
        var currentStepIndex = 0;
        var totalSteps = steps.length;
        
        function executeNextStep() {
            if (self.isStopped) {
                reject(new Error("任务执行被停止"));
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
                    return new Promise(resolve => setTimeout(() => {
                            executeNextStep();
                            resolve();
                        }, 1000));
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
TaskEngine.prototype.executeSingleStep = function(step, task) {
    var self = this;
    return new Promise(function(resolve, reject) {
        if (self.isStopped) {
            reject(new Error("任务执行被停止"));
        }
        
        try {
            var actionPromise;
            
            switch (step.action) {
                case 'launch':
                    actionPromise = self.launchApp(task.packageName, step.params.timeout);
                    break;
                case 'click_desc':
                    actionPromise = self.clickElement(step.params.selector, step.params.timeout);
                    break;
                case 'click_img':
                    actionPromise = self.clickImage(step.params.selector, step.params.timeout);
                    break;
                case 'click_to_earn_3points_loop':
                    actionPromise = self.executeLoop(step);
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
TaskEngine.prototype.launchApp = function(packageName, timeout) {
    var self = this;
    timeout = timeout || 3000;
    
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

TaskEngine.prototype.clickImage = function(selector, retryCount, retryInterval) {
    var self = this;
    retryCount = retryCount || 3; // 默认重试3次
    retryInterval = retryInterval || 500; // 默认重试间隔500ms
    
    return new Promise(function(resolve, reject) {
        var lastError = null;
        
        function attemptOCR(retryLeft) {
            try {
                // 准备OCR识别区域（默认为整个屏幕）
                logger.info("执行OCR识别，寻找文本: " + selector + (retryLeft < retryCount ? ` (剩余重试次数: ${retryLeft})` : ""));
                var results = ocr.detect();
                
                // 查找目标文本
                var targetText = selector.replace(/"/g, ''); // 移除引号
                var targetFound = false;

                // logger.debug("OCR识别结果: " + results);
                            
                for (var i = 0; i < results.length; i++) {
                    var result = results[i];
                    // logger.debug("识别到文本: " + result.label + ", 置信度: " + result.confidence);
                    
                    if (result.label.includes(targetText) && result.confidence > 0.6) {
                        targetFound = true;
                        // 从bounds属性中提取坐标信息
                        var bounds = result.bounds;
                        // 计算文本区域中心点
                        var centerX = (bounds.left + bounds.right) / 2;
                        var centerY = (bounds.top + bounds.bottom) / 2;
                        
                        // 执行点击操作
                        var clickSuccess = click(centerX, centerY);
                        
                        if (clickSuccess) {
                            logger.info("点击成功");
                            resolve({ success: true, method: "ocr", text: result.label, confidence: result.confidence, position: { x: centerX, y: centerY } });
                            return;
                        } else {
                            throw new Error("点击失败");
                        }
                    }
                }
                
                if (!targetFound) {
                    throw new Error("未找到目标文本: " + targetText);
                }
                
                sleep(2000); // 等待一段时间后再进行下一步操作
            } catch (error) {
                lastError = error;
                logger.error(`OCR点击过程中发生错误: ${error.message}${retryLeft > 0 ? `，将在${retryInterval}ms后重试` : ""}`);
                
                if (retryLeft > 0) {
                    setTimeout(function() {
                        attemptOCR(retryLeft - 1);
                    }, retryInterval);
                } else {
                    reject(new Error(`OCR点击失败: ${error.message} (已重试${retryCount}次)`));
                }
            }
        }
        
        attemptOCR(retryCount);
    });
}

TaskEngine.prototype.clickElement = function(selector) {
    var self = this;
    return new Promise(function(resolve,reject) {
        self.findElementUtils.findElement(selector)
            .then(function(element) {
                if (element) {
                    var clickSuccess = false;
                    try {
                        if (element.clickable()) {
                            // 如果元素可点击，使用正常的click方法
                            element.click();
                            clickSuccess = true;
                            resolve();
                        } else {
                            logger.info("元素不可点击，使用坐标点击方式");
                            clickSuccess = click(element.center().x, element.center().y);
                            resolve();
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

/**
 * 执行循环操作
 */
TaskEngine.prototype.executeLoop = function(step) {
    var self = this;
    return new Promise(function(resolve) {
        function checkCondition() {
            self.findElementUtils.findElement(step.params.selector)
                .then(function(element) {
                    if (element) {
                        // 执行点击操作
                        self.clickElement(step.params.selector)
                            .then(function() {
                                logger.info("点击成功，等待6秒...");
                                // 等待5秒
                                setTimeout(function() {
                                    logger.info("返回上一页...");
                                    // 返回上一页
                                    back();
                                    // 继续循环检查
                                    setTimeout(checkCondition, 500); // 稍等再检查，确保页面已返回
                                }, 6000);
                            })
                            .catch(function(error) {
                                logger.error("循环内点击失败: " + error.message);
                                // 点击失败时继续循环检查
                                setTimeout(checkCondition, 1000);
                            });
                    } else {
                        // 元素不存在，循环结束
                        logger.info("循环条件不满足，结束循环");
                        resolve();
                    }
                });
        }
        
        // 开始检查条件
        checkCondition();
    });
};

module.exports = TaskEngine;