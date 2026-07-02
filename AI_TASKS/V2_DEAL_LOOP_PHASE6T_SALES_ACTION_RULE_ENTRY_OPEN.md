# 透明工地 V2：成交闭环版 - Phase 6-T 销售动作卡规则增强三账号体验版短期打开

## 1. 当前阶段

Phase 6-T：销售动作卡规则增强三账号体验版短期打开

## 2. 当前 HEAD / tag

- 当前 HEAD：661777f9985123b86aa099b224be5fdaa99476cb
- 当前 tag：v2-deal-loop-phase6s-sales-action-rule-experience-decision
- 当前入口打开前安全 tag：v2-deal-loop-phase6s-sales-action-rule-experience-decision

## 3. 本阶段目标

本阶段为 admin / boss_qi / boss_hu 三账号受控体验“销售动作卡规则增强版”短期打开 V2 成交跟进入口，并提交明确的入口打开 commit/tag。

Codex 不上传体验版，不部署云函数，不发布正式版。

## 4. 体验名单

本阶段体验名单为：

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

体验窗口建议控制在 1 天以内。

体验版上传后必须立即进入 Phase 6-U 关闭入口。

## 6. 修改文件列表

本阶段修改文件：

- `miniprogram/pages/workbench/workbench.js`
- `AI_TASKS/V2_DEAL_LOOP_PHASE6T_SALES_ACTION_RULE_ENTRY_OPEN.md`

本阶段未修改 pipeline / customer-detail 业务实现。

## 7. 入口开关变更

本阶段将：

```js
const ENABLE_V2_DEAL_LOOP_ENTRY = false
```

短期改为：

```js
const ENABLE_V2_DEAL_LOOP_ENTRY = true
```

结论：

- `ENABLE_V2_DEAL_LOOP_ENTRY` 已短期改为 `true`
- 这是销售动作卡规则增强版三账号体验版短期入口打开状态
- 体验结束必须恢复 `false`

## 8. 入口显示条件

入口显示条件保持不变：

```js
ENABLE_V2_DEAL_LOOP_ENTRY && isBoss
```

本阶段未扩大角色范围。

当前 `isBoss` 已覆盖：

- admin
- boss_qi
- boss_hu

## 9. 体验版备注文案

可复制到微信开发者工具体验版备注中的文案：

透明工地 V2 成交跟进试验功能。本次仅限 admin、boss_qi、boss_hu 内部体验，重点验证增强后的“销售下一步动作卡”和“阶段化复制跟进话术”是否有实际帮助。本版本只读客户资料，不创建真实工地，不调用真实 AI，不自动发送消息，不自动发布内容，不影响现有客户、工地和日报数据。请勿转发给非测试人员。体验结束后关闭入口。

## 10. 反馈收集问题

供人工发给三位测试账号的反馈问题：

1. 不同客户阶段的“下一步动作”你能看懂吗？
2. 这些动作对你判断客户下一步怎么跟有没有帮助？
3. “跟进重点 / 提示”有没有多余或看不懂的地方？
4. 已报价客户的 24 小时回访建议有没有用？
5. 有顾虑客户的透明工地解释方向有没有用？
6. 已签约客户的“工地创建草案”提示会不会让你误解为已经创建工地？
7. 复制出来的话术像不像真人说话？
8. 这些话术你愿不愿意真的发给客户？
9. 有没有误以为它是真实 AI 自动生成？
10. 有没有误以为它会自动发送消息？
11. 有没有误以为它会创建真实工地？
12. 如果继续做，你最希望增强哪一块？

## 11. 风险提示

本阶段必须明确：

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
v2-deal-loop-phase6s-sales-action-rule-experience-decision
```

如体验版发现问题：

1. 立即进入关闭入口阶段
2. 恢复 `ENABLE_V2_DEAL_LOOP_ENTRY = false`
3. 提交关闭入口 commit/tag
4. 如已上传体验版，则重新上传关闭入口后的体验版覆盖
5. 如代码异常，回滚到安全 tag

## 13. 上传体验版人工操作提示

下一步由人工在微信开发者工具上传体验版。

人工上传要求：

- 只上传给 admin / boss_qi / boss_hu 三账号受控体验
- 体验版备注使用本文第 9 节文案
- 不通知非测试人员
- 不发布正式版
- 不部署云函数
- 不宣传为正式功能

上传体验版后必须立即进入 Phase 6-U 关闭入口。

## 14. 是否建议进入 Phase 6-U

建议进入 Phase 6-U。

Phase 6-U 应在体验版上传后立即执行：

- 恢复 `ENABLE_V2_DEAL_LOOP_ENTRY = false`
- 提交关闭入口 commit/tag
- 确认未部署云函数
- 确认未发布正式版
- 如需关闭已上传体验版入口，则基于关闭入口 commit 再次上传体验版覆盖

## 15. 文档结论

- `ENABLE_V2_DEAL_LOOP_ENTRY` 已短期改为 `true`
- 入口仍仅在 `ENABLE_V2_DEAL_LOOP_ENTRY && isBoss` 时显示
- 体验名单为 admin + boss_qi + boss_hu
- 本阶段未上传体验版
- 本阶段未部署云函数
- 本阶段未发布正式版
- 下一步由人工在微信开发者工具上传体验版
- 上传体验版后必须进入 Phase 6-U 关闭入口
- 体验结束必须恢复 `false`
