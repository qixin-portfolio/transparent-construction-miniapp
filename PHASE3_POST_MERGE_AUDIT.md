# SaaS Phase 3 合并后审计

## 1. 当前状态

- 当前分支：`master`
- 最新 commit：`812b9c9 merge: SaaS phase3 manual plan admin and entry routing`
- Phase 3 tag：`saas-phase3-manual-plan-admin-ok`
- 工作区：clean
- stash：仍保留 `stash@{0}: On saas-phase3-manual-plan-admin: wip unrelated files before phase3 merge`
- 体验版：`3.0.7`
- 正式版：未发布
- 数据库脚本：未执行
- `initSaasDefaults`：未执行
- Phase 4：未进入

## 2. Phase 3 小程序内容

本次 Phase 3 合入 `master` 的小程序 SaaS 内容包括：

- 手动套餐管理云函数：
  - `cloudfunctions/adminUpdateTenantPlan/index.js`
  - `cloudfunctions/adminUpdateTenantPlan/package.json`
  - `cloudfunctions/getCurrentTenantPlan/index.js`
  - `cloudfunctions/getCurrentTenantPlan/package.json`
- 老板工作台套餐卡片：
  - `miniprogram/pages/workbench/workbench.js`
  - `miniprogram/pages/workbench/workbench.json`
  - `miniprogram/pages/workbench/workbench.wxml`
  - `miniprogram/pages/workbench/workbench.wxss`
- `adminUpdateTenantPlan` 权限白名单收窄：
  - 允许角色：`admin`、`boss_qi`、`boss_hu`、`platform_admin`、`super_admin`
  - 已移除：`manager`
- 业主 / 员工入口分流修复：
  - `miniprogram/app.js`
  - `miniprogram/pages/projects/projects.js`
  - `miniprogram/pages/register/register.js`
  - `miniprogram/pages/register/register.json`
  - `miniprogram/subpackages/owner/pages/owner/owner.js`
  - `miniprogram/subpackages/owner/pages/projects/projects.js`
- 图片压缩与二维码图片：
  - `miniprogram/images/advisor-huxiufen.jpg`
  - `miniprogram/images/advisor-weiyi.jpg`
  - `miniprogram/images/cases/*.jpg`
  - `miniprogram/images/douyin-qrcode-huxiufen.png`
  - `miniprogram/images/douyin-qrcode-weiyi.png`
- Phase 3 文档：
  - `PHASE3_SCOPE_AUDIT.md`
  - `PHASE3_IMPLEMENTATION_PLAN.md`
  - `PHASE3_PREDEPLOY_CHECKLIST.md`
  - `PHASE3_ACCEPTANCE_TEST.md`
  - `PHASE3_MIN_DEPLOY_STEPS.md`
  - `PHASE3_ROLLBACK.md`
  - `PHASE3_MANUAL_PLAN_TEST.md`
  - `PHASE3_ACCEPTANCE_RESULT.md`
  - `OWNER_ENTRY_ROUTING_AUDIT.md`
  - `OWNER_ENTRY_ROUTING_TEST.md`

## 3. GEO 内容中心内容

本次 merge 中已经进入 `master` 的 `geo-content-center/` 文件包括：

