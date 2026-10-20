/*
"Type the next ω-Y sequence" game — the main play area.

Each length (4 .. 25) has its own chain: it starts at that length's first
sequence on the real ω-Y timeline and every CORRECT answer becomes the next
prompt, so you build the chain yourself from what you typed. Your answer must
be the sequence that really follows the prompt on the timeline — the true
successor of that state.

For every length the game saves the highest sequence you typed CORRECTLY
(lexicographic comparison, same rule as the Highest terms records), in
localStorage, so chains and records survive reloads.

Finding the successor never walks the whole timeline: the ω-Y path only ever
moves up lexicographically as omega grows (verified for the whole playable
range), so the end of the prompt's state — and with it the state right after
it — is found by bisecting the omega axis (~100 sequence evaluations, a
fraction of a second, instead of tens of thousands of steps).

Start sequences (the first state of each length on the real timeline) are
checked against the live generator in the tests; if a saved chain ever points
at something that is not a real ω-Y sequence, that chain resets to its start.
*/

const GAME_LENGTH_MIN = 4;
const GAME_LENGTH_MAX = 25;
const GAME_U_LO = 2.0;   // the timeline starts at ω = 2
const GAME_U_HI = 4.5;   // comfortably past anything reachable on the timeline
const GAME_KEY = "lngi_app_game";
const GAME_SEQ = /^\d+(,\d+)*$/;
// Bisection depth: 2.5 / 2^64 is far below double precision, so 64 halvings
// always converge to the floating point limit of the ω axis.
const GAME_BISECT_STEPS = 64;

// The first sequence of each length along the real timeline — where that
// length's chain starts. (Term 1 is always 1; short lengths simply start
// with all-ones states from the beginning of the timeline.)
const GAME_STARTS = {
    4: "1,1,1,1",
    5: "1,1,1,1,1",
    6: "1,1,1,1,1,1",
    7: "1,1,1,1,1,1,1",
    8: "1,1,1,1,1,1,1,1",
    9: "1,1,1,1,1,1,1,1,1",
    10: "1,1,1,1,1,1,1,1,1,1",
    11: "1,1,1,1,1,1,1,1,1,1,1",
    12: "1,1,1,1,1,1,1,1,1,1,1,1",
    13: "1,1,1,1,1,1,1,1,1,1,1,1,1",
    14: "1,1,1,1,1,1,1,1,1,1,1,1,1,1",
    15: "1,1,1,1,1,1,1,1,1,1,1,1,1,1,1",
    16: "1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1",
    17: "1,2,2,2,2,2,2,2,2,1,2,1,2,1,2,1,2",
    18: "1,2,2,2,2,2,2,2,2,2,1,2,1,2,1,2,1,2",
    19: "1,2,2,2,2,2,1,2,2,2,2,1,2,1,2,1,2,1,2",
    20: "1,2,3,2,3,2,3,1,2,3,1,2,1,1,1,1,1,1,1,1",
    21: "1,2,3,2,2,2,2,2,1,2,3,1,2,1,1,1,1,1,1,1,1",
    22: "1,2,3,3,1,2,3,2,2,2,2,2,2,1,2,2,2,2,2,2,2,1",
    23: "1,2,3,3,2,3,3,2,3,3,1,2,3,3,2,1,2,3,2,3,1,2,1",
    24: "1,2,3,3,3,2,3,3,3,2,3,2,3,2,3,2,1,2,3,2,3,1,2,1",
    25: "1,2,3,3,3,3,2,1,2,3,3,3,3,1,2,3,3,3,1,2,3,2,3,1,2",
};

// { length, chains: { n -> current prompt }, records: { n -> highest typed } }
var gameState = { length: GAME_LENGTH_MIN, chains: {}, records: {} };
// Per-session cache: sequence -> its true successor.
var gameSuccessorCache = new Map();
var gameInited = false;

function game_is_valid_seq(value) {
    return typeof value === "string" && GAME_SEQ.test(value);
}

// Canonical form of what the player typed: split on commas, trim each term,
// strip leading zeros ("01" == "1"). Returns null for anything that is not a
// plain list of whole numbers.
function game_normalize(raw) {
    if (typeof raw !== "string") return null;
    const parts = raw.split(",");
    const terms = [];
    for (const part of parts) {
        const t = part.trim();
        if (!/^\d+$/.test(t)) return null;
        terms.push(t.replace(/^0+(?=\d)/, ""));
    }
    if (terms.length === 0) return null;
    return terms.join(",");
}

