# 2026-07-01 최초 사용자 OOB 재검증 리뷰

## 결론

최초 사용자가 문서대로 `mair setup` 이후 CLI로 시작하는 경로는 이전 리뷰 사항이 보완되어 정상 동작하는 것으로 확인했다. 다만 웹 UI/API에서 에이전트를 생성하는 첫 사용 흐름과 개발자가 검증 명령을 실행하는 흐름에 아직 보완이 필요하다.

## 검증 범위

- README, 운영 문서, 사용자 문서의 OOB 흐름 재확인
- `mair setup codex --project ...` 이후 `mair codex ...` 연계 흐름 재검증
- HTTP/Web UI 에이전트 생성 API를 실제 임시 서버와 fake Codex로 실행
- 스모크 테스트 실행

## 실행한 검증

- `npm run smoke:docs`: 통과
- `npm run smoke:http`: 통과
- `npm run smoke:cli-controls`: 실패. 아래 P2 항목에 기록
- HTTP create-agent 재현: 임시 서버와 fake Codex 실행 후 `/api/agents/create-tmux` 호출

## P1. Web UI 에이전트 생성은 등록 프롬프트를 보내고도 bootstrapStatus를 `created`로 남긴다

### 영향

최초 사용자가 웹 UI/API에서 Codex 에이전트를 생성하면 응답은 `registration prompt sent to agent`라고 말하지만, 저장된 에이전트 상태는 `bootstrapStatus: "created"`로 남는다. 같은 흐름의 CLI는 `registration-pending`으로 저장하므로 UI/API와 CLI의 상태 모델이 갈라진다.

이 상태에서는 사용자가 "등록 프롬프트가 전송된 상태"와 "아직 생성만 된 상태"를 구분하기 어렵다. `/api/state`와 `mair agent <id>`는 route-ready가 아니라고 표시하지만 bootstrap 단계가 진행 중임을 직접 보여주지 못해, 첫 사용자가 다음 조치를 판단하기 어렵다.

### 기대 동작

Web UI/API도 CLI와 동일하게 prompt 전송 직후 다음 상태를 저장해야 한다.

- `bootstrapStatus: "registration-pending"`
- `registrationStatus: "pending"`
- 응답의 `agent`와 `/api/state`의 에이전트 상태가 같은 값을 보여야 한다.

### 필요한 테스트

`scripts/smoke-http.js`에 Web UI/API의 기본 생성 경로를 추가해야 한다.

- MCP가 configured 상태인 fake Codex 사용
- `sendRegistrationPrompt` 기본값 또는 `true`
- 응답 `registration === "registration prompt sent to agent"` 확인
- 응답 `agent.bootstrapStatus === "registration-pending"` 확인
- `/api/state` 또는 agent detail에서도 동일 상태 확인

## P2. `smoke:cli-controls`가 고정 포트 충돌에 취약해서 첫 개발자 검증이 실패할 수 있다

### 영향

GitHub에서 프로젝트를 처음 받은 개발자가 README/문서의 검증 명령을 실행할 때 `npm run smoke:cli-controls` 또는 이를 포함하는 verify 계열 명령이 로컬 포트 점유 상태에 따라 실패할 수 있다.

### 기대 동작

테스트용 helper server는 현재 머신의 점유 포트에 영향을 받지 않도록 동적 포트를 사용해야 한다. 포트 충돌이 발생해도 5초 timeout 대신 즉시 원인을 드러내야 한다.

### 권장 수정

- helper server용 포트를 OS가 할당한 free port로 받거나, 사전에 사용 가능한 loopback port를 탐색한다.
- `EADDRINUSE`가 발생하면 child stderr를 수집해 즉시 실패 원인을 출력한다.
- `occupied port` 시나리오 자체를 테스트하려면, 먼저 동적으로 비어 있는 포트를 확보한 뒤 그 포트를 helper가 점유하도록 구성한다.

## 현재 리뷰 디렉터리 상태

이번 문서가 개발 에이전트가 확인해야 할 최신 리뷰 문서다. 이전 리뷰 문서는 삭제 대상이며, 해결 완료 항목과 이번 신규 리뷰 항목을 섞지 않기 위해 이 문서만 남겨야 한다.
