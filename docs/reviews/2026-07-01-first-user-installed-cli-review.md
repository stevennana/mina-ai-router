# 2026-07-01 최초 사용자 설치형 CLI 리뷰

## 결론

GitHub checkout에서 `npm run verify`와 임시 state 기반 서버 시작/중지는 정상 동작했다. 다만 실제 패키지를 설치한 첫 사용자 관점에서 `mair version`과 `mair verify`가 현재 작업 디렉터리의 소비자 프로젝트를 Mina 패키지로 오인하는 문제가 있다.

이 문제는 README의 설치 확인 단계(`mair version`)와 CLI help의 `mair verify` 명령을 직접 흔든다. 로컬 checkout 안에서만 테스트하면 잡히지 않는다.

## 검증 범위

- README, 사용자/개발자 시작 문서, MCP/Skill setup 문서 검토
- 임시 `MINA_ROUTER_STATE` / `MINA_SERVER_PID`로 `server start/status/health/stop` 실행
- `mair verify` 전체 실행
- `npm pack --dry-run`
- `npm pack` 결과물을 임시 소비자 프로젝트에 설치한 뒤 `mair version`, `mair verify` 실행

## 실행 결과

- `mair verify`: 통과
- 임시 state 서버 OOB 경로: 통과
  - `server start --port <free>`
  - `server status`
  - `health`
  - `server stop`
- `npm pack --dry-run`: 통과
- 설치형 CLI smoke: 아래 P1, P2 재현

## P1. 설치된 `mair version`이 Mina 버전이 아니라 소비자 프로젝트 버전을 출력한다

### 영향

첫 사용자가 `npm link` 또는 패키지 설치 후 자기 프로젝트 디렉터리에서 `mair version`을 실행하면 Mina AI Router의 버전이 아니라 현재 작업 디렉터리의 `package.json.version`이 출력될 수 있다.

README와 사용자 가이드는 설치 확인 명령으로 `mair version`을 안내한다. 이 명령이 소비자 프로젝트 버전을 출력하면 사용자는 설치된 Mina 버전을 확인할 수 없고, release/debug 정보도 오염된다. MCP `serverInfo.version`도 같은 `packageVersion()`을 쓰기 때문에 같은 위험이 있다.

### 재현

임시 소비자 프로젝트에 패키지 tarball을 설치한 뒤 실행했다.

```sh
tmpdir=$(mktemp -d /tmp/mina-pack-oob-XXXXXX)
npm pack --silent > "$tmpdir/pack-name.txt"
pack=$(cat "$tmpdir/pack-name.txt")
cd "$tmpdir"
printf '{"name":"consumer-app","version":"2.3.4"}\n' > package.json
npm install "/Users/stevenna/WebstormProjects/mina-aimesh/$pack" >/dev/null
./node_modules/.bin/mair version
```

실제 결과:

```json
{
  "name": "@minasoft/mina-ai-router",
  "version": "2.3.4"
}
```

기대 결과는 Mina 패키지 버전인 `0.1.5`다.

### 근거

- `packages/core/src/version.ts:22`
  - `findPackageJson()`가 `process.cwd()`를 `__dirname`보다 먼저 검색한다.
- `apps/cli/src/index.ts:21`
  - CLI 시작 시 `packageVersion()` 결과를 전역 `version`으로 고정한다.
- `apps/cli/src/index.ts:40`
  - `mair version`이 이 값을 그대로 출력한다.
- `packages/mcp/src/provider.ts`와 `apps/mcp-server/src/index.ts`도 `packageVersion()`을 사용한다.

### 권장 수정

- 패키지 버전 탐색에서 `process.cwd()`를 제거하고, 실행 중인 Mina 패키지 루트 기준으로만 `package.json`을 찾는다.
- 더 안전하게는 build 시점에 `package.json.version`을 주입하거나, `packages/core/src/version.ts`가 `__dirname`에서 상위로 올라가며 `name === "@minasoft/mina-ai-router"`인 `package.json`만 인정하게 한다.
- 소비자 프로젝트에 `package.json`이 있어도 `mair version`과 MCP `serverInfo.version`이 Mina 버전을 반환하는 회귀 테스트를 추가한다.

