# SaaS Phase 2 最小部署步骤

## 1. 部署原则

本次不是正式发布，不是全量 SaaS 上线。

本次只验证 Phase 2 最小范围：

- 免费版项目数限制
- 免费版员工数限制
- 待审核日报项目名二次查询租户隔离

## 2. 最小部署顺序

1. 人工确认晟景租户套餐额度。
2. 确认 Git 工作区 clean。
3. 只部署 `listPendingStageLogs`。
4. 部署后先测晟景待审核日报列表。
5. 再部署 `createProject`。
6. 测晟景创建项目。
7. 再部署 `createStaffInviteCode`。
8. 再部署 `bindStaffRole`。
9. 测免费租户员工数限制。
10. 上传小程序体验版，如前端未改动，可只作为体验验证。
11. 按 `PHASE2_ACCEPTANCE_TEST.md` 逐项验收。
12. 验收通过后再决定是否合并 master。

## 3. 每一步成功标志

### 3.1 人工确认晟景套餐额度

成功标志：

- 已确认 `tenants` 或 `subscriptions` 中晟景额度足够高。
- 建议为：

```txt
plan: enterprise
status: active
maxProjects: 9999
maxStaff: 9999
```

### 3.2 部署 `listPendingStageLogs`

成功标志：

- 晟景管理员能正常打开待审核日报列表。
- 当前租户项目名正常显示。
- 不出现跨租户项目名。

### 3.3 部署 `createProject`

成功标志：

- 晟景老账号创建项目正常。
- 免费租户第 4 个项目被 `PLAN_PROJECT_LIMIT_REACHED` 拦截。

### 3.4 部署 `createStaffInviteCode`

成功标志：

- 免费租户员工未满时可生成邀请码。
- 免费租户员工已满时生成邀请码被 `PLAN_STAFF_LIMIT_REACHED` 拦截。

### 3.5 部署 `bindStaffRole`

成功标志：

- 免费租户员工未满时可激活员工。
- 免费租户员工已满时旧邀请码激活被 `PLAN_STAFF_LIMIT_REACHED` 拦截。

## 4. 禁止事项

- 禁止一次性部署全部云函数。
- 禁止部署无关云函数。
- 禁止执行数据库脚本。
- 禁止执行 `initSaasDefaults`。
- 禁止发布正式版。
- 禁止批量回填 `tenantId`。
- 禁止批量修改套餐。
- 禁止批量删除数据。
- 禁止合并 master。

## 5. 部署记录

```txt
部署人：
部署时间：
已确认晟景套餐额度：是 / 否
已部署 listPendingStageLogs：是 / 否
已部署 createProject：是 / 否
已部署 createStaffInviteCode：是 / 否
已部署 bindStaffRole：是 / 否
是否上传体验版：是 / 否
备注：
```
