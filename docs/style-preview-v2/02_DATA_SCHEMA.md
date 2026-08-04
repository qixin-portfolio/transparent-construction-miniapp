# Data Schema

Test-only collections are `style_preview_sessions` and `style_preview_tasks`. Every record carries `tenantId`; tasks carry a SHA-256 idempotency key, attempt number, provider fields and safe failure fields.
