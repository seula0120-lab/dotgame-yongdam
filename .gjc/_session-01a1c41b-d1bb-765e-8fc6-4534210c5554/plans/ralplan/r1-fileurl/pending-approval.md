# R1-fileurl 계획 (개정 2): GAME_DESIGN.md가 "게임을 어떻게 실행하는가"를 말하게 한다

## Summary
사람이 index.html을 더블클릭(file://)하면 빈 화면이 나온다. 브라우저가 file://에서 `<script type="module">`을 CORS로 막기 때문이다. http로는 정상 동작한다(에이전트 Chrome 확인; file://에서는 canvas 첫 픽셀이 투명). 확인된 브라우저는 Chrome뿐이다. 원인은 코드 버그가 아니라 기획서의 실행 전제 부재다. 목표는 하나: **GAME_DESIGN.md가 게임 실행법을 말하게 한다.** 변경은 8장과 9장 "R1 항목" 첫 문장뿐이다. 코드·AGENTS.md는 건드리지 않는다.

**R1은 통과하지 않았다.** 사람의 R1-1~R1-5 확인 결과는 아직 기록되지 않았다(사람의 직전 확인 보고에 채워지지 않은 템플릿 자리표시자가 남아 있었다). 이 계획은 R1 통과를 주장하지 않는다. 원장 마지막 기록(critic_verdict OKAY, classificationEventId 1d17a4ee-4eaa-41f6-bc2b-a3f1ed6dbc1c, "AGENTS.md 사람 브라우저 확인 R1-1..R1-5만 남음, 소스는 7cf09f8 이후 불변")은 그대로이고 G001은 checkpointed blocked, goal은 paused다. HEAD=7cf09f8 (goal-1), 직전 582f809 (design-v1).

## Intent Diff
- 사람의 의도: 기획서대로 하면 열린다. 기획서가 애매하면 기획서를 먼저 고치고 사람에게 보여준 뒤 진행(AGENTS.md 개요).
- 현재: 실행 환경 전제가 없어 "index.html을 연다"가 file://로 읽혔다.
- 변경 후: 8장이 실행 전제(http 정적 서버)를 못 박고, 9장 R1 문장이 8장을 가리키며 file:// 빈 화면은 실패가 아님을 알린다.
- 스코프 락(사람 지시): GAME_DESIGN.md 8장 + 9장 "R1 항목" 문구만. AGENTS.md, index.html, src/*, test/* 수정 금지.

## 애매했던 GAME_DESIGN.md 항목과 이유
1. **8장 "기술 스펙"(122~124행) = "R3에 채운다."** — R1 검증 시점에 실행 환경 전제가 정의되지 않았다. 근본 원인.
2. **9장 R1 항목(130행) "사람이 index.html을 열어 …"** — 파일을 직접 여는 것(file:// 더블클릭)을 함의한다. 사람을 빈 화면으로 보낸 문장.
3. **R1-3 "논리 256x192, 표시 768x576"** — 캔버스가 뜬다고 전제한다. file://에서는 모듈 로드 실패로 확인 자체가 불가능했다. 문구는 바꾸지 않는다(1·2번 수정으로 전제 충족).
4. **2.1 / 4장** — 해상도·표시 규칙만 있고 실행 방식은 말하지 않는다. 8장이 담당하므로 수정 불필요.
5. (잔여, 이 락으로 수정 불가) **AGENTS.md 9행**의 주 명령이 "index.html을 브라우저로 연다 (서버 없음)"이고 서버는 "필요하면"일 뿐이다. 그리고 25행/10장의 "서버" 금지 표현. OPEN 3·5 참고.

## Decision Drivers (상위 3)
1. 기획서가 유일한 기준: 사람이 읽은 대로 실행하면 열려야 한다.
2. 스코프 락과 서명 절차: 지정된 장만 수정, 서명 전에는 "(에이전트 제안)".
3. 정직한 충돌 공개: AGENTS.md와 기획서 문안이 어긋나는 곳은 "양립"이라 말하지 않고 사람 결정으로 올린다. ES modules·의존성 0·빌드 없음은 보존.

## RALPLAN-DR 원칙
1. 기획서 우선: 코드 이전에 문서를 고친다.
2. 최소 변경: 락 밖은 열린 결정으로 올리고 조용히 건드리지 않는다.
3. 정직한 증거: 사람이 직접 보지 않은 R1은 통과라 말하지 않는다. 검증 주장은 실제 실행한 범위에 맞춘다.
4. 기술 제약 보존: ES modules/무빌드 유지.
5. 단일 목표: 실행법 명시 하나만 한다.

## Options
- **A (권고): 문서만 수정.** 8장에 실행 전제만 채우고(나머지 R3), 9장 R1 첫 문장을 8장 참조 절차로 교체.
  - 장점: 락 준수, 코드 불변이라 R1 소스 증거(7cf09f8) 유지, 변경 작음.
  - 단점: (i) 8장이 HTTP를 필수로 하고 file://을 미지원이라 못 박으므로 AGENTS.md 9행 주 명령("index.html을 브라우저로 연다 (서버 없음)")과 **충돌**한다. 기획서가 유일한 기준이라는 규칙상 기획서가 우선하지만 AGENTS.md가 후속 수정되기 전까지 두 문서가 어긋난다(OPEN 5). (ii) 8장 부분 채움이 상태 줄·"R3에 채운다"와 불일치(OPEN 1·2). (iii) 서버 금지 표현 잔여 모호성(OPEN 3).
- **B: 코드를 비모듈 script로 바꿔 file://에서도 열리게.** — 기각. AGENTS.md "ES modules" 위반, 코드는 스코프 밖, 기획서 먼저 고친다는 절차에도 반함. 통과한 구조를 흔든다.
- **C: 문서는 두고 사람에게 매번 구두로 알린다.** — 기각. 기획서가 유일한 기준이라는 원칙에 반하고 같은 함정이 반복된다.
- **D: AGENTS.md 9행도 같이 수정.** — 이번 락에서는 기각(사람 지시: 수정 금지). 단 필요성은 OPEN 5로 사람에게 올린다.

## In scope / Out of scope
In: GAME_DESIGN.md 8장 본문, 9장 "### R1 항목" 아래 첫 문장(130행).
Out(명시): AGENTS.md; index.html, src/*, test/*; GAME_DESIGN.md 1행 제목, 3행 상태 줄, 1~7장, 10장, R1-1~R1-5 본문, "나머지 수용 기준은 R2에 채운다" 줄; 서버 스크립트·package.json 등 새 파일; 일시정지/원장/ultragoal 상태 변경; R1 통과 선언.

## File-level changes (GAME_DESIGN.md만) — 모두 "(에이전트 제안)", 서명 전
### 8장(현 124행 "R3에 채운다.") 교체 제안
```
## 8. 기술 스펙

실행 환경 (에이전트 제안): 게임은 HTTP로 열어야 한다. 프로젝트 폴더에서 `python3 -m http.server 8000`을 실행하고 브라우저에서 `http://localhost:8000`을 연다. 이 서버는 파일을 내려주는 정적 서버일 뿐 게임 서버가 아니다. index.html을 더블클릭해 `file://`로 여는 방식은 지원하지 않는다. 브라우저가 `file://`에서 ES module(`<script type="module">`)을 막아 화면이 비기 때문이다. (확인한 브라우저: Chrome)

그 밖의 기술 스펙은 R3에 채운다.
```
- 정정: 이 문안은 AGENTS.md 9행과 "양립"하지 않는다. 9행 주 명령은 "index.html을 브라우저로 연다 (서버 없음)"이고 서버는 "필요하면"이다. 8장은 서버를 필수로, file://을 미지원으로 못 박는다. 13행(ES modules, 의존성 0, 빌드 없음)과는 충돌하지 않는다(python3은 이미 9행이 언급한 도구, 의존성·빌드 추가 없음).
### 9장 R1 항목 첫 문장(130행) 교체 제안
```
(에이전트 제안) 사람이 8장의 방법대로 서버를 켜고 Chrome 등 브라우저로 `http://localhost:8000`을 열어 R1-1~R1-5를 직접 확인해야 R1이 끝난다. index.html을 더블클릭해 `file://`로 열면 화면이 비는데, 이는 실패가 아니라 8장에 적힌 예상 동작이다. 그 경우 8장대로 다시 연다.
```
- 명령은 8장에 한 번만 두고 9장은 참조한다(중복 제거). R1-1~R1-5 본문은 그대로.

## OPEN 결정 (사람이 정한다. 에이전트는 조용히 건드리지 않는다)
1. **3행 상태 줄**: "…9장 R1 항목, 10장을 채웠다." 8장 일부가 채워지면 "8장 실행 환경" 추가가 정확하다. 락상 수정하지 않는다. (a) 추가 허용(락 확장, 정확, 권고) / (b) 유지(락 유지, 상태 줄이 사실보다 적게 말함). 결정은 사람.
2. **8장 "R3에 채운다" 표현**: 제안은 "그 밖의 기술 스펙은 R3에 채운다."로 부분 채움 명시. 대안: 8장은 비워 두고 전제를 9장 R1 문장에만 두기(그러나 사람 지시는 8장 수정 포함). 문안/위치는 사람이 확정.
3. **"서버" 금지 잔여 모호성(정직한 보고)**: AGENTS.md 25행과 GAME_DESIGN.md 10장의 "서버"는 정적 개발 서버와 게임 서버를 구분하지 않는다. 해소에는 AGENTS.md 25행 또는 10장 수정이 필요하고 둘 다 락 밖이다. 8장은 "게임 서버가 아니라 정적 서버"로 해석을 돕지만 AGENTS.md는 바꾸지 못한다. 잔여 위험: 후속 에이전트가 25행을 근거로 서버 사용을 금지로 읽을 수 있다.
4. **서명·버전 표기**: 서명 시 "(에이전트 제안)" 제거(권고) 여부, 1행 (v1)→(v2), 2행 상태 문구 갱신 여부. 락 밖이므로 OPEN 1과 한 묶음으로 사람 결정.
5. **(신규) AGENTS.md 9행 후속 변경 필요 — 락 밖, 사람 승인 필요, 에이전트는 적용하지 않음.** 8장 확정 후에도 AGENTS.md 9행이 "index.html을 브라우저로 연다 (서버 없음)"으로 남으면 두 문서가 충돌하고, 후속 에이전트·사람이 다시 더블클릭을 시도할 수 있다. 사람에게 제시하는 한 줄 제안(미적용):
   `- 실행: GAME_DESIGN.md 8장을 따른다. 프로젝트 폴더에서 python3 -m http.server 8000 후 http://localhost:8000을 연다 (file:// 더블클릭은 ES module 때문에 안 됨)`
   선택지: (a) 위 한 줄로 별도 승인·별도 커밋(권고) / (b) 변경 안 함, 충돌을 알고 감수. 기획서가 유일한 기준이므로 (b)여도 기획서가 우선이라고 사람이 확인해 주면 된다.

## Sequencing
1. (executor) GAME_DESIGN.md 8장·9장 R1 문장을 위 문안으로 수정(OPEN은 사람 답대로).
2. 사람이 `git diff -- GAME_DESIGN.md`로 변경을 본다(코드 전에 문서 확인).
3. 사람이 "(에이전트 제안)" 문안을 확정/수정해 서명.
4. 커밋 `design-v2: 8장 실행 환경, 9장 R1 실행 절차`.
5. 사람이 새 절차로 R1-1~R1-5를 직접 확인(서버 실행 → http://localhost:8000).
6. 결과는 사람이 채워 기록. 그 후에야 G001 resume/완료 판단. 그때까지 G001 paused/blocked 유지.
- 코드 변경 예상 없음. fix-N 커밋은 사람의 재확인에서 실제 버그가 발견될 때만.

## Acceptance criteria
- AC1: `.gjc/` 제외 추적 파일 변경이 GAME_DESIGN.md 하나뿐이다.
- AC2: 8장이 http 실행, `python3 -m http.server 8000`, `http://localhost:8000`, file:// 미지원과 이유(ES module 차단)를 말한다.
- AC3: 9장 R1 문장이 서버 실행 → localhost:8000 열기, 8장 참조, file:// 빈 화면은 예상 동작(실패 아님)임을 말한다.
- AC4: 새 문구가 서명 전까지 "(에이전트 제안)"을 달고 있다.
- AC5: diff의 hunk가 8장과 9장 R1 첫 문장에만 있다(OPEN 1·4에서 락을 확장하면 그 줄만 추가).
- AC6: R1 통과를 주장하는 문구가 새 문안에 없다.
- AC7: 계획·보고서 어디에도 8장 문안이 AGENTS.md 9행과 "양립"한다고 쓰지 않고 OPEN 5로 공개되어 있다.

## Verification
주의: 이 저장소는 추적되는 `.gjc/` 상태 파일이 계속 바뀌므로 `git diff --stat` 전체는 GAME_DESIGN.md만 보여주지 않는다. 경로 한정 검사를 쓴다.
에이전트 기계 검사(수정 후 서명 전):
- AC1: `git diff --name-only -- . ':(exclude).gjc'` 출력이 정확히 `GAME_DESIGN.md` 한 줄.
- 락 밖 불변: `git diff --quiet -- AGENTS.md index.html src test` 종료 코드 0. 추가로 `git status --short -- AGENTS.md index.html src test` 출력 없음.
- AC5: `git diff -U0 -- GAME_DESIGN.md`의 `@@` hunk 헤더가 8장(약 122~124행)과 130행 근방 두 군데뿐이고 3행·10장·R1-1~R1-5 줄이 diff에 없음. (OPEN 1·4로 락이 확장되면 해당 줄만 허용.)
- AC2: GAME_DESIGN.md에서 `python3 -m http.server 8000`, `http://localhost:8000`, `file://`, `ES module`이 8장에 존재(search로 각각 확인).
- AC3: 9장 R1 문장에 `localhost:8000`, `8장`, `file://`, `Chrome 등 브라우저` 존재.
- AC4: 새로 추가된 두 문단에 `(에이전트 제안)` 존재: `git diff -U0 -- GAME_DESIGN.md`의 추가 줄에서 확인.
- AC6: 추가 줄에 "R1 통과", "통과했다", "완료" 같은 통과 선언이 없음(search로 부정 확인).
- 코드 불변이므로 `node --test test/`는 불필요하며 돌려도 R1 통과로 말하지 않는다.
사람만 확인 가능(AGENTS.md 완료 조건): 프로젝트 폴더에서 서버 실행 후 http://localhost:8000을 열어 R1-1(키 한 번에 한 칸 0.60초, WASD 동일), R1-2(벽·울타리·가장자리 쪽 미이동), R1-3(캔버스 256x192 논리, 768x576 표시), R1-4(16x12칸, 16x16 타일), R1-5(8색)를 번호별로 보고 기록. 부정 확인: file://로 열면 빈 화면이며 새 문구가 예고한 정상 동작.

## Escalation/Risk Gate
- 서명 전 커밋 금지. OPEN 1·3·4·5는 사람 답이 필요. 답이 없으면 락을 유지한 최소 diff로 진행하고 미결로 보고.
- AGENTS.md 수정 불가가 유지되는 한 OPEN 3·5는 해소되지 않으며 보고서에 명시한다.
- 같은 시도 6회 초과 반복 금지.

## Verification Plan 요약
경로 한정 diff 검사(AC1,5) → grep 검사(AC2,3,4,6) → 사람 diff 확인·서명 → design-v2 커밋 → 사람 R1-1~R1-5 http 확인 → 사람 기록.

## Risks and mitigations
- AGENTS.md 9행과 8장 충돌: "양립" 주장 철회, OPEN 5로 사람 승인형 후속(한 줄 제안, 미적용).
- 8장 부분 채움 불일치: OPEN 1·2.
- 서버 금지 오독: 8장에서 정적 서버 명시, 잔여는 OPEN 3.
- 포트 8000 충돌: 대체 포트 안내는 범위 확대라 넣지 않음.
- Chrome만 확인: 문안은 "Chrome 등 브라우저", 다른 브라우저 검증은 주장하지 않음.
- R1 통과로 오해: 미기록을 명시, 원장·G001 상태 변경 금지.
- "문서만 고쳤으니 코드 문제" 오해: 원인은 file:// 모듈 차단, http에서는 동작(Chrome 확인).

## Handoff
executor: 두 문구 교체와 위 기계 검사. critic: 문안과 AGENTS.md 9·13·25행의 충돌/비충돌 서술 정확성, 락 준수 점검. architect/autoresearch/ultragoal 불필요. G001은 사람 재확인 결과 후 재개 판단.

---
## Intent Reconciliation
- 스코프 락(사람 지시): GAME_DESIGN.md 8장과 9장 R1 항목 텍스트만 수정. AGENTS.md와 코드는 수정하지 않는다. (stage-02-intent.md)
- 사람 답이 필요한 미결 항목: OPEN 1(3행 상태 줄), OPEN 2(8장 부분 채움 문구), OPEN 3(서버 금지 잔여 모호성), OPEN 4(서명·버전 표기), OPEN 5(AGENTS.md 9행 후속 변경). 이 실행에서는 G001이 미완료라 `ask`가 ultragoal 가드로 막혀 질문하지 못했다. 사람에게 보고하며, 답이 없으면 락을 유지한 최소 diff로 진행한다.
- R1-1~R1-5의 사람 확인 결과는 기록되지 않았다(직전 보고에 미기입 템플릿이 남아 있었다). R1 통과를 주장하지 않는다.
- 원장 마지막 기록: critic_verdict OKAY(pause), event 1d17a4ee, G001 blocked, HEAD 7cf09f8, 소스 불변.

## ADR
- Decision: 옵션 A. GAME_DESIGN.md 8장에 실행 환경(HTTP, python3 -m http.server 8000, http://localhost:8000, file:// 미지원과 이유)을 채우고 9장 R1 첫 문장을 8장 참조 절차로 바꾼다. 모두 서명 전까지 "(에이전트 제안)".
- Drivers: 기획서가 유일한 기준, 스코프 락과 서명 절차, ES modules/무빌드 보존.
- Alternatives considered: B 비모듈 script로 코드 변경(AGENTS.md 위반, 코드 락 밖) 기각. C 구두 안내(기획서 원칙 위반) 기각. D AGENTS.md 수정(수정 금지 지시) 기각.
- Why chosen: 락 안에서 가장 작은 변경으로 원인(8장 공백, 9장 "index.html을 열어")을 직접 해소.
- Consequences: AGENTS.md 9행과의 충돌은 남는다(OPEN 5). 상태 줄과 8장 부분 채움 불일치(OPEN 1·2). "서버" 잔여 모호성(OPEN 3).
- Follow-ups: 사람 서명, `design-v2:` 커밋, 사람의 R1-1~R1-5 재확인, AGENTS.md 9행 한 줄 변경 여부 결정.

Review receipts: planner stage-01, intent stage-02, architect stage-03(WATCH), critic stage-04(ITERATE), revision stage-05, architect stage-06(CLEAR/APPROVE), critic stage-07(OKAY).
