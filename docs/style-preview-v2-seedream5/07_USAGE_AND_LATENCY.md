# Usage And Latency

Status: one smoke generation and three authorized quality generations succeeded on 2026-08-07. This is the complete four-image task cap. No request was retried.

| Run | Provider duration | Generated images | Output tokens | Total tokens | Stored output |
| --- | ---: | ---: | ---: | ---: | --- |
| Smoke | 105333 ms | 1 | 16384 | 16384 | JPEG, 2048 x 2048, 508533 bytes |
| Living room | 89089 ms | 1 | 16428 | 16428 | JPEG, 2368 x 1776, 452188 bytes |
| Main bedroom | 90788 ms | 1 | 16428 | 16428 | JPEG, 2368 x 1776, 376831 bytes |
| Kitchen | 95181 ms | 1 | 16428 | 16428 | JPEG, 2368 x 1776, 489408 bytes |
| Total / mean | 380391 ms / 95098 ms | 4 | 65668 | 65668 | 4 CloudBase result files |

For the three quality runs alone, provider latency was `89089-95181 ms`, with a mean of `91686 ms`. End-to-end page time was not instrumented, so it is not reported as provider latency.

The exact successful Ark HTTP status was not persisted by the current adapter. The adapter accepted only a `2xx` response before downloading and storing each result; recording a more specific code now would be fabrication. Provider request IDs existed in task records but are intentionally not copied into repository evidence.

No content-safety rejection, input fetch failure, result download failure, storage failure, rate limit, timeout, or duplicate generation occurred. Official billed cost is not present in the retained response fields or repository, so no price is estimated.
