# Plans and Promotion Rules

Ralph plans are stored under `docs/exec-plans/`.

## Task Identity

Task filenames are for readability. The stable task id is `taskmeta.id`.

`state/current-task.txt` stores the stable task id, not the filename. `taskmeta.next_task_on_success` must also point to a stable task id.

## Promotion Rules

A task may promote only when:

- every required command passes
- every required file exists
- deterministic-only tasks declare enough checks to prove completion
- evaluator-reviewed tasks are marked `done` and promotion eligible
- the next task exists or the queue intentionally ends

Failing required checks block promotion even when the implementation looks complete.

## Required Commands

The default full gate is:

```sh
npm run verify
```

Tasks may include narrower checks for speed, but completion should include `npm run verify` unless the task is docs-only and explicitly deterministic-only.

## Active Queue

The 0.2 queue starts with request activity/protocol diagnostics because that improves every later collaboration feature.
