# 微信小程序代码包体分析

日期：2026-08-02

## 修改前事实

- 微信开发者工具上传失败的实际主包大小：`3359KB`。
- 微信主包上限：`2048KB`；本轮硬目标：`<= 1900KB`。
- `project.config.json` 的 `miniprogramRoot` 正确为 `miniprogram/`；文档、测试、截图和云函数目录均不在小程序根目录内。
- `app.json` 主包仅登记 6 个页面：公开首页、工作台、注册、项目、客户和我的；示例工地 6 个页面仅登记在 `subpackages/demo-project`。
- 没有发现小程序根目录中的 source map、测试夹具、日志、node_modules 或构建产物。根目录中存在无运行时用途的 `UI升级总览.md`（约 6KB），但不是超限主因。

## 主包静态目录体积

以 `miniprogram/` 排除 `subpackages/` 的未压缩目录体积为 `3.5MB`。主要目录如下：

| 目录 | 体积 | 说明 |
| --- | ---: | --- |
| `images/` | 3164KB | 主包图片，包含一个本应属于示例子包的图片 |
| `images/demo/` | 1976KB | 仅一张示例工地现场图 |
| `images/cases/` | 864KB | 主包和业主端案例页共同使用 |
| `pages/` | 268KB | 主包页面 |
| `utils/` | 48KB | 公共工具 |
| `custom-tab-bar/` | 20KB | tabBar 必须留在主包 |

## 主包最大 20 个文件

| 文件 | 大小 | 运行归属 |
| --- | ---: | --- |
| `images/demo/demo-electrical-stage.png` | 2021470B | 仅示例子包使用，错误留在主包 |
| `images/douyin-qrcode-weiyi.png` | 106986B | 工作台使用 |
| `images/douyin-qrcode-huxiufen.png` | 87662B | 工作台使用 |
| `images/advisor-weiyi.jpg` | 74514B | 主包门店配置使用 |
| `images/cases/case-2-cover.jpg` | 69672B | 主包/业主案例使用 |
| `images/cases/case-2-2.jpg` | 69672B | 主包/业主案例使用 |
| `images/cases/case-1-cover.jpg` | 64402B | 主包/业主案例使用 |
| `images/cases/case-1-2.jpg` | 64402B | 主包/业主案例使用 |
| `images/cases/case-4-cover.jpg` | 64209B | 主包/业主案例使用 |
| `images/cases/case-4-2.jpg` | 64209B | 主包/业主案例使用 |
| `images/cases/case-2-3.jpg` | 61083B | 主包/业主案例使用 |
| `images/cases/case-4-3.jpg` | 54054B | 主包/业主案例使用 |
| `images/cases/case-1-3.jpg` | 53887B | 主包/业主案例使用 |
| `images/advisor-huxiufen.jpg` | 51224B | 主包门店配置使用 |
| `images/cases/case-3-cover.jpg` | 50013B | 主包/业主案例使用 |
| `images/cases/case-3-2.jpg` | 50013B | 主包/业主案例使用 |
| `images/cases/case-5-3.jpg` | 49439B | 主包/业主案例使用 |
| `images/cases/case-5-cover.jpg` | 46735B | 主包/业主案例使用 |
| `images/cases/case-5-2.jpg` | 46735B | 主包/业主案例使用 |
| `images/cases/case-3-3.jpg` | 37778B | 主包/业主案例使用 |

## 子包页面与体积

| 子包 | 页面数 | 未压缩目录体积 |
| --- | ---: | ---: |
| `owner` | 16 | 356KB |
| `internal` | 12 | 448KB |
| `deal-loop` | 6 | 260KB |
| `public-access` | 1 | 16KB |
| `demo-project` | 6 | 104KB |

示例页面没有重复登记到主包，Mock 数据已在 `subpackages/demo-project/mock/`。但 Mock 数据中的三张示例照片均指向 `/images/demo/demo-electrical-stage.png`，导致这张示例专用资源落入主包。

## 安全瘦身项

| 操作 | 预计主包节省 | 风险评估 |
| --- | ---: | --- |
| 将示例专用图片移入 `subpackages/demo-project/images/` 并更新 Mock 路径 | 约 1974KB | 低：只由示例子包读取，主包不再引用 |
| 忽略根目录 `UI升级总览.md` | 约 6KB | 可选，收益不足且本轮不需要 |
| 压缩主包案例/二维码/顾问图片 | 约 0-200KB | 不执行：移动示例资源预计已足够达标，避免无必要视觉损失 |

本轮仅实施第一项。预计微信编译后的主包从 `3359KB` 降至约 `1385KB`，满足 `<= 1900KB` 硬目标；该数字必须以开发者工具实际编译结果复核。
