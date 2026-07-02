# 透明工地 V2：成交闭环版 - Phase 6-Q 销售动作卡规则增强最小实现

## 1. 当前阶段

Phase 6-Q：销售动作卡规则增强最小实现

## 2. 当前 HEAD / tag

- 当前 HEAD：ad10119c0eb45548536d532bfa2b2251c613eb46
- 当前 tag：v2-deal-loop-phase6p-sales-action-feedback-review
- 当前安全状态：V2 工作台入口关闭

## 3. 本阶段目标

本阶段增强 pipeline 和 customer-detail 中“销售下一步动作卡”的本地规则、跟进重点、风险提示和复制话术。

本阶段仍只做前端展示和剪贴板复制，不写数据库，不调用真实 AI，不调用 createProject，不部署云函数，不上传体验版，不发布正式版。

## 4. 三账号反馈结论

admin / boss_qi / boss_hu 暂无有效反馈。

因此本阶段不进入真实 AI、写库、createProject 或正式发布，只继续增强低风险的销售动作卡规则和复制话术，让页面更接近老板真实成交跟进场景。

## 5. 修改文件列表

- `miniprogram/subpackages/deal-loop/pages/pipeline/pipeline.js`
- `miniprogram/subpackages/deal-loop/pages/pipeline/pipeline.wxml`
- `miniprogram/subpackages/deal-loop/pages/pipeline/pipeline.wxss`
- `miniprogram/subpackages/deal-loop/pages/customer-detail/customer-detail.js`
- `miniprogram/subpackages/deal-loop/pages/customer-detail/customer-detail.wxml`
- `miniprogram/subpackages/deal-loop/pages/customer-detail/customer-detail.wxss`
- `AI_TASKS/V2_DEAL_LOOP_PHASE6Q_SALES_ACTION_RULE_ENHANCEMENT.md`

## 6. pipeline 规则增强内容

客户列表动作卡继续使用本地规则生成，未新增接口或数据库写入。

规则增强如下：

1. 新客户 / 信息不足
   - 下一步：先补齐需求信息
   - 跟进重点：房屋情况、预算范围、装修时间
   - 提示：不要急着报价，先确认真实需求

2. 已沟通 / 已量房
   - 下一步：邀约客户确认方案
   - 跟进重点：方案方向、预算范围、下一次沟通时间
   - 提示：先把客户期待讲清楚，再进入报价

3. 已报价 / 已出方案
   - 下一步：报价后 24 小时内回访
   - 跟进重点：价格顾虑、方案取舍、付款节奏
   - 提示：不要只问考虑得怎么样，要帮客户拆顾虑

4. 高意向客户
   - 下一步：准备信任证据后跟进
   - 跟进重点：案例、工地过程、材料说明
   - 提示：客户已经有兴趣，重点是降低顾虑

5. 有明显顾虑客户
   - 下一步：先解释透明工地和施工留痕
   - 跟进重点：施工过程、材料验收、售后保障，或客户首个风险原因
   - 提示：先解决信任问题，再推动下一步

6. 已签约客户
   - 下一步：整理工地创建草案
   - 跟进重点：业主信息、房屋信息、施工阶段
   - 提示：只是草案，请人工确认，不创建真实工地

## 7. customer-detail 规则增强内容

客户详情页“下一步跟进动作”卡继续使用本地规则，根据客户阶段、预算、顾虑、需求和房屋信息生成内部参考内容。

增强内容：

- 新客户：先补齐房屋情况、预算范围、装修时间和真实需求
- 已沟通 / 已量房：确认客户最在意效果、预算还是施工过程，并约定下一次沟通
- 已报价 / 已出方案：围绕价格、材料、施工项和方案取舍拆解顾虑
- 高风险 / 高意向：先处理客户顾虑，再准备相似案例或工地过程说明
- 已签约：核对业主信息、房屋信息和开工资料，只整理工地创建草案

建议动作列表统一保持 3 条，方便老板或销售快速判断下一步怎么跟。

## 8. 复制话术增强内容

复制话术按客户阶段生成不同文案：

- 新客户：不急着报价，先确认房屋情况、预算范围和最在意的点
- 已沟通 / 已量房：先确认需求，再安排下一步方案和报价
- 已报价：提示客户重点看价格、材料、施工过程，不催客户立即决定
- 有顾虑客户：解释施工节点、现场照片、材料确认和后期保障都会留痕
- 已签约客户：说明后续工地进度、现场照片和关键节点尽量有记录、有确认

复制能力仍只使用 `wx.setClipboardData`，只复制到剪贴板，不发送消息，不写数据库，不请求接口，不上传文件。

## 9. 页面安全提示

本阶段在页面中保留并补充安全提示：

- 以下内容为内部参考，请结合实际情况人工判断
- 复制话术仅复制到剪贴板，不会自动发送
- 当前不写入跟进记录，不影响现有客户数据
- 当前不调用真实 AI
- 已签约客户只整理草案，不创建真实工地

页面文案继续避免暗示自动判断、自动跟进、自动发送、自动创建工地或自动发布内容。

## 10. 未改变的能力边界

本阶段未改变以下边界：

- 未修改 `cloudfunctions/`
- 未修改 `miniprogram/app.json`
- 未修改工作台入口
- 未修改 tabBar
- 未修改 `ai-assistant / trust-materials / contract-to-project / case-assets`
- 未打开 `ENABLE_V2_DEAL_LOOP_ENTRY`
- 未上传体验版
- 未部署云函数
- 未发布正式版
- 未新增数据库写入
- 未新增真实 AI API
- 未调用 `createProject`
- 未新增 `wx.request`
- 未新增 `getTempFileURL`
- 未新增自动发送消息能力

## 11. 测试结果

已执行检查：

- `node --check miniprogram/subpackages/deal-loop/pages/pipeline/pipeline.js`
- `node --check miniprogram/subpackages/deal-loop/pages/customer-detail/customer-detail.js`
- `git diff --check`
- `git status`

检查结论：

- JavaScript 语法检查通过
- diff 空白检查通过
- `ENABLE_V2_DEAL_LOOP_ENTRY = false`
- 最终提交前仅包含本阶段允许修改文件

## 12. 发布判断

本阶段不发布正式版。

当前销售动作卡规则增强仍属于 V2 内部试验功能，不建议直接开放给真实业主、工长、普通销售或外部客户。

如需体验，应后续重新走短期打开入口、人工上传体验版、上传后关闭入口、关闭版覆盖上传流程。

## 13. 是否建议进入 Phase 6-R

建议进入 Phase 6-R。

建议 Phase 6-R 作为本地人工验收阶段，重点检查：

- pipeline 客户列表动作卡是否更具体
- customer-detail 跟进判断和 3 条建议动作是否清楚
- 复制话术是否自然、可用
- 页面安全提示是否足够明确
- 是否仍保持不写库、不调用真实 AI、不自动发送、不创建真实工地
