# Guided bootstrap actions

```json taskmeta
{
  "id": "guided-bootstrap-actions",
  "title": "Guided bootstrap actions",
  "order": 66,
  "status": "completed",
  "next_task_on_success": "real-cli-release-gate-docs",
  "prompt_docs": [
    "AGENTS.md",
    "docs/reviews/2026-07-02-real-cli-webui-multi-agent-followup-review.md",
    "docs/design-docs/agent-bootstrap-reliability.md",
    "docs/USER-START-GUIDE.md"
  ],
  "required_commands": [
    "npm run build",
    "npm run smoke:http",
    "npm run smoke:docs"
  ],
  "required_files": [
    "apps/http-server/src/index.ts",
    "apps/http-server/ui/src/features/TerminalPanel.tsx",
    "apps/http-server/ui/src/domain/types.ts",
    "scripts/smoke-http.js"
  ],
  "human_review_triggers": [
    "UI still exposes only generic Send Enter for known bootstrap blockers",
    "API terminal payload lacks prompt-specific action metadata",
    "Automation policy allows broad or unsafe approvals"
  ]
}
```

## Objective

Turn the documented guided bootstrap loop into product behavior by exposing prompt-specific action metadata and UI controls.

## Scope

- Add terminal payload metadata for known safe or guided actions, such as project trust approval, Mina MCP verification command approval, safe Codex update skip, and retry self-registration.
- Replace or supplement generic `Send Enter` with prompt-specific buttons where Mina has classified the prompt.
- Introduce a small approval policy vocabulary: `manual`, `guided`, and `auto-safe`.
- Keep broad filesystem or arbitrary command approvals manual.
- Extend HTTP smoke to assert prompt-specific action metadata and rendered UI strings are present.

## Out of scope

- Fully autonomous first-run setup across all possible Claude/Codex prompts.
- Removing manual terminal input.
- Changing request routing behavior.

## Exit criteria

1. Known bootstrap blockers return action metadata with labels, input kind, and safety policy.
2. The Terminal panel renders prompt-specific actions instead of relying only on `Send Enter`.
3. Unsafe or unknown prompts remain manual and explain why.

## Required checks

- `npm run build`
- `npm run smoke:http`
- `npm run smoke:docs`

## Evaluator notes

Do not promote if action metadata exists only in docs. The Web UI and HTTP smoke must prove the guided action surface.

## Progress log

- Seeded from follow-up review P2: approval automation is only documented and UI still exposes raw manual terminal action.
- Completed: terminal payloads include prompt-specific action metadata and the Terminal panel renders guided/manual action controls for classified bootstrap blockers.
