# 2026-07-01 설치형 CLI 최초 사용자 재검토 리뷰

## 결론

이전 리뷰의 핵심 문제였던 설치형 `mair version` 버전 오염과 `mair verify`의 소비자 프로젝트 `npm run verify` 실행 문제는 해결됐다. `npm pack`으로 만든 패키지를 임시 소비자 프로젝트에 설치해 다시 확인했을 때 `mair version`은 Mina 버전 `0.1.5`를 출력했고, `mair verify`는 소비자 프로젝트의 `verify` script를 실행하지 않았다.

다만 최초 사용자가 설치 직후 확인 화면과 Web UI 첫 화면까지 따라가는 관점에서는 아직 두 가지 보완점이 남아 있다.

1. 설치형 `mair verify`의 성공 체크 detail이 실패 문장처럼 보여 사용자 신뢰를 깎는다.
2. 설치형 `mair verify`가 Web UI 정적 asset 누락을 잡지 못해, verify는 성공하지만 브라우저 첫 화면은 500이 될 수 있다.

## 검증 범위

- 현재 남아 있는 리뷰 문서와 설치형 CLI 관련 코드 재검토
- `packageVersion()` / `packageRoot()`가 소비자 프로젝트 `package.json`을 오인하지 않는지 확인
- `mair verify`가 checkout과 설치형 패키지에서 각각 어떤 검증을 수행하는지 확인
- `scripts/smoke-installed-cli.js`가 이전 회귀를 충분히 잡는지 확인
- `npm pack --dry-run`으로 배포 tarball 포함 파일 확인
- `npm pack` 결과물을 임시 소비자 프로젝트에 설치해 `mair version`, `mair verify`, `mair server start`, Web UI root 응답 확인
- 의도적으로 Web UI 정적 asset을 삭제한 설치형 패키지에서 `mair verify`와 `/` 응답을 비교
- 전체 gate 실행

## 통과 확인

- `npm run smoke:installed-cli`: 통과
- `npm run smoke:docs`: 통과
- `npm run verify`: 통과
- `npm pack --dry-run`: 통과
- 정상 설치형 패키지에서 `mair server start --port <free>` 후 `/`가 HTML을 반환함

직접 설치형 재현에서 확인한 정상 항목:

- `mair version` 출력:

```json
{
  "name": "@minasoft/mina-ai-router",
  "version": "0.1.5"
}
```

- `mair verify` 출력이 `command: "mair verify"`를 사용함
- 소비자 프로젝트에 `scripts.verify`가 있어도 해당 script가 실행되지 않음
- `scripts/smoke-installed-cli.js`가 MCP `initialize.serverInfo.version`까지 `0.1.5`로 검증함

## P2. 설치형 `mair verify`의 성공 체크 detail이 실패 문장처럼 표시된다

### 영향

첫 사용자가 설치형 CLI에서 `mair verify`를 실행하면 전체 `ok`는 `true`이고 각 체크도 `ok: true`지만, 일부 `detail` 값이 “missing” 문장으로 출력된다. 기능 검증 자체는 통과하지만, 설치 직후 확인 화면에서 사용자가 문서나 skill이 누락됐다고 오해할 수 있다.

이 문제는 특히 사용자 가이드가 설치 확인 단계에서 `mair version` 다음 `mair verify`를 안내하기 때문에 눈에 잘 띈다. 첫 실행 결과가 JSON이라 사용자는 `ok: true`와 `detail: "... missing"`을 동시에 보게 되고, 어떤 값을 믿어야 할지 판단해야 한다. 설치형 CLI의 목적이 "내 설치가 정상인지 빠르게 알려주는 것"이라면 성공 메시지는 성공처럼 읽혀야 한다.

### 재현

임시 소비자 프로젝트에 패키지 tarball을 설치하고 `mair verify`를 실행했다.

```json
{
  "ok": true,
  "command": "mair verify",
  "packageRoot": "/private/tmp/.../node_modules/@minasoft/mina-ai-router",
  "version": "0.1.5",
  "checks": [
    {
      "name": "user guide",
      "ok": true,
      "detail": "Packaged user documentation is missing."
    },
    {
      "name": "registration skill",
      "ok": true,
      "detail": "Packaged registration skill is missing."
    }
  ]
}
```