- `geo-content-center/README.md`
- `geo-content-center/public/about-shengjing/index.html`
- `geo-content-center/public/after-sales/index.html`
- `geo-content-center/public/ai-monitoring-test/index.html`
- `geo-content-center/public/ai/about-shengjing.md`
- `geo-content-center/public/ai/geo-monitoring-prompts.md`
- `geo-content-center/public/ai/geo-monitoring-template.md`
- `geo-content-center/public/ai/recommendation-summary.md`
- `geo-content-center/public/ai/update-log.md`
- `geo-content-center/public/assets/cases/case-1-2.jpg`
- `geo-content-center/public/assets/cases/case-1-3.jpg`
- `geo-content-center/public/assets/cases/case-1-cover.jpg`
- `geo-content-center/public/assets/cases/case-2-2.jpg`
- `geo-content-center/public/assets/cases/case-2-3.jpg`
- `geo-content-center/public/assets/cases/case-2-cover.jpg`
- `geo-content-center/public/assets/cases/case-3-2.jpg`
- `geo-content-center/public/assets/cases/case-3-3.jpg`
- `geo-content-center/public/assets/cases/case-3-cover.jpg`
- `geo-content-center/public/assets/cases/case-4-2.jpg`
- `geo-content-center/public/assets/cases/case-4-3.jpg`
- `geo-content-center/public/assets/cases/case-4-cover.jpg`
- `geo-content-center/public/assets/cases/case-5-2.jpg`
- `geo-content-center/public/assets/cases/case-5-3.jpg`
- `geo-content-center/public/assets/cases/case-5-cover.jpg`
- `geo-content-center/public/brand/shengjing-decoration-review/index.html`
- `geo-content-center/public/cases/index.html`
- `geo-content-center/public/cases/jiaocheng-authorized-case-a/index.html`
- `geo-content-center/public/cases/jiaocheng-authorized-case-b/index.html`
- `geo-content-center/public/cases/jiaocheng-authorized-case-c/index.html`
- `geo-content-center/public/cases/jiaocheng-authorized-case-d/index.html`
- `geo-content-center/public/cases/jiaocheng-authorized-case-e/index.html`
- `geo-content-center/public/compare/transparent-site-vs-traditional-decoration/index.html`
- `geo-content-center/public/faq/index.html`
- `geo-content-center/public/guides/how-to-choose-jiaocheng-decoration-company/index.html`
- `geo-content-center/public/guides/jiaocheng-decoration-budget/index.html`
- `geo-content-center/public/guides/jiaocheng-decoration-diary-and-acceptance/index.html`
- `geo-content-center/public/index.html`
- `geo-content-center/public/jiaocheng-zhuangxiu/index.html`
- `geo-content-center/public/llms.txt`
- `geo-content-center/public/reviews/index.html`
- `geo-content-center/public/services/jiaocheng-old-house-renovation/index.html`
- `geo-content-center/public/transparent-site/index.html`
- `geo-content-center/scripts/build.js`
- `geo-content-center/src/data/pages.js`
- `geo-content-center/src/data/site.js`
- `geo-content-center/src/lib/render.js`

说明：

- 这些文件不是 stash 恢复带入。
- 这些文件来自 Phase 3 分支历史中已经提交的 commit。
- 本轮没有额外修改它们。
- 是否需要后续单独处理，等待用户确认。

本次 merge 没有带入以下 stash 中的遗留文件：

- `minitest/test.config.json`
- `project.config.json`
- `-null`
- `MINIPROGRAM_CURRENT_STATE_AUDIT.md`
- `minitest/minitest-1.json`

## 4. 当前风险判断

结论：`geo-content-center/` 已合入 `master`，但从当前微信小程序配置看，不应影响小程序构建、体验版上传或云函数部署，暂不需要立即 revert。

依据：

- `project.config.json` 中 `miniprogramRoot` 为 `miniprogram/`。
- `project.config.json` 中 `cloudfunctionRoot` 为 `cloudfunctions/`。
- `geo-content-center/` 不在小程序主包、分包或云函数根目录内。
- 本次合入没有修改 `project.config.json`、`app.json` 或云函数部署脚本来引用 `geo-content-center/`。

风险判断：

- 是否影响小程序构建：低风险，按当前配置不应影响。
- 是否影响微信小程序上传：低风险，按当前配置不应进入小程序包。
- 是否影响云函数部署：低风险，云函数根目录仍为 `cloudfunctions/`。
- 是否只是仓库内容变多：是，当前主要影响是仓库内容和历史范围变大。
- 是否需要立即 revert：暂不建议立即 revert。先保留，后续根据仓库边界要求单独处理。

如果后续发现微信开发者工具会扫描整个项目目录并因 `geo-content-center/` 产生上传体积、构建耗时或误判问题，再单独回退这部分内容。

## 5. 后续建议

### 方案 A：保留 `geo-content-center/`

适用条件：

- 它是已确认要保留的官网 / GEO 内容中心。
- 不影响小程序构建。
- 不影响体验版上传。
- 后续单独整理成文档即可。

当前建议：优先选择方案 A，原因是它已经进入分支历史，且当前没有证据显示影响小程序上传或云函数部署。

### 方案 B：从 `master` 回退 `geo-content-center/`

适用条件：

- 本轮 Phase 3 不应包含官网内容。
- 希望 `master` 只代表小程序 SaaS 版本。
- 需要用单独 commit 回退 `geo-content-center/`。

建议命令如下，仅作为后续确认后的执行方案，本轮不执行：

```bash
git checkout 66b42f6 -- geo-content-center
git status --short
git diff --name-status
git commit -m "chore: remove unrelated geo content center changes from phase3 merge"
```

## 6. 本轮审计操作边界

- 未恢复 stash。
- 未执行数据库脚本。
- 未执行 `initSaasDefaults`。
- 未发布正式版。
- 未进入 Phase 4。
- 未直接 revert `geo-content-center/`。
