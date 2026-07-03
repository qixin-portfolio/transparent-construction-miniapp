# Phase 6-X：关闭 V2 体验入口并冻结开发

## 1. 当前阶段目标

本阶段关闭 V2 成交跟进体验入口，重新上传关闭版体验版覆盖上一版入口打开体验版，并冻结 V2 新功能开发。

本阶段目标不是继续推进功能，而是结束当前受控体验窗口，进入商业验证优先状态。

## 2. 当前前置状态

- 前置阶段：Phase 6-W：商业验证访谈与报价记录模板
- 前置 tag：`v2-deal-loop-phase6w-business-validation-templates`
- 前置 commit：`5a5de4d5fde100c25a2594832c82ea28aa50aad6`
- 前置入口状态：`ENABLE_V2_DEAL_LOOP_ENTRY = true`
- 前置体验版：Phase 6-U 已上传入口打开体验版

## 3. 入口关闭操作

本阶段将：

```js
const ENABLE_V2_DEAL_LOOP_ENTRY = true
```

恢复为：

```js
const ENABLE_V2_DEAL_LOOP_ENTRY = false
```

入口显示条件保持不变：

```js
ENABLE_V2_DEAL_LOOP_ENTRY && isBoss
```

角色范围保持不变：

- admin
- boss_qi
- boss_hu

## 4. 关闭版覆盖上传

本阶段需要基于入口关闭后的代码重新上传体验版，用关闭版覆盖上一版入口打开体验版。

上传目标：

- 关闭 V2 成交跟进入口
- 保持 V1 功能不受影响
- 保持当前小程序不发布正式版
- 保持云函数不部署

体验版版本建议：

```text
v2-deal-loop-phase6x
```

体验版备注建议：

```text
Phase 6-X: close V2 entry and freeze development
```

## 5. 开发冻结范围

从本阶段开始，冻结以下事项：

- 不新增 V2 页面
- 不增强销售动作卡规则
- 不新增真实 AI API
- 不新增写库跟进记录
- 不调用 `createProject`
- 不做自动发送
- 不做自动创建工地
- 不做案例自动发布
- 不扩大体验范围
- 不发布正式版

## 6. 冻结后的优先级

冻结后优先执行商业验证，不继续以功能 Phase 作为主要进展。

后续优先级：

1. 访谈 10 家非人情装修公司老板
2. 记录 2980 元 / 年报价反馈
3. 验证是否有人愿意付 500 元定金
4. 记录真实拒绝原因
5. 追踪销售动作卡是否改变真实跟进行为
6. 验证案例授权 + 信任证据包是否有付费价值

## 7. 未改变的能力边界

本阶段未改变以下边界：

- 未修改 `cloudfunctions/`
- 未修改 `miniprogram/app.json`
- 未修改 tabBar
- 未修改 V2 六个页面
- 未新增数据库写入
- 未新增真实 AI API
- 未调用 `createProject`
- 未新增 `wx.request`
- 未部署云函数
- 未发布正式版

## 8. 发布判断

本阶段不发布正式版。

当前动作是关闭体验入口并上传关闭版覆盖，不是正式上线、正式交付或商业发布。

## 9. 结论

- `ENABLE_V2_DEAL_LOOP_ENTRY` 已恢复为 `false`
- V2 成交跟进入口默认关闭
- 入口条件仍为 `ENABLE_V2_DEAL_LOOP_ENTRY && isBoss`
- 本阶段将上传关闭版体验版覆盖上一版入口打开体验版
- V2 新功能开发冻结
- 下一步不继续开发，转入商业验证执行
