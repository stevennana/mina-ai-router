# Claude session MCP visibility

```json taskmeta
{
  "id": "claude-session-mcp-visibility",
  "title": "Claude session MCP visibility",
  "order": 59,
  "status": "completed",
  "next_task_on_success": "codex-update-prompt-bootstrap-blocker",
  "prompt_docs": [
    "docs/reviews/2026-07-02-real-cli-webui-multi-agent-review.md",
    "docs/MCP-CLIENT-SETUP.md",
    "docs/product-specs/release-readiness-review-fixes.md"
  ],
  "required_commands": [
    "npm run test",
    "npm run smoke:docs"
  ]
}
```

## Objective

Close the real Claude session gap where shell-level MCP setup could look configured while the actual client list did not expose Mina.

## Exit criteria

1. Setup, doctor, CLI visible-agent preflight, and Web UI create-agent preflight require `mina-ai-router` to appear in `<client> mcp list`.
2. MCP setup docs tell users to verify both `mcp get` and `mcp list`.
3. Fake CLI smokes cover `mcp list` so this contract does not regress.

## Progress log

- Completed: MCP detection now checks list visibility before accepting an existing configured URL, setup/doctor verify `mcp list`, and docs describe the real-session visibility requirement.
