# Ralph Loop Task Queue

This queue is the task-level promotion source of truth for Mina AI Router milestone 0.2.

Only task files in this directory that contain a `taskmeta` JSON block are eligible for automatic selection, evaluation, and promotion.
Filenames may be ordered or customized for readability; `taskmeta.id` is the stable id used by `state/current-task.txt` and `taskmeta.next_task_on_success`.

## Current recommended sequence

1. `request-protocol-diagnostics-foundation`
2. `request-detail-diagnostics`
3. `request-retry-cancel-archive`
4. `capability-refresh-command`
5. `capability-freshness-ui`
6. `agent-health-core-api`
7. `agent-health-ui-cli`
8. `collaboration-doc-walkthrough`

## Operating rule

A task may be promoted only when all required commands pass and the task contract's exit criteria are actually met.

## When this queue ends

Return to `ROADMAP.md`, refresh product specs, and seed the next active queue before implementing milestone 0.3 work.
