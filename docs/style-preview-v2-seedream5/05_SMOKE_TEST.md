# Smoke Test

Status: passed on 2026-08-07. Provider generation, CloudBase storage, and the existing result page all completed without a second model request.

On 2026-08-05, administrator A opened the server-authorized test page, selected the `spv2_auth_` synthetic customer, uploaded one source image and one reference image, and confirmed one billable smoke request. The page created one session and one task, then reached the processing view.

The task reached `PROVIDER_REQUEST_DISPATCHED`, proving that the worker passed its local feature gate and input temporary-URL preparation and sent the request to Ark. It then ended `failed` with the then-current safe code `PROVIDER_MODEL_UNAVAILABLE`; no provider response, result download, result upload, or succeeded transition occurred. The Mini Program displayed only the safe message "图片生成模型当前不可用，请联系管理员检查测试配置". No automatic retry was made and the visible "重新生成" control was not used.

Correction on 2026-08-05: that first classification used a broad response mapper that treated any error body mentioning `model` or `endpoint` as unavailable. The mapper now reserves `PROVIDER_MODEL_UNAVAILABLE` for `404` or an explicit unavailable/not-found response, and follows the official console request shape without `sequential_image_generation`. The first smoke result is therefore not evidence that the model itself was unavailable; a new user-authorized test-environment deployment and one new smoke request are required before assigning a root cause.

Pass criteria remain unchanged: Ark authentication and non-Lite model access succeed; source/reference temporary URLs are accepted; first result downloads and uploads to CloudBase; task/session become succeeded only after that upload; the test page renders the result and its AI disclosure.

## Corrected Smoke Run

After explicit user authorization, only `processStylePreviewTask` was code-updated in `shengjing-style-test-d3ac90f38b1`. A new `spv2_auth_` synthetic customer was created, and administrator A used the existing real WeChat login path to upload the two public Ark documentation images and create exactly one session and one task. No real customer, phone, address, house image, or OPENID was stored in the fixture.

The one task reached `PROVIDER_REQUEST_DISPATCHED`, then `PROVIDER_RESPONSE_RECEIVED`, and finally `succeeded` without retry. Ark used the confirmed non-Lite model `doubao-seedream-5-0-pro-260628`. The worker downloaded one result, validated it as JPEG `2048 x 2048`, uploaded it to the exact CloudBase result path, and only then marked the task and session succeeded. The result page opened and permanently showed `AI生成图片` plus the full disclaimer.

The result and both input image elements were initially blank in the Mac simulator. The test storage hostname resolved to Shadowrocket's `198.18.0.0/15` Fake-IP range, while the original routing mode bypassed interception and failed before TLS establishment. With the user's explicit confirmation, Shadowrocket was temporarily enabled in direct routing mode so it could translate the existing Fake-IP while keeping Tencent traffic on the local network. The same storage endpoint then completed TLS normally.

The existing history item was re-opened to obtain fresh short-lived image URLs. The result page visibly rendered the source image, reference image, and generated result, together with `AI生成图片`, the style-intent card, and the full disclaimer. No regenerate control was used, no second task was created, and no second provider request was made. Shadowrocket was restored to its original node and `配置` routing mode after the check.

Evidence: [smoke-result-visible.png](evidence/smoke-result-visible.png). The screenshot contains only the public Ark documentation sample images and the test Mini Program UI; it contains no OPENID, API key, temporary URL, QR code, real customer image, phone number, or address.
