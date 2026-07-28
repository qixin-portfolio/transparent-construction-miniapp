# Submission Slot Value Invariants

`validateSubmissionKeyRecord` 校验 key 自身；`validateStageLogSubmissionFields` 校验新结构日报自身；`validateSubmissionSlotLinkage` 在两者通过后校验 key、日报、project 和当前 tenant 的关联。

- `attemptNo` 与 `submissionAttemptNo` 必须为 `Number.isInteger(value) && value >= 1`。
- `businessDate` 必须是严格 `YYYY-MM-DD` 字符串，并用 UTC 日历往返验证真实日期、闰年和格式；时间、时区、`0000` 年和非字符串无效。
- key `currentStatus` 与日报 `reviewStatus` 只能为 `pending`、`approved` 或 `rejected`。
- tenant、project、stage、submitter、current stage log 与 key ID 都必须是非空、未 trim、长度不超过 128 的字符串；不自动修复或 trim。
- 只有 `submissionKeyId` 和 `submissionAttemptNo` 两个属性均不存在时才是旧结构。任何一个属性存在但非法，均是损坏新结构。

审核对合法 `approved` 或 `rejected` 记录保持既有幂等早退；其他状态会进入新结构校验，非法状态安全失败。
