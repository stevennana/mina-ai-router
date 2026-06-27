# Mina Agent Router Protocol

Each routed request gets a generated request id such as `mar-lx9-1`.

The target agent receives a prompt envelope containing:

- request id
- source agent
- target agent
- task text
- answer expectations
- response markers

The target agent must wrap the final answer exactly like this:

```text
<<<MINA_AGENT_RESPONSE_START mar-example>>>
Answer content goes here.
<<<MINA_AGENT_RESPONSE_END mar-example>>>
```

The router captures terminal/session output and extracts only the text between those markers.

When terminal capture contains both the prompt example and the real answer, the parser uses the last complete marker pair for the request id.

Placeholder bodies are not accepted as real answers:

- `...`
- `[your answer]`
