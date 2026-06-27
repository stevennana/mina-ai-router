# Tmux Smoke Test

Use this smoke test after implementing or changing `TmuxTransport`.

```sh
npm run build
npm run smoke:tmux
```

The script creates an isolated tmux session with a tiny shell responder, registers it as a Mina helper agent through a temporary state file, calls `mar ask`, checks marker parsing, and then kills only that temporary smoke session.

Manual equivalent:

```sh
tmux new-session -d -s mina-router-smoke '/bin/sh'
mar register smoke --agent shell --transport tmux --session mina-router-smoke --root /tmp
mar ask smoke "return a marker response"
tmux kill-session -t mina-router-smoke
```

For real helper agents, start or attach to the target session yourself:

```sh
tmux new-session -d -s payment -c ~/work/payment
tmux attach -t payment
mar register payment --agent gemini --transport tmux --session payment --root ~/work/payment
mar ask payment "현재 payment flow를 요약해줘."
```
