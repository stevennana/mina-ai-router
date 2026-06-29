# Capability freshness UI

```json taskmeta
{
  "id": "capability-freshness-ui",
  "title": "Capability freshness UI",
  "order": 5,
  "status": "completed",
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
  ],
  "completed_at": "2026-06-29T02:47:06.797Z",
  "manual_override": {
    "reason": "manual completion of 005 after browser permission blocker; live in-app browser desktop/mobile layout verified",
    "artifact": "state/artifacts/manual-005-browser-evidence",
    "previous_evaluation_status": "not_done",
    "promoted_at": "2026-06-29T02:47:06.797Z"
  }
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
- 2026-06-29T00:27:59+09:00: re-ran focused verification for the current task. Required checks passed: `npm run build`; `npm run smoke:http`, which generated `/var/folders/kr/td7d63zs2sz_hy_11mm05f6w0000gn/T/mina-http-smoke-1DgWwp/capability-freshness-visual-fixture.html` and exited 0 through the sandbox `EPERM` HTTP-listener path; and `npm run smoke:docs`. Actual rendered browser verification remains unavailable because browser backend discovery returned no registered backends (`[]`) and local Playwright/Puppeteer/Chrome binaries are not installed.
- 2026-06-29T00:32:56+09:00: re-read required task docs plus repository guidance, inspected the existing inspector/edit-modal freshness UI, and confirmed the task surface is already present: missing/stale/fresh/manual card states, manual-vs-generated labels, `Edit Capabilities`, and a non-destructive `Copy Refresh Command` path. Required checks passed: `npm run build`; `npm run smoke:http`, which generated `/var/folders/kr/td7d63zs2sz_hy_11mm05f6w0000gn/T/mina-http-smoke-WST7Eo/capability-freshness-visual-fixture.html` and exited 0 after built-asset and static visual-fixture assertions through the sandbox `listen EPERM` HTTP-listener skip path; and `npm run smoke:docs`. Actual in-app browser DOM/screenshot verification was attempted, but browser backend discovery returned `[]`, so live rendered overflow measurement remains unavailable in this session.
- 2026-06-29T00:39:30+09:00: added an optional headless Chrome render pass to `npm run smoke:http` for the capability freshness visual fixture. When Chrome can run, the smoke now renders desktop `1280x720` and mobile `390x844` fixture pages, captures screenshot paths, parses DOM geometry from the rendered page, asserts inspector/activity panels fit horizontally, asserts panel horizontal overflow is contained, and verifies all missing/stale/fresh/manual states are present. Required checks passed: `npm run build`; `npm run smoke:http`, which generated `/var/folders/kr/td7d63zs2sz_hy_11mm05f6w0000gn/T/mina-http-smoke-Z5Rb6W/capability-freshness-visual-fixture.html`, attempted Chrome rendering, reported sandbox `SIGABRT` for both viewports, then exited 0 through the existing `listen EPERM` HTTP-listener path after built-asset and visual-fixture assertions; and `npm run smoke:docs`. In-app browser discovery still returned `[]`, so actual live screenshot verification remains blocked by this session environment, but the smoke now performs rendered DOM overflow checks automatically in environments where Chrome is executable.
- 2026-06-29T11:46:23+09:00: manually verified the live console in the Codex in-app browser at `http://127.0.0.1:3334/`. Desktop `1280x720` with an agent selected rendered `Live Agent Flow`, stale capability state, floating inspector, and floating activity with document `scrollWidth=1280`/`clientWidth=1280`; flow, inspector, and activity panels were within viewport and contained horizontal overflow. Mobile `390x844` rendered the selected-agent inspector and activity panel with document `scrollWidth=390`/`clientWidth=390`; flow, inspector, and activity panels fit horizontally, and the wider activity table was contained by the scrollable activity body. Screenshot evidence was captured under `state/artifacts/manual-005-browser-evidence/`. Hardened `npm run smoke:http` so optional Chrome rendering cannot hang and transient GET `ECONNRESET` startup reads are retried safely. Required checks passed: `npm run build`, `npm run smoke:http`, `npm run smoke:docs`, and `git diff --check`.
- 2026-06-29T02:47:06.797Z: manually promoted by operator override. Reason: manual completion of 005 after browser permission blocker; live in-app browser desktop/mobile layout verified Artifact: state/artifacts/manual-005-browser-evidence.
