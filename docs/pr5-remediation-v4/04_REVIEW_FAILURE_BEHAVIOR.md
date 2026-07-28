# Review Failure Behavior

对待审核的新结构日报，审核事务会先读取 project 和 key，再执行同一共享语义与关联校验，最后才允许更新日报、key、project 和 photos。

非法 slot 统一返回 `SUBMISSION_STATE_INCONSISTENT`。测试用完整数据库快照断言失败后日报状态、ownerVisible、key、project、photos 均不变，且通知计数为零。

已是合法 `approved` 或 `rejected` 的日报仍返回 `ALREADY_REVIEWED`，不会覆盖当前 key；这保留既有历史审核幂等语义。
