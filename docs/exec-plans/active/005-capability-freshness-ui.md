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
- 2026-06-29T00:16:25+09:00: added stable freshness-state DOM attributes to the inspector and edit modal capability cards, added a non-destructive `Copy Refresh Command` affordance for the existing `mair agent refresh-capabilities <id>` path, and exposed the refresh command in the details modal. Expanded `npm run smoke:http` to seed missing/stale API fixtures when the HTTP listener is available and to assert built UI assets expose Missing/Stale/Fresh/Manual labels, `Edit Capabilities`, the copyable refresh command, capability state attributes, and desktop/mobile floating panel overflow constraints even when the sandbox denies local HTTP binding. Required checks run: `npm run build` passed; `npm run smoke:http` passed through the sandbox `EPERM` skip path after local built-asset assertions; `npm run smoke:docs` passed. Browser screenshot capture was attempted, but the in-app browser backend was unavailable and no local Playwright/Puppeteer/Chrome binary was installed.
- 2026-06-29T00:22:39+09:00: strengthened `npm run smoke:http` with a deterministic static visual fixture for the inspector and activity layout using the built UI stylesheet. The fixture includes desktop and mobile viewports, missing/stale/fresh/manual capability cards, `Edit Capabilities`, `Copy Refresh Command`, and activity table overflow containment checks. Required checks run: `npm run build` passed; `npm run smoke:http` passed through the sandbox `EPERM` HTTP-listener path after built-asset and visual-fixture assertions; `npm run smoke:docs` passed. In-app browser verification was attempted again, but the `iab` browser backend was unavailable in this session.
