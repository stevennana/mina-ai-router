# Real CLI release gate docs

```json taskmeta
{
  "id": "real-cli-release-gate-docs",
  "title": "Real CLI release gate docs",
  "order": 67,
  "status": "completed",
  "next_task_on_success": null,
  "prompt_docs": [
    "AGENTS.md",
    "docs/reviews/2026-07-02-real-cli-webui-multi-agent-followup-review.md",
    "docs/product-specs/release-readiness-review-fixes.md",
    "docs/USER-START-GUIDE.md"
  ],
  "required_commands": [
    "npm run smoke:docs",
    "npm run smoke:real-cli-contract"
  ],
  "required_files": [
    "docs/product-specs/release-readiness-review-fixes.md",
    "docs/USER-START-GUIDE.md",
    "docs/HTTP-UI-MCP.md",
    "scripts/smoke-real-cli-contract.js",
    "scripts/smoke-docs.js"
  ],
  "human_review_triggers": [
    "Release docs imply npm run verify proves real installed Claude/Codex flows",
    "Real CLI smoke skip message is too easy to miss",
    "The opt-in command is not documented near release readiness guidance"
  ]
}
```

## Objective

Make the real installed CLI contract an explicit local release gate without forcing CI or default verification to depend on operator-specific Codex/Claude accounts.

## Scope

- Document the two-step local release gate: `npm run verify` plus `MINA_REAL_CLI_SMOKE=1 npm run smoke:real-cli-contract`.
- Make the default skip message clear that real CLI flow is not proven until the opt-in command passes on a machine with the relevant clients configured.
- Extend docs smoke to protect the release checklist language.
- Keep default `npm run verify` deterministic and account-free.

## Out of scope

- Adding real Claude/Codex account requirements to CI.
- Treating skipped optional smoke as a failure in default verify.
- Fixing project-cwd MCP visibility; that belongs to task 064.

## Exit criteria

1. Release/readiness docs state that real CLI flow is not fixed until opt-in real CLI smoke passes locally.
2. `npm run smoke:real-cli-contract` skip output is explicit and actionable.
3. Docs smoke protects the release gate wording.

## Required checks

- `npm run smoke:docs`
- `npm run smoke:real-cli-contract`

## Evaluator notes

Do not promote if docs merely mention the script. They must explain what default verify proves and what the opt-in real CLI gate proves.

## Progress log

- Seeded from follow-up review P2: opt-in real CLI smoke failure is easy to miss because default verify can stay green.
- Completed: user/release docs and the default skip output now state that default verification is account-free and does not prove installed real CLI readiness until `MINA_REAL_CLI_SMOKE=1 npm run smoke:real-cli-contract` passes locally.
