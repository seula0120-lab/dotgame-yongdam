import test from "node:test";
import assert from "node:assert/strict";
import { LEVEL_1, LEVEL_1_TIME_MS, LEVELS } from "../src/levels.js";
import { PALETTE, FLOOR, WALL, FENCE, SNAIL, SNAIL_LEFT, mirrorX, LETTER, MAILBOX, DIGITS, GLYPHS } from "../src/sprites.js";
import { STRINGS } from "../src/strings.js";
import { SOUNDS, createAudio } from "../src/audio.js";
import { BEST_KEY, readBest, saveBest } from "../src/storage.js";
import {
  TILE,
  COLS,
  ROWS,
  SCALE,
  parseLevel,
  soundsOf,
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
  const s = { ...createState(level1), pos: { x: 1, y: 1 } };
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
  for (const sp of [FLOOR, WALL, FENCE, SNAIL, SNAIL_LEFT, LETTER, MAILBOX]) {
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
  assert.equal(restart(s, [L1]), s); // 타이틀에서 R은 아무 일도 없다
});

test("Enter로 플레이 시작, 시계는 그 뒤부터 (R2-11)", () => {
  const s = startGame(createTitleState(L1), [L1]);
  assert.equal(screenOf(s), "play");
  assert.equal(s.remainingMs, 30000);
  assert.equal(tick(s, L1, [], 100).remainingMs, 29900);
});

test("클리어 화면과 실패 화면 (R2-12, R2-13)", () => {
  const lv = parseLevel(["SLM."], 30000);
  let s = press(startGame(createTitleState(lv), [lv]), lv, "right");
  assert.equal(screenOf(s), "clear");
  const lv2 = parseLevel(["SLM."], 300);
  s = run(startGame(createTitleState(lv2), [lv2]), lv2, 300, 100);
  assert.equal(screenOf(s), "fail");
  const mid = run(startGame(createTitleState(lv2), [lv2]), lv2, 200, 100);
  assert.equal(screenOf(mid), "play");
});

test("플레이 중 R: 처음 상태로, 이동 중이어도 (R2-15)", () => {
  let s = startGame(createTitleState(L1), [L1]);
  s = tick(s, L1, ["right"], 0);
  s = run(s, L1, 300, 100);
  s = restart(s, [L1]);
  assert.deepEqual(s, startGame(createTitleState(L1), [L1]));
  assert.equal(s.remainingMs, 30000);
});

test("클리어/실패 화면에서 R은 플레이로 다시 시작, Enter는 무시 (R2-16, 3장)", () => {
  const lv = parseLevel(["SLM."], 300);
  const failed = run(startGame(createTitleState(lv), [lv]), lv, 300, 100);
  assert.equal(startGame(failed, [lv]), failed);
  const again = restart(failed, [lv]);
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
  assert.equal([...chars].filter((c) => /[가-힣]/.test(c)).length, 21); // v5 7장: 한글 21자
});

test("문구는 기획서 7장 그대로", () => {
  assert.equal(STRINGS.title, "달팽이 우체부");
  assert.equal(STRINGS.startHint, "Enter로 시작");
  assert.equal(STRINGS.clear, "배달 완료");
  assert.equal(STRINGS.fail, "해가 졌어요");
});

// ---- R3 goal-4: 기대값은 GAME_DESIGN.md v5 (3장, 5장 레벨 2·3, 9장 R3-1~R3-9) ----

const LV = LEVELS.map((l) => parseLevel(l.grid, l.timeMs));
const KEY = { u: "up", d: "down", l: "left", r: "right" };
const SOLUTION = {
  1: "rrrrrrrdddruu", // 5장 레벨 1, 13칸
  2: "dddrrrrrrrrdruuullllllulurrrrrrurd", // 5장, 34칸
  3: "rrdddldrrddrrrrrrdruulllllllurrrrrruuuuurdddd", // 5장, 45칸
};

function charPositions(rows, ch) {
  const out = [];
  rows.forEach((r, y) => [...r].forEach((c, x) => c === ch && out.push({ x, y })));
  return out;
}

