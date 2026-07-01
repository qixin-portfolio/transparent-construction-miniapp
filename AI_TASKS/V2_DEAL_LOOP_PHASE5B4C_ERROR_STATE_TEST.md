# V2 Deal Loop Phase 5B-4C：证据摘要错误态补测记录

## 当前阶段

Phase 5B-4C：证据摘要错误态补测。

本阶段只记录 `getV2EvidenceSummary` 在 `trust-materials` 前端的错误态展示与待补测项，不修改业务代码，不部署云函数，不上传体验版，不打开工作台入口，不进入 Phase 5B-5。

## 当前 HEAD / tag

- 当前 HEAD：`9eb23db0dbec8c3dafdcc1e50ea6126a37ee80ca`
- 当前 tag：`v2-deal-loop-phase5b4b-function-deploy-test`

## 测试目标

1. 验证缺失 `customerId` 时不读取真实证据摘要，不串到其它客户。
2. 验证真实 `customerId` 有证据但无公开授权时，页面展示真实证据摘要并提示暂不可公开发布。
3. 验证 `NO_EVIDENCE / NOT_FOUND / FORBIDDEN / UNAUTHENTICATED / READ_FAILED` 等错误态的前端展示口径。
4. 复查所有状态下不展示敏感字段和原始素材。

## 缺失 customerId 测试结果

已由上一轮人工验收覆盖。

测试方式：

```text
subpackages/deal-loop/pages/trust-materials/trust-materials
```

不传 `customerId`。

结果：

- 页面进入 `Mock fallback`。
- 明确显示未提供客户 ID。
- 不冒充真实证据摘要。
- 不串到其它真实客户。
- mock 推荐素材继续作为示例素材展示。

结论：通过。

## 有证据无授权测试结果

已由 Phase 5B-4B 人工部署与直达测试覆盖。

测试客户：齐鑫。

测试方式：

从 V2 客户链路进入 `trust-materials`，携带真实 `customerId`。

真实证据摘要读取成功，页面显示：

- 项目数量：1 个
- 已审核可见日报：1 条
- 可见照片：1 张
- 效果图：0 张
- 质保卡：0 张
- 证据等级：中
- 阶段覆盖：开工交底
- 可用证据类型：已审核日报、可见照片
- 公开使用状态：暂不可以公开发布

结论：

- 真实证据摘要可读取。
- 无公开营销授权时，显示暂不可公开发布。
- 未提示可直接用于小红书、抖音、官网、GEO。
- mock 推荐素材仍标明为示例推荐素材。

结论：通过。

## 无证据测试结果

暂未具备可测数据。

当前没有确认可用于测试的“有效 `customerId` + 无可用证据”客户，因此未做真实页面验证。

预期行为仍为：

- 显示 `NO_EVIDENCE` 或“暂无可用证据摘要”。
- 可继续展示示例推荐素材。
- 必须标明示例素材。
- 不 fallback 到默认客户。

结论：未覆盖，建议后续补测。

## 无效 customerId / NOT_FOUND 测试结果

本轮未完成实际开发者工具页面补测。

原因：当前没有可操作的微信开发者工具测试会话来安全执行“明显不存在 customerId”的直达验证。

代码侧展示口径已静态确认：

- `NOT_FOUND` 映射文案：`未找到可用工地证据，请返回客户列表重新打开。`
- 前端 adapter 未展示 `TENANT_MISMATCH / CUSTOMER_NOT_FOUND / PROJECT_NOT_FOUND / CUSTOMER_PROJECT_MISMATCH / NO_TENANT / NO_AUTHORIZATION / AUTHORIZATION_NOT_PUBLIC` 等内部码。

预期行为仍为：

- 显示 `NOT_FOUND` 或“未找到可用工地证据”。
- 不 fallback 到默认 mock 客户。
- 不泄露 ID 是否存在或是否属于其它租户。

结论：未覆盖，建议后续人工补测。

## FORBIDDEN 测试结果

暂未具备测试条件。

当前没有可用于本轮测试的非 boss/admin 测试账号。

代码侧展示口径已静态确认：

- `FORBIDDEN` 映射文案：`当前账号暂无查看证据摘要权限。`

预期行为仍为：

- 不展示证据摘要。
- 不展示内部错误码。
- 不 fallback 到其它客户。

结论：未覆盖，建议后续准备非 boss/admin 测试账号后补测。

## UNAUTHENTICATED 测试结果

暂未具备测试条件。

本轮未安全模拟未登录状态。

代码侧展示口径已静态确认：

- `UNAUTHENTICATED` 映射文案：`请先登录后再查看证据摘要。`

预期行为仍为：

- 不展示证据摘要。
- 不展示内部错误码。
- 不 fallback 到其它客户。

结论：未覆盖，建议后续在可控登录态下补测。

## READ_FAILED 测试结果

暂未具备测试条件。

本轮未安全模拟断网或开发者工具网络异常。

代码侧展示口径已静态确认：

- `READ_FAILED` 映射文案：`证据摘要读取失败，请稍后重试。`
- `trust-materials` 的 `catch` 分支会构造 `READ_FAILED` 视图。
- 读取失败时数据源仍显示真实客户字段 + Mock 推荐素材，不冒充真实证据。

预期行为仍为：

- 显示读取失败提示。
- 不冒充真实证据。
- 不 fallback 到默认客户。

结论：未覆盖，建议后续在安全网络异常条件下补测。

## 隐私字段复查

已结合 Phase 5B-4B 人工页面检查和本轮静态检查确认，页面不展示以下敏感字段：

- 手机号
- `openid`
- `unionid`
- 身份证
- 详细地址
- 内部备注
- `fileID`
- `cloudPath`
- `tempFileURL`
- 图片 URL
- 缩略图 URL
- 日报正文
- 审核意见
- 员工姓名
- 工长姓名

当前页面只展示摘要统计、阶段覆盖、证据类型、授权/公开状态和安全提示。

## 入口开关确认

`ENABLE_V2_DEAL_LOOP_ENTRY = false`

本阶段未打开工作台入口。

## 发布状态确认

- `getV2EvidenceSummary` 已在 Phase 5B-4B 由人工部署。
- 本阶段未重新部署云函数。
- 未上传体验版。
- 未发布正式版。
- 未进入 Phase 5B-5。

## 未覆盖测试项

1. 有效 `customerId` + 无可用证据：缺少确认可用测试客户。
2. 无效 `customerId` / `NOT_FOUND`：本轮未执行开发者工具直达补测。
3. `FORBIDDEN`：缺少非 boss/admin 测试账号。
4. `UNAUTHENTICATED`：未安全模拟未登录状态。
5. `READ_FAILED`：未安全模拟网络异常或云函数读取异常。

## 风险点

1. 错误态未完整人工覆盖前，不建议打开工作台入口。
2. `NO_EVIDENCE` 和 `READ_FAILED` 容易被误解为真实素材缺失或系统异常，需要前端文案继续区分。
3. `NO_MARKETING_AUTHORIZATION` 不能被当作系统错误，也不能提示公开营销可用。
4. 后续如进入 Phase 5B-5，需要先确认是否补齐错误态测试。

## 是否建议进入 Phase 5B-5

不建议直接进入 Phase 5B-5。

建议先补齐以下至少三项人工验证：

1. 无效 `customerId` 的 `NOT_FOUND` 页面表现。
2. 有效 `customerId` 但无可用证据的 `NO_EVIDENCE` 页面表现。
3. `READ_FAILED` 不冒充真实证据、不 fallback 到默认客户的页面表现。
