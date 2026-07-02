# 透明工地 V2：成交闭环版 - Phase 6-M 销售动作卡入口打开

## 1. 当前阶段

Phase 6-M：销售动作卡三账号体验版短期打开

## 2. 当前 HEAD / tag

- 阶段执行前 HEAD：f0e58f7c70494b794b5c9e8f9e943270d26bdce7
- 前置 tag：v2-deal-loop-phase6l-sales-action-experience-decision
- 当前入口打开前安全 tag：v2-deal-loop-phase6l-sales-action-experience-decision

## 3. 本阶段目标

为 admin + boss_qi + boss_hu 三账号受控体验“销售下一步动作卡”打开短期入口，并提交明确的入口打开 commit/tag。

本阶段不上传体验版，不部署云函数，不发布正式版。

## 4. 体验名单

- admin：管理员验收账号
- boss_qi：老板业务反馈账号
- boss_hu：老板业务反馈账号

本阶段不开放给业主端、工长端、普通销售、外部装修公司客户、真实业主或非测试人员。

## 5. 体验窗口

体验窗口：1 天以内。

体验结束后必须关闭入口，并基于关闭入口版本重新上传体验版覆盖。

## 6. 修改文件列表

本阶段修改：

- `miniprogram/pages/workbench/workbench.js`
- `AI_TASKS/V2_DEAL_LOOP_PHASE6M_SALES_ACTION_ENTRY_OPEN.md`

本阶段未修改：

- `cloudfunctions/`
- `miniprogram/app.json`
- tabBar
- V2 六个页面
- `pipeline` / `customer-detail` 业务实现
- 数据库写入逻辑
- 云函数调用逻辑

## 7. 入口开关变更

本阶段将入口开关从：

```js
const ENABLE_V2_DEAL_LOOP_ENTRY = false
```

短期改为：

```js
const ENABLE_V2_DEAL_LOOP_ENTRY = true
```

该状态只用于销售动作卡三账号体验版短期入口打开，不代表正式发布、正式上线或正式交付。

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

## 9. 体验版备注文案

透明工地 V2 成交跟进试验功能。本次仅限 admin、boss_qi、boss_hu 内部体验，重点验证新增的“销售下一步动作卡”和“复制跟进话术”是否有实际帮助。本版本只读客户资料，不创建真实工地，不调用真实 AI，不自动发送消息，不自动发布内容，不影响现有客户、工地和日报数据。请勿转发给非测试人员。体验结束后关闭入口。

## 10. 反馈收集问题

供人工发给三位测试账号：

1. 客户列表里的“下一步动作”你能看懂吗？
2. 这个“下一步动作”对你判断客户跟进有没有帮助？
3. “跟进重点 / 提示”有没有多余或看不懂的地方？
4. 客户详情里的“下一步跟进动作”有没有用？
5. 复制出来的跟进话术是否像真人说话？
6. 复制话术你愿不愿意真的发给客户？
7. 有没有误以为它是真实 AI 自动生成？
8. 有没有误以为它会自动发送消息？
9. 有没有误以为它会创建真实工地？
10. 如果继续做，你希望它下一步增强什么？

## 11. 风险提示

必须明确：

- 当前不是正式发布
- 当前不是正式上线
- 当前不是正式交付
- 当前只是三账号体验版入口打开准备
- 体验结束后必须关闭入口
- 不得发布正式版
- 不得给真实业主、工长、普通销售、外部客户使用
- 不得宣传为真实 AI 功能
- 不得宣传为自动发送消息能力
- 不得宣传为一键创建工地能力
- 不得宣传为案例自动发布能力

## 12. 回滚方案

当前入口打开前安全 tag：

```text
v2-deal-loop-phase6l-sales-action-experience-decision
```

如体验版发现问题：

1. 立即进入关闭入口阶段
2. 恢复 `ENABLE_V2_DEAL_LOOP_ENTRY = false`
3. 提交关闭入口 commit/tag
4. 如已上传体验版，则重新上传关闭入口后的体验版覆盖
5. 如代码异常，回滚到安全 tag

## 13. 上传体验版人工操作提示

下一步由人工在微信开发者工具上传体验版。

上传前必须确认：

- 当前 commit/tag 是 Phase 6-M 入口打开状态
- `ENABLE_V2_DEAL_LOOP_ENTRY = true`
- 入口仍仅在 `ENABLE_V2_DEAL_LOOP_ENTRY && isBoss` 时显示
- 体验名单为 admin + boss_qi + boss_hu
- 体验版备注使用本文件第 9 节文案
- 反馈收集使用本文件第 10 节问题
- 不发布正式版

上传体验版后必须进入关闭入口阶段。

## 14. 是否建议进入下一阶段

建议上传体验版后立即进入下一阶段：销售动作卡体验版上传后关闭入口。

下一阶段必须完成：

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
- 上传体验版后必须进入关闭入口阶段
- 体验结束必须恢复 `false`