### 근거

- `apps/cli/src/index.ts:564`
  - 설치형 verify 체크 배열에서 `ok` 여부와 무관하게 `detail`에 실패 시나리오 문장을 넣고 있다.
- `apps/cli/src/index.ts:586`
  - `verifyInstallCheck()`는 `ok`에 따라 detail 문구를 바꾸지 않고 그대로 출력한다.
- `scripts/smoke-installed-cli.js:36`
  - 현재 smoke는 `verify.ok`, `verify.command`, `verify.version`만 확인한다.
  - 성공 체크 detail에 실패 표현이 들어가는지는 검증하지 않는다.

### 기대 동작

성공한 체크는 성공 상태를 설명해야 한다.

예:

- `cli dist`: `CLI dist found.`
- `mcp dist`: `MCP server dist found.`
- `http dist`: `HTTP server dist found.`
- `user guide`: `Packaged user documentation found.`
- `registration skill`: `Packaged registration skill found.`

실패한 체크만 missing/required 문장을 출력해야 한다.

### 권장 수정

`verifyInstallCheck()`를 성공/실패 detail을 분리해서 받게 하거나, 각 체크 생성 시 `ok`에 따라 메시지를 선택한다.

예:

```ts
function verifyInstallCheck(name: string, ok: boolean, okDetail: string, failDetail: string) {
  return { name, ok, detail: ok ? okDetail : failDetail };
}
```

### 필요한 테스트

`scripts/smoke-installed-cli.js`에서 설치형 `mair verify` 결과를 더 깊게 검증한다.

- 모든 `checks` 항목의 `ok === true`일 때 `detail`에 `missing`, `required`, `not found` 같은 실패 표현이 없는지 확인
- `user guide`와 `registration skill` 체크가 성공 detail을 출력하는지 확인
- 실패 케이스에서는 반대로 어떤 파일이 빠졌는지 명확히 알려주는지 확인

## P2. `mair verify`가 Web UI 정적 asset 누락을 잡지 못한다

### 영향

첫 사용자의 정상 경로는 `mair verify` 다음 `mair server start --port 3333` 후 브라우저에서 `http://127.0.0.1:3333/`를 여는 것이다. 현재 설치형 `mair verify`는 HTTP server JS 파일 존재만 확인하고, 실제 Web UI root 렌더링에 필요한 `dist/apps/http-server/src/public/index.html` 또는 asset 파일 존재는 확인하지 않는다.

그 결과 Web UI 정적 asset이 누락된 패키지에서도 `mair verify`는 `ok: true`로 통과할 수 있다. 이후 `mair server start`도 `/api/health` readiness만 보고 성공을 반환하지만, 사용자가 브라우저 첫 화면을 열면 500을 받는다. 최초 사용자는 "verify도 통과했고 server start도 성공했는데 UI가 안 열린다"는 모순적인 경험을 하게 된다.

정상 tarball에는 현재 UI asset이 들어 있으므로 지금 당장 release artifact가 깨진 것은 아니다. 문제는 설치형 self-check와 smoke가 이 중요한 사용자 경로를 방어하지 못한다는 점이다.

### 재현

설치형 패키지에서 Web UI 정적 asset만 삭제한 뒤 `mair verify`를 실행했다.

```sh
tmpdir=$(mktemp -d /tmp/mina-verify-public-XXXXXX)
npm pack --silent --pack-destination "$tmpdir"
cd "$tmpdir/consumer"
npm install "$tmpdir/<pack>.tgz" --ignore-scripts --no-audit --no-fund
pkg="$PWD/node_modules/@minasoft/mina-ai-router"
rm -rf "$pkg/dist/apps/http-server/src/public"
./node_modules/.bin/mair verify
```

실제 결과는 `ok: true`였다. 특히 `http dist`는 HTTP server JS만 보고 성공했다.

```json
{
  "name": "http dist",
  "ok": true,
  "detail": "Required for mair-http."
}
```

같은 상태에서 서버를 시작하면 readiness는 성공한다.

```json
{
  "running": true,
  "uiUrl": "http://127.0.0.1:<port>/",
  "mcpUrl": "http://127.0.0.1:<port>/mcp"
}
```

