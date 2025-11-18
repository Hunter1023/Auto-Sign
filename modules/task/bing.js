// 必应搜索任务配置文件
function BingTask() {
    return {
        id: 1,
        name: "必应搜索",
        packageName: "com.microsoft.bing",
        enabled: true, // 是否启用该任务
        description: "必应App每日签入、搜索、阅读等任务",
        config: {
            steps: [
                {
                    action: "launch",
                    description: "启动必应App",
                    params: { timeout: 3000 }
                },
                {
                    action: "click_desc",
                    description: "点击\"应用\"tab",
                    params: { selector: 'desc("应用")', timeout: 3000 }
                },
                {
                    action: "click_desc",
                    description: "点击\"Rewards\"",
                    params: { selector: 'desc("Rewards item 1 of 6")', timeout: 5000 }
                },
                {               
                    action: "click_to_earn_3points_loop",
                    description: "点击可以赚取3积分的控件，直到没有可以点击的desc以\" 3\"收尾的控件",
                    params: { selector: 'desc(/(.+ 3)/)' }       
                }

                /** 2. 阅读以赚取：屏幕下滑，存在 id("read") 的控件，就点击 desc("主页")控件，
                 * 进行30个阅读：
                 *  
                 */

                /**
                 * 定位额外任务：id("moreActivities")控件如果存在View子控件，说明是未做的任务，
                 * 找到 text("Complete activities to earn xx points"), clickable: true 的控件
                 * 点击，等待2s后返回，重复至无View子控件
                 */
            ]
        }
    };
}

// 导出任务创建函数
module.exports = BingTask;