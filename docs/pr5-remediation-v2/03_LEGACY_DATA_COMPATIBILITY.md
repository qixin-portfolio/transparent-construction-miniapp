# Legacy Data Compatibility

Older `stage_logs` have no submission key. If the deterministic key is absent, submission performs the existing fully paginated China-day query over the trusted project, tenant, stage, and authenticated submitter conditions.

- Any legacy `approved` or `pending` record blocks a new attempt.
- Only `rejected` records allow a new attempt.
- A mixed result still blocks when any `approved` or `pending` record exists.
- An allowed legacy replacement creates the first key with `attemptNo: 1`; no migration or backfill is performed.

Two simultaneous requests that only see rejected legacy records may both finish this read. Their transactions contend on the same deterministic key; one retries, sees the new key, and returns `ALREADY_SUBMITTED`. The application-level model covers this scenario locally; CloudBase must still be verified in the isolated environment.
