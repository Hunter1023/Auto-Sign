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
                /**
                 * id('sa_native_feed_list')
                 * 
                 * id: sa_native_feed_carousel_view
                 *     sa_hp_native_list_item_image_container
                 *     sa_hp_native_list_item_title
                 *     sa_hp_native_list_item_container
                 * 
                 */
                {               
                    action: "click_to_earn_3points_loop",
                    description: '点击可以赚取3积分的控件，直到没有可以点击的desc以" 3"收尾的控件',
                    regExp: "(.+ 3)"       
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