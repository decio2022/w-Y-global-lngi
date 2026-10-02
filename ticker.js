/*
News ticker
===========

The slim scrolling bar under the header. It is a pure read-out: everything it
shows comes from the globals the other scripts already publish, so the ticker
never changes how the simulation runs.

Two kinds of stories go into the loop:

* live status — the ordinal the clock is sitting on, the run to the next
  ordinal, the next milestone, the best term record, time speed, virtual
  elapsed, who is online, and a rotating tip;
* headlines — notable events (a milestone reached, a new term record, a rewind,
  pause / resume, the sequence gaining a term). Headlines are kept in
  localStorage under `lngi_app_ticker_log` so the feed survives a reload.

Headlines recorded in a future the player later rewinds out of are dropped the
same way the Highest terms tab drops unreachable records: `entry.at` holds the
virtual elapsed time the headline was written at.

Items that belong to a tab are clickable and switch to it. The bar has its own
pause button, pauses while the pointer is over it (so items can be read and
clicked), and turns itself off from Settings → News ticker.
*/

const TICKER_STORAGE_KEY = "lngi_app_ticker_log";
const TICKER_LOG_MAX = 40;             // saved headlines
const TICKER_HEADLINES_SHOWN = 6;      // newest headlines that reach the loop
const TICKER_REFRESH_MS = 1000;        // how often the stories are recomputed
const TICKER_TIP_EVERY = 9;            // refreshes between two tips
const TICKER_COOLDOWN = {              // per story type, ms
    record: 10000,
    terms: 30000
};

// Settings (mirrored from the Settings modal; see ticker_read_settings)
var tickerEnabled = true;
var tickerShowEvents = true;
var tickerSpeed = 45;                  // px per second

// Headlines, newest first: { id, at, text, page, kind }
var tickerLog = [];
var tickerLogSeq = 0;

// Marquee state
var tickerOffset = 0;                  // px scrolled out of the loop
var tickerPeriod = 0;                  // width of one full loop of stories
var tickerItemsKey = null;             // rendered stories, to skip rebuilds
var tickerPendingItems = null;         // stories deferred while hovering
var tickerHover = false;
var tickerUserPaused = false;
var tickerRaf = null;
var tickerLastTs = 0;
var tickerRefreshCount = 0;
var tickerTipIndex = 0;

// Previous frame's state, used to notice events
var tickerLastState = { elapsed: null, milestone: null, records: null, paused: null, terms: null };
var tickerCooldowns = {};
// Stories allowed per refresh. A jump forward is one burst of news, not forty:
// without a cap a huge skip would flush every beaten record into the loop.
var tickerPushBudget = 3;

var TICKER_TIPS = [
    "Click the sequence itself to pause the clock, click it again to resume.",
    "The Progress tab lists each sequence you have passed — the bars are clickable.",
    "Highest terms keeps a record for terms 2–26 even while you are on another tab.",
    "The Milestone tab counts down to every checkpoint, from ω to way past 4-Y.",
    "Use Time Control to rewind the clock; records from the lost future are dropped.",
    "Visualizer draws the mountain of the live sequence — tick Sync to follow it.",
    "Virtual Elapsed → Search ordinal answers \"when does 1,2,4 show up?\".",
    "Buddy shows the first ten stages of the journey side by side.",
    "Save Layout in the Analysis toolbar stores your panel arrangement.",
    "Every story in this bar can be switched off in Settings → News ticker."
];

function tickerEl(id) {
    return document.getElementById(id);
}

// Milestone text is authored as HTML (it carries tags and entities).
// Strip it down to plain text for the one-line ticker.
function tickerPlain(html) {
    if (html === null || html === undefined) return "";
    const div = document.createElement("div");
    div.innerHTML = String(html).replace(/<br\s*\/?>/gi, " · ");
    const text = (div.textContent || "").replace(/\s+/g, " ").trim();
    return text.replace(/\s*·\s*$/, "");
}

function tickerElapsed() {
    return (typeof get_virtual_elapsed === "function") ? get_virtual_elapsed() : 0;
}