test("레벨 개수와 제한 시간: 3개, 30/45/60초 (5장, R3-2)", () => {
  assert.equal(LEVELS.length, 3);
  assert.deepEqual(LV.map((l) => l.timeLimitMs), [30000, 45000, 60000]);
  LV.forEach((l, i) => assert.equal(createState(l, i).remainingMs, l.timeLimitMs));
});

test("레벨 2: 시작, 편지, 우편함, 울타리, 벽 좌표 (5장, R3-8)", () => {
  const l = LV[1];
  assert.deepEqual(l.start, { x: 2, y: 4 });
  assert.deepEqual(l.letters, [{ x: 5, y: 4 }, { x: 4, y: 7 }]);
  assert.deepEqual(charPositions(l.rows, "M"), [{ x: 11, y: 4 }]);
  assert.deepEqual(charPositions(l.rows, "F"), [{ x: 8, y: 4 }]);
  assert.deepEqual(charPositions(l.rows, "#").filter((p) => p.x > 0 && p.x < 15 && p.y > 0 && p.y < 11), [
    { x: 7, y: 9 },
    { x: 8, y: 9 },
  ]);
  assert.equal(l.rows.length, 12);
  assert.ok(l.rows.every((r) => r.length === 16));
});

test("레벨 3: 시작, 편지, 우편함, 울타리, 벽 좌표 (5장, R3-8)", () => {
  const l = LV[2];
  assert.deepEqual(l.start, { x: 2, y: 2 });
  assert.deepEqual(l.letters, [{ x: 12, y: 2 }, { x: 4, y: 3 }, { x: 6, y: 8 }]);
  assert.deepEqual(charPositions(l.rows, "M"), [{ x: 12, y: 6 }]);
  assert.deepEqual(charPositions(l.rows, "F"), [{ x: 8, y: 3 }, { x: 8, y: 4 }, { x: 6, y: 9 }]);
  assert.deepEqual(charPositions(l.rows, "#").filter((p) => p.x > 0 && p.x < 15 && p.y > 0 && p.y < 11), [
    { x: 9, y: 9 },
    { x: 10, y: 9 },
  ]);
  assert.equal(l.rows.length, 12);
  assert.ok(l.rows.every((r) => r.length === 16));
});

test("풀이 재생: 레벨 1·2·3 모두 편지를 전부 배달하고 클리어, 남은 시간 22300/24700/33100ms (5장, R3-4)", () => {
  const expectMs = { 1: 22300, 2: 24700, 3: 33100 };
  const moves = { 1: 13, 2: 34, 3: 45 };
  for (const n of [1, 2, 3]) {
    const keys = [...SOLUTION[n]].map((c) => KEY[c]);
    assert.equal(keys.length, moves[n]);
    const lv = LV[n - 1];
    const s = presses(createState(lv, n - 1), lv, keys);
    assert.equal(s.status, "won", `레벨 ${n}`);
    assert.equal(s.letters.length, 0);
    assert.equal(s.delivered, lv.letters.length);
    assert.equal(s.remainingMs, expectMs[n]);
    assert.equal(expectMs[n], lv.timeLimitMs - (keys.length * 600 - 100));
  }
});

test("Enter: 타이틀은 레벨 1, 클리어(레벨 1·2)는 다음 레벨 처음 상태 (R3-1, R3-2)", () => {
  let s = startGame(createTitleState(LV[0]), LV);
  assert.equal(s.levelIndex, 0);
  s = presses(s, LV[0], [...SOLUTION[1]].map((c) => KEY[c]));
  assert.equal(screenOf(s), "clear");
  s = startGame(s, LV);
  assert.equal(screenOf(s), "play");
  assert.equal(s.levelIndex, 1);
  assert.deepEqual(s.pos, { x: 2, y: 4 });
  assert.equal(s.letters.length, 2);
  assert.equal(timerDisplay(s), 45);
  assert.equal(tick(s, LV[1], [], 100).remainingMs, 44900);
  s = presses(s, LV[1], [...SOLUTION[2]].map((c) => KEY[c]));
  assert.equal(screenOf(s), "clear");
  s = startGame(s, LV);
  assert.equal(s.levelIndex, 2);
  assert.deepEqual(s.pos, { x: 2, y: 2 });
  assert.equal(timerDisplay(s), 60);
});

