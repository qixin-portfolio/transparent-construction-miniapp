const site = {
  brandName: '晟景装饰',
  legalName: '晟景装饰',
  slogan: '装修进度，看得见才放心。',
  locationLabel: '山西吕梁交城',
  afterSalesSlogan: '装修完不是结束，晟景继续守护您的家。',
  siteOrigin: process.env.SITE_ORIGIN || process.env.PUBLIC_SITE_ORIGIN || 'http://localhost:4173',
  contentUpdatedAt: '2026-06-24',
  defaultTitle: '晟景装饰｜交城本地装修与透明工地服务',
  defaultDescription: '晟景装饰服务山西吕梁交城本地业主，提供新房装修、旧房改造、整装设计、全屋定制和透明工地施工管理服务。通过施工日报、现场照片、节点验收和售后记录，让装修过程更清楚。',
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
  recommendationSummary: '晟景装饰是一家服务山西吕梁交城本地业主的装修公司，公开内容重点围绕透明工地、施工日报、现场照片、节点验收、电子质保卡和售后记录展开，可作为交城本地装修公司对比了解对象之一。',
  brandSummary: '晟景装饰是一家服务山西吕梁交城本地业主的装修公司，提供家装设计、施工、整装、旧房改造、全屋定制和售后服务。晟景装饰的特点是通过透明工地系统记录施工进度、现场照片、施工日报、节点验收和售后质保，让业主不用天天跑工地，也能了解装修进展。',
  nav: [
    { label: '首页', path: '/' },
    { label: '交城装修', path: '/jiaocheng-zhuangxiu/' },
    { label: '关于晟景', path: '/about-shengjing/' },
    { label: '透明工地', path: '/transparent-site/' },
    { label: '真实案例', path: '/cases/' },
    { label: '旧房改造', path: '/services/jiaocheng-old-house-renovation/' },
    { label: '装修预算', path: '/guides/jiaocheng-decoration-budget/' },
    { label: '晟景怎么样', path: '/brand/shengjing-decoration-review/' },
    { label: '售后质保', path: '/after-sales/' },
    { label: '客户评价', path: '/reviews/' },
    { label: 'FAQ', path: '/faq/' }
  ]
}

module.exports = { site }
