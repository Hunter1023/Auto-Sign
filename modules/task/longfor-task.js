// 龙湖签到任务配置文件
function createLongforTask() {
    return {
        id: 1,
        name: "龙湖",
        packageName: "com.longfor.supera",
        enabled: true,
        description: "龙湖App每日签到任务",
        config: {
            launchTimeout: 8000,
            steps: [
                {
                    action: "launch",
                    description: "启动龙湖App",
                    params: { timeout: 3000 }
                },
                {
                    action: "wait_click",
                    description: "点击会员tab",
                    params: { selector: 'text("会员")', timeout: 3000 }
                },
                {
                    action: "click_img",
                    description: "查找并点击去签到图片",
                    params: { selector: '"去签到"', timeout: 5000 }
                }
            ]
        }
    };
}

// 导出任务创建函数
module.exports = createLongforTask;