# Request Diagnostics and Controls

## User Story

As a developer routing work between local CLI agents, I want each request to show lifecycle, raw evidence, parsed result, and recovery actions so I can trust and debug collaboration.

## Scope

- Request detail surface in the UI.
- Request lifecycle fields in core state where needed.
- Retry, cancel, archive, and copy actions.
- Parser diagnostics for malformed or missing response markers.

## Out of Scope

- Team fanout.
- Long-term transcript search.
- GitHub integration.

## Acceptance

- A user can open a request and see source, target, status, task, timestamps, answer/error, and diagnostics.
- Failed requests distinguish timeout, cancellation, transport failure, and parse failure when the data is available.
- Retry creates a new request or reruns safely with clear lineage.
