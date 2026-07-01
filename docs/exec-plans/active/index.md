# Ralph Loop Task Queue

This queue is the task-level promotion source of truth. The first-user installed CLI follow-up has completed.

Only task files in this directory that contain a `taskmeta` JSON block are eligible for automatic selection, evaluation, and promotion.
Filenames may be ordered or customized for readability; `taskmeta.id` is the stable id used by `state/current-task.txt` and `taskmeta.next_task_on_success`.

## Current active task

- `NONE`

## Current recommended sequence

No active tasks remain in this wave.

## Source review

No active source review remains. The fresh real-user and first-user review findings are preserved in the release-readiness product spec and completed exec plans 034-053.

## Operating rule

A task may be promoted only when all required commands pass and the task contract's exit criteria are actually met.

## When this queue ends

Return to `ROADMAP.md`, refresh product specs, and decide whether milestone 0.3 team workspace work is ready.
