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
                    timeout: 3000
                },
                {
                    action: "click_desc",
                    description: '点击"应用"tab',
                    desc: "应用"
                },
                {
                    action: "click_desc",
                    description: '点击"Rewards"',
                    desc: "Rewards item 1 of 6"
                },
                {
                    action: "click_text",
                    description: '签入',
                    text: "Day 1" // 如果当日未签入，text("Day 1")控件存在，否则会折叠无法找到
                },
                {               
                    action: "click_to_earn_3points_loop",
                    description: '点击可以赚取3积分的控件，直到没有可以点击的desc以" 3"收尾的控件',
                    regExp: "(.+ 3)"       
                },
                {
                    action: "click_more_activities",
                    description: '获取"更多活动"的额外积分',
                    id: "moreActivities"
                },
                {
                    action: "read_to_earn_30points",
                    description: '屏幕下滑，如果存在id("read")的控件，点击 desc("主页")控件，' + 
                                 '下滑寻找text("新闻流")控件，查看siblingCount()，如果数量 < 11，下滑一整个屏幕的距离，' +
                                 '依次对sibling进行点击，等待6s，再返回的操作',
                    id: "read", 
                    desc: "主页",
                    text: "新闻流",
                    targetSiblingCount: 11 
                }
            ]
        }
    };
}

// 导出任务创建函数
module.exports = BingTask;