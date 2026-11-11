import test from "node:test";
import assert from "node:assert/strict";
import { LEVEL_1, LEVEL_1_TIME_MS } from "../src/levels.js";
import { PALETTE, FLOOR, WALL, FENCE, SNAIL, LETTER, MAILBOX, DIGITS, GLYPHS } from "../src/sprites.js";
import { STRINGS } from "../src/strings.js";
import {
  TILE,
  COLS,
  ROWS,
  SCALE,
  parseLevel,
  createState,
  tick,
  keyToDir,
  renderPos,
  letterPositions,
  timerDisplay,
  createTitleState,
  startGame,
  restart,
  screenOf,
} from "../src/logic.js";

// 기대값은 GAME_DESIGN.md 숫자: 0.60초/칸, 16x16 타일, 16x12칸, 256x192, 768x576.

function run(state, level, ms, step = 50) {
  let s = state;
  for (let t = 0; t < ms; t += step) s = tick(s, level, [], step);
  return s;
}

const level1 = parseLevel(LEVEL_1);

test("논리 해상도 256x192, 표시 768x576 (2.1, R1-3, R1-4)", () => {
  assert.equal(COLS * TILE, 256);
  assert.equal(ROWS * TILE, 192);
  assert.equal(COLS * TILE * SCALE, 768);
  assert.equal(ROWS * TILE * SCALE, 576);
});

test("레벨 1 격자는 16열 x 12행이고 시작 칸은 한 곳 (5장)", () => {
  assert.equal(level1.rows.length, 12);
  for (const row of level1.rows) assert.equal(row.length, 16);
  assert.deepEqual(level1.start, { x: 4, y: 4 });
});

test("한 번 누르면 정확히 한 칸, 600ms에 도착. 599ms는 미완료 (R1-1)", () => {
  let s = createState(level1);
  s = tick(s, level1, ["up"], 0);
  assert.deepEqual(s.move.to, { x: 4, y: 3 });
  // 599ms = 100*5 + 99
  for (let i = 0; i < 5; i++) s = tick(s, level1, [], 100);
  s = tick(s, level1, [], 99);
  assert.notEqual(s.move, null);
  assert.deepEqual(s.pos, { x: 4, y: 4 });
  s = tick(s, level1, [], 1);
  assert.equal(s.move, null);
  assert.deepEqual(s.pos, { x: 4, y: 3 });
});

test("이동 중 화면 위치는 경과/600 선형 (2.1.1)", () => {
  let s = tick(createState(level1), level1, ["right"], 0);
  s = run(s, level1, 300);
  assert.deepEqual(renderPos(s), { x: 4.5, y: 4 });
});

test("이동 중 들어온 입력은 모두 무시하고, 끝난 뒤 따로 누르지 않으면 더 가지 않는다", () => {
  let s = tick(createState(level1), level1, ["up"], 0);
  s = tick(s, level1, ["left"], 100);
  s = run(s, level1, 600);
  assert.deepEqual(s.pos, { x: 4, y: 3 });
  assert.equal(s.move, null);
});

test("프레임 시간 상한 100ms: 아주 큰 dt도 100ms만 진행 (2.1.1)", () => {
  let s = tick(createState(level1), level1, ["up"], 0);
  s = tick(s, level1, [], 10000);
  assert.equal(s.move.elapsedMs, 100);
  assert.deepEqual(s.pos, { x: 4, y: 4 });
});

test("울타리 쪽 입력은 이동하지 않는다 (R1-2)", () => {
  // (3,4)에서 위 (3,3)은 울타리 F
  let s = tick(createState(level1), level1, ["left"], 0);
  s = run(s, level1, 600);
  assert.deepEqual(s.pos, { x: 3, y: 4 });
  const blocked = tick(s, level1, ["up"], 0);
  assert.equal(blocked.move, null);
  assert.deepEqual(blocked.pos, { x: 3, y: 4 });
});

test("벽 쪽 입력은 이동하지 않는다 (R1-2)", () => {
  const lv = parseLevel(["S#"]);
  assert.equal(tick(createState(lv), lv, ["right"], 0).move, null);
  // 레벨 1: (1,1)에서 위 (1,0)는 바깥 테두리 벽
  let s = createState(level1);
  s = { pos: { x: 1, y: 1 }, move: null };
  assert.equal(tick(s, level1, ["up"], 0).move, null);
});

