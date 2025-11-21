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
            logger.info("开始执行步骤: " + step.description);
            
            switch (step.action) {
                case 'launch':
                    actionPromise = self.launchApp(task.packageName);
                    break;
                case 'click_text':
                    actionPromise = self.clickByText(step.text);
                    break;
                case 'click_desc':
                    actionPromise = self.clickByDesc(step.desc);
                    break;
                case 'click_img':
                    actionPromise = self.clickImage(step.text);
                    break;
                case 'click_to_earn_3points_loop':
                    actionPromise = self.executeLoop(step.regExp);
                    break;
                case 'click_more_activities':
                    actionPromise = self.clickMoreActivities(step.id);
                    break;
                case 'read_to_earn_30points':
                    actionPromise = self.read(step);
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

TaskEngine.prototype.read = function(step) {
    var self = this;

    return new Promise(function(resolve, reject) {
        let width = device.width;
        let height = device.height;
        // 从屏幕垂直方向2/3处向上滑动1/3屏幕的高度，滑动持续时间500ms
        swipe(width / 2, height * 2 / 3, width / 2, height * 1 / 3, 500);
        sleep(1000);
        // 存在id的控件
        if (id(step.id).exists()) {
            // 点击主页
            self.clickByDesc(step.desc);
            // 以屏幕高度的2/3为距离，向上滑动屏幕，滑动持续时间500ms
            sleep(2000);
            swipe(width / 2, height * 4 / 5, width / 2, 0, 500);
            sleep(2000);

            var clickCount = 0;
            // 存储已点击控件的集合
            var clickedContorls = new Set();
            while (clickCount < 10) {
                // 获取 深度20 && className为'android.view.View' && clickable为true的所有控件
                var controls = depth(20).className('android.view.View').clickable(true).find();
                // 遍历当前所有符合要求的控件
                for (var i = 0; i < controls.length; i++) {
                    var control = controls[i];
                    // 当前控件已处理过
                    if (clickedContorls.has(control)) {
                        continue;
                    }
                    var parent = control.parent();
                    var isValid = true;
                    if (parent) {
                        var children = parent.children();
                        // 检查父控件的子控件中是否包含android.widget.Image
                        for (var j = 0; j < children.length; j++) {
                            if (children[j].className() === 'android.widget.Image') {
                                isValid = false;
                                clickedContorls.add(control);
                                break;
                            }
                        }
                    } else {
                        isValid = false;
                        clickedContorls.add(control);
                    }

                    if (isValid) {
                        // 点击符合条件的控件
                        clickElement(control);
                        clickedContorls.add(control);
                        sleep(6000); // 等待6秒
                        back(); // 返回上一页
                        clickCount++;
                        logger.info("已点击 " + clickCount + " 个符合条件的控件");
                    } else {
                        logger.info("当前控件不符合要求");
                    }
                }
                swipe(width / 2, height * 2 / 3, width / 2, height * 1 / 3, 500);
                sleep(1000);
            }
        }
        resolve();
        return;
    });
}

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



TaskEngine.prototype.clickImage = function(text, retryCount, retryInterval) {
    var self = this;
    retryCount = retryCount || 3; // 默认重试3次
    retryInterval = retryInterval || 500; // 默认重试间隔500ms
    
    return new Promise(function(resolve, reject) {
        var lastError = null;
        
        function attemptOCR(retryLeft) {
            try {
                // 准备OCR识别区域（默认为整个屏幕）
                logger.info("执行OCR识别，寻找文本: " + text + (retryLeft < retryCount ? ` (剩余重试次数: ${retryLeft})` : ""));
                var results = ocr.detect();
                
                // 查找目标文本
                var targetFound = false;
                // logger.debug("OCR识别结果: " + results);
                            
                for (var i = 0; i < results.length; i++) {
                    var result = results[i];
                    // logger.debug("识别到文本: " + result.label + ", 置信度: " + result.confidence);
                    
                    if (result.label.includes(text) && result.confidence > 0.6) {
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
                    throw new Error("未找到目标文本: " + text);
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

/**
 * 根据描述点击控件
 * @param {String} desc 控件的描述信息
 * @returns 
 */
TaskEngine.prototype.clickByDesc = function(desc) {
    var self = this;
    return self.findElementUtils.findElementByDesc(desc)
            .then(clickElement)
            .catch(function(error) {
                logger.error("查找元素时发生错误: " + (error ? error.message : "未知错误"));
                reject(error);
            });
};

/**
 * 根据文本点击控件
 * @param {String} text 控件的文本信息
 * @returns 
 */
TaskEngine.prototype.clickByText = function(text) {
    var self = this;
    return self.findElementUtils.findElementByText(text)
            .then(clickElement)
            .catch(function(error) {
                logger.error("查找元素时发生错误: " + (error ? error.message : "未知错误"));
                reject(error);
            });
};


/**
 * 点击控件
 * 
 * @param {*} resolve 
 * @param {*} reject 
 * @param {*} element
 * @returns 
 */
function clickElement(element) {
    return new Promise(function (resolve, reject) {
        if (element) {
            var clickSuccess = false;
            try {
                if (element.clickable()) {
                    element.click();
                    clickSuccess = true;
                } else {
                    logger.info("元素不可点击，使用坐标点击方式");
                    clickSuccess = click(element.center().x, element.center().y);
                }

                if (clickSuccess) {
                    logger.info("点击操作执行完成");
                    resolve(); // 点击成功时调用
                } else {
                    logger.error("点击操作失败");
                    reject(new Error("点击操作执行失败"));
                }
            } catch (error) {
                logger.error("点击元素时发生错误: " + error.message);
                reject(new Error("点击元素失败: " + error.message));
            }
        } else {
            logger.info("未找到指定元素");
            resolve();
        }
    });
}

TaskEngine.prototype.clickMoreActivities = function(targetId) {
    var self = this;
    return new Promise(function(resolve, reject) {
        function clickAndCheck() {
            var moreActivities = id(targetId).findOne(1000);
            if (moreActivities) {
                logger.debug("找到更多活动按钮: " + moreActivities);
                var children = moreActivities.children();
                var clickableFound = false;
                for (var i = 0; i < children.length; i++) {
                    if (children[i].clickable()) {
                        children[i].click();
                        clickableFound = true;
                        break; // 找到一个可点击的子控件并点击后，跳出循环
                    }
                }
                if (clickableFound) {
                    // 如果有可点击的子控件，等待2秒后再次检查
                    setTimeout(clickAndCheck, 2000);
                } else {
                    // 如果没有可点击的子控件，结束Promise
                    resolve();
                }
            } else {
                resolve();
            }
        }
        // 开始点击和检查的逻辑
        clickAndCheck();
    });
}


/**
 * 执行循环操作
 */
TaskEngine.prototype.executeLoop = function(regExp) {
    var self = this;
    return new Promise(function(resolve) {
        function checkCondition() {
            self.findElementUtils.findElementByDescRegExp(regExp)
                .then(function(element) {
                    if (element) {
                        // 执行点击操作
                        clickElement(element)
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