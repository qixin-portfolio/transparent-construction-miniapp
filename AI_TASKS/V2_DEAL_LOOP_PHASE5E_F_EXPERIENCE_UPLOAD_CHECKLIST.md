# V2 Deal Loop Phase 5E-F：体验版上传前执行清单

## 当前阶段

Phase 5E-F：体验版上传前执行清单。

本阶段只制定体验版上传前最终执行清单，不修改业务代码，不打开入口，不上传体验版，不部署云函数，不发布正式版。

## 当前 HEAD / tag

- 当前 HEAD：`8f2c140ba5fb0706bb8f8655c2898cd48fdf9f8b`
- 当前 tag：`v2-deal-loop-phase5e-e-experience-version-decision`
- 当前安全 tag：`v2-deal-loop-phase5e-e-experience-version-decision`

## 执行清单目标

本清单用于说明：如果下一阶段真的上传 V2 成交跟进体验版，应按什么顺序执行、给谁体验、如何写体验版备注、如何关闭入口和回滚。

本阶段不执行：

1. 不打开 `ENABLE_V2_DEAL_LOOP_ENTRY`。
2. 不上传体验版。
3. 不部署云函数。
4. 不发布正式版。
5. 不给真实业务人员使用。

## 体验对象

首次体验对象建议：

1. 首次只允许 1 个老板测试账号。
2. 不开放业主端。
3. 不开放工长端。
4. 不开放普通销售。
5. 不开放外部装修公司客户。
6. 不开放真实业主。
7. 体验时间窗口建议 1 天以内。

当前测试账号状态：

待人工确认测试账号。

建议：

1. 上传体验版前必须明确具体测试账号。
2. 不建议只用 `admin / boss_qi / boss_hu` 粗粒度角色作为唯一体验范围。
3. 如果无法明确单一测试账号，不建议进入上传体验版阶段。

## 上传体验版前确认项

上传体验版前必须逐项确认：

1. 当前工作区 clean。
2. 当前安全 tag：`v2-deal-loop-phase5e-e-experience-version-decision`。
3. 当前 `ENABLE_V2_DEAL_LOOP_ENTRY = false`。
4. 已明确测试账号。
5. 已明确体验时间窗口。
6. 已准备体验版说明。
7. 已准备打开入口短期 commit/tag。
8. 已准备关闭入口 commit/tag。
9. 已准备回滚 tag。
10. 已确认不发布正式版。
11. 已确认不部署云函数。
12. 已确认不修改数据库写入逻辑。
13. 已确认不新增真实 AI API。
14. 已确认不调用 `createProject`。
15. 已确认体验结束后立即关闭入口。

如任一项未确认，不建议上传体验版。

## 下一阶段上传体验版建议步骤

以下步骤仅为下一阶段建议，本阶段不执行。

### Step 1

创建 `Phase 5E-G：临时打开入口体验版准备`。

### Step 2

将 `ENABLE_V2_DEAL_LOOP_ENTRY` 从 `false` 改为 `true`。

### Step 3

确认入口只对 `isBoss` 可见。

当前 `isBoss` 角色：

1. `admin`
2. `boss_qi`
3. `boss_hu`

同时应人工确认指定 1 个老板测试账号。

### Step 4

提交短期打开入口 commit。

建议 commit 信息：

```bash
git commit -m "chore: open V2 entry for experience version"
```

### Step 5

打短期打开入口 tag，例如：

```bash
git tag v2-deal-loop-phase5e-g-entry-open-for-experience
```

### Step 6

在微信开发者工具上传体验版。

注意：

1. 只上传体验版。
2. 不发布正式版。
3. 不部署云函数。
4. 不修改数据库。

### Step 7

体验版备注必须写明：

```text
透明工地 V2 成交跟进试验功能。
仅限老板内部体验。
本版本只读客户资料，不创建真实工地，不调用真实 AI，不自动发布内容，不影响现有客户、工地和日报数据。
请勿转发给非测试人员。
体验结束后关闭入口。
```

### Step 8

只通知指定 1 个老板测试账号。

不得通知：

