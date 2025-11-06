// modules/tasks/bbs-task.js
var BaseTask = require('./base-task.js');

function BbsTask(config) {
    BaseTask.call(this, config);
}

// 继承BaseTask
BbsTask.prototype = Object.create(BaseTask.prototype);
BbsTask.prototype.constructor = BbsTask;

BbsTask.prototype.execute = function() {
    var self = this;
    
    return new Promise(function(resolve, reject) {
        self.logger.info("开始执行论坛签到任务: " + self.name);
        
        self.launchApp(6000).then(function() {
            return self.utils.sleep(3000);
        }).then(function() {
            return self.checkSignedStatus();
        }).then(function(signed) {
            if (signed) {
                self.logger.info("今日已签到");
                return true;
            }
            return self.performSign();
        }).then(function() {
            return self.verifySignResult();
        }).then(function(success) {
            if (success) {
                self.logger.info("论坛签到成功");
                return self.takeScreenshot("success");
            } else {
                throw new Error("签到结果验证失败");
            }
        }).then(function() {
            resolve(true);
        }).catch(function(error) {
            self.logger.error("论坛签到失败: " + error);
            self.takeScreenshot("error").then(function() {
                reject(error);
            }).catch(function() {
                reject(error);
            });
        });
    });
};

BbsTask.prototype.checkSignedStatus = function() {
    var self = this;
    
    return new Promise(function(resolve) {
        var signedSelectors = [
            'text("已签到")',
            'text("今日已签")',
            'text("签到已完成")',
            'desc("已签到")'
        ];
        
        var checkNext = function(index) {
            if (index >= signedSelectors.length) {
                resolve(false);
                return;
            }
            
            self.utils.findElement(signedSelectors[index], 2000).then(function(element) {
                if (element) {
                    resolve(true);
                } else {
                    checkNext(index + 1);
                }
            });
        };
        
        checkNext(0);
    });
};

BbsTask.prototype.performSign = function() {
    var self = this;
    
    return new Promise(function(resolve, reject) {
        var signSelectors = [
            'text("签到")',
            'text("每日签到")',
            'text("立即签到")',
            'desc("签到")',
            'id("sign_in")'
        ];
        
        var tryNext = function(index) {
            if (index >= signSelectors.length) {
                reject(new Error("未找到签到按钮"));
                return;
            }
            
            self.safeClick(signSelectors[index], 3000).then(function(success) {
                if (success) {
                    self.logger.info("点击签到按钮: " + signSelectors[index]);
                    self.utils.sleep(2000).then(function() {
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

BbsTask.prototype.verifySignResult = function() {
    var self = this;
    
    return self.utils.sleep(3000).then(function() {
        return new Promise(function(resolve) {
            var successSelectors = [
                'text("签到成功")',
                'text("获得")',
                'text("金币")',
                'text("积分")',
                'text("经验")'
            ];
            
            var checkNext = function(index) {
                if (index >= successSelectors.length) {
                    // 检查是否显示已签到
                    self.checkSignedStatus().then(resolve);
                    return;
                }
                
                self.utils.findElement(successSelectors[index], 2000).then(function(element) {
                    if (element) {
                        resolve(true);
                    } else {
                        checkNext(index + 1);
                    }
                });
            };
            
            checkNext(0);
        });
    });
};

module.exports = BbsTask;