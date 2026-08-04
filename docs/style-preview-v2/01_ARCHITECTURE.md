# Architecture

`stylePreviewApi` owns authorization, sessions, uploads, tasks, reads and feedback. A CloudBase timer invokes `processStylePreviewTask`, which claims one queued task transactionally and writes the result. Clients only poll the API.
