# SaaS Phase 1 回滚方案

## 1. 代码回滚

回到主分支：

```bash
git checkout master
```

或回到阶段 1 前备份提交：

```bash
git checkout 1458029
```

注意：

- 不要在未确认前删除 `saas-phase1-register` 分支。
- 不要把异常代码合并进 `master`。

## 2. 云函数回滚

如果 `login` 异常：

- 重新部署阶段 1 前的 `login`
- `cloudfunctions/login/index.backup.phase1.js` 可作为对照
- 回滚后优先验证老账号登录、业主入口、员工入口

如果 `registerTenant` 异常：

- 先从前端隐藏注册入口
- 不继续调用 `registerTenant`
- 不删除已创建测试租户
- 记录测试 tenantId、openid、手机号、创建时间

## 3. 小程序回滚

- 重新上传 Phase 1 前的小程序体验版或正式版代码
- 验证老账号登录
- 验证业主项目查看
- 验证员工邀请码和工长绑定码流程

## 4. 数据处理

- 测试租户不要批量删除
- 先记录测试 tenantId、openid、手机号、创建时间
- 人工确认后再清理
- 禁止批量 `remove`
- 禁止清空集合
- 禁止重跑 `initSaasDefaults`

## 5. 回滚后检查

必须确认：

- 老板账号可进入工作台
- 员工账号可进入员工入口
- 业主账号可查看绑定项目
- 新注册入口不再影响用户
- 云数据库历史集合没有被批量改动
