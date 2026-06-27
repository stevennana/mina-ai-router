# Two Codex CLI Test

This guide sets up the concrete test case:

- main project: `/Users/stevenna/WebstormProjects/minasoftai`
- helper project: `/Users/stevenna/PycharmProjects/mina-ralph-loop-bootstrap-nextjs`
- both sides use Codex CLI
- Mina Agent Router bridges main Codex to helper Codex through tmux and MCP

## 1. Build Mina Agent Router

```sh
cd /Users/stevenna/WebstormProjects/mina-aimesh
npm run build
node dist/apps/cli/src/index.js serve --port 3333
```

Open:

```text
http://127.0.0.1:3333/
```

## 2. Prepare the Helper Codex Session

Use the UI `Create tmux Session & Register` button, or run:

```sh
node dist/apps/cli/src/index.js setup-codex-pair
```

By default this:

- creates or reuses tmux session `mina-ralph-codex`
- starts `codex --no-alt-screen` in `/Users/stevenna/PycharmProjects/mina-ralph-loop-bootstrap-nextjs`
- registers helper agent id `ralph`
- prints the exact `codex mcp add ...` command to run

Attach to the helper session:

```sh
tmux attach -t mina-ralph-codex
```

Make sure helper Codex is ready to receive prompts. Detach with `Ctrl-b` then `d`.

## 3. Install Mina HTTP MCP into Codex CLI

Run:

```sh
codex mcp remove mina-agent-router
codex mcp add mina-agent-router --url http://127.0.0.1:3333/mcp
```

Check:

```sh
codex mcp list
```

## 4. Start Main Codex in minasoftai

```sh
cd /Users/stevenna/WebstormProjects/minasoftai
codex --no-alt-screen
```

Ask main Codex something like:

```text
Mina Agent Router의 call_agent 도구로 target=ralph 에게 질문해줘.
질문: mina-ralph-loop-bootstrap-nextjs 프로젝트가 어떤 목적의 프로젝트인지 요약하고,
minasoftai에서 재사용할 수 있는 구조나 아이디어가 있는지 알려줘.
```

Expected flow:

```text
main Codex in minasoftai
  -> MCP call_agent(target = "ralph")
  -> Mina Agent Router
  -> tmux session mina-ralph-codex
  -> helper Codex in mina-ralph-loop-bootstrap-nextjs
  -> marker-wrapped answer
  -> main Codex receives answer
```

## 5. Inspect Status

From Mina repo:

```sh
cd /Users/stevenna/WebstormProjects/mina-aimesh
node dist/apps/cli/src/index.js agents
node dist/apps/cli/src/index.js requests --target ralph
```

Attach to helper:

```sh
tmux attach -t mina-ralph-codex
```

## Troubleshooting

If main Codex cannot see the tool:

```sh
codex mcp list
codex mcp remove mina-agent-router
codex mcp add mina-agent-router --url http://127.0.0.1:3333/mcp
```

If helper Codex does not answer, attach to the tmux session and check whether it is waiting for login, approval, or input:

```sh
tmux attach -t mina-ralph-codex
```
