/*
"Highest terms" tab — highest sequence per length (the nth terms).

Instead of tracking each term's biggest value on its own, every row now saves
the highest SEQUENCE with that many terms: the record for length n is the whole
n-term sequence (term 1 .. term n), compared term by term (a sequence wins at
its first differing term; a longer sequence wins if one is a prefix of the
other).

How a record behaves, following the main ω-Y sequence (which only ever moves
up lexicographically while time flows forward):

  * While the main sequence still starts with the record, the record is kept
    exactly as saved. Example: the saved 7-term record 1,2,3,4,5,6,7 stays
    saved while the main sequence is 1,2,3,4,5,6,7,8 (and any longer
    extension of it).
  * A record is beaten only by a bigger sequence — never by travelling back
    in time: rewinding the clock with the Time Control keeps every record the
    rewound-to sequence still reaches, as long as a prefix of it is not
    bigger than the saved one.
  * A record is dropped as soon as the main sequence becomes too short to
    contain it. That covers both the Time Control rewinding past it and a new
    branch of the sequence taking over: when the sequence jumps to 1,2,4, the
    7-term record 1,2,3,4,5,6,7 stops being saved. The new branch will beat
    it anyway once it grows back to n terms.

Records are stored in localStorage (array of comma separated strings), so they
survive a reload. Terms are kept as decimal strings because a single term can
outgrow Number's exact integer range; comparisons go through BigInt when both
sides of a term are integers. Term 1 is always 1 (it can never grow), so rows
start at length 2.
*/

const HIGHEST_TERMS_TRACKED = 25; // rows: length 2 .. 26 (NOT counting nothing — length 1 is skipped)
const HIGHEST_TERMS_KEY = "lngi_app_highest_terms";
const HIGHEST_TERMS_DECIMAL = /^\d+$/;
// A valid saved record: decimal terms only, e.g. "1,2,4,8".
const HIGHEST_TERMS_RECORD = /^\d+(,\d+)*$/;

// Highest sequence ever seen per length. Index 0 is the 2-term record
// (e.g. "1,2"), index 24 is the 26-term record. null = no record yet.
var highestTerms = new Array(HIGHEST_TERMS_TRACKED).fill(null);
// The current main sequence's first n terms for each length, or null when the
// sequence is not long enough to reach that length.
var highestTermsNow = new Array(HIGHEST_TERMS_TRACKED).fill(null);
// Last rendered record/current pair per row, so the tab doesn't rewrite the
// same text 60 times a second.
var highestTermsRendered = new Array(HIGHEST_TERMS_TRACKED).fill(null);

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

// Wipe every saved sequence (used by the "Reset everything" button).
function highest_terms_reset() {
    highestTerms = new Array(HIGHEST_TERMS_TRACKED).fill(null);
    highestTermsNow = new Array(HIGHEST_TERMS_TRACKED).fill(null);
    highestTermsRendered = new Array(HIGHEST_TERMS_TRACKED).fill(null);
    try {
        localStorage.removeItem(HIGHEST_TERMS_KEY);
    } catch (e) {
        console.error("Failed to clear highest terms:", e);
    }
}

// Feed the current ω-Y sequence (raw string, e.g. "1,2,4,8,16") to the tracker.
// Called every frame from update(), whichever tab is open. `seq` is null when
// there is no sequence to show (the clock has not started yet).
//
// For every length n the sequence reaches, the record is the highest n-term
// prefix seen so far. Records longer than the sequence are dropped: that is
// the single rule behind "the 7-term record 1,2,3,4,5,6,7 stays saved while
// the main sequence is 1,2,3,4,5,6,7,8, until the sequence reaches 1,2,4".
function track_highest_terms(seq) {
    highestTermsNow = new Array(HIGHEST_TERMS_TRACKED).fill(null);

    const terms = (typeof seq === "string" && seq.length > 0) ? seq.split(",") : [];

    // Only the leading run of valid decimal terms counts as reachable.
    let reachable = 0;
    while (reachable < terms.length && HIGHEST_TERMS_DECIMAL.test(terms[reachable].trim())) {
        reachable++;
    }

    let changed = false;

    for (let i = 0; i < HIGHEST_TERMS_TRACKED; i++) {
        const n = i + 2;

        if (n <= reachable) {
            const prefix = terms.slice(0, n).map(t => t.trim()).join(",");
            highestTermsNow[i] = prefix;

            // A record is only beaten by a bigger sequence — never by time
            // travel. Equal prefixes (main sequence extending the record)
            // leave the saved record untouched.
            if (highestTerms[i] === null || compare_term_sequences(prefix, highestTerms[i]) > 0) {
                highestTerms[i] = prefix;
                changed = true;
            }
        } else if (highestTerms[i] !== null) {
            // The sequence no longer reaches this length (new branch such as
            // 1,2,4, or a rewind): the record can no longer stand.
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
