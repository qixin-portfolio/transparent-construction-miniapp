# Canonical Submission Key ID

`buildSubmissionKeyId` 是创建和验证共用的唯一来源。它以固定顺序 JSON 数组编码以下非隐私业务标识后计算 SHA-256：tenantId、projectId、stageCode、submitterId、businessDate。

输出格式为 `stage-log-submission:v1:<sha256-hex>`。`v1` 锁定算法版本；JSON 数组消除字段拼接歧义；散列输入不含姓名、电话、地址或通知内容。

校验会用已经过字段语义验证的值重新生成 expected key ID，并同时要求 key `_id` 和日报 `submissionKeyId` 完全等于它。修改 tenant、日期、stage 或 submitter 后复用旧 ID 会失败。
