// 효과음 합성 (GAME_DESIGN.md 7장 효과음, 8장 오디오). 오디오 파일은 쓰지 않는다.
// 값은 7장 표의 합성 열 그대로다. 마스터 게인 0.2와 클릭 방지 램프는 7장의 에이전트 제안.
const MASTER_GAIN = 0.2;
const RAMP_S = 0.005;

// freqs의 각 음을 ms 길이로 이어서 낸다. sweepTo가 있으면 음 하나가 그 주파수까지 내려가거나 올라간다.
export const SOUNDS = {
  push: { type: "sine", freqs: [110], sweepTo: 55, ms: 40 },
  deliver: { type: "sine", freqs: [660, 880], ms: 80 },
  clear: { type: "triangle", freqs: [523, 659, 784], ms: 120 },
  final: { type: "triangle", freqs: [523, 659, 784, 1047], ms: 140 },
  fail: { type: "square", freqs: [392, 294, 196], ms: 160 },
};

// AudioContextCtor는 주입한다(브라우저에서는 window.AudioContext). 소리가 안 나도 게임은 계속된다.
export function createAudio(AudioContextCtor) {
  let ctx = null;
  let master = null;

  // 키 입력 핸들러 안에서 동기로 호출한다. 생성이나 재개가 실패하면 조용히 넘어간다.
  function unlock() {
    try {
      if (!ctx) {
        if (!AudioContextCtor) return;
        ctx = new AudioContextCtor();
        master = ctx.createGain();
        master.gain.value = MASTER_GAIN;
        master.connect(ctx.destination);
      }
      if (ctx.state !== "running") {
        const p = ctx.resume();
        if (p && p.catch) p.catch(() => {});
      }
    } catch {
      ctx = null;
      master = null;
    }
  }

  function play(name) {
    const spec = SOUNDS[name];
    if (!spec || !ctx || ctx.state !== "running") return;
    try {
      const dur = spec.ms / 1000;
      spec.freqs.forEach((freq, i) => {
        const t0 = ctx.currentTime + i * dur;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = spec.type;
        osc.frequency.value = freq;
        if (spec.sweepTo) osc.frequency.exponentialRampToValueAtTime(spec.sweepTo, t0 + dur);
        gain.gain.setValueAtTime(0, t0);
        gain.gain.linearRampToValueAtTime(1, t0 + RAMP_S);
        gain.gain.setValueAtTime(1, t0 + dur - RAMP_S);
        gain.gain.linearRampToValueAtTime(0, t0 + dur);
        osc.connect(gain);
        gain.connect(master);
        osc.start(t0);
        osc.stop(t0 + dur);
      });
    } catch {
      // 소리가 안 나도 게임은 그대로 진행한다 (8장).
    }
  }

  return { unlock, play };
}
