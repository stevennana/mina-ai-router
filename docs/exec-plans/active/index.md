# Ralph Loop Task Queue

This queue is the task-level promotion source of truth. The third real 6-repo follow-up startup recovery wave has completed deterministic development.

Only task files in this directory that contain a `taskmeta` JSON block are eligible for automatic selection, evaluation, and promotion.
Filenames may be ordered or customized for readability; `taskmeta.id` is the stable id used by `state/current-task.txt` and `taskmeta.next_task_on_success`.

## Current active task

- `NONE`

## Current recommended sequence

- Completed 080-082. See `docs/exec-plans/completed/080-codex-mcp-list-agents-approval.md` through `docs/exec-plans/completed/082-claude-cwd-scoped-readonly-approval.md`.

## Source review

Source review: `docs/reviews/2026-07-02-real-6repo-usage-review.md`. The previous real CLI/Web UI findings are preserved in the release-readiness product spec and completed exec plans 034-076, with follow-up prompt hardening in 077-082.

## Operating rule

A task may be promoted only when all required commands pass and the task contract's exit criteria are actually met.

## When this queue ends

Repeat the real six-session validation before deleting the review file. If the live validation passes, return to `ROADMAP.md` and decide whether milestone 0.3 team workspace work is ready.
