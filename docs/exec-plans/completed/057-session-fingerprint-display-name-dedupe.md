# Session fingerprint display name dedupe

```json taskmeta
{
  "id": "session-fingerprint-display-name-dedupe",
  "title": "Session fingerprint display name dedupe",
  "order": 57,
  "status": "completed",
  "next_task_on_success": "verify-docs-install-mode-clarity",
  "promotion_mode": "deterministic_only",
  "prompt_docs": [
    "AGENTS.md",
    "docs/reviews/2026-07-01-first-user-verify-docs-review.md",
    "packages/core/src/registry.ts"
  ],
  "required_commands": [
    "npm run test",
    "git diff --check main...HEAD"
  ],
  "required_files": [
    "packages/core/src/registry.ts",
    "scripts/core-tests.js",
    "docs/product-specs/release-readiness-review-fixes.md"
  ],
  "completed_at": "2026-07-01T22:40:00+09:00"
}
```

## Objective

Keep route ids and visible names aligned when duplicate registrations target the same tmux session fingerprint.

## Exit criteria

1. Fingerprint dedupe still preserves the existing canonical id.
2. A later duplicate registration id does not overwrite the canonical display name.
3. Registration warnings continue to explain the fingerprint collision.
4. Core tests cover the duplicate-session display-name policy.

## Progress log

- 2026-07-01: Updated registry merge policy to preserve the existing name during fingerprint-id collisions.
- 2026-07-01: Added core assertions that a `payment-copy` duplicate keeps canonical id and name as `payment`.
