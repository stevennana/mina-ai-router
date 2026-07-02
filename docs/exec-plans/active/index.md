# Ralph Loop Task Queue

This queue is the task-level promotion source of truth. The real 6-repo follow-up startup recovery wave has completed.

Only task files in this directory that contain a `taskmeta` JSON block are eligible for automatic selection, evaluation, and promotion.
Filenames may be ordered or customized for readability; `taskmeta.id` is the stable id used by `state/current-task.txt` and `taskmeta.next_task_on_success`.

## Current active task

- `NONE`

## Current recommended sequence

- Completed 072-076. See `docs/exec-plans/completed/072-codex-latest-prompt-segment-detection.md` through `docs/exec-plans/completed/076-cli-equals-flag-parser.md`.

## Source review

Source review: `docs/reviews/2026-07-02-real-6repo-usage-review.md`. The previous real CLI/Web UI findings are preserved in the release-readiness product spec and completed exec plans 034-076.

## Operating rule

A task may be promoted only when all required commands pass and the task contract's exit criteria are actually met.

## When this queue ends

Return to `ROADMAP.md`, refresh product specs, and decide whether milestone 0.3 team workspace work is ready.
