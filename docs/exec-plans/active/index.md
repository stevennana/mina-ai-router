# Ralph Loop Task Queue

This queue is the task-level promotion source of truth. The second real CLI/Web UI follow-up prompt-clearance task has completed.

Only task files in this directory that contain a `taskmeta` JSON block are eligible for automatic selection, evaluation, and promotion.
Filenames may be ordered or customized for readability; `taskmeta.id` is the stable id used by `state/current-task.txt` and `taskmeta.next_task_on_success`.

## Current active task

- `NONE`

## Current recommended sequence

- Completed 068. See `docs/exec-plans/completed/068-update-skip-clearance-gate.md`.

## Source review

Source review: `docs/reviews/2026-07-02-real-cli-webui-multi-agent-second-followup-review.md`. The previous real CLI/Web UI findings are preserved in the release-readiness product spec and completed exec plans 034-068.

## Operating rule

A task may be promoted only when all required commands pass and the task contract's exit criteria are actually met.

## When this queue ends

Return to `ROADMAP.md`, refresh product specs, and decide whether milestone 0.3 team workspace work is ready.