test("클리어 화면에서는 시간이 흐르지 않고 방향키와 R은 아무 일도 없다 (R3-2, R3-3)", () => {
  const s = presses(createState(LV[0], 0), LV[0], [...SOLUTION[1]].map((c) => KEY[c]));
  assert.equal(screenOf(s), "clear");
  assert.equal(tick(s, LV[0], [], 100), s);
  assert.equal(tick(s, LV[0], ["right"], 100), s);
  assert.equal(restart(s, LV), s);
});

test("Enter는 타이틀·클리어 밖에서는 같은 객체를 돌려준다 (3장)", () => {
  const playing = createState(LV[1], 1);
  assert.equal(startGame(playing, LV), playing);
  const failed = run(createState(LV[1], 1), LV[1], 45000, 100);
  assert.equal(screenOf(failed), "fail");
  assert.equal(startGame(failed, LV), failed);
});

test("실패 후 R: 실패한 그 레벨을 그 레벨 타이머로 다시 시작, 레벨 1로 가지 않는다 (R3-5)", () => {
  for (const i of [1, 2]) {
    const failed = run(createState(LV[i], i), LV[i], LV[i].timeLimitMs, 100);
    assert.equal(screenOf(failed), "fail");
    assert.equal(timerDisplay(failed), 0);
    const again = restart(failed, LV);
    assert.equal(screenOf(again), "play");
    assert.equal(again.levelIndex, i);
    assert.equal(again.remainingMs, LV[i].timeLimitMs);
    assert.deepEqual(again.pos, LV[i].start);
  }
});

test("플레이 중 R: 지금 레벨만 처음 상태로, 레벨 1로 가지 않는다 (R3-7)", () => {
  let s = createState(LV[2], 2);
  s = tick(s, LV[2], ["right"], 0);
  s = run(s, LV[2], 300, 100);
  const r = restart(s, LV);
  assert.equal(r.levelIndex, 2);
  assert.deepEqual(r, createState(LV[2], 2));
  assert.equal(r.remainingMs, 60000);
});

test("레벨 3 클리어는 최종 화면: Enter는 같은 객체, R은 새 판 레벨 1 점수 0 (3장, R3-17)", () => {
  const s = presses(createState(LV[2], 2, 880), LV[2], [...SOLUTION[3]].map((c) => KEY[c]));
  assert.equal(screenOf(s), "final");
  assert.equal(startGame(s, LV), s);
  assert.equal(tick(s, LV[2], ["up"], 100), s);
  const r = restart(s, LV);
  assert.equal(r.levelIndex, 0);
  assert.equal(r.score, 0);
  assert.equal(r.remainingMs, 30000);
  assert.equal(screenOf(r), "play");
});

test("레벨 2·3에서도 밀기와 막힘 규칙이 같다 (R3-9)", () => {
  // 레벨 2: 시작 (2,4)에서 오른쪽 두 칸이면 편지(5,4)를 만난다. 울타리(8,4) 앞에서 막힌다.
  const l2 = LV[1];
  let s = presses(createState(l2, 1), l2, ["right", "right", "right"]); // (5,4) 편지를 (6,4)로
  assert.deepEqual(s.pos, { x: 5, y: 4 });
  assert.deepEqual(s.letters[0], { x: 6, y: 4 });
  s = presses(s, l2, ["right"]); // 편지 (7,4)
  assert.deepEqual(s.letters[0], { x: 7, y: 4 });
  const blocked = tick(s, l2, ["right"], 0); // 편지 뒤가 울타리 (8,4)
  assert.equal(blocked.move, null);
  // 레벨 3: 시작 (2,2)에서 위로 두 번은 벽(가장자리)에 막힌다.
  const l3 = LV[2];
  s = press(createState(l3, 2), l3, "up");
  assert.deepEqual(s.pos, { x: 2, y: 1 });
  assert.equal(tick(s, l3, ["up"], 0).move, null);
});

