# Phase 0F-3C Review Blocker

第四次独立复审发现：旧 `validateSubmissionSlotLinkage` 只比较两侧字段是否相等，允许两侧同步携带 `attemptNo=0`、无效日期、非法状态或伪造 key ID。

本轮将字段自身合法性置于关联校验之前。任何失败统一抛出 `SUBMISSION_STATE_INCONSISTENT`，没有向客户端暴露损坏字段的细节。

本轮仅完成本地修复和验证，不授权 CloudBase 集合、环境访问、部署、发布候选或受控发布。
