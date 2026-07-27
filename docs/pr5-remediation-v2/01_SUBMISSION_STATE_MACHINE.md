# Submission State Machine

The business slot is the trusted tuple `tenantId`, `projectId`, canonical `stageCode`, authenticated `submitterId`, and China business date. The client does not supply the current state.

```text
ABSENT -> pending | approved
pending -> approved | rejected
approved -> same-day submission blocked
rejected -> new stage_log attempt -> pending | approved
```

`stage_log_submission_keys/<deterministic-hash>` represents the current slot, not permanent proof that a submission happened. Its fields are `tenantId`, `projectId`, `stageCode`, `submitterId`, `businessDate`, `currentStageLogId`, `currentStatus`, `attemptNo`, `createdAt`, `updatedAt`, and `lastRejectedAt`.

Each new `stage_logs` document stores additive `submissionKeyId`, `submissionAttemptNo`, and `submissionBusinessDate` fields. Rejection never deletes or overwrites an old `stage_logs` document. A reviewer self-upload creates an `approved` first attempt; a worker upload creates a `pending` first attempt.

The key ID is `stage-log-submit-` plus SHA-256 of the labeled-value format `tenantId`, `projectId`, `stageCode`, China `YYYY-MM-DD`, and authenticated submitter identity joined by newlines. The document stores this format description only, not the raw hash input, and the ID contains no customer name, phone number, or address.
