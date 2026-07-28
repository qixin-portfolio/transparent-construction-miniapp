# Experience Version Validation Matrix

## Candidate

- Experience version: `7.3.2`
- Source commit: `70724a7838cb641c2ce7f05fac3b736d2ad8b97b`
- Local regression at the source commit: `node --test tests/stage-log-behavior/*.test.js` -> `171/171` passed on 2026-07-28.
- Test environment evidence: `shengjing-style-test-d3ac90f38b1`, real Mini Program user session, fixture `pr5t-stage-core-20260728-r3`, then exact cleanup.

## Core-path evidence

| Required check | Evidence | Result | Production action |
| --- | --- | --- | --- |
| Ordinary user submits a stage log | Real test-environment session successfully submitted a no-photo/no-audio log | Passed | Not repeated with production data |
| Boss role auto-approves | Candidate regression covers the boss self-upload auto-approval transition and notification idempotency | Passed locally | Not repeated with production data |
| Pending manual review | Real test-environment session submitted then approved a log; pending list was empty after approval | Passed | Not repeated with production data |
| Rejected resubmission | Candidate regression covers a rejected current attempt creating the next attempt while retaining history | Passed locally | Not repeated with production data |
| Duplicate submission is blocked | Real session could not select the current node for a second submission; candidate regression also covers concurrent duplicate claims | Passed | Not repeated with production data |
| Duplicate review returns `ALREADY_REVIEWED` | Candidate regression verifies the stable `ALREADY_REVIEWED` result and no duplicate notice | Passed locally | Not repeated with production data |
| Old-stage approval cannot regress progress | Candidate regression verifies old/lower progress keeps higher project progress and delivered status | Passed locally | Not repeated with production data |
| Review images display normally | Existing real-device V1 smoke evidence covers approved stage-log and construction-photo display | Existing real evidence | No image fixture created in production |
| V2 deal-loop entry is hidden | Both candidate entry guards set `ENABLE_V2_DEAL_LOOP_ENTRY = false`; existing real-device smoke confirms it is invisible | Passed | No V2 configuration changed |
| Owner viewing flow remains normal | Existing real-device smoke evidence covers owner project detail, approved logs, construction photos, and owner visibility | Existing real evidence | No owner data or messages used in production |

## Data and notification boundary

- No synthetic production project, customer, owner binding, owner OpenID, or message recipient was created.
- No rejected or concurrent production scenario was manufactured.
- The test-environment fixture was precisely cleaned: exact-name search found no project after deletion and the count returned from 15 to 14.
- Production notification configuration was not changed. The deployed sender defaults to no external delivery without its explicit server-side configuration.

## Interpretation

The candidate has uploaded successfully. The evidence above supports the requested minimal verification without introducing production data or notification risk. Formal review submission and release remain pending in the WeChat public platform.
