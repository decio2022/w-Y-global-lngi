/* =====================================================================
 * Distinct Digit Dash
 * ---------------------------------------------------------------------
 * A typing game over the sequence of every positive integer that never
 * repeats a digit, from 1 up to the biggest possible one: 9,876,543,210.
 *
 *   1 2 3 4 5 6 7 8 9 10 12 13 ... 98 102 103 ... 9876543210
 *
 * (11 is illegal — two 1s. 22 is illegal. 23 is fine.)
 * There are exactly 8,877,690 numbers in the whole sequence.
 * ===================================================================== */

"use strict";

/* ---------------------------------------------------------------------
 * Sequence math
 * ------------------------------------------------------------------- */

const MAX_NUMBER = 9876543210; // largest integer with all-distinct digits

/** permutations: a * (a-1) * ... , b terms */
function perm(a, b) {
    let r = 1;
    for (let k = 0; k < b; k++) r *= a - k;
    return r;
}

/** smallest valid (all-distinct-digit) number strictly greater than n, or null */
function nextValid(n) {
    let s = String(n + 1).split("").map(Number);
    if (s.length > 10) return null;

    // find first position that repeats an earlier digit
    const used = new Set();
    let bad = -1;
    for (let i = 0; i < s.length; i++) {
        if (used.has(s[i])) { bad = i; break; }
        used.add(s[i]);
    }
    if (bad === -1) return Number(s.join("")); // n+1 itself is valid

    // bump position `bad` (or an earlier one) to the smallest unused larger
    // digit, then fill the tail with the smallest unused digits ascending
    let i = bad;
    while (i >= 0) {
        const prefixUsed = new Set(s.slice(0, i));
        let d = -1;
        for (let cand = s[i] + 1; cand <= 9; cand++) {
            if (!prefixUsed.has(cand)) { d = cand; break; }
        }
        if (d !== -1) {
            s[i] = d;
            const u = new Set(s.slice(0, i + 1));
            const rest = [];
            for (let c = 0; c <= 9; c++) if (!u.has(c)) rest.push(c);
            for (let j = i + 1; j < s.length; j++) s[j] = rest[j - i - 1];
            return Number(s.join(""));
        }
        i--;
    }

    // must grow one digit longer: smallest is 1,0,2,3,4,...
    const L = s.length + 1;
    if (L > 10) return null;
    const res = [1, 0];
    for (let c = 2; res.length < L; c++) res.push(c);
    return Number(res.join(""));
}

/** how many valid numbers lie in [1, n]  (combinatorial ranking, O(digits)) */
function countValidUpTo(n) {
    if (n < 1) return 0;
    if (n > MAX_NUMBER) n = MAX_NUMBER;
    const s = String(n).split("").map(Number);
    const L = s.length;
    let total = 0;
    for (let l = 1; l < L; l++) total += 9 * perm(9, l - 1); // shorter lengths
    const used = new Set();
    for (let i = 0; i < L; i++) {
        const lo = i === 0 ? 1 : 0;
        let c = 0;
        for (let d = lo; d < s[i]; d++) if (!used.has(d)) c++;
        total += c * perm(9 - i, L - i - 1);
        if (used.has(s[i])) return total; // n itself is invalid, prefix stops
        used.add(s[i]);
    }
    return total + 1; // n itself is valid
}

const TOTAL_COUNT = countValidUpTo(MAX_NUMBER); // 8,877,690

/* ---------------------------------------------------------------------
 * Milestones
 * ------------------------------------------------------------------- */

const MILESTONES = [
    { v: 10,         label: "first 2-digit number" },
    { v: 98,         label: "last 2-digit number" },
    { v: 102,        label: "first 3-digit (99, 100 & 101 don't exist!)" },
    { v: 987,        label: "biggest 3-digit number" },
    { v: 1023,       label: "first 4-digit number" },
    { v: 9876,       label: "biggest 4-digit number" },
    { v: 10234,      label: "first 5-digit number" },
    { v: 98765,      label: "biggest 5-digit number" },
    { v: 102345,     label: "first 6-digit number" },
    { v: 987654,     label: "biggest 6-digit number" },
    { v: 1023456,    label: "first 7-digit number" },
    { v: 9876543,    label: "biggest 7-digit number" },
    { v: 10234567,   label: "first 8-digit number" },
    { v: 98765432,   label: "biggest 8-digit number" },
    { v: 102345678,  label: "first 9-digit number" },
    { v: 987654321,  label: "biggest 9-digit number" },
    { v: 1023456789, label: "first 10-digit number" },
    { v: 9876543210, label: "THE END — every digit exactly once" },
];