// ---- R3 goal-5: 기대값은 GAME_DESIGN.md v5 (2.2 점수, 3장, 7장 효과음, 8장 저장·오디오, R3-10~R3-21) ----

const keysOf = (n) => [...SOLUTION[n]].map((c) => KEY[c]);
function playAll() {
  let s = startGame(createTitleState(LV[0]), LV);
  const scores = [];
  for (const n of [1, 2, 3]) {
    s = presses(s, LV[n - 1], keysOf(n));
    scores.push(s.score);
    if (n < 3) s = startGame(s, LV);
  }
  return { s, scores };
}

test("점수: 5장 풀이 재생은 430, 880, 1520 (2.2 점수 예, R3-14, R3-15)", () => {
  const { s, scores } = playAll();
  assert.deepEqual(scores, [430, 880, 1520]); // 430, +450, +640
  assert.equal(screenOf(s), "final");
});

test("점수: 100 x 편지 수 + 10 x 타이머 표시값을 클리어 프레임에 한 번만 (2.2)", () => {
  const lv = parseLevel(["SLM."], 30000);
  let s = tick(createState(lv, 0, 50), lv, ["right"], 0);
  s = run(s, lv, 500, 100);
  assert.equal(s.score, 50);
  s = tick(s, lv, [], 100); // 클리어: 남은 시간 29500ms -> 표시 30
  assert.equal(s.status, "won");
  assert.equal(s.score, 50 + 100 + 300);
  assert.equal(tick(s, lv, [], 100), s); // 클리어 뒤에는 더 오르지 않는다
});

test("점수는 클리어 화면 R(무시), 실패 R, 플레이 중 R로 변하지 않고 Enter로 다음 레벨에 이어진다 (R3-16)", () => {
  const cleared = presses(createState(LV[0], 0), LV[0], keysOf(1));
  assert.equal(cleared.score, 430);
  assert.equal(restart(cleared, LV), cleared);
  const next = startGame(cleared, LV);
  assert.equal(next.score, 430);
  const mid = tick(next, LV[1], ["right"], 0);
  assert.equal(restart(mid, LV).score, 430);
  const failed = run(next, LV[1], 45000, 100);
  assert.equal(screenOf(failed), "fail");
  assert.equal(failed.score, 430);
  assert.equal(restart(failed, LV).score, 430);
});

test("타이틀에서 Enter는 점수 0으로 시작한다 (3장)", () => {
  assert.equal(startGame(createTitleState(LV[0]), LV).score, 0);
});

test("soundsOf: 밀기는 편지를 미는 이동 시작 한 번, 걷기와 막힘은 무음 (R3-10)", () => {
  const lv = parseLevel(["S.L..M"], 30000);
  const a = createState(lv);
  const walk = tick(a, lv, ["right"], 0);
  assert.deepEqual(soundsOf(a, walk), []);
  const b = presses(a, lv, ["right"]);
  const push = tick(b, lv, ["right"], 0);
  assert.deepEqual(soundsOf(b, push), ["push"]);
  const during = tick(push, lv, [], 100);
  assert.deepEqual(soundsOf(push, during), []);
  const wall = parseLevel(["S#"], 30000);
  const w = createState(wall);
  assert.deepEqual(soundsOf(w, tick(w, wall, ["right"], 0)), []);
});

