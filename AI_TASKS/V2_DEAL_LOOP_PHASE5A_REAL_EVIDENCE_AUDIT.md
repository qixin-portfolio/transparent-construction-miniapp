# V2 Deal Loop Phase 5A Real Evidence Audit

## 1. 当前阶段

Phase 5A：真实工地证据只读增强方案审计。

本阶段只做方案审计，不实现，不修改业务代码，不读取或展示真实照片，不接真实数据源，不部署，不上传体验版，不进入 Phase 5B。

## 2. 当前 HEAD / tag

当前安全检查点：

```text
e6bd6f8a9282005f3b3eda8c8ca7e364bbdcea29
```

对应 tag：

```text
v2-deal-loop-phase4c-entry-acceptance
```

当前工作台入口状态：

```js
const ENABLE_V2_DEAL_LOOP_ENTRY = false
```

当前 V2 `deal-loop` 分包真实云函数调用范围仍只限：

```text
listCustomers
getCustomer
```

## 3. 审计目标

设计后续如何把真实工地证据安全用于 V2：

1. 推荐素材。
2. 信任证据库。
3. 案例资产草案。

本阶段只审计边界，不新增读取逻辑。重点是先判断哪些真实证据能用，哪些必须授权，哪些只能内部看，哪些绝对不能用于成交素材。

## 4. 可用真实证据分类

### 4.1 可安全用于 V2 的证据

只适合先做摘要、计数、标签，不直接展示原始文件：

1. `projects` 的脱敏摘要字段：风格、面积、户型、阶段、进度、状态、预算段。
2. `stage_logs` 的已审核节点标题：必须 `reviewStatus = approved` 且 `ownerVisible = true`。
3. `stage_logs` 的节点数量、最近更新时间、关键节点覆盖情况。
4. `photos` 的数量统计：必须来自已审核日报，且 `ownerVisible = true`。
5. `design_drawings` 的效果图数量统计：必须 `type = render` 且 `ownerVisible = true`。
6. `warranty_cards` 的质保能力摘要：是否已生成质保卡、质保范围类别、服务电话归属，不展示业主明细。
7. `after_sales_tickets` 的聚合统计：售后工单数量、已完成数量、响应状态分布，不展示具体投诉内容。

### 4.2 需要授权后才能用的证据

必须依赖 `case_authorizations`：

1. 竣工照片：需要 `authorizationScope = public` 或至少符合后续定义的对外素材授权。
2. 施工过程照片：需要 `allowedMaterials` 包含 `process_photos`。
3. 户型/面积/风格：需要 `allowedMaterials` 包含 `house_info`。
4. 预算或金额：现有公开案例逻辑使用 `allowedMaterials` 判断 `budget`，后续必须延续授权粒度。
5. 业主评价：需要 `allowedMaterials` 包含 `owner_comment`。
6. 业主姓名展示：必须遵守 `ownerNameDisplay = anonymous / surname / full`。
7. 小红书、抖音、官网、GEO 等不同渠道使用，后续需要把授权范围显式细化，不能默认通用。

### 4.3 只能内部看、不能给客户看的证据

1. 未公开授权但 `authorizationScope = internal` 的案例材料。
2. `stage_logs` 中的 `issue`、`needConfirm`、`reviewFocus`、`aiDraft`、`voiceTranscript`。
3. 工长/员工提交人、审核人、内部角色、openid、userId。
4. 施工图 `type = construction`。
5. 售后工单明细、投诉描述、图片、处理记录。
6. 质保卡中的业主身份、详细地址、联系方式。
7. 未脱敏的 project address、ownerOpenid、ownerOpenids、ownerName、customerName。

### 4.4 绝对不能用于成交素材的证据

1. `reviewStatus = pending` 或 `reviewStatus = rejected` 的日报。
2. `ownerVisible = false` 的日报、照片、图纸。
3. 未授权或已撤回授权的案例材料。
4. 施工图纸原图、施工图 fileID、施工图备注。
5. 售后投诉原文、业主联系方式、报修图片。
6. openid、ownerOpenid、createdByOpenid、updatedByOpenid、submittedByOpenid、reviewedByOpenid。
7. 详细门牌号、身份证、完整手机号、内部备注、内部审核意见。
8. 云存储原始 `fileID`、`cloudPath`、可长期访问的原始地址。

## 5. stage_logs 使用边界

必须满足：

```text
projectId 存在
tenantId 同租户或兼容旧数据空值
reviewStatus = approved
ownerVisible = true
```

