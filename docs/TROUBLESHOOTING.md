# Troubleshooting

## `tmux binary is not available`

Install tmux or set `MINA_TMUX_BIN` to the tmux binary path.

```sh
command -v tmux
export MINA_TMUX_BIN=/opt/homebrew/bin/tmux
```

## MCP and CLI See Different Agents

They are probably using different state files.

Set the same `MINA_ROUTER_STATE` for both processes:

```sh
export MINA_ROUTER_STATE=/absolute/path/to/router-state.json
```

## `call_agent` Times Out

Common causes:

- the helper agent is not running inside the tmux session
- the helper agent did not follow the response marker instruction
- the tmux session target is wrong
- the response markers wrapped across terminal lines in an unusual way

Useful checks:

```sh
tmux ls
tmux capture-pane -t payment -p -J -S -200
mar request <request-id>
mar attach payment
```

## Answer Is `...` or `[your answer]`

This should be rejected by the parser. If it appears again, the parser is likely reading the prompt example instead of the helper answer.

Run:

```sh
npm test
npm run smoke:tmux
```

## Wrong Agent Receives the Prompt

Check the registered session ids:

```sh
mar agents
mar agent payment
mar agent delivery
```

If needed, register with an explicit tmux pane target:

```sh
mar register payment --agent gemini --transport tmux --session payment --target payment:0.0 --root ~/work/payment
```

## Reset POC State

Runtime JSON state is ignored by git.

```sh
rm data/router-state.json
```

Use this carefully; it deletes local registrations and request history.