test("soundsOf: 배달은 이동 완료 프레임에만, 마지막 편지는 클리어/최종 하나만 (R3-11)", () => {
  const lv = parseLevel(["SLM.L"], 30000); // 편지 2개 중 하나만 배달하면 배달 소리
  let s = tick(createState(lv), lv, ["right"], 0);
  s = run(s, lv, 400, 100);
  const mid = tick(s, lv, [], 100); // 이동 도중
  assert.deepEqual(soundsOf(s, mid), []);
  const done = tick(mid, lv, [], 100); // 이동 완료 프레임
  assert.equal(done.status, "playing");
  assert.deepEqual(soundsOf(mid, done), ["deliver"]);

  const one = parseLevel(["SLM."], 30000);
  let t = tick(createState(one, 0), one, ["right"], 0);
  t = run(t, one, 500, 100);
  const last = tick(t, one, [], 100);
  assert.equal(last.status, "won");
  assert.deepEqual(soundsOf(t, last), ["clear"]);
  const asFinal = { ...t, levelIndex: 2 };
  assert.deepEqual(soundsOf(asFinal, tick(asFinal, one, [], 100)), ["final"]);
});

test("soundsOf: 실패는 전이 순간 한 번, 화면이 떠 있는 동안과 타이틀은 무음 (R3-12, R3-13)", () => {
  const lv = parseLevel(["SLM"], 300);
  const s = createState(lv);
  const t1 = run(s, lv, 200, 100);
  const lost = tick(t1, lv, [], 100);
  assert.equal(lost.status, "lost");
  assert.deepEqual(soundsOf(t1, lost), ["fail"]);
  assert.deepEqual(soundsOf(lost, tick(lost, lv, [], 100)), []);
  const title = createTitleState(lv);
  assert.deepEqual(soundsOf(title, startGame(title, [lv, lv, lv])), []);
  const cleared = presses(createState(LV[0], 0), LV[0], keysOf(1));
  assert.deepEqual(soundsOf(cleared, startGame(cleared, LV)), []);
  assert.deepEqual(soundsOf(lost, restart(lost, [lv])), []);
});

function fakeStorage(initial) {
  const data = new Map(initial === undefined ? [] : [[BEST_KEY, initial]]);
  return { data, getItem: (k) => (data.has(k) ? data.get(k) : null), setItem: (k, v) => data.set(k, String(v)) };
}

test("최고 점수 읽기: 없음, 정수 문자열, 정수 아님은 저장값 없음, 예외는 실패 (8장)", () => {
  assert.deepEqual(readBest(() => fakeStorage()), { ok: true, value: null });
  assert.deepEqual(readBest(() => fakeStorage("1520")), { ok: true, value: 1520 });
  for (const bad of ["abc", "-5", "12.5", "", "1e3"]) {
    assert.deepEqual(readBest(() => fakeStorage(bad)), { ok: true, value: null }, bad);
  }
  assert.equal(readBest(() => { throw new Error("denied"); }).ok, false);
  assert.equal(readBest(() => ({ getItem() { throw new Error("x"); } })).ok, false);
});

test("최고 점수 저장: 더 클 때만 쓴다. 낮거나 같은 점수는 쓰지 않고 성공 (R3-18, R3-19)", () => {
  const st = fakeStorage();
  assert.deepEqual(saveBest(() => st, 1000), { ok: true, best: 1000 });
  assert.equal(st.data.get(BEST_KEY), "1000");
  assert.deepEqual(saveBest(() => st, 900), { ok: true, best: 1000 });
  assert.deepEqual(saveBest(() => st, 1000), { ok: true, best: 1000 });
  assert.equal(st.data.get(BEST_KEY), "1000");
  assert.deepEqual(saveBest(() => st, 1200), { ok: true, best: 1200 });
  assert.equal(st.data.get(BEST_KEY), "1200");
  assert.deepEqual([...st.data.keys()], [BEST_KEY]); // 키는 하나뿐
});

test("저장소가 막히면 읽기·쓰기 실패를 알리고 대체 저장을 만들지 않는다 (R3-20)", () => {
  assert.deepEqual(saveBest(() => { throw new Error("blocked"); }, 500), { ok: false, best: null });
  const readOnly = { getItem: () => null, setItem() { throw new Error("quota"); } };
  assert.deepEqual(saveBest(() => readOnly, 500), { ok: false, best: null });
});

