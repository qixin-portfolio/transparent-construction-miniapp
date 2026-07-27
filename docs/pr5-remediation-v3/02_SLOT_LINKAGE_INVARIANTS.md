# Submission Slot Linkage Invariants

Both submit and pending-review paths call `validateSubmissionSlotLinkage`. A new-format log must match its key document ID, tenant, project, stage, submitter, business date, current log ID, attempt number, and current status. The project and log must both belong to the current tenant.

Any mismatch returns `SUBMISSION_STATE_INCONSISTENT` before business writes. The implementation never selects either side as authoritative and never repairs or creates a replacement key.
