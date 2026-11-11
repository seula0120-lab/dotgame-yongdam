import { LEVELS } from "./levels.js";
import { STRINGS } from "./strings.js";
import { createAudio } from "./audio.js";
import { readBest, saveBest } from "./storage.js";
import { PALETTE, FLOOR, WALL, FENCE, SNAIL, LETTER, MAILBOX, DIGITS, GLYPHS, GLYPH_W, GLYPH_H } from "./sprites.js";
import {
  TILE,
  COLS,
  ROWS,
  parseLevel,
  createTitleState,
  startGame,
  restart,
  screenOf,
  soundsOf,
  tick,
  keyToDir,
  tileAt,
  renderPos,
  letterPositions,
  timerDisplay,
} from "./logic.js";

const levels = LEVELS.map((l) => parseLevel(l.grid, l.timeMs));
let state = createTitleState(levels[0]);

const audio = createAudio(window.AudioContext ?? window.webkitAudioContext);

// 저장소 접근 자체가 예외를 던질 수 있어 함수로 넘긴다 (8장). 실패하면 console.warn 한 번, 최고 줄 숨김.
const getStorage = () => window.localStorage;
let warned = false;
function warnStorage() {
  if (!warned) console.warn("최고 점수 저장소를 쓸 수 없어 최고 점수를 표시하지 않습니다.");
  warned = true;
}
const titleBest = readBest(getStorage);
if (!titleBest.ok) warnStorage();
let finalBest = null; // 최종 화면 전이에서 저장에 성공했을 때만 { best }

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
ctx.imageSmoothingEnabled = false;

// 이번 프레임에 새로 눌린 방향. 키 반복(event.repeat)은 버린다.
// Enter와 R은 방향과 별개 액션이다. 같은 프레임의 방향 입력은 버린다 (2.2).
let pressed = [];
let action = null;
window.addEventListener("keydown", (e) => {
  if (!e.repeat) audio.unlock(); // 사용자 입력 안에서 동기로 오디오를 준비한다 (8장)
  if (e.code === "Enter" || (e.code === "KeyR" && !e.ctrlKey && !e.metaKey)) {
    e.preventDefault();
    if (!e.repeat) action = e.code === "Enter" ? "start" : "restart";
    return;
  }
  const dir = keyToDir(e.code);
  if (!dir) return;
  e.preventDefault();
  if (e.repeat) return;
  pressed.push(dir);
});

function drawSprite(sprite, px, py) {
  for (let y = 0; y < sprite.length; y++) {
    for (let x = 0; x < sprite[y].length; x++) {
      const idx = sprite[y][x];
      if (idx < 0) continue;
      ctx.fillStyle = PALETTE[idx];
      ctx.fillRect(Math.round(px) + x, Math.round(py) + y, 1, 1);
    }
  }
}

// 글자 그리기: 비트맵 글리프, 글자 사이 1픽셀, 띄어쓰기는 6픽셀 빈 칸.
function textWidth(str) {
  return [...str].reduce((w, c) => w + (c === " " ? GLYPH_W : GLYPHS[c][0].length) + 1, -1);
}
function drawText(str, y) {
  let x = Math.floor((COLS * TILE - textWidth(str)) / 2);
  for (const c of str) {
    if (c === " ") { x += GLYPH_W + 1; continue; }
    drawSprite(GLYPHS[c], x, y);
    x += GLYPHS[c][0].length + 1;
  }
}

function renderTextScreen(lines) {
  ctx.fillStyle = PALETTE[0];
  ctx.fillRect(0, 0, COLS * TILE, ROWS * TILE);
  const top = Math.floor((ROWS * TILE - lines.length * 16) / 2);
  lines.forEach((t, i) => drawText(t, top + i * 16));
}

function render(level) {
  const screen = screenOf(state);
  const scoreLine = `${STRINGS.score} ${state.score}`;
  if (screen === "title") {
    const bestLine = titleBest.value === null ? [] : [`${STRINGS.best} ${titleBest.value}`];
    return renderTextScreen([STRINGS.title, ...bestLine, STRINGS.startHint]);
  }
  if (screen === "clear") return renderTextScreen([STRINGS.clear, scoreLine, STRINGS.startHint]);
  if (screen === "final") {
    const bestLine = finalBest ? [`${STRINGS.best} ${finalBest.best}`] : [];
    return renderTextScreen([STRINGS.clear, scoreLine, ...bestLine]);
  }
  if (screen === "fail") return renderTextScreen([STRINGS.fail]);
  ctx.fillStyle = PALETTE[3];
  ctx.fillRect(0, 0, COLS * TILE, ROWS * TILE);
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const t = tileAt(level, x, y);
      const sprite = t === "#" ? WALL : t === "F" ? FENCE : FLOOR;
      drawSprite(sprite, x * TILE, y * TILE);
      if (t === "M") drawSprite(MAILBOX, x * TILE, y * TILE);
    }
  }
  for (const l of letterPositions(state)) drawSprite(LETTER, l.x * TILE, l.y * TILE);
  const p = renderPos(state);
  drawSprite(SNAIL, p.x * TILE, p.y * TILE);
  drawTimer();
}

// 남은 시간: 맨 윗줄 가운데, 비트맵 글리프 (2.2, 6장).
function drawTimer() {
  const digits = [...String(timerDisplay(state))].map(Number);
  const width = digits.length * GLYPH_W + (digits.length - 1);
  let x = Math.floor((COLS * TILE - width) / 2);
  const y = Math.floor((TILE - GLYPH_H) / 2);
  for (const d of digits) {
    drawSprite(DIGITS[d], x, y);
    x += GLYPH_W + 1;
  }
}

let last = null;
function frame(now) {
  const dt = last === null ? 0 : now - last;
  last = now;
  // Enter/R이 실제로 상태를 바꾼 프레임에서만 tick을 건너뛰고 방향 입력을 버린다 (2.2).
  const next =
    action === "start" ? startGame(state, levels) : action === "restart" ? restart(state, levels) : state;
  const level = levels[next.levelIndex];
  const prev = state;
  state = next !== state ? next : tick(state, level, pressed, dt);
  for (const name of soundsOf(prev, state)) audio.play(name);
  // 최종 화면이 되는 전이에서 한 번만 저장한다 (8장).
  if (screenOf(prev) !== "final" && screenOf(state) === "final") {
    const saved = saveBest(getStorage, state.score);
    finalBest = saved.ok ? saved : null;
    if (!saved.ok) warnStorage();
  }
  action = null;
  pressed = [];
  render(level);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
