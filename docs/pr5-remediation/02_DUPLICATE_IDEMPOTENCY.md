# Duplicate Submission Idempotency

Existing business meaning is preserved: duplicate means the same submitter, tenant, project, stage, and China calendar day; rejected records do not block a new submission. It does not become a one-log-per-user-per-day rule across all stages or projects.

Legacy matching uses exact server-side tenant/project/stage/submitter conditions and paginates in batches of 100; it no longer reads only the latest 20 records. China day boundaries are calculated explicitly at UTC+08:00.

New submissions reserve `stage_log_submission_keys/<sha256>` inside the same CloudBase transaction before creating the existing auto-ID `stage_logs` document. The key is derived from tenant, project, stage, China date, and caller identity without storing customer details in the document ID. A competing transaction sees the claim and returns `ALREADY_SUBMITTED`; the stage-log ID and existing relationships remain unchanged.
