# V2 Deal Loop Phase 5B-4E：NOT_FOUND / READ_FAILED 测试方法设计

## 当前阶段

Phase 5B-4E：NOT_FOUND / READ_FAILED 测试方法设计。

本阶段只设计 `trust-materials` 中 `getV2EvidenceSummary` 的关键错误态安全测试方法，不修改业务代码，不修改配置，不写数据库，不部署，不上传体验版，不打开工作台入口，不进入 Phase 5B-5。

## 当前 HEAD / tag

- 当前 HEAD：`2d57f22560f4b5affc1f6e8ad114e477909537e7`
- 当前 tag：`v2-deal-loop-phase5b4d-critical-error-test`

## 本阶段目标

1. 审计 `trust-materials` 页面路由参数和证据摘要调用顺序。
2. 审计 `evidenceSummaryAdapter` 对 `NOT_FOUND / READ_FAILED` 的展示映射。
3. 审计 `getV2EvidenceSummary` 的安全错误返回契约。
4. 设计不改代码、不改配置、不写库、不部署的 `NOT_FOUND` 测试方法。
5. 设计不破坏环境的 `READ_FAILED` 测试方法。
6. 判断 `FORBIDDEN / UNAUTHENTICATED` 是否继续后置。

## 关键实现前置判断

当前 `trust-materials` 页面加载顺序为：

```text
onLoad(options)
  -> 读取 customerId
  -> wx.cloud.callFunction({ name: 'getCustomer' })
  -> getCustomer 成功且 ID 匹配
  -> loadEvidenceSummary(customerId)
  -> wx.cloud.callFunction({ name: 'getV2EvidenceSummary' })
```

因此，直接用一个不存在的 `customerId` 打开 `trust-materials` 页面时，页面大概率先在 `getCustomer` 阶段进入“客户读取失败，已回退 mock”，不会继续调用 `getV2EvidenceSummary`，也就不一定能测到证据摘要接口的 `NOT_FOUND`。

这个前置判断决定了 `NOT_FOUND` 测试必须区分两类目标：

1. 路由级无效客户测试：验证页面不串客户、不写库、不泄露内部错误。
2. 证据摘要模块 `NOT_FOUND` 测试：验证 `getV2EvidenceSummary` 返回 `NOT_FOUND` 时，前端摘要区展示安全文案。

## NOT_FOUND 测试方案评估

### 方法 A：开发者工具控制台执行 `wx.navigateTo`

方式：

```js
wx.navigateTo({
  url: '/subpackages/deal-loop/pages/trust-materials/trust-materials?customerId=not_found_qa_20260701'
})
```

优点：

1. 不修改业务代码。
2. 不修改项目配置。
3. 不写数据库。
4. 不创建测试客户。
5. 不污染 `git status`。

限制：

1. 这只能验证“无效 `customerId` 路由进入页面”的表现。
2. 由于 `getCustomer` 是前置调用，页面可能停在客户读取失败 mock fallback，不会触发 `getV2EvidenceSummary` 的 `NOT_FOUND`。
3. Phase 5B-4D 已发现当前工具侧输入控制台命令存在标点丢失问题，建议由人工直接在开发者工具控制台粘贴执行。

结论：

- 推荐用于路由级安全测试。
- 不足以单独证明证据摘要接口 `NOT_FOUND` 前端展示已覆盖。

### 方法 A2：开发者工具控制台直接触发页面实例的 `loadEvidenceSummary`

方式：

先进入一个已成功加载客户字段的 `trust-materials` 页面，例如“齐嘉”或“齐鑫”，再在小程序逻辑层控制台执行：

```js
const page = getCurrentPages()[getCurrentPages().length - 1]
page.loadEvidenceSummary('not_found_qa_20260701')
```

预期：

1. `getV2EvidenceSummary` 收到不存在的 `customerId`。
2. 云函数返回 `NOT_FOUND`。
3. `evidenceSummaryAdapter` 将摘要区展示为：

```text
未找到可用工地证据，请返回客户列表重新打开。
```

优点：

1. 不修改业务代码。
2. 不修改配置。
3. 不写数据库。
4. 不创建测试客户。
5. 不部署。
6. 不污染 `git status`。
7. 可以直接覆盖证据摘要模块的 `NOT_FOUND` 展示。

限制：

1. 页面客户卡片仍可能显示进入页面时的真实客户字段，因此它不是完整路由级测试。
2. 测试记录必须明确：这是“证据摘要区域 NOT_FOUND 展示测试”，不是“无效客户完整页面链路测试”。

结论：

