# Codex passive update banner detection

```json taskmeta
{
  "id": "codex-passive-update-banner-detection",
  "title": "Codex passive update banner detection",
  "order": 69,
  "status": "completed",
  "next_task_on_success": "generic-self-registration-retry",
  "prompt_docs": [
    "AGENTS.md",
    "docs/reviews/2026-07-02-real-6repo-usage-review.md",
    "docs/product-specs/release-readiness-review-fixes.md"
  ],
  "required_commands": [
    "npm run test",
    "npm run smoke:http",
    "npm run smoke:docs"
  ],
  "required_files": [
    "packages/transports/src/tmux/tmux-client.ts",
    "scripts/core-tests.js",
    "scripts/smoke-http.js"
  ],
  "human_review_triggers": [
    "Passive Codex update banners still produce client-update-required",
    "Skip Codex Update appears when there is no active update choice menu",
    "Real-style Codex prompt fixture is not covered"
  ]
}
```

## Objective

Distinguish active Codex update choice menus from passive update banners above a usable Codex prompt.

## Scope

- Require selectable update choices before classifying terminal output as `client-update`.
- Keep real active update menus blocked and eligible for the guided skip action.
- Add deterministic fixtures for passive banner plus normal `›` prompt.

## Out of scope

- Running real Codex in CI.
- Updating Codex globally.
- Changing Claude prompt detection.

## Exit criteria

1. A passive `Update available!` banner followed by a normal Codex prompt is not classified as `client-update`.
2. Active update menus with numbered skip/update choices remain classified as `client-update`.
3. HTTP smoke proves passive banner agents expose retry registration instead of `Skip Codex Update`.

## Required checks

- `npm run test`
- `npm run smoke:http`
- `npm run smoke:docs`

## Evaluator notes

Do not promote if the detector only shrinks the capture window. The classification must depend on active update choices, not stale banner text.

## Progress log

- Seeded from real 6-repo usage review P1: Codex passive update banners were treated as active blockers and received unsafe `2` input.
- Completed: Codex update detection now requires active numbered choices, while passive banners above a normal prompt do not expose `Skip Codex Update`.
