# Phase 7-HOTFIX-3：四个倒退工地精确修复方案与回滚计划

## 1. 当前阶段与基线

- 当前阶段：Phase 7-HOTFIX-3：四个倒退工地精确修复方案与回滚计划
- 当前分支：`hotfix/stage-regression-and-reviewer-auto-approve`
- 当前基线 HEAD：`4895440374e5cdda42a31eff04f3c571293a62c3`
- 基线 tag：`v1-stage-regression-four-projects-dry-run`
- 工作区：clean
- 本地/远端同步：`0 0`
- 本计划只基于 HOTFIX-2 dry-run 报告和本地导出文件生成。
- 本阶段不连接生产数据库，不执行 `update`、`add`、`remove`。

## 2. 人工确认映射

| 工地 | 人工确认工序 | 规范 stageCode | 目标进度 |
| --- | --- | --- | ---: |
| 工地 A | 油工/刮墙 | `painting` | 80% |
| 工地 B | 水电定位 | `water_electric_position` | 30% |
| 工地 C | 开关插座 | `switch_socket` | 95% |
| 工地 D | 木工/吊顶 | `carpentry_ceiling` | 65% |

## 3. 规范 stageCode 来源

规范映射来自仓库现有共享配置 `shared/stage-flow.js`，没有在本计划中创建第二套工序表：

- 油工/刮墙 -> `painting`
- 水电定位 -> `water_electric_position`
- 开关插座 -> `switch_socket`
- 木工/吊顶 -> `carpentry_ceiling`

四个名称均能在共享配置中唯一解析。`miniprogram/utils/stage-flow.js` 和 `cloudfunctions/reviewStageLog/stage-flow.js` 的工序定义与共享配置一致。

本地导出快照中四个项目均没有 `currentStageCode` 字段，实际控制工序显示的现有字段是 `currentStage`。因此本计划记录规范目标 code，但暂不规划新增或写入 `currentStageCode`；HOTFIX-4 必须再次确认线上 schema 后才能决定是否保留该字段缺失状态。

## 4. 工地 A 修复卡

### 修复前快照

- 项目 ID：`d6a3...fce2`
- tenant：项目与已审核日报匹配
- `currentStage`：开工交底
- `currentStageCode`：字段不存在
- `progress`：10%
- `status`：施工中
- `statusCode`：`in_progress`
- `updatedAt`：`2026-07-11T23:09:30.634Z`
- 其它实际控制字段：未发现需要调整的工序显示字段

### 修复目标

- `targetCurrentStage`：油工/刮墙
- `targetCurrentStageCode`：`painting`（逻辑目标，暂不写入缺失字段）
- `targetProgress`：80%
- `status`：保持施工中
- `statusCode`：保持 `in_progress`
- 计划写入字段：仅 `currentStage`、`progress`

### 证据

- 人工确认工序：油工/刮墙
- 已审核日报最高合法工序：油工/刮墙
- 已审核日报最高合法进度：80%
- 证据日报：`f070...68ba`
- 证据日期：`2026-06-22`
- 修复可信度：高
- 待确认字段：线上重新读取时确认 `currentStageCode` 仍不存在，且快照未变化

### 回滚卡

- 回滚目标：`currentStage` 回到开工交底，`progress` 回到 10%，状态字段保持原值。
- 回滚触发条件：修复后验证失败，且项目仍满足修复后值的 compare-and-set 条件。
- 如果项目已产生新的日报、进度或状态变化，禁止使用本回滚卡，必须重新人工评估。
- 回滚后验证：重新读取项目，确认工序、进度、状态与修复前快照一致，并确认没有新增通知。

## 5. 工地 B 修复卡

### 修复前快照

- 项目 ID：`d6a3...be90`
- tenant：项目与已审核日报匹配
- `currentStage`：开工交底
- `currentStageCode`：字段不存在
- `progress`：10%
- `status`：施工中
- `statusCode`：`in_progress`
- `updatedAt`：`2026-07-11T23:09:20.360Z`
- 其它实际控制字段：未发现需要调整的工序显示字段

### 修复目标

- `targetCurrentStage`：水电定位
- `targetCurrentStageCode`：`water_electric_position`（逻辑目标，暂不写入缺失字段）
- `targetProgress`：30%
- `status`：保持施工中
- `statusCode`：保持 `in_progress`
- 计划写入字段：仅 `currentStage`、`progress`

### 证据

- 人工确认工序：水电定位
- 已审核日报最高合法工序：水电定位
- 已审核日报最高合法进度：30%
- 证据日报：`d0f4...31eb`
- 证据日期：`2026-06-22`
- 修复可信度：中
- 待确认字段：线上重新读取时确认 `currentStageCode` 仍不存在，且快照未变化；确认历史水电定位记录代表项目当前汇总进度

### 回滚卡

