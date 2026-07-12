# Phase 7-HOTFIX-1：四个工地工序倒退修复 dry-run

## 1. 当前阶段

Phase 7-HOTFIX-1：工序防倒退与审核角色上传自动通过。

本文件只记录数据修复预览，不执行生产数据库写入。

## 2. 基线

- 生产基线 commit：`b005c96c7d89fbd34012a97515e1d3f501ac27d4`
- 生产基线 tag：`v1-onsite-issue-fix`
- 云环境：`cloud1-d4g7zh8kpca0e26d5`
- 已确认线上相关云函数版本：
  - `submitStageLog`：远端源码与 `b005c96` 一致
  - `reviewStageLog`：远端源码与 `b005c96` 一致

## 3. dry-run 工具

新增只读工具：

```bash
node scripts/stage-regression-dry-run.js <data.json>
```

输入数据要求：

- `projects`：只读导出的目标项目列表
- `stage_logs`：只读导出的目标项目已审核日报列表

脚本只在本地内存中计算，不连接数据库，不执行 update。

## 4. 本次生产数据读取状态

本机终端未发现可直接只读查询云数据库的 `tcb` / `cloudbase` / `wx` 命令。

微信开发者工具 CLI 存在，但当前 CLI 只暴露云环境和云函数命令，没有直接数据库导出命令。

因此本阶段没有从生产库直接拉取四个真实工地数据，没有生成具体四个项目的恢复值。

## 5. 需要人工只读导出的数据

请在微信云开发控制台只读导出或截图核对四个异常项目：

- `projects._id`
- `projects.name`
- `projects.currentStage`
- `projects.currentStageCode`
- `projects.progress`
- `projects.status`
- `projects.statusCode`
- `stage_logs._id`
- `stage_logs.projectId`
- `stage_logs.createdAt`
- `stage_logs.stage`
- `stage_logs.stageCode`
- `stage_logs.progress`
- `stage_logs.reviewStatus`
- `stage_logs.workContent`

不要导出完整业主 openid、手机号、地址等隐私字段。

## 6. 推导原则

1. 项目当前工序取已审核日报中的最高合法工序。
2. 项目进度取当前值和已审核历史最高值中的最大值。
3. 已交付项目保持已交付。
4. 不自动修改疑似误标日报。
5. 对“刮墙贴网格布、纸绷带、找补”等内容，只标记为疑似工序错误，不由关键词直接写生产数据。
6. 四个项目的具体日志修正必须人工确认映射后执行。

## 7. 当前 dry-run 结论

- 代码层 dry-run 工具已准备。
- 生产四个项目的具体恢复工序 / 恢复进度：待人工只读导出数据后计算。
- 本阶段未执行任何生产数据库写入。

## 8. 后续建议

进入 Phase 7-HOTFIX-2 前，先由人工在云控制台确认四个异常项目数据，并用本脚本生成恢复建议。

恢复建议确认后，才能单独进入数据修复阶段。数据修复阶段必须只修确认过的四个项目，不做批量猜测。
