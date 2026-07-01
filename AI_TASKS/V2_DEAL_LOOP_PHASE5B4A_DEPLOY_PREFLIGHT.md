# V2 Deal Loop Phase 5B-4A：证据摘要云函数部署前预检

## 当前阶段

Phase 5B-4A：证据摘要云函数部署前预检。

本阶段只做 `getV2EvidenceSummary` 云函数部署前预检，不部署云函数，不上传体验版，不打开工作台入口，不进入 Phase 5B-4B。

## 当前 HEAD / tag

- 当前 HEAD：`280a74f04e9f81f91204195ee977ca039ab07909`
- 当前 tag：`v2-deal-loop-phase5b3-trust-materials-evidence-summary`

## 预检目标

1. 确认后续如果部署，只允许部署 `cloudfunctions/getV2EvidenceSummary`。
2. 确认云函数依赖、入口文件和只读安全边界。
3. 确认前端 `trust-materials` 只读调用路径已就绪。
4. 明确部署后测试计划和异常回滚方案。
5. 保持 `ENABLE_V2_DEAL_LOOP_ENTRY = false`，不让真实用户从工作台入口触达 V2。

## 云函数部署对象

后续 Phase 5B-4B 如执行部署，只允许部署：

```text
cloudfunctions/getV2EvidenceSummary
```

当前目录文件：

```text
cloudfunctions/getV2EvidenceSummary/index.js
cloudfunctions/getV2EvidenceSummary/package.json
```

不得部署其它云函数，不得修改或部署 V1 既有云函数。

## 云环境确认

代码配置线索：

```js
globalData: {
  envId: 'cloud1-d4g7zh8kpca0e26d5'
}
```

`miniprogram/app.js` 中 `wx.cloud.init({ env, traceUser: true })` 使用上述 `envId`。

部署前仍需人工确认微信开发者工具当前选中的云环境是否为：

```text
cloud1-d4g7zh8kpca0e26d5
```

原因：文件只能确认小程序运行时配置线索，不能替代开发者工具界面中的实际部署目标确认。

## package 依赖检查

`cloudfunctions/getV2EvidenceSummary/package.json` 当前内容要点：

```json
{
  "name": "getV2EvidenceSummary",
  "version": "1.0.0",
  "description": "V2 真实工地证据摘要只读接口",
  "main": "index.js",
  "dependencies": {
    "wx-server-sdk": "~2.6.3"
  }
}
```

检查结论：

- 包含 `wx-server-sdk`。
- 未发现真实 AI SDK。
- 未发现图片处理依赖。
- 未发现上传、发布类依赖。
- 未发现异常第三方依赖。

## 只读安全确认

`getV2EvidenceSummary` 当前定位是只读证据摘要接口：

1. 使用 `cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })`。
2. 通过 `cloud.getWXContext()` 获取登录态。
3. 读取 `users` 获取当前用户 `tenantId` 与 `role`。
4. 仅允许 `admin / boss_qi / boss_hu`。
5. 无 `tenantId` 返回 `FORBIDDEN`，不再使用默认租户兜底。
6. 客户、项目、证据查询均按 `tenantId` 隔离。
7. 只统计摘要，不返回原始素材。

只读集合范围：

- `users`
- `customers`
- `projects`
- `stage_logs`
- `photos`
- `design_drawings`
- `case_authorizations`
- `warranty_cards`
- `after_sales_tickets`

安全过滤确认：

- `stage_logs` 使用 `reviewStatus: 'approved'` 与 `ownerVisible: true`。
- `photos` 基于已审核、业主可见日报统计，并要求照片自身 `ownerVisible: true`。
- `design_drawings` 只统计 `type: 'render'` 且 `ownerVisible: true`。
- `case_authorizations` 检查 `status: 'approved'`、`authorizationScope` 与 `revokedAt`。

禁止项确认：

