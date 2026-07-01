# V2 Deal Loop Phase 5B-2C Error Contract

## 1. 当前阶段

Phase 5B-2C：错误码与租户安全契约确认。

本阶段只确认 `getV2EvidenceSummary` 的错误码、安全返回策略和租户隔离契约，不修改业务代码，不修改云函数，不接前端，不部署，不上传体验版，不进入 Phase 5B-3。

## 2. 当前 HEAD / tag

当前安全检查点：

```text
961ce6f48b727526b248490ca6ec8ad4d5e03ab2
```

当前 tag：

```text
v2-deal-loop-phase5b2t-function-test
```

当前分支：

```text
codex/init-ai-collaboration
```

## 3. 契约确认目标

本阶段确认以下安全契约：

1. 无 `tenantId` 用户如何处理。
2. 跨租户 ID 是否向前端暴露。
3. 客户与项目不匹配时是否暴露细节。
4. Phase 5B-3 前端应展示哪些统一错误码。
5. `NO_AUTHORIZATION` 如何避免被误读成可公开营销。
6. 是否建议进入 Phase 5B-3。

## 4. NO_TENANT 策略

### 当前实现是否存在默认租户兜底

存在。

`getV2EvidenceSummary` 当前实现中：

```js
const DEFAULT_TENANT_ID = 'tenant_shengjing_default'
```

当前用户查询后，如果用户存在但没有 `tenantId`：

```js
if (user && !user.tenantId) {
  user.tenantId = DEFAULT_TENANT_ID
  user.tenantName = DEFAULT_TENANT_NAME
}
```

后续主流程又使用：

```js
const tenantId = user.tenantId || DEFAULT_TENANT_ID
```

### 默认租户兜底来源

该写法来源于项目既有云函数模式。

例如 `getCustomer / listCustomers / getBossDashboard` 等函数均存在类似 `DEFAULT_TENANT_ID` 兜底，用于兼容早期没有 `tenantId` 的历史用户和默认门店数据。

### 是否有跨租户风险

严格意义上，当前实现不会读取前端传入的 `tenantId`，也不会跨任意租户查询。

但存在一个安全边界风险：

1. 如果某个内部用户账号没有 `tenantId`。
2. 且该用户角色为 `admin / boss_qi / boss_hu`。
3. 当前函数会把该用户归到 `tenant_shengjing_default`。
4. 该用户可能读取默认租户下的真实证据摘要。

因此，这不是传统意义上的“跨租户任意读取”，但属于“无租户用户被默认授权到默认租户”的风险。

### 是否建议后续改为独立 NO_TENANT / UNAUTHENTICATED / FORBIDDEN

建议后续调整，不建议长期依赖默认租户兜底。

推荐策略：

1. 对 `getV2EvidenceSummary` 这类真实证据摘要接口，用户没有 `tenantId` 时不应继续读取真实证据。
2. 如果用户不存在，返回 `UNAUTHENTICATED`。
3. 如果用户存在但没有 `tenantId`，推荐返回 `FORBIDDEN` 或新增内部错误原因 `NO_TENANT`。
4. 如果新增 `NO_TENANT`，不建议直接暴露给普通前端用户，应映射为“当前账号未绑定门店，无法查看证据摘要”。

推荐后续契约：

```text
internalReason: NO_TENANT
frontendCode: FORBIDDEN
```

### Phase 5B-3 前端是否需要识别该状态

Phase 5B-3 前端不应依赖当前默认租户兜底。

如果后端仍保持当前实现，前端只能处理 `FORBIDDEN / UNAUTHENTICATED / READ_FAILED` 等现有返回码。

如果 Phase 5B-3 前决定修正后端契约，则前端需要识别：

```text
NO_TENANT -> 当前账号未绑定门店，无法查看证据摘要
```

但该调整应在新的后端契约变更阶段完成，不能在 Phase 5B-3 前端接入时偷偷改逻辑。

## 5. TENANT_MISMATCH 策略

### 当前是否会返回 TENANT_MISMATCH

会。

当前实现中：

1. 客户存在但 `customer.tenantId !== tenantId` 时，返回 `TENANT_MISMATCH`。
2. 项目存在但 `project.tenantId !== tenantId` 时，返回 `TENANT_MISMATCH`。

### 是否会暴露“这个 ID 存在但不属于你”

会存在这种信息差。

因为：

