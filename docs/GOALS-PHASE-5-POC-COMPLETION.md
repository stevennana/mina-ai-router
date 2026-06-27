# Phase 5 Goals: POC Completion

## Goal

Close the PRD by demonstrating the full target scenario and documenting what is ready, what is limited, and what should come next.

Phase 5 is not about adding many features. It is about proving the POC honestly.

## Scope

Phase 5 includes:

- final end-to-end demo
- final docs pass
- known limitations
- troubleshooting guide
- architecture summary
- decision log for TypeScript and tmux
- future transport notes
- POC completion checklist

## Non-Goals

Phase 5 does not include:

- expanding into a platform
- adding cloud features
- adding a UI
- adding agent planning
- replacing the marker protocol

## Implementation Tasks

1. Run final CLI demo with a real helper agent.
2. Run final MCP demo from Codex CLI.
3. Verify request status and history after the demo.
4. Verify developer can attach to helper session.
5. Verify timeout and failure behavior.
6. Update `docs/PROJECT.md`.
7. Update `docs/POC.md`.
8. Update `docs/PROTOCOL.md`.
9. Add troubleshooting docs if needed.
10. Write final POC report.

## Acceptance Criteria

Phase 5 passes when:

- the PRD target scenario works end-to-end.
- the final demo uses a real live helper agent session, not only `headless`.
- CLI and MCP paths both work.
- request history proves the request lifecycle.
- known limitations are documented.
- setup docs are sufficient for a new developer to repeat the demo.
- future work is separated from POC completion.

## Verification

Final demo:

```text
User asks Codex:
payment 개발사항을 보고 UI를 제안해줘.

Codex calls:
call_agent(target = "payment", task = "...")

Mina sends request to payment helper agent through tmux.
Payment helper agent answers with Mina markers.
Mina parses answer.
Codex uses answer in final recommendation.
```

The final report must include:

- commands used
- registered agents
- request IDs
- status transitions
- observed answer
- any manual intervention

## Known Risks

- real CLI agents may format or delay answers unpredictably.
- marker protocol may need one iteration after real-agent testing.
- Codex MCP configuration may differ by local environment.