function tickerAge(ms) {
    const s = Math.max(0, ms / 1000);
    if (s < 60) return Math.round(s) + "s";
    if (s < 3600) return Math.round(s / 60) + "m";
    if (s < 86400) return Math.round(s / 3600) + "h";
    if (s < 86400 * 365) return Math.round(s / 86400) + "d";
    return Math.round(s / (86400 * 365)) + "y";
}

/* ------------------------------------------------------------------ *
 * Storage
 * ------------------------------------------------------------------ */

function ticker_load_log() {
    try {
        const raw = localStorage.getItem(TICKER_STORAGE_KEY);
        if (!raw) return;
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return;

        tickerLog = [];
        parsed.forEach(entry => {
            if (!entry || typeof entry.text !== "string" || !entry.text) return;
            tickerLog.push({
                id: Number(entry.id) || ++tickerLogSeq,
                at: (typeof entry.at === "number" && isFinite(entry.at)) ? entry.at : 0,
                text: entry.text,
                page: (typeof entry.page === "number") ? entry.page : null,
                kind: typeof entry.kind === "string" ? entry.kind : "event"
            });
        });
        tickerLog.length = Math.min(tickerLog.length, TICKER_LOG_MAX);
        tickerLog.forEach(entry => { if (entry.id > tickerLogSeq) tickerLogSeq = entry.id; });
    } catch (e) {
        console.error("Failed to load ticker headlines:", e);
    }
}

function ticker_save_log() {
    try {
        localStorage.setItem(TICKER_STORAGE_KEY, JSON.stringify(tickerLog));
    } catch (e) {
        console.error("Failed to save ticker headlines:", e);
    }
}

function ticker_clear_log() {
    tickerLog = [];
    tickerItemsKey = null;
    tickerPendingItems = null;
    ticker_save_log();
    ticker_refresh();
}

/* ------------------------------------------------------------------ *
 * Headlines
 * ------------------------------------------------------------------ */

// Add a headline. `opts.key` rate-limits the story type, `opts.cooldown` says
// how long that key stays quiet; `opts.force` skips the per-refresh budget for
// stories driven by the player rather than by the clock (pause, rewind).
// Identical back-to-back stories are dropped so the loop never shows the same
// sentence twice in a row.
function ticker_push(text, page, opts) {
    opts = opts || {};
    const now = Date.now();

    if (!opts.force && tickerPushBudget <= 0) return false;
    if (opts.key) {
        const wait = opts.cooldown === undefined ? TICKER_COOLDOWN.record : opts.cooldown;
        const last = tickerCooldowns[opts.key];
        if (last !== undefined && now - last < wait) return false;
    }
    const newest = tickerLog[0];
    if (newest && newest.text === text) return false;

    if (opts.key) tickerCooldowns[opts.key] = now;
    if (!opts.force) tickerPushBudget--;

    tickerLog.unshift({
        id: ++tickerLogSeq,
        at: tickerElapsed(),
        text: text,
        page: (page === undefined) ? null : page,
        kind: opts.kind || "event"
    });
    if (tickerLog.length > TICKER_LOG_MAX) tickerLog.length = TICKER_LOG_MAX;

    ticker_save_log();
    tickerItemsKey = null;
    return true;
}

