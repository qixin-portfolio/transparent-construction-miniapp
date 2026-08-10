# Request and Response Contract

The adapter POSTs `${ARK_BASE_URL}/images/generations` with the configured model, a server-built prompt, source URL first, reference URL second, `size: "2K"`, `stream: false`, `response_format: "url"`, and `watermark: true`. It does not send `sequential_image_generation`; this matches the user-provided Ark Console example for `doubao-seedream-5-0-pro-260628`.

Only `data[0].url` is accepted. It must be HTTPS, is immediately downloaded under the configured byte limit, and is never persisted. Content-Type and actual image bytes must agree. Database records receive only the CloudBase result fileID and real provider fields returned by Ark; unavailable model fields remain `null`.