1. 不存在的客户返回 `CUSTOMER_NOT_FOUND`。
2. 存在但跨租户的客户返回 `TENANT_MISMATCH`。
3. 不存在的项目返回 `PROJECT_NOT_FOUND`。
4. 存在但跨租户的项目返回 `TENANT_MISMATCH`。

因此，允许调用该云函数的账号可以通过错误码区分“ID 不存在”和“ID 存在但不属于当前租户”。

### 是否存在 ID 探测风险

存在有限 ID 探测风险。

风险边界：

1. 第一版仅允许 `admin / boss_qi / boss_hu` 调用。
2. 普通员工、业主、工长不可调用。
3. 不返回其它租户客户名称、项目名称或证据数量。
4. 但错误码本身仍可能泄露 ID 存在性。

### 是否建议对前端统一返回 NOT_FOUND

建议。

Phase 5B-3 前端接入时，不应直接展示 `TENANT_MISMATCH`。

推荐展示映射：

```text
CUSTOMER_NOT_FOUND -> NOT_FOUND
PROJECT_NOT_FOUND -> NOT_FOUND
TENANT_MISMATCH -> NOT_FOUND
```

推荐用户文案：

```text
未找到可用工地证据，请返回客户列表重新打开。
```

### 内部日志是否可以保留真实原因

可以，但应限制范围。

推荐：

1. 内部调试文档或后端日志可保留真实原因。
2. 前端用户界面不展示 `TENANT_MISMATCH`。
3. 错误埋点如果后续增加，也不要记录客户姓名、项目名称、手机号、地址或证据详情。

当前函数未写内部日志，本阶段也不新增日志。

### Phase 5B-3 前端是否不应该展示 TENANT_MISMATCH 文案

不应该展示。

Phase 5B-3 前端应把 `TENANT_MISMATCH` 统一映射为 `NOT_FOUND` 类状态，不显示“客户或证据不属于当前门店”。

## 6. CUSTOMER_PROJECT_MISMATCH 策略

### 当前是否映射为 PROJECT_NOT_FOUND

是。

当前实现中，如果传入 `projectId` 的项目存在且同租户，但 `project.customerId !== customerId`，返回：

```text
PROJECT_NOT_FOUND
```

### 是否符合安全伪装

符合。

该策略不会向前端暴露：

1. 项目是否属于其它客户。
2. 项目真实归属。
3. 客户和项目之间的关系细节。

### 是否会误导前端

可能会，但这是安全上可接受的“有意模糊”。

前端不应该展示：

```text
客户与工地不匹配
```

推荐统一展示：

```text
未找到可用工地证据，请返回客户列表重新打开。
```

### 是否需要暴露“不匹配”给用户

不需要。

原因：

1. 普通用户不需要知道 ID 关系细节。
2. 暴露“不匹配”会增加 ID 探测信息。
3. Phase 5B-3 只做前端消费摘要，不做排障工具。

### 是否影响后续排查

会增加排查成本，但可以通过内部调试手段解决。

推荐后续如果增加日志：

```text
frontendCode: NOT_FOUND
internalReason: CUSTOMER_PROJECT_MISMATCH
```

但日志不得包含敏感字段。

## 7. 推荐统一错误码表

### 前端可见错误码

Phase 5B-3 推荐只让前端处理以下统一错误码：

```text
UNAUTHENTICATED
FORBIDDEN
NOT_FOUND
NO_EVIDENCE
READ_FAILED
NO_MARKETING_AUTHORIZATION
```

### 错误码映射表

| 当前后端码 / 内部原因 | 推荐前端码 | 是否展示给用户 | 推荐用户文案 |
| --- | --- | --- | --- |
| `UNAUTHENTICATED` | `UNAUTHENTICATED` | 是 | 请先登录后再查看证据摘要 |
| 用户存在但无 `tenantId` | `FORBIDDEN` | 是 | 当前账号未绑定门店，无法查看证据摘要 |
| `FORBIDDEN` | `FORBIDDEN` | 是 | 当前账号暂无查看证据摘要权限 |
| `CUSTOMER_NOT_FOUND` | `NOT_FOUND` | 是 | 未找到可用工地证据，请返回客户列表重新打开 |
| `PROJECT_NOT_FOUND` | `NOT_FOUND` | 是 | 未找到可用工地证据，请返回客户列表重新打开 |
| `TENANT_MISMATCH` | `NOT_FOUND` | 否，需伪装 | 未找到可用工地证据，请返回客户列表重新打开 |
| `CUSTOMER_PROJECT_MISMATCH` | `NOT_FOUND` | 否，需伪装 | 未找到可用工地证据，请返回客户列表重新打开 |
| `NO_PROJECT` | `NO_EVIDENCE` | 是 | 该客户暂无可用工地证据 |
| `NO_EVIDENCE` | `NO_EVIDENCE` | 是 | 暂无可用证据摘要，可继续使用 mock 素材 |
| `NO_AUTHORIZATION` | `NO_MARKETING_AUTHORIZATION` | 是，但不能当错误 | 可内部参考，暂不可公开发布 |
| `AUTHORIZATION_NOT_PUBLIC` | `NO_MARKETING_AUTHORIZATION` | 是，但不能当错误 | 可内部参考，暂不可公开发布 |
| `READ_FAILED` | `READ_FAILED` | 是 | 证据摘要读取失败，请稍后重试 |