// Everything we watch for headlines, compared against the previous refresh.
function ticker_detect_events(elapsed, milestone, records, now) {
    const last = tickerLastState;
    tickerPushBudget = 3;

    // The clock is 1 frame old on the first refresh: adopt it silently.
    if (last.elapsed === null) {
        last.elapsed = elapsed;
        last.milestone = milestone ? milestone.index : null;
        last.records = records ? JSON.stringify(highestTermsSnapshot()) : null;
        last.paused = tickerClockPaused();
        last.terms = now ? now.terms : null;
        return;
    }

    // A rewind throws away the headlines of the future that just stopped
    // existing, then says so.
    if (elapsed < last.elapsed - 1500) {
        const before = tickerLog.length;
        tickerLog = tickerLog.filter(entry => typeof entry.at !== "number" || entry.at <= elapsed + 1500);
        tickerLog.forEach(entry => { if (entry.id > tickerLogSeq) tickerLogSeq = entry.id; });
        ticker_save_log();
        tickerItemsKey = null;
        const dropped = before - tickerLog.length;
        ticker_push(
            `⏪ Time rewound to ω-Y <i>${now ? now.seq : "1"}</i>${dropped > 0 ? ` — ${dropped} headline${dropped === 1 ? "" : "s"} from the lost future dropped` : ""}`,
            1,
            { kind: "rewind", force: true }
        );
    }

    // Milestone reached. A jump forward can pass several at once; the newest
    // one is the story.
    if (milestone && last.milestone !== null && milestone.index > last.milestone) {
        const m = valid_milestones[milestone.index];
        if (m) {
            ticker_push(
                `🏁 Milestone #${milestone.index + 1}: <i>${m[0]}</i> — ${tickerPlain(m[1])}`,
                4,
                { kind: "milestone" }
            );
        }
    }

    // Term records. One story for a single term, a summary when a jump beats
    // half the board at once.
    if (records) {
        const snapshot = highestTermsSnapshot();
        const key = JSON.stringify(snapshot);
        if (last.records !== null && key !== last.records) {
            const previous = tickerParseSnapshot(last.records);
            const beaten = [];
            for (let i = 0; i < snapshot.length; i++) {
                if (snapshot[i] === previous[i] || snapshot[i] === null) continue;
                if (previous[i] === null || compare_highest_terms(snapshot[i], previous[i]) > 0) {
                    beaten.push(i);
                }
            }
            if (beaten.length === 1) {
                const i = beaten[0];
                ticker_push(
                    `📈 New high for term ${i + 2}: <b>${snapshot[i]}</b>${previous[i] ? ` (was ${previous[i]})` : ""}`,
                    6,
                    { key: "record", cooldown: TICKER_COOLDOWN.record, kind: "record" }
                );
            } else if (beaten.length > 1) {
                const i = beaten[beaten.length - 1];
                ticker_push(
                    `📈 ${beaten.length} term records beaten at once — best: term ${i + 2} at <b>${snapshot[i]}</b>`,
                    6,
                    { key: "record", cooldown: TICKER_COOLDOWN.record, kind: "record" }
                );
            }
            last.records = key;
        } else if (last.records === null) {
            last.records = key;
        }
    }

    // The sequence gained a term.
    if (now && last.terms !== null && now.terms > last.terms) {
        ticker_push(
            `🔭 ω-Y grew to ${now.terms} terms: <i>${now.seq}</i>`,
            1,
            { key: "terms", cooldown: TICKER_COOLDOWN.terms, kind: "terms" }
        );
    }

    // Pause / resume, from the pause button, the click-to-pause areas or here.
    const paused = tickerClockPaused();
    if (last.paused !== null && paused !== last.paused) {
        ticker_push(paused ? "⏸ Clock paused" : "▶ Clock resumed", 1, { kind: "pause", force: true });
    }

    last.elapsed = elapsed;
    last.milestone = milestone ? milestone.index : last.milestone;
    last.paused = paused;
    last.terms = now ? now.terms : last.terms;
}

function highestTermsSnapshot() {
    if (typeof highestTerms === "undefined" || !Array.isArray(highestTerms)) return [];
    return highestTerms.map(v => (v === null || v === undefined) ? null : String(v));
}

function tickerParseSnapshot(key) {
    try {
        const parsed = JSON.parse(key);
        return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
        return [];
    }
}

function tickerClockPaused() {
    if (typeof isPaused === "function") return isPaused();
    return typeof pause === "number" ? (pause % 2 === 0) : false;
}

/* ------------------------------------------------------------------ *
 * Live stories
 * ------------------------------------------------------------------ */

// What the main card is showing right now: {seq, percent, left, terms}.
function tickerNow() {
    if (typeof num_time !== "function" || typeof st !== "number") return null;

    const elapsed = tickerElapsed();
    if (!(elapsed > 0)) return null;

    const readout = num_time(st + elapsed, false);
    if (!Array.isArray(readout)) return null;

    const seq = readout[2];
    if (typeof seq !== "string" || seq.length === 0) return null;

    return {
        seq: seq,
        terms: seq.split(",").length,
        percent: readout[0],
        left: readout[1]
    };
}

