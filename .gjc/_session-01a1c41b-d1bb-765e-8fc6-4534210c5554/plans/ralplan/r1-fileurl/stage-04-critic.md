# Critic pass 1 (r1-fileurl) — plan-only review

## Verdict
**ITERATE** (2 blockers, 3 non-blocking caveats). Plan stays one goal, is scope-lock compliant, options A–D are honest; fixes are additive.

## Claim Checks (verified against files)
- GAME_DESIGN.md: 3행 상태 줄, 124행 `R3에 채운다.`, 130행 `사람이 index.html을 열어…` 위치 일치. 8장/9장 R1 첫 문장이 유일한 교체 대상이라는 범위 주장 정확.
- AGENTS.md 9행(실행: index.html 열기 (서버 없음), 필요하면 python3 -m http.server 8000), 13행(ES modules 코드 규칙은 실제 12~13행 구간), 25행(금지 목록 '서버')은 계획 인용과 일치.
- 단일 목표(실행법 명시), '(에이전트 제안)' 라벨 관례(GAME_DESIGN.md 5행: 라벨 = 사용자 미확정)와 부합. R1 통과 비주장(AC6) 정직.
- git status: 추적되는 .gjc/_session-*/ 상태 파일 다수가 이미 modified, untracked .gjc 디렉터리 존재. (아래 B1의 근거)

## Blockers
**B1. AC5/검증 `git diff --stat → GAME_DESIGN.md 한 파일만`은 현재 저장소에서 거짓이 된다 (testability).** 추적되는 .gjc/_session-01a1…/ 파일(ultragoal goals.json, ledger.jsonl, runtime-state.json, audit.jsonl 등)이 이미 modified이며 ralplan 실행 중 계속 바뀐다. 그대로 실행하면 AC5는 항상 실패하거나 사람이 '무시'해야 하는 모호 기준이 된다. 필수 수정: AC5·Verification을 경로 한정 명령으로 교체, 예) `git diff --name-only -- . ':(exclude).gjc'` 결과가 정확히 `GAME_DESIGN.md` 1줄, 그리고 `git diff --name-only -- AGENTS.md index.html src test` 가 빈 출력. AC2/AC3/AC4/AC6도 grep 명령으로 명시(예: `grep -c '(에이전트 제안)' GAME_DESIGN.md` 증가분, `git diff GAME_DESIGN.md | grep '^+' | grep -E '통과|passed'` 가 비어 있음, `grep -n 'python3 -m http.server 8000\|http://localhost:8000\|file://' GAME_DESIGN.md`가 8장·9장 R1 범위 줄에서만 매치).

**B2. 열린 결정 목록이 AGENTS.md 9행과의 직접 충돌을 숨긴다 (honesty).** 계획은 '8장 문안은 AGENTS.md 9행과 양립/9행의 서버 없음은 게임 서버 없음으로 읽힌다'(File-level, OPEN 3, Option D 근거 '충돌하지 않는다')고 단언한다. 그러나 AGENTS.md 9행의 1차 실행 명령은 `index.html을 브라우저로 연다 (서버 없음)`이고 python3 서버는 '필요하면'이다. 제안한 8장은 file:// 열기를 '지원하지 않는다'고 못 박아 1차 명령과 정면 상충하며, 이 9행 자체가 이번 사고의 공범(사람이 더블클릭)이다. 스코프 락 때문에 못 고치는 것은 맞지만 '양립'이라고 쓰는 것은 부정확하다. 필수 수정: (a) '양립' 단언을 '8장 문안은 9행의 보조 명령과 일치하나 1차 명령(file:// 암시, 서버 없음)과는 상충한다'로 정정, (b) OPEN 5를 신설: AGENTS.md 9행 한 줄 정정(사람 결정, 락 밖) 필요 및 정정 전까지 후속 에이전트가 AGENTS.md를 근거로 file://를 안내할 잔여 위험, (c) Risks 표에 반영. OPEN 3과 한 묶음(AGENTS.md 9·25행)으로 통합해도 무방.

## Non-blocking caveats
- C1 (possibly unclear): 8장·9장 문안의 '브라우저가 file://에서 ES module을 막아'는 일반화다. 근거는 에이전트 Chrome 관찰 1건뿐이며(요약의 canvas 첫 픽셀 투명 증거는 이 리뷰에서 재현 불가, 미검증). 규범 문안에는 'Chrome 등 브라우저가'로 한정하거나 근거 범위를 계획 요약에 명시 권고.
- C2: 서명 전 OPEN 무응답 시 '락 유지 최소 diff로 진행'과 '서명 전 커밋 금지'가 합쳐지면 산출물이 미커밋 작업트리 diff로 남는다. 이것이 의도임을 한 줄로 명시(결과 보고 상태 = 'diff 제시, 서명·커밋 대기').
- C3: 9장 R1 항목은 v1에서 서명 완료된 문장이다. (에이전트 제안) 라벨로 서명된 문장을 되돌리는 점과 1행 (v1)/3행 '서명 완료'의 일시적 불일치는 OPEN 1·4에 이미 있으므로 추가 조치 불필요, 단 라벨 제거 시점(서명 직후 같은 커밋)을 Sequencing 3~4에 못 박으면 더 명확.

## Approval Boundary
실행(executor 편집)은 B1·B2 반영 후 승인. 승인 범위: GAME_DESIGN.md 8장 및 9장 R1 첫 문장 문안 교체만. 범위 밖: AGENTS.md·코드·3행 상태 줄·10장 수정, R1 통과 선언, 커밋(서명 전).

## Summary
- Clarity: good. Verifiability: B1 (AC5 현 저장소에서 비검증 가능). Completeness: B2 (AGENTS.md 9행 충돌 미공개). Big Picture: fit, single goal. Principle/Option consistency: Option D/Driver 3 '충돌 없음' 주장이 B2로 약화. Alternatives depth: adequate (A–D, 9장만 수정은 OPEN 2로 커버). Risk/Verification rigor: human-only R1 확인 분리는 적절, 명령 구체성 보강 필요.

## Required Changes
1. B1 수정(경로 한정 git 명령 + grep 명령으로 AC 전부 기계 검증 가능화).
2. B2 수정(양립 단언 정정, OPEN 5 신설 또는 OPEN 3 확장, Risks 반영).
3. 선택: C1 문구 한정, C2 상태 명시, C3 라벨 제거 시점.
