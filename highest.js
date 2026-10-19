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
  * Increase counts are rebuilt for saves that predate the counter: the whole
    timeline is replayed from the start in the background until the replayed
    records catch up with every saved one, so an old save shows the increases
    that really happened (e.g. all the ones leading up to 1,2,4) instead of
    placeholders.

Records are stored in localStorage (array of comma separated strings), so they
survive a reload. Terms are kept as decimal strings because a single term can
outgrow Number's exact integer range; comparisons go through BigInt when both
sides of a term are integers. Term 1 is always 1 (it can never grow), so rows
start at length 2.
*/

const HIGHEST_TERMS_TRACKED = 25; // rows: length 2 .. 26 (length 1 is always just 1)
const HIGHEST_TERMS_KEY = "lngi_app_highest_terms";
const HIGHEST_TERMS_COUNTS_KEY = "lngi_app_highest_terms_increases";
// Written next to the counts once they are trustworthy: counts born with the
// counter, or counts rebuilt from the timeline (see the backfill block
// below). A save that has records but no marker predates counting and gets
// rebuilt on load.
const HIGHEST_TERMS_COUNTS_VER_KEY = "lngi_app_highest_terms_increases_v";
const HIGHEST_TERMS_COUNTS_VER = "1";
const HIGHEST_TERMS_DECIMAL = /^\d+$/;
// A valid saved record: decimal terms only, e.g. "1,2,4,8".
const HIGHEST_TERMS_RECORD = /^\d+(,\d+)*$/;

// Forward-jump scan tuning (samples live in omega-space, not time-space,
// because the sequence states are driven by omega).
const HIGHEST_SCAN_STEP = 0.00005; // minimum gap between samples: any state that lives longer than this is always caught
const HIGHEST_SCAN_MAX = 20000;     // hard cap on samples per jump (absurd jumps degrade gracefully)
const HIGHEST_SCAN_BUDGET_MS = 10;  // background work per animation frame while a scan runs
// The backfill replay (rebuilding the increases of a pre-counter save) gets
// its own budget: it is a one-off walk of the whole timeline that ends as
// soon as every saved record has been caught up with, so it may jank a bit
// harder while it runs.
const HIGHEST_BACKFILL_BUDGET_MS = 25;
const HIGHEST_BACKFILL_MAX_STEPS = 100000; // safety cap — far beyond the entire timeline

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
// Whether the loaded increase counts can be trusted as they are. A save that
// predates the counter carries records but no real counts: those are rebuilt
// by replaying the timeline (backfill block below).
var highestTermsCountsTrusted = true;
// Armed while a loaded save still needs that rebuild; the first tracked
// frame (the one that knows the clock) starts it.
var highestTermsBackfillPending = false;
// The running rebuild, or null: { recs, counts, unsat, u, lastSeq, steps,
// dirty } — recs/counts are the replay's own temporary copies.
var highestTermsBackfill = null;

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
    // Increase counters live in their own key so old saves keep working.
    try {
        const savedCounts = localStorage.getItem(HIGHEST_TERMS_COUNTS_KEY);
        highestTermsIncreases = new Array(HIGHEST_TERMS_TRACKED).fill(0);
        if (savedCounts) {
            const parsedCounts = JSON.parse(savedCounts);
            if (Array.isArray(parsedCounts)) {
                for (let i = 0; i < HIGHEST_TERMS_TRACKED && i < parsedCounts.length; i++) {
                    const c = parsedCounts[i];
                    if (typeof c === "number" && Number.isInteger(c) && c > 0) {
                        highestTermsIncreases[i] = c;
                    }
                }
            }
        }
    } catch (e) {
        console.error("Failed to load highest terms increase counts:", e);
    }

    try {
        const saved = localStorage.getItem(HIGHEST_TERMS_KEY);
        if (saved) {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed)) {
                highestTerms = new Array(HIGHEST_TERMS_TRACKED).fill(null);
                for (let i = 0; i < HIGHEST_TERMS_TRACKED && i < parsed.length; i++) {
                    const value = parsed[i];
                    if (is_valid_highest_record(value, i + 2)) {
                        highestTerms[i] = value;
                    }
                }
            }
        }
    } catch (e) {
        console.error("Failed to load highest terms:", e);
    }

    // Decide whether the counts that just loaded are real. Counts are only
    // marked trustworthy when they were born with the counter or were
    // already rebuilt; a save with records but no marker predates counting,
    // so its increases (everything that happened up to e.g. 1,2,4) are
    // rebuilt by replaying the timeline, starting on the first tracked frame.
    const hadRecords = highestTerms.some(value => value !== null);
    let marked = false;
    try {
        marked = localStorage.getItem(HIGHEST_TERMS_COUNTS_VER_KEY) === HIGHEST_TERMS_COUNTS_VER;
    } catch (e) {
        console.error("Failed to read the highest terms count marker:", e);
    }
    highestTermsCountsTrusted = !hadRecords || marked;
    highestTermsBackfillPending = hadRecords && !marked;
    highestTermsBackfill = null; // (re)loading discards any rebuild in flight

    // Migration / self-healing: a record without any count (saved before
    // increase counting existed, or lost alongside it) was increased at
    // least once — seed it with 1 as a placeholder so old saves don't show
    // 0s while the rebuild below fills in the real increases.
    let seeded = false;
    for (let i = 0; i < HIGHEST_TERMS_TRACKED; i++) {
        if (highestTerms[i] !== null && !(highestTermsIncreases[i] > 0)) {
            highestTermsIncreases[i] = 1;
            seeded = true;
        }
    }
    if (seeded) save_highest_terms();
}

