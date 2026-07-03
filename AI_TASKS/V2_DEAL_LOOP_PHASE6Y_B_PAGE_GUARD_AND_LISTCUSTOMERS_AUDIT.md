# Phase 6-Y-B：V2 页面级守卫与 listCustomers 核验

## 1. 当前阶段

Phase 6-Y-B：V2 页面级守卫与 listCustomers 核验。

## 2. 当前 HEAD / tag

- 执行本阶段前 HEAD：`af76b4d9121e70758b23e909fed5dc8fc6adb8bd`
- 执行本阶段前 tag：`v2-deal-loop-phase6y-a2-remote-push-confirmation`
- 当前分支：`codex/init-ai-collaboration`
- remote：`https://github.com/qixin-portfolio/transparent-construction-miniapp.git`

## 3. 本阶段目标

核实 `listCustomers` 是否真实存在、pipeline 实际调用情况，以及 deal-loop 六个页面是否存在页面级入口/角色守卫。

如缺少页面级守卫，只做最小访问控制，防止用户绕过 workbench 入口直达 V2 页面。

## 4. listCustomers 核验结果

检查结果：

- `cloudfunctions/listCustomers/` 存在。
- 文件包含：
  - `cloudfunctions/listCustomers/index.js`
  - `cloudfunctions/listCustomers/package.json`

`listCustomers` 云函数侧已有基础角色判断：

- 可查看客户库角色：`admin`、`boss_qi`、`boss_hu`、`designer`、`sales`
- 全量客户角色：`admin`、`boss_qi`、`boss_hu`
- 非全量角色按 `ownerOpenid` 限制查询

说明：本阶段只记录 `listCustomers` 存在和调用关系，不修改云函数，不部署云函数。

## 5. pipeline 实际调用结果

`miniprogram/subpackages/deal-loop/pages/pipeline/pipeline.js` 实际调用：

```js
wx.cloud.callFunction({
  name: 'listCustomers',
  data: {
    source: 'deal-loop-pipeline-readonly'
  }
})
```

调用失败或返回空时会进入 `useMockCustomers` 兜底。

## 6. mock 兜底风险判断

当前 pipeline 具备用户可见数据来源标识：

- `dataSourceLabel`
- `dataSourceClass`
- `dataSourceHint`

当前失败兜底文案会显示：

- `示例内容`
- `当前无法读取客户资料，暂展示示例内容。`

风险判断：

- 已有“示例内容”标识，能降低误解。
- 仍存在真实数据读取失败后用户继续看到 mock 客户的风险。
- 本阶段按要求不修改 mock 兜底 UI，只记录为后续风险。

## 7. 六个 V2 页面守卫核验结果

核验页面：

1. `pipeline`
2. `customer-detail`
3. `ai-assistant`
4. `trust-materials`
5. `contract-to-project`
6. `case-assets`

核验结论：

- 修改前：六个页面均无等价页面级入口守卫。
- 修改前：直达页面会继续进入 `onLoad` 主流程。
- 修改前：pipeline 可触发 `listCustomers`；详情类页面可触发 `getCustomer` / `getV2EvidenceSummary`。
- 修改后：六个页面均在 `onLoad` 第一行调用 `guardDealLoopPage()`。
- 修改后：未通过守卫时立即 `return`，不继续加载客户数据，不调用云函数。
- 修改后：当前 `ENABLE_V2_DEAL_LOOP_ENTRY = false`，直达 deal-loop 页面会被拦截。

## 8. 是否新增 guard util

是。

新增：

- `miniprogram/subpackages/deal-loop/utils/accessGuard.js`

守卫逻辑：

- `ENABLE_V2_DEAL_LOOP_ENTRY = false`
- boss 角色范围：`admin`、`boss_qi`、`boss_hu`
- 通过条件：`ENABLE_V2_DEAL_LOOP_ENTRY && boss role`
- 未通过时：
  - `wx.showToast({ title: '当前功能未开放', icon: 'none' })`
  - 有页面栈则 `wx.navigateBack`
  - 无页面栈则 `wx.switchTab` 回 `pages/workbench/workbench`

说明：`workbench` 是 tabBar 页面，因此无页面栈时使用 `wx.switchTab` 回工作台。

## 9. 修改文件列表

- `miniprogram/subpackages/deal-loop/utils/accessGuard.js`
- `miniprogram/subpackages/deal-loop/pages/pipeline/pipeline.js`
- `miniprogram/subpackages/deal-loop/pages/customer-detail/customer-detail.js`
- `miniprogram/subpackages/deal-loop/pages/ai-assistant/ai-assistant.js`
- `miniprogram/subpackages/deal-loop/pages/trust-materials/trust-materials.js`
- `miniprogram/subpackages/deal-loop/pages/contract-to-project/contract-to-project.js`
- `miniprogram/subpackages/deal-loop/pages/case-assets/case-assets.js`
- `AI_TASKS/V2_DEAL_LOOP_PHASE6Y_B_PAGE_GUARD_AND_LISTCUSTOMERS_AUDIT.md`

## 10. 未改变的能力边界

- 未修改 `cloudfunctions/`
- 未修改 V1 页面
- 未修改 upload-log
- 未修改 `app.json`
- 未修改 tabBar
- 未打开 `ENABLE_V2_DEAL_LOOP_ENTRY`
- 未新增数据库写入
- 未新增真实 AI API
- 未调用 `createProject`
- 未新增 `wx.request`
- 未上传体验版
- 未部署云函数
- 未发布正式版
- 未做文案美化
- 未做功能增强

## 11. 测试结果

已执行：

```bash
node --check miniprogram/subpackages/deal-loop/pages/pipeline/pipeline.js
node --check miniprogram/subpackages/deal-loop/pages/customer-detail/customer-detail.js
node --check miniprogram/subpackages/deal-loop/pages/ai-assistant/ai-assistant.js
node --check miniprogram/subpackages/deal-loop/pages/trust-materials/trust-materials.js
node --check miniprogram/subpackages/deal-loop/pages/contract-to-project/contract-to-project.js
node --check miniprogram/subpackages/deal-loop/pages/case-assets/case-assets.js
node --check miniprogram/subpackages/deal-loop/utils/accessGuard.js
```

结果：全部通过。

补充运行检查：

- mock `wx/getApp/getCurrentPages` 后调用 `guardDealLoopPage()`
- 当前开关为 `false` 时返回 `false`
- toast 文案为 `当前功能未开放`
- 无页面栈时回到 `/pages/workbench/workbench`

## 12. 是否建议进入 Phase 6-Y-C

建议进入 Phase 6-Y-C。

下一阶段建议只读核验云函数侧鉴权，重点看：

- `getCustomer`
- `getV2EvidenceSummary`
- `listCustomers`

尤其需要确认 V2 页面守卫之外，服务端是否也能防止越权读取客户资料和证据摘要。
