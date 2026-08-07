# Quality Test Report

Status: three of three authorized quality generations completed on 2026-08-07. All used public synthetic source/reference pairs, produced one image, stopped at `attemptNo=1`, and had no automatic retry.

Scoring is a manual comparison against the source image for structure and the reference image for style. `1` is unusable and `5` is strong. This is an internal style-preview screen, not a construction drawing or delivery guarantee.

| Result | Camera | Perspective | Walls | Doors/windows | Beams/columns | Proportion | Style | Materials | Buildability | Realism | Mean |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Living room | 4 | 4 | 5 | 5 | 5 | 4 | 5 | 5 | 4 | 5 | 4.6 |
| Main bedroom | 4 | 4 | 5 | 5 | 4 | 4 | 5 | 5 | 4 | 5 | 4.5 |
| Kitchen | 4 | 4 | 5 | 5 | 5 | 4 | 5 | 5 | 4 | 5 | 4.6 |
| Overall | 4.0 | 4.0 | 5.0 | 5.0 | 4.7 | 4.0 | 5.0 | 5.0 | 4.0 | 5.0 | 4.57 |

The living room keeps the left opening, balcony opening, beam, and right column, with slight reframing. The bedroom keeps the window, right opening, soffit, and narrow-room proportion; the cabinet treatment around the window/column needs a designer check. The kitchen keeps the back window, right opening, cross beam, and source plumbing zones; the two sink/work zones are plausible but require site verification.

Hard-failure review:

| Check | Living | Bedroom | Kitchen |
| --- | --- | --- | --- |
| Door/window count or obvious position changed | No | No | No |
| Wall or beam/column removed or clearly moved | No | No | No |
| Camera clearly replaced or space expanded/replaced | No | No | No |
| Erroneous scene text or third-party logo | No | No | No |
| Unbuildable floating structure | No | No | No |

The visible `AI生成` mark is the required provider watermark from `watermark=true`; it is not treated as erroneous scene text or a third-party logo and was not cropped or hidden. No content-safety rejection, download failure, storage failure, or confirmed structural reconstruction occurred.

Evidence:

- [Living result](evidence/quality-living-result.jpg)
- [Bedroom result](evidence/quality-bedroom-result.jpg)
- [Kitchen result](evidence/quality-kitchen-result.jpg)
- The corresponding public synthetic inputs are retained under `quality-inputs/`.

Conclusion: the three results meet the internal style-preview trial standard because all three are usable for style discussion and none has a hard structural failure. Human site measurement and designer review remain mandatory, especially for cabinetry, plumbing, dimensions, and circulation.