function fakeAudioCtor(state = "running") {
  const log = { oscillators: [], resumed: 0, created: 0 };
  class Ctx {
    constructor() { log.created++; this.state = state; this.currentTime = 10; this.destination = {}; }
    resume() { log.resumed++; return Promise.resolve(); }
    createGain() {
      return { gain: { value: 1, setValueAtTime() {}, linearRampToValueAtTime() {} }, connect() {} };
    }
    createOscillator() {
      const o = { type: "", frequency: { value: 0, exponentialRampToValueAtTime(f, t) { o.sweep = [f, t]; } }, connect() {}, start(t) { o.t = t; }, stop() {} };
      log.oscillators.push(o);
      return o;
    }
  }
  return { Ctx, log };
}

test("효과음 합성값은 7장 표 그대로 (R3-13)", () => {
  assert.deepEqual(SOUNDS.push, { type: "sine", freqs: [110], sweepTo: 55, ms: 40 });
  assert.deepEqual(SOUNDS.deliver, { type: "sine", freqs: [660, 880], ms: 80 });
  assert.deepEqual(SOUNDS.clear, { type: "triangle", freqs: [523, 659, 784], ms: 120 });
  assert.deepEqual(SOUNDS.final, { type: "triangle", freqs: [523, 659, 784, 1047], ms: 140 });
  assert.deepEqual(SOUNDS.fail, { type: "sine", freqs: [392, 294, 196], ms: 160 });
  assert.deepEqual(Object.keys(SOUNDS).sort(), ["clear", "deliver", "fail", "final", "push"]);
});

test("오디오: unlock 전에는 소리 없음, 이후 음을 이어서 낸다, 재생 상태가 아니면 무음 (8장)", () => {
  const { Ctx, log } = fakeAudioCtor();
  const audio = createAudio(Ctx);
  audio.play("clear");
  assert.equal(log.oscillators.length, 0);
  audio.unlock();
  audio.unlock();
  assert.equal(log.created, 1);
  audio.play("clear");
  assert.deepEqual(log.oscillators.map((o) => o.frequency.value), [523, 659, 784]);
  assert.deepEqual(log.oscillators.map((o) => o.t), [10, 10.12, 10.24]);
  const suspended = fakeAudioCtor("suspended");
  const a2 = createAudio(suspended.Ctx);
  a2.unlock();
  a2.play("fail");
  assert.equal(suspended.log.oscillators.length, 0);
  assert.equal(suspended.log.resumed, 1);
});

test("오디오 생성이 실패하거나 지원이 없어도 예외 없이 무음 (8장)", () => {
  const a = createAudio(class { constructor() { throw new Error("no audio"); } });
  a.unlock();
  a.play("push");
  const b = createAudio(undefined);
  b.unlock();
  b.play("push");
});

test("문구: 점수와 최고 글자 글리프, 한글 글리프는 21자 (7장 R3, R3-21)", () => {
  assert.equal(STRINGS.score, "점수");
  assert.equal(STRINGS.best, "최고");
  const chars = new Set(Object.values(STRINGS).join("").replace(/ /g, ""));
  assert.equal([...chars].filter((c) => /[가-힣]/.test(c)).length, 21);
  for (const c of "점수최고") {
    const g = GLYPHS[c];
    assert.equal(g.length, 12);
    for (const row of g) {
      assert.equal(row.length, 12);
      for (const idx of row) assert.ok(idx === -1 || idx === 7);
    }
    assert.ok(g.flat().some((v) => v === 7), c);
  }
});

test("밀기 소리는 110Hz에서 55Hz로 40ms 내려가는 사인파 하나 (7장)", () => {
  const { Ctx, log } = fakeAudioCtor();
  const audio = createAudio(Ctx);
  audio.unlock();
  audio.play("push");
  assert.equal(log.oscillators.length, 1);
  const o = log.oscillators[0];
  assert.equal(o.type, "sine");
  assert.equal(o.frequency.value, 110);
  assert.deepEqual(o.sweep, [55, 10.04]);
});

// ---- R3 goal-6: 기대값은 GAME_DESIGN.md v6 (2.1.1 방향 표현, 9장 R3-22~R3-27) ----

