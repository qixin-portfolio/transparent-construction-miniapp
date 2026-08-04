# Storage Rules

Files live below `style-preview/{tenantId}/{customerId}/{sessionId}/source|reference|result/`. Server validation accepts JPEG, PNG and WebP only, caps each file at 10MB and computes a SHA-256 from downloaded bytes. File IDs are stored; pages receive temporary URLs only.
