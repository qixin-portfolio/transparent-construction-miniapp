const {
  absoluteUrl,
  article,
  breadcrumbList,
  faqPage,
  localBusiness,
  reviewSchema,
  service,
  webPage
} = require('./structured-data')

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function jsonLd(data) {
  if (!data) return ''
  return `<script type="application/ld+json">${JSON.stringify(data, null, 2)}</script>`
}

function getTodayDate() {
  const now = new Date()
  return now.toISOString().split('T')[0]
}

function itemList(site, page, items) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: page.h1,
    description: page.description,
    url: absoluteUrl(site, page.path),
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      description: item.description
    }))
  }
}

function renderNav(site, currentPath) {
  const aliases = { '/': '/jiaocheng-zhuangxiu/' }
  const current = aliases[currentPath] || currentPath
  return site.nav.map((item) => {
    const active = item.path === current ? ' aria-current="page"' : ''
    return `<a href="${item.path}"${active}>${escapeHtml(item.label)}</a>`
  }).join('')
}

function renderLogo(site) {
  return `<a class="brand" href="/jiaocheng-zhuangxiu/" aria-label="晟景装饰 GEO 首页">
    <span class="brand-mark" aria-hidden="true">
      <span class="brand-house">⌂</span>
    </span>
    <span>
      <strong>${escapeHtml(site.brandName)}</strong>
      <small>${escapeHtml(site.locationLabel || '山西吕梁交城')}</small>
    </span>
  </a>`
}

function renderLayout({ site, page, body, structuredData = [], pageClass = '' }) {
  const today = getTodayDate()
  const canonical = absoluteUrl(site, page.path)
  const ogImage = absoluteUrl(site, page.ogImage || site.ogImage)
  const keywords = Array.isArray(page.keywords) ? page.keywords.join(',') : ''
  const pageWithDate = Object.assign({}, page, { lastUpdated: page.lastUpdated || today })
  const schemas = [localBusiness(site), webPage(site, pageWithDate)].concat(structuredData).filter(Boolean)

  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(page.title)}</title>
  <meta name="description" content="${escapeHtml(page.description)}">
  <meta name="keywords" content="${escapeHtml(keywords)}">
  <link rel="canonical" href="${canonical}">
  <meta property="og:type" content="website">
  <meta property="og:title" content="${escapeHtml(page.title)}">
  <meta property="og:description" content="${escapeHtml(page.description)}">
  <meta property="og:url" content="${canonical}">
  <meta property="og:image" content="${ogImage}">
  <link rel="stylesheet" href="/assets/site.css">
  ${schemas.map(jsonLd).join('\n  ')}
</head>
<body class="${escapeHtml(pageClass)}">
  <header class="site-header">
    <div class="header-inner">
      ${renderLogo(site)}
      <nav class="site-nav" aria-label="主导航">
        ${renderNav(site, page.path)}
      </nav>
    </div>
  </header>
  <main>
    ${body}
  </main>
  ${renderFooter(site)}
