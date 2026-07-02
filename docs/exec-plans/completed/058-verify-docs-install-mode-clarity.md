# Verify docs install mode clarity

```json taskmeta
{
  "id": "verify-docs-install-mode-clarity",
  "title": "Verify docs install mode clarity",
  "order": 58,
  "status": "completed",
  "next_task_on_success": "NONE",
  "promotion_mode": "deterministic_only",
  "prompt_docs": [
    "AGENTS.md",
    "docs/reviews/2026-07-01-first-user-verify-docs-review.md",
    "docs/USER-START-GUIDE.md"
  ],
  "required_commands": [
    "npm run smoke:docs",
    "git diff --check main...HEAD"
  ],
  "required_files": [
    "docs/USER-START-GUIDE.md",
    "docs/DEVELOPER-START-GUIDE.md",
    "docs/HTTP-UI-MCP.md",
    "scripts/smoke-docs.js"
  ],
  "completed_at": "2026-07-01T22:45:00+09:00"
}
```

## Objective

Clarify the difference between checkout verification and installed-package self-checks in first-user docs.

## Exit criteria

1. User Start Guide verifies a linked checkout with `mair version`.
2. Checkout full verification is documented as `npm run verify`.
3. Installed package self-check behavior remains documented for packaged CLI installs.
4. Developer and HTTP UI docs use the same checkout-versus-installed language.
5. Docs smoke asserts the separated verification language.

## Progress log

- 2026-07-01: Split User Start Guide verification into linked checkout, optional checkout suite, and installed package self-check.
- 2026-07-01: Aligned Developer Start Guide and HTTP UI docs with the same verify-mode distinction.
