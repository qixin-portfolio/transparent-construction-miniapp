# Phase 4B AI 云函数回滚方案

## 1. 如果云函数部署失败

- 不影响现有小程序。
- 不影响日报审核。
- 不影响业主端。
- 暂停部署，检查云函数日志。
- 不部署其他云函数。
- 不上传体验版。

## 2. 如果 AI 环境变量配置错误

- 清空或修正环境变量。
- 重新部署或重启 `aiGenerateOwnerSummary` 云函数。
- 前端未接入前不会影响用户。
- 不需要修改数据库。

## 3. 如果 AI 返回质量差

- 先调整 Prompt。
- 不接前端。
- 不写数据库。
- 不影响现有日报审核流程。
- 继续让老板人工审核日报。

## 4. 如果成本异常

- 立即移除 `AI_API_KEY`。
- 暂停 AI 云函数调用。
- 后续增加套餐额度限制。
- 后续接入 `enabledModules`、`aiMonthlyQuota`、`aiUsedThisMonth` 再开放给客户。

## 5. 代码回滚

如需回滚到 Phase 3 稳定状态：

```bash
git checkout saas-phase3-manual-plan-admin-ok
```

或在当前分支 revert AI 云函数 commit：

```bash
git revert 6837f4d
```

注意：

- 这里只写方案，本轮不执行。
- 回滚前先确认当前是否已有后续 Phase 4C 提交。
- 不要删除线上数据。
- 不要执行数据库脚本。
- 不要执行 `initSaasDefaults`。

## 6. 业务应急

如果后续前端接入后 AI 不稳定：

- 临时隐藏 AI 生成按钮。
- 保留原人工审核流程。
- 保留 `reviewStageLog` 原审核能力。
- 不影响业主端查看已审核日报。
