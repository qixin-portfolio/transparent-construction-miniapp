# Phase 7-RP2-M：正式发布前缺口补测结果

## 1. 当前基线

- commit：`632da012af9c77d1ff0deee36567824c6dd4dc9a`
- tag：`v1-release-prep-final-check-report`
- 分支：`codex/init-ai-collaboration`
- git status：clean
- 本地 / 远端同步：`0 0`
- `ENABLE_V2_DEAL_LOOP_ENTRY = false`
- workbench 入口规则：`ENABLE_V2_DEAL_LOOP_ENTRY && isBoss`
- 备案状态：已通过
- 正式发布决策来源：Phase 7-RP2
- Phase 7-RP2 决策：D，原因是三项低成本补测结果未回填

本阶段只记录缺口补测状态和发布决策回填，不修改业务代码，不上传体验版，不发布正式版。

## 2. 跨业主售后工单隔离补测

测试目标：确认业主 A 不能看到业主 B 的售后工单，业主 B 也不能看到业主 A 的售后工单。

本阶段未收到 owner A / owner B 的实际真机补测结果，因此不能编造通过结论。

| 记录项 | 结果 |
| --- | --- |
| 测试是否完成 | 无法测试 |
| owner A openid 可脱敏 | 未提供 |
| owner A projectId 可脱敏 | 未提供 |
| owner A afterSalesTicket 数量 | 未提供 |
| owner B openid 可脱敏 | 未提供 |
| owner B projectId 可脱敏 | 未提供 |
| owner B afterSalesTicket 数量 | 未提供 |
| owner A 是否只能看到自己绑定项目的售后工单 | 无法测试 |
| owner B 是否只能看到自己绑定项目的售后工单 | 无法测试 |
| 是否发现跨业主可见 | 无法确认 |
| 结论 | 无法测试 |

补充说明：

- 本阶段未改数据库。
- 本阶段未删除工单。
- 本阶段未输出完整 openid。
- 该项仍需用两个业主账号补测。

## 3. 普通员工 V2 入口补测

测试目标：确认普通员工 / worker / designer / sales / project_manager 任一非 boss 角色看不到 V2 成交闭环入口。

本阶段未收到普通员工真机补测结果，因此不能编造通过结论。

| 记录项 | 结果 |
| --- | --- |
| 测试是否完成 | 无法测试 |
| 测试角色 | 未提供 |
| 测试设备 | 未提供 |
| 是否显示 V2 入口 | 无法确认 |
| 是否可进入 deal-loop | 无法确认 |
| V1 功能是否正常 | 无法确认 |
| 结论 | 无法测试 |

静态状态：

- `ENABLE_V2_DEAL_LOOP_ENTRY = false`
- workbench 入口规则为 `ENABLE_V2_DEAL_LOOP_ENTRY && isBoss`
- 从代码静态状态看，普通员工展示 V2 入口的风险较低，但缺少本轮真机记录。

## 4. deal-loop 直达 guard 运行验证

测试目标：确认 `ENABLE_V2_DEAL_LOOP_ENTRY = false` 时，即便知道 deal-loop 页面路径，也无法绕过入口直达 V2 页面。

本阶段完成了静态路径检查：

- 当前实际存在的 deal-loop 页面为：
  - `pipeline`
  - `customer-detail`
  - `trust-materials`
  - `contract-to-project`
  - `ai-assistant`
  - `case-assets`
- 当前未发现以下页面路径：
  - `followup-create`
  - `action-rules`

本阶段未收到真机或开发者工具直达运行补测结果，因此不能确认是否触发云函数、是否看到客户数据。

| 页面路径 | 是否可进入 | 是否看到客户数据 | 是否触发敏感云函数 | 是否 crash | 结论 |
| --- | --- | --- | --- | --- | --- |
| `/subpackages/deal-loop/pages/pipeline/pipeline` | 无法确认 | 无法确认 | 未能确认云函数调用 | 无法确认 | 无法测试 |
| `/subpackages/deal-loop/pages/customer-detail/customer-detail` | 无法确认 | 无法确认 | 未能确认云函数调用 | 无法确认 | 无法测试 |
| `/subpackages/deal-loop/pages/trust-materials/trust-materials` | 无法确认 | 无法确认 | 未能确认云函数调用 | 无法确认 | 无法测试 |
| `/subpackages/deal-loop/pages/followup-create/followup-create` | 不适用 | 未发现该页面路径 | 未观察到明显云函数调用 | 不适用 | 当前仓库未发现该页面 |
| `/subpackages/deal-loop/pages/ai-assistant/ai-assistant` | 无法确认 | 无法确认 | 未能确认云函数调用 | 无法确认 | 无法测试 |
| `/subpackages/deal-loop/pages/action-rules/action-rules` | 不适用 | 未发现该页面路径 | 未观察到明显云函数调用 | 不适用 | 当前仓库未发现该页面 |

当前实际六页静态 guard 状态：

| 实际页面 | 静态 guard 状态 |
| --- | --- |
| `pipeline` | 已调用 `guardDealLoopPage()` |
| `customer-detail` | 已调用 `guardDealLoopPage()` |
| `trust-materials` | 已调用 `guardDealLoopPage()` |
| `contract-to-project` | 已调用 `guardDealLoopPage()` |
| `ai-assistant` | 已调用 `guardDealLoopPage()` |
| `case-assets` | 已调用 `guardDealLoopPage()` |

结论：

- 静态 guard 存在。
- 运行补测结果未提供。
- 不能确认直达时是否看到客户数据。

## 5. RP2-M 后发布决策

发布决策：C。

建议：可小范围体验版继续试用，但不建议提交正式发布。

决策依据：

- RP1-M 主链路结论为 B，说明 V1 主流程已基本可用。
- 当前三项缺口补测仍存在无法测试项：
  - 跨业主售后工单隔离无法测试
  - 普通员工 V2 入口无法测试
  - deal-loop 直达 guard 运行验证无法测试
- 按本阶段规则，“如果仍有无法测试项”，发布决策应为 C。

是否建议进入 Phase 7-RP3：暂不建议。

进入 Phase 7-RP3 前建议补齐：

1. 用 owner A / owner B 真机确认售后工单隔离。
2. 用任一非 boss 角色确认工作台不显示 V2 入口。
3. 用开发者工具或真机直达实际存在的六个 deal-loop 页面，确认被拦截且看不到客户数据。

## 6. 禁止事项记录

- 未修改业务代码。
- 未修改 `miniprogram/`。
- 未修改 `cloudfunctions/`。
- 未修改 `project.config.json`。
- 未修改 `app.json`。
- 未修改 `tabBar`。
- 未修改云函数。
- 未执行数据库脚本。
- 未执行 `initSaasDefaults`。
- 未上传体验版。
- 未发布正式版。
- 未改变 `ENABLE_V2_DEAL_LOOP_ENTRY`。
