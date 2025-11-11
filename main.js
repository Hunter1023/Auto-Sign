"ui";

var SimpleUtils = require('./modules/utils/simple-utils.js');
var SimpleEngine = require('./modules/core/simple-engine.js');
var Logger = require('./modules/utils/logger.js');

// 第一步：基础UI布局
function setupUI() {
    ui.layout(
        <frame>
            <vertical padding="16" bg="#f0f0f0">
                {/* <!-- 标题栏 --> */}
                <horizontal gravity="center" bg="#2196F3" padding="12" cornerRadius="8" margin="0 0 16 0">
                    <text text="多应用自动签到" textSize="20sp" textColor="white" textStyle="bold"/>
                </horizontal>
                
                {/* <!-- 控制按钮 --> */}
                <horizontal layout_width="match_parent" margin="0 0 12 0">
                    <button id="btnStartAll" text="开始全部任务" layout_weight="1" layout_width="0dp" gravity="center"/>
                    <button id="btnStopAll" text="停止所有任务" layout_weight="1" layout_width="0dp" gravity="center"/>
                </horizontal>
                
                <horizontal layout_width="match_parent" margin="0 0 12 0">
                    <button id="btnSingleTask" text="开始指定任务" layout_weight="1" layout_width="0dp" gravity="center"/>
                    <button id="btnRefresh" text="刷新" layout_weight="1" layout_width="0dp" gravity="center"/>
                </horizontal>
                
                {/* <!-- 任务列表 --> */}
                <text text="任务列表" textSize="16sp" textStyle="bold" margin="8 0"/>
                <scroll>
                    <list id="taskList">
                        <vertical padding="12" margin="4" bg="#ffffff" cornerRadius="8">
                            <horizontal gravity="center_vertical">
                                <text text="{{appName}}" textSize="16sp" layout_weight="1" textStyle="bold"/>
                                <text text="{{status}}" textColor="{{statusColor}}" textSize="14sp" marginLeft="16dp"/>
                            </horizontal>
                            {/* <progressbar progress="{{progress}}" max="100" margin="8 0 4 0"/> */}
                            <horizontal>
                                <text text="{{lastRun}}" textSize="11sp" textColor="#999999"/>
                            </horizontal>
                        </vertical>
                    </list>
                </scroll>
                
                {/* <!-- 运行日志 --> */}
                <vertical bg="#ffffff" cornerRadius="8" padding="12" margin="8 0">
                    <horizontal gravity="center_vertical">
                        <text text="运行日志" textSize="14sp" textStyle="bold" layout_weight="1"/>
                        <button id="btnClearLog" text="清空" w="60" h="30" textSize="10sp"/>
                    </horizontal>
                    <scroll h="120" bg="#f8f8f8" cornerRadius="4" padding="8">
                        <text id="logContent" text="应用初始化中..." textSize="12sp"/>
                    </scroll>
                </vertical>
                
                {/* <!-- 状态栏 --> */}
                <horizontal gravity="center_vertical" margin="8 0 0 0">
                    <text id="statusText" text="就绪" textSize="12sp" textColor="#666666" layout_weight="1"/>
                    <text text="v1.0.0" textSize="10sp" textColor="#999999"/>
                </horizontal>
            </vertical>
        </frame>
    );
}


// 第二步：基础功能实现
var taskData = [];
var isRunning = false;
var appConfig = null;
var simpleUtils = null;
var simpleEngine = null;
var logger = null;

// 初始化应用
function initialize() {
    try {
        // 初始化日志系统
        logger = new Logger();
        logger.setLogView(ui.logContent);
        logger.setLogLevel('INFO');
        
        // 初始化工具和引擎
        simpleUtils = new SimpleUtils();
        simpleEngine = new SimpleEngine();

        // 加载配置
        loadConfig();
        
        // 初始化任务数据
        refreshTaskList();
        
        // 绑定事件
        bindEvents();
        
        logger.info("应用初始化完成");
        logger.info("工具模块和引擎初始化成功");
        updateStatus("就绪");
    } catch (e) {
        logger.error("初始化失败: " + e.toString());
        console.error("初始化错误:", e);
    }
}

// 加载外部配置文件
function loadConfig() {
    try {
        logger.info("正在加载配置文件...");
        var AppConfigClass = require('./modules/config/app-config.js');
        var configInstance = new AppConfigClass();
        appConfig = {
            tasks: configInstance.getActiveTasks(),
            settings: configInstance.getSettings()
        };
        logger.info("配置文件加载成功，共加载 " + (appConfig.tasks ? appConfig.tasks.length : 0) + " 个任务");
    } catch (e) {
        logger.error("配置文件加载失败: " + e.toString());
        console.error("配置加载错误:", e);
        
        // 如果配置加载失败，使用默认任务
        logger.warn("使用默认任务配置");
        appConfig = {
            tasks: [
                {
                    id: 1,
                    name: "示例任务",
                    packageName: "com.example.app",
                    enabled: true,
                    config: { steps: [] }
                }
            ]
        };
    }
}