test("방향: 레벨 시작, 타이틀 Enter, 클리어 Enter는 오른쪽 (R3-22)", () => {
  assert.equal(createState(LV[0], 0).facing, "right");
  assert.equal(startGame(createTitleState(LV[0]), LV).facing, "right");
  const cleared = presses(createState(LV[0], 0), LV[0], keysOf(1));
  assert.equal(startGame(cleared, LV).facing, "right");
});

test("방향: 왼쪽 이동이 시작되면 왼쪽, 오른쪽 이동이 시작되면 오른쪽 (R3-23)", () => {
  let s = tick(createState(LV[0], 0), LV[0], ["left"], 0);
  assert.equal(s.facing, "left"); // 이동이 시작되는 프레임부터
  s = run(s, LV[0], 600, 100);
  assert.equal(s.move, null);
  assert.equal(s.facing, "left"); // 도착한 뒤에도
  s = tick(s, LV[0], ["right"], 0);
  assert.equal(s.facing, "right");
});

test("방향: 위·아래 이동은 직전 좌우 방향을 유지한다 (R3-24)", () => {
  const left = press(createState(LV[0], 0), LV[0], "left");
  assert.equal(press(left, LV[0], "down").facing, "left");
  assert.equal(press(press(left, LV[0], "down"), LV[0], "down").facing, "left");
  assert.equal(press(createState(LV[0], 0), LV[0], "up").facing, "right");
  assert.equal(press(createState(LV[0], 0), LV[0], "down").facing, "right");
});

test("방향: 막힌 입력은 방향을 바꾸지 않는다 (R3-25)", () => {
  // 레벨 1: (4,4)에서 위로 (4,3)에 간 뒤 왼쪽 (3,3)은 울타리.
  let s = press(createState(LV[0], 0), LV[0], "up");
  const blocked = tick(s, LV[0], ["left"], 0);
  assert.equal(blocked.move, null);
  assert.equal(blocked.facing, "right");
  // 왼쪽을 보는 상태에서 오른쪽이 울타리인 칸: (1,0)의 오른쪽 (2,0)이 F.
  const lv = parseLevel(["..F.", "..S."], 30000);
  s = press(createState(lv), lv, "left"); // (1,1), 왼쪽
  s = press(s, lv, "up"); // (1,0), 왼쪽 유지
  assert.equal(s.facing, "left");
  const t = tick(s, lv, ["right"], 0);
  assert.equal(t.move, null);
  assert.equal(t.facing, "left");
  // 뒤가 막힌 편지를 미는 입력: 왼쪽을 보는 상태에서 오른쪽 편지 뒤가 벽.
  const lv2 = parseLevel([".SL#"], 30000);
  const faceLeft = { ...createState(lv2), facing: "left" };
  const pushBlocked = tick(faceLeft, lv2, ["right"], 0);
  assert.equal(pushBlocked.move, null);
  assert.equal(pushBlocked.facing, "left");
});

test("방향: 이동 중 입력은 방향을 바꾸지 않는다 (R3-25)", () => {
  let s = tick(createState(LV[0], 0), LV[0], ["up"], 0);
  s = tick(s, LV[0], ["left"], 100); // 이동 중 반대 입력은 무시
  assert.equal(s.facing, "right");
  s = run(s, LV[0], 600, 100);
  assert.equal(s.facing, "right");
  let l = tick(createState(LV[0], 0), LV[0], ["left"], 0);
  l = tick(l, LV[0], ["left", "right"], 100);
  assert.equal(l.facing, "left");
  assert.equal(run(l, LV[0], 600, 100).facing, "left");
});

test("방향: 편지를 미는 이동도 이동이라 방향이 바뀐다. 위·아래 밀기는 유지", () => {
  const right = parseLevel(["SL.."], 30000);
  assert.equal(tick(createState(right), right, ["right"], 0).facing, "right");
  const left = parseLevel(["..LS"], 30000);
  const pl = tick({ ...createState(left), pos: { x: 3, y: 0 } }, left, ["left"], 0);
  assert.equal(pl.move.push.index, 0);
  assert.equal(pl.facing, "left");
  const vert = parseLevel(["S", "L", "."], 30000);
  const faceLeft = { ...createState(vert), facing: "left" };
  const down = tick(faceLeft, vert, ["down"], 0);
  assert.ok(down.move.push);
  assert.equal(down.facing, "left");
});

