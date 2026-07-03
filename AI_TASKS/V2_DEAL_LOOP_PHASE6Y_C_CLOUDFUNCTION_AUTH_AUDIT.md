# Phase 6-Y-C：V2 相关云函数侧鉴权只读审计

## 1. 当前阶段

Phase 6-Y-C：V2 相关云函数侧鉴权只读审计。

本阶段只读审计 V2 当前依赖的云函数，不修改代码、不部署云函数、不上传体验版、不发布正式版。

## 2. 当前 HEAD / tag

- 执行本阶段前 HEAD：`fe38b0de02bf55d32c8aa52135f60e70a27651c1`
- 执行本阶段前 tag：`v2-deal-loop-phase6y-b-page-guard-listcustomers-audit`
- 当前分支：`codex/init-ai-collaboration`
- remote：`https://github.com/qixin-portfolio/transparent-construction-miniapp.git`

说明：审计开始前发现工作区存在上一轮未提交的 `docs/` 模板文件，本阶段未修改该文件，只新增本审计文档。

## 3. 本阶段目标

只读审计 V2 当前依赖的云函数：

1. `listCustomers`
2. `getCustomer`
3. `getV2EvidenceSummary`

重点确认：

- 调用者身份识别
- 角色校验
- tenantId 隔离
- 客户 / 项目归属校验
- 只读边界
- 错误隐藏策略

## 4. 当前入口状态

当前入口保持关闭：

- `miniprogram/pages/workbench/workbench.js:15`：`ENABLE_V2_DEAL_LOOP_ENTRY = false`
- `miniprogram/pages/workbench/workbench.js:185`：入口条件为 `ENABLE_V2_DEAL_LOOP_ENTRY && isBoss`
- `miniprogram/subpackages/deal-loop/utils/accessGuard.js:1`：页面级 guard 同样为 `ENABLE_V2_DEAL_LOOP_ENTRY = false`
- `miniprogram/subpackages/deal-loop/utils/accessGuard.js:29`：页面直达通过条件为 `ENABLE_V2_DEAL_LOOP_ENTRY && BOSS_ROLES.indexOf(role) !== -1`

结论：workbench 入口关闭，deal-loop 六页页面级 guard 关闭。

## 5. listCustomers 审计结果

审计文件：

- `cloudfunctions/listCustomers/index.js`
- `cloudfunctions/listCustomers/package.json`

### 已确认安全点

- 使用 `cloud.getWXContext()` 识别调用者 openid：`index.js:12-20`
- 查询 `users` 表，要求 `openid` 匹配且 `status: 'active'`：`index.js:14`
- 有角色校验：`index.js:23-27`
- 允许查看客户库角色为 `admin`、`boss_qi`、`boss_hu`、`designer`、`sales`：`index.js:7`
- boss/admin 类角色可看全量客户：`index.js:8`、`index.js:39`
- 非全量角色增加 `ownerOpenid: openid` 限制：`index.js:39-44`
- 查询有 `deleted: _.neq(true)`：`index.js:35-37`
- 有 `orderBy('updatedAt', 'desc').limit(100)`：`index.js:47`
- 有 try/catch 错误处理：`index.js:29-55`

### 已发现风险点

- 云函数不是只限制 boss/admin，可被 `designer`、`sales` 调用；这是 V1 客户库需要，但 V2 侧只能靠页面 guard 限制 boss。
- tenant 查询使用 `tenantId: _.in([tenantId, '', null])`：`index.js:35-38`。如果未来多租户数据存在空 tenant，可能被多个租户读到。
- 返回 `res.data` 原始客户列表：`index.js:47-48`，未做字段白名单过滤，可能返回手机号、地址、openid 等客户敏感字段。
- 错误返回 `error.message`：`index.js:49-53`，不是统一的安全错误码。
- 前端 pipeline 读取失败会 mock 兜底，用户可能看到示例客户后误以为是真实客户，本风险已在 Phase 6-Y-B 记录。

### 审计结论

`listCustomers` 具备服务端身份识别、角色校验、tenant 查询和分页限制，不是纯前端控制。但角色范围偏宽、空 tenant 兼容和返回字段过宽，SaaS 化前需要收紧。

## 6. getCustomer 审计结果

审计文件：

- `cloudfunctions/getCustomer/index.js`
- `cloudfunctions/getCustomer/package.json`

### 已确认安全点

