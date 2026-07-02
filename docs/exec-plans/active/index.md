# Ralph Loop Task Queue

This queue is the task-level promotion source of truth. The final release gate Claude MCP `call_agent` and doctor-scope follow-ups have completed deterministic development.

Only task files in this directory that contain a `taskmeta` JSON block are eligible for automatic selection, evaluation, and promotion.
Filenames may be ordered or customized for readability; `taskmeta.id` is the stable id used by `state/current-task.txt` and `taskmeta.next_task_on_success`.

## Current active task

- `NONE`

## Current recommended sequence

- Completed 085. See `docs/exec-plans/completed/085-claude-mcp-call-agent-approval.md`.
- Completed 086. See `docs/exec-plans/completed/086-doctor-client-scoped-oob-check.md`.

## Source review

Source review: `docs/product-specs/release-readiness-review-fixes.md`. The previous real CLI/Web UI findings are preserved in the release-readiness product spec and completed exec plans 034-076, with follow-up prompt hardening in 077-085 and doctor scoping in 086.

## Operating rule

A task may be promoted only when all required commands pass and the task contract's exit criteria are actually met.

## When this queue ends

Repeat the real six-session validation before deleting the review file. If the live validation passes, return to `ROADMAP.md` and decide whether milestone 0.3 team workspace work is ready.