test("맵 가장자리 밖 입력은 이동하지 않는다 (R1-2)", () => {
  const lv = parseLevel(["S."]);
  for (const dir of ["left", "up", "down"]) {
    const s = tick(createState(lv), lv, [dir], 0);
    assert.equal(s.move, null, dir);
  }
});

test("여러 방향 동시 입력은 위, 아래, 왼쪽, 오른쪽 순으로 우선 (2.1.1)", () => {
  const lv = parseLevel(["...", ".S.", "..."]);
  const pick = (dirs) => tick(createState(lv), lv, dirs, 0).move.to;
  assert.deepEqual(pick(["right", "left", "down", "up"]), { x: 1, y: 0 });
  assert.deepEqual(pick(["right", "left", "down"]), { x: 1, y: 2 });
  assert.deepEqual(pick(["right", "left"]), { x: 0, y: 1 });
  assert.deepEqual(pick(["right"]), { x: 2, y: 1 });
});

test("WASD는 같은 방향의 방향키와 같다 (R1-1)", () => {
  const pairs = [
    ["KeyW", "ArrowUp", "up"],
    ["KeyS", "ArrowDown", "down"],
    ["KeyA", "ArrowLeft", "left"],
    ["KeyD", "ArrowRight", "right"],
  ];
  for (const [wasd, arrow, dir] of pairs) {
    assert.equal(keyToDir(wasd), dir);
    assert.equal(keyToDir(arrow), dir);
  }
  assert.equal(keyToDir("Space"), null);
  assert.equal(keyToDir("KeyR"), null);
});

test("스프라이트는 16x16이고 색은 6장 8색 인덱스뿐 (R1-4, R1-5)", () => {
  assert.equal(PALETTE.length, 8);
  for (const sp of [FLOOR, WALL, FENCE, SNAIL, LETTER, MAILBOX]) {
    assert.equal(sp.length, TILE);
    for (const row of sp) {
      assert.equal(row.length, TILE);
      for (const idx of row) assert.ok(idx >= -1 && idx <= 7 && Number.isInteger(idx));
    }
  }
});

// ---- R2 goal-2: 기대값은 GAME_DESIGN.md v4 (2.2, 5장 레벨 1, 9장 R2-1~R2-9) ----

const L1 = parseLevel(LEVEL_1, LEVEL_1_TIME_MS);

function press(s, level, dir) {
  s = tick(s, level, [dir], 0);
  return run(s, level, 600, 100);
}
function presses(s, level, dirs) {
  for (const d of dirs) s = press(s, level, d);
  return s;
}

test("레벨 1: 편지 2개, 우편함 1개, 시작 (4,4), 제한 시간 30초 (5장, R2-1)", () => {
  assert.deepEqual(L1.letters, [{ x: 7, y: 4 }, { x: 12, y: 6 }]);
  assert.deepEqual(L1.start, { x: 4, y: 4 });
  const boxes = [];
  L1.rows.forEach((r, y) => [...r].forEach((c, x) => c === "M" && boxes.push({ x, y })));
  assert.deepEqual(boxes, [{ x: 12, y: 4 }]);
  assert.equal(L1.timeLimitMs, 30000);
  assert.equal(createState(L1).remainingMs, 30000);
});

test("편지를 밀면 달팽이와 편지가 함께 한 칸, 0.60초 (R2-2)", () => {
  const lv = parseLevel(["S.L..."]);
  let s = tick(createState(lv), lv, ["right"], 0); // 이동 시작: 달팽이 (0,0)->(1,0) 이건 빈 칸
  s = run(s, lv, 600, 100);
  s = tick(s, lv, ["right"], 0); // (1,0)->(2,0) 편지 밀림
  s = run(s, lv, 300, 100);
  assert.deepEqual(renderPos(s), { x: 1.5, y: 0 });
  assert.deepEqual(letterPositions(s)[0], { x: 2.5, y: 0 });
  assert.deepEqual(s.letters[0], { x: 2, y: 0 }); // 완료 전에는 확정 안 됨 (D17)
  s = run(s, lv, 300, 100);
  assert.deepEqual(s.pos, { x: 2, y: 0 });
  assert.deepEqual(s.letters[0], { x: 3, y: 0 });
});

