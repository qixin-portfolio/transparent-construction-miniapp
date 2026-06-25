# SaaS Phase 1 部署前检查清单

## 1. Git 检查

- 当前分支：`saas-phase1-register`
- 当前最新 commit：`1458029 backup before saas phase1 register`
- `SAAS_AUDIT.md` 提交状态：待确认提交
- 是否有未提交文件：是
- 是否存在备份提交：是，`1458029 backup before saas phase1 register`

部署前必须重新执行：

```bash
git status
git branch --show-current
git log --oneline -5
```

要求：

- 分支必须是 `saas-phase1-register`
- 工作区必须干净，或只保留明确允许的待部署改动
- 不允许合并到 `master`

## 2. 数据库备份检查

部署前必须手动在微信云开发控制台导出以下集合。

数据库未完成导出前，不允许部署云函数，不允许上传体验版，不允许执行初始化脚本。

### users

- 集合名：`users`
- 导出时间：
- 导出文件名：
- 是否已下载到本地：
- 备注：

### tenants

- 集合名：`tenants`
- 导出时间：
- 导出文件名：
- 是否已下载到本地：
- 备注：

### tenant_users

- 集合名：`tenant_users`
- 导出时间：
- 导出文件名：
- 是否已下载到本地：
- 备注：

### subscriptions

- 集合名：`subscriptions`
- 导出时间：
- 导出文件名：
- 是否已下载到本地：
- 备注：

### tenant_branding

- 集合名：`tenant_branding`
- 导出时间：
- 导出文件名：
- 是否已下载到本地：
- 备注：

### projects

- 集合名：`projects`
- 导出时间：
- 导出文件名：
- 是否已下载到本地：
- 备注：

### customers

- 集合名：`customers`
- 导出时间：
- 导出文件名：
- 是否已下载到本地：
- 备注：

### owner_bindings

- 集合名：`owner_bindings`
- 导出时间：
- 导出文件名：
- 是否已下载到本地：
- 备注：

### stage_logs

- 集合名：`stage_logs`
- 导出时间：
- 导出文件名：
- 是否已下载到本地：
- 备注：

### photos

- 集合名：`photos`
- 导出时间：
- 导出文件名：
- 是否已下载到本地：
- 备注：

### staff_invite_codes

- 集合名：`staff_invite_codes`
- 导出时间：
- 导出文件名：
- 是否已下载到本地：
- 备注：

### worker_project_bind_codes

- 集合名：`worker_project_bind_codes`
- 导出时间：
- 导出文件名：
- 是否已下载到本地：
- 备注：

## 3. 禁止动作

- 禁止执行 `initSaasDefaults`
- 禁止执行数据库迁移脚本
- 禁止批量回填 `tenantId`
- 禁止批量删除测试数据
- 禁止一次性部署全部云函数
- 禁止直接发布正式版
- 禁止合并到 `master`

## 4. 允许动作

完成数据库导出、Git 检查通过后，仅允许：

1. 部署 `registerTenant`
2. 部署 `login`
3. 上传小程序体验版
4. 用测试微信号做 Phase 1 验收