function load_game_state() {
    gameState = { length: GAME_LENGTH_MIN, chains: {}, records: {} };
    gameSuccessorCache = new Map();
    try {
        const saved = localStorage.getItem(GAME_KEY);
        if (saved) {
            const parsed = JSON.parse(saved);
            if (parsed && typeof parsed === "object") {
                const len = Number(parsed.length);
                if (Number.isInteger(len) && len >= GAME_LENGTH_MIN && len <= GAME_LENGTH_MAX) {
                    gameState.length = len;
                }
                for (const kind of ["chains", "records"]) {
                    const bag = parsed[kind];
                    if (bag && typeof bag === "object") {
                        for (const n of Object.keys(bag)) {
                            const idx = Number(n);
                            if (Number.isInteger(idx) && idx >= GAME_LENGTH_MIN && idx <= GAME_LENGTH_MAX
                                && game_is_valid_seq(bag[n])) {
                                gameState[kind][n] = bag[n];
                            }
                        }
                    }
                }
            }
        }
    } catch (e) {
        console.error("Failed to load typing game state:", e);
    }
}

function save_game_state() {
    try {
        localStorage.setItem(GAME_KEY, JSON.stringify(gameState));
    } catch (e) {
        console.error("Failed to save typing game state:", e);
    }
}

// The sequence the timeline shows at omega `u`.
function game_state_at(u) {
    return num_to_lngi(u)[0];
}

// The current length's prompt (starts at that length's first sequence).
function game_prompt(n) {
    const key = String(n === undefined || n === null ? gameState.length : n);
    const chain = gameState.chains[key];
    if (game_is_valid_seq(chain)) return chain;
    return GAME_STARTS[key];
}

// The first omega where the timeline's state reaches `seq` (the path only
// climbs, so this brackets the whole interval the state lives on), or null
// when the path never reaches `seq` at all.
function game_first_reach(seq) {
    if (compare_term_sequences(game_state_at(GAME_U_LO), seq) > 0) return null;
    if (compare_term_sequences(game_state_at(GAME_U_HI), seq) < 0) return null;
    let lo = GAME_U_LO, hi = GAME_U_HI;
    for (let k = 0; k < GAME_BISECT_STEPS; k++) {
        const mid = lo + (hi - lo) / 2;
        if (mid <= lo || mid >= hi) break;
        if (compare_term_sequences(game_state_at(mid), seq) < 0) lo = mid;
        else hi = mid;
    }
    return compare_term_sequences(game_state_at(hi), seq) === 0 ? hi : null;
}

// The sequence that really follows `seq` on the ω-Y timeline, or null when
// `seq` is not a real ω-Y sequence / nothing within the known range follows
// it. Uses bisecting: the path never moves down lexicographically, so "the
// first omega where the state beats seq" is exactly the prompt's end — the
// state right there is the immediate successor.
function game_successor(seq) {
    if (!game_is_valid_seq(seq)) return null;
    if (gameSuccessorCache.has(seq)) return gameSuccessorCache.get(seq);

    let result = null;
    try {
        const start = game_first_reach(seq);
        if (start !== null && compare_term_sequences(game_state_at(GAME_U_HI), seq) > 0) {
            let lo = start, hi = GAME_U_HI;
            for (let k = 0; k < GAME_BISECT_STEPS; k++) {
                const mid = lo + (hi - lo) / 2;
                if (mid <= lo || mid >= hi) break;
                if (compare_term_sequences(game_state_at(mid), seq) > 0) hi = mid;
                else lo = mid;
            }
            const succ = game_state_at(hi);
            if (compare_term_sequences(succ, seq) > 0) result = succ;
        }
    } catch (e) {
        console.error("Failed to compute the next ω-Y sequence:", e);
        return null;
    }

    gameSuccessorCache.set(seq, result);
    return result;
}