- 推荐作为 Phase 5B-4F 的最小安全 `NOT_FOUND` 实测方案。
- 测试时必须截图或记录摘要区文案，不把客户卡片误判为无效客户路由结果。

### 方法 B：通过现有页面链路构造无效 `customerId`

现有 `pipeline` 页面从 `listCustomers` 读取真实客户列表，按钮携带的是实际客户 ID。

评估：

1. 可以用于测试真实客户的 `NO_EVIDENCE`，Phase 5B-4D 已用“齐嘉”覆盖。
2. 不能自然构造不存在的 `customerId`。
3. 不建议为了构造无效 ID 修改客户、项目或页面数据。

结论：

- 不推荐用于 `NOT_FOUND`。
- 可继续用于真实客户 `NO_EVIDENCE` 回归。

### 方法 C：临时使用开发者工具编译模式，但不提交 `project.private.config.json`

方式：

在微信开发者工具中添加临时编译模式：

```text
path: subpackages/deal-loop/pages/trust-materials/trust-materials
query: customerId=not_found_qa_20260701
```

风险：

1. 开发者工具可能写入 `project.private.config.json`。
2. 会让 `git status` 变脏。
3. 如果忘记恢复，可能污染后续提交。

如果必须使用，安全步骤必须是：

```bash
git status
# 人工添加临时编译模式并测试
git status
git diff -- project.private.config.json
git restore -- project.private.config.json
git status
```

结论：

- 不作为首选。
- 仅在控制台方法不可用、且人工明确接受“测试后恢复 private config”的前提下使用。
- 本阶段不执行该方法。

### 方法 D：二维码/页面路径方式携带参数

评估：

1. 二维码、页面路径、URL Scheme、URL Link 等方式本质上仍是带 query 启动页面。
2. 对当前实现而言，仍会先进入 `getCustomer` 前置流程。
3. 二维码/预览链路可能触发上传、预览或真机相关流程，不符合“未上传体验版、最小本地实测”的约束。

结论：

- 不推荐用于本阶段或 Phase 5B-4F 的最小测试。
- 如后续真机测试需要，应单独进入发布/预览测试阶段并设置 Human Gate。

## READ_FAILED 测试方案评估

### 方法 A：断网测试

方式：

先进入一个已加载真实客户字段的 `trust-materials` 页面，再断开网络，然后手动触发：

```js
const page = getCurrentPages()[getCurrentPages().length - 1]
page.loadEvidenceSummary('<当前真实 customerId>')
```

预期：

1. `wx.cloud.callFunction({ name: 'getV2EvidenceSummary' })` reject。
2. 页面进入 `READ_FAILED` catch 分支。
3. 摘要区显示：

```text
证据摘要读取失败，请稍后重试。
```

优点：

1. 不修改代码。
2. 不修改配置。
3. 不写数据库。
4. 不部署。

风险：

1. 断网可能影响开发者工具、云开发登录态或其它调试状态。
2. 如果断网发生在客户字段加载前，会同时影响 `getCustomer`，无法单独验证证据摘要读取失败。
3. 恢复网络后需要确认开发者工具状态稳定。

结论：

- 可作为人工可控条件下的备选方案。
- 不建议由自动化脚本执行。

### 方法 B：临时关闭云开发网络能力

评估：

1. 可能涉及开发者工具设置、网络代理、云环境状态或系统网络设置。
2. 容易影响其它云函数调试。
3. 恢复成本高于测试收益。

结论：

- 不推荐。
- 不应在 Phase 5B-4F 最小实测中使用。

### 方法 C：调用不存在云函数名

直接改代码把 `getV2EvidenceSummary` 改成不存在的云函数名可以触发 `READ_FAILED`，但这会修改业务代码，不符合约束。

可替代的无文件修改方法：

在已加载页面的小程序逻辑层控制台临时 monkey patch `wx.cloud.callFunction`，只让 `getV2EvidenceSummary` 这一类调用 reject，然后立即恢复：

```js
const page = getCurrentPages()[getCurrentPages().length - 1]
const originalCallFunction = wx.cloud.callFunction
wx.cloud.callFunction = function (options) {
  if (options && options.name === 'getV2EvidenceSummary') {
    return Promise.reject(new Error('QA_READ_FAILED'))
  }
  return originalCallFunction.call(wx.cloud, options)
}
page.loadEvidenceSummary(page.data.customerId)
wx.cloud.callFunction = originalCallFunction
```

优点：

1. 不修改业务文件。
2. 不修改配置。
3. 不写数据库。
4. 不部署。
5. 不依赖断网。
6. 可单独验证前端 `READ_FAILED` catch 分支。

限制：

