# Codex prompt detection precision

```json taskmeta
{
  "id": "codex-prompt-detection-precision",
  "title": "Codex prompt detection precision",
  "order": 37,
  "status": "completed",
  "next_task_on_success": "NONE",
  "promotion_mode": "deterministic_only",
  "prompt_docs": [
    "AGENTS.md",
    "docs/reviews/2026-06-30-first-user-permission-prompt-review.md",
    "docs/product-specs/release-readiness-review-fixes.md",
    "packages/transports/src/tmux/tmux-client.ts",
    "scripts/core-tests.js",
    "scripts/smoke-http.js",
    "apps/http-server/ui/src/features/TerminalPanel.tsx"
  ],
  "required_commands": [
    "npm run test",
    "npm run smoke:http",
    "npm run smoke:docs",
    "npm run verify",
    "git diff --check main...HEAD"
  ],
  "required_files": [
    "packages/transports/src/tmux/tmux-client.ts",
    "scripts/core-tests.js",
    "scripts/smoke-http.js",
    "docs/product-specs/release-readiness-review-fixes.md",
    "state/backlog.md"
  ],
  "human_review_triggers": [
    "Codex update prompts are classified as directory trust approvals",
    "Generic enter-to-continue prompts trigger permission-required guidance",
    "Smoke coverage cannot reproduce the reviewed update prompt negative case"
  ],
  "completed_at": "2026-06-30T13:00:00+09:00"
}
```

## Objective

Prevent generic Codex startup prompts from being misclassified as directory trust approvals.

## Scope

- Remove standalone `Press enter to continue` matching from Codex directory-trust detection.
- Keep trust-specific Codex patterns such as `Do you trust the contents of this directory?` and `Yes, continue`.
- Add a core negative test for Codex update prompts.
- Add an HTTP smoke fixture that creates a tmux-backed Codex-like update prompt and verifies terminal capture does not report `trustPrompt`.

## Out of scope

- Adding a new neutral interactive-prompt state.
- Changing Claude prompt detection.
- Changing terminal modal controls beyond avoiding false trust detection.
- Starting milestone 0.3 work.

## Exit criteria

1. Codex directory trust prompts still classify as `directory-trust`.
2. Codex update prompts containing `Press enter to continue` do not classify as permission prompts.
3. Terminal capture for the update prompt fixture returns `trustPrompt: false`.
4. Required commands pass.

## Required checks

- `npm run test`
- `npm run smoke:http`
- `npm run smoke:docs`
- `npm run verify`
- `git diff --check main...HEAD`

## Evaluator notes

The goal is detector precision. Do not solve this by hiding terminal controls or by making every interactive Codex prompt permission-required.

## Progress log

- 2026-06-30: Seeded from `docs/reviews/2026-06-30-first-user-permission-prompt-review.md`.
- 2026-06-30T13:00:00+09:00: removed standalone enter-to-continue trust matching and added core/HTTP smoke negative coverage for Codex update prompts. `npm run test` and `npm run smoke:http` passed before final verification.
