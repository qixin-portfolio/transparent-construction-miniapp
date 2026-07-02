# 透明工地 V2：成交闭环版 - Phase 6-I-A 体验名单补充与入口角色核验

## 1. 当前阶段

Phase 6-I-A：体验名单补充与入口角色核验

## 2. 当前 HEAD / tag

- 当前 HEAD：69965765d3a01625887fdb500c411576a5fabb9a
- 当前 tag：v2-deal-loop-phase6h-feedback-experience-review
- 当前安全状态：代码入口关闭，体验版入口关闭

## 3. 本阶段目标

本阶段目标是将下一轮受控体验名单正式调整为 admin + boss_qi + boss_hu，并核验当前工作台入口角色判断是否已经覆盖这 3 个账号。

本阶段不打开入口，不上传体验版，不部署云函数，不发布正式版。

## 4. 体验名单调整

下一轮受控体验名单调整为：

- admin：管理员验收账号，用于功能检查、入口验证和问题复现
- boss_qi：老板业务反馈账号
- boss_hu：老板业务反馈账号

明确不开放：

- 业主端
- 工长端
- 普通销售
- 外部装修公司客户
- 真实业主
- 非测试人员

体验边界：

- admin 只用于功能验收和开发检查
- boss_qi / boss_hu 用于业务反馈
- 当前仍不上传体验版
- 当前仍不发布正式版
- 如未来再次体验，仍需重新走短期打开入口流程
- 体验结束后必须关闭入口并覆盖上传关闭版

## 5. 入口角色核验结果

已核验 `miniprogram/pages/workbench/workbench.js`。

当前 `isBoss` 判断为：

```js
const isBoss = ['admin', 'boss_qi', 'boss_hu'].indexOf(role) !== -1
```

核验结果：

- admin 已包含
- boss_qi 已包含
- boss_hu 已包含

当前入口显示条件为：

```js
ENABLE_V2_DEAL_LOOP_ENTRY && isBoss
```

结论：

admin / boss_qi / boss_hu 已在入口角色范围内，无需代码修改。

## 6. 是否修改 workbench.js

否。

原因：

- 当前 `isBoss` 已覆盖 admin / boss_qi / boss_hu
- 当前 `ENABLE_V2_DEAL_LOOP_ENTRY = false`
- 当前入口显示条件未改变
- 无需补角色逻辑

## 7. 入口开关状态

当前入口开关保持关闭：

```js
const ENABLE_V2_DEAL_LOOP_ENTRY = false
```

工作台 V2 成交跟进入口默认隐藏。

## 8. 未改变的能力边界

本阶段未改变以下能力边界：

- 未修改 `miniprogram/`
- 未修改 `cloudfunctions/`
- 未修改 `miniprogram/app.json`
- 未修改 tabBar
- 未修改 V2 六个页面
- 未打开 `ENABLE_V2_DEAL_LOOP_ENTRY`
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

V2 仍保持：

- V2 试验功能
- 只读客户资料
- 内部成交跟进
- 不调用真实 AI
- 不创建真实工地
- 不自动发布内容
- 不影响现有客户、工地和日报数据

## 9. 发布判断

当前发布判断：

- 当前不打开入口
- 当前不上传体验版
- 当前不部署云函数
- 当前不发布正式版
- 当前不扩大到非测试人员

如后续再次体验，需要重新进入短期打开入口流程，并在体验结束后关闭入口、覆盖上传关闭版。

## 10. 是否建议进入下一阶段

可以进入下一阶段，但建议下一阶段仍保持受控体验边界。

建议下一阶段目标：

- 若准备再次体验，则先制定 admin + boss_qi + boss_hu 的体验版执行清单
- 明确体验窗口、体验反馈问题和关闭入口流程
- 不直接新增真实 AI
- 不直接新增数据库写入
- 不直接进入真实 `createProject`
- 不直接发布正式版