// The next checkpoint of the Milestone tab (or the last one, once passed).
function tickerMilestone(elapsed) {
    if (typeof valid_milestones === "undefined" || !Array.isArray(valid_milestones)) return null;
    if (typeof get_time !== "function" || typeof get_time_inv !== "function") return null;

    const ct = get_time(Math.max(0, elapsed));
    let index = 0;
    while (index < valid_milestones.length - 1 && valid_milestones[index][4] < ct) index++;

    const m = valid_milestones[index];
    if (!m) return null;

    return {
        index: index,
        seq: m[0],
        label: tickerPlain(m[1]),
        inSeconds: (get_time_inv(m[4]) - elapsed) / 1000
    };
}

// The biggest value any tracked term has ever held.
function tickerRecord() {
    if (typeof highestTerms === "undefined" || !Array.isArray(highestTerms)) return null;
    if (typeof compare_highest_terms !== "function") return null;

    let best = null, term = 0, count = 0;
    for (let i = 0; i < highestTerms.length; i++) {
        const value = highestTerms[i];
        if (value === null || value === undefined) continue;
        count++;
        if (best === null || compare_highest_terms(value, best) > 0) {
            best = value;
            term = i + 2;
        }
    }
    return best === null ? null : { best: best, term: term, count: count };
}

function tickerOnline() {
    const el = tickerEl("online");
    if (!el) return null;
    const match = (el.textContent || "").match(/(\d+)/);
    return match ? Number(match[1]) : null;
}

function ticker_build_items(elapsed, now, milestone, record) {
    const items = [];

    if (!(elapsed > 0)) {
        const left = (typeof st === "number") ? Math.max(0, -elapsed / 1000) : 0;
        items.push({
            html: `⏳ Waiting for the clock — the run starts in ${formatSeconds(left)}`,
            page: null,
            cls: "ticker-wait"
        });
    }

    if (now) {
        items.push({
            html: `🌌 Now at ω-Y <i>${now.seq}</i>`,
            page: 1,
            cls: "ticker-now",
            title: "Open the Progress tab"
        });
        items.push({
            html: `📊 ${now.percent} to the next ordinal · ${now.left} left`,
            page: 1,
            cls: "ticker-live"
        });
    }

    if (milestone) {
        const delta = milestone.inSeconds;
        items.push({
            html: delta > 0
                ? `🏁 Next milestone #${milestone.index + 1}: <i>${milestone.seq}</i>${milestone.label ? ` — ${milestone.label}` : ""} · in ${formatSeconds(delta)}`
                : `🏁 Latest milestone #${milestone.index + 1}: <i>${milestone.seq}</i> · ${formatSeconds(-delta)} ago`,
            page: 4,
            cls: "ticker-milestone",
            title: "Open the Milestone tab"
        });
    }

    if (record) {
        items.push({
            html: `📈 Best ever term ${record.term}: <b>${record.best}</b> · ${record.count}/${HIGHEST_TERMS_TRACKED} terms recorded`,
            page: 6,
            cls: "ticker-record",
            title: "Open the Highest terms tab"
        });
    }

    if (typeof milestoneMulti !== "undefined" && typeof tps !== "undefined") {
        items.push({
            html: `⚡ Time speed ${milestoneMulti}× · ${tps.toFixed(1)} tps`,
            page: 1,
            cls: "ticker-speed"
        });
    }

    if (elapsed > 0) {
        items.push({
            html: `🕒 Virtual elapsed: ${formatSeconds(elapsed / 1000)}`,
            page: 1,
            cls: "ticker-clock"
        });
    }

    const online = tickerOnline();
    if (online !== null) {
        items.push({ html: `👥 ${online} online right now`, page: null, cls: "ticker-online" });
    }

    if (tickerShowEvents) {
        tickerLog.slice(0, TICKER_HEADLINES_SHOWN).forEach(entry => {
            const age = (entry.at > 0 && elapsed > entry.at)
                ? `<span class="ticker-age">${tickerAge(elapsed - entry.at)} ago</span> · `
                : "";
            items.push({
                html: `${age}${entry.text}`,
                page: entry.page,
                cls: "ticker-event ticker-event-" + entry.kind
            });
        });
    }

    if (tickerRefreshCount % TICKER_TIP_EVERY === 0) {
        tickerTipIndex = (tickerTipIndex + 1) % TICKER_TIPS.length;
    }
    items.push({ html: `💡 ${TICKER_TIPS[tickerTipIndex]}`, page: null, cls: "ticker-tip" });

    return items;
}

