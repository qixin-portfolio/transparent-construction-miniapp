# Security And Cost Boundaries

The feature requires a test-environment server flag and internal role. Sessions/tasks are tenant-scoped, daily per-user and per-tenant limits are server environment values, active/succeeded inputs are deduplicated, and each session has at most three attempts. API keys are never client-visible or committed.
