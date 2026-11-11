import { LEVEL_1, LEVEL_1_TIME_MS } from "./levels.js";
import { STRINGS } from "./strings.js";
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
  tick,
  keyToDir,
  tileAt,
  renderPos,
  letterPositions,
  timerDisplay,
} from "./logic.js";

const level = parseLevel(LEVEL_1, LEVEL_1_TIME_MS);
let state = createTitleState(level);

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
ctx.imageSmoothingEnabled = false;

// 이번 프레임에 새로 눌린 방향. 키 반복(event.repeat)은 버린다.
// Enter와 R은 방향과 별개 액션이다. 같은 프레임의 방향 입력은 버린다 (2.2).
let pressed = [];
let action = null;
window.addEventListener("keydown", (e) => {
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

// 글자 그리기: 비트맵 글리프, 글자 사이 1픽셀, 띄어쓰기는 6픽셀 빈 칸 (7장).
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

function render() {
  const screen = screenOf(state);
  if (screen === "title") return renderTextScreen([STRINGS.title, STRINGS.startHint]);
  if (screen === "clear") return renderTextScreen([STRINGS.clear]);
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
  if (action === "start") state = startGame(state, level);
  else if (action === "restart") state = restart(state, level);
  else state = tick(state, level, pressed, dt);
  action = null;
  pressed = [];
  render();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