test("방향: 동시 입력은 위, 아래, 왼쪽, 오른쪽 우선순위의 방향만 반영 (2.1.1)", () => {
  const s = createState(LV[0], 0);
  assert.equal(tick(s, LV[0], ["left", "up"], 0).facing, "right"); // 위가 우선, 방향 유지
  const l = tick(s, LV[0], ["right", "left"], 0);
  assert.equal(l.facing, "left"); // 왼쪽이 오른쪽보다 우선
});

test("방향: 시간 만료 실패 전이에서도 유지되고 리셋은 restart/startGame에서만 (R3-26)", () => {
  const lv = parseLevel(["..S.", "...."], 700);
  let s = tick(createState(lv), lv, ["left"], 0);
  s = run(s, lv, 700, 100);
  assert.equal(s.status, "lost");
  assert.equal(s.facing, "left");
  assert.equal(restart(s, [lv]).facing, "right");
});

test("방향: 플레이 중 R, 실패 후 R, 클리어 Enter, 최종 R은 오른쪽 (R3-26)", () => {
  const left = press(createState(LV[0], 0), LV[0], "left");
  assert.equal(restart(left, LV).facing, "right");
  const failed = { ...run(createState(LV[1], 1), LV[1], 45000, 100), facing: "left" };
  assert.equal(screenOf(failed), "fail");
  assert.equal(restart(failed, LV).facing, "right");
  const cleared = { ...presses(createState(LV[0], 0), LV[0], keysOf(1)), facing: "left" };
  assert.equal(screenOf(cleared), "clear");
  assert.equal(restart(cleared, LV), cleared); // 클리어에서 R은 같은 객체
  assert.equal(startGame(cleared, LV).facing, "right");
  const final = { ...presses(createState(LV[2], 2, 880), LV[2], keysOf(3)), facing: "left" };
  assert.equal(screenOf(final), "final");
  assert.equal(restart(final, LV).facing, "right");
  assert.equal(startGame(final, LV), final);
});

test("왼쪽 그림은 오른쪽 그림을 좌우로만 뒤집은 것이다: 새 색 없음 (R3-27)", () => {
  assert.deepEqual(mirrorX(mirrorX(SNAIL)), SNAIL); // 두 번 뒤집으면 원본
  assert.notDeepEqual(SNAIL_LEFT, SNAIL); // 뒤집힌 것이 보인다
  assert.equal(SNAIL_LEFT.length, 16);
  for (const row of SNAIL_LEFT) assert.equal(row.length, 16);
  const count = (sp) => {
    const m = new Map();
    for (const v of sp.flat()) m.set(v, (m.get(v) ?? 0) + 1);
    return [...m].sort((a, b) => a[0] - b[0]);
  };
  assert.deepEqual(count(SNAIL_LEFT), count(SNAIL)); // 색별 픽셀 수 같음, 새 색 없음
  const span = (sp) => {
    const cols = sp.flatMap((row) => row.map((v, x) => (v >= 0 ? x : null)).filter((x) => x !== null));
    return [Math.min(...cols), Math.max(...cols)];
  };
  assert.deepEqual(span(SNAIL_LEFT), span(SNAIL)); // 옆으로 밀려 보이지 않음 (1..14)
  assert.deepEqual(span(SNAIL), [1, 14]);
  // 오른쪽 그림의 더듬이(윤곽 색 0)는 (14,8),(14,9), 왼쪽 그림에서는 (1,8),(1,9).
  assert.equal(SNAIL[8][14], 0);
  assert.equal(SNAIL[9][14], 0);
  assert.equal(SNAIL_LEFT[8][1], 0);
  assert.equal(SNAIL_LEFT[9][1], 0);
  assert.equal(SNAIL_LEFT[8][14], -1);
});
