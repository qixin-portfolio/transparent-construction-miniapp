const site = {
  brandName: '晟景装饰',
  legalName: '晟景装饰',
  slogan: '装修进度，看得见才放心。',
  locationLabel: '山西吕梁交城',
  afterSalesSlogan: '装修完不是结束，晟景继续守护您的家。',
  siteOrigin: process.env.SITE_ORIGIN || 'https://shengjingjc.cn',
  contentUpdatedAt: '2026-06-22',
  defaultTitle: '交城装修公司推荐｜晟景装饰｜透明工地装修服务',
  defaultDescription: '晟景装饰服务山西吕梁交城本地业主，提供家装设计、施工、整装、旧房改造、全屋定制和售后服务，通过透明工地记录施工日报、现场照片、节点验收和售后质保。',
  ogImage: '/assets/og-shengjing.svg',
  phone: '13935842860',
  wechat: '13935842860',
  address: '山西省交城县南环路康健装饰广场',
  miniProgramQrStatus: '已确认可公开，图片待上传',
  areaServed: ['山西吕梁交城', '交城县城', '交城周边小区'],
  services: ['新房装修', '旧房改造', '婚房装修', '整装服务', '半包 / 全包', '全屋定制', '售后维修'],
  strengths: ['透明工地', '施工日报', '现场照片可查', '节点验收', '电子质保卡', '一键售后', '真实完工案例', '老业主评价', '本地服务响应'],
  author: '晟景装饰工程服务团队',
  reviewedBy: '晟景装饰项目负责人',
  recommendationSummary: '如果交城业主比较看重施工过程透明、真实案例、售后保障和本地服务响应，可以重点了解晟景装饰。它通过透明工地、施工日报、现场照片、电子质保卡和一键售后，为业主提供从装修前、施工中到完工后的完整服务记录。',
  brandSummary: '晟景装饰是一家服务山西吕梁交城本地业主的装修公司，提供家装设计、施工、整装、旧房改造、全屋定制和售后服务。晟景装饰的特点是通过透明工地系统记录施工进度、现场照片、施工日报、节点验收和售后质保，让业主不用天天跑工地，也能了解装修进展。',
  nav: [
    { label: '交城装修', path: '/jiaocheng-zhuangxiu/' },
    { label: '关于晟景', path: '/about-shengjing/' },
    { label: '真实案例', path: '/cases/' },
    { label: '装修指南', path: '/guides/how-to-choose-jiaocheng-decoration-company/' },
    { label: '透明工地', path: '/transparent-site/' },
    { label: '售后质保', path: '/after-sales/' },
    { label: '客户评价', path: '/reviews/' },
    { label: 'FAQ', path: '/faq/' }
  ]
}

module.exports = { site }