- 使用 `cloud.getWXContext()` 识别调用者 openid：`index.js:10-18`
- 查询 `users` 表，要求 `openid` 匹配且 `status: 'active'`：`index.js:12`
- 有角色校验：`index.js:21-25`
- 允许角色为 `admin`、`boss_qi`、`boss_hu`、`designer`、`sales`：`index.js:6`
- 要求传入 `customerId`：`index.js:32-33`
- 按 `customers.doc(customerId).get()` 读取单个客户：`index.js:35`
- 检查客户不存在或删除：`index.js:37-39`
- 检查 customer.tenantId 与当前用户 tenantId：`index.js:40-43`
- 非全量角色要求 `customer.ownerOpenid === openid`：`index.js:45-49`
- 有 try/catch 错误处理：`index.js:27-58`

### 已发现风险点

- 云函数被 V1 / V2 共用：V1 客户编辑页调用 `getCustomer`，V2 多个页面也调用 `getCustomer`。
- 角色范围包含 `designer`、`sales`，不是 V2 boss-only；V2 依赖页面 guard 限制入口。
- tenant 校验逻辑为 `if (customer.tenantId && customer.tenantId !== tenantId)`：`index.js:40-43`。如果客户记录 tenantId 为空，可能绕过 tenant mismatch。
- 未把 TENANT_MISMATCH 隐藏成 NOT_FOUND，而是返回 `无权查看该客户`：`index.js:41-42`、`index.js:52-56`。
- 返回 `{ customer }` 原始客户对象：`index.js:51`，未做字段白名单过滤，可能包含手机号、地址、openid 等敏感字段。
- 如果未来 V1 调整返回结构，V2 的 `mapCustomerToDetail` 等只读适配可能受影响。

### 审计结论

`getCustomer` 具备身份、角色、tenant 和 ownerOpenid 校验，但错误隐藏和字段过滤不够，且 V1/V2 共用，未来改动需要非常谨慎。

## 7. getV2EvidenceSummary 审计结果

审计文件：

- `cloudfunctions/getV2EvidenceSummary/index.js`
- `cloudfunctions/getV2EvidenceSummary/package.json`

### 已确认安全点

- 使用 `cloud.getWXContext()`：`index.js:157-160`
- 查询 `users` 表，并只读取 `_id`、`tenantId`、`tenantName`、`role`、`status` 字段：`index.js:159-169`
- 只允许 `admin`、`boss_qi`、`boss_hu`：`index.js:10`、`index.js:173-177`
- 要求用户存在、角色允许、存在 tenantId：`index.js:173-177`
- 要求 `customerId`：`index.js:493-500`
- 读取客户访问字段仅含 `_id`、`tenantId`、`deleted`：`index.js:179-190`
- 客户不存在、删除、tenant mismatch 都走 NOT_FOUND：`index.js:192-195`
- projectId 存在时校验项目存在、tenantId、customerId 归属：`index.js:213-230`
- 不传 projectId 时按 `tenantId + customerId + status != deleted` 查询项目：`index.js:233-243`
- stage_logs 只统计 `reviewStatus: 'approved'` 且 `ownerVisible: true`：`index.js:417-428`
- photos 只统计 `ownerVisible: true`：`index.js:430`
- design_drawings 统计 `type: 'render'` 且 `ownerVisible: true`：`index.js:431-434`
- case authorization 检查 `status: 'approved'`、非 private、未 revoked：`index.js:386-396`
- 返回 `NO_EVIDENCE` / `NO_MARKETING_AUTHORIZATION` 等安全状态：`index.js:519-535`
- 返回结构是统计摘要，不返回原始 fileID、临时链接、原图、日报正文：`index.js:25-34`、`index.js:106-115`
- 错误码做公开白名单限制：`index.js:11`、`index.js:122-139`

### 已发现风险点

- `listProjects` 未传 projectId 时 `.limit(1000)`：`index.js:233-242`，商业验证阶段足够，SaaS 化前要考虑分页或上限策略。
- 对 warranty_cards、after_sales_tickets 只做数量统计，未见 ownerVisible 或公开状态过滤：`index.js:435-438`。当前只返回数量，风险较低，但 SaaS 化前应确认这些集合是否存在内部记录不应计入。
- 云端部署版本可能与本地代码不一致，本阶段只审本地文件，未部署、未拉取云端线上版本。

### 审计结论

`getV2EvidenceSummary` 是三者中边界最清晰的云函数：boss-only、tenant 校验、客户/项目归属校验、摘要化返回、公开错误码、隐私保护都比较完整。

## 8. 每个云函数的权限等级

| 云函数 | 等级 | 结论 |
| --- | --- | --- |
| `listCustomers` | B | 有身份、角色、tenant 查询和 limit，但角色范围偏宽，空 tenant 兼容和字段返回过宽。 |
| `getCustomer` | B | 有身份、角色、tenant 和 ownerOpenid 校验，但空 tenant 绕过、错误隐藏不足、原始客户字段返回过宽。 |
| `getV2EvidenceSummary` | A | boss-only、tenant、客户/项目归属、摘要化返回和错误码策略较完整，风险低。 |

