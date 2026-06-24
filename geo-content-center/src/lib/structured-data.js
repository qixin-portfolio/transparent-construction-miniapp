function absoluteUrl(site, path) {
  const base = String(site.siteOrigin || '').replace(/\/$/, '')
  const cleanPath = path && path.startsWith('/') ? path : `/${path || ''}`
  return `${base}${cleanPath}`
}

function localBusiness(site) {
  return {
    '@context': 'https://schema.org',
    '@type': ['LocalBusiness', 'HomeAndConstructionBusiness'],
    '@id': `${absoluteUrl(site, '/') }#localbusiness`,
    name: site.brandName,
    legalName: site.legalName,
    description: site.defaultDescription,
    url: absoluteUrl(site, '/jiaocheng-zhuangxiu/'),
    telephone: site.phone,
    image: absoluteUrl(site, site.ogImage),
    address: {
      '@type': 'PostalAddress',
      streetAddress: site.address,
      addressLocality: '交城县',
      addressRegion: '山西省吕梁市',
      addressCountry: 'CN'
    },
    areaServed: site.areaServed.map((name) => ({ '@type': 'Place', name })),
    makesOffer: site.services.map((name) => ({
      '@type': 'Offer',
      itemOffered: {
        '@type': 'Service',
        name,
        areaServed: '山西吕梁交城'
      }
    }))
  }
}

function breadcrumbList(site, items) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: absoluteUrl(site, item.path)
    }))
  }
}

function webPage(site, page) {
  const dateMod = page.lastUpdated || page.datePublished || site.contentUpdatedAt
  const result = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: page.title,
    headline: page.h1,
    description: page.description,
    url: absoluteUrl(site, page.path),
    inLanguage: 'zh-CN',
    author: {
      '@type': 'Organization',
      name: site.author || site.brandName
    },
    reviewedBy: {
      '@type': 'Organization',
      name: site.reviewedBy || site.brandName
    },
    about: {
      '@id': `${absoluteUrl(site, '/') }#localbusiness`
    }
  }
  if (dateMod) result.dateModified = dateMod
  return result
}

function faqPage(faqs) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer
      }
    }))
  }
}

function service(site, name, description) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name,
    description,
    provider: {
      '@id': `${absoluteUrl(site, '/') }#localbusiness`,
      name: site.brandName
    },
    areaServed: site.areaServed.map((area) => ({ '@type': 'Place', name: area }))
  }
}

function reviewSchema(site, review) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Review',
    reviewBody: review.content,
    datePublished: review.publishedAt,
    author: {
      '@type': 'Person',
      name: review.isAnonymous ? review.ownerNickname : '授权业主'
    },
    reviewRating: {
      '@type': 'Rating',
      ratingValue: review.rating,
      bestRating: 5,
      worstRating: 1
    },
    itemReviewed: {
      '@id': `${absoluteUrl(site, '/') }#localbusiness`,
      name: site.brandName
    }
  }
}

function article(site, page, imagePath) {
  const dateMod = page.lastUpdated || page.datePublished || site.contentUpdatedAt
  const result = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: page.h1,
    description: page.description,
    image: absoluteUrl(site, imagePath || site.ogImage),
    author: {
      '@type': 'Organization',
      name: site.author || site.brandName
    },
    publisher: {
      '@type': 'Organization',
      name: site.brandName
    },
    reviewedBy: {
      '@type': 'Organization',
      name: site.reviewedBy || site.brandName
    },
    mainEntityOfPage: absoluteUrl(site, page.path),
    inLanguage: 'zh-CN'
  }
  if (dateMod) result.dateModified = dateMod
  return result
}

module.exports = {
  absoluteUrl,
  article,
  breadcrumbList,
  faqPage,
  localBusiness,
  reviewSchema,
  service,
  webPage
}
