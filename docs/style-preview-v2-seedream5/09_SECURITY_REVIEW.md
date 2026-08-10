# Security Review

The adapter accepts neither client URLs nor client provider settings. It revalidates source/reference file IDs against the task session path and type/size metadata, uses short-lived HTTPS URLs only in the server request, and stores only the CloudBase result fileID.

Provider dispatch has explicit lifecycle states but stores no request URLs or secret. There is no automatic retry after a dispatched unknown result, timeout, or rate-limit response. Existing tenant scope, customer access, active-task protection, idempotency, attempt cap, and single-worker claim remain unchanged.

## Network destination allowlists

- Ark requests accept only HTTPS URLs whose hostname exactly matches `ark.cn-beijing.volces.com`; credentials, localhost, IP literals, custom ports, and hostname suffix tricks fail before dispatch with `PROVIDER_UNAVAILABLE`.
- Seedream result downloads use a separate exact allowlist containing only `ark-content-generation-v2-cn-beijing.tos-cn-beijing.volces.com`. The hostname is documented as the Seedream generated-content bucket by the [official Volcengine generated-content acceleration guide](https://www.volcengine.com/docs/6559/1567141?lang=zh). No temporary result URL is retained here.
- Result URLs that miss the allowlist fail with `PROVIDER_INVALID_RESULT` before download. CloudBase-generated source/reference URLs remain under the existing server-side fileID, path, metadata, and HTTPS checks and are not constrained by either Provider allowlist.
- Result downloads do not follow redirects. Any non-2xx response, including 301, 302, 303, 307, or 308, fails with `RESULT_DOWNLOAD_FAILED` without requesting the `Location` target.

The offline Provider suite covers these restrictions and passes `15/15`; no Seedream request or cloud deployment was used for this review.