/* ---------------------------------------------------------------------
 * State & persistence
 * ------------------------------------------------------------------- */

const SAVE_KEY = "ddd_save_v1";

let state = {
    current: 0,        // last number successfully typed (0 = not started)
    mistakes: 0,
    hints: 0,
    streak: 0,
    best: 0,
    elapsedMs: 0,
    skippedTotal: 0,   // raw integers dodged because of repeated digits
    trail: [],         // recent history for display
    done: false,
};

function saveState() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); } catch (e) { /* ignore */ }
}

function loadState() {
    try {
        const raw = localStorage.getItem(SAVE_KEY);
        if (!raw) return;
        const s = JSON.parse(raw);
        if (typeof s.current === "number" && s.current >= 0 && s.current <= MAX_NUMBER) {
            // sanity: saved number must itself be repeat-free
            const str = String(s.current);
            if (s.current === 0 || new Set(str).size === str.length) {
                state = Object.assign(state, s);
                if (!Array.isArray(state.trail)) state.trail = [];
            }
        }
    } catch (e) { /* corrupted save -> fresh start */ }
}

/* ---------------------------------------------------------------------
 * DOM
 * ------------------------------------------------------------------- */

const $ = (id) => document.getElementById(id);

const input        = $("game_input");
const currentEl    = $("current_number");
const currentLabelEl = $("current_label");
const promptEl     = $("prompt_text");
const feedbackEl   = $("feedback");
const skipBanner   = $("skip_banner");
const trailEl      = $("trail");
const hintBtn      = $("hint_btn");
const hintText     = $("hint_text");
const progressText = $("progress_text");
const progressBar  = $("progress_bar");
const progressPct  = $("progress_pct");
const gpText       = $("gp_text");
const gpBar        = $("gp_bar");
const gpPct        = $("gp_pct");
const streakEl     = $("streak");
const bestEl       = $("best_streak");
const speedEl      = $("speed");
const elapsedEl    = $("elapsed");
const etaEl        = $("eta");
const mistakesEl   = $("mistakes");
const hintsEl      = $("hints_used");
const skippedEl    = $("skipped_total");
const milestoneEl  = $("milestone");
const milestoneSub = $("milestone_sub");
const winOverlay   = $("win_overlay");
const winStats     = $("win_stats");

/* ---------------------------------------------------------------------
 * Runtime (not persisted)
 * ------------------------------------------------------------------- */

let target = null;          // the number the player must type next
let targetStr = "";
let wrongFlagged = false;   // one mistake per wrong attempt
let lastInputTime = 0;      // for the activity-based timer
let hitTimes = [];          // timestamps of correct entries (speed meter)
let hintTimer = null;

const fmt = (n) => n.toLocaleString("en-US");

function fmtDuration(ms) {
    const s = Math.floor(ms / 1000);
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
    return `${m}:${String(sec).padStart(2, "0")}`;
}

function fmtEta(ms) {
    if (!isFinite(ms) || ms <= 0) return "—";
    const min = ms / 60000;
    if (min < 60) return `${Math.ceil(min)} min`;
    const h = min / 60;
    if (h < 48) return `${h.toFixed(1)} h`;
    const d = h / 24;
    if (d < 730) return `${Math.ceil(d)} days`;
    const y = d / 365;
    if (y < 1000) return `${y.toFixed(1)} years`;
    return "millennia…";
}

/* ---------------------------------------------------------------------
 * UI updates
 * ------------------------------------------------------------------- */

function renderTrail() {
    if (state.trail.length === 0) {
        trailEl.innerHTML = "&nbsp;";
        return;
    }
    const parts = state.trail.map((n, i) =>
        i === state.trail.length - 1
            ? `<span class="trail-cur">${fmt(n)}</span>`
            : fmt(n)
    );
    // direction:rtl in CSS keeps the newest number in view; bdo keeps digits LTR
    trailEl.innerHTML = "<bdo>… " + parts.join(" → ") + "</bdo>";
}

