# V2 Deal Loop Phase 5B-2D Safe Error Convergence

## 1. 当前阶段

Phase 5B-2D：证据摘要函数安全返回收敛。

本阶段只收敛 `getV2EvidenceSummary` 的安全错误返回策略，不接前端，不部署云函数，不上传体验版，不进入 Phase 5B-3。

## 2. 当前 HEAD / tag

阶段起点 commit：

```text
16612ff6e6d85be6ddf48b1966550daaa8de7311
```

阶段起点 tag：

```text
v2-deal-loop-phase5b2c-error-contract
```

当前分支：

```text
codex/init-ai-collaboration
```

## 3. 本阶段目标

基于 Phase 5B-2C 的错误码与租户安全契约，对云函数 `getV2EvidenceSummary` 做最小收敛：

1. 无 `tenantId` 用户不再使用默认租户读取真实证据摘要。
2. 跨租户、客户不存在、项目不存在、客户项目不匹配统一对外收敛为 `NOT_FOUND`。
3. 未公开授权统一对外收敛为 `NO_MARKETING_AUTHORIZATION`。
4. 最终对外错误码只保留安全集合。
5. 不改前端，不写数据库，不部署。

## 4. 修改文件列表

```text
cloudfunctions/getV2EvidenceSummary/index.js
AI_TASKS/V2_DEAL_LOOP_PHASE5B2D_SAFE_ERROR_CONVERGENCE.md
```

未修改：

```text
miniprogram/
cloudfunctions/ 其它目录
miniprogram/app.json
project.config.json
project.private.config.json
工作台入口
tabBar
```

## 5. 无 tenantId 策略

修改前：

1. 当前用户如果没有 `tenantId`，会回填 `tenant_shengjing_default`。
2. 主流程也会用默认租户兜底。

修改后：

1. `getCurrentUser()` 不再为用户补默认 `tenantId`。
2. `assertUser()` 增加 `tenantId` 检查。
3. 用户存在但没有 `tenantId` 时，返回：

```js
{
  ok: false,
  code: 'FORBIDDEN'
}
```

用户文案语义：

```text
当前账号未绑定门店，无法查看证据摘要
```

结论：

无 `tenantId` 用户不再能读取真实证据摘要。

## 6. TENANT_MISMATCH 收敛策略

修改前：

1. 客户存在但不属于当前租户时，可能返回 `TENANT_MISMATCH`。
2. 项目存在但不属于当前租户时，可能返回 `TENANT_MISMATCH`。
3. 该错误码可能暴露“这个 ID 存在但不属于你”。

修改后：

1. 跨租户客户仍在内部记录为 `TENANT_MISMATCH` 原因。
2. 跨租户项目仍在内部记录为 `TENANT_MISMATCH` 原因。
3. 对外统一返回：

```js
code: 'NOT_FOUND'
```

返回文案语义：

```text
未找到可用工地证据，请返回客户列表重新打开
```

注意：

内部原因只保存在运行时错误对象的 `internalReason`，不进入返回结构。

## 7. NOT_FOUND 收敛策略

以下内部原因统一对外收敛为 `NOT_FOUND`：

```text
INVALID_PARAM
CUSTOMER_NOT_FOUND
PROJECT_NOT_FOUND
CUSTOMER_PROJECT_MISMATCH
TENANT_MISMATCH
```

说明：

1. 缺少 `customerId` 不再返回独立 `INVALID_PARAM`。
2. 客户不存在、项目不存在、客户项目不匹配不再向前端暴露细节。
3. 跨租户不再向前端暴露 `TENANT_MISMATCH`。
4. 前端只需要展示“未找到可用工地证据”。

## 8. NO_MARKETING_AUTHORIZATION 策略

修改前：

1. 无授权时 `blockedReasons` 可能包含 `NO_AUTHORIZATION`。
2. 非公开授权时 `blockedReasons` 可能包含 `AUTHORIZATION_NOT_PUBLIC`。
3. 成功响应仍可能返回 `code: 'OK'`。

修改后：

1. 无公开营销授权时，`authorizationSummary.blockedReasons` 统一使用：

```text
NO_MARKETING_AUTHORIZATION
```

2. 如果内部摘要可读但不可公开营销，对外返回：

```js
{
  ok: true,
  code: 'NO_MARKETING_AUTHORIZATION'
}
```

