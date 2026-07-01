# First user UI port and terminal affordances

```json taskmeta
{
  "id": "first-user-ui-port-terminal-affordances",
  "title": "First user UI port and terminal affordances",
  "order": 34,
  "status": "completed",
  "next_task_on_success": "NONE",
  "promotion_mode": "deterministic_only",
  "prompt_docs": [
    "AGENTS.md",
    "docs/reviews/2026-06-30-fresh-real-user-review.md",
    "docs/product-specs/release-readiness-review-fixes.md",
    "docs/HTTP-UI-MCP.md",
    "apps/http-server/ui/src/features/CommandBar.tsx",
    "apps/http-server/ui/src/features/Inspector.tsx",
    "apps/http-server/ui/src/features/Menus.tsx",
    "apps/http-server/ui/src/App.tsx",
    "scripts/smoke-http.js"
  ],
  "required_commands": [
    "npm run smoke:http",
    "npm run smoke:docs",
    "npm run verify",
    "git diff --check main...HEAD"
  ],
  "required_files": [
    "apps/http-server/ui/src/features/CommandBar.tsx",
    "apps/http-server/ui/src/features/Inspector.tsx",
    "apps/http-server/ui/src/features/Menus.tsx",
    "scripts/smoke-http.js",
    "docs/product-specs/release-readiness-review-fixes.md",
    "state/backlog.md"
  ],
  "human_review_triggers": [
    "The UI still displays a hard-coded default port while serving on a non-default port",
    "Non-tmux agents still expose an enabled Open Terminal action without clear unavailable state",
    "The smoke coverage cannot prove the reviewed non-default port and non-tmux terminal-affordance regressions"
  ],
  "completed_at": "2026-06-30T11:30:00+09:00"
}
```

## Objective

Fix the fresh real-user review UI findings so first-time operators see one authoritative server port and only valid terminal controls.

## Scope

- Derive the top command bar port chip from the authoritative `state.mcpUrl` or hide the chip if the URL cannot be parsed.
- Keep the MCP URL chip as the primary copyable connection signal.
- Make selected-agent inspector terminal controls transport-aware:
  - tmux agents can open terminal preview and copy attach commands;
  - non-tmux agents show a clear unavailable state and do not render an enabled `Open Terminal` action that implies direct terminal control.
- Make agent context-menu terminal actions transport-aware or route non-tmux agents to the same unavailable terminal modal, without opening the Ask dialog.
- Add deterministic smoke coverage for a non-default MCP URL/port label and non-tmux terminal affordance.

## Out of scope

- Redesigning the command bar layout.
- Adding live terminal support for non-tmux transports.
- Changing request routing, MCP setup, or agent registration behavior.
- Addressing the lower-priority empty create-agent form validation polish from the review notes.

## Exit criteria

1. With a non-default server URL such as `http://127.0.0.1:34517/mcp`, the UI no longer displays `Port 3333`; it displays the derived port or only the authoritative MCP URL.
2. The Connect Agent guide and command bar remain consistent about the MCP URL.
3. For a headless/non-tmux selected agent, the inspector attach section clearly says direct terminal control is unavailable and does not expose an enabled misleading `Open Terminal` button.
4. Tmux agents still expose terminal preview and attach-copy affordances.
5. Deterministic smoke coverage fails on the reviewed regressions and passes after the fix.
6. Required commands pass.

## Required checks

- `npm run smoke:http`
- `npm run smoke:docs`
- `npm run verify`
- `git diff --check main...HEAD`

## Evaluator notes

Keep this task narrow. The reviewed product risk is first-user confusion in the Web UI, not a deeper transport abstraction change. Prefer a small UI helper for deriving the port and simple transport-aware rendering over broad modal/menu refactors.

## Progress log

- 2026-06-30: Seeded from `docs/reviews/2026-06-30-fresh-real-user-review.md` Findings 1 and 2.
- 2026-06-30T11:30:00+09:00: derived the command-bar port label from the authoritative MCP URL, made inspector/context-menu terminal affordances transport-aware, and added HTTP smoke assertions for the reviewed regressions. Required checks passed through `npm run smoke:http` before final verification.