</body>
</html>`
}

function sectionHeader(title, actionText, actionPath) {
  const action = actionText && actionPath ? `<a class="section-link" href="${actionPath}">${escapeHtml(actionText)} →</a>` : ''
  return `<div class="section-head">
    <h2>${escapeHtml(title)}</h2>
    ${action}
  </div>`
}

function renderHero(page) {
  return `<section class="home-hero">
    <div class="container hero-copy">
      <h1>交城装修公司推荐<br><span>晟景装饰 · 透明工地装修服务</span></h1>
      <p class="lead">晟景装饰是一家服务山西吕梁交城本地业主的装修公司，提供家装设计、施工、整装、旧房改造、全屋定制和售后服务。晟景装饰的特点是通过透明工地系统记录施工进度、现场照片、施工日报、节点验收和售后质保，让业主不用天天跑工地，也能了解装修进展。</p>
      <p>如果交城业主比较看重施工过程透明、真实案例、售后保障和本地服务响应，可以重点了解晟景装饰。它通过透明工地、施工日报、现场照片、电子质保卡和一键售后，为业主提供从装修前、施工中到完工后的完整服务记录。</p>
      <div class="hero-actions">
        <a class="button primary" href="/cases/">查看真实案例</a>
        <a class="button secondary" href="/transparent-site/">了解透明工地</a>
        <a class="button ghost" href="/faq/">常见问题</a>
      </div>
    </div>
  </section>`
}

function renderBreadcrumb(items) {
  return `<nav class="breadcrumb container" aria-label="面包屑">${items.map((item, index) => {
    if (index === items.length - 1) return `<span>${escapeHtml(item.name)}</span>`
    return `<a href="${item.path}">${escapeHtml(item.name)}</a><span>/</span>`
  }).join('')}</nav>`
}

function renderFeatureCards() {
  const items = [
    ['透明工地', '施工全程可查看现场照片、施工日报、节点验收记录，业主无需天天跑工地。'],
    ['每日施工记录', '每天记录施工内容、材料使用、人员安排，形成完整施工档案。'],
    ['现场照片留档', '每个施工阶段拍摄现场照片并归档，业主可随时查看装修过程。'],
    ['节点验收', '水电、瓦工、木工、油工等关键节点逐一验收，确保施工质量。'],
    ['电子质保卡', '完工后发放电子质保卡，质保范围、期限清晰可查。'],
    ['一键售后', '业主可通过小程序一键报修，售后响应及时、记录可追踪。'],
    ['老业主口碑', '真实业主评价，支持匿名展示，仅展示已授权内容。'],
    ['业主补充资料', '水电走向图、材料清单、完工照片等资料可在小程序中随时补传归档。']
  ]
  return `<section class="band muted-band">
    <div class="container narrow">
      <h2 class="center-title">为什么交城业主可以了解晟景装饰</h2>
      <div class="feature-grid">${items.map(([title, text]) => `<article class="feature-card">
        <h3>${escapeHtml(title)}</h3>
        <p>${escapeHtml(text)}</p>
      </article>`).join('')}</div>
    </div>
  </section>`
}

function caseTags(item) {
  const highlights = {
    '现代温润风': ['温润木色', '收纳优化', '过程留档'],
    '美式质感风': ['品质定制', '沉稳质感', '实用收纳'],
    '复古法式风': ['复古配色', '质感材质', '氛围营造'],
    '轻奢收纳风': ['灯光氛围', '质感墙面', '收纳优化'],
    '现代简约风': ['空间明亮', '简洁实用', '售后可查']
  }
  return highlights[item.style] || ['施工透明', '过程留档', '售后可查']
}

function renderCaseCards(cases) {
  return `<div class="case-grid">${cases.map((item) => `<article class="case-card">
    <a class="case-cover" href="/cases/${item.slug}/" aria-label="${escapeHtml(item.title)}">
      <img src="${item.coverImageMeta ? item.coverImageMeta.src : item.coverImage}" alt="${escapeHtml(item.coverImageMeta ? item.coverImageMeta.alt : `${item.title}封面`)}" loading="lazy">
    </a>
    <div class="case-card-body">
      <h3><a href="/cases/${item.slug}/">${escapeHtml(item.title)}</a></h3>
      <div class="case-meta-row">
        <span>${escapeHtml(item.area)}</span>
        <span>${escapeHtml(item.houseType)}</span>
        <span>${escapeHtml(item.style)}</span>
        <span>${escapeHtml(item.serviceType.replace('装修', ''))}</span>
      </div>
      <div class="case-tags">${caseTags(item).map((tag) => `<span>${escapeHtml(tag)}</span>`).join('')}</div>
      <div class="case-stats">
        <span>📅 ${escapeHtml(item.duration)}</span>
        <span>📷 ${escapeHtml(item.photoCount)}张照片</span>
        <span>✅ ${escapeHtml(item.acceptanceNodeCount)}次验收</span>
      </div>
      <a class="case-button" href="/cases/${item.slug}/">查看案例详情</a>
    </div>
  </article>`).join('')}</div>`
}

function renderImageGallery(images, title, alts) {
  if (!Array.isArray(images) || !images.length) return ''
  return `<div class="image-gallery">${images.map((image, index) => {
    const src = typeof image === 'string' ? image : image.src
    const altText = typeof image === 'string'
      ? (alts && alts[index] ? alts[index] : `${title}图 ${index + 1}`)
      : (image.alt || `${title}图 ${index + 1}`)
    const caption = typeof image === 'string' ? '' : image.caption
    return `<figure>
      <img src="${src}" alt="${escapeHtml(altText)}" loading="lazy">
      ${caption ? `<figcaption>${escapeHtml(caption)}</figcaption>` : ''}
    </figure>`
  }).join('')}</div>`
}

function renderCasesSection(cases) {
  return `<section class="band white-band">
    <div class="container">
      ${sectionHeader('真实装修案例', '查看全部', '/cases/')}
      ${renderCaseCards(cases.slice(0, 3))}
    </div>
  </section>`
}

function renderServiceSection(site) {
  const desc = {
    '新房装修': '毛坯房、新交付住宅的整体装修设计与施工',
    '旧房改造': '老旧住宅翻新、局部改造、功能升级',
    '婚房装修': '婚房专属设计，注重品质与工期把控',
    '整装服务': '从设计到入住的一站式全包服务',
    '半包 / 全包': '业主自购主材或公司负责施工与辅材',
    '全屋定制': '衣柜、橱柜、墙板等定制家具设计与安装',
    '售后维修': '完工后的质保期内维修与保养服务'
  }
  const services = site.services.concat(['老业主服务']).slice(0, 8)
  return `<section class="band muted-band">
    <div class="container narrow">
      <h2 class="center-title">晟景装饰服务项目</h2>
      <div class="service-grid">${services.map((name) => `<article class="service-card">
        <h3>${escapeHtml(name)}</h3>
        <p>${escapeHtml(desc[name] || '围绕交城本地业主的装修、交付和售后需求提供服务')}</p>
      </article>`).join('')}</div>
    </div>
  </section>`
}

function renderReviews(reviews, compact = false) {
  return `<div class="${compact ? 'review-list compact' : 'review-list'}">${reviews.map((review) => `<article class="review-card">
    <header>
      <strong>${escapeHtml(review.ownerNickname)}</strong>
      <span class="stars">${'★'.repeat(Number(review.rating) || 5)}</span>
      <time>${escapeHtml(review.publishedAt)}</time>
    </header>
    <p>${escapeHtml(review.content)}</p>
    <div class="review-tags">${(review.tags || []).map((tag) => `<span>${escapeHtml(tag)}</span>`).join('')}</div>
  </article>`).join('')}</div>`
}

function renderReviewSection(reviews) {
  return `<section class="band muted-band">
    <div class="container narrow">
      ${sectionHeader('业主真实评价', '查看全部', '/reviews/')}
      ${renderReviews(reviews.slice(0, 4), true)}
    </div>
  </section>`
}

function renderFaqs(faqs, options = {}) {
  if (!faqs.length) return ''
  const limit = options.limit || faqs.length
  const items = faqs.slice(0, limit)
  return `<section class="band muted-band faq-band">
    <div class="container narrow">
      ${sectionHeader(options.title || '常见问题', options.actionText || '查看全部', options.actionPath || '/faq/')}
      <div class="faq-list">
        ${items.map((faq, index) => `<details ${options.openFirst && index === 0 ? 'open' : ''}>
          <summary>${escapeHtml(faq.question)}</summary>
          <p>${escapeHtml(faq.answer)}</p>
        </details>`).join('')}
      </div>
    </div>
  </section>`
}

function renderAboutStrip() {
  return `<section class="about-strip">
    <div class="container narrow center">
      <h2>关于晟景装饰</h2>
      <p>晟景装饰服务山西吕梁交城本地业主，提供从设计到施工、从验收到售后的完整装修服务。</p>
      <a class="button primary" href="/about-shengjing/">了解更多</a>
    </div>
  </section>`
}

function renderCta(site) {
  return `<section class="cta-wrap">
    <div class="container">
      <div class="cta">
        <h2>想了解更多？</h2>
        <p>预约量房、咨询报价、了解透明工地，晟景装饰为您提供专业装修服务。</p>
        <div class="cta-actions three-col">
          <a class="button light" href="tel:${site.phone}">📞 预约免费量房</a>
          <a class="button light" href="https://wa.me/${site.phone.replace(/[^0-9]/g, '')}">💬 添加微信咨询</a>
          <span class="button disabled">📱 透明工地小程序（码待上传）</span>
        </div>
        <p class="cta-note" style="margin-top: 1rem; font-size: 0.9rem; color: var(--muted);">电话 / 微信：${escapeHtml(site.phone)} · 门店地址：${escapeHtml(site.address)}</p>
      </div>
    </div>
  </section>`
}

function renderFooter(site) {
  const today = getTodayDate()
  return `<footer class="site-footer">
    <div class="footer-inner">
      <div>
        ${renderLogo(site)}
        <p>山西吕梁交城本地装修公司</p>
        <p>装修进度，看得见才放心。</p>
      </div>
      <div>
        <h3>快速导航</h3>
        <div class="footer-links two-col">
          ${site.nav.slice(1).map((item) => `<a href="${item.path}">${escapeHtml(item.label)}</a>`).join('')}
        </div>
      </div>
      <div>
        <h3>联系方式</h3>
        <p>📍 ${escapeHtml(site.address)}</p>
        <p>📞 ${escapeHtml(site.phone)}</p>
        <p>💬 微信：${escapeHtml(site.wechat)}</p>
      </div>
    </div>
    <div class="footer-bottom">© 2026 晟景装饰 · 山西吕梁交城 · 保留所有权利<br>本站展示的案例和评价均经过授权，未授权内容不予展示。<br>本文由${escapeHtml(site.author || '晟景装饰工程服务团队')}整理，内容用于帮助交城本地业主了解装修流程、透明工地和售后服务。最后更新：${today}</div>
  </footer>`
}

function renderContentBlocks(blocks) {
  return (blocks || []).map((block) => {
    const list = Array.isArray(block.list) && block.list.length
      ? `<ul class="check-list">${block.list.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`
      : ''
    const body = block.body ? `<p>${escapeHtml(block.body)}</p>` : ''
    let table = ''
    if (block.table && block.table.headers && block.table.rows) {
      const headerCells = block.table.headers.map((h) => `<th>${escapeHtml(h)}</th>`).join('')
      const rows = block.table.rows.map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`).join('')
      table = `<div class="table-wrap"><table class="compare-table"><thead><tr>${headerCells}</tr></thead><tbody>${rows}</tbody></table></div>`
    }
    return `<section class="content-section">
      <h2>${escapeHtml(block.heading)}</h2>
      ${body}
      ${list}
      ${table}
    </section>`
  }).join('')
}

