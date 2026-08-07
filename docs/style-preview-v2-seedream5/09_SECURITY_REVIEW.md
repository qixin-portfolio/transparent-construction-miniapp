# Security Review

The adapter accepts neither client URLs nor client provider settings. It revalidates source/reference file IDs against the task session path and type/size metadata, uses short-lived HTTPS URLs only in the server request, and stores only the CloudBase result fileID.

Provider dispatch has explicit lifecycle states but stores no request URLs or secret. There is no automatic retry after a dispatched unknown result, timeout, or rate-limit response. Existing tenant scope, customer access, active-task protection, idempotency, attempt cap, and single-worker claim remain unchanged.
