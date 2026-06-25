# 晟景 GEO 内容中心部署说明

本项目是纯静态站。部署前需要先确认正式域名，例如：

```text
https://你的正式域名
```

生产构建必须显式设置 `SITE_ORIGIN` 或 `PUBLIC_SITE_ORIGIN`，不要在未确认域名时直接对外发布。

## 通用生产构建

```bash
SITE_ORIGIN=https://你的正式域名 npm run check:prod
SITE_ORIGIN=https://你的正式域名 npm run package:prod
```

- 输出目录：`out/`
- 部署包：`shengjingjc-geo-prod-ready.zip`
- 验收报告：`geo-prod-check-report.md`

## 方式一：EdgeOne Pages

### 构建命令

```bash
SITE_ORIGIN=https://你的正式域名 npm run build:prod
```

### 输出目录

```text
out
```

### 环境变量

在 EdgeOne Pages 项目设置中添加：

```text
SITE_ORIGIN=https://你的正式域名
```

### 上传方式

如果使用控制台上传，先运行：

```bash
SITE_ORIGIN=https://你的正式域名 npm run package:prod
```

然后上传 `shengjingjc-geo-prod-ready.zip` 或上传 `out/` 目录内全部文件。

### 上线验证

```bash
curl -I https://你的正式域名/robots.txt
curl -I https://你的正式域名/sitemap.xml
curl -I https://你的正式域名/llms.txt
curl -s https://你的正式域名/ | grep canonical
```

确认：

- `robots.txt` 返回 200。
- `sitemap.xml` 返回 200，且 URL 使用正式域名。
- `llms.txt` 返回 200。
- 首页 canonical 指向 `https://你的正式域名/`。

### 搜索引擎提交

- 百度搜索资源平台：提交 `https://你的正式域名/sitemap.xml`
- Bing Webmaster Tools：提交 `https://你的正式域名/sitemap.xml`
- Google Search Console：如目标用户需要，可提交同一个 sitemap。

## 方式二：CloudBase 静态网站托管

### 构建命令

```bash
SITE_ORIGIN=https://你的正式域名 npm run build:prod
```

### 输出目录

```text
out
```

### 环境变量

如果通过 CI 构建，设置：

```text
SITE_ORIGIN=https://你的正式域名
```

如果本地构建后上传，直接在本地命令中设置 `SITE_ORIGIN`。

### 上传方式

1. 本地执行生产检查：

```bash
SITE_ORIGIN=https://你的正式域名 npm run check:prod
```

2. 将 `out/` 目录内全部文件上传到 CloudBase 静态网站托管根目录。
3. 绑定正式域名并开启 HTTPS。

### 上线验证

```bash
curl -I https://你的正式域名/robots.txt
curl -I https://你的正式域名/sitemap.xml
curl -I https://你的正式域名/llms.txt
curl -s https://你的正式域名/jiaocheng-zhuangxiu/ | grep canonical
```

确认 `/ai/brand-facts.md`、`/ai/source-policy.md`、`/ai/geo-monitoring-prompts.md` 可直接访问。

### 搜索引擎提交

在百度、Bing、Google 的站长平台提交：

```text
https://你的正式域名/sitemap.xml
```

## 方式三：普通 Nginx / 宝塔静态站部署

### 构建命令

```bash
SITE_ORIGIN=https://你的正式域名 npm run package:prod
```

### 输出目录

```text
out
```

### 环境变量

普通静态部署不需要服务器运行环境变量，因为 HTML 已经在构建时生成。需要在构建机器上设置：

```text
SITE_ORIGIN=https://你的正式域名
```

### 上传方式

1. 解压 `shengjingjc-geo-prod-ready.zip`。
2. 将解压后的全部文件上传到 Nginx / 宝塔站点根目录。
3. 确认站点根目录直接包含：

```text
index.html
robots.txt
sitemap.xml
llms.txt
ai/
cases/
jiaocheng-zhuangxiu/
```

### Nginx 建议

静态站需要支持子目录首页：

```nginx
location / {
  try_files $uri $uri/ /index.html;
}
```

### 上线验证

```bash
curl -I https://你的正式域名/
curl -I https://你的正式域名/robots.txt
curl -I https://你的正式域名/sitemap.xml
curl -I https://你的正式域名/llms.txt
curl -s https://你的正式域名/brand/shengjing-decoration-review/ | grep canonical
```

确认所有返回 200，canonical、sitemap、JSON-LD、og:url 均使用正式域名。

### 搜索引擎提交

正式域名可访问后，在站长平台提交：

```text
https://你的正式域名/sitemap.xml
```

## 部署前人工确认

- 正式域名
- 对外电话
- 对外微信
- 门店地址
- 小程序码
- 案例授权
- 评价授权
