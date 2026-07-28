# Collection And Permission Gate

The statement that `stage_log_submission_keys` is created lazily with no initialization is withdrawn. The collection is an explicit deployment prerequisite.

Before any future test deployment, a human must use the CloudBase console for `shengjing-style-test-d3ac90f38b1` to:

1. Create `stage_log_submission_keys` manually.
2. Grant the deployed cloud-function runtime identity read/write access.
3. Deny mini-program client direct read/write access.
4. Verify a direct document-ID read and a submit/review transaction under the runtime identity.
5. Verify missing collection, denied read/write, and unavailable transaction return `IDEMPOTENCY_STORE_UNAVAILABLE` with no `stage_logs`, project, or notification side effect.

The code does not fall back to a non-atomic duplicate check. The local verification command is `node --test tests/stage-log-behavior/pr5-remediation-v2.test.js`; it does not create a CloudBase collection or test its permissions.
