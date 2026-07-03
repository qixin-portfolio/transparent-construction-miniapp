# Phase 7-RP2：正式发布前最终检查与发布决策记录

## 1. 当前阶段

Phase 7-RP2：正式发布前最终检查与发布决策记录。

本阶段目标是基于 Phase 7-RP1-M 的 V1 真机人工冒烟结果，完成正式发布前最后一轮补测状态记录和发布决策。本阶段只新增发布前检查报告，不修改业务代码，不打开 V2 入口，不部署云函数，不上传体验版，不发布正式版。

## 2. 当前 commit / tag

当前仓库状态：

- 当前分支：`codex/init-ai-collaboration`
- 当前 HEAD：`92dc36dfd8c4f282215befea32411d7c2828a2ac`
- 当前 tag：`v1-full-chain-smoke-test-manual-results`
- 当前 `git status`：clean
- 本地 / 远端同步状态：同步，`HEAD...origin/codex/init-ai-collaboration = 0 0`

最近锁点：

- `92dc36d`：`docs: update V1 smoke test with manual results`
- `b45e7ac`：`docs: add V1 full-chain smoke test report`
- `a364759`：`fix: improve completed owner archive and shared album`
- `c31def2`：`docs: record owner completion cloud function deploy`
- `1f4ce6f`：`fix: allow delivered projects in completed owner service`

## 3. 当前入口状态

当前 V2 入口继续关闭：

- `miniprogram/pages/workbench/workbench.js`：`ENABLE_V2_DEAL_LOOP_ENTRY = false`
- `miniprogram/subpackages/deal-loop/utils/accessGuard.js`：`ENABLE_V2_DEAL_LOOP_ENTRY = false`
- 工作台入口规则仍为：`ENABLE_V2_DEAL_LOOP_ENTRY && isBoss`

deal-loop 页面级 guard 只读确认：

| 页面 | guard 状态 |
| --- | --- |
| `pipeline` | 已调用 `guardDealLoopPage()` |
| `customer-detail` | 已调用 `guardDealLoopPage()` |
| `ai-assistant` | 已调用 `guardDealLoopPage()` |
| `trust-materials` | 已调用 `guardDealLoopPage()` |
| `contract-to-project` | 已调用 `guardDealLoopPage()` |
| `case-assets` | 已调用 `guardDealLoopPage()` |

正式版状态：

- 本阶段未发布正式版。
- 本阶段未上传体验版。
- 本阶段未部署云函数。

## 4. 备案状态

用户已反馈：小程序备案已通过。

## 5. RP1-M 结论摘要

Phase 7-RP1-M 最终冒烟结论为 B：基本通过，有低风险问题，可记录后进入正式发布前最终检查。

已通过：

- 老板端真机通过
- 工长端真机通过
- 工长语音输入通过
- 手写兜底通过
- 业主施工中链路通过
- 业主完工服务通过
- 售后主链路通过
- V2 入口关闭
- 工作区 clean，本地/远端同步

非阻塞项：

- 设计师端上传设计图一次只能一张，后续建议优化为多图上传。

RP1-M 遗留待补测项：

1. 跨业主售后工单隔离
2. 普通员工 V2 入口不可见
3. deal-loop 页面直达 guard 拦截

## 6. 跨业主售后工单隔离补测结果

本阶段未收到人工真机补测结果，不能编造通过结论。

| 检查项 | 结果 | 备注 |
| --- | --- | --- |
| 业主 A 是否能看到自己提交的测试售后工单 | 未测 | 需使用测试业主 A |
| 业主 B 是否看不到业主 A 的工单 | 未测 | 需使用测试业主 B |
| 老板端是否能看到该售后工单 | 未测 | RP1-M 主链路已通过，但本轮隔离补测未提供结果 |
| 是否发现跨业主数据串线 | 无法确认 | 缺少本轮补测结果 |
| 截图编号或备注 | 未提供 | 不记录真实手机号、openid、真实客户隐私 |

判断：

- 售后主链路在 RP1-M 已通过。
- 跨业主售后工单隔离是发布前阻塞定义之一，当前未测，不能判断正式发布前检查通过。

## 7. 普通员工 V2 入口补测结果

本阶段未收到普通员工 / 非老板角色真机补测结果。

| 检查项 | 结果 | 备注 |
| --- | --- | --- |
| 普通员工账号能否登录 | 未测 | 需普通员工 / 非老板测试账号 |
| 普通员工是否看不到 V2 成交闭环入口 | 未测 | 静态状态为入口关闭，但缺少真机结果 |
| 是否误显示“成交闭环 / 老板成交作战台”等入口 | 无法确认 | 缺少本轮真机截图或记录 |
| 截图编号或备注 | 未提供 | - |

静态判断：

- `ENABLE_V2_DEAL_LOOP_ENTRY = false`
- 工作台入口规则为 `ENABLE_V2_DEAL_LOOP_ENTRY && isBoss`
- 因此普通员工看到 V2 入口的静态风险较低。

发布判断：

- 静态低风险不等于本轮真机通过。
- 本项仍应在正式发布候选准备前补测一次。

## 8. deal-loop 直达 guard 补测结果

本阶段完成静态 guard 存在性确认，但未收到人工真机或开发者工具直达补测结果。

