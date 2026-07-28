# Legacy Record Classification

`isLegacyStageLog` returns true only when both `submissionKeyId` and `submissionAttemptNo` are absent as own fields. Empty key IDs, zero attempts, wrong types, and one-field records are new or partial structures, not legacy data.

Partial records fail closed with `SUBMISSION_STATE_INCONSISTENT`. Fully legacy records retain the previous review behavior and do not cause a submission key to be created.
