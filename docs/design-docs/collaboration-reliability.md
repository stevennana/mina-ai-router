# Collaboration Reliability

Milestone 0.2 focuses on making routed agent work explainable and recoverable.

## Request Detail Is The Foundation

Before adding teams or automation, the system needs a reliable way to answer:

- who asked whom
- what prompt was sent
- what raw output came back
- how the answer was parsed
- why the request failed, if it failed
- what action the user can take next

## Capability Freshness

Agents should not be selected only by id. The router should know what each agent can do and whether that description is fresh enough to trust.

## Health Model

Agent status should reflect operational reality, not only registration presence.
Stale or missing tmux sessions should be visible before the user routes work to them.