1. 这是前端错误展示模拟，不是云环境真实故障演练。
2. 必须确保执行后恢复 `wx.cloud.callFunction`。
3. 建议只由人工在开发者工具控制台执行，不写入项目文件。

结论：

- 推荐作为 Phase 5B-4F 的最小安全 `READ_FAILED` 前端展示测试方案。
- 测试记录必须说明这是本地运行时模拟，不是线上云函数故障。

### 方法 D：暂缓到后续专门测试环境

评估：

1. 如果控制台不可用，或者人工不希望 monkey patch 运行时对象，则应暂缓。
2. 专门测试环境可以通过测试云函数版本、测试账号、测试数据和网络条件系统覆盖错误态。

结论：

- 可接受。
- 比修改业务代码或污染配置更安全。

## FORBIDDEN / UNAUTHENTICATED 后置判断

`FORBIDDEN / UNAUTHENTICATED` 依赖账号角色、登录态和当前云环境用户状态。

本阶段不建议强行测试，原因：

1. `FORBIDDEN` 需要非 `admin / boss_qi / boss_hu` 测试账号。
2. `UNAUTHENTICATED` 需要安全模拟未登录状态。
3. 强行切账号或清登录态可能影响当前开发者工具云环境。
4. 当前阶段目标只覆盖 `NOT_FOUND / READ_FAILED` 测试方法设计。

结论：

- 继续后置。
- 后续应单独准备测试账号和登录态测试计划。

## 推荐测试路线

Phase 5B-4F 最小安全路线建议：

1. 开始前执行：

```bash
git status
git diff --check
```

2. 确认：

```text
ENABLE_V2_DEAL_LOOP_ENTRY = false
```

3. 先从现有页面链路进入一个真实客户的 `trust-materials` 页面，优先使用已验证的“齐嘉”或“齐鑫”。
4. `NOT_FOUND` 优先使用控制台直接触发证据摘要模块：

```js
const page = getCurrentPages()[getCurrentPages().length - 1]
page.loadEvidenceSummary('not_found_qa_20260701')
```

5. 记录摘要区是否显示：

```text
未找到可用工地证据，请返回客户列表重新打开。
```

6. `READ_FAILED` 优先使用控制台临时 monkey patch，只让 `getV2EvidenceSummary` reject，并在执行后恢复原函数。
7. 记录摘要区是否显示：

```text
证据摘要读取失败，请稍后重试。
```

8. 测试后执行：

```bash
git status
git diff --check
```

9. 验收标准：

```text
工作区仍 clean
未修改 miniprogram/
未修改 cloudfunctions/
未修改 project.config.json
未修改 project.private.config.json
未部署
未上传体验版
ENABLE_V2_DEAL_LOOP_ENTRY = false
```

## 不推荐方案

1. 不推荐修改 `trust-materials.js` 临时改云函数名。
2. 不推荐修改 `evidenceSummaryAdapter.js` 强造错误态。
3. 不推荐修改 `cloudfunctions/getV2EvidenceSummary/index.js` 制造异常。
4. 不推荐创建测试客户或修改真实客户/项目/日报数据。
5. 不推荐新增或提交开发者工具编译模式。
6. 不推荐二维码/预览/URL Link 测试，因为可能进入预览或上传链路。
7. 不推荐关闭云环境或修改系统网络配置来强测。
8. 不推荐切换真实账号测试 `FORBIDDEN / UNAUTHENTICATED`，除非已有专用测试账号。

## 风险点

1. 直接用不存在 `customerId` 打开页面，可能只测到 `getCustomer` fallback，测不到 `getV2EvidenceSummary` 的 `NOT_FOUND`。
2. 控制台运行时 monkey patch 必须恢复，否则会影响当前开发者工具会话。
3. 临时编译模式容易污染 `project.private.config.json`。
4. 断网测试可能影响开发者工具云环境登录态。
5. 错误态测试不得触发任何写库、部署、上传体验版或真实客户数据修改。
6. `NOT_FOUND` 测试记录必须区分“路由级无效客户”和“证据摘要模块错误展示”。

## 是否建议进入 Phase 5B-4F 实测

建议进入 Phase 5B-4F，但仅限执行推荐的最小安全路线：

1. 不改代码。
2. 不改配置。
3. 不新增编译模式。
4. 不写数据库。
5. 不部署。
6. 不上传体验版。
7. 使用开发者工具控制台做本地运行时测试。
8. 测试前后必须确认 `git status` clean。

如果控制台仍无法可靠执行命令，则不建议继续强测，应保持 `NOT_FOUND / READ_FAILED` 未覆盖，并等待专门测试环境或人工可控输入条件。

