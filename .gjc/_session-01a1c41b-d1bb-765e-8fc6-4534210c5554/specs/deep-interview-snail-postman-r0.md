# Deep Interview Spec: 달팽이 우체부 R0 (콘셉트 · 이동 규칙 · 범위 밖)

## Metadata
- Rounds: 5
- Final Ambiguity Score: ~50% (R0 범위 밖 구성 요소는 사용자가 R1~R3로 보류)
- Type: greenfield
- Threshold: 0.05
- Threshold Source: default
- Status: BELOW_THRESHOLD_EARLY_EXIT (R0 범위만 확정, 사용자가 Restate 승인)
- Restated Goal: 달팽이 우체부가 한 칸 0.60초로 느리게 움직이며 편지를 줍지 않고 밀어서(당기기·되돌리기 없이) 우편함에 넣고, 레벨마다 정해진 제한 시간(해 지기 전) 안에 편지를 모두 배달하면 클리어하는, 16x16 타일 16x12칸(768x576) 한 화면 도트 게임. 맵·레벨 3개·승패 화면·소리·점수·팔레트 세부는 R1~R3에서 정한다.

## Topology
| Component | Status | Description | Coverage / Deferral Note |
|---|---|---|---|
| 우체부 달팽이 | active | 플레이어 | 이동 0.60초/칸 확정 |
| 편지 배달 | active | 밀기, 우편함, 전부 배달 시 클리어 | 규칙 확정 |
| 해 지기 타이머 | active | 시간 초과 시 패배 | 레벨별 고정 시간, 숫자는 레벨 격자 옆에 표기. 실제 값은 R1~R3 |
| 맵과 레벨 | active | 벽, 레벨 3개, 문자 격자 | 타일/화면 크기 확정. 세부 R1~R3 |
| 승패와 화면 | active | 승리/패배 | 세부 R1~R3 |
| 소리와 점수 | active | 효과음, 점수 (BGM 제외) | 세부 R1~R3 |
| 팔레트 | active | 8색, 스타듀밸리풍 따뜻한 농장 마을 | hex 값 R1~R3 |

## Established Facts
- 편지는 밀어서 옮긴다(소코반식). 뒤에 벽·울타리·다른 편지가 있으면 밀리지 않음. 당기기·되돌리기 없음. R키로 레벨 재시작.
- 편지를 우편함 칸으로 밀어 넣으면 배달 완료. 전부 배달하면 레벨 클리어.
- 한 칸 이동 시간 0.60초(밀 때도 동일).
- 타일 16x16px, 16x12칸, 논리 256x192, 3배 확대 768x576.
- 레벨마다 다른 고정 제한 시간, 레벨 문자 격자 옆에 숫자로 적는다.

## Goal
위 Restated Goal과 같다.

## Constraints
- HTML + Canvas 2D + JavaScript ES modules, 의존성 0, 빌드 없음 (AGENTS.md).
- 8색 팔레트, 스프라이트는 팔레트 인덱스 배열, 이미지 파일 금지.
- UI 문구는 src/strings.js 한 곳.

## Non-Goals (10장 범위 밖)
모바일 터치, 반응형 레이아웃, 설정 화면, 난이도 선택, 리더보드, 계정, 서버, DB, 배경음악, 레벨 에디터, 랜덤 맵, 편지 줍기, 당기기, 되돌리기, 일시정지, 저장/이어하기, 레벨 4 이상, 언어 선택, 외부 오디오·이미지 파일(도트 웹폰트 1개만 예외), 빌드 도구·번들러·npm 패키지.

## Acceptance Criteria
- [ ] 방향키 한 번에 달팽이가 정확히 한 칸, 0.60초 동안 이동한다.
- [ ] 편지 칸으로 이동하면 편지가 한 칸 밀리고, 뒤가 벽·울타리·다른 편지이면 달팽이와 편지 모두 움직이지 않는다.
- [ ] 편지가 우편함 칸에 들어가면 배달 완료로 처리되고, 전부 배달하면 레벨 클리어다.
- [ ] R키로 현재 레벨이 처음 상태로 다시 시작된다. 되돌리기는 없다.
- [ ] 캔버스 논리 해상도는 256x192, 화면 표시는 768x576이다.
- [ ] 제한 시간 초과 시 패배한다 (시간 값과 화면은 R1~R3에서 확정).

## Deferrals
맵·레벨 3개·승패 화면·소리·점수·팔레트(hex 8개)·타이머 실제 숫자는 사용자가 R1~R3로 보류. 사용자 확정, 2026-11-10.

## Assumptions Exposed & Resolved
| Assumption | Challenge | Resolution |
|---|---|---|
| 편지를 줍는다 | 어떻게 집고 전달하나 | 줍지 않고 밀기 |
| 시간은 하나 | 레벨 크기가 다름 | 레벨별 고정 시간 |

## Locked Intent IDs
- artifact:game
- artifact:design-doc
- surface:single-screen
- surface:levels
- surface:win-lose
- surface:sound-score
- integration:mailbox
- constraint:zero-deps
- constraint:palette
- constraint:no-extras
