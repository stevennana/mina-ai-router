# Project cwd MCP visibility

```json taskmeta
{
  "id": "project-cwd-mcp-visibility",
  "title": "Project cwd MCP visibility",
  "order": 64,
  "status": "completed",
  "next_task_on_success": "safe-codex-update-skip",
  "prompt_docs": [
    "AGENTS.md",
    "docs/product-specs/release-readiness-review-fixes.md",
    "docs/product-specs/release-readiness-review-fixes.md",
    "docs/MCP-CLIENT-SETUP.md"
  ],
  "required_commands": [
    "npm run test",
    "npm run smoke:cli-controls",
    "npm run smoke:http",
    "npm run smoke:docs"
  ],
  "required_files": [
    "apps/cli/src/index.ts",
    "apps/http-server/src/index.ts",
    "scripts/smoke-cli-controls.js",
    "scripts/smoke-http.js"
  ],
  "human_review_triggers": [
    "MCP setup still verifies from Mina server cwd instead of the selected project root",
    "Claude project-specific MCP visibility cannot be represented in fake-client smoke",
    "Web UI create-agent and CLI visible-agent preflight diverge"
  ]
}
```

## Objective

Make MCP setup, doctor, CLI visible-agent preflight, and Web UI create-agent preflight verify the client profile from the target project directory, not from the Mina process cwd.

## Scope

- Pass the selected `projectRoot` as cwd to Codex/Claude MCP `get` and `list` command execution where project context matters.
- Keep the configured URL and list-visible checks from task 059.
- Add fake-client smoke coverage where Claude `mcp list` only reports `mina-ai-router` when cwd equals the requested project root.
- Ensure Web UI create-agent checks use the selected project root.

## Out of scope

- Launching a real Claude session in automated CI.
- Changing Claude's global/profile configuration model.
- Adding guided approval UI actions.

## Exit criteria

1. `mair setup claude --project <root>`, `mair doctor --client claude --project <root>`, `mair claude --root <root>`, and Web UI Claude create-agent run MCP visibility checks from `<root>`.
2. A fake-client regression fails if `claude mcp list` is executed from the wrong cwd.
3. Existing Codex setup and configured-preflight paths still pass.

## Required checks

- `npm run test`
- `npm run smoke:cli-controls`
- `npm run smoke:http`
- `npm run smoke:docs`

## Evaluator notes

Do not promote if only CLI setup uses project cwd. Web UI create-agent and existing-config detection must use the same project-root context.

## Progress log

- Seeded from follow-up review P1: Claude MCP setup/doctor still does not prove target project session visibility.
- Completed: CLI setup/doctor, visible-agent preflight, and Web UI create-agent MCP visibility checks now run from the selected project root. Fake-client smoke fails if Claude `mcp list` is evaluated from the wrong cwd.
