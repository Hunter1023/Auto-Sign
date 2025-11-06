"ui";

var SimpleUtils = require('./modules/utils/simple-utils.js');
var SimpleEngine = require('./modules/core/simple-engine.js');

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
                <horizontal gravity="center" margin="0 0 12 0">
                    <button id="btnStartAll" text="开始全部任务" layout_weight="1"/>
                    <button id="btnStopAll" text="停止所有任务" layout_weight="1"/>
                </horizontal>
                
                <horizontal gravity="center" margin="0 0 12 0">
                    <button id="btnSingleTest" text="单任务测试" layout_weight="1"/>
                    <button id="btnRefresh" text="刷新" layout_weight="1"/>
                </horizontal>

                {/* <!-- 测试按钮 --> */}
                <horizontal gravity="center_vertical" margin="0 0 12 0">
                    <button id="btnHealthCheck" text="健康检查" layout_weight="1"/>
                    <button id="btnEngineTest" text="引擎测试" layout_weight="1"/>
                    <button id="btnRefresh" text="刷新" layout_weight="1"/>
                </horizontal>
                
                {/* <!-- 任务列表 --> */}
                <text text="任务列表" textSize="16sp" textStyle="bold" margin="8 0"/>
                <scroll>
                    <list id="taskList">
                        <vertical padding="12" margin="4" bg="#ffffff" cornerRadius="8">
                            <horizontal gravity="center_vertical">
                                <text text="{{appName}}" textSize="16sp" layout_weight="1" textStyle="bold"/>
                                <text text="{{status}}" textColor="{{statusColor}}" textSize="14sp"/>
                            </horizontal>
                            <progressbar progress="{{progress}}" max="100" margin="8 0 4 0"/>
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
var logLines = [];
var maxLogLines = 50;
var isRunning = false;
var appConfig = null;
var simpleUtils = null;
var simpleEngine = null;

// 初始化应用
function initialize() {
    try {
        // 初始化工具和引擎
        simpleUtils = new SimpleUtils();
        simpleEngine = new SimpleEngine();

        // 加载配置
        loadConfig();
        
        // 初始化任务数据
        refreshTaskList();
        
        // 绑定事件
        bindEvents();
        
        log("应用初始化完成");
        log("工具模块和引擎初始化成功");
        updateStatus("就绪");
    } catch (e) {
        log("初始化失败: " + e.toString());
        console.error("初始化错误:", e);
    }
}

// 配置数据（内联，避免文件加载问题）
function loadConfig() {
    appConfig = {
        tasks: [
            {
                id: 1,
                name: "示例论坛",
                packageName: "com.example.bbs",
                enabled: true,
                config: {
                    steps: [
                        { action: "launch", timeout: 5000 },
                        { action: "click", selector: 'text("签到")', timeout: 3000 },
                        { action: "click", selector: 'text("立即签到")', timeout: 3000 }
                    ]
                }
            },
            {
                id: 2,
                name: "示例商城",
                packageName: "com.example.shop", 
                enabled: true,
                config: {
                    steps: [
                        { action: "launch", timeout: 5000 },
                        { action: "click", selector: 'desc("任务中心")', timeout: 3000 },
                        { action: "click", selector: 'text("领取")', timeout: 3000 }
                    ]
                }
            },
            {
                id: 3,
                name: "新闻App",
                packageName: "com.example.news",
                enabled: false,
                config: {
                    steps: [
                        { action: "launch", timeout: 5000 },
                        { action: "click", selector: 'text("我的")', timeout: 3000 },
                        { action: "click", selector: 'text("领取金币")', timeout: 3000 }
                    ]
                }
            }
        ]
    };
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
            packageName: task.packageName,
            status: '等待中',
            statusColor: '#666666',
            progress: 0,
            lastRun: '未执行'
        };
    });
    
    ui.taskList.setDataSource(taskData);
}

// 日志功能
function log(message) {
    var timestamp = new Date().toLocaleTimeString();
    var logEntry = "[" + timestamp + "] " + message;
    
    logLines.push(logEntry);
    if (logLines.length > maxLogLines) {
        logLines.shift();
    }
    
    ui.logContent.setText(logLines.join("\n"));
}

