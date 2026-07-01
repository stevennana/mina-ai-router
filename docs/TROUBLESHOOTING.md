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

## `mair server start` Fails on an Occupied Port

`mair server start` waits for the Mina `/api/health` endpoint before it reports success. If the port is already occupied, the command should fail with a bind diagnostic such as `EADDRINUSE` and point at the server log.

Useful checks:

```sh
mair server status
lsof -nP -iTCP:3333 -sTCP:LISTEN
cat data/mair-server.log
```

Stop the process that owns the port, or start Mina on another port:

```sh
mair server start --port 34333
```

## Stale or Non-Mina Pid File

If `MINA_SERVER_PID` points at a live process that is not Mina, CLI live reads and writes stop with a stale/non-Mina pid-file diagnostic. This prevents split-brain writes against the local state file.

Safe recovery:

```sh
mair server status
rm data/mair-server.json
mair server start --port 3333
```

Use the custom pid path if you set one:

```sh
rm "$MINA_SERVER_PID"
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
mair request <request-id>
mair attach payment
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
mair agents
mair agent payment
mair agent delivery
```

If needed, register with an explicit tmux pane target:

```sh
mair register payment --agent gemini --transport tmux --session payment --target payment:0.0 --root ~/work/payment
```

## Reset Local State

Runtime JSON state is ignored by git.

```sh
rm data/router-state.json
```

Use this carefully; it deletes local registrations and request history.