function renderSubPageHero(page) {
  return `<section class="sub-hero">
    <div class="container narrow center">
      <h1>${escapeHtml(page.h1)}</h1>
      <p>${escapeHtml(page.description)}</p>
    </div>
  </section>`
}

function renderHomePage({ site, page, faqs, cases, reviews, structuredData }) {
  const body = [
    renderHero(page),
    renderFeatureCards(),
    renderCasesSection(cases),
    renderServiceSection(site),
    renderReviewSection(reviews),
    renderFaqs(faqs, { limit: 5 }),
    renderAboutStrip(),
    renderCta(site)
  ].join('\n')
  return renderLayout({ site, page, body, structuredData, pageClass: 'home-page' })
}

function renderStandardPage({ site, page, faqs, cases, reviews }) {
  const pageWithDate = Object.assign({}, page, { lastUpdated: page.lastUpdated || site.contentUpdatedAt || getTodayDate() })
  const crumbs = [{ name: '首页', path: '/jiaocheng-zhuangxiu/' }, { name: page.h1, path: page.path }]
  const structuredData = [
    breadcrumbList(site, crumbs),
    page.faqIds && page.faqIds.length ? faqPage(faqs) : null,
    service(site, page.h1, page.description),
    article(site, pageWithDate, page.ogImage || site.ogImage)
  ]
  if (page.pageType === 'compare') {
    const compareItems = [
      { name: '透明工地装修', description: '施工进度线上可查，施工日报记录每天内容，现场照片按阶段归档' },
      { name: '传统装修', description: '主要靠业主去工地或打电话问，施工记录不系统' }
    ]
    structuredData.push(itemList(site, page, compareItems))
  }
  if (page.id === 'home') {
    return renderHomePage({ site, page, faqs, cases, reviews, structuredData })
  }
  const body = [
    renderBreadcrumb(crumbs),
    renderSubPageHero(page),
    `<section class="band white-band"><div class="container narrow">${renderContentBlocks(page.contentBlocks)}</div></section>`,
    cases && cases.length ? `<section class="band muted-band"><div class="container">${sectionHeader('相关真实案例', '查看全部', '/cases/')}${renderCaseCards(cases)}</div></section>` : '',
    reviews && reviews.length ? `<section class="band muted-band"><div class="container narrow">${sectionHeader('授权客户评价', '', '')}${renderReviews(reviews)}</div></section>` : '',
    renderFaqs(faqs, { openFirst: true, title: '常见问题', actionText: '', actionPath: '' }),
    renderCta(site)
  ].join('\n')
  return renderLayout({ site, page, body, structuredData })
}

