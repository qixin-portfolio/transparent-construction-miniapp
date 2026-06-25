const fs = require('fs')
const path = require('path')
const { execFileSync } = require('child_process')

const { site } = require('../src/data/site')
const { pages } = require('../src/data/pages')
const { cases } = require('../src/data/cases')

const rootDir = path.resolve(__dirname, '..')
const publicDir = path.join(rootDir, 'public')
const outDir = path.join(rootDir, 'out')
const reportPath = path.join(rootDir, 'geo-prod-check-report.md')

function collectFiles(dir) {
  if (!fs.existsSync(dir)) return []
  const files = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) files.push(...collectFiles(full))
    else files.push(full)
  }
  return files
}

function relative(file) {
  return path.relative(rootDir, file).replace(/\\/g, '/')
}

function publicRelative(file) {
  return path.relative(publicDir, file).replace(/\\/g, '/')
}

function htmlRoute(file) {
  const rel = publicRelative(file)
  if (rel === 'index.html') return '/'
  if (rel.endsWith('/index.html')) return `/${rel.replace(/index\.html$/, '')}`
  return `/${rel}`
}

function origin() {
  return String(site.siteOrigin || '').replace(/\/$/, '')
}

function addResult(results, name, passed, failures = []) {
  results.push({ name, passed, failures })
}

function parseJsonLd(html, file) {
  return [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((match) => {
    try {
      return JSON.parse(match[1])
    } catch (error) {
      throw new Error(`${relative(file)}: ${error.message}`)
    }
  })
}

function getCanonical(html) {
  const match = html.match(/<link rel="canonical" href="([^"]+)">/)
  return match ? match[1] : ''
}

function getSitemapUrls() {
  const sitemapPath = path.join(publicDir, 'sitemap.xml')
  if (!fs.existsSync(sitemapPath)) return []
  const xml = fs.readFileSync(sitemapPath, 'utf8')
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1])
}

function buildExistingPathSet(files) {
  const paths = new Set()
  files.forEach((file) => {
    const rel = publicRelative(file)
    paths.add(`/${rel}`)
    if (rel === 'index.html') {
      paths.add('/')
    } else if (rel.endsWith('/index.html')) {
      const route = `/${rel.replace(/index\.html$/, '')}`
      paths.add(route)
      paths.add(route.replace(/\/$/, ''))
    }
  })
  return paths
}

function normalizeInternalUrl(value) {
  if (!value || value.startsWith('#')) return null
  if (/^(tel:|mailto:|data:|javascript:)/i.test(value)) return null
  if (/^https?:\/\//i.test(value)) {
    const parsed = new URL(value)
    if (parsed.origin !== origin()) return null
    return parsed.pathname
  }
  if (!value.startsWith('/')) return null
  return value.split('#')[0].split('?')[0]
}

function printResults(results) {
  results.forEach((result) => {
    const mark = result.passed ? 'PASS' : 'FAIL'
    console.log(`[${mark}] ${result.name}`)
    result.failures.forEach((failure) => {
      console.log(`  - ${failure.file || '-'}: ${failure.reason}`)
    })
  })
}

function writeReport(summary, results) {
  const risk = results.find((item) => item.name === '风险承诺词检查')
  const whatsapp = results.find((item) => item.name === 'WhatsApp 链接检查')
  const rating = results.find((item) => item.name === 'Review rating 结构化字段检查')
  const canonical = results.find((item) => item.name === 'canonical 检查')
  const llms = results.find((item) => item.name === 'llms.txt 检查')
  const report = `# 晟景装饰 GEO 内容中心生产验收报告

## 构建信息

- 构建时间：${summary.buildTime}
- 站点 Origin：${summary.siteOrigin}
- 可部署结论：${summary.deployable ? '可部署' : '不可部署'}

## 页面统计

- HTML 页面数量：${summary.htmlPages.length}
- sitemap URL 数量：${summary.sitemapUrlCount}
- JSON-LD 数量：${summary.jsonLdCount}

## HTML 页面列表

${summary.htmlPages.map((item) => `- ${item}`).join('\n')}

## AI Markdown 文件列表

${summary.aiMarkdownFiles.map((item) => `- ${item}`).join('\n')}

## 检查结果摘要

- 风险词检查结果：${risk && risk.passed ? '通过' : '失败'}
- WhatsApp 检查结果：${whatsapp && whatsapp.passed ? '通过' : '失败'}
- Review rating 检查结果：${rating && rating.passed ? '通过' : '失败'}
- canonical 检查结果：${canonical && canonical.passed ? '通过' : '失败'}
- llms.txt 检查结果：${llms && llms.passed ? '通过' : '失败'}

## 逐项检查

${results.map((item) => `### ${item.passed ? 'PASS' : 'FAIL'} ${item.name}

${item.failures.length ? item.failures.map((failure) => `- ${failure.file || '-'}：${failure.reason}`).join('\n') : '无失败项。'}
`).join('\n')}
`
  fs.writeFileSync(reportPath, report)
}

