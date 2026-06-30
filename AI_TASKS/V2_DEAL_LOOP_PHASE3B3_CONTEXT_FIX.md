# V2 Deal Loop Phase 3B-3 Context Fix

## 1. 当前 bug

从 V2 `pipeline/customer-detail` 看到的客户是“齐嘉”，点击“AI 话术”后，`ai-assistant` 页面显示或生成的是默认 mock 客户“王姐”的建议。

## 2. 根因判断

`getCustomer` 云函数真实入参和返回结构与 `ai-assistant` 当前调用方式匹配：

- 入参支持 `customerId` / `id`。
- 成功返回 `res.result.customer`。

本次 bug 更可能来自上下文丢失和默认 mock fallback：

1. `customer-detail` 跳转 AI 时只读取 `this.data.customer.customerId`。
2. 真实客户对象在不同链路中可能只有 `id` 或 `_id`。
3. 跳转参数为空或 `getCustomer` 失败后，原逻辑会 fallback 到 `getCustomerById(customerId)`。
4. 原 mock lookup 在未命中时返回 `customers[0]`，而 `customers[0]` 是“王姐”。

## 3. 修复目标

- 保持 Phase 3B-3 范围，只修复客户上下文错配。
- `customer-detail -> ai-assistant` 统一传递真实 `customerId`。
- 有真实 `customerId` 时，禁止静默 fallback 到默认 mock 客户。
- `ai-assistant` 页面展示当前 URL `customerId`、当前客户姓名和数据源状态。
- 上下文异常时显示错误态，不生成冒充其它客户的 AI 建议。

## 4. 修改文件列表

- `miniprogram/subpackages/deal-loop/pages/customer-detail/customer-detail.js`
- `miniprogram/subpackages/deal-loop/pages/ai-assistant/ai-assistant.js`
- `miniprogram/subpackages/deal-loop/pages/ai-assistant/ai-assistant.wxml`
- `miniprogram/subpackages/deal-loop/mock/customers.js`
- `miniprogram/subpackages/deal-loop/utils/v1ReadonlyAdapters.js`
- `AI_TASKS/V2_DEAL_LOOP_PHASE3B3_CONTEXT_FIX.md`

## 5. customerId 归一策略

`customer-detail` 跳转 AI 时按以下顺序归一：

```js
customer.customerId ||
customer.id ||
customer._id ||
this.data.customerId ||
this.data.id ||
''
```

跳转统一使用：

```text
customerId=<真实客户ID>
```

如果没有 `customerId`，提示“缺少客户ID，无法生成 AI 话术”，不进入 AI 页面。

`ai-assistant` 继续兼容：

```js
options.customerId || options.id
```

内部统一命名为 `customerId`。

## 6. fallback 安全策略

新增安全 mock lookup：

- 无 `customerId`：允许返回默认 mock 演示客户。
- 有 `customerId` 且命中 mock：返回同 ID mock。
- 有 `customerId` 但未命中 mock：返回 `null`。

`ai-assistant` fallback 规则：

1. 无 `customerId`：允许默认 mock 演示，并显示 `Mock fallback`。
2. 有 `customerId`，`getCustomer` 失败，但 mock 有同 ID：允许同 ID mock fallback。
3. 有 `customerId`，`getCustomer` 失败，mock 也无同 ID：显示“客户读取失败，请返回客户列表重新打开”，不使用 `customers[0]`。
4. URL `customerId` 与最终客户 ID 不一致：显示“客户上下文异常，请返回重新打开”，不展示其它客户建议。

## 7. 隐私保护说明

本次仍只读 `listCustomers` / `getCustomer` 结果，不写任何集合。

客户详情进入 V2 展示前继续做脱敏处理：

- 不展示完整手机号。
- 不展示 openid。
- 不展示详细门牌地址。
- 不展示身份证。
- 不展示内部敏感备注字段。

本次未接入真实 AI API，生成内容仍是本地 mock 规则建议。

## 8. 验证方式

建议验证：

1. pipeline 点击“齐嘉” -> customer-detail 是齐嘉 -> AI 话术也是齐嘉。
2. 点击其它真实客户，AI 页面客户随之变化。
3. 有真实 `customerId` 时不再 fallback 到王姐。
4. 无 `customerId` 时才允许默认 mock 演示。
5. `getCustomer` 失败且 mock 无匹配时显示错误态，不冒充王姐。
6. 页面不展示完整手机号、openid、详细地址、身份证、内部敏感备注。
7. 代码中只允许 `listCustomers` 和 `getCustomer`。
8. V2 deal-loop 页面不出现 `db.collection`。
9. V2 deal-loop 页面不出现 `cloud.database`。
10. 不出现真实 AI API。
11. 不出现 `createProject` 调用。

## 9. 未进入 Phase 3B-4 说明

本次只处理 Phase 3B-3 的客户上下文修复：

- 未进入 Phase 3B-4。
- 未新增云函数。
- 未修改 V1 页面。
- 未修改 `cloudfunctions/`。
- 未写数据库。
- 未接真实 AI API。
- 未接 `projects / stage_logs / photos / design_drawings / case_authorizations`。
- 未修改工作台入口。
- 未部署。
- 未上传体验版。