/* ------------------------------------------------------------------ *
 * Rendering
 * ------------------------------------------------------------------ */

function ticker_make_item(item) {
    const span = document.createElement("span");
    span.className = "ticker-item" + (item.cls ? " " + item.cls : "");
    span.innerHTML = item.html;
    if (item.page !== null && item.page !== undefined) span.dataset.page = String(item.page);
    if (item.title) span.title = item.title;
    return span;
}

function ticker_make_separator() {
    const sep = document.createElement("span");
    sep.className = "ticker-sep";
    sep.textContent = "•";
    return sep;
}

function ticker_items_key(items) {
    return items.map(i => i.html + "\u0001" + i.page + "\u0001" + (i.cls || "")).join("\u0002");
}

// Fill the track with enough copies of the story list to always cover the
// window, then hand the animation a period it can loop on: shifting the track
// by exactly one copy is invisible, so the marquee never jumps.
function ticker_render(items, force) {
    const track = tickerEl("ticker_track");
    const win = tickerEl("ticker_window");
    if (!track || !win) return;

    if (tickerHover && !force) {
        tickerPendingItems = items;
        return;
    }
    tickerPendingItems = null;

    const key = items.length === 0 ? "" : ticker_items_key(items);
    if (!force && key === tickerItemsKey) return;
    tickerItemsKey = key;

    track.textContent = "";

    if (items.length === 0) {
        tickerPeriod = 0;
        track.style.transform = "none";
        return;
    }

    items.forEach(item => {
        track.appendChild(ticker_make_item(item));
        track.appendChild(ticker_make_separator());
    });

    const setWidth = track.scrollWidth || track.offsetWidth || 0;
    tickerPeriod = setWidth;

    if (setWidth > 0) {
        const windowWidth = win.clientWidth || 0;
        // one copy plus enough more to keep the window covered at every offset
        const copies = Math.min(8, Math.max(2, Math.ceil(windowWidth / setWidth) + 2));
        for (let copy = 1; copy < copies; copy++) {
            items.forEach(item => {
                track.appendChild(ticker_make_item(item));
                track.appendChild(ticker_make_separator());
            });
        }
        tickerOffset = tickerPeriod > 0 ? tickerOffset % tickerPeriod : 0;
        if (tickerOffset < 0) tickerOffset += tickerPeriod;
        track.style.transform = `translateX(${-tickerOffset}px)`;
    }
}

function ticker_update_label(elapsed) {
    const label = tickerEl("ticker_label");
    if (!label) return;

    const paused = tickerClockPaused();
    let text = "📰 NEWS", cls = "ticker-label";
    if (!(elapsed > 0)) {
        text = "📰 WAITING";
        cls += " waiting";
    } else if (paused) {
        text = "📰 PAUSED";
        cls += " paused";
    } else {
        text = "📰 LIVE";
    }
    if (label.textContent !== text) label.textContent = text;
    if (label.className !== cls) label.className = cls;
}

/* ------------------------------------------------------------------ *
 * Loop
 * ------------------------------------------------------------------ */

function ticker_reduced_motion() {
    return !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
}

function ticker_frame(ts) {
    tickerRaf = null;
    if (!tickerEnabled) return;

    const dt = tickerLastTs ? Math.min(0.25, (ts - tickerLastTs) / 1000) : 0;
    tickerLastTs = ts;

    const track = tickerEl("ticker_track");
    const win = tickerEl("ticker_window");
    if (track && win && tickerPeriod > 0 && !tickerHover && !tickerUserPaused && !ticker_reduced_motion()) {
        tickerOffset = (tickerOffset + tickerSpeed * dt) % tickerPeriod;
        if (tickerOffset < 0) tickerOffset += tickerPeriod;
        track.style.transform = `translateX(${-tickerOffset}px)`;
    }

    tickerRaf = requestAnimationFrame(ticker_frame);
}

