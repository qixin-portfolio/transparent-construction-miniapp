# V2 Deal Loop Phase 5E-B：入口文案与开关实现前检查

## 当前阶段

Phase 5E-B：入口文案与开关实现前检查。

本阶段只做入口文案与开关实现前检查，不修改业务代码，不打开入口，不部署云函数，不上传体验版，不进入 Phase 5E-C。

## 当前 HEAD / tag

- 当前 HEAD：`f4d57cb518765fd0754c02327030a387ab4e62ee`
- 当前 tag：`v2-deal-loop-phase5e-a-limited-entry-plan`
- 前置阶段：Phase 5E-A 已完成入口有限体验方案设计。

## 检查目标

本阶段检查目标：

1. 确认当前工作台入口实现现状。
2. 确认 `ENABLE_V2_DEAL_LOOP_ENTRY` 仍为 `false`。
3. 确认未来 Phase 5E-C 如果做入口最小实现，允许修改的文件范围。
4. 锁定未来入口文案必须保持试验、只读、内部体验边界。
5. 设计入口开关策略，避免误开放。
6. 评估当前 boss/admin 粗粒度角色限制是否足够。
7. 明确 Phase 5E-C 准入条件、回滚策略、发布和体验版判断。

## 当前入口实现现状

已只读检查当前工作台入口代码。

当前入口状态：

1. `ENABLE_V2_DEAL_LOOP_ENTRY = false`。
2. 工作台入口代码已经存在，但默认隐藏。
3. 入口显示条件仍为 `ENABLE_V2_DEAL_LOOP_ENTRY && isBoss`。
4. `isBoss` 当前包含：
   - `admin`
   - `boss_qi`
   - `boss_hu`
5. 入口卡片位于工作台页面，当前标题为 `成交跟进`。
6. 当前入口标签为 `试验功能`。
7. 当前入口提示包含 `V2 试验功能，不影响现有客户、工地和日报数据。`
8. 点击入口会执行 `goDealLoopV2()`。
9. `goDealLoopV2()` 当前跳转到 `/subpackages/deal-loop/pages/pipeline/pipeline`。
10. V2 deal-loop subpackage 已包含六个页面：
    - `pages/pipeline/pipeline`
    - `pages/customer-detail/customer-detail`
    - `pages/ai-assistant/ai-assistant`
    - `pages/trust-materials/trust-materials`
    - `pages/contract-to-project/contract-to-project`
    - `pages/case-assets/case-assets`
11. 当前未上传体验版。
12. 当前未部署云函数。
13. 当前未打开入口。

现状判断：

1. 当前入口结构已经具备最小展示基础。
2. 当前入口仍被显式开关和 boss/admin 角色同时限制。
3. 当前入口文案还可以在未来 Phase 5E-C 中进一步补充“仅老板内部体验 / 只读客户资料 / 不调用真实 AI”等风险提示。
4. 当前不需要改 `app.json`，V2 页面路径已存在。

## 未来入口最小实现范围

如果未来进入 Phase 5E-C，建议最多只允许修改：

1. `miniprogram/pages/workbench/workbench.js`
2. `miniprogram/pages/workbench/workbench.wxml`
3. `miniprogram/pages/workbench/workbench.wxss`
4. `AI_TASKS/V2_DEAL_LOOP_PHASE5E_C_ENTRY_MINIMAL_IMPLEMENTATION.md`

Phase 5E-C 不应修改：

1. `cloudfunctions/`
2. `miniprogram/app.json`
3. tabBar
4. V2 六个页面
5. 数据库逻辑
6. 云函数调用逻辑
7. `project.config.json`
8. `project.private.config.json`
9. 部署配置
10. 任何真实 AI API 配置
11. 任何创建工地或写数据库能力

Phase 5E-C 最小实现建议：

