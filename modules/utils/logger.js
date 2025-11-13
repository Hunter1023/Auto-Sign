// modules/utils/logger.js
function Logger() {
    this.logView = null;
    this.maxLogLines = 100;
    this.logLines = []; // 日志行存储数组
    this.enableConsole = true;
    this.enableFileLog = false; // 是否启用文件日志
    this.logFile = null; // 日志文件路径
}

/**
 * 设置日志视图，通常是1个UI组件，用于在界面上显示日志信息
 * 
 * prototype属性用于定义所有实例对象共享的方法和属性
 * 
 * @param {*} logView 
 */
Logger.prototype.setLogView = function(logView) {
    this.logView = logView;
    this.updateLogView();
};

/**
 * 启用或禁用文件日志记录
 * 
 * @param {boolean} enable 是否启用文件日志
 * @param {string} filePath 日志文件路径
 */
Logger.prototype.enableFileLogging = function(enable, filePath) {
    this.enableFileLog = enable;
    if (enable && filePath) {
        this.logFile = filePath;
        files.ensureDir(filePath);
    }
};

/**
 * 记录日志
 * @todo: 有时候生成的堆栈信息格式又不一样，需要兼容
 * @param {string} level 日志等级 (DEBUG, INFO, WARN, ERROR)
 * @param {string} message 日志消息
 */
Logger.prototype.log = function(level, message) {
    // 获取调用者的代码位置信息
    var callerInfo = '';
    try {
        // 创建Error对象来获取堆栈信息
        var err = new Error();
        if (err.stack) {
            // 堆栈格式通常为: at file:/path/to/logger.js:line
            // at file:/path/to/logger.js:line
            // at /path/to/target.js:line (methodName)
            // at /path/to/target.js:line
            var stackLines = err.stack.split('\n');
            if (stackLines.length >= 4) {
                var callerLine = stackLines[2]; // 索引从0开始，第三行是实际调用位置
                // 提取文件路径和行号
                var match = callerLine.match(/at\s+(.+):(\d+)(?:\s+\(([^)]+)\))?/);
                if (match && match.length >= 3) {
                    var fileName = match[1].split('/').pop();
                    var lineNumber = match[2];
                    var functionName = match[3] || '';
                    callerInfo = " [" + fileName + ":" + lineNumber + (functionName ? " (" + functionName + ")" : "") + "]";
                }
            }
        }
    } catch (e) {
        // 如果获取堆栈信息失败，不影响日志输出
        console.error("获取调用栈信息失败:", e);
    }
    
    var logEntry = level + ": " + message + callerInfo;
    
    // 日志级别过滤
    var levels = { 'DEBUG': 0, 'INFO': 1, 'WARN': 2, 'ERROR': 3 };
    if (levels[level] < levels[this.logLevel]) {
        return;
    }
    
    // 控制台输出
    if (this.enableConsole) {
        switch (level) {
            case 'ERROR':
                console.error(logEntry);
                break;
            case 'WARN':
                console.warn(logEntry);
                break;
            default:
                console.log(logEntry);
        }
    }
    
    // 内存存储，将日志条目添加到logLines数组中
    this.logLines.push(logEntry);
    if (this.logLines.length > this.maxLogLines) {
        this.logLines.shift(); // 移除最早的日志条目
    }
    // 更新日志视图
    this.updateLogView();
    
    // 文件记录
    if (this.enableFileLog && this.logFile) {
        this.writeToFile(logEntry);
    }
};

/**
 * 更新日志视图，将内存中的日志行显示到指定的日志视图组件中
 * 
 * @param {*} logView 日志视图组件，通常是一个UI元素，如TextView
 */
Logger.prototype.updateLogView = function() {
    if (this.logView && this.logView.setText) {
        try {
            ui.run(function() {
                var currentText = this.logView.getText() || '';
                var newText = this.logLines.join('\n');
                if (currentText !== newText) {
                    this.logView.setText(newText);
                }
            }.bind(this));
        } catch (e) {
            console.error("更新日志视图失败:", e);
        }
    }
};

/**
 * 将日志条目写入日志文件
 * 
 * @param {string} logEntry 日志条目
 */
Logger.prototype.writeToFile = function(logEntry) {
    try {
        var logDir = files.dirname(this.logFile);
        files.ensureDir(logDir);
        
        var date = new Date().toISOString().split('T')[0];
        var dailyLogFile = this.logFile.replace('.log', "_" + date + ".log");
        
        files.append(dailyLogFile, logEntry + '\n');
    } catch (error) {
        console.error("写入日志文件失败:", error);
    }
};

Logger.prototype.debug = function(message) {
    this.log('DEBUG', message);
};

Logger.prototype.info = function(message) {
    this.log('INFO', message);
};

Logger.prototype.warn = function(message) {
    this.log('WARN', message);
};

Logger.prototype.error = function(message) {
    this.log('ERROR', message);
};

Logger.prototype.clear = function() {
    this.logLines = [];
    this.updateLogView();
};

/**
 * 将Logger类暴露给其他模块使用。
 * module.exports是定义模块输出的特殊对象，在这个对象上定义的属性和方法可以被其他文件通过require函数引入
 */
module.exports = Logger;