function save_highest_terms() {
    try {
        localStorage.setItem(HIGHEST_TERMS_KEY, JSON.stringify(highestTerms));
        // Counts only ever change together with a record, so both are saved
        // here; saving one without the other would desync them. The version
        // marker rides along only with counts that are real — untrusted
        // (to-be-rebuilt) saves stay unmarked so the rebuild runs again on
        // the next load if this one never finishes.
        localStorage.setItem(HIGHEST_TERMS_COUNTS_KEY, JSON.stringify(highestTermsIncreases));
        if (highestTermsCountsTrusted) {
            localStorage.setItem(HIGHEST_TERMS_COUNTS_VER_KEY, HIGHEST_TERMS_COUNTS_VER);
        }
    } catch (e) {
        console.error("Failed to save highest terms:", e);
    }
}

// Raise the record at index `i` to `prefix` when it is strictly bigger (or
// missing) — the shared rule for live records and for a backfill replay's
// temporary records. Every actual raise — including the very first save for
// that length — counts as one increase.
function raise_record_into(recs, counts, i, prefix) {
    if (recs[i] !== null && compare_term_sequences(prefix, recs[i]) <= 0) {
        return false;
    }
    recs[i] = prefix;
    counts[i] = (counts[i] || 0) + 1;
    return true;
}

// Raise a live record (see above). Notifies a running backfill so it also
// catches up with the new value.
function raise_record(i, prefix) {
    if (!raise_record_into(highestTerms, highestTermsIncreases, i, prefix)) {
        return false;
    }
    if (highestTermsBackfill !== null) highest_terms_backfill_observe_raise(i);
    return true;
}

// Wipe every saved sequence, its increase counts and any pending jump scan or
// backfill (used by the "Reset everything" button).
function highest_terms_reset() {
    highestTerms = new Array(HIGHEST_TERMS_TRACKED).fill(null);
    highestTermsIncreases = new Array(HIGHEST_TERMS_TRACKED).fill(0);
    highestTermsNow = new Array(HIGHEST_TERMS_TRACKED).fill(null);
    highestTermsRendered = new Array(HIGHEST_TERMS_TRACKED).fill(null);
    highestTermsLastTime = null;
    highestTermsScanQueue = [];
    highestTermsRewindPending = false;
    // A wiped game starts fresh: future counts are born real, so nothing
    // needs rebuilding and the next save re-marks them as trusted.
    highestTermsBackfill = null;
    highestTermsBackfillPending = false;
    highestTermsCountsTrusted = true;
    try {
        localStorage.removeItem(HIGHEST_TERMS_KEY);
        localStorage.removeItem(HIGHEST_TERMS_COUNTS_KEY);
        localStorage.removeItem(HIGHEST_TERMS_COUNTS_VER_KEY);
    } catch (e) {
        console.error("Failed to clear highest terms:", e);
    }
}