1. 只调整工作台入口文案。
2. 只调整工作台入口样式。
3. 如需打开入口，必须有明确人工确认。
4. 默认仍保持 `ENABLE_V2_DEAL_LOOP_ENTRY = false`。
5. 不新增新的入口路径。
6. 不修改 V2 页面内部逻辑。
7. 不修改 V1 主链路。

## 入口文案建议

未来入口文案必须安全保守，避免让体验者误以为 V2 已经正式上线。

推荐标题：

`成交跟进`

推荐标签：

1. `V2 试验功能`
2. `仅老板内部体验`
3. `只读客户资料`

推荐说明：

`用于内部查看客户成交跟进建议，不影响现有客户、工地和日报数据。`

推荐风险提示：

`当前为试验功能，不创建真实工地，不调用真实 AI，不自动发布内容。`

如入口空间不足，最低必须保留：

1. `V2 试验功能`
2. `仅老板内部体验`
3. `不影响现有客户、工地和日报数据`

不建议出现：

1. `正式上线`
2. `自动成交`
3. `真实 AI 自动跟进`
4. `一键创建工地`
5. `自动发布案例`
6. `可直接发布`
7. `直接发小红书/抖音/官网/GEO`

## 入口开关策略

建议策略：

1. `ENABLE_V2_DEAL_LOOP_ENTRY` 仍应是唯一显式入口开关。
2. 默认必须保持 `false`。
3. Phase 5E-C 即使修改入口文案，也不应默认打开入口。
4. 如未来必须临时打开入口，只能在明确人工确认后短期改为 `true`。
5. 体验结束必须恢复 `false`。
6. 恢复后必须复查工作台入口不可见。
7. 不建议把 `true` 作为长期提交状态。

是否允许将 `ENABLE_V2_DEAL_LOOP_ENTRY = true` 提交进 git：

不建议把 `true` 作为长期提交状态。

更保守建议：

1. 常规提交必须保持 `ENABLE_V2_DEAL_LOOP_ENTRY = false`。
2. 如必须进行内部体验，可单独做短期体验 commit/tag。
3. 短期体验 commit/tag 必须明确体验账号、体验窗口和回滚点。
4. 体验结束后必须提交关闭入口的 commit，将 `ENABLE_V2_DEAL_LOOP_ENTRY` 恢复为 `false`。
5. 关闭入口的 commit/tag 应作为体验后的新安全点。

不建议：

1. 在未说明体验窗口时提交 `true`。
2. 在未确认测试账号时提交 `true`。
3. 在准备上传体验版前临时口头打开，但不形成可追踪记录。
4. 让 `true` 混入其它业务改动提交。

## 角色限制策略

当前角色限制：

1. `admin`
2. `boss_qi`
3. `boss_hu`

判断：

1. 当前 `isBoss` 适合入口继续隐藏阶段。
2. 如果未来打开入口，`isBoss` 作为第一层限制仍有价值。
3. 但 `admin / boss_qi / boss_hu` 仍是粗粒度角色，不足以控制首次体验扩散风险。
4. 首次有限体验建议进一步缩小为单一测试账号。

单一测试账号设计建议：

1. 保留 `ENABLE_V2_DEAL_LOOP_ENTRY` 作为总开关。
2. 在总开关之后增加明确体验账号判断。
3. 体验账号应由人工确认，不应通过猜测角色或 openid 推断。
4. 首次只允许 1 个老板账号。
5. 体验通过后再考虑扩大到 2 个老板账号。
6. 不建议第一轮直接开放给全部 boss/admin。

本阶段不实现单一测试账号逻辑。

## Phase 5E-C 准入条件

进入 Phase 5E-C 前必须满足：

1. Phase 5E-B 文档锁点完成并提交 tag。
2. 明确 Phase 5E-C 只允许修改工作台入口相关文件和阶段文档。
3. 明确测试账号。
4. 明确体验窗口。
5. 明确是否上传体验版。
6. 明确是否允许提交 `ENABLE_V2_DEAL_LOOP_ENTRY = true`。
7. 明确回滚 tag。
8. 明确体验结束后关闭入口。
9. 明确仍不发布正式版。
10. 明确不修改 V2 六个页面。
11. 明确不修改云函数。
12. 明确不新增真实 AI API。
13. 明确不新增数据库写入。
14. 明确不调用 `createProject`。