function renderStats() {
    const idx = countValidUpTo(state.current);
    const frac = idx / TOTAL_COUNT;
    const countText = `${fmt(idx)} / ${fmt(TOTAL_COUNT)}`;
    const widthText = (frac * 100).toFixed(4) + "%";
    const pctText = (frac * 100).toFixed(5) + "%";

    progressText.textContent = countText;
    progressBar.style.width = widthText;
    progressPct.textContent = pctText;

    // same progress, mirrored inside the game card
    gpText.textContent = countText;
    gpBar.style.width = widthText;
    gpPct.textContent = pctText;

    streakEl.textContent = fmt(state.streak);
    bestEl.textContent = "best " + fmt(state.best);
    mistakesEl.textContent = fmt(state.mistakes);
    hintsEl.textContent = fmt(state.hints) + " hints used";
    skippedEl.textContent = fmt(state.skippedTotal);
    elapsedEl.textContent = fmtDuration(state.elapsedMs);

    // speed over the last 60 s
    const now = Date.now();
    hitTimes = hitTimes.filter((t) => now - t <= 60000);
    const npm = hitTimes.length;
    speedEl.textContent = fmt(npm);

    // ETA at current pace
    if (npm > 0 && !state.done) {
        const remaining = TOTAL_COUNT - idx;
        etaEl.textContent = "ETA: " + fmtEta((remaining / npm) * 60000);
    } else {
        etaEl.textContent = "ETA: —";
    }

    // next milestone
    const next = MILESTONES.find((m) => m.v > state.current);
    if (next) {
        milestoneEl.textContent = fmt(next.v);
        milestoneSub.textContent = next.label;
    } else {
        milestoneEl.textContent = "DONE";
        milestoneSub.textContent = "you finished the sequence";
    }
}

function renderMain() {
    const startFresh = state.current === 0;
    currentLabelEl.textContent = startFresh ? "STARTING AT" : "LAST NUMBER";
    currentEl.textContent = startFresh ? "1" : fmt(state.current);
    promptEl.textContent = startFresh
        ? "The sequence starts at 1 — type 1 to begin!"
        : "Type the NEXT repeat-free number";
    renderTrail();
    renderStats();
}

function showSkipInfo(prev, cur) {
    const skipped = cur - prev - 1;
    if (skipped <= 0) { skipBanner.hidden = true; return; }
    const from = prev + 1;
    const to = cur - 1;
    const range = skipped === 1 ? fmt(from) : `${fmt(from)} – ${fmt(to)}`;
    skipBanner.innerHTML =
        `⚠ jumped over <b>${fmt(skipped)}</b> repeat-digit number${skipped === 1 ? "" : "s"} (${range})`;
    skipBanner.hidden = false;
}

/* ---------------------------------------------------------------------
 * Game flow
 * ------------------------------------------------------------------- */

const PRAISE = ["Nice!", "Correct!", "Keep going!", "✔ clean digits", "Sharp!", "On a roll!"];

function advance() {
    const prev = state.current;
    state.current = target;
    state.streak++;
    if (state.streak > state.best) state.best = state.streak;
    state.skippedTotal += Math.max(0, target - prev - 1);
    state.trail.push(target);
    if (state.trail.length > 8) state.trail.shift();
    hitTimes.push(Date.now());

    // feedback
    const jump = target - prev - 1;
    feedbackEl.className = "feedback good";
    feedbackEl.textContent = jump > 0
        ? `Correct — and you dodged ${fmt(jump)} illegal number${jump === 1 ? "" : "s"}!`
        : PRAISE[Math.floor(Math.random() * PRAISE.length)];
    showSkipInfo(prev, target);

    input.value = "";
    input.classList.remove("bad");
    input.classList.add("ok");
    setTimeout(() => input.classList.remove("ok"), 250);
    wrongFlagged = false;
    hintText.textContent = "";

    // milestone toast
    const hitMs = MILESTONES.find((m) => m.v === state.current);
    if (hitMs) {
        feedbackEl.textContent = `🏁 MILESTONE: ${fmt(hitMs.v)} — ${hitMs.label}`;
    }

    // next target (or win)
    target = nextValid(state.current);
    if (target === null) {
        state.done = true;
        showWin();
    } else {
        targetStr = String(target);
    }

    renderMain();
    saveState();
}

