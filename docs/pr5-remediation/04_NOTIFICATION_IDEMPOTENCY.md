# Notification Idempotency

For an approved owner-visible stage log, the notification key is:

```text
owner-stage-approved:<tenantId>:<stageLogId>
```

The claim is written atomically to the existing `stage_logs` document before any external API call. The first caller may send; sequential or concurrent callers return the recorded status and never call the external API again. The same applies to no-owner, disabled-configuration, and failure outcomes.

V1 does not automatically retry a failed or interrupted notification. The retained `sending`, `sent`, `failed`, or `not_requested` status is auditable. A future manual retry must be a separately authorized feature with explicit admin identity and retry audit data.