如果上述任一条件未明确，不建议进入 Phase 5E-C 实现。

## 回滚策略

当前安全 tag：

`v2-deal-loop-phase5e-a-limited-entry-plan`

如未来 Phase 5E-C 只修改入口文案且保持 `false`：

1. 回滚风险低。
2. 可通过回滚 Phase 5E-C commit 恢复。
3. 不需要重新部署云函数。
4. 不影响客户、工地、日报数据。

如未来 Phase 5E-C 临时打开入口：

1. 入口异常优先关闭：`ENABLE_V2_DEAL_LOOP_ENTRY = false`。
2. 如代码异常，回滚到最近安全 tag。
3. 如已经上传体验版，需要重新上传关闭入口后的体验版覆盖旧包。
4. 如未上传体验版，只需恢复开关并复查工作台不可见。
5. 体验截图和口头传播无法通过代码回滚解决，因此必须控制体验账号和时间窗口。

不得依赖回滚掩盖的问题：

1. 入口误开放给非目标用户。
2. 老板或销售误认为 V2 已正式上线。
3. 体验者复制案例草案去公开发布。
4. 体验者把示例建议当成正式 AI 结论。

## 发布与体验版判断

当前判断：

1. 当前不建议打开入口。
2. 当前不建议上传体验版。
3. 当前不建议发布正式版。
4. 当前不建议给真实业务人员使用。
5. 当前不建议给普通销售使用。
6. 当前不建议给业主端、工长端或外部客户使用。

如未来进入 Phase 5E-C：

1. Phase 5E-C 可以做入口最小实现。
2. Phase 5E-C 仍需人工确认后才允许打开入口。
3. Phase 5E-C 不应默认上传体验版。
4. Phase 5E-C 不应发布正式版。
5. Phase 5E-C 不应扩大到真实业务人员使用。

## 是否建议进入 Phase 5E-C

可以进入 Phase 5E-C，但必须限定为“入口最小实现”。

进入 Phase 5E-C 的保守条件：

1. 只改工作台入口相关文件。
2. 默认保持 `ENABLE_V2_DEAL_LOOP_ENTRY = false`。
3. 如需改为 `true`，必须先有人明确确认体验账号、体验窗口和是否允许提交 `true`。
4. 不修改 V2 六个页面。
5. 不修改云函数。
6. 不上传体验版。
7. 不发布正式版。
8. 不给真实业务人员大范围使用。

当前不建议直接打开入口，也不建议直接上传体验版。

## 验证结果

本阶段验证：

1. 已只读检查 `miniprogram/pages/workbench/workbench.js`。
2. 已只读检查 `miniprogram/pages/workbench/workbench.wxml`。
3. 已只读检查 `miniprogram/pages/workbench/workbench.wxss`。
4. 已只读检查 V2 deal-loop 页面路径。
5. 已确认 `ENABLE_V2_DEAL_LOOP_ENTRY = false`。
6. 已确认入口显示条件为 `ENABLE_V2_DEAL_LOOP_ENTRY && isBoss`。
7. 已确认 `isBoss` 包含 `admin / boss_qi / boss_hu`。
8. 已确认入口跳转到 deal-loop `pipeline` 页面。
9. 本阶段未修改 `miniprogram/`。
10. 本阶段未修改 `cloudfunctions/`。
11. 本阶段未修改 `miniprogram/app.json`。
12. 本阶段未修改工作台入口。
13. 本阶段未修改 tabBar。
14. 本阶段未部署云函数。
15. 本阶段未上传体验版。
16. 本阶段未打开入口。
17. 本阶段未进入 Phase 5E-C。

待运行检查：

```bash
git diff --check
```
