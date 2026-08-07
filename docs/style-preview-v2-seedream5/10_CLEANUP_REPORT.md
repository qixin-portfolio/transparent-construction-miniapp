# Cleanup Report

Status: completed on 2026-08-07 after separate explicit user confirmation. Cleanup targeted only `shengjing-style-test-d3ac90f38b1` and did not access production.

The pre-delete readback matched the saved inventory exactly: one synthetic customer, five sessions (four succeeded and one empty draft), four succeeded tasks, 12 CloudBase files, and zero feedback. A storage dry run resolved exactly the same 12 explicit paths before deletion; no wildcard or recursive folder deletion was used.

Deleted resources:

| Resource | Deleted | Readback |
| --- | ---: | ---: |
| `style_preview_tasks` exact IDs | 4 | 0 |
| `style_preview_sessions` exact IDs | 5 | 0 |
| Synthetic customer `spv2_auth_seedream5_smoke_20260807` | 1 | 0 |
| Exact source/reference/result cloud files | 12 | 0 |
| Feedback | 0 present | 0 via removed session scope |
| Task 2B synthetic tenant/user/member/permission fixtures | 0 created | 0 prefixed records |

The exact-ID queries returned empty arrays after deletion. Customer-scoped session/task counts, the `spv2_auth_seedream5` customer prefix, prefixed `tenant_users` and `tenants`, and the existing `spv2AuthFixture` user marker each returned `0`. The exact CloudBase storage prefix returned `total=0`.

Not deleted: collections, indexes, `stylePreviewApi`, `processStylePreviewTask`, the `style-preview-worker` trigger, environment configuration, real test-account bindings, unrelated test data, Ark billing records, or official provider logs.

The public synthetic inputs and compressed result images under this documentation directory remain as repository evidence. They contain no real customer image, address, phone number, OPENID, API key, temporary URL, QR code, or provider request ID.
