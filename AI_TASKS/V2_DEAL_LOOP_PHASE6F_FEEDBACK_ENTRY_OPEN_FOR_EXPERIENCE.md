# 透明工地 V2：成交闭环版 - Phase 6-F 反馈模块体验版短期打开准备

## 1. 当前阶段

Phase 6-F：反馈模块体验版短期打开准备

## 2. 当前 HEAD / tag

- 阶段执行前 HEAD：49a7f373d89c8b8edb75df932e73694bb9c28f46
- 前置 tag：v2-deal-loop-phase6e-feedback-experience-decision
- 当前入口打开前安全 tag：v2-deal-loop-phase6e-feedback-experience-decision

## 3. 本阶段目标

本阶段目标是为反馈模块再次体验版上传做准备，短期打开 V2 成交跟进入口，并形成明确的“反馈模块体验版入口打开”commit/tag。

本阶段仅做入口打开准备：

- 不上传体验版
- 不部署云函数
- 不发布正式版
- 不新增数据库写入
- 不新增真实 AI API
- 不调用 `createProject`

体验版上传后必须立即进入 Phase 6-G 关闭入口。

## 4. 人工确认的测试账号与体验窗口

人工确认信息：

- 测试账号：boss_qi
- 体验窗口：1 天以内
- 体验对象：仅老板内部体验
- 体验范围：只验证反馈模块与成交跟进提示

本阶段不开放：

- 业主端
- 工长端
- 普通销售
- 外部装修公司客户
- 真实业主

## 5. 本次体验目标

本次体验目标是验证 Phase 6-B 新增模块是否有实际价值：

1. 老板是否看得懂“本轮体验反馈”
2. 老板是否愿意复制反馈问题
3. pipeline 页面“销售跟进提示”是否有帮助
4. customer-detail 页面“成交跟进复盘”是否有帮助
5. 是否还需要做真实反馈表单
6. 是否值得继续增强销售跟进能力

本次不验证真实 AI、不验证真实创建工地、不验证自动发布内容。

## 6. 修改文件列表

本阶段修改：

- `miniprogram/pages/workbench/workbench.js`
- `AI_TASKS/V2_DEAL_LOOP_PHASE6F_FEEDBACK_ENTRY_OPEN_FOR_EXPERIENCE.md`

本阶段未修改：

- `cloudfunctions/`
- `miniprogram/app.json`
- tabBar
- V2 六个页面
- 数据库写入逻辑
- 云函数调用逻辑
- 部署配置

## 7. 入口开关变更

本阶段将入口开关从：

```js
const ENABLE_V2_DEAL_LOOP_ENTRY = false
```

短期改为：

```js
const ENABLE_V2_DEAL_LOOP_ENTRY = true
```

该状态只用于反馈模块体验版短期准备，不代表正式打开入口，不代表正式发布，不代表正式交付。

体验版上传后必须进入 Phase 6-G，并恢复：

```js
const ENABLE_V2_DEAL_LOOP_ENTRY = false
```

## 8. 入口显示条件

入口显示条件保持不变：

```js
ENABLE_V2_DEAL_LOOP_ENTRY && isBoss
```

角色范围未扩大，`isBoss` 仍为：

- admin
- boss_qi
- boss_hu

本阶段不做单一测试账号代码限制。实际体验通知层面仅通知 boss_qi。

## 9. 体验版说明文案

体验版备注建议直接使用：

透明工地 V2 成交跟进试验功能。本次重点验证反馈模块与销售跟进提示。仅限 boss_qi 老板内部体验。本版本只读客户资料，不创建真实工地，不调用真实 AI，不自动发布内容，不影响现有客户、工地和日报数据。请勿转发给非测试人员。体验结束后关闭入口。

## 10. 风险提示

必须明确以下风险边界：

- 当前不是正式发布
- 当前不是正式上线
- 当前不是正式交付
- 当前只是反馈模块体验版入口打开准备
- 体验结束后必须关闭入口
- 不得发布正式版
- 不得给真实业主或外部客户使用
- 不得宣传为真实 AI 功能
- 不得宣传为一键创建工地能力
- 不得宣传为案例自动发布能力

体验版仍存在转发风险，且当前 `isBoss` 角色判断仍偏粗，因此体验通知必须只发给 boss_qi。

## 11. 回滚方案

当前入口打开前安全 tag：

```text
v2-deal-loop-phase6e-feedback-experience-decision
```

如体验版发现问题：

1. 立即进入 Phase 6-G
2. 恢复 `ENABLE_V2_DEAL_LOOP_ENTRY = false`
3. 提交关闭入口 commit/tag
4. 如已上传体验版，则重新上传关闭入口后的体验版覆盖
5. 如代码异常，回滚到安全 tag：`v2-deal-loop-phase6e-feedback-experience-decision`

当前不需要部署云函数。

## 12. 上传体验版人工操作提示

下一步由人工在微信开发者工具中上传体验版。

上传前必须确认：

- 当前 commit/tag 是 Phase 6-F 入口打开状态
- `ENABLE_V2_DEAL_LOOP_ENTRY = true`
- 入口仍仅在 `isBoss` 条件下显示
- 体验版备注使用本文件第 9 节文案
- 只通知 boss_qi
- 不发布正式版

上传后必须立即进入 Phase 6-G 关闭入口。

## 13. 是否建议进入 Phase 6-G

建议上传体验版后立即进入 Phase 6-G：反馈模块体验版上传后关闭入口。

Phase 6-G 必须完成：

- 恢复 `ENABLE_V2_DEAL_LOOP_ENTRY = false`
- 提交关闭入口 commit/tag
- 如体验版已上传，则重新上传关闭入口后的体验版覆盖
- 不部署云函数
- 不发布正式版

结论：

- `ENABLE_V2_DEAL_LOOP_ENTRY` 已短期改为 `true`
- 入口仍仅在 `isBoss` 条件下显示
- 本阶段未上传体验版
- 本阶段未部署云函数
- 本阶段未发布正式版
- 下一步由人工在微信开发者工具上传体验版
- 上传体验版后必须进入 Phase 6-G 关闭入口
- 体验结束必须恢复 `false`
