const demoProject = {
  name: '示例工地',
  layout: '120㎡三室两厅',
  stage: '水电施工',
  progress: 35,
  progressText: '水电定位、开槽和管线铺设正在进行',
  stages: [
    { name: '开工交底', status: '已完成', done: true },
    { name: '拆改与放线', status: '已完成', done: true },
    { name: '水电施工', status: '进行中', active: true },
    { name: '泥木施工', status: '待开始' },
    { name: '竣工交付', status: '待开始' }
  ],
  logs: [
    { date: '6月24日', title: '水电定位完成', body: '厨房、卫生间和卧室点位已与设计图核对，现场保护已铺设。', photos: 2 },
    { date: '6月26日', title: '墙面开槽进行中', body: '按定位线完成客厅和卧室部分开槽，强弱电分开布置。', photos: 3 },
    { date: '6月28日', title: '水路管线铺设', body: '冷热水管试压前安装完成，下一步进行打压检查。', photos: 3 }
  ],
  photos: [
    { title: '客餐厅强弱电布线', stage: '水电施工', url: '/subpackages/demo-project/images/demo-electrical-stage.png' },
    { title: '厨房水路预留', stage: '水电施工', url: '/subpackages/demo-project/images/demo-electrical-stage.png' },
    { title: '卧室开关点位', stage: '水电施工', url: '/subpackages/demo-project/images/demo-electrical-stage.png' }
  ],
  designConfirmation: {
    title: '厨房插座点位确认',
    body: '油烟机、冰箱和小家电插座位置已按设计方案预留。',
    status: '待业主确认',
    note: '示例中不提交真实确认结果。'
  },
  issue: {
    title: '卫生间闭水前检查',
    body: '防水施工前需复核下水管口高度与地漏位置。',
    status: '待处理',
    note: '项目经理将在下一施工节点前完成检查。'
  }
}

module.exports = { demoProject }