- 回滚目标：`currentStage` 回到开工交底，`progress` 回到 10%，状态字段保持原值。
- 回滚触发条件：修复后验证失败，且项目仍满足修复后值的 compare-and-set 条件。
- 如果项目已产生新的日报、进度或状态变化，禁止使用本回滚卡，必须重新人工评估。
- 回滚后验证：重新读取项目，确认工序、进度、状态与修复前快照一致，并确认没有新增通知。

## 6. 工地 C 修复卡

### 修复前快照

- 项目 ID：`f070...c12b`
- tenant：项目与已审核日报匹配
- `currentStage`：开工交底
- `currentStageCode`：字段不存在
- `progress`：10%
- `status`：施工中
- `statusCode`：`in_progress`
- `updatedAt`：`2026-07-11T23:09:11.536Z`
- 其它实际控制字段：未发现需要调整的工序显示字段

### 修复目标

- `targetCurrentStage`：开关插座
- `targetCurrentStageCode`：`switch_socket`（逻辑目标，暂不写入缺失字段）
- `targetProgress`：95%
- `status`：保持施工中
- `statusCode`：保持 `in_progress`
- 计划写入字段：仅 `currentStage`、`progress`

### 证据

- 人工确认工序：开关插座
- 已审核日报最高合法工序：开关插座
- 已审核日报最高合法进度：95%
- 证据日报：`e319...05f0`
- 证据日期：`2026-07-07`
- 修复可信度：高
- 待确认字段：线上重新读取时确认 `currentStageCode` 仍不存在，且快照未变化

### 回滚卡

- 回滚目标：`currentStage` 回到开工交底，`progress` 回到 10%，状态字段保持原值。
- 回滚触发条件：修复后验证失败，且项目仍满足修复后值的 compare-and-set 条件。
- 如果项目已产生新的日报、进度或状态变化，禁止使用本回滚卡，必须重新人工评估。
- 回滚后验证：重新读取项目，确认工序、进度、状态与修复前快照一致，并确认没有新增通知。

## 7. 工地 D 修复卡

### 修复前快照

- 项目 ID：`4aee...6fc0`
- tenant：项目与已审核日报匹配
- `currentStage`：开工交底
- `currentStageCode`：字段不存在
- `progress`：10%
- `status`：施工中
- `statusCode`：`in_progress`
- `updatedAt`：`2026-07-11T23:09:00.890Z`
- 其它实际控制字段：未发现需要调整的工序显示字段

### 修复目标

- `targetCurrentStage`：木工/吊顶
- `targetCurrentStageCode`：`carpentry_ceiling`（逻辑目标，暂不写入缺失字段）
- `targetProgress`：65%
- `status`：保持施工中
- `statusCode`：保持 `in_progress`
- 计划写入字段：仅 `currentStage`、`progress`

### 证据

- 人工确认工序：木工/吊顶
- 已审核日报最高合法工序：木工/吊顶
- 已审核日报最高合法进度：65%
- 证据日报：`bfd0...e114`
- 证据日期：`2026-06-30`
- 修复可信度：高
- 待确认字段：线上重新读取时确认 `currentStageCode` 仍不存在，且快照未变化

### 回滚卡

- 回滚目标：`currentStage` 回到开工交底，`progress` 回到 10%，状态字段保持原值。
- 回滚触发条件：修复后验证失败，且项目仍满足修复后值的 compare-and-set 条件。
- 如果项目已产生新的日报、进度或状态变化，禁止使用本回滚卡，必须重新人工评估。
- 回滚后验证：重新读取项目，确认工序、进度、状态与修复前快照一致，并确认没有新增通知。

## 8. 目标进度证据

目标进度均按以下规则取得：

`targetProgress = max(修复前项目 progress, reviewStatus = approved 日报历史最高 progress)`

| 工地 | 修复前进度 | 已审核历史最高进度 | targetProgress |
| --- | ---: | ---: | ---: |
| 工地 A | 10% | 80% | 80% |
| 工地 B | 10% | 30% | 30% |
| 工地 C | 10% | 95% | 95% |
| 工地 D | 10% | 65% | 65% |

未使用 pending / rejected 日报，未根据工序名称推导百分比，未修改已审核日报记录。

## 9. 写库前 compare-and-set 条件

HOTFIX-4 每次实际处理单个项目前，必须重新读取并逐字段比较：

1. `projectId` 与临时清单一致。
2. tenant 与临时清单一致，且项目与关联日报租户一致。
3. `currentStage` 与修复前快照一致。
4. `currentStageCode` 的字段存在性与快照一致；本地快照为字段不存在。
5. `progress` 与修复前快照一致。
6. `status` 与快照一致。
7. `statusCode` 与快照一致。
8. `updatedAt` 与快照一致。

任何一项不一致，标记 `STALE_SNAPSHOT`，该项目不写入，重新 dry-run；不得覆盖 HOTFIX-2 后产生的正常业务更新。

本计划的实际写入范围只规划 `currentStage`、`progress`。`currentStageCode`、`status`、`statusCode`、`updatedAt` 只作为比较或保护字段，不直接修改。