| 直达页面 | 结果 | 备注 |
| --- | --- | --- |
| `/subpackages/deal-loop/pages/pipeline/pipeline` | 静态已确认 guard，未真机直达 | `pipeline.js` 调用 `guardDealLoopPage()` |
| `/subpackages/deal-loop/pages/customer-detail/customer-detail` | 静态已确认 guard，未真机直达 | `customer-detail.js` 调用 `guardDealLoopPage()` |
| `/subpackages/deal-loop/pages/ai-assistant/ai-assistant` | 静态已确认 guard，未真机直达 | `ai-assistant.js` 调用 `guardDealLoopPage()` |
| `/subpackages/deal-loop/pages/trust-materials/trust-materials` | 静态已确认 guard，未真机直达 | `trust-materials.js` 调用 `guardDealLoopPage()` |
| `/subpackages/deal-loop/pages/contract-to-project/contract-to-project` | 静态已确认 guard，未真机直达 | `contract-to-project.js` 调用 `guardDealLoopPage()` |
| `/subpackages/deal-loop/pages/case-assets/case-assets` | 静态已确认 guard，未真机直达 | `case-assets.js` 调用 `guardDealLoopPage()` |

额外记录：

- 是否触发云函数调用：无法确认，本阶段未做直达真机 / 开发者工具运行测试。
- 是否看到客户数据：无法确认，本阶段未做直达真机 / 开发者工具运行测试。
- 截图编号或备注：未提供。

判断：

- 静态 guard 已存在。
- 但阻塞项定义中包含“deal-loop 直达能看到客户数据”，当前未运行直达验证，不能完全排除。

## 9. 发布前状态汇总

| 模块 | 状态 | 说明 |
| --- | --- | --- |
| 老板端主链路 | 通过 | RP1-M 真机通过 |
| 工长端主链路 | 通过 | RP1-M 真机通过，语音输入和手写兜底通过 |
| 业主施工中主链路 | 通过 | RP1-M 真机通过 |
| 业主完工服务链路 | 通过 | RP1-M 真机通过 |
| 售后主链路 | 通过 | RP1-M 真机通过 |
| 跨业主售后工单隔离 | 未测 | 本轮未提供补测结果 |
| 普通员工 V2 入口不可见 | 未测 | 静态低风险，但本轮未提供真机结果 |
| deal-loop 页面直达 guard | 静态已确认，未真机直达 | 六页 guard 存在，但未确认运行结果 |
| V2 入口关闭状态 | 通过 | `ENABLE_V2_DEAL_LOOP_ENTRY = false` |
| 云函数部署状态 | 基本满足 RP1-M | BR2 和后续修复已部署过；本阶段未部署 |
| 备案状态 | 通过 | 用户已反馈备案通过 |

## 10. 阻塞项

按本阶段发布前阻塞定义，当前阻塞项为“测试不充分，不能判断”：

1. 跨业主售后工单隔离未测。
   - 阻塞定义包含“业主能看到别人项目 / 售后工单”。
   - 当前没有业主 B 看不到业主 A 工单的真机证据。

2. deal-loop 直达 guard 未运行验证。
   - 静态 guard 已存在。
   - 但当前未确认直达时是否触发云函数、是否看到客户数据。

3. 普通员工 V2 入口不可见未真机补测。
   - 静态状态为关闭。
   - 但当前缺少普通员工账号真机记录。

未发现以下主链路阻塞：

- 业主看不到项目：RP1-M 已通过
- 工长不能提交日报：RP1-M 已通过
- 老板不能审核日报：RP1-M 已通过
- 业主看不到已审核日报：RP1-M 已通过
- 业主看不到完工服务：RP1-M 已通过
- 售后主链路不可用：RP1-M 已通过
- `ENABLE_V2_DEAL_LOOP_ENTRY` 不为 false：当前已确认 false

## 11. 非阻塞项

1. 设计师端上传设计图一次只能一张。
   - 用户希望后续优化为一次上传多张。
   - 这是体验增强，不属于当前正式发布前主链路阻塞项。

2. V2 入口仍关闭。
   - 不影响 V1 正式发布候选，但后续仍需保持关闭直到明确开启阶段。

## 12. 最终发布决策

最终发布决策：D：测试不充分，不能判断，暂缓发布。

判断依据：

- RP1-M 主链路结论为 B，说明 V1 主链路基本可用。
- 但 RP2 明确要求补测的三项，本阶段没有收到人工真机结果。
- 其中“跨业主售后工单隔离”和“deal-loop 直达是否能看到客户数据”属于发布前风险项。
- 因此不能把静态判断当成正式发布前最终通过。

## 13. 是否建议进入 Phase 7-RP3：正式发布候选版本准备

暂不建议进入 Phase 7-RP3。

建议先补齐以下低成本真机 / 开发者工具检查：

1. 用业主 A 查看自己提交的“冒烟测试售后工单，可关闭”。
2. 用业主 B 登录，确认看不到业主 A 的测试售后工单。
3. 用老板账号确认能看到该测试售后工单。
4. 用普通员工 / 非老板账号登录，确认看不到 V2 成交闭环入口。
5. 直达以下任一或全部 deal-loop 页面，确认被 guard 拦截，且看不到客户数据：
   - `pipeline`
   - `customer-detail`
   - `ai-assistant`
   - `trust-materials`
   - `contract-to-project`
   - `case-assets`

补齐结果后，可进入 Phase 7-RP2-M：正式发布前补测结果回填，再重新判断是否进入 Phase 7-RP3。

## 14. 本阶段边界

- 本阶段只新增 `AI_TASKS/V1_RELEASE_PREP_FINAL_CHECK_REPORT.md`。
- 本阶段不修改业务代码。
- 本阶段不修改 `miniprogram/`。
- 本阶段不修改 `cloudfunctions/`。
- 本阶段不修改 `app.json`。
- 本阶段不修改 `tabBar`。
- 本阶段不修改 `ENABLE_V2_DEAL_LOOP_ENTRY`。
- 本阶段不打开 V2 入口。
- 本阶段不新增功能。
- 本阶段不新增真实 AI。
- 本阶段不新增写库。
- 本阶段不部署云函数。
- 本阶段不上传体验版。
- 本阶段不发布正式版。