可用于 V2 的内容：

1. 施工节点标题：如水电、防水、瓦工、竣工验收。
2. 节点数量和阶段覆盖情况。
3. 最近更新时间的脱敏表达。
4. 经过人工确认的 `ownerSummary`，但仍建议二次脱敏。

谨慎使用：

1. `workContent` 可用于内部推荐判断，不建议直接给成交客户看。
2. `tomorrowPlan` 可用于内部理解项目节奏，不建议作为对外素材。

不得展示：

1. `issue`。
2. `needConfirm`。
3. `reviewFocus`。
4. `voiceTranscript`。
5. `aiDraft`。
6. `submittedByName`、`reviewedByName`。
7. `submittedByOpenid`、`reviewedByOpenid`。

结论：

Phase 5B 最小可先接 `stage_logs` 的已审核节点标题和计数，不接正文和人员字段。

## 6. photos 使用边界

必须满足：

```text
来源于已审核日报
stage_logs.reviewStatus = approved
stage_logs.ownerVisible = true
photos.ownerVisible = true
同 tenantId
关联 projectId / stageLogId
```

可用于 V2 的内容：

1. 照片数量。
2. 关键节点是否有照片。
3. 缩略图的短期临时访问地址，仅在授权和 ownerVisible 均满足后使用。

不得展示：

1. 原始 `fileID`。
2. 原始 `cloudPath`。
3. 上传人 openid。
4. 原始定位。
5. 原始时间精确到分钟的轨迹。
6. 内部备注。

案例资产草案边界：

1. 未授权前，只可使用照片数量、节点标签，不展示真实图。
2. 授权后，仍只能用授权范围内的照片。
3. 对外平台素材必须走 `case_authorizations`，不能只靠 `ownerVisible`。

## 7. design_drawings 使用边界

现有边界：

1. 图纸类型包含 `render` 和 `construction`。
2. 效果图 `type = render` 可设置 `ownerVisible`。
3. 施工图 `type = construction` 在上传和更新逻辑中强制不可对业主开放。
4. 业主查询图纸时只返回 `type = render` 且 `ownerVisible = true`。

可用于 V2：

1. 效果图数量。
2. 效果图空间分类：客厅、卧室、厨房等。
3. 已业主可见的效果图标题，需脱敏。

需要授权后才能用于成交素材：

1. 效果图原图或缩略图。
2. 完整设计亮点。
3. 小红书/抖音/官网/GEO 等公开渠道展示。

禁止用于成交素材：

1. 施工图原图。
2. 施工图 fileID。
3. 施工图备注。
4. 施工细节尺寸、材料清单、隐蔽工程敏感信息。

## 8. case_authorizations 使用边界

现有授权范围：

```text
private  -> 仅本人查看，status = revoked
internal -> 仅晟景内部学习，status = approved
public   -> 允许公开展示，status = approved
```

现有可授权材料：

```text
completion_photos
process_photos
house_info
owner_comment
```

现有姓名展示：

```text
anonymous
surname
full
```

V2 使用规则：

1. 对外成交素材至少需要 `status = approved`。
2. 公开案例和平台素材必须 `authorizationScope = public`。
3. 内部培训素材可用 `authorizationScope = internal`，但不得给潜在客户看。
4. `authorizationScope = private` 或 `status = revoked` 时不可使用。
5. `allowedMaterials` 必须逐项限制，不能因为有公开授权就默认开放所有材料。
6. 授权撤回后，必须从推荐池和案例资产候选中移除。
7. 后续需要记录授权来源、授权时间、撤回时间、使用渠道和操作人。

平台边界建议：

1. 小红书：需要公开展示授权，且允许图片/户型/评价对应材料。
2. 抖音：需要公开展示授权，视频素材需要单独确认照片/过程片段范围。
3. 官网：需要公开展示授权，可用脱敏案例摘要。
4. GEO：问答可以用统计和抽象经验；若引用具体案例，仍需公开授权。

## 9. warranty_cards / after_sales_tickets 使用边界

### warranty_cards

适合用途：

1. 作为信任素材中的“质保能力”证明。
2. 展示质保范围类别。
3. 展示是否有电子质保卡机制。

可展示字段：

1. 质保范围类别。
2. 质保卡状态的统计。
3. 服务电话归属的泛化说明。

不能展示字段：

1. `ownerOpenid`。
2. `ownerName`。
3. `projectAddress` 详细地址。
4. `contactPhone` 完整手机号。
5. `warrantyNo`。
6. `createdByOpenid`。

