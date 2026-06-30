# V2 Deal Loop Phase 3C Regression

## 1. 当前阶段

Phase 3C：V2 成交闭环整体回归验收。

本阶段只做回归验收，不新增功能，不修改业务代码，不接入新数据源，不部署，不上传体验版。

## 2. 当前 HEAD / tag

当前安全检查点：

```text
7173c73877babc7baf743d4ef017310aaa869846
```

对应 tag：

```text
v2-deal-loop-phase3b6-case-assets-draft
```

## 3. 回归目标

确认 V2 成交闭环全链路在只读和 mock 约束下可验收：

1. 全链路客户不串人。
2. `customerId` 在各页面传递一致。
3. 数据源状态展示清楚。
4. 真实数据页面只读取客户数据。
5. 云函数调用范围只限 `listCustomers` 和 `getCustomer`。
6. 不展示完整手机号、openid、详细地址、身份证、内部敏感备注。
7. mock 按钮只弹窗、复制或跳转，不写数据库。
8. 不调用真实 AI，不创建真实工地，不读取真实案例素材。

## 4. 验收链路

链路页面：

1. `pipeline`
2. `customer-detail`
3. `ai-assistant`
4. `trust-materials`
5. `contract-to-project`
6. `case-assets`

当前页面路径：

```text
subpackages/deal-loop/pages/pipeline/pipeline
subpackages/deal-loop/pages/customer-detail/customer-detail
subpackages/deal-loop/pages/ai-assistant/ai-assistant
subpackages/deal-loop/pages/trust-materials/trust-materials
subpackages/deal-loop/pages/contract-to-project/contract-to-project
subpackages/deal-loop/pages/case-assets/case-assets
```

## 5. 文件范围检查

本次 Phase 3C 开始前工作区为 clean。

已检查 V2 分包：

```text
miniprogram/subpackages/deal-loop/
```

重点页面文件：

- `pages/pipeline/pipeline.js`
- `pages/customer-detail/customer-detail.js`
- `pages/ai-assistant/ai-assistant.js`
- `pages/trust-materials/trust-materials.js`
- `pages/contract-to-project/contract-to-project.js`
- `pages/case-assets/case-assets.js`

未修改：

- `cloudfunctions/`
- V1 页面
- `miniprogram/app.json`
- `project.config.json`
- `project.private.config.json`
- 工作台入口
- tabBar

本阶段只新增本文档。

## 6. 云函数调用范围

V2 `deal-loop` 分包内实际云函数调用：

- `pipeline`：`listCustomers`
- `customer-detail`：`getCustomer`
- `ai-assistant`：`getCustomer`
- `trust-materials`：`getCustomer`
- `contract-to-project`：`getCustomer`
- `case-assets`：`getCustomer`

未发现其它真实云函数调用。

## 7. 隐私检查

`v1ReadonlyAdapters.js` 已做只读脱敏：

- 手机号字段转为掩码。
- 删除 `openid`。
- 删除 `ownerOpenid`。
- 删除 `createdByOpenid`。
- 删除 `updatedByOpenid`。
- 删除身份证字段。
- 删除内部备注字段。
- 地址字段只保留简写。

`caseAssets.js` 对需求和顾虑自由文本再次做本地脱敏，避免把手机号、openid、身份证或详细门牌号拼入平台文案。

## 8. 禁止写入检查

扫描确认没有实际调用：

- `db.collection`
- `cloud.database`
- `wx.request`
- `createProject`
- `submitStageLog`
- `reviewStageLog`
- `aiGenerateOwnerSummary`
- 真实 AI API

`createProject`、`projects`、`case_authorizations` 等词只出现在安全说明、禁止调用文案或 mock 字段里，不是实际调用。

## 9. mock fallback 检查

各页面 fallback 状态：

- `pipeline`：`listCustomers` 失败或无数据时回退本地 mock。
- `customer-detail`：无 ID 或 `getCustomer` 失败时使用 mock 详情。
- `ai-assistant`：有真实 `customerId` 且读取失败时不冒充其它真实客户；无 ID 才使用默认 mock。
- `trust-materials`：有 `customerId` 时优先读取真实客户字段；失败时展示 `客户读取失败，已回退 mock`。
- `contract-to-project`：只生成工地草案，失败时 mock fallback，按钮只弹窗。
- `case-assets`：只生成 mock 案例资产草案；直达页面必须填写 `customerId=<真实客户ID>`，无 ID 会显示默认 mock fallback。

上下文校验：

- `ai-assistant`、`trust-materials`、`contract-to-project`、`case-assets` 均检查 URL `customerId` 与最终客户 ID 是否一致。
- 不一致时展示 `客户上下文异常，请返回重新打开`。

## 10. 人工验收步骤

1. 直达 pipeline：

```text
subpackages/deal-loop/pages/pipeline/pipeline
```

2. 从 pipeline 点击某个真实客户的“看客户”，进入 `customer-detail`，确认姓名、阶段、`customerId` 对应同一客户。

3. 从 `customer-detail` 点击“打开 AI 话术”，进入 `ai-assistant`，确认：

- 当前 URL customerId 正确。
- 当前客户姓名一致。
- 数据源状态为真实客户字段或明确 fallback。

4. 从 `customer-detail` 或 `ai-assistant` 点击推荐素材，进入 `trust-materials`，确认：

- URL 只带 `customerId`。
- 当前客户姓名、阶段一致。
- 推荐素材仍为 mock。

5. 从 `customer-detail` 点击签约转工地草案，进入 `contract-to-project`，确认：

- 当前客户一致。
- 数据源状态显示清楚。
- `生成工地草案（mock）` 只弹窗，不调用 `createProject`。

6. 直达 case-assets：

```text
页面路径：
subpackages/deal-loop/pages/case-assets/case-assets

query：
customerId=<真实客户ID>
```

确认页面显示真实客户字段 + Mock 案例草案，不读取真实照片、日报、图纸或授权。

## 11. 风险点

1. `case-assets` 当前没有链路入口，需要开发者工具直达并单独填写 query；如果 query 为空，会进入默认 mock fallback。
2. `pipeline -> customer-detail / ai-assistant` 仍使用兼容参数 `id=`，目标页兼容 `customerId || id`；后续可统一为 `customerId=`，但本阶段不修改。
3. `customer-detail` 失败 fallback 仍会使用本地 mock；人工验收真实链路时需要确认数据源状态不是 fallback。
4. 部分禁止词会出现在安全说明或文档中，需要按“是否实际调用”判断。

## 12. 下一步建议

Phase 3C 人工验收通过后，再决定是否进入下一阶段。

下一阶段如果涉及真实写入、真实工地、真实案例授权、真实 AI 或发布链路，必须重新进入 Human Gate。