// 刷新任务列表
function refreshTaskList() {
    if (!appConfig || !appConfig.tasks) {
        log("配置加载失败，使用默认任务");
        // 如果配置加载失败，使用默认任务
        appConfig = {
            tasks: [
                {
                    id: 1,
                    name: "示例任务",
                    packageName: "com.example.app",
                    enabled: true,
                    config: { steps: [] }
                }
            ]
        };
    }
    
    // 筛选出 enabled 属性为 true 的任务
    var tasks = appConfig.tasks.filter(function(task) {
        return task.enabled;
    });
    
    taskData = tasks.map(function(task) {
        return {
            appName: task.name,
            status: '等待中',
            statusColor: '#666666',
            // progress: String(60),
            lastRun: '未执行'
        };
    });
    
    ui.taskList.setDataSource(taskData);
}

// 日志功能（使用Logger类）
function log(message) {
    logger.info(message);
}

// 更新状态
function updateStatus(text) {
    // 确保在UI线程中更新UI
    ui.run(function() {
        ui.statusText.setText(text);
    });
}

// 绑定事件
function bindEvents() {
    ui.btnStartAll.click(function() {
        if (!ensureAccessibilityService()) return;
        
        if (isRunning) {
            log("任务正在运行中，请等待完成");
            return;
        }
        
        startAllTasks();
    });
    
    ui.btnStopAll.click(function() {
        stopAllTasks();
    });
    
    ui.btnSingleTask.click(function() {
        if (!ensureAccessibilityService()) return;
        
        showTaskSelectionDialog();
    });
    
    ui.btnRefresh.click(function() {
        refreshTaskList();
        log("刷新任务列表");
    });
    
    ui.btnClearLog.click(function() {
        logger.clear();
        logger.info("清空日志");
    });
    
    ui.taskList.on("item_click", function(item, i, itemView, listView) {
        showTaskDetail(i);
    });
}

// 检查无障碍服务
function ensureAccessibilityService() {
    if (!auto.service) {
        alert("无障碍服务未开启", 
            "请先开启AutoJs6的无障碍服务\n\n" +
            "设置->无障碍->AutoJs6->开启服务\n\n" +
            "开启后请重新运行脚本。"
        );
        return false;
    }
    return true;
}

// 开始所有任务
function startAllTasks() {
    isRunning = true;
    log("开始执行所有签到任务");
    updateStatus("执行中...");
    
    var activeTasks = appConfig.tasks.filter(function(task) {
        return task.enabled;
    });
    
    if (activeTasks.length === 0) {
        log("没有启用的任务");
        updateStatus("无任务");
        isRunning = false;
        return;
    }
    
    executeTasksSequentially(activeTasks, 0);
}

// 顺序执行任务
function executeTasksSequentially(tasks, index) {
    if (index >= tasks.length || !isRunning) {
        isRunning = false;
        updateStatus("完成");
        log("所有任务执行完成");
        return;
    }
    
    var task = tasks[index];
    log("开始任务: " + task.name);
    
    // 更新任务状态为执行中
    updateTaskStatus(index, "执行中", "#FF9800");

    taskExecution(task).then(function() {
        // 任务完成
        updateTaskStatus(index, "完成", "#4CAF50");
        log("任务完成: " + task.name);
        
        // 执行下一个任务
        setTimeout(function() {
            executeTasksSequentially(tasks, index + 1);
        }, 2000);
    }).catch(function(error) {
        // 任务失败
        updateTaskStatus(index, "失败", "#F44336", 0);
        log("任务失败: " + task.name + " - " + error);
        
        // 继续执行下一个任务
        setTimeout(function() {
            executeTasksSequentially(tasks, index + 1);
        }, 2000);
    });
}


function taskExecution(task) {
    return new Promise(function(resolve, reject) {
        if (!isRunning) {
            reject(new Error("任务已被停止"));
            return;
        }
        // 使用 SimpleEngine 执行任务
        simpleEngine.executeTask(task).then(function(result) {
            log("任务执行成功: " + task.name);
            sleep(2000);
            // 获取应用名称（通过包名）
            var appName = app.getAppName(currentPackage());
            // 打开最近任务列表
            recents();
            killAppMethod(appName);
            returnToAutoJs6();
            resolve(result);
        }).catch(function(error) {
            log("任务执行失败: " + task.name + " - " + error);
            // 获取应用名称（通过包名）
            var appName = app.getAppName(currentPackage());
            // 打开最近任务列表
            recents();
            killAppMethod(appName);
            returnToAutoJs6();
            reject(error);
        });
    });
}