3. `recommendedUse.publicCaseAssets` 仍为空。
4. `NO_MARKETING_AUTHORIZATION` 不代表内部摘要不能看，只代表不能公开营销使用。

前端语义：

```text
可内部参考，暂不可公开发布
```

## 9. 对外错误码表

最终对外返回码收敛为：

```text
OK
UNAUTHENTICATED
FORBIDDEN
NOT_FOUND
NO_EVIDENCE
NO_MARKETING_AUTHORIZATION
READ_FAILED
```

不再对前端返回：

```text
TENANT_MISMATCH
CUSTOMER_NOT_FOUND
PROJECT_NOT_FOUND
CUSTOMER_PROJECT_MISMATCH
NO_TENANT
NO_AUTHORIZATION
AUTHORIZATION_NOT_PUBLIC
INVALID_PARAM
NO_PROJECT
```

推荐前端文案：

| code | 文案 |
| --- | --- |
| `UNAUTHENTICATED` | 请先登录后再查看证据摘要 |
| `FORBIDDEN` | 当前账号暂无查看证据摘要权限 |
| `NOT_FOUND` | 未找到可用工地证据，请返回客户列表重新打开 |
| `NO_EVIDENCE` | 暂无可用证据摘要，可继续使用 mock 素材 |
| `NO_MARKETING_AUTHORIZATION` | 可内部参考，暂不可公开发布 |
| `READ_FAILED` | 证据摘要读取失败，请稍后重试 |

## 10. 返回结构安全检查

本阶段没有新增任何高风险返回字段。

仍不返回：

1. 手机号。
2. openid。
3. unionid。
4. 身份证。
5. 详细地址。
6. 内部备注。
7. `fileID`。
8. `cloudPath`。
9. 图片 URL。
10. 缩略图 URL。
11. 日报正文。
12. 审核意见。
13. 员工姓名。
14. 工长姓名。

返回仍限定为：

1. 数量统计。
2. 阶段覆盖。
3. 授权布尔值。
4. 平台/素材枚举。
5. 阻断原因。
6. `privacyGuard`。

## 11. 写入检查

已静态检查，`getV2EvidenceSummary` 仍然只读。

未出现：

```text
.add(
.update(
.set(
.remove(
doc(...).update
doc(...).set
doc(...).remove
createProject
aiGenerateOwnerSummary
wx.request
getTempFileURL
download
```

## 12. 测试结果

已执行：

```bash
node --check cloudfunctions/getV2EvidenceSummary/index.js
git diff --check
```

结果：

```text
通过
```

静态检查结果：

1. 不再对外返回 `TENANT_MISMATCH`。
2. 无 `tenantId` 不再使用默认租户读取证据摘要。
3. `CUSTOMER_NOT_FOUND / PROJECT_NOT_FOUND / CUSTOMER_PROJECT_MISMATCH` 对外统一为 `NOT_FOUND`。
4. 授权不足统一为 `NO_MARKETING_AUTHORIZATION`。
5. 未新增写库逻辑。
6. 未修改前端。
7. `ENABLE_V2_DEAL_LOOP_ENTRY = false`。

## 13. 风险点

1. 旧前端如果曾依赖 `INVALID_PARAM / CUSTOMER_NOT_FOUND / PROJECT_NOT_FOUND`，需要在 Phase 5B-3 按新错误码适配；当前尚未接前端。
2. `NO_MARKETING_AUTHORIZATION` 可与 `ok: true` 同时出现，前端必须理解它是“不可公开营销”，不是系统错误。
3. 内部原因仍在运行时错误对象中保留，但不进入返回结构；如果未来增加日志，必须继续避免敏感字段。
4. 无 `tenantId` 用户现在会被拒绝读取真实证据摘要，可能影响历史管理员账号，需要人工确认账号数据。

## 14. 是否建议进入 Phase 5B-3

不建议立即进入。

建议先人工验收 Phase 5B-2D 的错误码收敛结果，确认：

1. 前端是否接受统一 `NOT_FOUND`。
2. 前端是否接受 `NO_MARKETING_AUTHORIZATION` 作为非系统错误状态。
3. 是否需要先补一轮云函数本地 mock 调用测试。

验收通过后，再考虑 Phase 5B-3 前端只读接入。
