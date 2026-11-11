# R3 계획 — Architect 검토 (pass 1)

## Summary
방향(옵션 A: design-v5 한 번 → goal-4 → goal-5, logic 순수·audio/storage 분리)은 타당하다. 그러나 흐름 의미(중간 클리어의 R)·이벤트 전달 계약·점수 규칙의 처리 순서 모순 등 서명 전에 고쳐야 할 항목이 있어 pass 1 기준 BLOCK / REQUEST CHANGES. 모두 계획 문서 수준의 국소 수정이며 재설계는 아니다.

## Claims (검증한 근거)
- logic.js tick은 started 아님/status!=playing이면 같은 객체를 반환한다(조기 반환). 클리어 판정(③)이 시간 감소(④) 앞이라 클리어 프레임에는 remainingMs가 감소하지 않는다(test/logic.test.js:237-253, D18).
- main.js keydown은 action만 기록하고 startGame/restart는 requestAnimationFrame의 frame()에서 실행된다. level은 모듈 최상위 const로 고정, 4곳(render/startGame/restart/tick)이 참조.
- 기존 테스트는 상태 전체 deepEqual이 없고 필드 접근만 한다(새 필드로 깨질 위험 낮음). GLYPHS는 숫자 0~9를 이미 포함 → `점수 N` 렌더에 숫자 글리프 추가 불필요.
- 리더 BFS: 레벨1 최소 13, 레벨2 최소 34(계획 일치), 레벨3 최소 45(계획 풀이 49는 유효하나 최소 아님).
- v4 문서: 2.2 점수 '없다', 3장 '네 가지', 3장 표 '클리어 R→레벨 1', '클리어/실패 Enter 포함 무시', 7장 '글자는 셋과 타이머뿐'·한글 17자 닫힌 목록, 10장 '저장/이어하기'.

## Analysis / Findings

### HIGH-1 중간 클리어 화면의 R 미정 → 점수 이중 가산
D1~D4는 플레이 R, 실패 R, 최종 R, 중간 클리어 Enter만 정한다. 중간 클리어 R이 비어 있고 v4 3장은 '클리어 R→레벨 1'. restart가 levelIndex·score를 보존하도록 바뀌면, 중간 클리어에서 R로 같은 레벨 재시작 후 재클리어 때 점수가 또 가산된다(12절 '가산은 한 번' 거짓). 수정: v5 3장 표/2.2 재시작 행에 화면별 R 전부 명시. 권장: 플레이=현재 레벨(점수 유지), 실패=그 레벨(점수 유지), 중간 클리어=무시(점수 이미 확정; 대안은 레벨 시작 점수 롤백 필드), 최종=새 판. '클리어→R' 테스트 추가.

### HIGH-2 state.events 계약 결함
tick이 비플레이 상태에서 같은 객체를 반환하므로 clear/fail events가 클리어·실패 화면에서 매 프레임 재생될 수 있다. 일시 값을 상태에 넣으면 소비 여부를 객체 동일성으로 추측해야 한다. 수정(권장): events를 상태에서 제거하고 순수 `soundsOf(prev,next)`로 전이에서 도출 — push: prev.move==null&&next.move?.push; deliver: delivered 증가; clear/final: playing→won(마지막 레벨이면 final); fail: playing→lost; deliver+clear 동일 프레임이면 clear만; next===prev면 []. tick/createState 시그니처와 기존 테스트 불변. 저장 호출도 같은 final 전이 신호로 단발 실행.

### MEDIUM-3 D5 '클리어+시간 0 → 보너스 0'은 처리 순서와 모순
클리어 프레임은 시간 감소 전이므로 remainingMs>0, timerDisplay>=1 → 보너스 10(예: 잔여 100ms). 계획대로 구현하면 테스트 실패 또는 처리 순서 변경(R2-14/D18 회귀). 수정: '클리어 프레임의 remainingMs 그대로'로 정의하고 보너스 0 문구·테스트 삭제/정정. remainingMs===null이면 보너스 0 명시.

### MEDIUM-4 레벨 3 최소 49칸 서술 오류
BFS 최소 45칸(27.0초). 5절 머리말 '칸수×0.60초=최소 시간', 12절 '풀이 최소 20.4/29.4초', D13 근거가 49를 최소로 읽게 함. 수정: 레벨 3 풀이를 '한 가지 풀이(최소 아님)'로 적고 BFS 최소(13/34/45)를 문서에 한 줄로 사실 기재, 60초는 최소 대비 2.2배. R3-4 '대략 30 이상'은 그대로 참. 재생 테스트 기대 잔여는 실제 키열 칸수(49)로 계산.

### MEDIUM-5 R2 대체 항목 목록 불완전
R3-21의 'R2-16만 v5 대체'는 틀림: R2-10(타이틀 최고 줄), R2-12(클리어 화면 구성), R2-17(문구 일치), 3장 Enter 무시 행·'네 가지'·'R2에는 레벨 1뿐', 2.2 재시작·점수 행, 7장 '셋과 타이머뿐'·한글 17자, 6장 색 쓰임 표(최종 화면·점수 글자), 9장 머리말. v5에 'R2→R3 대체 표' 한 곳을 두고 R3-21을 '대체 외 유지'로. 기존 테스트 갱신 목록에 17자 가정·문구·클리어/실패 R 명시.