// 停止所有任务
function stopAllTasks() {
    if (!isRunning) {
        log("没有正在运行的任务");
        return;
    }
    
    isRunning = false;
    log("正在停止所有任务...");
    updateStatus("已停止");
    
    // 更新所有正在执行的任务状态
    for (var i = 0; i < taskData.length; i++) {
        if (taskData[i].status === "执行中" || taskData[i].status.startsWith("步骤")) {
            updateTaskStatus(i, "已停止", "#FF5722", 50);
        }
    }
}

// 更新任务状态
function updateTaskStatus(index, status, color) {
    if (index < taskData.length) {
        // 更新数据模型（可以在任何线程执行）
        taskData[index].status = status;
        taskData[index].statusColor = color;
        taskData[index].lastRun = new Date().toLocaleTimeString();
        
        // 确保在UI线程中更新UI
        ui.run(function() {
            ui.taskList.setDataSource(taskData);
        });
    }
}

// 显示任务选择对话框
function showTaskSelectionDialog() {
    var activeTasks = appConfig.tasks.filter(function(task) {
        return task.enabled;
    });
    
    if (activeTasks.length === 0) {
        alert("提示", "没有启用的任务");
        return;
    }
    
    var items = activeTasks.map(function(task) {
        return task.name + " (" + task.packageName + ")";
    });
    
    dialogs.select("选择要执行的任务", items).then(function(index) {
        if (index >= 0) {
            executeSingleTask(activeTasks[index], index);
        }
    });
}

// 执行单个任务
function executeSingleTask(task, index) {
    if (isRunning) {
        log("有其他任务正在运行，请等待完成");
        return;
    }
    
    isRunning = true;
    updateStatus("测试中: " + task.name);
    
    updateTaskStatus(index, "执行中", "#FF9800");
    
    taskExecution(task, index).then(function() {
        updateTaskStatus(index, "执行完成", "#4CAF50");
        log("单任务执行完成: " + task.name);
        log("返回 AutoJs6 界面...");
        returnToAutoJs6();
        updateStatus("执行完成");
        isRunning = false;
    }).catch(function(error) {
        updateTaskStatus(index, "执行失败", "#F44336");
        log("单任务执行失败: " + task.name + " - " + error);
        log("返回 AutoJs6 界面...");
        returnToAutoJs6();
        updateStatus("执行失败");
        isRunning = false;
    });
}

// 显示任务详情
function showTaskDetail(index) {
    var tasks = appConfig.tasks.filter(function(task) {
        return task.enabled;
    });
    
    if (index >= tasks.length) return;
    
    var task = tasks[index];
    var currentStatus = taskData[index];
    
    dialogs.build({
        title: task.name,
        content: "包名: " + task.packageName + "\n" +
                "状态: " + currentStatus.status + "\n" +
                "步骤数: " + task.config.steps.length + "\n" +
                "最后执行: " + currentStatus.lastRun,
        positive: "执行运行",
        negative: "关闭",
        neutral: "禁用任务"
    }).on("positive", function() {
        executeSingleTask(task, index);
    }).on("neutral", function() {
        task.enabled = false;
        refreshTaskList();
        log("已禁用任务: " + task.name);
    }).show();
}

// 通过最近任务列表滑动关闭应用的方法
function killAppMethod(name) {
    try {
        log("通过最近任务列表滑动关闭应用: " + name);
        sleep(1000);
        
        // 查找目标应用卡片
        var appCard = desc(name + ",未加锁").findOne(1000);
        var bounds = appCard.bounds();
        log("找到应用卡片，执行滑动操作");
        // 从应用卡片中心滑动到屏幕右侧
        swipe(bounds.centerX(), bounds.centerY(), device.width, bounds.centerY(), 300);
        sleep(1000);
        log("成功通过最近任务列表滑动关闭应用");
        return true;
    } catch (error) {
        log("通过最近任务列表滑动关闭应用失败: " + error);
        try {
            home(); // 尝试返回桌面
            sleep(1000);
        } catch (e) {
            log("返回桌面失败: " + e);
        }
        return false;
    }
}

function returnToAutoJs6() {
    log("尝试关闭当前应用并返回 AutoJs6 界面");
    // 通过最近任务列表滑动关闭应用
    if (typeof recents === 'function') {
        // 在最近任务列表中查找AutoJs6
        var autoJsCard = desc("AutoJs6,未加锁").findOne(2000);
        if (autoJsCard) {
            log("找到 AutoJs6 在最近任务列表中，尝试点击打开");
            autoJsCard.click();
            sleep(1000);
            
            // 检查是否成功打开AutoJs6
            if (currentPackage() === "org.autojs.autojs6") {
                log("✓ 通过最近任务列表成功打开 AutoJs6");
                return;
            } else {
                log("点击最近任务列表中的AutoJs6失败，尝试其他方式");
            }
        } else {
            log("在最近任务列表中未找到 AutoJs6");
        }
    }
}

setupUI();
initialize();