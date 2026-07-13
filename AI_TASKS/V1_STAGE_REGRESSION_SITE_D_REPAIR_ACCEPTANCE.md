# Phase 7-HOTFIX-4D-3：工地 D 补修结果验收与审计归档

## 1. 阶段与背景

- 项目：透明工地小程序
- 当前阶段：Phase 7-HOTFIX-4D-3：工地 D 补修结果验收与审计归档
- 验收日期：2026-07-13
- 代码基线：`4d3ef5ca00531012c5277680da483206794bc142`
- 本阶段只归档 HOTFIX-4D-2 的生产修复结果和人工验收，不执行新的生产写入。

工地 D 曾因项目汇总工序和进度倒退显示为开工交底 / 10%。本次单项目受控补修目标为木工/吊顶 / 65%。

## 2. 正式环境与写入范围

- 正式云环境已通过微信开发者工具云开发控制台确认。
- 写入集合：`projects`
- 项目标识：仅使用“工地 D”，真实 projectId 和 tenantId 仅保存在本机 `/tmp` 证据文件中。
- 写入方式：带 projectId、tenantId、当前工序、当前进度、状态、状态码和更新时间条件的单条 CAS 更新。
- 未使用项目名称作为写入条件。

## 3. 修复前快照

- `currentStage`：开工交底
- `progress`：10%
- `status`：施工中
- `statusCode`：`in_progress`
- `currentStageCode`：字段不存在
- tenant：匹配
- 快照文件：`/tmp/stage-regression-site-d-prewrite-backup.json`

## 4. 数据库修复结果

目标值：

- `currentStage`：木工/吊顶
- `progress`：65%

数据库真实返回：

- 返回状态：执行成功
- 匹配记录数：1
- 更新记录数：1
- 错误码：无
- 错误信息：无

实际更新字段仅为：

- `currentStage`
- `progress`

未新增 `currentStageCode`，未修改 `status`、`statusCode`、tenant、项目名称、绑定关系或其它项目。数据库未自动改写 `updatedAt`，其值保持修复前值。

生产修复日志：`/tmp/stage-regression-site-d-production-repair-log.json`

## 5. 独立只读回读

写入后通过同一正式环境、同一 `projects` 集合和同一项目 ID 独立回读：

- `currentStage`：木工/吊顶
- `progress`：65%
- `status`：施工中
- `statusCode`：`in_progress`
- tenant：未改变
- `currentStageCode`：仍不存在
- stage_logs：未修改，工地 D 关联 3 条
- operation_logs：未发现异常记录，工地 D 关联 0 条
- notifications：未发现工地 D 关联通知
- 其它项目：未受影响

独立回读证据：`/tmp/stage-regression-site-d-readback.json`

## 6. 人工真机验收

齐鑫已确认工地 D 真机验收通过：

- 老板端：工序和进度显示正确，项目状态正常；
- 工长端：当前工序和进度显示正常，历史日报存在；
- 业主端：当前工序和进度显示正确，历史日报和照片可查看；
- 未发现异常通知或新增待审核日报；
- 工地 A、B、C 未受影响。

## 7. 最终判定

最终判定：**`SUCCESS`**

判定依据：数据库明确更新 1 条、独立回读达到木工/吊顶 / 65%、保护字段未变化、未修改日报、未产生通知，且三端真机验收通过。

不需要回滚，不执行自动重试。

## 8. 根因与后续风险

本次修复只恢复工地 D 的项目汇总字段，不代表根因业务代码已经在线上部署。以下修复仍需另行完成测试、部署准备和体验版回归：

- 工序防倒退；
- 上传页默认使用项目当前工序；
- 审核角色本人上传自动审核。

在根因代码正式部署前，仍存在再次发生工序倒退或审核卡住的可能。本阶段不自动进入 HOTFIX-5。

## 9. 安全声明

- 是否再次修改生产库：否
- 是否修改 stage_logs：否
- 是否触发通知：否
- 是否部署云函数：否
- 是否上传体验版：否
- 是否发布正式版：否
- 是否合并 PR #2：否
- `ENABLE_V2_DEAL_LOOP_ENTRY`：`false`

## 10. 隐私说明

本文档只使用“工地 D”作为项目标识，不包含完整 projectId、tenantId、AppID、envId、业主姓名、手机号、openid、详细地址、图片 fileID、数据库凭证或原始生产 JSON。
