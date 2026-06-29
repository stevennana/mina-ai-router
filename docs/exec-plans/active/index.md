# Ralph Loop Task Queue

This queue is the task-level promotion source of truth for the Agent Bootstrap Reliability wave after the initial milestone 0.2 collaboration reliability work.

Only task files in this directory that contain a `taskmeta` JSON block are eligible for automatic selection, evaluation, and promotion.
Filenames may be ordered or customized for readability; `taskmeta.id` is the stable id used by `state/current-task.txt` and `taskmeta.next_task_on_success`.

## Current recommended sequence

1. `bootstrap-state-model`
2. `permission-trust-readiness`
3. `mcp-preflight-agent-create`
4. `idempotent-registration-handshake`
5. `caller-identity-self-avoidance`
6. `capability-profile-schema-scoring`
7. `capability-profile-ui-cli`
8. `request-lease-state`
9. `transaction-recovery-controls`
10. `bootstrap-docs-and-smoke-hardening`

## Operating rule

A task may be promoted only when all required commands pass and the task contract's exit criteria are actually met.

## When this queue ends

Return to `ROADMAP.md`, refresh product specs, and decide whether milestone 0.3 team workspace work is ready after these bootstrap gaps are closed.