- 未发现数据库写入：无 `.add()` / `.update()` / `.set()` / `.remove()`。
- 未调用 `createProject`。
- 未调用 `getTempFileURL`。
- 未返回 `fileID / cloudPath / tempFileURL`。
- 未返回图片 URL、缩略图 URL。
- 未返回日报正文、审核意见、施工图文件。
- 未返回手机号、详细地址、身份证、内部备注。
- `openid` 只用于 `users` 登录态查询，不进入接口返回结构。

接口返回仍为摘要结构，包括：

- `projectSummary`
- `evidenceSummary`
- `authorizationSummary`
- `recommendedUse`
- `privacyGuard`

## 前端调用确认

`trust-materials` 页面当前存在两类只读调用：

1. 既有 `getCustomer`：用于真实客户字段和客户上下文。
2. 新增 `getV2EvidenceSummary`：用于真实证据摘要。

新增调用位置：

```js
wx.cloud.callFunction({
  name: 'getV2EvidenceSummary',
  data: { customerId }
})
```

确认结果：

- 只传 `customerId`。
- 未凭空构造 `projectId`。
- 未新增其它云函数调用。
- 未新增数据库写入。
- 未影响 `case-assets / ai-assistant / contract-to-project / customer-detail / pipeline`。
- mock 推荐素材区域仍保留，并标为“示例推荐素材”。
- 数据源文案区分“真实客户字段 + 真实证据摘要 + Mock 推荐素材”和失败后的“真实客户字段 + Mock 推荐素材”。

## 部署后测试计划

Phase 5B-4B 如进入部署，建议按以下步骤验收：

1. 只部署 `cloudfunctions/getV2EvidenceSummary`。
2. 不上传体验版。
3. 不打开 `ENABLE_V2_DEAL_LOOP_ENTRY`。
4. 微信开发者工具直达：

```text
subpackages/deal-loop/pages/trust-materials/trust-materials
```

5. query 填：

```text
customerId=<真实客户ID>
```

6. 验证页面仍显示同一个客户，不串人。
7. 验证数据源显示“真实客户字段 + 真实证据摘要 + Mock 推荐素材”。
8. 验证有真实证据时显示摘要统计。
9. 验证无证据时显示 `NO_EVIDENCE` 对应空态，不 fallback 到其它客户。
10. 验证无公开授权时显示“内部可参考，暂不可公开发布”。
11. 验证错误态：未登录、无权限、NOT_FOUND、READ_FAILED。
12. 验证不展示手机号、openid、详细地址、图片 URL、fileID、cloudPath、tempFileURL、日报正文、员工信息。
13. 验证 `ENABLE_V2_DEAL_LOOP_ENTRY = false`。

## 回滚方案

如果 Phase 5B-4B 部署后出现异常：

1. 工作台入口仍为 `false`，真实用户默认不可见。
2. 可在微信开发者工具或云开发控制台回退到上一版本云函数，或删除/停用 `getV2EvidenceSummary`。
3. V1 不调用 `getV2EvidenceSummary`，因此不影响 V1 客户、工地、日报主链路。
4. 不上传体验版时，线上小程序不受本阶段影响。
5. 前端 `trust-materials` 已保留 mock 推荐素材和错误态展示，摘要读取失败不会冒充真实证据。

## 风险点

1. 部署时选错云环境。
2. 误部署其它云函数。
3. 部署后未验证角色权限，导致非老板/管理员误读摘要。
4. 把 `ownerVisible=true` 误认为可公开营销。
5. 把 `NO_MARKETING_AUTHORIZATION` 当作系统错误，而不是公开营销阻断状态。
6. 手动验收时忘记传 `customerId`，导致页面走 mock fallback。
7. 后续若打开入口，可能让半成品触达真实用户。

## 是否建议进入 Phase 5B-4B

建议在人工确认以下三点后再进入 Phase 5B-4B：

1. 微信开发者工具当前部署云环境确认为 `cloud1-d4g7zh8kpca0e26d5`。
2. 只部署 `cloudfunctions/getV2EvidenceSummary`，不部署其它云函数。
3. 仍保持 `ENABLE_V2_DEAL_LOOP_ENTRY = false`，不上传体验版。

未完成上述人工确认前，不建议进入 Phase 5B-4B。
