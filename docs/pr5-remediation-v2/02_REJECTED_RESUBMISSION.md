# Rejected Resubmission

When a current key is read, the service fetches its `currentStageLogId` in the same transaction and compares the log `reviewStatus` to `currentStatus`.

- `pending` or `approved`: return `ALREADY_SUBMITTED` without a business write.
- `rejected`: preserve that log, create a different `stage_logs` ID, increment `attemptNo`, and move the key to the new log and its initial status.
- Missing, out-of-scope, incomplete, or status-mismatched key/log: return `SUBMISSION_STATE_INCONSISTENT`, write nothing, and emit a diagnostic containing only the deterministic hash key and reason code.

`reviewStageLog` updates the key inside the same review transaction only when the log's `submissionKeyId` resolves to a key whose `currentStageLogId` is that log. A historical log without `submissionKeyId` is reviewed by the existing path and does not create a key. An old attempt cannot overwrite the key after a later rejected resubmission.
