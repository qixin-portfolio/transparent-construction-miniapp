# Error Mapping

| Condition | Safe code |
| --- | --- |
| Missing/invalid credential | `PROVIDER_AUTH_FAILED` |
| `404` or explicit model/endpoint unavailable response | `PROVIDER_MODEL_UNAVAILABLE` |
| Invalid request | `PROVIDER_INVALID_REQUEST` |
| CloudBase input URL/file fetch issue | `PROVIDER_INPUT_FETCH_FAILED` |
| Content safety refusal | `PROVIDER_REJECTED` |
| Rate limit | `PROVIDER_RATE_LIMITED` |
| Ark service failure | `PROVIDER_UNAVAILABLE` |
| Unknown result after dispatch | `PROVIDER_RESULT_UNKNOWN` |
| Empty or malformed provider result | `PROVIDER_EMPTY_RESULT` / `PROVIDER_INVALID_RESULT` |
| Result transfer/store failure | `RESULT_DOWNLOAD_FAILED` / `RESULT_STORAGE_FAILED` |

Raw Ark bodies, URLs, request headers, API keys, and provider stacks are not returned to the Mini Program or recorded in this evidence directory.
