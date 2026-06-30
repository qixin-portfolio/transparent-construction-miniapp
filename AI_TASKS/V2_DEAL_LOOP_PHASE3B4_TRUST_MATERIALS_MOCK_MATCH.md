# V2 Deal Loop Phase 3B-4 Trust Materials Mock Match

## 1. 当前阶段

Phase 3B-4：推荐素材基于真实客户字段匹配 mock 信任素材。

## 2. 本阶段目标

让 V2 `trust-materials` 页面可以接收真实 `customerId`，只读调用现有 `getCustomer`，再基于真实客户字段匹配本地 mock 信任素材。

素材仍然全部来自本地 mock，不接入真实 `stage_logs / photos / design_drawings / case_authorizations / projects`。

## 3. 修改文件列表

- `miniprogram/subpackages/deal-loop/pages/trust-materials/trust-materials.js`
- `miniprogram/subpackages/deal-loop/pages/trust-materials/trust-materials.wxml`
- `miniprogram/subpackages/deal-loop/pages/trust-materials/trust-materials.wxss`
- `miniprogram/subpackages/deal-loop/pages/pipeline/pipeline.js`
- `miniprogram/subpackages/deal-loop/pages/pipeline/pipeline.wxml`
- `miniprogram/subpackages/deal-loop/pages/customer-detail/customer-detail.js`
- `miniprogram/subpackages/deal-loop/pages/ai-assistant/ai-assistant.js`
- `miniprogram/subpackages/deal-loop/pages/ai-assistant/ai-assistant.wxml`
- `miniprogram/subpackages/deal-loop/mock/trustMaterials.js`
- `miniprogram/subpackages/deal-loop/utils/materialMapper.js`
- `AI_TASKS/V2_DEAL_LOOP_PHASE3B4_TRUST_MATERIALS_MOCK_MATCH.md`

## 4. getCustomer 调用说明

`trust-materials` 页面 `onLoad` 接收：

```js
options.customerId || options.id
```

内部统一为 `customerId`，有值时只读调用：

```js
wx.cloud.callFunction({
  name: 'getCustomer',
  data: { customerId }
})
```

成功后将 `res.result.customer` 通过 V2 只读 adapter 脱敏和归一，再进入本地 mock 素材匹配。

## 5. 跳转参数说明

以下入口点击“推荐素材”时只传：

```text
customerId=<当前客户真实ID>
```

已处理入口：

- `pipeline -> trust-materials`
- `customer-detail -> trust-materials`
- `ai-assistant -> trust-materials`

URL 不传手机号、openid、详细地址、身份证、内部备注或完整 customer 对象。

## 6. 素材匹配规则说明

素材匹配在 `utils/materialMapper.js` 内完成，输入为已脱敏客户字段：

- 客户阶段
- 预算
- 风格
- 面积
- 来源
- 需求摘要
- 当前顾虑
- 风险等级
- 是否已报价
- 是否临门一脚
- 是否签约前

规则分层：

- 新线索 / 已沟通：透明工地介绍、业主每日进度样例、装修流程说明。
- 已量房 / 已出方案：同户型案例、设计方案沟通样例、工艺标准说明。
- 已报价 / 重点推进：报价解释素材、水电验收照片、防水验收说明、质保说明。
- 临门一脚 / 准备签单：签约清单、质保说明、透明日报样例、老客户评价。
- 高风险：施工透明证据、工地过程照片样例、业主评价、增项控制说明。

输出字段包括：

- 推荐素材列表
- 推荐原因
- 推荐发送场景
- 对应客户顾虑
- mock 发送话术

## 7. mock fallback 说明

fallback 规则：

1. 无 `customerId`：展示默认 mock 客户和 mock 素材，状态为 `Mock fallback`。
2. 有 `customerId` 且 `getCustomer` 成功：使用真实客户字段匹配 mock 素材，状态为 `真实客户字段 + Mock 素材`。
3. 有 `customerId` 但 `getCustomer` 失败：回退 mock 客户字段和 mock 素材，状态为 `客户读取失败，已回退 mock`。
4. 有 `customerId` 但返回客户 ID 与 URL 不一致：显示 `客户上下文异常，请返回重新打开`，不静默展示其它客户素材。

## 8. 隐私保护说明

页面不展示：

- 完整手机号
- openid
- ownerOpenid
- createdByOpenid
- updatedByOpenid
- 身份证
- 详细门牌号
- 内部敏感备注

素材推荐和 mock 发送话术不拼接客户手机号、openid、详细地址、身份证、内部备注或完整客户对象。

## 9. 禁止调用清单

本阶段未调用：

- 真实 `stage_logs`
- 真实 `photos`
- 真实 `design_drawings`
- 真实 `case_authorizations`
- 真实 `projects`
- `aiGenerateOwnerSummary`
- 真实 AI API
- `createProject`
- 写跟进记录接口
- 任何数据库写入

本阶段未修改：

- V1 页面
- `cloudfunctions/`
- 工作台入口
- tabBar
- 部署配置

## 10. 验证方式

建议验证：

1. pipeline 点击真实客户“推荐素材”，URL 只带 `customerId`。
2. customer-detail 点击“推荐素材”，URL 只带 `customerId`。
3. ai-assistant 点击“打开推荐素材库”，URL 只带 `customerId`。
4. trust-materials 成功读取真实客户后显示 `真实客户字段 + Mock 素材`。
5. getCustomer 失败时显示 `客户读取失败，已回退 mock`。
6. 无 `customerId` 时显示 `Mock fallback`。
7. 上下文 ID 不一致时显示 `客户上下文异常，请返回重新打开`。
8. 推荐卡展示标题、类型、适合阶段、解决顾虑、发送场景、推荐原因和 mock 发送按钮。
9. mock 发送按钮只弹窗，不请求 API、不分享、不写库。
10. 页面不展示完整手机号、openid、详细地址、身份证或内部备注。

## 11. Phase 3B-5 前置条件

进入 Phase 3B-5 前需要人工确认：

- Phase 3B-4 推荐素材匹配是否符合销售使用预期。
- 是否允许下一阶段接入更多只读真实上下文。
- 是否继续保持只读，还是准备设计写入能力。
- 若涉及真实集合或写库，必须重新进入 Human Gate。
