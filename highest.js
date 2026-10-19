/*
"Highest terms" tab — highest sequence per length (the nth terms).

Instead of tracking each term's biggest value on its own, every row saves the
highest SEQUENCE with that many terms: the record for length n is the whole
n-term sequence (term 1 .. term n), compared term by term (a sequence wins at
its first differing term).

How records behave, following the main ω-Y sequence (which only ever moves up
lexicographically while time flows forward):

  * While the main sequence still starts with the record, the record is kept
    exactly as saved. Example: the saved 7-term record 1,2,3,4,5,6,7 stays
    saved while the main sequence is 1,2,3,4,5,6,7,8 (and any longer
    extension of it).
  * A record is only ever beaten by a bigger sequence at that length — never
    by travelling in time and never because the main sequence got shorter.
    When the sequence moves to a new branch like 1,2,4, rows longer than the
    current sequence keep what they saved (1,2,4's branch replaces them one
    by one as it grows past them).
  * Nothing is skipped when time jumps ahead: "Go to", "Go to specific time"
    and the +time buttons queue the whole gap, and every sequence passed on
    the way is fed to the tracker in the background (small slices per
    animation frame), so jumping from 1,1 straight to 1,2,4 still records
    every sequence of 3+ terms reached before 1,2,4.
  * Sending the clock backwards with the Time Control drops the records of
    lengths the rewound-to sequence can no longer reach (those were earned
    in a future that no longer exists); lengths it still reaches keep theirs.

Records are stored in localStorage (array of comma separated strings), so they
survive a reload. Terms are kept as decimal strings because a single term can
outgrow Number's exact integer range; comparisons go through BigInt when both
sides of a term are integers. Term 1 is always 1 (it can never grow), so rows
start at length 2.
*/

const HIGHEST_TERMS_TRACKED = 25; // rows: length 2 .. 26 (length 1 is always just 1)
const HIGHEST_TERMS_KEY = "lngi_app_highest_terms";
const HIGHEST_TERMS_DECIMAL = /^\d+$/;
// A valid saved record: decimal terms only, e.g. "1,2,4,8".
const HIGHEST_TERMS_RECORD = /^\d+(,\d+)*$/;

// Forward-jump scan tuning (samples live in omega-space, not time-space,
// because the sequence states are driven by omega).
const HIGHEST_SCAN_STEP = 0.00005; // minimum gap between samples: any state that lives longer than this is always caught
const HIGHEST_SCAN_MAX = 20000;     // hard cap on samples per jump (absurd jumps degrade gracefully)
const HIGHEST_SCAN_BUDGET_MS = 10;  // background work per animation frame while a scan runs

// Highest sequence ever seen per length. Index 0 is the 2-term record
// (e.g. "1,2"), index 24 is the 26-term record. null = no record yet.
var highestTerms = new Array(HIGHEST_TERMS_TRACKED).fill(null);
// The current main sequence's first n terms for each length, or null when the
// sequence is not long enough to reach that length.
var highestTermsNow = new Array(HIGHEST_TERMS_TRACKED).fill(null);
// Last rendered record/current pair per row, so the tab doesn't rewrite the
// same text 60 times a second.
var highestTermsRendered = new Array(HIGHEST_TERMS_TRACKED).fill(null);
// Simulated time (virtualElapsed + timeOffset) seen on the previous frame,
// used to notice jumps in either direction.
var highestTermsLastTime = null;
// Ranges of omega not yet fed to the tracker after a forward jump: each job
// walks from `u` to `end` in `step` increments, a few per animation frame.
var highestTermsScanQueue = [];
// Set when time went backwards; the next tracked sequence drops the records
// of lengths it can no longer reach.
var highestTermsRewindPending = false;

function compare_highest_terms(a, b) {
    try {
        const x = BigInt(a);
        const y = BigInt(b);
        return x > y ? 1 : x < y ? -1 : 0;
    } catch (e) {
        const x = Number(a);
        const y = Number(b);
        return x > y ? 1 : x < y ? -1 : 0;
    }
}

// Compare two comma-separated sequences term by term (both must be valid
// decimal sequences). The first differing term decides; if one sequence is a
// prefix of the other, the longer one is bigger.
function compare_term_sequences(a, b) {
    const x = String(a).split(",");
    const y = String(b).split(",");
    const len = Math.min(x.length, y.length);
    for (let i = 0; i < len; i++) {
        const c = compare_highest_terms(x[i].trim(), y[i].trim());
        if (c !== 0) return c;
    }
    return x.length === y.length ? 0 : (x.length > y.length ? 1 : -1);
}

function is_valid_highest_record(value, length) {
    if (typeof value !== "string" || !HIGHEST_TERMS_RECORD.test(value)) return false;
    // Must contain exactly `length` terms. (Also filters out saves from the
    // old per-term format, which stored a single decimal value per row.)
    return value.split(",").length === length;
}

