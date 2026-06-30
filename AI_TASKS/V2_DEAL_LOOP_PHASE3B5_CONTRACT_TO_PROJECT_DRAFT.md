# V2 Deal Loop Phase 3B-5 Contract To Project Draft

## 1. 当前阶段

Phase 3B-5：签约转工地草案基于真实客户字段生成。

## 2. 本阶段目标

让 V2 `contract-to-project` 页面接收真实 `customerId`，只读调用现有 `getCustomer`，再基于真实客户字段生成“工地创建草案”。

本阶段只生成草案，不创建真实工地，不写 `projects`。

## 3. 修改文件列表

- `miniprogram/subpackages/deal-loop/pages/contract-to-project/contract-to-project.js`
- `miniprogram/subpackages/deal-loop/pages/contract-to-project/contract-to-project.wxml`
- `miniprogram/subpackages/deal-loop/pages/contract-to-project/contract-to-project.wxss`
- `miniprogram/subpackages/deal-loop/pages/customer-detail/customer-detail.js`
- `miniprogram/subpackages/deal-loop/utils/v1ReadonlyAdapters.js`
- `AI_TASKS/V2_DEAL_LOOP_PHASE3B5_CONTRACT_TO_PROJECT_DRAFT.md`

## 4. getCustomer 调用说明

`contract-to-project` 页面 `onLoad` 接收：

```js
options.customerId || options.id
```

内部统一为 `customerId`。有 `customerId` 时，只读调用：

```js
wx.cloud.callFunction({
  name: 'getCustomer',
  data: { customerId }
})
```

成功后读取 `res.result.customer`，通过 V2 只读 adapter 做脱敏、归一和草案生成。

## 5. 跳转参数说明

`customer-detail -> contract-to-project` 已统一只传：

```text
customerId=<当前客户真实ID>
```

URL 不传手机号、openid、详细地址、身份证、内部备注或完整 customer 对象。

## 6. 草案字段映射说明

草案由脱敏后的真实客户字段生成，不写数据库。

字段映射：

- `customer._id / customerId -> project.customerId`
- `客户姓名 -> 业主姓名`
- `小区 / 面积 / 风格 -> 工地基础信息`
- `预算 / 需求 -> 项目备注`
- `当前阶段 -> 转工地前置状态`

页面展示草案字段：

- `project.customerId`
- 业主姓名草案
- 工地小区草案
- 工地面积草案
- 装修风格草案
- 预算备注
- 客户来源备注
- 转工地前置状态
- 项目备注草案

## 7. createProject 禁止调用说明

本阶段没有调用 `createProject`。

页面按钮为 mock 动作，只弹窗提示：

```text
Phase 3B-5 仅生成草案，不调用 createProject，不写 projects。
```

不会创建项目，不写 `projects`、`project_members` 或 `customers`。

## 8. mock fallback 说明

fallback 规则：

1. 无 `customerId`：展示默认 mock 草案，状态为 `Mock fallback`。
2. 有 `customerId` 且 `getCustomer` 成功：使用真实客户字段生成草案，状态为 `真实客户字段 + 工地草案`。
3. 有 `customerId` 但 `getCustomer` 失败：显示 `客户读取失败，已回退 mock`。
4. 有 `customerId` 但返回客户 ID 与 URL 不一致：显示 `客户上下文异常，请返回重新打开`，不生成错误客户草案。

## 9. 隐私保护说明

页面不展示：

- 完整手机号
- openid
- ownerOpenid
- createdByOpenid
- updatedByOpenid
- 身份证
- 详细门牌号
- 内部敏感备注

草案不拼接完整手机号、openid、详细地址、身份证、内部备注或完整 customer 对象。

## 10. 验证方式

建议验证：

1. 从 customer-detail 点击“生成工地草案”，URL 只带 `customerId`。
2. contract-to-project 成功读取真实客户后显示 `真实客户字段 + 工地草案`。
3. 无 `customerId` 时显示 `Mock fallback`。
4. `getCustomer` 失败时显示 `客户读取失败，已回退 mock`。
5. URL `customerId` 与返回客户 ID 不一致时显示 `客户上下文异常，请返回重新打开`。
6. 草案展示字段映射清楚，且不展示隐私字段。
7. 点击 `生成工地草案（mock）` 只弹窗，不调用接口、不写库。
8. 代码中没有 `createProject` 调用、没有 `db.collection`、没有 `cloud.database`、没有 `wx.request`。

## 11. Phase 3B-6 前置条件

进入 Phase 3B-6 前需要人工确认：

- Phase 3B-5 草案字段是否满足签约转工地前的人审需求。
- 是否需要增加更多草案字段。
- 是否继续保持只读，还是准备设计真实写入能力。
- 一旦涉及真实创建工地或写库，必须重新进入 Human Gate。
