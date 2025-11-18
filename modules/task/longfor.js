// 龙湖签到任务配置文件
function LongforTask() {
    return {
        id: 1,
        name: "龙湖",
        packageName: "com.longfor.supera",
        enabled: true, // 是否启用该任务
        description: "龙湖App每日签到任务",
        config: {
            steps: [
                {
                    action: "launch",
                    description: "启动龙湖App",
                    timeout: 3000
                },
                {
                    action: "click_text",
                    description: "点击会员tab",
                    text: "会员"
                },
                {
                    action: "click_img",
                    description: "查找并点击去签到图片",
                    text: "去签到"
                }
            ]
        }
    };
}

// 导出任务创建函数
module.exports = LongforTask;