test("편지 뒤가 벽, 울타리, 다른 편지, 가장자리면 모두 정지 (R2-3)", () => {
  for (const back of ["#", "F", "L"]) {
    const lv = parseLevel(["SL" + back]);
    const s = tick(createState(lv), lv, ["right"], 0);
    assert.equal(s.move, null, back);
  }
  const edge = parseLevel(["SL"]);
  assert.equal(tick(createState(edge), edge, ["right"], 0).move, null);
});

test("달팽이는 우편함 칸으로 들어갈 수 없다 (R2-3)", () => {
  const lv = parseLevel(["SM"]);
  assert.equal(tick(createState(lv), lv, ["right"], 0).move, null);
});

test("편지를 우편함으로 밀어 이동이 끝나야 사라지고 배달된다 (R2-4)", () => {
  const lv = parseLevel(["SLML"], 30000);
  let s = tick(createState(lv), lv, ["right"], 0);
  s = run(s, lv, 500, 100);
  assert.equal(s.letters.length, 2);
  assert.equal(s.delivered, 0);
  s = run(s, lv, 100, 100);
  assert.equal(s.letters.length, 1);
  assert.equal(s.delivered, 1);
  assert.equal(s.status, "playing");
});

test("편지는 따라오지 않는다: 반대쪽으로 가도 위치 불변 (R2-5)", () => {
  const lv = parseLevel([".SL.."]);
  const s = press(createState(lv), lv, "left");
  assert.deepEqual(s.letters[0], { x: 2, y: 0 });
});

test("타이머: 올림 표시, 100ms 상한 시계 (R2-6, 2.2)", () => {
  let s = createState(L1);
  assert.equal(timerDisplay(s), 30);
  s = tick(s, L1, [], 100);
  assert.equal(timerDisplay(s), 30); // 29.9초 -> 올림 30
  s = run(s, L1, 900, 100);
  assert.equal(s.remainingMs, 29000);
  assert.equal(timerDisplay(s), 29);
  s = tick(s, L1, [], 5000); // 큰 dt는 100ms만
  assert.equal(s.remainingMs, 28900);
});

test("시간 0이면 입력이 멈추고 0을 보인다. 이동 중이면 폐기, 편지 미배달 (R2-7, D21)", () => {
  const lv = parseLevel(["SLM"], 300);
  let s = tick(createState(lv), lv, ["right"], 0);
  s = run(s, lv, 300, 100);
  assert.equal(s.status, "lost");
  assert.equal(s.move, null);
  assert.equal(s.delivered, 0);
  assert.equal(timerDisplay(s), 0);
  assert.deepEqual(s.pos, { x: 0, y: 0 });
  assert.equal(tick(s, lv, ["right"], 100), s);
});

test("마지막 편지 배달과 시간 0이 같은 프레임이면 클리어 (2.2)", () => {
  const lv = parseLevel(["SLM"], 600);
  let s = tick(createState(lv), lv, ["right"], 0);
  s = run(s, lv, 500, 100);
  s = tick(s, lv, [], 100); // 완료 프레임, 잔여 100ms -> 감소 전에 클리어
  assert.equal(s.status, "won");
  assert.equal(s.delivered, 1);
});

test("클리어 후에는 상태가 바뀌지 않는다 (2.2)", () => {
  const lv = parseLevel(["SLM."], 30000);
  let s = press(createState(lv), lv, "right");
  assert.equal(s.status, "won");
  const t = tick(s, lv, ["left"], 100);
  assert.equal(t, s);
  assert.equal(s.remainingMs, 30000 - 500); // 클리어 프레임에는 감소하지 않는다 (D18)
});