### MEDIUM-6 오디오 제스처 정책
main.js는 keydown에서 action만 세팅, 전이는 rAF. 거기서 AudioContext 생성은 Safari/Firefox에서 제스처 밖. 수정: keydown 핸들러 안에서 audio.unlock() 동기·멱등 호출(모든 비반복 keydown), resume() rejection 처리, ctx.state!=='running'이면 이벤트 폐기(재개 시 몰림 방지), AudioContext 생성 실패 try/catch + 가짜 ctx throw 테스트, 사각파 클릭 방지 gain 램프를 D11에 명시. 가짜 AudioContext 테스트는 스케줄링 증명으로 한정(계획이 이미 그렇게 적음).

### MEDIUM-7 localStorage 계약
(1) window.localStorage getter 자체가 throw 가능 → storage.js가 getter를 받아 try 안에서 평가. (2) R3-16('최고 B' 항상)과 R3-19(저장소 막히면 최고 줄 숨김) 충돌 → v5에서 하나로(권장: 최종 화면 B=max(로드값, 이번 점수) 화면용 표시, 타이틀은 저장 성공 시만). (3) 저장은 final 전이 한 번만(매 프레임 시 warn 폭주). (4) 값 검증 /^\d+$/ + isSafeInteger, 쓰기 전 재읽기 비교(다중 탭). 테스트: getter/getItem/setItem throw, 손상값.

### MEDIUM-8 상태 모양·소유 경계
levelIndex(state)와 level(인자) 이중 소스; main 최상위 level 고정 4곳 참조; screenOf(state)가 마지막 레벨을 알 소유자 미정(logic은 levels 미import). 수정: LEVEL_COUNT=3(5장 근거, LEVELS 길이와 테스트 대조) 또는 isLast, levels.js는 LEVELS=[{grid,timeLimitMs}], main은 프레임당 한 번 level=levels[state.levelIndex] 계산, advanceLevel은 비해당 시 같은 객체 반환(frame()의 next!==state 규칙 유지, 동일성 테스트). bestScore는 영속 외부 데이터 → logic 상태에 넣지 않고 main 보유·render 전달.

### LOW-9 서명 범위·표식
v4 헤더 규칙('제안' 표식=미확정)과 '안 고르면 기본값이 서명된다' 충돌 소지 → 사용자가 고르지 않은 값은 표식 유지. D1~D14를 '반드시 확인(흐름·점수·저장)'과 '튜닝(소리·시간)'으로 묶어 확인 비용 감소. 선택 메모 2건 범위 밖 처리와 AGENTS.md 미변경은 적절.

## Root Cause
계획이 '상태 모양 확장'을 데이터(levelIndex/score/events) 추가로만 보고, (a) 화면×입력 전이표 전수화, (b) 상태가 아닌 전이에서 도출 가능한 값(소리)의 분리, (c) 기존 2.2 처리 순서가 만드는 값의 의미(클리어 프레임 시간)를 새 규칙(점수)과 대조하는 단계를 건너뛰었다.

## Recommendations
1. v5 전이표를 5화면(타이틀/플레이/중간클리어/실패/최종)×입력(Enter, R, 방향) 전수 표로 작성하고 점수 가산 시점을 한 곳에 둔다.
2. events 상태 필드 폐기, soundsOf(prev,next) 순수 함수 + 단발 final 처리.
3. D5를 클리어 프레임 remainingMs 기준으로 정정.
4. BFS 결과(13/34/45)를 v5에 사실로 기재하고 레벨 3 서술 정정.
5. R2 대체 표 추가, R3-21 정정.
6. audio.unlock을 keydown 동기 호출로, 실패·suspended 처리 명시.
7. storage getter 계약, 최종 화면 최고 표시 규칙 단일화, 저장 단발화.
8. LEVEL_COUNT/LEVELS 소유자와 main 프레임당 level 단일 계산 명시.

## Architectural Status
BLOCK (pass 1: HIGH 2건. 모두 계획 수정으로 해소 가능, 재설계 불필요)

## Code Review Recommendation
REQUEST CHANGES

## Tradeoffs
| 선택 | 장점 | 단점 |
|---|---|---|
| soundsOf(prev,next) 도출(권장) | 상태·기존 테스트 불변, stale 이벤트 없음, 순수 | prev 보관 한 줄 필요 |
| state.events | 단순해 보임 | 비플레이 조기 반환과 충돌, 소비 계약 필요 |
| 중간 클리어 R 무시(권장) | 점수 이중 가산 불가, 규칙 단순 | v4의 '클리어 R' 의미가 바뀜(v5 명시) |
| 중간 클리어 R 롤백 | R 일관성 | 레벨 시작 점수 필드·테스트 증가 |