// Check one attempt. Returns:
//   { ok: true,  newRecord, prompt }        — chain advanced to the answer
//   { ok: false, reason: "format" }         — not a sequence of whole numbers
//   { ok: false, reason: "invalid_prompt" } — saved chain wasn't real; reset
//   { ok: false, reason: "end" }            — nothing known past the prompt
//   { ok: false, reason: "wrong", expected }— not the true successor
function game_submit(rawInput) {
    const n = gameState.length;
    const key = String(n);

    let prompt = game_prompt(n);
    let expected = game_successor(prompt);
    if (expected === null && game_first_reach(prompt) === null) {
        // A corrupted/foreign saved chain: start that length over.
        delete gameState.chains[key];
        save_game_state();
        prompt = GAME_STARTS[key];
        expected = game_successor(prompt);
        game_render();
        return { ok: false, reason: "invalid_prompt" };
    }
    if (expected === null) return { ok: false, reason: "end" };

    const typed = game_normalize(rawInput);
    if (typed === null) return { ok: false, reason: "format" };

    if (typed !== expected) return { ok: false, reason: "wrong", expected: expected };

    // Correct: the answer becomes the new prompt and updates the record.
    gameState.chains[key] = typed;
    let newRecord = false;
    const old = gameState.records[key];
    if (old === undefined || compare_term_sequences(typed, old) > 0) {
        gameState.records[key] = typed;
        newRecord = true;
    }
    save_game_state();
    game_render();
    return { ok: true, newRecord: newRecord, prompt: typed };
}

// "Reset everything" support: forget every chain and every highest typed.
function game_reset() {
    gameState = { length: GAME_LENGTH_MIN, chains: {}, records: {} };
    gameSuccessorCache = new Map();
    try {
        localStorage.removeItem(GAME_KEY);
    } catch (e) {
        console.error("Failed to clear typing game state:", e);
    }
    game_render();
}

function game_feedback(message, kind) {
    const el = document.getElementById("game_feedback");
    if (!el) return;
    el.textContent = message || "";
    el.className = "game-feedback" + (kind ? " " + kind : "");
}

function game_render() {
    if (!gameInited) return;

    const n = gameState.length;
    const prompt = game_prompt(n);

    const badge = document.getElementById("game_len_badge");
    if (badge) badge.textContent = String(n);
    const promptEl = document.getElementById("game_prompt_seq");
    if (promptEl) promptEl.textContent = prompt;

    const select = document.getElementById("game_length");
    if (select && Number(select.value) !== n) select.value = String(n);

    const list = document.getElementById("game_records");
    if (list) {
        list.textContent = "";
        for (let L = GAME_LENGTH_MIN; L <= GAME_LENGTH_MAX; L++) {
            const row = document.createElement("div");
            row.className = "game-record" + (L === n ? " active" : "");
            const label = document.createElement("span");
            label.className = "game-record-len";
            label.textContent = `${L}:`;
            const value = document.createElement("span");
            value.className = "game-record-value";
            const rec = gameState.records[String(L)];
            value.textContent = rec !== undefined ? rec : "—";
            row.appendChild(label);
            row.appendChild(value);
            list.appendChild(row);
        }
    }
}

function game_init() {
    if (gameInited) return;
    const panel = document.getElementById("game_panel");
    if (!panel) return;
    gameInited = true;

    const select = document.getElementById("game_length");
    if (select) {
        select.textContent = "";
        for (let L = GAME_LENGTH_MIN; L <= GAME_LENGTH_MAX; L++) {
            const opt = document.createElement("option");
            opt.value = String(L);
            opt.textContent = String(L);
            select.appendChild(opt);
        }
        select.value = String(gameState.length);
        select.addEventListener("change", () => {
            const v = Number(select.value);
            if (Number.isInteger(v) && v >= GAME_LENGTH_MIN && v <= GAME_LENGTH_MAX) {
                gameState.length = v;
                save_game_state();
                game_feedback("", "");
                const input = document.getElementById("game_input");
                if (input) input.value = "";
                game_render();
            }
        });
    }

    const form = document.getElementById("game_form");
    if (form) {
        form.addEventListener("submit", (e) => {
            e.preventDefault();
            const input = document.getElementById("game_input");
            const res = game_submit(input ? input.value : "");
            if (res.ok) {
                game_feedback(
                    res.newRecord
                        ? `✓ Correct — new highest typed for length ${gameState.length}!`
                        : `✓ Correct!`,
                    "game-ok"
                );
                if (input) input.value = "";
            } else if (res.reason === "wrong") {
                game_feedback("✗ Not the next ω-Y sequence — try again.", "game-bad");
            } else if (res.reason === "format") {
                game_feedback("✗ Type a comma-separated sequence of whole numbers, e.g. 1,1,1,1,1.", "game-bad");
            } else if (res.reason === "invalid_prompt") {
                game_feedback("That saved chain wasn't a real ω-Y sequence — back to the start of this length.", "game-bad");
                if (input) input.value = "";
            } else if (res.reason === "end") {
                game_feedback("No further sequence is known past this point yet.", "game-bad");
            }
        });
    }

    game_render();
}

load_game_state();
game_init();