test("풀이 재생: →×7 ↓×3 →×1 ↑×2 가 13칸 7.8초에 편지 2개를 배달해 클리어 (5장)", () => {
  const dirs = [..."r".repeat(7), ..."d".repeat(3), "r", "u", "u"].map(
    (c) => ({ r: "right", d: "down", u: "up" })[c],
  );
  assert.equal(dirs.length, 13);
  const s = presses(createState(L1), L1, dirs);
  assert.equal(s.status, "won");
  assert.equal(s.delivered, 2);
  assert.equal(s.remainingMs, 30000 - (13 * 600 - 100)); // 클리어 프레임은 감소 없음
});

test("숫자 글리프 0~9는 6x12이고 색은 글자색 7뿐 (6장 R2, R2-8)", () => {
  assert.equal(DIGITS.length, 10);
  for (const g of DIGITS) {
    assert.equal(g.length, 12);
    for (const row of g) {
      assert.equal(row.length, 6);
      for (const idx of row) assert.ok(idx === -1 || idx === 7);
    }
  }
});

// ---- R2 goal-3: 기대값은 GAME_DESIGN.md v4 (3장 화면 흐름, 2.2, 7장, R2-10~R2-17) ----

test("처음에는 타이틀이고 시계도 입력도 멈춰 있다 (R2-10)", () => {
  let s = createTitleState(L1);
  assert.equal(screenOf(s), "title");
  const t = tick(s, L1, ["right"], 100);
  assert.equal(t, s);
  assert.equal(t.remainingMs, 30000);
  assert.equal(restart(s, L1), s); // 타이틀에서 R은 아무 일도 없다
});

test("Enter로 플레이 시작, 시계는 그 뒤부터 (R2-11)", () => {
  const s = startGame(createTitleState(L1), L1);
  assert.equal(screenOf(s), "play");
  assert.equal(s.remainingMs, 30000);
  assert.equal(tick(s, L1, [], 100).remainingMs, 29900);
});

test("클리어 화면과 실패 화면 (R2-12, R2-13)", () => {
  const lv = parseLevel(["SLM."], 30000);
  let s = press(startGame(createTitleState(lv), lv), lv, "right");
  assert.equal(screenOf(s), "clear");
  const lv2 = parseLevel(["SLM."], 300);
  s = run(startGame(createTitleState(lv2), lv2), lv2, 300, 100);
  assert.equal(screenOf(s), "fail");
  const mid = run(startGame(createTitleState(lv2), lv2), lv2, 200, 100);
  assert.equal(screenOf(mid), "play");
});

test("플레이 중 R: 처음 상태로, 이동 중이어도 (R2-15)", () => {
  let s = startGame(createTitleState(L1), L1);
  s = tick(s, L1, ["right"], 0);
  s = run(s, L1, 300, 100);
  s = restart(s, L1);
  assert.deepEqual(s, startGame(createTitleState(L1), L1));
  assert.equal(s.remainingMs, 30000);
});

test("클리어/실패 화면에서 R은 플레이로 다시 시작, Enter는 무시 (R2-16, 3장)", () => {
  const lv = parseLevel(["SLM."], 300);
  const failed = run(startGame(createTitleState(lv), lv), lv, 300, 100);
  assert.equal(startGame(failed, lv), failed);
  const again = restart(failed, lv);
  assert.equal(screenOf(again), "play");
  assert.equal(again.remainingMs, 300);
});

test("7장 문구의 글자는 모두 글리프가 있고 크기·색이 정해진 대로 (R2-17)", () => {
  const all = Object.values(STRINGS).join("").replace(/ /g, "");
  const chars = new Set(all);
  for (const c of chars) {
    const g = GLYPHS[c];
    assert.ok(g, c);
    assert.equal(g.length, 12);
    const w = /[가-힣]/.test(c) ? 12 : 6;
    for (const row of g) {
      assert.equal(row.length, w);
      for (const idx of row) assert.ok(idx === -1 || idx === 7);
    }
    assert.ok(g.flat().some((v) => v === 7), c);
  }
  assert.equal([...chars].filter((c) => /[가-힣]/.test(c)).length, 17);
});

test("문구는 기획서 7장 그대로", () => {
  assert.equal(STRINGS.title, "달팽이 우체부");
  assert.equal(STRINGS.startHint, "Enter로 시작");
  assert.equal(STRINGS.clear, "배달 완료");
  assert.equal(STRINGS.fail, "해가 졌어요");
});
