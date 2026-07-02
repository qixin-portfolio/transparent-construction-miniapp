# 透明工地 V2：成交闭环版 - Phase 6-J 销售下一步动作卡最小实现

## 1. 当前阶段

Phase 6-J：销售跟进动作卡最小实现

## 2. 当前 HEAD / tag

- 阶段执行前 HEAD：c2b8c4187d06f391ea70b5eb2725c808c171fd14
- 前置 tag：v2-deal-loop-phase6i-f-three-tester-feedback-priority
- 当前安全状态：入口关闭，体验版入口关闭

## 3. 本阶段目标

在 V2 `pipeline` 和 `customer-detail` 页面增加“销售下一步动作卡”，帮助老板/销售更快判断每个客户下一步该做什么。

本阶段只做展示层和本地复制能力：

- 不写数据库
- 不调用真实 AI
- 不调用 `createProject`
- 不新增 `wx.request`
- 不部署云函数
- 不上传体验版
- 不发布正式版

## 4. 三账号反馈结论

admin / boss_qi / boss_hu 暂未提出明确修改建议。

因此本阶段选择推进低风险销售跟进增强，而不是进入真实 AI、写库、`createProject` 或正式发布。

## 5. 修改文件列表

本阶段修改：

- `miniprogram/subpackages/deal-loop/pages/pipeline/pipeline.js`
- `miniprogram/subpackages/deal-loop/pages/pipeline/pipeline.wxml`
- `miniprogram/subpackages/deal-loop/pages/pipeline/pipeline.wxss`
- `miniprogram/subpackages/deal-loop/pages/customer-detail/customer-detail.js`
- `miniprogram/subpackages/deal-loop/pages/customer-detail/customer-detail.wxml`
- `miniprogram/subpackages/deal-loop/pages/customer-detail/customer-detail.wxss`
- `AI_TASKS/V2_DEAL_LOOP_PHASE6J_SALES_NEXT_ACTION_MINI_IMPLEMENTATION.md`

未新增 deal-loop utils，避免扩大改动面。

## 6. pipeline 增强内容

`pipeline` 客户列表中为每个客户卡片增加“下一步动作”提示，包含：

- 下一步动作
- 跟进重点
- 提示

动作内容由页面本地规则生成，只依赖客户阶段、风险等级等只读字段。

示例：

- 已签约客户：核对签约信息，整理工地创建草案
- 高风险或临门一脚客户：先确认客户当前最大顾虑
- 已报价或已出方案客户：报价后 24 小时内回访
- 已量房或已到店客户：邀约客户确认方案
- 其它客户：准备信任证据后再跟进

页面文案保持“内部参考 / 人工判断”语气，不写入客户记录，不改变客户状态。

## 7. customer-detail 增强内容

`customer-detail` 页面新增“下一步跟进动作”卡片，包含：

- 当前判断
- 2-3 条建议动作
- 可复制跟进话术
- 复制跟进话术按钮

详情页规则同样只基于只读客户资料生成，保持本地展示性质。

## 8. 动作规则说明

动作规则为简单本地规则：

- 已签约客户：整理工地创建草案，但不创建真实工地
- 高风险或准备签单客户：先确认客户顾虑，再准备证明材料
- 已报价或已出方案客户：24 小时内回访报价反馈
- 已量房或已到店客户：补齐需求、预算、房屋信息并约下一步
- 其它客户：先解释透明工地和施工留痕

这些规则不是 AI 判断，不请求接口，不调用云函数，不写入数据库。

## 9. 复制能力说明

详情页新增“复制跟进话术”按钮。

复制能力边界：

- 仅使用 `wx.setClipboardData`
- 不发送消息
- 不写数据库
- 不请求接口
- 不上传文件
- 不产生客户数据变更
- 不暗示自动跟进

## 10. 未改变的能力边界

本阶段未改变以下能力边界：

- `ENABLE_V2_DEAL_LOOP_ENTRY = false`
- 未修改 `cloudfunctions/`
- 未修改 `miniprogram/app.json`
- 未修改工作台入口
- 未修改 tabBar
- 未修改 `ai-assistant`
- 未修改 `trust-materials`
- 未修改 `contract-to-project`
- 未修改 `case-assets`
- 未新增数据库写入
- 未新增真实 AI API
- 未调用 `createProject`
- 未调用 `submitStageLog`
- 未调用 `reviewStageLog`
- 未调用 `getTempFileURL`
- 未新增 `wx.request`
- 未上传体验版
- 未部署云函数
- 未发布正式版

## 11. 测试结果

已执行并通过：

```bash
node --check miniprogram/subpackages/deal-loop/pages/pipeline/pipeline.js
node --check miniprogram/subpackages/deal-loop/pages/customer-detail/customer-detail.js
git diff --check
git status
```

检查结论：

- JS 语法检查通过
- diff 空白检查通过
- 入口开关保持关闭
- 未发现越界文件修改
- 未新增受禁能力调用

## 12. 发布判断

当前不发布正式版。

当前不打开入口，不上传体验版，不部署云函数，不扩大体验范围。

## 13. 是否建议进入 Phase 6-K

可以进入 Phase 6-K，但建议 Phase 6-K 仍保持保守边界。

建议 Phase 6-K 目标：

- 本地人工验收销售下一步动作卡
- 验证页面文案是否清楚
- 验证复制跟进话术是否可用
- 检查是否存在误解为真实 AI、写库或自动跟进的风险

不建议直接进入真实 AI、真实写库、`createProject` 或正式发布。