// Fold one sequence into the given record/count arrays (records only — never
// touches the "current" column, and never drops anything). Returns a bitmask
// of the rows that were raised. Used by the per-frame tracker, by the
// forward-jump scan and by the backfill replay.
function highest_terms_absorb_into(recs, counts, seq) {
    const terms = (typeof seq === "string" && seq.length > 0) ? seq.split(",") : [];

    let reachable = 0;
    while (reachable < terms.length && HIGHEST_TERMS_DECIMAL.test(terms[reachable].trim())) {
        reachable++;
    }

    let raised = 0;
    for (let i = 0; i < HIGHEST_TERMS_TRACKED; i++) {
        const n = i + 2;
        if (n > reachable) continue;
        const prefix = terms.slice(0, n).map(t => t.trim()).join(",");
        if (raise_record_into(recs, counts, i, prefix)) {
            raised |= (1 << i);
        }
    }
    return raised;
}

// Fold one sequence into the live records. Returns true when a record
// changed.
function highest_terms_absorb(seq) {
    return highest_terms_absorb_into(highestTerms, highestTermsIncreases, seq) !== 0;
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

    if (highestTermsBackfillPending && highestTermsLastTime !== null) {
        highest_terms_backfill_begin();
    }
    highest_terms_backfill_step();
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

// ---- Rebuilding the increases of a save that predates counting ----
//
// An old save holds its records, but the increases that earned them happened
// before the counter existed (and before jumps were scanned), so they were
// never stored. To recover them, the whole timeline is replayed from the very
// start with empty temporary records: every raise the replay counts is an
// increase that really happened, in the order playing through would have
// produced them — including every sequence a forward jump passed, so the
// rebuilt counts reach values like the flood of increases leading up to
// 1,2,4. The replay stops as soon as the temporary records have caught up
// with every saved record (for a save that never rewound, that is exactly the
// moment its last record was earned); the rebuilt counts then replace the
// placeholders and the save is marked trusted, so later loads never rebuild
// again.

// Start a rebuild: empty temporary records, replay from the start of the
// clock. Called from the first tracked frame (get_time must exist by then).
function highest_terms_backfill_begin() {
    highestTermsBackfillPending = false;
    try {
        const unsat = new Set();
        for (let i = 0; i < HIGHEST_TERMS_TRACKED; i++) {
            if (highestTerms[i] !== null) unsat.add(i);
        }
        if (unsat.size === 0) {
            highest_terms_backfill_finish();
            return;
        }
        highestTermsBackfill = {
            recs: new Array(HIGHEST_TERMS_TRACKED).fill(null),
            counts: new Array(HIGHEST_TERMS_TRACKED).fill(0),
            unsat: unsat,
            u: get_time(0), // nothing exists before the clock starts
            lastSeq: null,
            steps: 0,
            dirty: false,
        };
    } catch (e) {
        console.error("Failed to start the highest terms backfill:", e);
        highest_terms_backfill_finish();
    }
}

// The live tracker raised a record while the replay runs: the replay must
// now also reach the new value (unless it has already passed it).
function highest_terms_backfill_observe_raise(i) {
    const bf = highestTermsBackfill;
    if (bf === null) return;
    bf.unsat.add(i);
    highest_terms_backfill_check_crossing(i);
}

// The live tracker dropped a record (rewind): nothing left to catch up with.
function highest_terms_backfill_observe_drop(i) {
    const bf = highestTermsBackfill;
    if (bf !== null) bf.unsat.delete(i);
}

// If the replay's record for row i has caught up with the live one, commit
// the replayed count as that row's real increase count.
function highest_terms_backfill_check_crossing(i) {
    const bf = highestTermsBackfill;
    if (bf === null || !bf.unsat.has(i)) return;
    const live = highestTerms[i];
    if (live === null) {
        bf.unsat.delete(i);
        return;
    }
    if (bf.recs[i] !== null && compare_term_sequences(bf.recs[i], live) >= 0) {
        highestTermsIncreases[i] = bf.counts[i];
        bf.unsat.delete(i);
        bf.dirty = true;
    }
}

// Wrap up the rebuild: the counts are now as real as the timeline can make
// them, so the save counts as trusted from here on.
function highest_terms_backfill_finish() {
    highestTermsBackfill = null;
    highestTermsBackfillPending = false;
    highestTermsCountsTrusted = true;
    save_highest_terms();
}

// Replay a slice of the timeline per animation frame, within its own time
// budget. Yields to the jump scan while one is draining, so live recording
// always gets a frame's time first. Repeated samples of an unchanged sequence
// are skipped — an unchanged sequence can't raise anything.
function highest_terms_backfill_step() {
    if (highestTermsBackfill === null) return;
    if (highestTermsScanQueue.length > 0) return;

    const bf = highestTermsBackfill;
    const now = () => (typeof performance !== "undefined" && performance.now ? performance.now() : Date.now());
    const deadline = now() + HIGHEST_BACKFILL_BUDGET_MS;

    try {
        while (bf.unsat.size > 0 && bf.steps <= HIGHEST_BACKFILL_MAX_STEPS) {
            const seq = num_to_lngi(bf.u)[0];
            if (seq !== bf.lastSeq) {
                bf.lastSeq = seq;
                const raised = highest_terms_absorb_into(bf.recs, bf.counts, seq);
                if (raised !== 0) {
                    for (let i = 0; i < HIGHEST_TERMS_TRACKED; i++) {
                        if ((raised & (1 << i)) !== 0) highest_terms_backfill_check_crossing(i);
                    }
                }
            }
            bf.u += HIGHEST_SCAN_STEP;
            bf.steps++;
            if (now() >= deadline) break;
        }
    } catch (e) {
        // Never let a bad sample take down the update loop.
        console.error("Highest terms backfill failed:", e);
    }

    if (bf.unsat.size === 0 || bf.steps > HIGHEST_BACKFILL_MAX_STEPS) {
        highest_terms_backfill_finish();
    } else if (bf.dirty) {
        // Persist the rows already caught up even if the walk is interrupted
        // (an interrupted rebuild starts over from scratch next load anyway).
        bf.dirty = false;
        save_highest_terms();
    }
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

    // While a forward-jump scan is still filling the gap, record-raising is
    // left to the scan: it walks every skipped sequence in chronological
    // order (and finishes with this frame's destination), so each increase is
    // counted the same way playing through would have counted it. This
    // frame only keeps the "current" column fresh.
    const scanPending = highestTermsScanQueue.length > 0;

    let changed = false;
    for (let i = 0; i < HIGHEST_TERMS_TRACKED; i++) {
        const n = i + 2;

        if (n <= reachable) {
            const prefix = terms.slice(0, n).map(t => t.trim()).join(",");
            highestTermsNow[i] = prefix;

            // A record is only beaten by a bigger sequence — never by time
            // travel, and never because the main sequence is short right now.
            // Each raise bumps the row's increase counter.
            if (!scanPending && raise_record(i, prefix)) {
                changed = true;
            }
        } else if (applyRewind && highestTerms[i] !== null) {
            // The record goes away, but its increase count is history and
            // stays saved.
            highestTerms[i] = null;
            if (highestTermsBackfill !== null) highest_terms_backfill_observe_drop(i);
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

        const count = document.createElement("span");
        count.className = "highest-count";
        count.id = `highest_count_${n}`;
        count.title = `How many times the ${n}-term record has been increased`;

        row.appendChild(label);
        row.appendChild(record);
        row.appendChild(now);
        row.appendChild(count);
        container.appendChild(row);
    }

    render_highest_terms();
}

function render_highest_terms() {
    let reached = 0;
    let totalIncreases = 0;

    for (let i = 0; i < HIGHEST_TERMS_TRACKED; i++) {
        const n = i + 2;
        const record = highestTerms[i];
        const now = highestTermsNow[i];
        const increases = highestTermsIncreases[i] || 0;

        if (record !== null) reached++;
        totalIncreases += increases;

        // Skip rows whose record, current value and count did not change
        // since last frame.
        const cacheKey = `${record}|${now}|${increases}`;
        if (highestTermsRendered[i] === cacheKey) continue;
        highestTermsRendered[i] = cacheKey;

        const row = document.getElementById(`highest_row_${n}`);
        const recordEl = document.getElementById(`highest_record_${n}`);
        const nowEl = document.getElementById(`highest_now_${n}`);
        const countEl = document.getElementById(`highest_count_${n}`);
        if (!row || !recordEl || !nowEl || !countEl) continue;

        countEl.textContent = String(increases);
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
    const totalEl = document.getElementById("highest_terms_increases");
    if (totalEl) totalEl.textContent = String(totalIncreases);
}

load_highest_terms();
highest_terms_init();
