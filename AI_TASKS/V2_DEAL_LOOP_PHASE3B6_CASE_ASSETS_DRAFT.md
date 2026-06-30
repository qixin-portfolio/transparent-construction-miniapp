# V2 Deal Loop Phase 3B-6 Case Assets Draft

## 1. 当前阶段

Phase 3B-6：工地转案例资产草案基于真实客户字段生成。

## 2. 本阶段目标

让 V2 `case-assets` 页面接收真实 `customerId`，只读调用现有 `getCustomer`，再基于真实客户字段生成 mock 案例内容资产草案。

本阶段只生成草案，不读取真实工地、真实日报、真实照片、真实图纸、真实案例授权，不自动发布，不写数据库。

## 3. 修改文件列表

- `miniprogram/subpackages/deal-loop/pages/case-assets/case-assets.js`
- `miniprogram/subpackages/deal-loop/pages/case-assets/case-assets.wxml`
- `miniprogram/subpackages/deal-loop/pages/case-assets/case-assets.wxss`
- `miniprogram/subpackages/deal-loop/mock/caseAssets.js`
- `AI_TASKS/V2_DEAL_LOOP_PHASE3B6_CASE_ASSETS_DRAFT.md`

## 4. getCustomer 调用说明

`case-assets` 页面 `onLoad` 接收：

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

成功后读取 `res.result.customer`，通过 V2 只读 adapter 做脱敏、归一和上下文校验，再交给本地 mock 生成器产出案例资产草案。

## 5. 跳转参数说明

本阶段页面已支持开发者直达和 future link：

```text
/subpackages/deal-loop/pages/case-assets/case-assets?customerId=<当前客户真实ID>
```

兼容旧参数：

```text
?id=<当前客户真实ID>
```

进入 `case-assets` 时只需要传 `customerId`，不传手机号、openid、详细地址、身份证、内部备注或完整 customer 对象。

当前没有强行增加工作台入口，也没有修改 tabBar。

## 6. 案例资产草案生成规则

输入字段来自脱敏后的客户详情：

- 客户姓名
- 当前阶段
- 小区
- 面积
- 风格
- 预算段
- 来源
- 需求摘要
- 当前顾虑

输出 mock 草案：

- 小红书笔记标题草案
- 抖音短视频选题
- 官网案例摘要
- GEO 问答素材
- 可用素材清单 mock
- 授权状态 mock
- 内容草案

生成规则：

1. 小红书标题突出面积、风格、报价和透明工地过程。
2. 抖音选题突出客户担心点、签约前犹豫和施工过程可见性。
3. 官网摘要面向官网/GEO，强调户型、风格、预算段、透明工地和过程留痕。
4. GEO 问答围绕“施工进度怎么放心”“为什么签约前看工地过程”“签约前该看哪些材料”生成。
5. 可用素材清单固定为本地 mock：透明日报样例、水电验收说明、防水验收说明、工艺节点说明、质保说明、老客户评价、同户型案例草案。
6. 授权状态默认显示 `未进入真实授权流程`，并说明当前不读取 `case_authorizations`，不生成真实公开案例。

## 7. mock fallback 说明

fallback 规则：

1. 无 `customerId`：展示默认 mock 案例草案，状态为 `Mock fallback`。
2. 有 `customerId` 且 `getCustomer` 成功：使用真实客户字段生成 mock 案例草案，状态为 `真实客户字段 + Mock 案例草案`。
3. 有 `customerId` 但 `getCustomer` 失败：显示 `客户读取失败，已回退 mock`。
4. 有 `customerId` 且本地 mock 无同 ID：使用通用 mock 案例演示客户，不冒充其它真实客户。
5. 有 `customerId` 但返回客户 ID 与 URL 不一致：显示 `客户上下文异常，请返回重新打开`，不生成错误客户草案。

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

案例草案不拼接完整手机号、openid、详细地址、身份证、内部备注或完整 customer 对象。

需求摘要、客户顾虑等自由文本进入草案前会做本地脱敏，避免把手机号、openid、身份证或详细门牌号带入平台文案。

## 9. 禁止调用清单

本阶段禁止：

- 读取真实工地
- 读取真实施工日报
- 读取真实照片
- 读取真实图纸
- 读取或写入真实案例授权
- 读取或写入业主档案
- 自动发布小红书、抖音、官网或 GEO 内容
- 新增云函数
- 写数据库
- 调用真实 AI
- 调用真实创建工地能力
- 写跟进记录
- 修改工作台入口
- 修改 tabBar
- 部署
- 上传体验版

## 10. 验证方式

建议验证：

1. 开发者直达 `case-assets?customerId=<真实客户ID>`，页面显示 `真实客户字段 + Mock 案例草案`。
2. 开发者直达 `case-assets?id=<真实客户ID>`，内部归一为 `customerId`。
3. 无 `customerId` 时显示 `Mock fallback`。
4. `getCustomer` 失败时显示 `客户读取失败，已回退 mock`。
5. URL `customerId` 与返回客户 ID 不一致时显示 `客户上下文异常，请返回重新打开`。
6. 页面展示当前客户姓名、阶段、小区/面积/风格、数据源状态、小红书标题、抖音选题、官网摘要、GEO 问答、素材清单和授权状态。
7. 复制按钮只复制 mock 内容，不请求 API，不写数据库，不自动发布。
8. 页面不展示完整手机号、openid、身份证、详细门牌号或内部敏感备注。
9. 代码中没有数据库读写 API、网络请求 API、真实创建工地调用、真实 AI 调用。

## 11. Phase 3B-7 前置条件

进入 Phase 3B-7 前需要人工确认：

- Phase 3B-6 的案例资产草案字段是否满足销售复用和内容运营初筛。
- 是否需要补充更多平台模板。
- 是否继续保持纯 mock，还是开始设计真实案例授权流程。
- 一旦涉及真实工地素材、真实业主授权、真实发布或写库，必须重新进入 Human Gate。