하지만 브라우저 첫 화면에 해당하는 `/`는 500을 반환한다.

```text
root_status=500
{
  "error": "React UI build is missing. Run `npm run build:ui` before starting the HTTP server."
}
```

### 근거

- `apps/cli/src/index.ts:568`
  - 설치형 verify의 `http dist` 체크는 `dist/apps/http-server/src/index.js`만 확인한다.
- `apps/http-server/src/index.ts:1230`
  - Web UI root 렌더링은 `public/index.html`을 별도로 요구한다.
- `apps/http-server/src/index.ts:1232`
  - `public/index.html`이 없으면 `React UI build is missing` 오류를 던진다.
- `scripts/smoke-installed-cli.js:36`
  - 설치형 smoke는 `mair verify`의 전체 checks를 확인하지만, Web UI root를 실제로 열지는 않는다.
- `scripts/smoke-installed-cli.js`에는 asset 누락 negative test가 없다.

### 기대 동작

설치형 `mair verify`는 첫 사용자가 바로 여는 Web UI에 필요한 최소 asset도 확인해야 한다.

필수 체크 예:

- `dist/apps/http-server/src/public/index.html`
- `dist/apps/http-server/src/public/assets/` 디렉터리
- 최소 하나 이상의 `.js` asset
- 최소 하나 이상의 `.css` asset

가능하면 설치형 smoke에서 실제 서버를 임시 포트로 시작하고 `/`가 `200 text/html`을 반환하는지 확인해야 한다. 이 테스트는 정상 패키지에서만 필요하고, 별도의 negative test로 `public/index.html` 삭제 시 `mair verify`가 `ok: false`가 되는지 확인하면 좋다.

### 권장 수정

1. `runVerify()`의 설치형 checks에 Web UI asset 체크를 추가한다.
2. `http dist` 체크 detail을 "HTTP server JS"와 "Web UI assets"로 분리한다.
3. `scripts/smoke-installed-cli.js`에 다음을 추가한다.
   - 정상 설치형 패키지에서 `mair server start --port <free>` 실행
   - `/` 요청이 200이고 HTML을 포함하는지 확인
   - `mair server stop`으로 정리
   - 별도 소비자 설치 또는 같은 설치 복사본에서 `public/index.html`을 제거한 뒤 `mair verify`가 실패하는지 확인

### 필요한 테스트

- 정상 설치형 패키지:
  - `mair verify.ok === true`
  - Web UI asset checks가 모두 `ok: true`
  - `/`가 200 HTML을 반환
- 정적 asset 누락 패키지:
  - `mair verify.ok === false`
  - 실패 체크가 `web ui assets` 또는 `public index`처럼 사용자가 이해할 수 있는 이름을 사용
  - 실패 detail이 `Run npm run build before packaging` 또는 `package is missing built Web UI assets`처럼 설치 사용자가 다음 행동을 이해할 수 있게 설명

## 현재 테스트 공백

현재 `npm run verify`는 전체적으로 통과하지만, 위 두 항목은 다음 이유로 빠져나간다.

- `scripts/smoke-installed-cli.js`는 `mair verify`의 `ok`, `command`, `version`만 확인하고 성공 detail 품질은 보지 않는다.
- 설치형 smoke는 MCP version까지 확인하지만, HTTP Web UI root를 실제로 열지 않는다.
- 설치형 verify는 HTTP server JS와 Web UI asset을 같은 사용자 기능으로 취급하지 않고, JS 존재만 확인한다.

## 개발 에이전트 수용 기준

다음 조건을 만족하면 이번 리뷰는 해결된 것으로 볼 수 있다.

- 설치형 `mair verify` 성공 결과에서 모든 성공 체크 detail이 성공 문장으로 보인다.
- 설치형 `mair verify`가 Web UI 정적 asset 누락을 실패로 보고한다.
- `scripts/smoke-installed-cli.js`가 성공 detail 품질과 Web UI asset 존재를 검증한다.
- 가능하면 설치형 smoke가 임시 포트 서버를 띄워 `/` 200 HTML 응답까지 검증한다.
- `npm run smoke:installed-cli`, `npm run smoke:docs`, `npm run verify`가 통과한다.
