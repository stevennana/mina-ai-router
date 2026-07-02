# Real CLI contract smoke

```json taskmeta
{
  "id": "real-cli-contract-smoke",
  "title": "Real CLI contract smoke",
  "order": 63,
  "status": "completed",
  "next_task_on_success": null,
  "prompt_docs": [
    "docs/product-specs/release-readiness-review-fixes.md",
    "package.json"
  ],
  "required_commands": [
    "npm run smoke:real-cli-contract",
    "npm run smoke:docs"
  ]
}
```

## Objective

Add a deterministic, opt-in contract check for real installed Codex/Claude clients without making CI depend on local operator tools.

## Exit criteria

1. `npm run smoke:real-cli-contract` exists.
2. The command skips by default.
3. With `MINA_REAL_CLI_SMOKE=1`, it probes available real clients and requires `mina-ai-router` in `<client> mcp list`.

## Progress log

- Completed: added the skipped-by-default real CLI contract smoke and documented it in the release-readiness contract.