## 9. 已确认安全点

- 三个云函数都使用 `cloud.getWXContext()` 或等价 wxContext 获取调用者身份。
- 三个云函数都查询 `users` 表识别当前用户。
- 三个云函数都有角色校验，不是只依赖前端入口。
- `getV2EvidenceSummary` 只允许 boss/admin 类角色。
- `getV2EvidenceSummary` 不返回原始图片、fileID、临时链接、日报正文。
- `getV2EvidenceSummary` 对客户和项目归属校验较完整。
- `listCustomers` 有 `limit(100)`。
- 当前前端入口和页面级 guard 都保持 `ENABLE_V2_DEAL_LOOP_ENTRY = false`。

## 10. 已发现风险点

1. `listCustomers` 和 `getCustomer` 角色范围包含 `designer`、`sales`，不等同于 V2 boss-only。
2. `listCustomers` 的 `tenantId: _.in([tenantId, '', null])` 可能在多租户场景暴露空 tenant 客户。
3. `getCustomer` 的 tenant 校验只在 `customer.tenantId` 存在时执行，空 tenant 客户存在越权风险。
4. `listCustomers` 和 `getCustomer` 都返回原始客户对象，字段过宽。
5. `getCustomer` 未把租户不匹配统一隐藏成 NOT_FOUND。
6. `listCustomers` / `getCustomer` 是 V1/V2 共用接口，未来 V1 返回结构变化可能影响 V2。
7. `getV2EvidenceSummary` 本地代码较安全，但线上部署版本是否一致未在本阶段验证。
8. 当前工作区存在上一轮未提交 `docs/` 文档，不影响本阶段代码，但最终状态需单独说明。

## 11. 立即修复建议

本阶段只审计，不修复。

建议立即修复项：

1. 暂无必须立即修复的线上高危漏洞，因为 V2 入口已关闭且 deal-loop 页面已加页面级 guard。
2. 若后续要重新打开 V2 体验入口，应先确认线上云函数版本与本地一致，特别是 `getV2EvidenceSummary`。

## 12. 暂缓处理建议

商业验证期间可暂缓：

- `listCustomers/getCustomer` 字段白名单重构。
- `listCustomers/getCustomer` 拆 V1/V2 专用接口。
- `getV2EvidenceSummary` 分页或更细统计策略。
- `wx-server-sdk` 版本统一。

原因：当前 V2 已冻结，且入口关闭，短期主要验证商业价值。

## 13. 未来写库前必须处理事项

如果 V2 未来要写跟进记录、客户状态、工地草案或案例草案，必须先处理：

1. 为 V2 单独设计服务端接口，不复用过宽的 V1 客户接口。
2. 所有写接口必须做角色、tenant、资源归属、操作审计。
3. 写入前必须明确回滚策略和操作日志。
4. 不允许前端传入 tenantId 作为可信权限依据。
5. 错误返回应使用安全错误码，不暴露内部判断细节。

## 14. SaaS 化前必须处理事项

SaaS 化前必须处理：

1. 清理或迁移空 `tenantId` 客户，避免 `'', null` 跨租户兼容带来的风险。
2. `listCustomers/getCustomer` 增加字段白名单，避免返回手机号、地址、openid 等不必要字段。
3. 明确 V1 客户库权限和 V2 成交跟进权限，不再只靠前端区分。
4. 将 TENANT_MISMATCH 等越权场景统一隐藏为 NOT_FOUND 或安全错误码。
5. 建立云函数线上版本核验流程，避免“本地安全、线上未部署”的假安全。

## 15. 未改变的能力边界

- 未修改 `cloudfunctions/`
- 未修改 `miniprogram/`
- 未修改 V1 页面
- 未修改 upload-log
- 未修改 `app.json`
- 未修改 tabBar
- 未修改 `ENABLE_V2_DEAL_LOOP_ENTRY`
- 未新增数据库写入
- 未新增真实 AI API
- 未调用 `createProject`
- 未新增 `wx.request`
- 未上传体验版
- 未部署云函数
- 未发布正式版
- 未修 Bug
- 未做功能增强

## 16. 是否建议进入 Phase 6-Y-D

建议进入 Phase 6-Y-D。

建议下一阶段做只读部署一致性和体验版状态核验：

- 核验线上云函数版本是否与本地审计版本一致。
- 核验关闭入口体验版是否仍覆盖打开版。
- 核验 V2 直达页面在真机体验版是否确实被页面级 guard 拦截。
