# Architect review, r1-fileurl, pass 1 (stage 3)

## Summary
The diagnosis is correct and the scope lock is respected. The plan never claims R1 passed. Two MEDIUM issues need correction before the executor starts: an overstated compatibility claim about AGENTS.md line 9, and an acceptance check (AC5) that cannot pass as written.

## Claims reviewed
- Root cause is file:// blocking ES modules, not a code bug. index.html:13 has `<script type="module" src="src/main.js">`. src/main.js starts with static `import` statements. A search of src/ and index.html found no fetch, XHR, FontFace, Image or asset loading, so there is no competing cause of a blank screen. Chrome-only evidence (agent run); other browsers vary. Confirmed.
- GAME_DESIGN.md ch.8 is "R3에 채운다." and the ch.9 R1 first sentence is "사람이 index.html을 열어 R1-1~R1-5를 ...". Both are the genuine ambiguity. Nothing else in GAME_DESIGN.md (2.1, 4장, R1-3) says how to run the game. Confirmed.
- Scope: `git status` shows no change to GAME_DESIGN.md, AGENTS.md, index.html, src/ or test/. Confirmed. Only .gjc state is dirty.
- Fake-pass check: the plan explicitly says R1 is unrecorded, keeps G001 blocked and the goal paused, and forbids ledger changes. Clean.
- Open decisions OPEN1-4 are honestly surfaced (status line 3, partial ch.8 wording, "server" ambiguity at AGENTS.md line 25 and ch.10, version/sign-off label).

## Findings
1. MEDIUM. Compatibility with AGENTS.md line 9 is overstated. Line 9 says the default is "index.html을 브라우저로 연다 (서버 없음)" and the server is only "필요하면". The proposed ch.8 text says HTTP is mandatory and file:// is unsupported. The plan calls this compatible and reads "서버 없음" as "no game server". That is a stretch. Fix: remove the "compatible" claim and add an OPEN item: AGENTS.md line 9 literally contradicts ch.8, and a human-approved one-line follow-up is needed. ch.8 stays authoritative because AGENTS.md says the design doc is the sole standard. Lines 13 and 25 are fine, with OPEN3 still covering line 25.
2. MEDIUM. AC5 and the Verification step require `git diff --stat` to show only GAME_DESIGN.md. .gjc/ is tracked and not ignored (AGENTS.md line 26) and is already dirty (runtime-state, audit.jsonl, ledger.jsonl, goals.json and others). The check cannot pass. Fix: scope it with `git diff --stat -- . ':!.gjc'`, or assert that AGENTS.md, index.html, src/ and test/ are unchanged and that GAME_DESIGN.md is the only changed non-.gjc file. The executor must not touch ultragoal/ledger.jsonl or goals.json.
3. LOW. The run command and URL are written in both ch.8 and ch.9. Have ch.9 refer to "8장 실행 환경" to avoid drift. Soften "브라우저가 막는다" to "Chrome 등 브라우저가" because only Chrome was verified.

## Architectural Status
WATCH

## Code Review Recommendation
COMMENT

## Recommendations
Apply findings 1 and 2 to the plan, then proceed. Finding 3 is optional polish. No blockers, and the plan does not need a new option.
