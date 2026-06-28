# Capability freshness UI

```json taskmeta
{
  "id": "capability-freshness-ui",
  "title": "Capability freshness UI",
  "order": 5,
  "status": "active",
  "next_task_on_success": "agent-health-core-api",
  "prompt_docs": [
    "AGENTS.md",
    "docs/FRONTEND.md",
    "docs/product-specs/agent-capability-refresh.md",
    "docs/design-docs/collaboration-reliability.md"
  ],
  "required_commands": [
    "npm run build",
    "npm run smoke:http",
    "npm run smoke:docs"
  ],
  "required_files": [
    "apps/http-server/ui/src/features/Inspector.tsx",
    "apps/http-server/ui/src/features/AgentDetailsForm.tsx"
  ],
  "human_review_triggers": [
    "Freshness UI is visually confusing",
    "Mobile or floating inspector layout breaks",
    "Refresh UI triggers an unsafe or ambiguous action"
  ]
}
```

## Objective

Show capability freshness in the browser console and expose a safe refresh/edit path.

## Scope

- Display missing/stale/fresh/manual states in the inspector.
- Provide a refresh affordance if the API exists from the prior task.
- Preserve manual editing through `Edit Capabilities`.
- Verify desktop and mobile layout does not overflow.

## Out of scope

- New CLI command behavior.
- Scheduled refresh.
- Team-wide capability comparison.

## Exit criteria

1. Users can tell whether an agent capability card is fresh enough to trust.
2. Manual and generated capability summaries are not visually confused.
3. Focused verification proves the relevant UI/API data is exposed and docs links remain valid.
4. UI build, HTTP smoke, and docs smoke pass.

## Required checks

- `npm run build`
- `npm run smoke:http`
- `npm run smoke:docs`

## Evaluator notes

This is a UI task. Require visual sanity in the inspector and activity layout before promotion.

## Progress log

- Queue seeded for milestone 0.2 Ralph setup.
- 2026-06-28T15:02:43.787Z: restored as current task after capability-refresh-command promotion.
- 2026-06-28T15:07:36Z: added browser UI capability freshness states for missing, stale, fresh, and manual cards using persisted `capabilitySource`, `capabilityUpdatedAt`, and `lastCapabilityRefreshAt` metadata. Moved the safe manual `Edit Capabilities` path into the inspector capability card, mirrored freshness/source details in the edit modal, and added HTTP smoke assertions that UI state exposes generated/manual freshness metadata. Required checks run: `npm run build` passed; `npm run smoke:http` exited 0 through the existing sandbox HTTP listener `EPERM` skip path after build; `npm run smoke:docs` passed. In-app browser visual screenshots could not be captured because no browser backend was available in this session; CSS was kept fluid with wrapping capability rows and full-width mobile-safe actions for the floating inspector.
