# Agent health UI CLI

```json taskmeta
{
  "id": "agent-health-ui-cli",
  "title": "Agent health UI and CLI",
  "order": 7,
  "status": "completed",
  "next_task_on_success": "collaboration-doc-walkthrough",
  "prompt_docs": [
    "AGENTS.md",
    "docs/FRONTEND.md",
    "docs/product-specs/agent-health-and-heartbeat.md",
    "docs/RELIABILITY.md"
  ],
  "required_commands": [
    "npm run build",
    "npm run smoke:http",
    "npm run smoke:cli-controls"
  ],
  "required_files": [
    "apps/cli/src/index.ts",
    "apps/http-server/ui/src/primitives/StatusPill.tsx",
    "apps/http-server/ui/src/features/Inspector.tsx"
  ],
  "human_review_triggers": [
    "UI and CLI use different health labels",
    "Health state is visually ambiguous",
    "The task changes core health semantics instead of consuming them"
  ],
  "completed_at": "2026-06-29T03:22:26.880Z",
  "manual_override": {
    "reason": "manual completion of 007 after UI and CLI health checks passed",
    "artifact": null,
    "previous_evaluation_status": "done",
    "promoted_at": "2026-06-29T03:22:26.880Z"
  }
}
```

## Objective

Present core health states consistently in the CLI and browser console.

## Scope

- Update CLI health/status output to use the core health model.
- Update UI pills, inspector, and flow node states to show stale/missing/needs-attention clearly.
- Preserve existing available/busy styling where compatible.
- Add or update smoke coverage for CLI/API output.

## Out of scope

- Core/API health classification changes beyond small type alignment.
- Full terminal prompt semantic detection.
- Workflow automation.

## Exit criteria

1. Stale or missing agents are visible in UI and CLI.
2. UI and CLI labels match the core/API health model.
3. Required checks pass.

## Required checks

- `npm run build`
- `npm run smoke:http`
- `npm run smoke:cli-controls`

## Evaluator notes

Promote only when the UI and CLI consume the same health semantics.

## Progress log

- Split from broad `agent-heartbeat-health` after exec-plan quality review.
- 2026-06-29T03:02:21.399Z: restored as current task after agent-health-core-api promotion.
- 2026-06-29T12:21:56+09:00: updated the browser console and CLI surfaces to consume the core health model from task 006. Status pills, flow nodes, command bar summary, and inspector messages now make `stale`, `missing`, and `needs-attention` states visible without changing core semantics; the inspector also shows last seen, last activity, and health check timestamps. CLI controls smoke now seeds stale, missing, and needs-attention fixtures and asserts that `mair health`, `mair agents`, and `mair agent <id>` expose matching core labels. Required checks passed: `npm run build`, `npm run smoke:http`, `npm run smoke:cli-controls`, and `git diff --check`.
- 2026-06-29T03:22:26.880Z: manually promoted by operator override. Reason: manual completion of 007 after UI and CLI health checks passed
