# SaaS Phase 1 最小部署步骤

本流程不是正式发布。

本流程不是全量 SaaS 上线。

本流程只用于 Phase 1 老板注册链路体验版验证。

## 部署顺序

1. 人工导出微信云开发数据库集合。
2. 确认 Git 工作区干净。
3. 只部署 `registerTenant` 云函数。
4. 再部署 `login` 云函数。
5. 不部署其他云函数。
6. 上传小程序体验版。
7. 使用测试微信号逐项验收。
8. 记录验收结果。
9. 验收通过后再决定是否合并 `master`。

## 数据库导出要求

必须先导出：

- `users`
- `tenants`
- `tenant_users`
- `subscriptions`
- `tenant_branding`
- `projects`
- `customers`
- `owner_bindings`
- `stage_logs`
- `photos`
- `staff_invite_codes`
- `worker_project_bind_codes`

数据库未完成导出前，不允许部署云函数，不允许上传体验版，不允许执行初始化脚本。

## 云函数部署边界

允许部署：

- `registerTenant`
- `login`

禁止部署：

- 全部云函数
- `initSaasDefaults`
- 删除类云函数
- Phase 2 相关云函数

## 体验版验收边界

只验收：

- 老板注册链路
- `login` 分流保护
- 老账号兼容
- 公开页/业主绑定/员工邀请码流程不被误拦截

不验收：

- 套餐限制
- 超级后台
- 租户安全中间层
- 文件路径租户隔离
- 业主绑定标准化

## 通过标准

- 8 个验收场景全部通过
- 老账号功能不受影响
- 新老板注册只新增测试租户相关数据
- 没有批量修改历史集合

## 不通过处理

- 停止继续部署
- 不合并 `master`
- 按 `PHASE1_ROLLBACK.md` 执行回滚
