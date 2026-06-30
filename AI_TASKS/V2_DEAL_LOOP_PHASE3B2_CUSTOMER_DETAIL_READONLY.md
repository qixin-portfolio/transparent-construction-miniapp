# V2 Deal Loop Phase 3B2 Customer Detail Readonly

## 1. 当前阶段
Phase 3B-2：customer-detail 只读接入 getCustomer。

## 2. 本阶段目标
让 V2 customer-detail 页面优先只读调用现有 getCustomer 云函数获取真实客户详情；失败、无数据或字段不匹配时自动回退 mock 数据。pipeline 点击“看客户”时携带真实 customerId 进入详情页。

## 3. 修改文件列表
- miniprogram/subpackages/deal-loop/pages/customer-detail/customer-detail.js
- miniprogram/subpackages/deal-loop/pages/customer-detail/customer-detail.wxml
- miniprogram/subpackages/deal-loop/utils/v1ReadonlyAdapters.js
- AI_TASKS/V2_DEAL_LOOP_PHASE3B2_CUSTOMER_DETAIL_READONLY.md

## 4. getCustomer 调用说明
只在 customer-detail.js 中出现一次运行时云函数调用：
- name: 'getCustomer'
- data: { customerId }
- 调用时机：onLoad 接收 id 或 customerId 参数后进行只读获取。
- 成功：将返回的 result.customer 映射为详情展示数据。
- 失败：回退本地 mock 详情。

## 5. pipeline 跳转参数说明
pipeline 客户卡片按钮已经携带 customerId：
- wxml：`<button data-id="{{item.customerId}}" bindtap="goCustomerDetail">看客户</button>`
- js：`wx.navigateTo({ url: `/subpackages/deal-loop/pages/customer-detail/customer-detail?id=${id}` })`
- customer-detail 同时接受 id 和 customerId 参数。

## 6. 字段映射说明
在 v1ReadonlyAdapters.js 中实现：
- mapCustomerToDetail(customer) - 映射客户详情
- normalizeCustomerStage(customer) - 规范化阶段字段
- maskSensitiveCustomerFields(customer) - 脱敏敏感字段

从 V1 customer 映射到 V2 customer detail：
- _id / id / customerId -> id / customerId
- name / customerName -> 客户姓名
- stage / dealStatus / lifecycleStatus -> 成交阶段
- community / communityName / houseInfo.community / address -> 小区简短展示
- area / houseInfo.area -> 面积
- style / stylePreference / houseInfo.style -> 风格
- budgetRange / budget / expectedBudget -> 预算
- source -> 来源
- need -> 装修需求摘要
- concern（或 need 兜底）-> 当前顾虑
- todayAction / recommendedMaterial / suggestedTalk -> 今日动作/推荐素材/建议话术（通过 getActionProfile 生成）

## 7. mock fallback 说明
触发条件：
- 没有 customerId
- getCustomer 调用失败
- 返回空数据
- 权限失败
- 字段无法映射
- 客户 deleted === true

fallback 继续使用：
- ../../mock/customers getCustomerById
- ../../mock/followRecords getFollowRecordsByCustomer
- ../../utils/aiMockEngine generateSuggestion
- ../../utils/materialMapper getMaterialsByIds

## 8. 隐私保护说明
customer-detail 不展示：
- 完整手机号（maskSensitiveCustomerFields 脱敏为 138****0000 格式）
- openid / ownerOpenid / createdByOpenid / updatedByOpenid（delete 移除）
- 身份证（idCard 删除）
- 详细门牌号（address / addressDetail 通过 maskAddress 截断）
- 内部敏感备注

只展示销售跟进必要字段：客户姓名、当前成交阶段、小区简短展示、面积、风格、预算、来源、装修需求摘要、当前顾虑、今日动作、推荐素材、mock AI 建议、mock 跟进记录。

## 9. 禁止调用清单
- 不调用除 getCustomer 以外的云函数
- 不回写 customers 集合
- 不创建跟进记录
- 不创建工地
- 不调用 AI 云函数
- 不调用第三方 API
- 不修改 V1 页面
- 不修改 cloudfunctions/

## 10. 验证方式
1. 在微信开发者工具中打开 customer-detail 页面。
2. 使用真实 customerId 参数访问，验证能显示真实客户详情。
3. 模拟 getCustomer 失败（断开网络或修改云函数名），验证自动回退 mock。
4. 检查页面不展示完整手机号、openid、身份证、详细门牌号。
5. 检查数据源状态显示：真实客户详情 / Mock fallback / 加载失败，已回退 mock。

## 11. Phase 3B-3 前置条件
- customer-detail 只读接入验收通过
- pipeline 真实客户数据展示验收通过
- 用户确认允许继续只读接入其他页面
