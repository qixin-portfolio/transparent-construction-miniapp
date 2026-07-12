# Phase 7-HOTFIX-1：工序防倒退与审核角色上传自动通过

## 1. 当前阶段

Phase 7-HOTFIX-1：工序防倒退与审核角色上传自动通过。

## 2. 生产基线

- 生产小程序基线 commit：`b005c96c7d89fbd34012a97515e1d3f501ac27d4`
- 生产基线 tag：`v1-onsite-issue-fix`
- 正式上线归档 tag：`v1-official-launch-record`
- 独立 hotfix 分支：`hotfix/stage-regression-and-reviewer-auto-approve`
- GitHub Issue：`#4`

## 3. 原问题

1. 上传日报页面默认选中第一工序“开工交底”。
2. 工人忘记选择工序时，可能把较晚阶段的日报标成“开工交底”。
3. 审核云函数直接用日报工序和进度覆盖项目字段，导致项目当前工序和进度倒退。
4. `boss_qi` 等有审核权限的角色自己上传日报后仍进入待审核，真实业务中容易卡住。

## 4. 审计摘要

- 上传页路径：`miniprogram/subpackages/internal/pages/upload-log/`
- 提交云函数：`cloudfunctions/submitStageLog/`
- 审核云函数：`cloudfunctions/reviewStageLog/`
- 工序配置来源：`shared/stage-flow.js`，并同步到小程序和两个云函数运行目录
- 老板待审核列表：继续按 `reviewStatus = pending` 查询，自动审核日志不会进入待审核数量
- 业主通知：审核事务成功后调用 `sendOwnerNotice`

## 5. 工序默认选择修复

- 上传页不再初始化为 `STAGES[0]`。
- 页面打开后读取项目当前工序。
- 有项目当前工序时，默认选中项目当前工序。
- 没有项目当前工序时，页面要求明确选择本次施工工序。
- 不再静默使用“开工交底”。

## 6. 服务端工序兜底

- `submitStageLog` 使用 `resolveSubmissionStage(event, project)`。
- 事件中有合法工序时使用事件工序。
- 事件中没有合法工序时读取项目当前工序。
- 项目也没有当前工序时返回 `STAGE_REQUIRED`。

## 7. 项目工序和进度单调更新

- 新增 `buildProjectProgressPatch(project, log, now)`。
- 日报工序晚于项目当前工序时，项目推进到该工序。
- 日报工序早于或等于项目当前工序时，项目保持当前工序。
- 项目进度取 `max(项目当前进度, 日报进度)`。
- 已交付 / 已完工项目不被日报改回施工中状态。
- 较早工序日志保留真实工序，并标记 `isHistoricalOrRework`。

## 8. 审核角色上传自动通过

- 服务端根据当前登录用户真实角色判断。
- `admin`、`boss_qi`、`boss_hu` 自己上传日报时：
  - `reviewStatus = approved`
  - `ownerVisible = true`
  - `approvalMode = reviewer_self_upload`
  - 同步执行项目工序 / 进度单调更新
  - 事务成功后只发送一次业主通知
- 普通工长 / 员工上传仍为待审核。

## 9. 重复审核和并发审核

- `reviewStageLog` 在事务中读取日报状态。
- 只有 `pending -> approved/rejected` 会更新项目和触发通知。
- 已审核日报重复审核返回幂等结果，不重复更新项目，不重复通知业主。
- 并发审核通过事务串行 / 冲突保证只有一次状态转换成功。

## 10. 通知处理

- 业主通知在审核或自动审核事务成功后执行。
- 通知失败不会回滚日报审核状态或项目进度。
- 通知结果写回 `noticeStatus` / `noticeError`。

## 11. 修改文件列表

- `shared/stage-flow.js`
- `miniprogram/utils/stage-flow.js`
- `miniprogram/utils/constants.js`
- `miniprogram/subpackages/internal/pages/upload-log/upload-log.js`
- `miniprogram/subpackages/internal/pages/upload-log/upload-log.wxml`
- `miniprogram/subpackages/internal/pages/upload-log/upload-log.wxss`
- `cloudfunctions/submitStageLog/index.js`
- `cloudfunctions/submitStageLog/stage-flow.js`
- `cloudfunctions/submitStageLog/submitService.js`
- `cloudfunctions/reviewStageLog/index.js`
- `cloudfunctions/reviewStageLog/stage-flow.js`
- `cloudfunctions/reviewStageLog/reviewService.js`
- `tests/stage-log-behavior/`
- `scripts/stage-regression-dry-run.js`
- `AI_TASKS/V1_STAGE_REGRESSION_REPAIR_DRY_RUN.md`
- `AI_TASKS/V1_STAGE_REGRESSION_AND_REVIEWER_AUTO_APPROVE_HOTFIX.md`

## 12. 测试结果

行为测试：

```bash
node --test tests/stage-log-behavior/*.test.js
```

结果：19/19 通过。

覆盖：

- 未传工序时服务端使用项目当前工序
- 只传工序名但没有合法 `stageCode` 时服务端使用项目当前工序
- 未传工序且项目无当前工序时返回 `STAGE_REQUIRED`
- 当前木工时审核开工交底日报不倒退
- 当前 60% 时审核 10% 日报不倒退
- 当前开工交底时审核水电日报正常推进
- 已交付项目审核旧日报后仍保持已交付
- 普通工长上传后为 pending
- `boss_qi` 上传后为 approved
- boss 自己上传不进入待审核
- boss 自动审核只通知一次
- 已审核日报重复审核幂等
- 并发审核只有一次状态转换通知
- 较早工序日志保留但项目不回退
- 通知失败不破坏审核成功状态

## 13. 当前 V2 状态

- `ENABLE_V2_DEAL_LOOP_ENTRY = false`
- 本阶段未打开 V2
- 本阶段未修改 V2 deal-loop

## 14. 禁止事项确认

- 未执行生产数据库写入
- 未部署云函数
- 未上传体验版
- 未发布正式版
- 未合并安全 PR
- 未写入真实密钥

## 15. 下一步建议

建议进入 Phase 7-HOTFIX-2：四个工地数据修复确认与体验版验证。

Phase 7-HOTFIX-2 应先做两件事：

1. 用只读数据跑 `scripts/stage-regression-dry-run.js`，确认四个项目建议恢复值。
2. 部署 / 上传前先做体验版验证，重点验证普通工长上传、boss 自传自动审核、旧工序补充记录不倒退。
