# V2 Deal Loop Phase 5C-K：人工截图补验通过记录

## 当前阶段

Phase 5C-K：人工截图补验通过记录。

本阶段只新增人工截图补验通过记录文档，不修改业务代码，不部署云函数，不上传体验版，不打开工作台入口，不进入 Phase 5D。

## 当前 HEAD / tag

- 当前 HEAD：`f041ecb890174ae552284b94dcf05afa039423bb`
- 当前 tag：`v2-deal-loop-phase5c-j-ai-stage-label-patch`
- 前置 tag：
  - `v2-deal-loop-phase5c-i-devtools-screenshot-attempt`
  - `v2-deal-loop-phase5c-j-ai-stage-label-patch`

## 人工截图验收目标

人工截图补验覆盖 V2 deal-loop 六个页面：

1. `pipeline`
2. `customer-detail`
3. `ai-assistant`
4. `trust-materials`
5. `contract-to-project`
6. `case-assets`

验收目标：

1. 确认页面可正常打开。
2. 确认用户可见文案不再出现技术词、开发态词、mock 词或内部函数/字段名。
3. 确认页面没有误导真实 AI、真实创建工地、自动发布、公开发布的文案。
4. 确认 V2 仍以试验功能、内部参考、只读资料、示例内容/建议/草案为边界。
5. 确认截图文件不提交进 git。

## 六个页面截图验收结果

| 页面 | 验收结论 | 说明 |
| --- | --- | --- |
| `pipeline` | 通过 | 未发现用户可见技术词；页面表达为 V2 试验功能、只读客户资料、内部成交跟进。 |
| `customer-detail` | 通过 | 未发现用户可见技术词；页面表达为客户成交详情、示例跟进记录、只读客户资料。 |
| `ai-assistant` | 补修后通过 | 初验发现 `quoted`，Phase 5C-J 补修后复验显示 `触发阶段：已签约`。 |
| `trust-materials` | 通过 | 未发现用户可见技术词；页面表达为真实证据摘要、示例推荐素材、公开使用需先确认授权。 |
| `contract-to-project` | 通过 | 未发现用户可见技术词；页面明确为工地草案，不会创建真实工地。 |
| `case-assets` | 通过 | 未发现误导发布文案；页面明确为案例内容草案，公开使用需先确认授权。 |

## 发现的问题

人工截图初验发现：

1. `ai-assistant` 页面用户可见区域出现内部阶段码 `quoted`。
2. 问题位置为 AI 跟进助手的 `触发阶段` 文案。
3. `quoted` 是内部阶段标识，老板和销售不应在页面上看到。

其它页面未发现需要立即补修的用户可见技术词问题。

## 5C-J 补修结果

Phase 5C-J 已完成最小补修：

1. `ai-assistant.wxml` 不再直接展示 `suggestion.triggerStage`。
2. 页面展示改为 `suggestion.triggerStageLabel`。
3. `ai-assistant.js` 新增展示层阶段码映射。
4. `quoted / signed` 等内部阶段码映射为中文业务文案。
5. 未修改 `generateSuggestion` 业务逻辑。
6. 未修改 `getCustomer` 调用逻辑。
7. 未修改云函数、入口、tabBar、其它 V2 页面。

## AI 跟进助手复验结果

人工复验截图显示：

1. `AI 跟进助手` 页面已显示 `触发阶段：已签约`。
2. 未再看到 `quoted`。
3. 未再看到 `mock_rule`。
4. 未再看到 `customerId / URL customerId`。
5. 未再看到 `Mock only / 本地 mock`。
6. 页面仍保留 `示例建议 / 内部参考`。
7. 页面仍保留 `当前仅根据客户阶段生成跟进建议，不调用真实 AI`。
8. 页面仍保留 `只读客户资料` 数据源表达。

结论：`ai-assistant` 阶段码用户可见问题已修复，补修后截图验收通过。

## 用户可见技术词最终检查

人工截图补验后，六个页面用户可见文案未再发现：

```text
mock
Mock only
本地 mock
Phase 3B
Readonly
listCustomers
getCustomer
getV2EvidenceSummary
customerId
openid
createProject
projects
project.customerId
fallback
mock_rule
quoted
signed
真实客户字段
真实客户数据
可直接发布
自动发布
直接发小红书
直接用于官网/GEO
```

说明：

1. `不支持自动发布` 属于限制说明，可以保留，不视为问题。
2. 内部变量名、路由参数、class、云函数调用名和 mock 文件路径仍可保留，不作为用户可见文案问题。
3. 本阶段未提交截图文件，仅记录人工截图验收结论。

## 能力边界最终确认

已确认：

1. V2 仍为试验功能。
2. 工作台入口仍关闭。
3. 页面表达为只读客户资料。
4. AI 跟进助手不调用真实 AI。
5. 签约转工地页面不会创建真实工地。
6. 案例内容草案不支持自动发布。
7. 公开使用需先确认授权。
8. 真实证据摘要不展示原始照片和日报正文。
9. 不影响现有客户、工地和日报数据。
10. 当前仍不建议发布。
11. 当前仍不建议上传体验版。
12. 当前仍不建议打开工作台入口。
13. 当前仍不建议给真实业务人员使用。

## 发布判断

当前发布判断：

1. `ENABLE_V2_DEAL_LOOP_ENTRY = false`。
2. 本阶段未部署云函数。
3. 本阶段未上传体验版。
4. 本阶段未打开工作台入口。
5. 当前仍不建议发布。
6. 当前仍不建议打开工作台入口。
7. 当前仍不建议给真实业务人员使用。

判断依据：

1. Phase 5C 已完成文案和截图补验闭环，但 V2 入口仍应保持关闭。
2. 发布前仍需单独做发布风险评估和入口开关评审。
3. 体验版上传、入口开放、真实业务人员使用都属于后续阶段动作，本阶段不执行。

## Phase 5C 闭环结论

Phase 5C 当前闭环结论：

1. V2 六个页面的用户可见文案已完成全链路清理。
2. `ai-assistant` 初验发现的内部阶段码 `quoted` 已完成最小补修。
3. 补修后人工截图复验通过，页面显示中文业务文案 `已签约`。
4. 六个页面截图验收结论为：
   - `pipeline`：通过
   - `customer-detail`：通过
   - `ai-assistant`：补修后通过
   - `trust-materials`：通过
   - `contract-to-project`：通过
   - `case-assets`：通过
5. 本阶段只记录验收结论，不提交截图文件。
6. 当前仍不建议发布、不建议上传体验版、不建议打开入口。

## 是否建议进入 Phase 5D

不建议直接进入 Phase 5D。

建议：

1. 先保持 `ENABLE_V2_DEAL_LOOP_ENTRY = false`。
2. 不上传体验版。
3. 不给真实业务人员使用。
4. 如后续考虑 Phase 5D，应先单独定义 Phase 5D 目标、发布风险门槛、入口开关条件和回滚策略。