### 필요한 테스트

- 임시 디렉터리에 `{"name":"consumer-app","version":"2.3.4"}`를 만들고 패키지 tarball을 설치한다.
- `./node_modules/.bin/mair version`이 repo `package.json.version`과 같은지 확인한다.
- 가능하면 MCP initialize `serverInfo.version`도 같은 설치형 환경에서 확인한다.

## P2. 설치된 `mair verify`가 Mina 검증 대신 소비자 프로젝트의 `npm run verify`를 실행한다

### 영향

`mair help`와 개발자 가이드가 `mair verify`를 노출하지만, 설치형 CLI에서 이 명령은 현재 작업 디렉터리의 `npm run verify`를 실행한다. 소비자 프로젝트에 `verify` 스크립트가 있으면 Mina 검증이 아닌 사용자 프로젝트 검증이 성공처럼 표시되고, 스크립트가 없으면 Mina 문제가 아닌데도 실패한다.

첫 사용자가 CLI help를 따라 `mair verify`를 실행하면 설치가 잘못됐다고 오해하거나, 반대로 Mina 자체 검증이 된 줄 착각할 수 있다.

### 재현 1: 소비자 verify가 있으면 성공처럼 표시

```sh
tmpdir=$(mktemp -d /tmp/mina-pack-verify-XXXXXX)
npm pack --silent > "$tmpdir/pack-name.txt"
pack=$(cat "$tmpdir/pack-name.txt")
cd "$tmpdir"
cat > package.json <<'JSON'
{"name":"consumer-app","version":"2.3.4","scripts":{"verify":"node -e \"console.log('consumer verify ran')\""}}
JSON
npm install "/Users/stevenna/WebstormProjects/mina-aimesh/$pack" >/dev/null
./node_modules/.bin/mair verify
```

실제 결과:

```json
{
  "ok": true,
  "command": "npm run verify"
}
```

### 재현 2: 소비자 verify가 없으면 실패

```text
Command failed: npm run verify
npm error Missing script: "verify"
```

### 근거

- `apps/cli/src/index.ts:45`
  - CLI help에 공개된 `verify` 명령으로 진입한다.
- `apps/cli/src/index.ts:541`
  - `runVerify()`가 cwd를 지정하지 않고 `npm run verify`를 실행한다.
- `docs/DEVELOPER-START-GUIDE.md:78`
  - 개발자 유용 명령에도 `mair verify`가 안내된다.

### 권장 수정

둘 중 하나로 명확히 정리해야 한다.

1. `mair verify`를 Mina checkout 전용 개발 명령으로 유지한다면:
   - Mina 패키지 루트를 찾아 그 cwd에서 `npm run verify`를 실행한다.
   - 설치형 패키지에서 소스/테스트가 없으면 명확히 "checkout에서만 실행 가능"이라고 실패한다.
   - help와 문서에 해당 제약을 표시한다.

2. 설치형 사용자 명령으로 유지한다면:
   - `npm run verify` 대신 설치 상태, dist, skill, server readiness, tmux availability 정도를 검사하는 lightweight doctor 성격으로 바꾼다.
   - 소비자 프로젝트의 npm scripts를 실행하지 않는다.

### 필요한 테스트

- 소비자 프로젝트에 `verify` 스크립트가 있어도 `mair verify`가 그 스크립트를 실행하지 않는지 확인한다.
- 소비자 프로젝트에 `verify` 스크립트가 없어도 오류 메시지가 Mina 기준으로 설명되는지 확인한다.
- 문서가 `npm run verify`와 `mair verify`의 용도를 분리해서 안내하는지 `smoke:docs`에 추가한다.
