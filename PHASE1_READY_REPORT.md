# SaaS Phase 1 Ready 报告

## 1. 当前分支

`saas-phase1-register`

## 2. 当前最新 commit

`1458029 backup before saas phase1 register`

## 3. `SAAS_AUDIT.md` 是否已提交

未提交。

原因：当前工作区除 `SAAS_AUDIT.md` 外，还有 Phase 1 代码改动未提交。按本轮指令，不能直接提交，需要先由齐鑫确认是否允许只提交 `SAAS_AUDIT.md`。

## 4. 当前是否有未提交文件

有。

当前未提交内容包括：

- `SAAS_AUDIT.md`
- `PHASE1_RISK_REVIEW.md`
- `PHASE1_PREDEPLOY_CHECKLIST.md`
- `PHASE1_ACCEPTANCE_TEST.md`
- `PHASE1_MIN_DEPLOY_STEPS.md`
- `PHASE1_ROLLBACK.md`
- `PHASE1_READY_REPORT.md`
- Phase 1 代码改动：
  - `cloudfunctions/login/index.js`
  - `cloudfunctions/login/index.backup.phase1.js`
  - `cloudfunctions/registerTenant/`
  - `miniprogram/app.js`
  - `miniprogram/app.json`
  - `miniprogram/pages/register/`
  - `miniprogram/pages/workbench/workbench.js`
  - `miniprogram/services/cloud.js`

## 5. Phase 1 已完成能力

- 新增老板注册云函数 `registerTenant`
- 新增老板注册页 `pages/register/register`
- `login` 已改为普通新用户返回 `needRegister: true`
- 老账号角色继续兼容
- 白名单页面不会被注册流程打断
- 当前能力尚未部署、尚未验收

## 6. 审计发现的重点风险

- `listPendingStageLogs` 二次查询 `projects` 时未追加 `tenantId`
- 文件上传路径目前主要按 `projectId` 分目录，缺少 `tenantId` 前缀
- `initSaasDefaults` 具有批量初始化和回填能力，生产环境不得随便重跑
- 删除类云函数存在 `remove`，后续 SaaS 化前必须逐个复核
- 角色体系仍偏晟景自用，后续需要通用化
- 当前尚未实现套餐项目数/员工数限制

## 7. 风险是否阻塞 Phase 1 体验版部署

不完全阻塞 Phase 1 体验版验证，但必须满足前置条件：

- 数据库完成控制台导出
- 只部署 `registerTenant` 和 `login`
- 不部署其他云函数
- 不执行 `initSaasDefaults`
- 不上传正式版

这些风险必须进入后续 Phase 2/Phase 3 修复计划。

## 8. 部署前人工必须完成的事项

- 在微信云开发控制台导出核心集合
- 确认导出文件已下载到本地
- 确认 Git 工作区状态
- 确认本轮文档和审计报告如何提交
- 明确测试微信号、测试公司名称、测试手机号

## 9. 是否建议部署体验版

暂不建议部署体验版。需要先完成微信云开发数据库集合导出。

此外，当前 Git 工作区仍有未提交文件，也不满足部署前检查条件。

## 10. 是否允许进入 Phase 2

Phase 1 体验版未验收通过前，不允许进入 Phase 2。
