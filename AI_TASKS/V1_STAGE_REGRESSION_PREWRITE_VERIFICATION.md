# Phase 7-HOTFIX-4A：四个倒退工地生产写入前只读核验

## 1. 当前阶段与代码基线

- 当前阶段：Phase 7-HOTFIX-4A：四个倒退工地生产写入前只读核验
- 当前分支：`hotfix/stage-regression-and-reviewer-auto-approve`
- 核验前 HEAD：`c98f2810b95449b0af3ec5e13df09b1bda988183`
- HOTFIX-3 计划：`AI_TASKS/V1_STAGE_REGRESSION_REPAIR_EXECUTION_PLAN.md`
- 核验时间：`2026-07-12T11:07:12+0800`
- 核验前工作区：clean
- 核验前本地/远端同步：`0 0`

## 2. 只读核验方式

- 通过微信开发者工具中的云开发控制台进行只读导出。
- 重新导出 `projects`、`stage_logs` 和 `operation_logs` 到本机 `/tmp` 临时文件。
- 在本地按 HOTFIX-3 临时计划的 projectId 严格匹配四个项目。
- 只比较项目快照字段和快照时间之后的相关记录。
- 工序和目标证据使用仓库现有 `shared/stage-flow.js` 解析。
- 未调用 `reviewStageLog`、`submitStageLog` 或任何业务写入云函数。
- 未执行数据库 `update`、`add`、`remove`、事务写入或通知。

## 3. 工地 A 核验结论

- 脱敏项目 ID：`d6a3...fce2`
- projectId：一致
- tenant：一致
- 当前工序：开工交底，与 HOTFIX-3 快照一致
- `currentStageCode`：字段不存在，与快照一致
- 当前进度：10%，与快照一致
- 当前状态：施工中 / `in_progress`，与快照一致
- `updatedAt`：与快照一致
- 快照后新日报：无
- 快照后相关 operation log：无
- 目标 approved 日报证据：仍存在，油工/刮墙 80%
- 目标值是否已自然完成：否
- 判定：`READY`

## 4. 工地 B 核验结论

- 脱敏项目 ID：`d6a3...be90`
- projectId：一致
- tenant：一致
- 当前工序：开工交底，与 HOTFIX-3 快照一致
- `currentStageCode`：字段不存在，与快照一致
- 当前进度：10%，与快照一致
- 当前状态：施工中 / `in_progress`，与快照一致
- `updatedAt`：与快照一致
- 快照后新日报：无
- 快照后相关 operation log：无
- 目标 approved 日报证据：仍存在，水电定位 30%
- 目标值是否已自然完成：否
- 判定：`READY`

## 5. 工地 C 核验结论

- 脱敏项目 ID：`f070...c12b`
- projectId：一致
- tenant：一致
- 当前工序：开工交底，与 HOTFIX-3 快照一致
- `currentStageCode`：字段不存在，与快照一致
- 当前进度：10%，与快照一致
- 当前状态：施工中 / `in_progress`，与快照一致
- `updatedAt`：与快照一致
- 快照后新日报：无
- 快照后相关 operation log：无
- 目标 approved 日报证据：仍存在，开关插座 95%
- 目标值是否已自然完成：否
- 判定：`READY`

## 6. 工地 D 核验结论

- 脱敏项目 ID：`4aee...6fc0`
- projectId：一致
- tenant：一致
- 当前工序：开工交底，与 HOTFIX-3 快照一致
- `currentStageCode`：字段不存在，与快照一致
- 当前进度：10%，与快照一致
- 当前状态：施工中 / `in_progress`，与快照一致
- `updatedAt`：与快照一致
- 快照后新日报：无
- 快照后相关 operation log：无
- 目标 approved 日报证据：仍存在，木工/吊顶 65%
- 目标值是否已自然完成：否
- 判定：`READY`

## 7. currentStageCode 存在性核验

- 工地 A：不存在，和 HOTFIX-3 快照一致
- 工地 B：不存在，和 HOTFIX-3 快照一致
- 工地 C：不存在，和 HOTFIX-3 快照一致
- 工地 D：不存在，和 HOTFIX-3 快照一致

本次不新增 `currentStageCode`，未来只规划更新 `currentStage`、`progress`，并按数据库正常行为处理 `updatedAt`。

## 8. 快照后新业务检查

- 四个目标项目快照后新 `stage_logs`：0
- 四个目标项目快照后新 approved 日报：0
- 四个目标项目快照后新 pending 日报：0
- 四个目标项目快照后新 rejected 日报：0
- 四个目标项目快照后相关 operation logs：0
- 四个目标项目当前状态变化：无
- 四个目标项目当前进度变化：无
- 竣工/交付操作：未发现
- 其它影响四个项目汇总状态的记录：未发现

全局导出的 `stage_logs` 总数较 HOTFIX-2 增加 1 条，但不属于 A-D 四个目标项目，不影响本轮 CAS 核验。

## 9. 目标值证据检查

| 工地 | 目标工序 | 目标 stageCode | 目标进度 | approved 证据 | 当前 progress 是否超过目标 |
| --- | --- | --- | ---: | --- | --- |
| 工地 A | 油工/刮墙 | `painting` | 80% | 有 | 否 |
| 工地 B | 水电定位 | `water_electric_position` | 30% | 有 | 否 |
| 工地 C | 开关插座 | `switch_socket` | 95% | 有 | 否 |
| 工地 D | 木工/吊顶 | `carpentry_ceiling` | 65% | 有 | 否 |

四个项目均为施工中，不属于已交付项目；目标值未因新业务而失效，也未根据工序名称重新猜测进度。

## 10. 执行就绪矩阵

| 工地 | 快照一致 | tenant 一致 | currentStageCode 存在性一致 | 快照后新业务 | 目标证据有效 | 判定 |
| --- | --- | --- | --- | --- | --- | --- |
| 工地 A | 是 | 是 | 是 | 无 | 是 | READY |
| 工地 B | 是 | 是 | 是 | 无 | 是 | READY |
| 工地 C | 是 | 是 | 是 | 无 | 是 | READY |
| 工地 D | 是 | 是 | 是 | 无 | 是 | READY |

## 11. 阻塞项与重新 dry-run 判断

- 阻塞项目：无
- `STALE_SNAPSHOT`：无
- `SCHEMA_CHANGED`：无
- `TENANT_MISMATCH`：无
- `DATA_CONFLICT`：无
- `NO_ACTION_REQUIRED`：无
- 是否需要重新 dry-run：否

## 12. HOTFIX-4B 条件

四个项目均已达到只读核验的 `READY` 条件，可以建议进入 HOTFIX-4B 的逐项目生产修复阶段。

但本报告不构成生产写入授权。HOTFIX-4B 仍必须：

1. 执行前再次进行 compare-and-set 读取。
2. 严格按 A -> B -> C -> D 逐项目处理。
3. 每个项目写入后立即验证，失败即停止后续项目。
4. 只更新 `currentStage`、`progress`，不新增 `currentStageCode`。
5. 不修改 `stage_logs`，不触发通知。
6. 收到明确人工口令：`确认执行 Phase 7-HOTFIX-4B 四个工地逐项目修复`。

## 13. 本阶段禁止事项确认

- 是否修改项目：否
- 是否修改日报：否
- 是否连接生产数据库：仅通过云开发控制台只读导出，未执行数据库写入连接
- 是否执行生产写入：否
- 是否触发通知：否
- 是否部署云函数：否
- 是否上传体验版：否
- 是否发布正式版：否