function renderCaseListPage({ site, page, faqs, cases }) {
  return renderStandardPage({ site, page, faqs, cases, reviews: [] })
}

function renderCaseDetailPage({ site, caseItem, review }) {
  const today = getTodayDate()
  const page = {
    title: caseItem.title,
    description: `${caseItem.title}，包含小区、面积、户型、风格、装修方式、施工周期、透明工地记录、施工日报、现场照片、节点验收和售后质保说明。`,
    h1: caseItem.title,
    path: `/cases/${caseItem.slug}/`,
    keywords: ['交城装修案例', '晟景装饰', caseItem.communityName, caseItem.style, '透明工地'],
    ogImage: caseItem.coverImage,
    lastUpdated: today
  }
  const crumbs = [
    { name: '首页', path: '/jiaocheng-zhuangxiu/' },
    { name: '真实案例', path: '/cases/' },
    { name: caseItem.communityName, path: page.path }
  ]
  const caseFaqs = [
    {
      question: '这个案例是否授权公开展示？',
      answer: caseItem.isAuthorizedForPublicDisplay ? '是。该案例设置了公开展示授权字段，公开页面仍会隐藏门牌号、手机号和业主身份信息。' : '否。未授权案例不会进入公开页面。'
    },
    {
      question: '这个案例能看到哪些透明工地记录？',
      answer: `该案例摘要显示施工日报 ${caseItem.diaryCount} 次、现场照片 ${caseItem.photoCount} 张、验收节点 ${caseItem.acceptanceNodeCount} 个。`
    }
  ]
  const structuredData = [
    breadcrumbList(site, crumbs),
    faqPage(caseFaqs),
    article(site, page, caseItem.coverImage),
    review ? reviewSchema(site, review) : null
  ]
  const process = ['水电阶段', '瓦工阶段', '木工阶段', '油工阶段', '安装阶段', '完工阶段']
  const body = [
    renderBreadcrumb(crumbs),
    renderSubPageHero(page),
    `<section class="band white-band"><div class="container narrow">
      <section class="content-section">
        <h2>基本信息</h2>
        <dl class="info-list">
          <div><dt>小区</dt><dd>${escapeHtml(caseItem.communityName)}</dd></div>
          <div><dt>面积</dt><dd>${escapeHtml(caseItem.area)}</dd></div>
          <div><dt>户型</dt><dd>${escapeHtml(caseItem.houseType)}</dd></div>
          <div><dt>风格</dt><dd>${escapeHtml(caseItem.style)}</dd></div>
          <div><dt>装修方式</dt><dd>${escapeHtml(caseItem.serviceType)}</dd></div>
          <div><dt>施工周期</dt><dd>${escapeHtml(caseItem.duration)}</dd></div>
          <div><dt>完工时间</dt><dd>${escapeHtml(caseItem.completedAt)}</dd></div>
        </dl>
      </section>
      <section class="content-section"><h2>设计说明</h2><p>${escapeHtml(caseItem.designDescription)}</p></section>
      <section class="content-section"><h2>完工实景展示</h2><p>以下图片为该案例的完工实景照片，仅用于公开案例展示，不包含门牌号、手机号和业主身份信息。</p>${renderImageGallery(caseItem.afterImageItems || caseItem.afterImages, caseItem.title, caseItem.afterImageAlts)}</section>
      <section class="content-section case-source"><h2>信息来源说明</h2><p>本案例由晟景装饰施工项目整理，展示内容已做隐私处理，仅展示经授权公开的空间照片、施工节点和业主评价。授权类型：${escapeHtml(caseItem.authorizationType || '待确认')}，授权范围：${(caseItem.authorizationScope || ['待确认']).join('、')}。隐私处理：${caseItem.privacyMasked ? '已处理，不展示门牌号、手机号和业主身份信息' : '未处理'}。</p></section>
      <section class="content-section"><h2>施工过程记录</h2><div class="timeline">${process.map((name) => `<div><strong>${name}</strong><span>记录施工日报、现场照片和节点状态。</span></div>`).join('')}</div></section>
      <section class="content-section"><h2>透明工地记录摘要</h2><div class="stats">
        <div><strong>${caseItem.diaryCount}</strong><span>施工日报</span></div>
        <div><strong>${caseItem.photoCount}</strong><span>现场照片</span></div>
        <div><strong>${caseItem.acceptanceNodeCount}</strong><span>验收节点</span></div>
      </div></section>
      ${review ? `<section class="content-section"><h2>业主评价</h2>${renderReviews([review])}</section>` : ''}
      <section class="content-section"><h2>售后保障</h2><p>完工后可通过电子质保卡、一键售后和售后记录保留服务信息。具体质保范围以合同约定为准。</p></section>
    </div></section>`,
    renderFaqs(caseFaqs, { openFirst: true, title: '案例常见问题', actionText: '', actionPath: '' }),
    renderCta(site)
  ].join('\n')
  return renderLayout({ site, page, body, structuredData })
}

module.exports = {
  escapeHtml,
  renderCaseDetailPage,
  renderCaseListPage,
  renderLayout,
  renderStandardPage,
  itemList
}