function load_highest_terms() {
    try {
        const saved = localStorage.getItem(HIGHEST_TERMS_KEY);
        if (!saved) return;
        const parsed = JSON.parse(saved);
        if (!Array.isArray(parsed)) return;

        highestTerms = new Array(HIGHEST_TERMS_TRACKED).fill(null);
        for (let i = 0; i < HIGHEST_TERMS_TRACKED && i < parsed.length; i++) {
            const value = parsed[i];
            if (is_valid_highest_record(value, i + 2)) {
                highestTerms[i] = value;
            }
        }
    } catch (e) {
        console.error("Failed to load highest terms:", e);
    }
}

function save_highest_terms() {
    try {
        localStorage.setItem(HIGHEST_TERMS_KEY, JSON.stringify(highestTerms));
    } catch (e) {
        console.error("Failed to save highest terms:", e);
    }
}

// Wipe every saved sequence and any pending jump scan (used by the
// "Reset everything" button).
function highest_terms_reset() {
    highestTerms = new Array(HIGHEST_TERMS_TRACKED).fill(null);
    highestTermsNow = new Array(HIGHEST_TERMS_TRACKED).fill(null);
    highestTermsRendered = new Array(HIGHEST_TERMS_TRACKED).fill(null);
    highestTermsLastTime = null;
    highestTermsScanQueue = [];
    highestTermsRewindPending = false;
    try {
        localStorage.removeItem(HIGHEST_TERMS_KEY);
    } catch (e) {
        console.error("Failed to clear highest terms:", e);
    }
}

// Fold one sequence into the records (records only — does NOT touch the
// "current" column, and never drops anything). Returns true when a record
// changed. Used by the per-frame tracker and by the forward-jump scan.
function highest_terms_absorb(seq) {
    const terms = (typeof seq === "string" && seq.length > 0) ? seq.split(",") : [];

    let reachable = 0;
    while (reachable < terms.length && HIGHEST_TERMS_DECIMAL.test(terms[reachable].trim())) {
        reachable++;
    }

    let changed = false;
    for (let i = 0; i < HIGHEST_TERMS_TRACKED; i++) {
        const n = i + 2;
        if (n > reachable) continue;
        const prefix = terms.slice(0, n).map(t => t.trim()).join(",");
        if (highestTerms[i] === null || compare_term_sequences(prefix, highestTerms[i]) > 0) {
            highestTerms[i] = prefix;
            changed = true;
        }
    }
    return changed;
}

// Watch the simulated clock for jumps. Called every frame BEFORE tracking.
//  - Forward: queue the whole gap so every sequence passed on the way is
//    recorded (this is what makes "Go to specific time" not skip anything).
//  - Backward: forget the pending gap and arm the rewind drop.
function highest_terms_check_time(simulatedElapsed) {
    if (typeof simulatedElapsed !== "number" || !isFinite(simulatedElapsed)) return;

    if (highestTermsLastTime !== null && simulatedElapsed !== highestTermsLastTime) {
        if (simulatedElapsed > highestTermsLastTime) {
            highest_terms_queue_scan(highestTermsLastTime, simulatedElapsed);
        } else {
            highestTermsScanQueue = [];
            highestTermsRewindPending = true;
        }
    }
    highestTermsLastTime = simulatedElapsed;

    highest_terms_scan_step();
}

// Queue a background scan of every distinct sequence between two moments of
// simulated time. Samples are taken in omega-space: the sequence at simulated
// time t is num_to_lngi(get_time(t)), and omega only moves forward with t, so
// a uniform omega grid with a step smaller than a state's omega-lifetime
// always catches that state.
function highest_terms_queue_scan(tFrom, tTo) {
    try {
        const lo = Math.max(0, Math.min(tFrom, tTo)); // nothing exists before the clock starts
        const hi = Math.max(tFrom, tTo);
        if (!(hi > lo)) return;

        const u1 = get_time(lo);
        const u2 = get_time(hi);
        if (!isFinite(u1) || !isFinite(u2) || !(u2 > u1)) return;

        const step = Math.max(HIGHEST_SCAN_STEP, (u2 - u1) / HIGHEST_SCAN_MAX);
        highestTermsScanQueue.push({ u: u1, end: u2, step: step });
    } catch (e) {
        console.error("Failed to queue highest terms scan:", e);
    }
}

