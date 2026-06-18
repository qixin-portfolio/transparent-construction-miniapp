const DEMO_MODE = false

const demoProjects = [
  {
    _id: 'demo-project-1',
    name: '万硕花园 128㎡ 施工中',
    address: '交城县 万硕花园',
    currentStage: '水电验收',
    progress: 40,
    status: '施工中'
  }
]

const demoCustomers = [
  {
    _id: 'demo-customer-1',
    name: '张先生',
    phone: '13800000000',
    source: '抖音',
    stage: '咨询',
    dealStatus: '未成交'
  }
]

const demoLogs = [
  {
    _id: 'demo-log-1',
    projectName: '万硕花园 128㎡ 施工中',
    stage: '水电验收',
    workContent: '今天完成水电管线复核，重点检查厨房和卫生间点位。',
    reviewStatus: 'pending',
    ownerVisible: false,
    photos: []
  }
]

module.exports = {
  DEMO_MODE,
  demoProjects,
  demoCustomers,
  demoLogs
}