function flagWrong() {
    if (wrongFlagged) return;
    wrongFlagged = true;
    state.mistakes++;
    state.streak = 0;
    input.classList.add("bad");
    feedbackEl.className = "feedback bad";
    const wrong = input.value;
    const asNum = Number(wrong);
    if (wrong.length > 1 && new Set(wrong).size !== wrong.length) {
        feedbackEl.textContent = `✖ ${fmt(asNum)} repeats a digit — it doesn't exist in this sequence!`;
    } else if (!Number.isNaN(asNum) && asNum <= state.current) {
        feedbackEl.textContent = `✖ ${fmt(asNum)} is behind you — the sequence only goes up!`;
    } else {
        feedbackEl.textContent = "✖ Not the next number. Backspace and try again.";
    }
    renderStats();
    saveState();
}

function onInput() {
    lastInputTime = Date.now();
    if (state.done) return;

    // digits only
    const cleaned = input.value.replace(/\D/g, "");
    if (cleaned !== input.value) input.value = cleaned;
    const val = input.value;

    if (val.length === 0) {
        input.classList.remove("bad");
        wrongFlagged = false;
        return;
    }

    if (val === targetStr) {
        advance();
    } else if (targetStr.startsWith(val)) {
        input.classList.remove("bad");
        wrongFlagged = false;
    } else {
        flagWrong();
    }
}

function showHint() {
    if (state.done || target === null) return;
    state.hints++;
    hintText.textContent = "next → " + fmt(target);
    clearTimeout(hintTimer);
    hintTimer = setTimeout(() => { hintText.textContent = ""; }, 4000);
    renderStats();
    saveState();
    input.focus();
}

function showWin() {
    winStats.innerHTML =
        `numbers typed: ${fmt(TOTAL_COUNT)}<br>` +
        `mistakes: ${fmt(state.mistakes)} &nbsp;·&nbsp; hints: ${fmt(state.hints)}<br>` +
        `best streak: ${fmt(state.best)}<br>` +
        `repeat-digit numbers dodged: ${fmt(state.skippedTotal)}<br>` +
        `time played: ${fmtDuration(state.elapsedMs)}`;
    winOverlay.hidden = false;
}

function resetRun() {
    if (!confirm("Reset all progress and start again from 1?")) return;
    state = {
        current: 0, mistakes: 0, hints: 0, streak: 0, best: 0,
        elapsedMs: 0, skippedTotal: 0, trail: [], done: false,
    };
    hitTimes = [];
    target = nextValid(0);
    targetStr = String(target);
    wrongFlagged = false;
    winOverlay.hidden = true;
    skipBanner.hidden = true;
    feedbackEl.className = "feedback";
    feedbackEl.innerHTML = "&nbsp;";
    hintText.textContent = "";
    input.value = "";
    renderMain();
    saveState();
    input.focus();
}

/* ---------------------------------------------------------------------
 * Timer tick — counts play time only while the player is active
 * ------------------------------------------------------------------- */

setInterval(() => {
    if (state.done) return;
    const now = Date.now();
    if (lastInputTime && now - lastInputTime < 15000) {
        state.elapsedMs += 1000;
    }
    renderStats();
}, 1000);

setInterval(saveState, 5000);

/* ---------------------------------------------------------------------
 * Wire up & boot
 * ------------------------------------------------------------------- */

input.addEventListener("input", onInput);
input.addEventListener("paste", (e) => e.preventDefault()); // no cheating
hintBtn.addEventListener("click", showHint);
$("reset_btn").addEventListener("click", resetRun);
$("win_reset_btn").addEventListener("click", resetRun);

// keep focus on the input for a pure-keyboard experience
document.addEventListener("keydown", (e) => {
    if (document.activeElement !== input && !e.ctrlKey && !e.metaKey && /^[0-9]$/.test(e.key)) {
        input.focus();
    }
});

loadState();
if (state.done || state.current >= MAX_NUMBER) {
    state.done = true;
    target = null;
    targetStr = "";
    renderMain();
    showWin();
} else {
    target = nextValid(state.current);
    targetStr = String(target);
    renderMain();
}
input.focus();