## 10. 未来逐项目执行顺序

HOTFIX-4 如获明确授权，必须严格按以下顺序一次处理一个项目：

1. 工地 A -> compare-and-set -> 写入 -> 立即验证
2. 工地 B -> compare-and-set -> 写入 -> 立即验证
3. 工地 C -> compare-and-set -> 写入 -> 立即验证
4. 工地 D -> compare-and-set -> 写入 -> 立即验证

任一项目 compare-and-set 失败、写入失败或验证失败，立即停止后续项目。

## 11. 每项目写后验证方案

每个项目写入后必须重新读取并确认：

- `currentStage` 等于目标工序。
- `progress` 等于目标进度且不低于修复前值。
- `status`、`statusCode` 未改变。
- 老板端、工长端、业主端显示目标工序和进度。
- 原有历史日报仍存在，且没有修改日报工序标签。
- 没有产生新通知、企业微信通知或订阅消息。
- 其它项目的工序、进度和状态未改变。

## 12. 停止条件

出现以下任一情况必须停止：

- 项目 ID 或 tenant 不匹配。
- 任一快照字段发生变化，返回 `STALE_SNAPSHOT`。
- 发现新日报、进度变化或状态变化。
- 发现 `currentStageCode` 字段存在性与本地快照不一致。
- 目标工序或目标进度无法由已审核证据确认。
- 写入后项目状态改变、进度下降、历史日报消失或出现新通知。
- 任一项目验证失败。

## 13. 回滚总则

每个回滚只能针对对应项目，必须同时使用：

- 脱敏项目 ID对应的真实 `projectId`（真实值只在 `/tmp` 清单中保存）。
- 匹配的 tenant 条件。
- 当前修复后 `currentStage`、`progress`、`status`、`statusCode` 值。
- 修复后的 `updatedAt` 或其未变化条件。

回滚目标分别为：

| 工地 | 回滚 currentStage | 回滚 progress | status / statusCode |
| --- | --- | ---: | --- |
| 工地 A | 开工交底 | 10% | 保持施工中 / `in_progress` |
| 工地 B | 开工交底 | 10% | 保持施工中 / `in_progress` |
| 工地 C | 开工交底 | 10% | 保持施工中 / `in_progress` |
| 工地 D | 开工交底 | 10% | 保持施工中 / `in_progress` |

修复后如果项目已经产生正常日报或状态变化，不得执行旧回滚卡，必须重新人工评估。

## 14. 不修改日报说明

- 本计划默认不修改 `stage_logs`。
- 不删除疑似错误日报。
- 不修改疑似误选日报的工序标签。
- 错误日报保留为历史记录。
- 不调用 `reviewStageLog` 或 `submitStageLog`。
- 不触发业主、企业微信或订阅消息通知。

## 15. 临时执行清单

真实项目 ID 和 tenant 条件仅保存在本机临时文件：

`/tmp/stage-regression-repair-plan.json`

该文件不进入 Git、不 push、不在聊天输出完整内容，且不包含手机号、openid、详细地址或图片 fileID。

## 16. 需要人工最终确认的字段

HOTFIX-4 前必须确认：

1. 线上重新读取的四个 `projectId` 与脱敏卡片一致。
2. tenant 匹配且没有跨租户数据。
3. 四个 `currentStage`、`progress`、`status`、`statusCode`、`updatedAt` 仍与本计划快照一致。
4. `currentStageCode` 在线上仍不存在；本计划不擅自新增该字段。
5. HOTFIX-2 之后没有新的正常日报、进度或状态更新。
6. 手工修复只写 `currentStage` 和 `progress`，不改 `updatedAt`，或由人工明确确认其它字段策略。
7. 四个项目执行后均完成端到端验证。

## 17. HOTFIX-4 前置 Gate

已满足的计划条件：

- 四个 targetStage 已人工确认。
- 四个 stageCode 已从共享规范配置确认。
- 四个 targetProgress 有 approved 日报证据。
- 四个修复前快照与回滚卡已生成。
- 执行顺序、停止条件和验证方案已明确。
- 计划默认不修改 `stage_logs`，不触发通知。

尚未满足的生产执行条件：

- 当前生产值是否仍等于快照：尚未重新读取确认。
- HOTFIX-2 后是否有新的正常业务更新：尚未重新读取确认。
- `currentStageCode` 线上字段存在性：尚未重新读取确认。
- 明确人工执行口令：尚未收到。

建议：可以进入 HOTFIX-4 的只读前置核验，但不能直接进入生产写库。实际执行前必须收到固定口令：

`确认执行 Phase 7-HOTFIX-4 四个工地逐项目修复`

## 18. 本阶段禁止事项记录

- 未连接生产数据库。
- 未执行任何生产 `update` / `add` / `remove`。
- 未修改 `projects` 或 `stage_logs`。
- 未修改小程序或云函数业务代码。
- 未部署云函数、未上传体验版、未发布正式版。
- 未合并 PR #2，未读取或写入真实密钥。