### 内部调试原因

允许内部调试保留：

```text
NO_TENANT
TENANT_MISMATCH
CUSTOMER_PROJECT_MISMATCH
AUTHORIZATION_NOT_PUBLIC
RAW_READ_FAILED
```

限制：

1. 不进入普通前端文案。
2. 不拼接手机号、openid、地址、客户姓名、项目名称。
3. 不记录原始照片、图纸、日报正文。

## 8. 前端展示文案建议

Phase 5B-3 推荐前端文案：

| 场景 | 推荐文案 |
| --- | --- |
| 未登录 | 请先登录后再查看证据摘要 |
| 无权限 | 当前账号暂无查看证据摘要权限 |
| 无门店绑定 | 当前账号未绑定门店，无法查看证据摘要 |
| 客户/项目不可用 | 未找到可用工地证据，请返回客户列表重新打开 |
| 无项目/无证据 | 暂无可用证据摘要，可继续使用 mock 素材 |
| 无公开授权 | 可内部参考，暂不可公开发布 |
| 读取失败 | 证据摘要读取失败，请稍后重试 |

禁止前端文案：

1. `该 ID 存在但不属于你`。
2. `客户属于其它门店`。
3. `项目属于其它客户`。
4. `该客户有照片但未授权`。
5. `发现其它租户证据`。

## 9. Phase 5B-3 前端接入要求

Phase 5B-3 如果接前端，必须遵守：

1. 不展示 `TENANT_MISMATCH`。
2. 不展示真实 ID 探测信息。
3. 不展示客户/项目不匹配细节。
4. 没有授权时，只展示“可内部参考，不可公开发布”。
5. `NO_EVIDENCE` 不等于系统错误，只表示暂无可用证据摘要。
6. `READ_FAILED` 才是系统错误。
7. 不因错误态 fallback 到其它客户。
8. 不因无证据 fallback 到其它客户。
9. 不展示手机号、openid、图片 URL、日报正文、施工图、内部备注。
10. 不把内部证据摘要包装成公开案例。
11. 不出现“小红书/抖音/官网/GEO 可直接使用”的提示，除非 `canUseForMarketing = true`。
12. 前端只消费 `getV2EvidenceSummary` 的 summary，不直连 V1 原始集合。

推荐前端状态：

```text
真实证据摘要
暂无真实证据
Mock fallback
真实证据读取失败
仅内部参考，不可公开发布
```

## 10. 风险点

1. 当前后端仍存在默认租户兜底，不适合作为长期真实证据接口策略。
2. 当前后端返回 `TENANT_MISMATCH`，对调用者存在有限 ID 探测风险。
3. Phase 5B-3 如果直接展示后端原始错误码，会暴露过多内部状态。
4. `NO_AUTHORIZATION` 如果被误解，可能导致未授权案例被包装成公开营销素材。
5. 如果前端错误态 fallback 到其它客户，会重现早期“客户串人”风险。
6. 如果前端绕过摘要接口直连 V1 集合，会破坏 Phase 5A/5B 的隐私边界。

## 11. 是否建议进入 Phase 5B-3

不建议立即进入 Phase 5B-3。

建议先人工确认：

1. 是否接受 Phase 5B-3 前端采用统一错误码映射。
2. 是否在进入前端接入前，先把后端 `TENANT_MISMATCH` 对外伪装为 `NOT_FOUND`。
3. 是否在进入前端接入前，先把无 `tenantId` 用户改为 `FORBIDDEN / NO_TENANT`。
4. 是否保留 `NO_AUTHORIZATION` 作为非错误阻断状态。

建议下一步：

先确认错误码和租户安全契约，再决定是否进入 Phase 5B-3 前端只读接入。