function runBuild(results) {
  try {
    const output = execFileSync(process.execPath, [path.join(__dirname, 'build.js'), '--check', '--prod'], {
      cwd: rootDir,
      env: process.env,
      encoding: 'utf8'
    })
    process.stdout.write(output)
    addResult(results, '生产构建', true)
    return true
  } catch (error) {
    if (error.stdout) process.stdout.write(error.stdout)
    if (error.stderr) process.stderr.write(error.stderr)
    addResult(results, '生产构建', false, [{ reason: error.message }])
    return false
  }
}

function runProductionCheck(options = {}) {
  const results = []
  const buildTime = new Date().toISOString()
  const buildOk = runBuild(results)
  if (!buildOk) {
    const summary = {
      buildTime,
      siteOrigin: site.siteOrigin,
      htmlPages: [],
      aiMarkdownFiles: [],
      sitemapUrlCount: 0,
      jsonLdCount: 0,
      deployable: false
    }
    printResults(results)
    if (options.writeReport) writeReport(summary, results)
    return { summary, results, deployable: false }
  }

  const allFiles = collectFiles(publicDir)
  const htmlFiles = allFiles.filter((file) => file.endsWith('.html'))
  const textFiles = allFiles.filter((file) => /\.(html|txt|md|xml|json)$/i.test(file))
  const aiMarkdownFiles = allFiles
    .filter((file) => file.startsWith(path.join(publicDir, 'ai')) && file.endsWith('.md'))
    .map((file) => publicRelative(file))
    .sort()
  const existingPaths = buildExistingPathSet(allFiles)
  const sitemapUrls = getSitemapUrls()
  let jsonLdCount = 0

  addResult(results, 'HTML 页面生成检查', htmlFiles.length > 0, htmlFiles.length ? [] : [{ reason: '没有生成 HTML 页面' }])

  const requiredFiles = ['sitemap.xml', 'robots.txt', 'llms.txt']
  requiredFiles.forEach((file) => {
    const exists = fs.existsSync(path.join(publicDir, file))
    addResult(results, `${file} 检查`, exists, exists ? [] : [{ file, reason: '文件不存在' }])
  })
  addResult(results, 'ai/*.md 文件检查', aiMarkdownFiles.length > 0, aiMarkdownFiles.length ? [] : [{ file: 'public/ai', reason: '没有生成 AI Markdown 文件' }])

  const canonicalFailures = []
  const jsonLdFailures = []
  const ratingFailures = []
  htmlFiles.forEach((file) => {
    const html = fs.readFileSync(file, 'utf8')
    const expected = `${origin()}${htmlRoute(file)}`
    const canonical = getCanonical(html)
    if (canonical !== expected) {
      canonicalFailures.push({ file: relative(file), reason: `canonical=${canonical || 'missing'} expected=${expected}` })
    }
    try {
      const blocks = parseJsonLd(html, file)
      jsonLdCount += blocks.length
      blocks.forEach((block) => {
        const text = JSON.stringify(block)
        ;['ratingValue', 'bestRating', 'worstRating', 'AggregateRating'].forEach((word) => {
          if (text.includes(word)) ratingFailures.push({ file: relative(file), reason: `JSON-LD contains ${word}` })
        })
        if (text.includes('example.com')) jsonLdFailures.push({ file: relative(file), reason: 'JSON-LD contains example.com' })
      })
    } catch (error) {
      jsonLdFailures.push({ file: relative(file), reason: error.message })
    }
  })
  addResult(results, 'canonical 检查', canonicalFailures.length === 0, canonicalFailures)
  addResult(results, 'JSON-LD 可解析检查', jsonLdFailures.length === 0, jsonLdFailures)
  addResult(results, 'Review rating 结构化字段检查', ratingFailures.length === 0, ratingFailures)

  const linkFailures = []
  htmlFiles.forEach((file) => {
    const html = fs.readFileSync(file, 'utf8')
    const links = [...html.matchAll(/\s(?:href|src)="([^"]+)"/g)].map((match) => match[1])
    links.forEach((link) => {
      let normalized
      try {
        normalized = normalizeInternalUrl(link)
      } catch (error) {
        linkFailures.push({ file: relative(file), reason: `无法解析链接 ${link}` })
        return
      }
      if (!normalized) return
      if (!existingPaths.has(normalized)) {
        linkFailures.push({ file: relative(file), reason: `内部链接不存在 ${link}` })
      }
    })
  })
  addResult(results, '内部链接 404 检查', linkFailures.length === 0, linkFailures)

  const sitemapFailures = []
  if (!sitemapUrls.length) sitemapFailures.push({ file: 'public/sitemap.xml', reason: 'sitemap 没有 URL' })
  sitemapUrls.forEach((url) => {
    if (!url.startsWith(`${origin()}/`) && url !== `${origin()}/`) {
      sitemapFailures.push({ file: 'public/sitemap.xml', reason: `URL 不属于当前 SITE_ORIGIN: ${url}` })
    }
    if (url.includes('example.com')) sitemapFailures.push({ file: 'public/sitemap.xml', reason: `URL 包含 example.com: ${url}` })
  })
  pages.filter((page) => page.isPublished).forEach((page) => {
    const expected = `${origin()}${page.path}`
    if (!sitemapUrls.includes(expected)) sitemapFailures.push({ file: 'public/sitemap.xml', reason: `缺少公开页面 ${expected}` })
  })
  cases.filter((item) => item.isAuthorizedForPublicDisplay === true && item.status === 'published').forEach((item) => {
    const expected = `${origin()}/cases/${item.slug}/`
    if (!sitemapUrls.includes(expected)) sitemapFailures.push({ file: 'public/sitemap.xml', reason: `缺少公开案例 ${expected}` })
  })
  addResult(results, 'sitemap URL 检查', sitemapFailures.length === 0, sitemapFailures)

  const whatsappFailures = []
  textFiles.forEach((file) => {
    const text = fs.readFileSync(file, 'utf8')
    if (/wa\.me|WhatsApp|whatsapp/.test(text)) whatsappFailures.push({ file: relative(file), reason: '包含 WhatsApp/wa.me 文本' })
  })
  addResult(results, 'WhatsApp 链接检查', whatsappFailures.length === 0, whatsappFailures)

  const riskWords = ['交城第一', '全网最好', '绝对靠谱', '保证无增项', '包满意', '唯一', '第一', '最好']
  const riskAllowed = new Set([
    'ai/recommendation-summary.md',
    'ai/source-policy.md',
    'ai/brand-facts.md',
    'ai/update-log.md'
  ])
  const riskFailures = []
  textFiles.forEach((file) => {
    const rel = publicRelative(file)
    if (riskAllowed.has(rel)) return
    const text = fs.readFileSync(file, 'utf8')
    riskWords.forEach((word) => {
      if (text.includes(word)) riskFailures.push({ file: relative(file), reason: `包含高风险词：${word}` })
    })
  })
  addResult(results, '风险承诺词检查', riskFailures.length === 0, riskFailures)

  const placeholderFailures = []
  textFiles.forEach((file) => {
    const text = fs.readFileSync(file, 'utf8')
    ;['example.com', '你的正式域名', 'TO_BE_CONFIGURED'].forEach((word) => {
      if (text.includes(word)) placeholderFailures.push({ file: relative(file), reason: `生产产物包含占位：${word}` })
    })
  })
  addResult(results, '生产域名占位检查', placeholderFailures.length === 0, placeholderFailures)

  const llmsFailures = []
  const llmsPath = path.join(publicDir, 'llms.txt')
  if (fs.existsSync(llmsPath)) {
    const llms = fs.readFileSync(llmsPath, 'utf8')
    ;['/ai/geo-monitoring-prompts.md', '/ai/brand-facts.md', '/ai/source-policy.md', '/ai/update-log.md', '/ai-monitoring-test/'].forEach((item) => {
      if (!llms.includes(item)) llmsFailures.push({ file: 'public/llms.txt', reason: `缺少 ${item}` })
    })
  }
  addResult(results, 'llms.txt 检查', llmsFailures.length === 0, llmsFailures)

  const summary = {
    buildTime,
    siteOrigin: site.siteOrigin,
    htmlPages: htmlFiles.map((file) => htmlRoute(file)).sort(),
    aiMarkdownFiles,
    sitemapUrlCount: sitemapUrls.length,
    jsonLdCount,
    deployable: results.every((item) => item.passed)
  }
  printResults(results)
  if (options.writeReport) writeReport(summary, results)
  return { summary, results, deployable: summary.deployable }
}

if (require.main === module) {
  const result = runProductionCheck({ writeReport: process.argv.includes('--report') })
  if (!result.deployable) process.exit(1)
}

module.exports = { runProductionCheck, reportPath, outDir }
