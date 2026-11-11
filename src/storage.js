// 최고 점수 저장 (GAME_DESIGN.md 8장). localStorage 키 하나, 최고 점수만.
// getStorage는 저장소를 돌려주는 함수다. 접근 자체가 예외를 던질 수 있어 함수로 받는다.
export const BEST_KEY = "snailPostman.bestScore";

// 저장된 최고 점수 읽기. 반환: { ok, value }.
// 값이 없거나 0 이상의 10진 정수 문자열이 아니면 { ok: true, value: null }(저장값 없음).
// 저장소 접근이나 getItem이 예외를 던지면 { ok: false, value: null }.
export function readBest(getStorage) {
  try {
    const raw = getStorage().getItem(BEST_KEY);
    if (typeof raw !== "string" || !/^\d+$/.test(raw)) return { ok: true, value: null };
    const n = Number(raw);
    return { ok: true, value: Number.isSafeInteger(n) ? n : null };
  } catch {
    return { ok: false, value: null };
  }
}

// 최종 화면 전이에서 한 번 호출한다. 쓰기 직전에 다시 읽어 이번 점수가 더 클 때만 쓴다.
// 반환: { ok, best }. 읽기나 쓰기가 실패하면 { ok: false, best: null }. 임시 대체는 없다.
export function saveBest(getStorage, score) {
  const read = readBest(getStorage);
  if (!read.ok) return { ok: false, best: null };
  if (read.value !== null && score <= read.value) return { ok: true, best: read.value };
  try {
    getStorage().setItem(BEST_KEY, String(score));
  } catch {
    return { ok: false, best: null };
  }
  return { ok: true, best: score };
}