// 更新状态
function updateStatus(text) {
    ui.statusText.setText(text);
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
    
    ui.btnSingleTest.click(function() {
        if (!ensureAccessibilityService()) return;
        
        showTaskSelectionDialog();
    });
    
    ui.btnRefresh.click(function() {
        refreshTaskList();
        log("刷新任务列表");
    });
    
    ui.btnClearLog.click(function() {
        logLines = [];
        ui.logContent.setText("日志已清空");
        log("清空日志");
    });
    
    ui.taskList.on("item_click", function(item, i, itemView, listView) {
        showTaskDetail(i);
    });

    // 测试按钮事件
    ui.btnHealthCheck.click(function() {
        healthCheck();
    });
    
    ui.btnEngineTest.click(function() {
        runEngineTest();
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
    updateTaskStatus(index, "执行中", "#FF9800", 30);

    
    // 模拟任务执行（实际使用时替换为真实的任务执行逻辑）
    taskExecution(task, index).then(function() {
        // 任务完成
        updateTaskStatus(index, "完成", "#4CAF50", 100);
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


function taskExecution(task, index) {
    return new Promise(function(resolve, reject) {
        if (!isRunning) {
            reject(new Error("任务已被停止"));
            return;
        }
        
        log("开始真实执行任务: " + task.name);
        
        // 使用 SimpleEngine 执行任务
        simpleEngine.executeTask(task, function(progress, status) {
            // 更新进度回调
            var actualProgress = 20 + Math.floor(progress * 0.8); // 映射到20-100的进度范围
            updateTaskStatus(index, status, "#FF9800", actualProgress);
        }).then(function(result) {
            log("任务执行成功: " + task.name);
            resolve(result);
        }).catch(function(error) {
            log("任务执行失败: " + task.name + " - " + error);
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
function updateTaskStatus(index, status, color, progress) {
    if (index < taskData.length) {
        taskData[index].status = status;
        taskData[index].statusColor = color;
        // 确保progress以整数格式存为字符串
        taskData[index].progress = String(progress);
        taskData[index].lastRun = new Date().toLocaleTimeString();
        ui.taskList.setDataSource(taskData);
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
    
    dialogs.select("选择要测试的任务", items).then(function(index) {
        if (index >= 0) {
            testSingleTask(activeTasks[index], index);
        }
    });
}

// 测试单个任务
function testSingleTask(task, index) {
    if (isRunning) {
        log("有其他任务正在运行，请等待完成");
        return;
    }
    
    isRunning = true;
    log("开始测试单任务: " + task.name);
    updateStatus("测试中: " + task.name);
    
    updateTaskStatus(index, "测试中", "#FF9800", 30);
    
    simulateTaskExecution(task, index).then(function() {
        updateTaskStatus(index, "测试完成", "#4CAF50", 100);
        log("单任务测试完成: " + task.name);
        updateStatus("测试完成");
        isRunning = false;
    }).catch(function(error) {
        updateTaskStatus(index, "测试失败", "#F44336", 0);
        log("单任务测试失败: " + task.name + " - " + error);
        updateStatus("测试失败");
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
        positive: "测试运行",
        negative: "关闭",
        neutral: "禁用任务"
    }).on("positive", function() {
        testSingleTask(task, index);
    }).on("neutral", function() {
        task.enabled = false;
        refreshTaskList();
        log("已禁用任务: " + task.name);
    }).show();
}

// 模块健康检查
function healthCheck() {
    return new Promise(function(resolve) {
        log("开始模块健康检查...");
        
        var checks = [];
        
        // 检查 SimpleUtils
        if (simpleUtils) {
            checks.push("✓ SimpleUtils 加载正常");
            
            // 测试 sleep 功能
            simpleUtils.sleep(100).then(function() {
                log("✓ SimpleUtils.sleep() 工作正常");
            }).catch(function(e) {
                log("✗ SimpleUtils.sleep() 测试失败: " + e);
            });
        } else {
            checks.push("✗ SimpleUtils 加载失败");
        }
        
        // 检查 SimpleEngine
        if (simpleEngine) {
            checks.push("✓ SimpleEngine 加载正常");
        } else {
            checks.push("✗ SimpleEngine 加载失败");
        }
        
        // 显示检查结果
        setTimeout(function() {
            checks.forEach(function(check) {
                log(check);
            });
            
            // 测试工具函数
            testUtilsFunctions();
            
            log("健康检查完成");
            resolve();
        }, 500);
    });
}

// 测试工具函数
function testUtilsFunctions() {
    log("测试工具函数...");
    
    // 测试 findElement 函数
    simpleUtils.findElement('text("设置")', 2000).then(function(element) {
        if (element) {
            log("✓ findElement() 工作正常 - 找到元素");
        } else {
            log("⚠ findElement() 工作正常 - 未找到元素（这可能正常）");
        }
    }).catch(function(e) {
        log("✗ findElement() 测试失败: " + e);
    });
}

// 引擎功能测试
function runEngineTest() {
    if (!ensureAccessibilityService()) return;
    
    log("开始引擎功能测试...");
    
    var testTask = {
        name: "引擎功能测试",
        packageName: "com.android.settings", // 使用系统设置进行测试
        config: {
            steps: [
                { 
                    action: "launch", 
                    description: "启动设置应用",
                    params: { timeout: 3000 }
                },
                { 
                    action: "wait_exists", 
                    description: "等待设置界面加载",
                    params: { selector: 'text("设置") || text("Settings")', timeout: 5000 }
                },
                { 
                    action: "sleep", 
                    description: "短暂停留确认界面",
                    params: { duration: 1000 }
                }
            ]
        }
    };
    
    updateStatus("引擎测试中");
    
    simpleEngine.executeTask(testTask, function(progress, status) {
        log("引擎测试进度: " + progress + "%, 状态: " + status);
    }).then(function() {
        log("✓ 引擎测试通过 - 基本功能正常");
        updateStatus("引擎测试通过");

        // 测试完成后返回到 AutoJs6 应用
        setTimeout(function() {
            returnToAutoJs6();
        }, 1500);
    }).catch(function(error) {
        log("✗ 引擎测试失败: " + error);
        updateStatus("引擎测试失败");
    });
}

function returnToAutoJs6() {
    try {
        // 尝试多次按返回键回到上一个应用
        for (var i = 0; i < 5; i++) {
            back();
            sleep(500);
            
            // 检查当前应用是否是 AutoJs6
            if (currentPackage() === autoJs6PackageName) {
                log("✓ 通过返回键成功回到 AutoJs6");
                return;
            }
        }
        log("⚠ 通过返回键未能回到 AutoJs6");
    } catch (e) {
        log("使用返回键失败: " + e);
    }
}

setupUI();
initialize();