# 透明工地 V2：成交闭环版 - Phase 6-I-C 三账号体验版短期打开准备

## 1. 当前阶段

Phase 6-I-C：三账号体验版短期打开准备

## 2. 当前 HEAD / tag

- 阶段执行前 HEAD：995b0fbfbe618332527594f5eac137fb4f33fdce
- 前置 tag：v2-deal-loop-phase6i-b-three-tester-experience-checklist
- 当前入口打开前安全 tag：v2-deal-loop-phase6i-b-three-tester-experience-checklist

## 3. 本阶段目标

本阶段目标是为 admin + boss_qi + boss_hu 三账号受控体验版上传做准备，短期打开 V2 成交跟进入口，并形成明确的入口打开 commit/tag。

本阶段只做入口打开准备：

- 不上传体验版
- 不部署云函数
- 不发布正式版
- 不新增数据库写入
- 不新增真实 AI API
- 不调用 `createProject`

体验版上传后必须立即进入 Phase 6-I-D 关闭入口。

## 4. 体验名单

人工确认体验名单：

- admin：管理员验收账号
- boss_qi：老板业务反馈账号
- boss_hu：老板业务反馈账号

明确不开放：

- 业主端
- 工长端
- 普通销售
- 外部装修公司客户
- 真实业主
- 非测试人员

## 5. 体验窗口

体验窗口：1 天以内。

体验结束后必须关闭入口，并基于关闭入口 commit 重新上传体验版覆盖。

## 6. 修改文件列表

本阶段修改：

- `miniprogram/pages/workbench/workbench.js`
- `AI_TASKS/V2_DEAL_LOOP_PHASE6I_C_THREE_TESTER_ENTRY_OPEN.md`

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

该状态只用于三账号体验版短期准备，不代表正式打开入口，不代表正式上线，不代表正式交付。

体验版上传后必须进入 Phase 6-I-D，并恢复：

```js
const ENABLE_V2_DEAL_LOOP_ENTRY = false
```

## 8. 入口显示条件

入口显示条件保持不变：

```js
ENABLE_V2_DEAL_LOOP_ENTRY && isBoss
```

当前 `isBoss` 已覆盖：

- admin
- boss_qi
- boss_hu

本阶段不修改角色逻辑，不扩大角色范围。

## 9. 体验版说明文案

体验版备注建议直接使用：

透明工地 V2 成交跟进试验功能。本次仅限 admin、boss_qi、boss_hu 内部体验，重点验证反馈模块、销售跟进提示和成交复盘是否有实际价值。本版本只读客户资料，不创建真实工地，不调用真实 AI，不自动发布内容，不影响现有客户、工地和日报数据。请勿转发给非测试人员。体验结束后关闭入口。

## 10. 反馈收集文案

供人工发给 admin / boss_qi / boss_hu 的反馈问题：

1. 你能不能一眼看懂“成交跟进”是干什么的？
2. “本轮体验反馈”模块有没有用？
3. 你愿不愿意复制反馈问题？
4. “销售跟进提示”有没有帮助？
5. “成交跟进复盘”有没有帮助？
6. 哪个页面最有价值？
7. 哪个页面最没用或看不懂？
8. 有没有误以为它是真 AI？
9. 有没有误以为它会创建真实工地？
10. 有没有误以为它能自动发布案例？
11. 下一步你最希望先做哪个功能？

建议按账号分别记录反馈，区分管理员验收反馈与老板业务反馈。

## 11. 风险提示

必须明确以下风险边界：

- 当前不是正式发布
- 当前不是正式上线
- 当前不是正式交付
- 当前只是三账号体验版入口打开准备
- 体验结束后必须关闭入口
- 不得发布正式版
- 不得给真实业主、工长、普通销售、外部客户使用
- 不得宣传为真实 AI 功能
- 不得宣传为一键创建工地能力
- 不得宣传为案例自动发布能力

体验版仍存在被转发风险，因此只通知 admin / boss_qi / boss_hu。

## 12. 回滚方案

当前入口打开前安全 tag：

```text
v2-deal-loop-phase6i-b-three-tester-experience-checklist
```

如体验版发现问题：

1. 立即进入 Phase 6-I-D
2. 恢复 `ENABLE_V2_DEAL_LOOP_ENTRY = false`
3. 提交关闭入口 commit/tag
4. 如已上传体验版，则重新上传关闭入口后的体验版覆盖
5. 如代码异常，回滚到安全 tag：`v2-deal-loop-phase6i-b-three-tester-experience-checklist`

当前不需要部署云函数。

## 13. 上传体验版人工操作提示

下一步由人工在微信开发者工具中上传体验版。

上传前必须确认：

- 当前 commit/tag 是 Phase 6-I-C 入口打开状态
- `ENABLE_V2_DEAL_LOOP_ENTRY = true`
- 入口仍仅在 `ENABLE_V2_DEAL_LOOP_ENTRY && isBoss` 时显示
- 体验名单为 admin + boss_qi + boss_hu
- 体验版备注使用本文件第 9 节文案
- 反馈收集使用本文件第 10 节问题
- 不发布正式版

上传后必须立即进入 Phase 6-I-D 关闭入口。

## 14. 是否建议进入 Phase 6-I-D

建议上传体验版后立即进入 Phase 6-I-D：三账号体验版上传后关闭入口。

Phase 6-I-D 必须完成：

- 恢复 `ENABLE_V2_DEAL_LOOP_ENTRY = false`
- 提交关闭入口 commit/tag
- 如体验版已上传，则重新上传关闭入口后的体验版覆盖
- 不部署云函数
- 不发布正式版

结论：

- `ENABLE_V2_DEAL_LOOP_ENTRY` 已短期改为 `true`
- 入口仍仅在 `ENABLE_V2_DEAL_LOOP_ENTRY && isBoss` 时显示
- 体验名单为 admin + boss_qi + boss_hu
- 本阶段未上传体验版
- 本阶段未部署云函数
- 本阶段未发布正式版
- 下一步由人工在微信开发者工具上传体验版
- 上传体验版后必须进入 Phase 6-I-D 关闭入口
- 体验结束必须恢复 `false`
