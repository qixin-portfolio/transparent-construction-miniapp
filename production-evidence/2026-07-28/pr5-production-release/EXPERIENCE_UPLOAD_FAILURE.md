# Experience Upload Failure

Attempted version: `7.3.2`

Source: clean release worktree at merge commit `70724a7838cb641c2ce7f05fac3b736d2ad8b97b`.

The first upload did not create an experience build because the optional CLI information-output path was rejected by the developer tool. A single retry without that optional path then failed before an experience build was created with WeChat Developer Tools error `41002 appid missing`.

No experience build, review submission, formal release, production data change, tag, or rollback occurred. The required next action is to restore the Developer Tools AppID association for `wxbfe2172a118ae67f` and retry only this upload from a clean merge worktree.
