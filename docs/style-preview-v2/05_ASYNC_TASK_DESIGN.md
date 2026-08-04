# Async Task Design

The CloudBase timer trigger is the worker entrypoint. A worker claims a queued task in a transaction before moving it through `queued -> analyzing -> generating -> succeeded|failed`. No client writes task state and no un-awaited server promise is used.
