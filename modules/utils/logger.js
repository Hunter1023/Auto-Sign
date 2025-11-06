// modules/utils/logger.js
function Logger() {
    this.logView = null;
    this.maxLogLines = 100;
    this.logLines = [];
    this.logLevel = 'INFO'; // DEBUG, INFO, WARN, ERROR
    this.enableConsole = true;
    this.enableFileLog = false;
    this.logFile = null;
}

Logger.prototype.setLogView = function(logView) {
    this.logView = logView;
    this.updateLogView();
};

Logger.prototype.setLogLevel = function(level) {
    var levels = ['DEBUG', 'INFO', 'WARN', 'ERROR'];
    if (levels.indexOf(level) !== -1) {
        this.logLevel = level;
    }
};

Logger.prototype.enableFileLogging = function(enable, filePath) {
    this.enableFileLog = enable;
    if (enable && filePath) {
        this.logFile = filePath;
        files.ensureDir(filePath);
    }
};

Logger.prototype.log = function(level, message) {
    var timestamp = new Date().toLocaleTimeString();
    var logEntry = "[" + timestamp + "] " + level + ": " + message;
    
    // 等级过滤
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
    
    // 内存存储
    this.logLines.push(logEntry);
    if (this.logLines.length > this.maxLogLines) {
        this.logLines.shift();
    }
    
    // 界面更新
    this.updateLogView();
    
    // 文件记录
    if (this.enableFileLog && this.logFile) {
        this.writeToFile(logEntry);
    }
};

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

Logger.prototype.getLogs = function() {
    return this.logLines.join('\n');
};

Logger.prototype.getRecentLogs = function(count) {
    count = count || 10;
    return this.logLines.slice(-count).join('\n');
};

Logger.prototype.time = function(label) {
    if (this.logLevel === 'DEBUG') {
        console.time(label);
    }
};

Logger.prototype.timeEnd = function(label) {
    if (this.logLevel === 'DEBUG') {
        console.timeEnd(label);
    }
};

module.exports = Logger;