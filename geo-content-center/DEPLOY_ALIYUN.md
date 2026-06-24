# 晟景 GEO 内容中心阿里云上线说明

正式域名：`shengjingjc.cn`

## 推荐上线方案

中国大陆可访问优先使用阿里云：

1. 阿里云 OSS 静态网站托管。
2. 云解析 DNS 配置 `www.shengjingjc.cn` 和 `shengjingjc.cn`。
3. 完成 ICP 备案后，再绑定自定义域名和启用 HTTPS / CDN。

说明：

- OSS 静态网站托管适合当前 `out` 目录这种纯静态 HTML 内容中心。
- Bucket 位于中国内地时，绑定自定义域名通常需要域名完成 ICP 备案。
- CDN 如果加速区域包含中国内地，也需要 ICP 备案。
- 未备案前可以先用 OSS Bucket 默认域名临时预览，不建议长期对外传播。

## 本地构建

```bash
cd /Users/qixin/Documents/晟景AI助理/透明工地小程序/开发骨架/geo-content-center
npm run build
```

构建产物：

- `public/`
- `out/`

部署时上传 `out/` 目录内的全部文件和文件夹。

## OSS Bucket 建议

创建 Bucket 时建议：

- Bucket 名称：`shengjingjc-geo`，如被占用可用 `shengjingjc-cn` 或 `shengjingjc-site`
- 地域：华北 2（北京）或离交城较近的中国内地区域
- 存储类型：标准存储
- 读写权限：公共读
- 版本控制：MVP 阶段可不开
- 静态网站托管：开启

静态网站托管配置：

- 默认首页：`index.html`
- 子目录首页：开启
- 默认 404 页：`index.html` 或后续补充 `404.html`

子目录首页必须开启，否则 `/cases/`、`/faq/`、`/jiaocheng-zhuangxiu/` 这类路径可能无法直接访问。

## 上传文件

在 OSS 控制台进入 Bucket 后：

1. 进入“文件管理”。
2. 上传 `out/` 目录内的全部内容。
3. 保持目录结构不变，例如：
   - `index.html`
   - `jiaocheng-zhuangxiu/index.html`
   - `cases/index.html`
   - `cases/jiaocheng-authorized-case-a/index.html`
   - `assets/site.css`
   - `llms.txt`
   - `ai/faq.md`
   - `sitemap.xml`
   - `robots.txt`

## DNS 解析

备案完成并绑定 OSS 自定义域名后，在“云解析 DNS”添加：

| 主机记录 | 记录类型 | 记录值 |
|---|---|---|
| `www` | `CNAME` | OSS 控制台给出的 CNAME 地址 |
| `@` | `CNAME` 或显性 URL 转发 | 指向 `www.shengjingjc.cn` 或 OSS 控制台给出的 CNAME 地址 |

注意：

- `www` 优先作为主站域名，比较稳。
- 根域名 `@` 能否 CNAME 取决于云解析支持情况和 OSS 绑定方式；如果控制台不支持，先把 `www.shengjingjc.cn` 做主站。
- 解析记录值不要手打猜测，以 OSS“绑定域名 / CNAME”页面提示为准。

## 上线后检查

上线后依次打开：

- `https://www.shengjingjc.cn/jiaocheng-zhuangxiu/`
- `https://www.shengjingjc.cn/llms.txt`
- `https://www.shengjingjc.cn/sitemap.xml`
- `https://www.shengjingjc.cn/ai/recommendation-summary.md`
- `https://www.shengjingjc.cn/faq/`
- `https://www.shengjingjc.cn/cases/`

页面源码需要确认：

- canonical 指向 `https://shengjingjc.cn/...`
- JSON-LD 存在
- FAQ 正文不是异步渲染
- `robots.txt` 中 sitemap 指向 `https://shengjingjc.cn/sitemap.xml`

## 后续建议

1. 完成 ICP 备案。
2. 绑定 `www.shengjingjc.cn` 到 OSS。
3. 开启 HTTPS 证书。
4. 可选启用 CDN，加速区域选择中国内地时需确认备案已通过。
5. 在百度资源平台、必应站长平台提交 `sitemap.xml`。
