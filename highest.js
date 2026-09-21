/*
"Highest terms" tab.

Keeps a record of the biggest value ever reached by each term of the current
ω-Y sequence (the one shown in the main card). Term 1 is always 1 — it can never
grow — so it is not tracked; the records cover terms 2 .. 1 + HIGHEST_TERMS_TRACKED.

A record only ever goes up while time moves forward: when a term drops back down
the saved high is kept until the term grows past it again. The one exception is
the Time Control panel — jumping back in time drops the records earned after the
moment jumped to, because those terms are no longer reachable. Records are stored
in localStorage, so they survive a reload.

Terms are kept as decimal strings because a single term can outgrow Number's
exact integer range; comparisons go through BigInt when both sides are integers.
*/

const HIGHEST_TERMS_TRACKED = 25; // tracked terms, NOT counting the first term
const HIGHEST_TERMS_KEY = "lngi_app_highest_terms";
const HIGHEST_TERMS_DECIMAL = /^\d+$/;

// Highest value ever seen per tracked term. Index 0 is term 2, index 24 is term 26.
var highestTerms = new Array(HIGHEST_TERMS_TRACKED).fill(null);
// What the current sequence actually has at each tracked term, or null when the
// sequence is not long enough to reach that term.
var highestTermsNow = new Array(HIGHEST_TERMS_TRACKED).fill(null);
// Last rendered record/current pair per row, so the tab doesn't rewrite the same
// text 60 times a second.
var highestTermsRendered = new Array(HIGHEST_TERMS_TRACKED).fill(null);
// Simulated elapsed time (virtualElapsed + timeOffset) seen on the previous
// frame, used to notice when the player rewinds time with the Time Control.
var highestTermsLastTime = null;

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

function load_highest_terms() {
    try {
        const saved = localStorage.getItem(HIGHEST_TERMS_KEY);
        if (!saved) return;
        const parsed = JSON.parse(saved);
        if (!Array.isArray(parsed)) return;

        highestTerms = new Array(HIGHEST_TERMS_TRACKED).fill(null);
        for (let i = 0; i < HIGHEST_TERMS_TRACKED && i < parsed.length; i++) {
            const value = parsed[i];
            if (typeof value === "string" && HIGHEST_TERMS_DECIMAL.test(value)) {
                highestTerms[i] = value;
            } else if (typeof value === "number" && Number.isInteger(value) && value > 0) {
                highestTerms[i] = String(value);
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

// The Time Control panel can send the clock backwards ("Go to", a negative Add,
// or a specific ordinal). Anything recorded after the moment we jumped back to
// belongs to a future that no longer exists, so those records are dropped — the
// tracker then re-derives them from the sequence now on screen, and they climb
// back as the player moves forward again.
//
// This is deliberately keyed on time moving backwards and NOT on "the term is
// missing from the current sequence": the sequence length swings around during
// perfectly normal forward play (e.g. 3 terms at day 10, 30 at day 12, 20 at
// day 13), so missing terms must not clear a record on their own.
function highest_terms_check_rewind(simulatedElapsed) {
    if (typeof simulatedElapsed !== "number" || !isFinite(simulatedElapsed)) return;

    if (highestTermsLastTime !== null && simulatedElapsed < highestTermsLastTime) {
        highestTerms = new Array(HIGHEST_TERMS_TRACKED).fill(null);
        highestTermsRendered = new Array(HIGHEST_TERMS_TRACKED).fill(null);
        save_highest_terms();
    }
    highestTermsLastTime = simulatedElapsed;
}

// Feed the current ω-Y sequence (raw string, e.g. "1,2,4,8,16") to the tracker.
// Called every frame from update(), whichever tab is open. `seq` is null when
// there is no sequence to show (the clock has not started yet), which still has
// to clear the "current" column instead of leaving the previous frame's values
// on screen.
function track_highest_terms(seq) {
    highestTermsNow = new Array(HIGHEST_TERMS_TRACKED).fill(null);
    if (typeof seq !== "string" || seq.length === 0) return;

    const terms = seq.split(",");
    let changed = false;

    // Start at index 1: term 1 is always 1 and is never shown.
    for (let i = 1; i < terms.length && i - 1 < HIGHEST_TERMS_TRACKED; i++) {
        const value = terms[i].trim();
        if (!HIGHEST_TERMS_DECIMAL.test(value)) continue;

        highestTermsNow[i - 1] = value;
        if (highestTerms[i - 1] === null || compare_highest_terms(value, highestTerms[i - 1]) > 0) {
            highestTerms[i - 1] = value;
            changed = true;
        }
    }

    // Only touch localStorage when an actual record was beaten.
    if (changed) save_highest_terms();
}

function highest_terms_init() {
    const container = document.getElementById("highest_terms_container");
    if (!container) return;

    for (let i = 0; i < HIGHEST_TERMS_TRACKED; i++) {
        const term = i + 2;

        const row = document.createElement("div");
        row.className = "highest-row";
        row.id = `highest_row_${term}`;

        const label = document.createElement("span");
        label.className = "highest-label";
        label.textContent = `Term ${term}`;

        const record = document.createElement("span");
        record.className = "highest-record";
        record.id = `highest_record_${term}`;

        const now = document.createElement("span");
        now.className = "highest-now";
        now.id = `highest_now_${term}`;

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
        const term = i + 2;
        const record = highestTerms[i];
        const now = highestTermsNow[i];

        if (record !== null) reached++;

        // Skip rows whose record and current value did not change since last frame.
        const cacheKey = `${record}|${now}`;
        if (highestTermsRendered[i] === cacheKey) continue;
        highestTermsRendered[i] = cacheKey;

        const row = document.getElementById(`highest_row_${term}`);
        const recordEl = document.getElementById(`highest_record_${term}`);
        const nowEl = document.getElementById(`highest_now_${term}`);
        if (!row || !recordEl || !nowEl) continue;

        recordEl.textContent = record === null ? "not reached yet" : record;

        if (now === null) {
            nowEl.textContent = "not in the current sequence";
        } else if (record !== null && compare_highest_terms(now, record) === 0) {
            nowEl.textContent = `current: ${now} (at record)`;
        } else {
            nowEl.textContent = `current: ${now}`;
        }

        row.className = "highest-row" + (
            record === null ? " unreached"
                : (now !== null && compare_highest_terms(now, record) === 0) ? " is-record"
                    : ""
        );
    }

    const count = document.getElementById("highest_terms_count");
    if (count) count.textContent = `${reached} / ${HIGHEST_TERMS_TRACKED}`;
}

load_highest_terms();
highest_terms_init();
