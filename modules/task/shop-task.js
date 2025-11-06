// modules/tasks/shop-task.js
var BaseTask = require('./base-task.js');

function ShopTask(config) {
    BaseTask.call(this, config);
}

// 继承BaseTask
ShopTask.prototype = Object.create(BaseTask.prototype);
ShopTask.prototype.constructor = ShopTask;

ShopTask.prototype.execute = function() {
    var self = this;
    
    return new Promise(function(resolve, reject) {
        self.logger.info("开始执行商城任务: " + self.name);
        
        self.launchApp(6000).then(function() {
            return self.enterTaskCenter();
        }).then(function() {
            return self.claimDailyRewards();
        }).then(function() {
            return self.performBrowseTasks();
        }).then(function() {
            self.logger.info("商城任务完成");
            return self.takeScreenshot("success");
        }).then(function() {
            resolve(true);
        }).catch(function(error) {
            self.logger.error("商城任务失败: " + error);
            self.takeScreenshot("error").then(function() {
                reject(error);
            }).catch(function() {
                reject(error);
            });
        });
    });
};

ShopTask.prototype.enterTaskCenter = function() {
    var self = this;
    
    return new Promise(function(resolve, reject) {
        var taskCenterSelectors = [
            'text("任务中心")',
            'text("我的任务")',
            'text("每日任务")',
            'desc("任务")',
            'id("task_center")'
        ];
        
        var tryNext = function(index) {
            if (index >= taskCenterSelectors.length) {
                reject(new Error("未找到任务中心入口"));
                return;
            }
            
            self.safeClick(taskCenterSelectors[index], 3000).then(function(success) {
                if (success) {
                    self.logger.info("进入任务中心: " + taskCenterSelectors[index]);
                    self.utils.sleep(3000).then(function() {
                        resolve(true);
                    });
                } else {
                    tryNext(index + 1);
                }
            });
        };
        
        tryNext(0);
    });
};

ShopTask.prototype.claimDailyRewards = function() {
    var self = this;
    
    return new Promise(function(resolve) {
        self.logger.info("查找可领取的奖励");
        
        var rewardSelectors = [
            'text("领取") && clickable(true)',
            'text("立即领取")',
            'text("去领取")',
            'desc("领取奖励")'
        ];
        
        var claimedCount = 0;
        
        var claimNextSelector = function(selectorIndex) {
            if (selectorIndex >= rewardSelectors.length) {
                self.logger.info("共领取 " + claimedCount + " 个奖励");
                resolve(claimedCount > 0);
                return;
            }
            
            var selector = rewardSelectors[selectorIndex];
            var elements = self.findAllClickableElements(selector);
            
            var claimNextElement = function(elementIndex) {
                if (elementIndex >= elements.length) {
                    claimNextSelector(selectorIndex + 1);
                    return;
                }
                
                self.clickElement(elements[elementIndex]).then(function(success) {
                    if (success) {
                        self.logger.info("领取奖励: " + selector);
                        claimedCount++;
                        self.utils.sleep(2000).then(function() {
                            return self.closeDialogs();
                        }).then(function() {
                            claimNextElement(elementIndex + 1);
                        });
                    } else {
                        claimNextElement(elementIndex + 1);
                    }
                });
            };
            
            claimNextElement(0);
        };
        
        claimNextSelector(0);
    });
};

ShopTask.prototype.performBrowseTasks = function() {
    var self = this;
    
    self.logger.info("执行浏览任务");
    
    // 滑动浏览商品
    var swipePromise = Promise.resolve();
    for (var i = 0; i < 3; i++) {
        (function(index) {
            swipePromise = swipePromise.then(function() {
                return self.utils.swipeUp(1, 800);
            }).then(function() {
                return self.utils.sleep(2000);
            });
        })(i);
    }
    
    return swipePromise.then(function() {
        // 返回任务中心
        return self.utils.pressBack();
    }).then(function() {
        return self.utils.sleep(2000);
    });
};

ShopTask.prototype.findAllClickableElements = function(selector) {
    try {
        var query = null;
        
        if (selector.includes('&&')) {
            var conditions = selector.split('&&').map(function(s) { return s.trim(); });
            query = this.buildQueryFromConditions(conditions);
        } else if (selector.startsWith('text(')) {
            var text = selector.match(/text\("([^"]+)"\)/)[1];
            query = text(text);
        } else {
            query = text(selector);
        }
        
        if (query) {
            return query.find();
        }
    } catch (error) {
        this.logger.debug("查找元素失败: " + selector + " - " + error);
    }
    
    return [];
};

ShopTask.prototype.buildQueryFromConditions = function(conditions) {
    var query = null;
    
    for (var i = 0; i < conditions.length; i++) {
        var condition = conditions[i];
        var currentQuery = null;
        
        if (condition.startsWith('text(')) {
            var text = condition.match(/text\("([^"]+)"\)/)[1];
            currentQuery = text(text);
        } else if (condition === 'clickable(true)') {
            currentQuery = clickable(true);
        }
        
        if (currentQuery) {
            if (query === null) {
                query = currentQuery;
            } else {
                query = query.filter(currentQuery);
            }
        }
    }
    
    return query;
};

ShopTask.prototype.clickElement = function(element) {
    return new Promise(function(resolve) {
        try {
            var bounds = element.bounds();
            if (bounds) {
                click(bounds.centerX(), bounds.centerY());
                resolve(true);
            } else {
                resolve(false);
            }
        } catch (error) {
            this.logger.debug("点击元素失败: " + error);
            resolve(false);
        }
    });
};

ShopTask.prototype.closeDialogs = function() {
    var self = this;
    
    return new Promise(function(resolve) {
        var closeSelectors = [
            'text("关闭")',
            'text("知道了")',
            'text("确定")',
            'desc("关闭")',
            'id("close")'
        ];
        
        var closeNext = function(index) {
            if (index >= closeSelectors.length) {
                resolve();
                return;
            }
            
            self.safeClick(closeSelectors[index], 1000).then(function(success) {
                if (success) {
                    self.logger.debug("关闭弹窗: " + closeSelectors[index]);
                    self.utils.sleep(1000).then(function() {
                        closeNext(index + 1);
                    });
                } else {
                    closeNext(index + 1);
                }
            });
        };
        
        closeNext(0);
    });
};

module.exports = ShopTask;