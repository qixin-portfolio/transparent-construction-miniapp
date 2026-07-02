# 透明工地 V2：成交闭环版 - Phase 6-G 反馈模块体验版上传后关闭入口

## 1. 当前阶段

Phase 6-G：反馈模块体验版上传后关闭入口

## 2. 当前 HEAD / tag

- 阶段执行前 HEAD：468b2e0f5e872ba95475952ec058d323537fb9b4
- 前置 tag：v2-deal-loop-phase6f-feedback-entry-open-for-experience
- 当前入口打开 commit：468b2e0f5e872ba95475952ec058d323537fb9b4

## 3. 本阶段目标

本阶段目标是在反馈模块体验版上传后，立即关闭 V2 成交跟进入口，将 `ENABLE_V2_DEAL_LOOP_ENTRY` 从 `true` 恢复为 `false`，并提交关闭入口 commit/tag。

本阶段不部署云函数，不发布正式版，不修改 V2 六个页面，不新增数据库写入，不新增真实 AI API，不调用 `createProject`。

## 4. 体验版上传状态

人工确认状态：

- Phase 6-F 曾短期打开入口
- 反馈模块体验版已由人工上传
- 上传体验版使用的是入口打开状态
- 本阶段负责在代码层立即恢复入口关闭

重要提示：

- 本阶段关闭的是代码入口状态
- 如果需要关闭微信后台已上传体验版中的入口，还需要基于本关闭入口 commit 再次上传体验版覆盖

## 5. 入口关闭操作

本阶段已将：

```js
const ENABLE_V2_DEAL_LOOP_ENTRY = true
```

恢复为：

```js
const ENABLE_V2_DEAL_LOOP_ENTRY = false
```

结论：

- `ENABLE_V2_DEAL_LOOP_ENTRY = false`
- 工作台入口默认重新隐藏
- Phase 6-F 的短期入口打开状态已结束

## 6. 修改文件列表

本阶段修改：

- `miniprogram/pages/workbench/workbench.js`
- `AI_TASKS/V2_DEAL_LOOP_PHASE6G_FEEDBACK_ENTRY_CLOSED_AFTER_UPLOAD.md`

本阶段未修改：

- `cloudfunctions/`
- `miniprogram/app.json`
- tabBar
- V2 六个页面
- 数据库写入逻辑
- 云函数调用逻辑
- 部署配置

## 7. 入口显示条件

入口显示条件保持不变：

```js
ENABLE_V2_DEAL_LOOP_ENTRY && isBoss
```

角色范围未修改，`isBoss` 仍为：

- admin
- boss_qi
- boss_hu

由于 `ENABLE_V2_DEAL_LOOP_ENTRY = false`，工作台 V2 成交跟进入口默认隐藏。

## 8. 未改变的能力边界

本阶段未改变以下能力边界：

- 未修改 V2 六个页面
- 未新增数据库写入
- 未新增真实 AI API
- 未调用 `createProject`
- 未调用 `submitStageLog`
- 未调用 `reviewStageLog`
- 未调用 `getTempFileURL`
- 未新增 `wx.request`
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

## 9. 回滚说明

当前关闭入口后的代码状态是新的安全状态。

如后续发现体验版仍显示入口：

1. 基于本关闭入口 commit 重新上传体验版覆盖
2. 确认体验版内 `ENABLE_V2_DEAL_LOOP_ENTRY = false`
3. 确认工作台入口默认隐藏

如代码异常，可回滚到入口打开前安全 tag：

```text
v2-deal-loop-phase6e-feedback-experience-decision
```

如需再次体验，必须重新走入口打开流程，不得直接复用当前阶段。

## 10. 发布判断

当前发布判断：

- 不部署云函数
- 不发布正式版
- 不扩大体验范围
- 不给真实业主或外部客户使用
- 不宣传为正式 AI 功能
- 不宣传为一键创建工地或案例自动发布能力

当前代码入口已关闭，但如果微信后台体验版仍是 Phase 6-F 上传版本，则需要基于本关闭入口 commit 再次上传体验版覆盖。

## 11. 是否建议进入 Phase 6-G2

建议进入 Phase 6-G2：关闭入口体验版覆盖上传确认。

Phase 6-G2 应只记录人工确认结果：

- 是否已基于本关闭入口 commit 重新上传体验版
- 是否已覆盖上一版入口打开体验版
- 当前体验版入口是否已关闭
- 当前正式版是否未发布
- 当前云函数是否未部署

后续如需继续体验，必须重新走入口打开流程。
