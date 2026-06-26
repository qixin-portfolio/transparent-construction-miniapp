# SaaS Phase 2 验收结果

## 基本信息

| 项目 | 内容 |
|------|------|
| 验收时间 | 2026-06-26 |
| 当前分支 | `saas-phase2-plan-limit` |
| 最新 commit | `c817501 docs: add SaaS phase2 deploy and acceptance docs` |
| 工作区 | clean |

## 已部署云函数

| 云函数 | 状态 |
|--------|------|
| `listPendingStageLogs` | 已部署 |
| `createProject` | 已部署 |
| `createStaffInviteCode` | 已部署 |
| `bindStaffRole` | 已部署 |

## 已上传版本

- 小程序体验版：已上传

## 验收结论

**Phase 2 体验版测试通过。**

## 验收场景结果

| 序号 | 场景 | 结果 |
|------|------|------|
| 1 | 晟景老账号创建项目 — 套餐额度足够时正常创建 | 通过 |
| 2 | 免费租户创建第 1-3 个项目 | 通过 |
| 3 | 免费租户创建第 4 个项目 — 返回 `PLAN_PROJECT_LIMIT_REACHED` | 通过 |
| 4 | 免费租户添加第 1-3 个员工 | 通过 |
| 5 | 免费租户添加第 4 个员工 — 返回 `PLAN_STAFF_LIMIT_REACHED` | 通过 |
| 6 | 旧员工邀请码绕过测试 — `bindStaffRole` 二次拦截 | 通过 |
| 7 | 待审核日报列表 — 正常显示项目名称 | 通过 |
| 8 | 跨租户隔离 — A 租户看不到 B 租户项目名 | 通过 |

## 安全执行记录

| 项目 | 状态 |
|------|------|
| 是否执行 `initSaasDefaults` | 否 |
| 是否执行数据库迁移脚本 | 否 |
| 是否批量回填 tenantId | 否 |
| 是否批量删除数据 | 否 |
| 是否发布正式版 | 否 |
| 是否合并 master | 否 |

## 后续注意事项

- Phase 3 前继续保持租户隔离优先原则
- 文件上传路径尚未增加 `tenantId` 前缀（Phase 3 范围）
- `owner_bindings` 标准化尚未实施（Phase 3 范围）
- 套餐页面、支付、超级后台尚未开发
- 套餐限制当前默认免费版额度为 3 个项目 / 3 名员工