// Consume part of the forward-jump queue each frame, within a small time
// budget so the game keeps running smoothly while records fill in.
function highest_terms_scan_step() {
    if (highestTermsScanQueue.length === 0) return;

    const now = () => (typeof performance !== "undefined" && performance.now ? performance.now() : Date.now());
    const deadline = now() + HIGHEST_SCAN_BUDGET_MS;
    let changed = false;

    try {
        while (highestTermsScanQueue.length > 0) {
            const job = highestTermsScanQueue[0];

            changed = highest_terms_absorb(num_to_lngi(job.u)[0]) || changed;
            job.u += job.step;
            if (job.u >= job.end) {
                changed = highest_terms_absorb(num_to_lngi(job.end)[0]) || changed;
                highestTermsScanQueue.shift();
            }

            if (now() >= deadline) break;
        }
    } catch (e) {
        // Never let a bad sample take down the update loop.
        console.error("Highest terms scan failed:", e);
        highestTermsScanQueue = [];
    }

    if (changed) save_highest_terms();
}

// Feed the current ω-Y sequence (raw string, e.g. "1,2,4,8,16") to the tracker.
// Called every frame from update(), whichever tab is open. `seq` is null when
// there is no sequence to show (the clock has not started yet).
//
// For every length n the sequence reaches, the record is the highest n-term
// prefix seen so far. Records longer than the sequence are kept — only a
// rewind of the clock (pending flag) drops them.
function track_highest_terms(seq) {
    highestTermsNow = new Array(HIGHEST_TERMS_TRACKED).fill(null);

    const terms = (typeof seq === "string" && seq.length > 0) ? seq.split(",") : [];

    // Only the leading run of valid decimal terms counts as reachable.
    let reachable = 0;
    while (reachable < terms.length && HIGHEST_TERMS_DECIMAL.test(terms[reachable].trim())) {
        reachable++;
    }

    // A rewind happened since the last frame: drop the records of the lengths
    // this sequence can no longer reach — they were earned in a future that
    // no longer exists. (With seq == null / a fresh start, that is everything.)
    const applyRewind = highestTermsRewindPending;
    if (applyRewind) highestTermsRewindPending = false;

    let changed = false;
    for (let i = 0; i < HIGHEST_TERMS_TRACKED; i++) {
        const n = i + 2;

        if (n <= reachable) {
            const prefix = terms.slice(0, n).map(t => t.trim()).join(",");
            highestTermsNow[i] = prefix;

            // A record is only beaten by a bigger sequence — never by time
            // travel, and never because the main sequence is short right now.
            if (highestTerms[i] === null || compare_term_sequences(prefix, highestTerms[i]) > 0) {
                highestTerms[i] = prefix;
                changed = true;
            }
        } else if (applyRewind && highestTerms[i] !== null) {
            highestTerms[i] = null;
            changed = true;
        }
    }

    // Only touch localStorage when something actually changed.
    if (changed) save_highest_terms();
}

function highest_terms_init() {
    const container = document.getElementById("highest_terms_container");
    if (!container) return;

    for (let i = 0; i < HIGHEST_TERMS_TRACKED; i++) {
        const n = i + 2;

        const row = document.createElement("div");
        row.className = "highest-row";
        row.id = `highest_row_${n}`;

        const label = document.createElement("span");
        label.className = "highest-label";
        label.textContent = `${n} terms`;

        const record = document.createElement("span");
        record.className = "highest-record";
        record.id = `highest_record_${n}`;
        record.title = `Highest sequence ever saved with ${n} terms`;

        const now = document.createElement("span");
        now.className = "highest-now";
        now.id = `highest_now_${n}`;
        now.title = `The main sequence's first ${n} terms right now`;

        row.appendChild(label);
        row.appendChild(record);
        row.appendChild(now);
        container.appendChild(row);
    }

    render_highest_terms();
}

function render_highest_terms() {
    let reached = 0;

    for (let i = 0; i < HIGHEST_TERMS_TRACKED; i++) {
        const n = i + 2;
        const record = highestTerms[i];
        const now = highestTermsNow[i];

        if (record !== null) reached++;

        // Skip rows whose record and current value did not change since last frame.
        const cacheKey = `${record}|${now}`;
        if (highestTermsRendered[i] === cacheKey) continue;
        highestTermsRendered[i] = cacheKey;

        const row = document.getElementById(`highest_row_${n}`);
        const recordEl = document.getElementById(`highest_record_${n}`);
        const nowEl = document.getElementById(`highest_now_${n}`);
        if (!row || !recordEl || !nowEl) continue;

        recordEl.textContent = record === null ? "not reached yet" : record;

        if (now === null) {
            nowEl.textContent = "not in the current sequence";
        } else if (record !== null && compare_term_sequences(now, record) === 0) {
            nowEl.textContent = `current: ${now} (at record)`;
        } else {
            nowEl.textContent = `current: ${now}`;
        }

        row.className = "highest-row" + (
            record === null ? " unreached"
                : (now !== null && compare_term_sequences(now, record) === 0) ? " is-record"
                    : ""
        );
    }

    const count = document.getElementById("highest_terms_count");
    if (count) count.textContent = `${reached} / ${HIGHEST_TERMS_TRACKED}`;
}

load_highest_terms();
highest_terms_init();
