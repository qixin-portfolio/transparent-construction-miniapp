# Phase 7-HOTFIX-4D-1：工地 D 写入失败原因只读定位

## 1. 调查范围

- 项目：透明工地小程序
- 当前阶段：Phase 7-HOTFIX-4D-1：工地 D 写入失败原因只读定位
- 调查日期：2026-07-12
- 调查前代码基线：`df0b47d16377e09010086123ca56a633e3de8c43`
- 调查方式：只读核对仓库文档、脱敏前置备份、脱敏执行日志和 HOTFIX-4C 验收报告。
- 本机当前没有可用的微信云开发控制台会话、云开发只读 API 或项目安全只读工具，因此本阶段没有重新连接生产数据库。不能把本地执行日志当作线上数据库成功回执。

本阶段未执行生产写入、回滚、业务云函数调用、部署、体验版上传或正式发布。

## 2. 工地 D 计划值

- 计划 `currentStage`：木工/吊顶
- 计划 `progress`：65%
- 计划规范工序 code：`carpentry_ceiling`（仅作规范映射，不写入缺失的 `currentStageCode`）
- 允许更新字段：`currentStage`、`progress`，以及数据库正常维护的 `updatedAt`
- 禁止新增 `currentStageCode`，禁止修改 `status`、`statusCode`、`stage_logs`、通知和关系数据。

## 3. 本地证据核对

核对文件：

- `AI_TASKS/V1_STAGE_REGRESSION_REPAIR_EXECUTION_PLAN.md`
- `/tmp/stage-regression-prewrite-backup.json`
- `/tmp/stage-regression-production-repair-log.json`
- `AI_TASKS/V1_STAGE_REGRESSION_PRODUCTION_REPAIR_ACCEPTANCE.md`

### 3.1 项目与租户映射

- 工地 D 在前置备份和生产修复执行日志中的脱敏 projectId 哈希一致。
- 工地 D 在前置备份和生产修复执行日志中的脱敏 tenantId 哈希一致。
- 本地证据未显示 projectId 或 tenantId 被替换。
- 由于没有生产控制台只读查询，无法证明线上按真实 projectId 精确查询时只有一个匹配项目，也无法证明当前环境、集合和租户与前次操作完全一致。

结论：本地证据不支持 `WRONG_PROJECT_TARGET` 或 `TENANT_OR_ENV_MISMATCH`，但线上唯一性和环境一致性仍为未知。

### 3.2 修复前值与目标

执行日志中的工地 D 修复前值为：

- `currentStage`：开工交底
- `progress`：10%
- `status`：施工中
- `statusCode`：`in_progress`
- `currentStageCode`：字段不存在

执行日志中的目标值为：木工/吊顶 / 65%。前置计划中的人工映射和目标证据与此一致。

### 3.3 执行日志与独立验收冲突

执行日志对工地 D 记录：

- `result`：`SUCCESS_USER_CONFIRMED`
- `afterReadback`：木工/吊顶 / 65%
- 记录的保护字段：状态、租户、schema、日报、操作日志和通知均未变化。

但 HOTFIX-4C 的独立只读验收记录：

- 工地 D 最终值：开工交底 / 10%
- 判定：`FAIL`
- 未发现目标值在生产集合中生效。

执行日志还将 `executionScope` 记录为“工地 A and 工地 B”，但同一文件同时包含工地 C、工地 D 的结果；这与四项目逐项目执行范围不一致。

执行日志包含字段级结果断言，但没有可独立核验的数据库成功返回、事务结果、云开发操作记录或第一次回读原始证据。故不能证明“写入曾经真正成功”，也不能证明“写入后被后续业务覆盖”。

## 4. 项目定位与时间线结论

### 项目映射是否唯一

未知。本阶段没有可用的生产只读查询，未能按真实 projectId 和别名完成交叉查询，也未能排除同名项目。

### tenant / 环境是否一致

本地备份与执行日志中的脱敏 tenant 映射一致；线上环境、集合和租户一致性无法独立确认。

### 是否存在真实成功证据

未发现独立的真实数据库成功证据。只有本地执行日志中的 `SUCCESS_USER_CONFIRMED` 和字段断言；该断言已被 HOTFIX-4C 独立回读结果否定或至少无法相互印证。

### 是否曾经达到木工/吊顶 / 65%

无法证实。执行日志声称达到，但没有独立数据库回执；HOTFIX-4C 回读为开工交底 / 10%。

### 是否发生后续覆盖

无法证实。没有生产时间线、operation log 原始记录或可复核的数据库更新记录，不能据此归类为 `OVERWRITTEN_AFTER_WRITE`。

### 根因分类

**`LOG_INCONSISTENT`**

可证实事实是：执行日志范围和结果字段自相矛盾，并且工地 D 的“用户确认式回读”与 HOTFIX-4C 独立只读回读冲突。更底层的原因仍为未知，不能推断为写入失败、写错项目、后续覆盖或控制台缓存。

## 5. 当前生产值

以下是 HOTFIX-4C 报告记录的最近一次独立只读回读结果，不是本阶段重新查询的实时结果：

- `currentStage`：开工交底
- `progress`：10%
- `status`：施工中
- `statusCode`：`in_progress`
- `currentStageCode`：不存在

本阶段未重新连接生产数据库，因此不能声称上述值仍是此刻的实时值。

## 6. 目标证据与补修条件

- 木工/吊顶 / 65% 的 approved 日报证据在 HOTFIX-3 计划中有记录。
- 但当前无法重新读取生产日报确认该证据仍有效，也无法确认 HOTFIX-4C 之后没有新的日报、进度、状态或交付更新。
- 由于前次写入结果无法解释，不能生成或执行新的单项目写入计划。

当前判定：**`ROOT_CAUSE_UNCLEAR`**

不生成 `/tmp/stage-regression-site-d-repair-plan.json`。在完成一次可复核的生产只读查询前，不具备 `READY_FOR_SINGLE_REPAIR` 条件，也不建议再次写入。

## 7. 下一步只读调查要求

重新调查必须由人工打开同一微信云开发环境，并保留最小、脱敏的证据：

1. 按 HOTFIX-3 真实 projectId 精确查询，再按非敏感别名交叉查询。
2. 证明只有一个匹配项目，并核对 tenant。
3. 读取项目字段、`updatedAt`、日报数量和更新记录。
4. 在 HOTFIX-4B 执行窗口前后检查是否存在项目更新、日报审核或其它覆盖事件。
5. 取得真正的数据库更新结果和独立第一次回读结果。
6. 若仍需修复，先重新生成 D 的 expectedBefore，再单项目 CAS 写入；本调查阶段不得写入。

## 8. 安全状态

- 是否修改工地 D：否
- 是否修改工地 A/B/C：否
- 是否修改日报：否
- 是否触发通知：否
- 是否连接生产数据库：否；本阶段仅核对本地脱敏材料和仓库文件
- 是否执行生产写入：否
- 是否部署：否
- 是否上传体验版：否
- 是否发布正式版：否
- `ENABLE_V2_DEAL_LOOP_ENTRY`：`false`
- 是否进入 HOTFIX-5：否

## 9. 隐私说明

本文档只使用“工地 D”作为项目标识，不包含完整 projectId、tenantId、业主姓名、手机号、openid、详细地址、图片 fileID、数据库凭证或原始生产 JSON 全文。
