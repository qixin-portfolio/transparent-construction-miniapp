# 晟景 GEO 内容中心 MVP

这是独立静态内容中心，只服务 GEO / AEO / SEO 公开内容，不接入现有微信小程序、云函数和数据库。

## 目录

- `src/data`：品牌、案例、评价、FAQ 和页面 mock 数据。
- `src/lib`：HTML 模板和 JSON-LD 结构化数据。
- `src/styles`：静态页面样式。
- `scripts/build.js`：生成 `public` 并执行基础内容校验。
- `public`：构建产物，可部署到任意静态站托管。
- `out`：与 `public` 内容相同，方便使用 `npx serve out -p 3000` 预览。

## 命令

```bash
npm run build
npm run serve
```

正式域名构建：

```bash
SITE_ORIGIN=https://shengjingjc.com npm run build
```

也可以使用：

```bash
pnpm install
pnpm build
npx serve out -p 3000
```

本地访问：

```text
运行 `npm run serve` 后，在浏览器打开本机 4173 端口下的：
/jiaocheng-zhuangxiu/
/llms.txt
/ai/faq.md
```

## 上线前需要确认

- 正式域名已确认为 `https://shengjingjc.com`，构建时会生成对应 canonical、sitemap、OG 和 JSON-LD。
- 电话、微信、门店地址已确认可公开展示。
- 5 个案例素材已确认具备公开授权，页面保留 `isAuthorizedForPublicDisplay` 字段。
- 案例小区名、面积、风格、完工时间尚未按真实资料复核，当前公开页统一做模糊展示。
- 小程序码已确认可公开，图片文件仍需上传。
- 如接入后台，继续沿用 `isAuthorizedForPublicDisplay` 授权字段。

## 内容原则

- 只展示授权案例和授权评价。
- 不公开门牌号、业主联系方式、业主真实姓名和身份信息。
- 不使用无法证明的排名或承诺型表达。
- 多使用事实词：透明工地、施工日报、现场照片、节点验收、电子质保卡、售后记录。
