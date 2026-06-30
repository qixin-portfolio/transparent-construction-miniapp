# 透明工地 V2：成交闭环版 Phase 3B-1 pipeline 只读接入

## 1. 当前阶段

Phase 3B-1：pipeline 只读接入 `listCustomers`。

安全检查点：

- tag：`v2-deal-loop-phase3a-readonly-audit`
- commit：`5b9fd800a564a7f88174458b46a8259c3ae33df0`

本阶段只让 V2 pipeline 页面优先读取现有 `listCustomers` 云函数。读取失败、返回空或字段不符合预期时，自动回退到 Phase 2.5 的本地 mock customers。

## 2. 本阶段目标

- V2 pipeline 首屏优先显示真实客户列表。
- 真实客户数据只做只读展示，不写入任何集合。
- 保留 mock fallback，确保云函数不可用或权限不足时页面仍可验收。
- 不接入 `projects / stage_logs / photos / design_drawings / case_authorizations`。
- 不进入 Phase 3B-2。

## 3. 修改文件列表

- `AI_TASKS/V2_DEAL_LOOP_PHASE3B1_PIPELINE_READONLY.md`
- `miniprogram/subpackages/deal-loop/pages/pipeline/pipeline.js`
- `miniprogram/subpackages/deal-loop/pages/pipeline/pipeline.wxml`
- `miniprogram/subpackages/deal-loop/pages/pipeline/pipeline.wxss`
- `miniprogram/subpackages/deal-loop/utils/v1ReadonlyAdapters.js`

## 4. listCustomers 调用说明

pipeline 页面加载时执行一次现有只读云函数：

- 函数名：`listCustomers`
- 调用位置：`miniprogram/subpackages/deal-loop/pages/pipeline/pipeline.js`
- 调用目的：读取当前登录用户权限范围内的 V1 客户列表。
- 数据用途：映射为 pipeline 成交卡片。
- 写入行为：无。

调用结果处理：

- 成功且返回可映射客户：页面显示“真实客户数据”。
- 返回空或字段无法映射：页面显示“Mock fallback”。
- 调用失败或权限不足：页面显示“加载失败，已回退 mock”。

## 5. 字段映射说明

适配层位置：

`miniprogram/subpackages/deal-loop/utils/v1ReadonlyAdapters.js`

本阶段只实现 customer 相关函数：

- `mapCustomerToPipelineCard(customer)`
- `mapCustomerListToPipelineCards(customers)`

字段映射原则：

- `_id / id / customerId` -> `id` 和 `customerId`
- `name / customerName` -> 客户姓名
- `stage / dealStatus / lifecycleStatus` -> pipeline 阶段
- `community / communityName / houseInfo.community / address` -> 小区展示文本
- `area / houseInfo.area` -> 面积
- `style / stylePreference / houseInfo.style` -> 风格
- `budgetRange / budget / expectedBudget` -> 预算
- `source` -> 来源

安全默认值：

- 缺少姓名：显示“未命名客户”。
- 缺少小区：显示“小区待确认”。
- 缺少面积：显示“面积待确认”。
- 缺少风格：显示“风格待确认”。
- 缺少预算：显示“预算待确认”。

## 6. mock fallback 说明

继续复用：

`miniprogram/subpackages/deal-loop/mock/customers.js`

fallback 触发条件：

- 云函数调用失败。
- 云函数返回 `error`。
- 返回值没有 `items` 数组。
- `items` 为空。
- 客户记录缺少可映射 ID。

fallback 后页面仍保留 Phase 2.5 的成交动作感卡片。

## 7. 隐私保护说明

本阶段 pipeline 不展示以下敏感字段：

- 完整手机号
- 身份证
- 微信 openid
- ownerOpenid
- createdByOpenid
- updatedByOpenid
- 详细门牌号

地址处理原则：

- 优先使用 `community/communityName/houseInfo.community`。
- 仅在没有小区字段时，从 `address` 提取简短展示文本。
- 不在 pipeline 卡片展示完整地址。

真实客户数据仅用于 V2 内部 mock 原型展示，不传给第三方 API，不产生跟进记录。

## 8. 禁止调用清单

本阶段禁止：

- 调用除 `listCustomers` 以外的云函数。
- 调用 `createProject`。
- 调用 `submitStageLog`。
- 调用 `reviewStageLog`。
- 调用真实 AI API。
- 读取或写入 `projects`。
- 读取或写入 `stage_logs`。
- 读取或写入 `photos`。
- 读取或写入 `design_drawings`。
- 读取或写入 `case_authorizations`。
- 直接使用数据库 SDK，例如 `db.collection` 或 `cloud.database`。
- 修改工作台入口。
- 修改 tabBar。
- 部署或上传体验版。

## 9. 验证方式

需要检查：

1. `git diff --check`。
2. 变更范围只包含 V2 deal-loop 分包和本文件。
3. `cloudfunctions/` 无变更。
4. V1 页面无变更。
5. V2 代码中只存在一次允许的 `listCustomers` 调用。
6. V2 代码中无 `db.collection`。
7. V2 代码中无 `cloud.database`。
8. V2 代码中无 `createProject` 调用。
9. V2 代码中无真实 AI API。
10. 未部署，未上传体验版。

## 10. Phase 3B-2 前置条件

进入 Phase 3B-2 前必须人工确认：

- 是否允许 customer-detail 读取真实 `getCustomer`。
- 是否允许 pipeline 点击“看客户”进入真实客户详情。
- 是否继续保留 mock fallback。
- 是否限制真实客户详情仅内部角色可见。
- 是否仍然不增加工作台入口。
- 是否继续禁止 `projects / stage_logs / photos` 接入。
