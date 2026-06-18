// ========================================
// 景门店展示配置
// ========================================
// 业主端「工地」Tab 改造为门店展示页
// 修改以下信息后点「编译」即可生效，无需部署云函数
// ========================================

// 抖音账号（点击复制抖音号，引导搜索关注）
const douyinAccounts = [
  {
    name: '维意定制（交城晟景装饰）',
    douyinId: '2183898177',
    desc: '晟景官方账号｜交城装修·维意定制·完工案例',
    avatarColor: '#0F6A4A'
  },
  {
    name: '晟景装饰胡秀芬',
    douyinId: '2048934208',
    desc: '老板娘个人号｜装修避坑·选材讲解·工地实拍',
    avatarColor: '#c4593c'
  }
]

// 门店信息
const storeInfo = {
  name: '晟景装饰',
  address: '山西省交城县南环路康健装饰广场',
  phone: '13935842860',
  hours: '8:30 - 18:30（周一至周日）',
  // 经纬度用于点击导航（交城康健装饰广场，可后续微调）
  latitude: 37.5588,
  longitude: 112.1553
}

// 完工案例
// image 字段填云存储 fileID 或本地路径
// 现阶段先用占位，拿到真实照片后替换
const showcaseCases = [
  {
    title: '万硕花园 · 意式轻奢婚房',
    area: '128㎡ 三室两厅',
    style: '意式轻奢',
    budget: '硬装约 12 万',
    highlight: '无主灯设计 + 全屋墙板 + 智能家居，年轻夫妻的婚房首选。',
    image: ''
  },
  {
    title: '公园里 · 新中式',
    area: '148㎡ 四室两厅',
    style: '新中式',
    budget: '硬装约 15 万',
    highlight: '木色柜体 + 山水背景墙 + 书房规划，传统文化与现代生活动线结合。',
    image: ''
  },
  {
    title: '万硕花园 · 经典美式',
    area: '四卧改善型',
    style: '经典美式',
    budget: '硬装约 18 万',
    highlight: '罗马柱 + 全屋定制 + 中央空调，复杂造型与品质并重。',
    image: ''
  }
]

// 联系顾问（业主绑定的业务员信息，由 getOwnerProject 返回时填充）
// 这里放默认信息
const contactInfo = {
  name: '晟景装饰',
  phone: '13935842860',
  wechat: '13935842860'
}

module.exports = {
  douyinAccounts,
  storeInfo,
  showcaseCases,
  contactInfo
}
