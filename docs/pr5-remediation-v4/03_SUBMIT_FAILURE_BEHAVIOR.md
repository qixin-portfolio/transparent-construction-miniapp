# Submit Failure Behavior

提交事务读取已有 key 和当前日报后，先执行统一语义与关联校验。非法 attempt、日期、状态、ID 或非规范 key ID 都返回 `SUBMISSION_STATE_INCONSISTENT`。

失败发生在新增日报、更新 key、更新 project、写 photos 和通知触发之前，因此测试断言零新增业务写入、project 不变和零通知。该路径不会自动修复损坏记录，也不会降级到旧数据兼容路径。

拒绝后的正常重提仍只由已有 key 的合法 `attemptNo + 1` 产生；前端不能提供或回退尝试号。仅凭当前 key 与日报不能证明完整历史连续性，这仍是本地数据模型的证明边界。
