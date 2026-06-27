# Phase 4 Goals: Multi-Agent Operations

## Goal

Support multiple registered helper agents in separate project sessions without turning Mina into an autonomous multi-agent framework.

This phase makes the target scenario practical for `shopping-service`, `payment`, and `delivery`.

## Scope

Phase 4 includes:

- multiple helper agent registration
- clear agent metadata
- status visibility
- request history by target agent
- attach/help commands for operator workflows
- better prompt envelopes for cross-project questions
- guardrails against sending to the wrong session

## Non-Goals

Phase 4 does not include:

- automatic task decomposition
- voting among agents
- autonomous cross-agent planning
- shared memory across projects
- project indexing
- web UI

## Implementation Tasks

1. Support multiple named agents such as `payment` and `delivery`.
2. Add status fields useful for humans: transport availability, session existence, last request status.
3. Add `mar agent <id>` detail command if needed.
4. Add `mar attach <id>` or document direct `tmux attach -t <session>`.
5. Add request filtering by target agent.
6. Add prompt envelope fields for source project and target project.
7. Validate target agent existence before sending.
8. Detect obvious session mismatch or missing tmux session.
9. Document common workflows for registering and using multiple helper agents.

## Acceptance Criteria

Phase 4 passes when:

- at least two helper agents can be registered.
- `mar agents` shows both agents with useful status.
- `mar ask payment "..."` routes only to the payment session.
- `mar ask delivery "..."` routes only to the delivery session.
- request history distinguishes payment and delivery requests.
- a developer can attach to each helper session and see the routed prompt.
- missing sessions produce clear errors with next steps.
- no code path assumes a single hard-coded helper agent.

## Verification

```sh
tmux new-session -d -s payment -c ~/work/payment
tmux new-session -d -s delivery -c ~/work/delivery
mar register payment --agent gemini --transport tmux --session payment --root ~/work/payment
mar register delivery --agent claude --transport tmux --session delivery --root ~/work/delivery
mar agents
mar ask payment "payment flow를 요약해줘."
mar ask delivery "delivery flow를 요약해줘."
mar requests
```

The captured answers must come from the intended sessions.

## Known Risks

- tmux target naming can be ambiguous if users create duplicate or similarly named sessions.
- helper agents may ignore marker instructions.
- terminal scrollback can include old marker responses if request IDs are not unique and specific.
