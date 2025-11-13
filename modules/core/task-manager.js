var Logger = require('../utils/logger.js');
var logger = new Logger();

function TaskManager() {
    this.tasks = this.loadTasks(); 
}

/**
 * 加载所有任务
 * @returns {Array} 任务数组
 */
TaskManager.prototype.loadTasks = function() {
    var tasks = [];
    try {
        // 获取所有任务文件，期望task目录下所有文件的格式都是xxx.js
        var taskFiles = files.listDir(files.path('modules/task/'));                                                                                                            
        taskFiles.forEach(function(fileName) {  
            try {                   
                // 引入任务文件
                var Task = require(files.path('modules/task/') + fileName);
                var task = new Task();
                if (task.enabled) {
                    tasks.push(task);
                }
            } catch (e) {
                logger.error("加载任务失败:" + e.message);
            }
        });
    } catch (e) {
        console.error("获取所有任务文件失败:" + e.message);
    }
    return tasks;
}; 

/**
 * 获取所有任务
 * @returns {Array} 任务数组
 */
TaskManager.prototype.getTasks = function() {
    return this.tasks;
};

module.exports = new TaskManager();