function ticker_start() {
    if (tickerRaf !== null) return;
    tickerLastTs = 0;
    tickerRaf = requestAnimationFrame(ticker_frame);
}

function ticker_stop() {
    if (tickerRaf !== null) window.cancelAnimationFrame(tickerRaf);
    tickerRaf = null;
}

function ticker_refresh() {
    const bar = tickerEl("news_ticker");
    if (!bar) return;

    if (!tickerEnabled) {
        bar.hidden = true;
        return;
    }
    bar.hidden = false;

    tickerRefreshCount++;

    const elapsed = tickerElapsed();
    const now = tickerNow();
    const milestone = tickerMilestone(elapsed);
    const record = tickerRecord();

    // With "reduce motion" asked for, the marquee stays still and the bar
    // becomes something the reader scrolls themselves.
    const win = tickerEl("ticker_window");
    if (win) win.classList.toggle("ticker-static", ticker_reduced_motion());

    ticker_detect_events(elapsed, milestone, record, now);
    ticker_update_label(elapsed);
    ticker_render(ticker_build_items(elapsed, now, milestone, record));
}

/* ------------------------------------------------------------------ *
 * Settings / wiring
 * ------------------------------------------------------------------ */

function ticker_apply() {
    const bar = tickerEl("news_ticker");
    if (!bar) return;

    bar.hidden = !tickerEnabled;
    tickerItemsKey = null;

    if (tickerEnabled) {
        ticker_refresh();
        ticker_start();
    } else {
        ticker_stop();
    }
}

function ticker_read_settings() {
    const enabled = tickerEl("ticker_enabled");
    const events = tickerEl("ticker_events");
    const speed = tickerEl("ticker_speed");

    tickerEnabled = enabled ? !!enabled.checked : true;
    tickerShowEvents = events ? !!events.checked : true;

    if (speed) {
        const value = parseFloat(speed.value);
        tickerSpeed = isFinite(value) ? Math.max(0, Math.min(400, value)) : 45;
    }

    ticker_apply();
}

function ticker_toggle_pause() {
    tickerUserPaused = !tickerUserPaused;
    const button = tickerEl("ticker_playpause");
    if (button) {
        button.textContent = tickerUserPaused ? "▶" : "❚❚";
        button.title = tickerUserPaused ? "Resume the ticker" : "Pause the ticker";
    }
    tickerLastTs = 0;
}

function ticker_wire() {
    const bar = tickerEl("news_ticker");
    const win = tickerEl("ticker_window");
    const track = tickerEl("ticker_track");
    if (!bar || !win || !track) return;

    // Stories that belong to a tab switch to it when clicked.
    track.addEventListener("click", e => {
        const item = e.target.closest ? e.target.closest(".ticker-item") : null;
        if (!item || !item.dataset.page) return;
        const target = parseInt(item.dataset.page, 10);
        if (isNaN(target) || typeof update_page !== "function" || typeof page === "undefined") return;
        page = target;
        update_page();
        window.scrollTo({ top: 0, behavior: "smooth" });
    });

    // Reading the bar should not scroll it away.
    win.addEventListener("mouseenter", () => { tickerHover = true; });
    win.addEventListener("mouseleave", () => {
        tickerHover = false;
        if (tickerPendingItems) {
            const pending = tickerPendingItems;
            tickerPendingItems = null;
            ticker_render(pending, true);
        }
    });

    const playpause = tickerEl("ticker_playpause");
    if (playpause) playpause.addEventListener("click", ticker_toggle_pause);

    const clear = tickerEl("ticker_clear");
    if (clear) clear.addEventListener("click", ticker_clear_log);

    ["ticker_enabled", "ticker_events", "ticker_speed"].forEach(id => {
        const el = tickerEl(id);
        if (el) el.addEventListener("input", ticker_read_settings);
    });

    window.addEventListener("resize", () => { tickerItemsKey = null; });
}

ticker_load_log();
ticker_wire();
ticker_refresh();
ticker_start();
setInterval(ticker_refresh, TICKER_REFRESH_MS);

// The settings are restored on DOMContentLoaded by ui.js, which runs before
// this listener (ui.js is parsed first), so the restored values win over the
// defaults in the markup.
document.addEventListener("DOMContentLoaded", ticker_read_settings);
