# Phase 7-HOTFIX-4D-1A：工地 D 同一云环境生产只读交叉核验

## 1. 当前阶段与调查背景

- 项目：透明工地小程序
- 当前阶段：Phase 7-HOTFIX-4D-1A：工地 D 同一云环境生产只读交叉核验
- 核验日期：2026-07-12
- 核验前代码基线：`2d4bea36bcbdc234b6034a0ca32ee72ac0701f9c`
- 前置根因分类：`LOG_INCONSISTENT`
- 前置判定：`ROOT_CAUSE_UNCLEAR`

HOTFIX-4B 执行日志声称工地 D 已写入木工/吊顶 / 65%，但 HOTFIX-4C 的独立回读仍为开工交底 / 10%。本阶段目标是先证明正式环境、写入环境和项目映射一致性，再决定是否允许后续只读核验。

本阶段未连接生产数据库，未执行生产写入、回滚、业务云函数调用、部署、体验版上传或正式发布。

## 2. 正式 AppID / envId 脱敏标识

- `project.config.json` 存在小程序 AppID 配置；本文仅记录为 `wxbf...ae67`。
- `miniprogram/app.js` 的运行时环境配置为 `cloud1-...e26d5`。
- `wx.cloud.init({ env, traceUser: true })` 使用 `globalData.envId` 初始化云能力。
- 云函数使用 `cloud.DYNAMIC_CURRENT_ENV`，实际函数环境由部署目标和调用环境决定。

这些只能证明代码中的运行时配置线索，不能证明当前正式版已经使用该环境，也不能证明微信开发者工具当时选中的部署环境就是该环境。

## 3. 正式环境确认方式与结果

已核对：`project.config.json`、`project.private.config.json`、`miniprogram/app.js`、现有部署预检文档和 HOTFIX 本地临时材料。

未取得：

- 当前正式版版本对应的云环境证明；
- 微信开发者工具当前选中的云环境截图或可验证导出；
- 正式版发布记录中同时包含 AppID、envId 和版本的完整关联证据；
- 云开发控制台只读会话或只读 API 返回。

结论：**`PRODUCTION_ENV_UNCERTAIN`**。按照本阶段规则，停止后续项目生产查询。

## 4. HOTFIX-4B 操作环境确认

核对文件：

- `/tmp/stage-regression-production-repair-log.json`
- `/tmp/stage-regression-prewrite-backup.json`
- `/tmp/stage-regression-repair-plan.json`

HOTFIX-4B 执行日志结果：

- 未记录 envId；
- 未记录 AppID；
- 未记录实际选中的云开发环境；
- 未记录 collection 名称；
- 未记录可独立核验的数据库返回结果、事务结果或操作审计 ID；
- 仅以脱敏后的本地记录和 `SUCCESS` / `SUCCESS_USER_CONFIRMED` 字段描述结果；
- 日志的 `executionScope` 写为“工地 A and 工地 B”，但同一文件包含 A、B、C、D 四条结果。

代码和计划使用的目标集合是 `projects`，但日志不能证明 HOTFIX-4B 实际查询和写入的环境、集合与正式环境一致。

结论：**`WRITE_ENV_UNCERTAIN`**，不能生成工地 D 补修计划。

## 5. 工地 D 项目映射

按照规则，本阶段在正式环境未确认前没有执行真实 `_id` 精确查询、别名交叉查询、同名项目查询或跨租户查询。

- 项目映射是否唯一：未证明；
- 当前控制台记录是否就是计划中的工地 D：未证明；
- tenant 是否一致：本地备份与执行日志的脱敏映射一致，但线上 tenant 未重新核验；
- 是否存在重复名称或其它环境相似记录：未核验。

判定：**`PROJECT_MAPPING_NOT_PROVEN`**，不输出完整 projectId、tenantId 或项目名称。

## 6. 独立只读证据

本阶段没有取得正式云环境中的证据 A（`projects` 当前文档）或证据 B（最小字段导出、查询结果、操作审计记录或更新时间记录）。

因此无法证明：

1. HOTFIX-4B 写入请求到达正式环境；
2. 写入目标就是当前工地 D；
3. 数据库曾返回成功；
4. 工地 D 曾变成木工/吊顶 / 65%；
5. 写入后曾被业务覆盖回开工交底 / 10%。

前次执行日志只能作为待核对线索，不能作为独立数据库证据。

## 7. 根因分类

**`EVIDENCE_INSUFFICIENT`**

当前可证实的是环境、集合、项目映射和数据库回执均缺少独立证据。不能把问题猜测为写入未到达、写错环境、写错项目、后续覆盖或查询缓存错误。

## 8. 当前正式生产值与业务更新

本阶段未重新读取正式生产值。最近一次 HOTFIX-4C 独立回读记录工地 D 为：

- `currentStage`：开工交底
- `progress`：10%
- `status`：施工中
- `statusCode`：`in_progress`
- `currentStageCode`：不存在

该值不是本阶段实时查询结果。HOTFIX-4A 之后是否产生新日报、审核、进度更新、状态更新或交付操作，本阶段也未能在正式环境核验。

目标木工/吊顶 / 65% 的 approved 日报证据在 HOTFIX-3 计划中有记录，但本阶段未重新从正式环境验证其当前有效性。

## 9. 最终判定

**`ENVIRONMENT_NOT_PROVEN`**

同时存在：

- `PRODUCTION_ENV_UNCERTAIN`；
- `WRITE_ENV_UNCERTAIN`；
- `PROJECT_MAPPING_NOT_PROVEN`；
- `EVIDENCE_INSUFFICIENT`。

本阶段不具备 `READY_FOR_SINGLE_REPAIR` 条件，不生成 `/tmp/stage-regression-site-d-repair-plan.json`，不允许进入 HOTFIX-4D-2。

## 10. 后续核验前置条件

需由人工在同一微信开发者工具/云开发控制台中确认并保留脱敏证据：

1. 正式版 AppID 与云环境的对应关系；
2. HOTFIX-4B 当时实际选中的云环境、collection 和查询时间；
3. 按真实 projectId 精确定位工地 D，并证明只有一个匹配项目；
4. tenant、项目字段和 `updatedAt` 的当前只读结果；
5. 数据库成功回执、独立首次回读和写入后更新时间线；
6. HOTFIX-4A 之后是否存在新的日报、进度、状态或交付更新。

仅在以上证据完整且环境、写入环境、项目映射均确认后，才可重新评估 `READY_FOR_SINGLE_REPAIR`。本阶段没有生成临时证据目录或补修计划。

## 11. 安全声明

- 是否修改工地 D：否
- 是否修改工地 A/B/C：否
- 是否执行生产写入：否
- 是否触发通知：否
- 是否部署：否
- 是否上传体验版：否
- 是否发布正式版：否
- 是否进入 HOTFIX-5：否
- `ENABLE_V2_DEAL_LOOP_ENTRY`：`false`

## 12. 隐私说明

本文档只使用“工地 D”作为项目标识，并使用脱敏 AppID/envId 标识；不包含完整 projectId、tenantId、业主姓名、手机号、openid、详细地址、图片 fileID、数据库凭证或原始导出 JSON。
