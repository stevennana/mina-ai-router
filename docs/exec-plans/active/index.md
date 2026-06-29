# Ralph Loop Task Queue

This queue is the task-level promotion source of truth for the branch review release-readiness fix wave after the initial milestone 0.2 collaboration reliability work.

Only task files in this directory that contain a `taskmeta` JSON block are eligible for automatic selection, evaluation, and promotion.
Filenames may be ordered or customized for readability; `taskmeta.id` is the stable id used by `state/current-task.txt` and `taskmeta.next_task_on_success`.

## Current active task

- `router-recovery-lock-release`

## Current recommended sequence

1. `router-recovery-lock-release`
2. `orphan-archive-semantics`
3. `cli-blocked-agent-placeholder`
4. `release-version-and-verify-contract`

## Source review

- `docs/reviews/2026-06-29-collaboration-reliability-branch-review.md`

## Operating rule

A task may be promoted only when all required commands pass and the task contract's exit criteria are actually met.

## When this queue ends

Return to `ROADMAP.md`, refresh product specs, and decide whether milestone 0.3 team workspace work is ready after these release-readiness gaps are closed.
