# V2 Deal Loop Phase 3B3 AI Assistant Mock Real Customer

## 1. 当前阶段
Phase 3B-3：AI 助手基于真实客户字段生成本地 mock 建议。

## 2. 本阶段目标
让 V2 ai-assistant 页面优先只读调用现有 getCustomer 云函数获取真实客户字段；基于真实字段生成本地 mock 跟进建议；失败时自动回退现有 mock。不接真实 AI API，不调用 AI 云函数，不写数据库。

## 3. 修改文件列表
- miniprogram/subpackages/deal-loop/pages/ai-assistant/ai-assistant.js
- miniprogram/subpackages/deal-loop/utils/aiMockEngine.js
- AI_TASKS/V2_DEAL_LOOP_PHASE3B3_AI_ASSISTANT_MOCK_REAL_CUSTOMER.md

## 4. getCustomer 调用说明
只在 ai-assistant.js 中出现一次运行时云函数调用：
- name: 'getCustomer'
- data: { customerId }
- 成功：将返回的 result.customer 映射为详情展示数据。
- 失败：回退本地 mock 客户 + mock 建议。

## 5. customer-detail 跳转说明
customer-detail 点击 AI 话术时，只传递 customerId：
- wxml：`<button bindtap="goAssistant">打开 AI 话术</button>`
- js：`wx.navigateTo({ url: `/subpackages/deal-loop/pages/ai-assistant/ai-assistant?id=${customerId}` })`
- URL query 中不传手机号、openid、详细地址、身份证、内部备注等敏感字段。

## 6. AI mock 规则说明
在 aiMockEngine.js 中新增基于真实客户字段的本地规则：
- deriveConcern(customer)：读取 customer.concern 或 customer.need
- pickMaterialIds(customer)：根据 actionBucket / pipelineStage 选择素材
- buildFallbackSuggestion(customer)：基于客户真实字段生成建议

输入字段：客户阶段、预算、风格、面积、来源、需求摘要、当前顾虑、房屋信息简要、是否高风险、是否临近签约。

输出结构：
- 客户当前顾虑
- 推荐跟进方式
- 可发送素材类型
- 建议话术
- 下一步动作
- 风险提醒

示例逻辑：
- 已报价 / 重点推进 / 临门一脚：推荐解释报价差异，发送水电验收、防水验收、工地日报类信任素材，话术偏成交推进。
- 新线索 / 已沟通：推荐先确认房屋信息和装修时间，发送透明工地介绍、真实工地过程素材，话术偏建立信任。
- 预算偏低：推荐解释预算拆分，强调透明报价和增项控制。
- 高风险：推荐当天跟进，提醒不要强推，先解决顾虑。

## 7. mock fallback 说明
触发条件：
- 没有 customerId
- getCustomer 调用失败
- 返回空数据
- 权限失败
- 字段无法映射
- aiMockEngine 无法生成建议

fallback 继续使用：
- ../../mock/customers getCustomerById
- ../../utils/aiMockEngine generateSuggestion

## 8. 隐私保护说明
AI mock 输出中不得包含：
- 完整手机号
- openid / ownerOpenid / createdByOpenid / updatedByOpenid
- 身份证
- 详细门牌号
- 内部敏感备注

只使用客户阶段、预算、风格、面积、来源、需求摘要、当前顾虑、房屋信息简要、是否高风险、是否临近签约等非敏感字段。

## 9. 禁止调用清单
- 不调用真实 AI API
- 不调用 aiGenerateOwnerSummary
- 不调用除 getCustomer 以外的云函数
- 不回写 customers 集合
- 不创建跟进记录
- 不创建工地
- 不接入 projects / stage_logs / photos / design_drawings / case_authorizations
- 不修改 V1 页面
- 不修改 cloudfunctions/

## 10. 验证方式
1. 在微信开发者工具中打开 ai-assistant 页面。
2. 使用真实 customerId 参数访问，验证能显示基于真实客户字段的 mock 建议。
3. 模拟 getCustomer 失败（断开网络或修改云函数名），验证自动回退 mock。
4. 检查建议内容不包含完整手机号、openid、身份证、详细门牌号。
5. 检查数据源状态显示：真实客户字段 / Mock fallback / 加载失败，已回退 mock。

## 11. Phase 3B-4 前置条件
- ai-assistant 基于真实客户字段生成本地 mock 建议验收通过
- customer-detail 只读接入验收通过
- 用户确认允许继续只读接入其他页面
