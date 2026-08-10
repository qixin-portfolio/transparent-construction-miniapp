# Provider Architecture

`processStylePreviewTask` keeps its queue claim, tenant/session relationship checks, attempt limits, and final CloudBase storage behavior. Provider selection is explicit:

- `mock` keeps the existing test Mock flow.
- `seedream5` requires `STYLE_PREVIEW_REAL_AI_ENABLED=true`; an unknown provider is rejected.

The Seedream adapter receives server-owned session file IDs, validates their tenant/customer/session paths and metadata, obtains short-lived CloudBase URLs, calls Ark once, downloads only the first HTTPS result, validates it, and returns bytes. The worker uploads those bytes to the existing result path before marking task/session succeeded.