1. 普通销售。
2. 工长。
3. 业主。
4. 外部装修公司客户。
5. 非测试人员。

### Step 9

体验结束后立即进入 `Phase 5E-H：关闭入口`。

### Step 10

恢复：

```js
const ENABLE_V2_DEAL_LOOP_ENTRY = false
```

### Step 11

提交关闭入口 commit/tag。

建议 commit 信息：

```bash
git commit -m "chore: close V2 entry after experience"
```

建议 tag：

```bash
git tag v2-deal-loop-phase5e-h-entry-closed-after-experience
```

## 体验版说明文案

可直接复制到体验版备注：

```text
透明工地 V2 成交跟进试验功能。
仅限老板内部体验。
本版本只读客户资料，不创建真实工地，不调用真实 AI，不自动发布内容，不影响现有客户、工地和日报数据。
请勿转发给非测试人员。
体验结束后关闭入口。
```

## 回滚方案

当前安全 tag：

`v2-deal-loop-phase5e-e-experience-version-decision`

如果入口打开后有问题：

1. 优先恢复 `ENABLE_V2_DEAL_LOOP_ENTRY = false`。
2. 提交关闭入口 commit/tag。
3. 如体验版尚未上传，只需保持入口关闭并停止上传。

如果体验版已上传但发现问题：

1. 立即关闭入口。
2. 重新上传关闭入口后的体验版覆盖旧包。
3. 或回滚到安全 tag：`v2-deal-loop-phase5e-e-experience-version-decision`。

如果代码异常：

1. 回滚到最近安全 tag。
2. 当前安全 tag 为 `v2-deal-loop-phase5e-e-experience-version-decision`。

当前不需要重新部署云函数。

## 禁止事项

体验版阶段禁止：

1. 发布正式版。
2. 给真实业主使用。
3. 给外部装修公司客户使用。
4. 开放给普通销售。
5. 当成正式 AI 功能宣传。
6. 当成正式创建工地能力宣传。
7. 当成案例自动发布能力宣传。
8. 修改云函数。
9. 修改数据库写入逻辑。
10. 新增真实 AI API。
11. 调用 `createProject`。
12. 修改 tabBar。
13. 修改 V2 六个页面。
14. 长期提交 `ENABLE_V2_DEAL_LOOP_ENTRY = true`。

## 发布判断

当前发布判断：

1. 当前不上传体验版。
2. 当前不打开入口。
3. 当前不部署云函数。
4. 当前不发布正式版。
5. 当前不建议给真实业务人员使用。
6. 当前保持 `ENABLE_V2_DEAL_LOOP_ENTRY = false`。

本阶段只是上传体验版前的最终执行清单。

## 是否建议进入 Phase 5E-G

如果人工确认测试账号和体验窗口，可以进入 Phase 5E-G：临时打开入口体验版准备。

Phase 5E-G 才允许短期将 `ENABLE_V2_DEAL_LOOP_ENTRY` 改为 `true`，并必须提交短期打开入口 tag。

进入 Phase 5E-G 前必须确认：

1. 具体 1 个老板测试账号。
2. 体验窗口不超过 1 天。
3. 体验版备注已准备。
4. 打开入口短期 commit/tag 已准备。
5. 关闭入口 commit/tag 已准备。
6. 回滚 tag 已确认。

如果测试账号和体验窗口未确认，不建议进入 Phase 5E-G。

## 验证结果

本阶段验证：

1. 已只读复核当前 git 状态。
2. 已只读复核 `ENABLE_V2_DEAL_LOOP_ENTRY = false`。
3. 已只读复核 Phase 5E-E 决策结论。
4. 本阶段未修改 `miniprogram/`。
5. 本阶段未修改 `cloudfunctions/`。
6. 本阶段未修改 `miniprogram/app.json`。
7. 本阶段未修改工作台入口。
8. 本阶段未修改 tabBar。
9. 本阶段未修改 V2 六个页面。
10. 本阶段未部署云函数。
11. 本阶段未上传体验版。
12. 本阶段未发布正式版。

已执行：

```bash
git diff --check
git status
```