### after_sales_tickets

适合用途：

1. 做售后响应能力统计。
2. 做“售后机制存在”的信任说明。

建议只做统计，不展示明细：

1. 总工单数。
2. 已完成数量。
3. 处理中数量。
4. 平均响应状态分布。

不能展示字段：

1. 投诉原文。
2. 售后图片。
3. 业主姓名、手机号、openid。
4. 项目详细地址。
5. 处理人内部备注。
6. 工单编号。

## 10. 字段脱敏要求

所有进入 V2 推荐素材、信任证据库、案例资产草案的真实证据必须脱敏：

1. 手机号只允许掩码。
2. openid / userId 全部删除。
3. 身份证全部删除。
4. 详细门牌号删除，只保留小区或区域。
5. 业主姓名默认匿名；如授权姓氏展示，只显示姓氏。
6. 员工、工长、审核人姓名默认不展示。
7. 售后和施工问题只允许归类，不展示原文。
8. 云存储 `fileID` 不进页面文案，不进 URL query，不进 AI prompt。
9. `tenantId` 只用于权限过滤，不展示给用户。
10. 预算、合同金额必须有授权或只展示预算段。

## 11. Phase 5B 最小实现路径

只设计，不实现。

建议最小安全接入顺序：

1. 新增只读证据摘要云函数或复用安全只读函数设计：先只返回脱敏统计，不返回照片 URL。
2. 接 `projects` 只读摘要：同租户、关联 `customerId`，只返回小区简写、面积、风格、阶段、状态。
3. 接 `stage_logs` 已审核标题：只返回 `reviewStatus = approved`、`ownerVisible = true` 的节点标题和数量。
4. 接 `photos` 数量统计：只统计 `ownerVisible = true` 的照片数量，不返回 `fileID`。
5. 接 `design_drawings` 效果图统计：只统计 `type = render`、`ownerVisible = true`。
6. 接 `case_authorizations` 授权判断：只返回是否可用于内部/公开，以及 allowedMaterials。
7. 再考虑已授权缩略图：必须短期临时 URL，且只在明确授权后展示。
8. 最后才考虑案例资产生成：先生成草案，不自动发布，不写 `case_assets`。

Phase 5B 第一版建议输出：

```text
客户 -> 关联工地摘要 -> 已审核节点数量 -> 业主可见照片数量 -> 授权状态 -> 推荐理由
```

不建议第一版输出：

```text
真实照片缩略图
施工日报正文
售后明细
施工图
自动案例文案发布
```

## 12. 禁止事项

Phase 5B 之前禁止：

1. 不接 pending 日报。
2. 不接 rejected 日报。
3. 不展示 `ownerVisible = false` 的照片。
4. 不展示未授权案例。
5. 不展示已撤回授权案例。
6. 不展示施工图敏感信息。
7. 不写 `case_assets`。
8. 不自动发布小红书/抖音/官网。
9. 不调用真实 AI API。
10. 不改 `createProject`。
11. 不改 V1 客户页、工地页、业主端。
12. 不把 `fileID`、openid、完整手机号、详细地址拼入 V2 文案或 URL。
13. 不新增真实写库逻辑。

## 13. 风险点

1. `ownerVisible = true` 不等于“可公开营销使用”，对外展示仍需 `case_authorizations`。
2. 公开案例已有授权逻辑，但 V2 推荐素材如果复用不当，可能绕过授权范围。
3. 工地日报正文可能包含施工问题、客户偏好、内部备注，不适合直接给潜在客户看。
4. 照片临时 URL 如果被复制，仍可能造成隐私外泄。
5. 施工图属于高敏资产，必须继续默认不可对业主和潜在客户开放。
6. 售后工单可以证明服务能力，但明细容易暴露负面问题和业主隐私。
7. 多租户过滤必须稳定使用 `tenantId`，旧数据空值兼容要谨慎。
8. 后续若引入真实 AI，prompt 也必须走脱敏后的证据摘要，不能喂原始字段。

## 14. 下一步建议

Phase 5A 停止在方案审计，不进入 Phase 5B。

如后续进入 Phase 5B，建议先人工确认：

1. 是否只做证据摘要，不展示真实照片。
2. 是否新建独立只读云函数，避免直接复用内部详情接口。
3. `ownerVisible` 与 `case_authorizations` 的组合规则。
4. 各平台授权范围是否需要拆分。
5. 是否继续保持 V2 入口默认隐藏。
