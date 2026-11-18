var tt = 0
const analysisContainer = document.getElementById("analysis_container");
let st = (1782316800000 + 23 * 3600000) + 864 * 1000
var timeSpeed = 1.0;
var timeOffset = 0;       
var virtualElapsed = 1; 
var milestoneMulti = 1;
var pause = 2;
var lastRealTime = Date.now();

function loadMisc() {
    try {
        const savedMisc = localStorage.getItem("lngi_app_misc");
        if (!savedMisc) return;
        const misc = JSON.parse(savedMisc);

        // Restore the simulated progress (the "time passed" since the start).
        // This value is what actually drives the main LNGI sequence, so a player
        // who has reached e.g. "1,3" resumes at "1,3" instead of snapping to "1,1".
        let restored = null;
        if (typeof misc.virtualElapsed === "number" && isFinite(misc.virtualElapsed)) {
            restored = misc.virtualElapsed;
        }
        // Compatibility: older saves only stored `time` (= virtualElapsed).
        else if (typeof misc.time === "number" && isFinite(misc.time) && misc.time > 0) {
            restored = misc.time;
        }

        // Restore the rest of the time related state.
        if (typeof misc.timeOffset === "number" && isFinite(misc.timeOffset)) timeOffset = misc.timeOffset;
        if (typeof misc.milestoneMulti === "number" && isFinite(misc.milestoneMulti)) milestoneMulti = misc.milestoneMulti;
        if (typeof misc.pause === "number" && isFinite(misc.pause)) pause = misc.pause;

        if (restored !== null) {
            // Restore the exact saved progress. Reloading must NOT advance the
            // clock — the player resumes precisely where they stopped.
            virtualElapsed = restored;
        }

        // Keep the legacy field in sync with the restored progress.
        player_time = virtualElapsed;
        const offsetEl = document.getElementById("input_timeOffset");
        if (offsetEl) offsetEl.value = String(Math.round(timeOffset / 1000));
    } catch (e) {
        console.error("Failed to load saved progress:", e);
    }
}

// Load saved state immediately on page start
loadMisc();
var mpage = 0;

const speedInput = document.getElementById("input_timeSpeed");
const offsetInput = document.getElementById("input_timeOffset");

function resettime() {
    virtualElapsed = Date.now() - st
    timeOffset = 0
    timeSpeed = 1
    speedInput.value = "1";
    offsetInput.value = "0";
}

if (speedInput && offsetInput) {
    speedInput.addEventListener("input", function () {
        let val = parseFloat(speedInput.value);
        timeSpeed = isNaN(val) ? 0 : val;
    });

    offsetInput.addEventListener("input", function () {
        let val = parseFloat(offsetInput.value);
        timeOffset = isNaN(val) ? 0 : val * 1000;
    });
}
function formatSeconds(totalSeconds) {
    if (totalSeconds <= 0) return "0 seconds";
    let s = totalSeconds;
    const years = Math.floor(s / (86400*365)); s %= (86400*365);
    const days = Math.floor(s / 86400); s %= 86400;
    const hours = Math.floor(s / 3600); s %= 3600;
    const minutes = Math.floor(s / 60); s %= 60;
    const seconds = s;
    const p = (val, unit) => val > 0 ? `${val} ${unit}${val > 1 ? 's' : ''}` : null;
    const parts = [
        p(years, 'year'),
        p(days, 'day'),
        p(hours, 'hour'),
        p(minutes, 'minute'),
        p(seconds.toFixed(2), 'second')
    ];

    return parts.filter(Boolean).join(' ');
}
// Cached DOM lookups: update() runs every animation frame, so repeated
// getElementById() calls and unconditional innerHTML/style writes dominate
// the frame cost. These helpers only touch the DOM when the value changed.
var _elCache = new Map()
function $(id) {
    let el = _elCache.get(id)
    if (!el) {
        el = document.getElementById(id)
        if (el) _elCache.set(id, el)
    }
    return el
}
function setHTML(el, html) {
    if (!el || el._lastHTML === html) return
    el._lastHTML = html
    el.innerHTML = html
}
function setText(el, text) {
    if (!el || el._lastText === text) return
    el._lastText = text
    el.textContent = text
}
// Same idea for <input> values, which the mountain sync used to rewrite every
// frame whether or not the sequence had changed.
function setValue(el, value) {
    if (!el || el.value === value) return
    el.value = value
}

// The bars are not capped at a fixed count: the chain a countdown walks through
// can be hundreds of bars long (see ntl), so bars are created in chunks as a
// countdown needs them and hidden again when it no longer does. The array
// always holds `scratch_bar_created` reusable display slots. A slot can map to
// a different countdown index when only the last bars are displayed.
var scratch_bar_elements = []
var scratch_bar_count = 0
var scratch_bar_created = 0

function scratch_bar_ensure(n) {
    const content = document.getElementById("scratch_content")
    if (!content) return
    while (scratch_bar_created < n) {
        const i = scratch_bar_created++
        const p = document.createElement("div")
        p.style.position = "absolute"
        p.id = `bar_${i}`
        p.style.textWrap = `nowrap`
        p.title = "Click to jump to this sequence"
        // The bar is split into a notation label and a meta text
        // (percentage / time). The label is only rewritten when the converted
        // notation changes; the meta text is refreshed every frame.
        p._label = document.createElement("span")
        p._label.className = "bar-label"
        p._meta = document.createElement("small")
        p._meta.className = "bar-meta"
        p.appendChild(p._label)
        p.appendChild(document.createTextNode(" "))
        p.appendChild(p._meta)
        p.addEventListener("click", () => jump_to_scratch_bar(p._sequenceIndex))
        content.appendChild(p)
        scratch_bar_elements[i] = p
    }
}

function hide_scratch_bar(index) {
    const bar = scratch_bar_elements[index]
    if (bar) {
        if (bar.style.display !== "none") bar.style.display = "none"
        scratch_bar_label_cache[index] = undefined
        scratch_bar_meta_cache[index] = undefined
    }
}

function scratch_bar_init() {
    // Start from an empty container: a reload may run this again.
    const content = document.getElementById("scratch_content")
    if (content) content.textContent = ""
    scratch_bar_elements = []
    scratch_bar_created = 0
    scratch_bar_ensure(8)
}

var lt = 0
// Last notation rendered on each bar. The notation conversion itself is
// memoized in convert_From_wY(), and a label is only rewritten when its text
// actually changes, so a frame only pays for labels that are genuinely new
// instead of re-converting every bar like it used to. Conversions are instant:
// every bar is converted in the same frame it is needed, with no time budget.
var scratch_bar_label_cache = []
// Last meta text (percentage / countdown) shown on each bar. The countdown only
// changes ~10 times a second, so this keeps most frames from touching those
// text nodes at all.
var scratch_bar_meta_cache = []

function scratch_bar_sequence(i) {
    return super_list[i][0] + (i === super_list.length - 1 ? ",1" : "")
}

function scratch_bar_boundary(i, x) {
    if (i === 0) return Math.floor(x) + 1
    const [, steps, remaining] = super_list[i]
    return x + remaining * 2 ** (1 - steps)
}

// Notation conversions can take longer than a frame even for a single label. Keep
// just one worker request in flight; the next frame chooses from the current
// bars, so scrolling/time/setting changes cannot build an obsolete backlog.
var progress_conversion_worker = null
var progress_conversion_pending = false
var progress_conversion_unavailable = false

function progress_bar_label(ord, mode) {
    if (mode === "wY") return ord
    const key = convert_cache_key(ord, mode)
    const cached = convert_cache.get(key)
    if (cached !== undefined) return cached
    if (!progress_conversion_worker && !progress_conversion_unavailable) {
        try {
            progress_conversion_worker = new Worker("progress-conversion-worker.js")
            progress_conversion_worker.onmessage = ({ data }) => {
                convert_cache_put(data.key, data.label)
                progress_conversion_pending = false
            }
            progress_conversion_worker.onerror = error => {
                console.warn("Progress bar conversion worker failed; showing ω-Y labels.", error)
                progress_conversion_worker.terminate()
                progress_conversion_worker = null
                progress_conversion_pending = false
                progress_conversion_unavailable = true
            }
        } catch (error) {
            console.warn("Progress bar conversion worker unavailable; showing ω-Y labels.", error)
            progress_conversion_unavailable = true
        }
    }
    if (progress_conversion_worker && !progress_conversion_pending) {
        progress_conversion_pending = true
        progress_conversion_worker.postMessage({
            key, ord, mode,
            settings: {
                yTerms: Y_Terms.valueAsNumber, bmsTerms: BMS_Terms.valueAsNumber,
                compress: compress_BMS.checked, format: format_cOCF.checked
            }
        })
    }
    // Show the correct raw sequence while its notation is being calculated.
    return ord
}

function update_scratch_bars(x, currentSimulatedTime) {
    // The final countdown controls the main bar even outside the progress page.
    const last = super_list.length - 1
    if (last >= 0) {
        lt = Math.max(0, (get_time_inv(scratch_bar_boundary(last, x)) - currentSimulatedTime) / 1000)
    }
    if (page != 1) return

    const limit = document.getElementById("limit_scratch_bars").checked
    const start = limit ? Math.max(0, super_list.length - 40) : 0
    const count = super_list.length - start
    scratch_bar_ensure(count)
    scratch_bar_count = count
    for (let slot = count; slot < scratch_bar_created; slot++) hide_scratch_bar(slot)

    for (let slot = 0; slot < count; slot++) {
        const i = start + slot
        const bar = scratch_bar_elements[slot]
        bar._sequenceIndex = i
        if (bar.style.display === "none") bar.style.display = ""
        const secondsLeft = i === last ? lt : Math.max(0,
            (get_time_inv(scratch_bar_boundary(i, x)) - currentSimulatedTime) / 1000)
        const ordText = scratch_bar_sequence(i)
        const label = isPaused() && scratch_bar_display !== "wY"
            ? progress_bar_label(ordText, scratch_bar_display) : ordText
        if (label !== scratch_bar_label_cache[slot]) {
            scratch_bar_label_cache[slot] = label
            bar._label.innerHTML = label
        }

        const percent = (1 - super_list[i][2]) * 100
        const metaText =
            `(${percent.toFixed(2)}% / ` +
            (tt == 0 ? `${formatSeconds(secondsLeft)} left / ${(secondsLeft * 1000)}` : `in ${new Date(secondsLeft * 1000 + currentSimulatedTime).toLocaleString()}`) +
            `)`
        if (metaText !== scratch_bar_meta_cache[slot]) {
            scratch_bar_meta_cache[slot] = metaText
            bar._meta.textContent = metaText
        }

        const bg = `hsl(${super_list[i][1] * 10},100%,90%)`
        if (bar.style.backgroundColor !== bg) bar.style.backgroundColor = bg
        const w = `${percent}%`
        if (bar.style.width !== w) bar.style.width = w
    }
}

function scratch_bar_jump_target(i) {
    var u_now = get_time(Math.max(0, virtualElapsed + timeOffset))
    num_to_lngi(u_now)
    if (i < 0 || i >= super_list.length) return null
    return { u: scratch_bar_boundary(i, u_now), shown: scratch_bar_sequence(i) }
}

// How long the click-to-jump search may spend trying clock steps before it
// settles for the closest sequence it found (and flashes the bar).
const SCRATCH_JUMP_BUDGET_MS = 120

function scratch_common_terms(a, b) {
    var x = a.split(","), y = b.split(","), k = 0
    while (k < x.length && k < y.length && x[k] == y[k]) k++
    return k
}

function scratch_bar_blocked(i) {
    var bar = document.getElementById(`bar_${i}`)
    if (!bar) return
    bar.classList.remove("scratch-bar-blocked")
    void bar.offsetWidth
    bar.classList.add("scratch-bar-blocked")
    setTimeout(() => bar.classList.remove("scratch-bar-blocked"), 700)
}

function jump_to_scratch_bar(i) {
    // Before the clock hits zero num_time() does not describe a sequence (and
    // does not fill in super_list), so there is nothing to jump to yet.
    if (virtualElapsed + timeOffset < 0) {
        scratch_bar_blocked(i)
        return false
    }
    var target = scratch_bar_jump_target(i)
    if (!target) return false
    var savedElapsed = virtualElapsed
    // The clock is the elapsed time in milliseconds, so the finest step it can
    // hold is one ULP of the elapsed time itself. The jump is tried on the
    // steps around the target time and every try is checked with num_time(),
    // the very function the next frame uses to decide what to display.
    var base = get_time_inv(target.u)
    var grid = Math.pow(2, Math.floor(Math.log2(base)) - 52)         // ms per clock step
    var first = Math.round(base / grid) * grid                       // grid step at the target
    // The sequence is only reproduced inside a window of u that can be far
    // narrower than one grid step — sometimes narrower than one ULP of u — so
    // reach a few ULPs of u out in both directions.
    var uPerStep = grid / (4.605170185988091 * 864000 * Math.pow(10, 2 * (target.u - 2)))
    var reach = Math.max(4, Math.ceil(4 * Math.pow(2, Math.floor(Math.log2(Math.abs(target.u))) - 52) / uPerStep))
    var want = target.shown.split(",")
    var bestElapsed = null, bestTerms = -1, got = null
    // A deep countdown can be a thousand bars long and each try costs a whole
    // walk, so the search is time boxed: it gives up on the exact sequence
    // rather than blocking the page.
    var deadline = Date.now() + SCRATCH_JUMP_BUDGET_MS
    for (var k = 0; k <= reach; k++) {
        var offs = k == 0 ? [0] : [k, -k]
        for (var q = 0; q < offs.length; q++) {
            virtualElapsed = first + offs[q] * grid - timeOffset
            // num_time() takes the elapsed time — this is the same expression
            // update() hands it, so a hit here is exactly what will be shown.
            got = num_time(virtualElapsed + timeOffset)
            if (got[2] == target.shown) {
                // Redraw straight away instead of waiting for the next frame.
                setHTML($("main_lngi_Content"), `<i>${main_sequence_label(got[2])}</i>`)
                document.getElementById("main_lngi_bar").innerHTML = `${got[0]} to next ordinal (${got[1]} left)`
                return true
            }
            var terms = scratch_common_terms(got[2], target.shown)
            if (terms > bestTerms) { bestTerms = terms; bestElapsed = virtualElapsed }
            if (Date.now() > deadline) { k = reach; break }
        }
    }
    // No reachable time reproduces the sequence: the window that does is
    // narrower than the clock can step. Land on the closest one there is when it
    // is still recognisably the same sequence, so the click moves the game on,
    // and flash the bar to show it is not the exact sequence.
    if (bestElapsed !== null && bestTerms * 2 >= want.length) {
        virtualElapsed = bestElapsed
        got = num_time(virtualElapsed + timeOffset)
        setHTML($("main_lngi_Content"), `<i>${main_sequence_label(got[2])}</i>`)
        document.getElementById("main_lngi_bar").innerHTML = `${got[0]} to next ordinal (${got[1]} left)`
        scratch_bar_blocked(i)
        return false
    }
    // Nothing close enough: put the clock back and flash the bar so the click
    // does not look like it did nothing.
    virtualElapsed = savedElapsed
    num_time(virtualElapsed + timeOffset)
    scratch_bar_blocked(i)
    return false
}

scratch_bar_init()

var super_list = []


// Include last terms up to and including 2048 in the countdown bars.
const NTL_MAX_LAST_TERM = 2048
// Keep the existing row budget independent of the last-term limit.
var NTL_MAX_BARS = 1000

function ntl(m) {
    super_list = []
    var ord = `1,${Math.max(1, Math.floor(m))}`
    var steps = 0
    var m = 1 - (m % 1)
    // True once the chain has ended in a way that already leaves `ord` as the
    // sequence to show (it popped onto one, or stopped at a too-large term), so
    // the closing pop below must not run again.
    var finished = false
    while (super_list.length < NTL_MAX_BARS) {
        super_list.push([ord, steps, m])
        if (m <= 1e-14) {
            break
        }
        var exp = 0
        while (m <= 1) {
            steps = steps + 1
            m = m * 2
            exp = exp + 1
        }
        var base = Y_Sequence.fs(ord, exp).split(",")
        var ordl = ord.split(",").length
        ord = base.slice(0, ordl + exp - 1).join(",")
        m = m - 1
        // The bar the countdown stops at: its sequence already has a last term
        // past the limit, so keep it as it is (it is what the player is
        // counting towards) rather than popping its last term off.
        if (Number(ord.split(",").at(-1)) > NTL_MAX_LAST_TERM) {
            finished = true
            break
        }
        if (ord.split(",").at(-1) == 1) {
            ord = ord.split(",");
            ord.pop();
            ord = ord.join(",");

            super_list.push([ord, steps, m]);

            finished = true
            break;
        }
    }
    if (!finished) {
        ord = ord.split(",");
        ord.pop();
        ord = ord.join(",");
    }
    return [ord, m, exp]
}

// The timeline often maps many consecutive animation frames to the exact same
// floating-point value. Reuse the chain in that case instead of rebuilding it.
var last_num_to_lngi_input = null
var last_num_to_lngi_result = null
function num_to_lngi(m) {
    if (m === last_num_to_lngi_input) return last_num_to_lngi_result
    const mapped = m - m % 1 + 0.5 + 0.5 * (m % 1)
    last_num_to_lngi_result = ntl(mapped)
    last_num_to_lngi_input = m
    return last_num_to_lngi_result
}

const LNGI_DAY_MS = 24 * 60 * 60 * 1000;
const LNGI_STAGE_VALUES = [
    3.5,
    3.75,
    3.7578125,       // 1,2,4,8,12
    3.76171875,      // 1,2,4,8,12,16
    3.763671875,     // 1,2,4,8,12,16,20
    3.7646484375,    // 1,2,4,8,12,16,20,24
    3.76513671875,   // 1,2,4,8,12,16,20,24,28
    3.765380859375,  // 1,2,4,8,12,16,20,24,28,32
    3.7655029296875, // 1,2,4,8,12,16,20,24,28,32,36
    3.76556396484375 // 1,2,4,8,12,16,20,24,28,32,36,40
];
const LNGI_TIMELINE = [
    { time: 0, value: 2 },
    ...LNGI_STAGE_VALUES.map((value, index) => ({
        time: 365 * (index + 1) * (index + 2) / 2 * LNGI_DAY_MS,
        value
    }))
];

function interpolateLngiTimeline(input, fromKey, toKey) {
    if (input <= LNGI_TIMELINE[0][fromKey]) {
        return LNGI_TIMELINE[0][toKey];
    }
    for (let i = 1; i < LNGI_TIMELINE.length; i++) {
        const previous = LNGI_TIMELINE[i - 1];
        const next = LNGI_TIMELINE[i];
        if (input <= next[fromKey] || i === LNGI_TIMELINE.length - 1) {
            const progress = (input - previous[fromKey]) / (next[fromKey] - previous[fromKey]);
            return previous[toKey] + progress * (next[toKey] - previous[toKey]);
        }
    }
}

function get_time(t) {
    return interpolateLngiTimeline(t, "time", "value");
}

function get_time_inv(t) {
    return interpolateLngiTimeline(t, "value", "time");
}

function renderAnalysisPanels() {
    analysisContainer.innerHTML = "";

    analysisPanels.forEach((panel) => {
        const card = document.createElement("div");
        card.className = "card resizable analysis-panel";
        card.id = panel.id; // Assign ID to prevent scraping all cards on property change
        card.style.flexBasis = `calc(${panel.width}% - ${(100 - panel.width) / 100 * 15}px)`;
        card.style.backgroundColor = `hsl(${panel.hue}, 85%, 82%)`;
        
        if (panel.height) {
            card.style.height = panel.height;
        }

        card.innerHTML = `
            <div class="analysis-header">
                <button class="remove">Remove</button>
                Width
                <select class="width">
                    <option value="33.33333333333">33%</option>
                    <option value="50">50%</option>
                    <option value="66.66666666666">66%</option>
                    <option value="100">100%</option>
                </select>
                Notation
                <select class="notation">
                    <option value="wY">ω-Y</option>
                    <option value="DBMS">DBMS</option>
                    <div class="SHO">
                        <option value="BMS">BMS</option>
                        <option value="2-shifted OCF">2-shifted OCF</option>
                        <option value="cOCF">cOCF</option>
                        <option value="EcOCF">Extended cOCF</option>
                        <option value="BcOCF">Bufed cOCF</option>
                        <option value="PMS">PMS</option>
                        <option value="AMS">AMS</option>
                        <option value="0Y">0-Y</option>
                        <option value="Vulcaniz">Vulcaniz</option>
                    </div>
                </select>
            </div>
            <div class="analysis-content"></div>
            <div class="resize-handle"></div>
        `;

        card.querySelector(".width").value = panel.width;
        card.querySelector(".notation").value = panel.notation;

        panel.element = card.querySelector(".analysis-content");
        panel.element.title = "Click to pause / resume";

        // Action Handlers
        card.querySelector(".remove").onclick = () => {
            // Safe removal: update model array, then safely purge element from the DOM
            const index = analysisPanels.findIndex(p => p.id === panel.id);
            if (index !== -1) {
                analysisPanels.splice(index, 1);
            }
            card.remove(); // Removes node instantly without rebuilding the entire pane layout!
        };

        card.querySelector(".width").onchange = e => {
            panel.width = Number(e.target.value);
            card.style.flexBasis = `calc(${panel.width}% - ${(100 - panel.width) / 100 * 15}px)`;
        };

        card.querySelector(".notation").onchange = e => {
            panel.notation = e.target.value;
        };

        analysisContainer.appendChild(card);
        makeResizable(card, panel);
    });
}

document.getElementById("analysis_add").onclick = () => {
    analysisPanels.push({
        id: "panel_" + Math.random().toString(36).substr(2, 9),
        notation: document.getElementById("analysis_add_type").value,
        width: 50,
        hue: Math.floor(Math.random() * 360),
        height: "150px"
    });
    renderAnalysisPanels();
};

renderAnalysisPanels();

// What the game shows at an ELAPSED time (ms since the clock hit zero). This is
// the one place that maps a time to a sequence: the main display, the progress
// bars and the click-to-jump all go through it, so a jump is checked against
// exactly the value the next frame is going to show.
//
// Callers pass the elapsed time itself (`virtualElapsed + timeOffset`), not
// `st + elapsed`. The absolute timestamp is only used for display.
function main_sequence_label(sequence) {
    return scratch_bar_display === "wY" ? sequence : progress_bar_label(sequence, scratch_bar_display)
}

function num_time(t,update_main_bar=true) {
    var t_elapsed = Math.max(0, t)
    if (t_elapsed == 0) {
        return `Not started yet. Wait for the clock to hit.<br>Time left: <span style="font-size: 150%">${(-t / 1000).toFixed(3)}s</span>`
    } else {
        var u = get_time(t_elapsed)
        var j = num_to_lngi(u)
        if (update_main_bar) {

            // Give the main display first choice of the background worker. The
            // underlying sequence, calculations, and tracker remain in ω-Y.
            setHTML($("main_lngi_Content"), `<i>${main_sequence_label(j[0])}</i>`)
            document.getElementById("main_lngi_bar").style.width = `${(1 - j[1]) * 100}%`
            update_scratch_bars(u, t)

            document.getElementById("main_lngi_bar").style.backgroundColor = lt / j[1] < 1 ? `hsl(100,90%,70%)` : `hsl(${(1 - j[1]) * 100},90%,70%)`
        }
        return [`${((1 - j[1]) * 100).toFixed(3)}%`, formatSeconds(lt), j[0]]
    }
}

var tps = 0
var tpsAvg = 0
var last_tick = Date.now()
// Last super_list length for which the "SHO" option groups were already hidden.
var _shoHiddenFor = -1
let sync_mountain = document.getElementById("_UPDATEMODE")
let MaxYTerms = document.getElementById("MaxTerms")

// --- Click-to-pause (improved) ---
// Clicking pauses/resumes the clock, EXCEPT on interactive UI (tabs, buttons,
// inputs, panels, dialogs, ...). The main display (sequence card, progress
// bar, top cards), empty background, and analysis panels stay clickable for
// pause, so using any control never pauses by accident.
// This also fixes the old double-toggle bug where e.g. the Pause/Continue
// button fired both its own `pause+=1` AND the document click handler.
const PAUSE_CLICK_IGNORE_SELECTOR = [
    // Header chrome: title, visitor counter and the tab buttons (+ gaps).
    ".header",
    // Settings dialog (including its backdrop).
    ".modal",
    // Any interactive element, anywhere on the page.
    "button",
    "input",
    "select",
    "textarea",
    "option",
    "a",
    "label",
    "canvas",
    "img",
    "video",
    "audio",
    "[contenteditable]",
    ".resize-handle",
    // Virtual Elapsed controls (NOT the analysis panels themselves: clicking
    // an analysis panel's content toggles pause, only its header controls
    // — Remove/Width/Notation — and the toolbar/time panel are exempt).
    ".time-control-panel",
    ".analysis-toolbar",
    ".analysis-header",
    // Other tab-page contents: controls and selectable text live here.
    "#mountain",
    "#milestone_header",
    "#scratch_bars",
    "#real_milestones",
    "#buddy",
    "#highest_terms"
].join(",");

function shouldIgnorePauseClick(e) {
    const t = e && e.target;
    if (!t || typeof t.closest !== "function") return false;
    if (t.closest(PAUSE_CLICK_IGNORE_SELECTOR)) return true;
    // Dragging to select text shouldn't pause either.
    try {
        if (window.getSelection && String(window.getSelection())) return true;
    } catch (_) { /* ignore */ }
    return false;
}

function isPaused() {
    return pause % 2 === 0;
}

function togglePause() {
    pause += 1;
    updatePauseIndicator();
}

function updatePauseIndicator() {
    const paused = isPaused();
    const tpsEl = document.getElementById("tps");
    if (tpsEl) tpsEl.classList.toggle("paused", paused);
    const mainEl = document.getElementById("main_lngi");
    if (mainEl) mainEl.classList.toggle("paused", paused);
}

document.addEventListener("click", cliques)

function cliques(e) {
    if (shouldIgnorePauseClick(e)) return;
    togglePause();
}

// Hint that the main display areas toggle pause on click.
(function markPausableAreas() {
    ["main_lngi", "main_lngi_bar", "time", "tps", "milestoneMulti"].forEach(id => {
        const el = document.getElementById(id);
        if (el && !el.title) el.title = "Click to pause / resume";
    });
    updatePauseIndicator();
})();

function update() {
    var now = Date.now();
    // Rolling average so the readout isn't pure frame-to-frame noise.
    tps = 1000 / ((now - last_tick) || 1);
    tpsAvg = tpsAvg ? tpsAvg * 0.9 + tps * 0.1 : tps;
    last_tick = now;
    var deltaRealTime = now - lastRealTime;
    virtualElapsed += deltaRealTime*(pause%2)*milestoneMulti
    lastRealTime = now;
    // The clock is the elapsed time. `simulatedTime` used to be `st + elapsed`,
    // but rounding an elapsed time of ~10^12 ms (30 years) onto the grid of
    // doubles of that magnitude costs ~0.001 ms per step, and a second +
    // millisecond display also lost the jump's sub-millisecond target. Elapsed
    // time keeps ~0.0000005 ms steps, which is what the jump needs.
    var simulatedTime = virtualElapsed + timeOffset;
    var u = num_time(simulatedTime);
    //player_time = simulatedTime

    // The "SHO" notation option groups get hidden once the sequence is past the
    // point where those notations still work. Doing the class lookup (and the
    // write) only when the sequence actually grew keeps the write off almost
    // every frame — it used to run 60 times a second for nothing.
    if (super_list.length > 0 && super_list.length !== _shoHiddenFor) {
        _shoHiddenFor = super_list.length
        if (get_time(simulatedTime) > 4) {
            const q = document.getElementsByClassName("SHO")
            for (var i = 0; i < q.length; i++) {
                q[i].hidden = true
            }
        }
    }

    // Feed the displayed sequence to the Highest terms tracker (runs on every
    // tab, so records are kept even while the tab is closed). The rewind check
    // has to run first: it drops records from a future the player jumped back
    // out of before the current sequence is tracked again.
    highest_terms_check_rewind(virtualElapsed + timeOffset)
    track_highest_terms(Array.isArray(u) ? u[2] : null)
    setHTML($("main_lngi_bar"), `${u[0]} to next ordinal (${u[1]} left)`)
    updatePauseIndicator();
    setHTML($("tps"), isPaused() ? `⏸ Paused — click the sequence to resume` : `${tpsAvg.toFixed(1)} tps`)
    setHTML($("milestoneMulti"), `Time speed: ${milestoneMulti}`)
    if (page == 3 && sync_mountain.checked) { setValue($("input"), trimStringList(u[2], MaxYTerms.valueAsNumber)) }
    if (page == 2) {
        analysisPanels.forEach(panel => {
            let txt = "";
            switch (panel.notation) {
                case "wY":
                    txt = "<i>" + u[2] + "</i>";
                    break;
                default:
                    txt = convert_From_wY(u[2], panel.notation);
                    break;
            }
            setHTML(panel.element, txt);
        });
    };
    const modifiedElapsedSeconds = Math.max(0, (virtualElapsed + timeOffset) / 1000);
    let timeStatusText = modifiedElapsedSeconds * 1000;
    const trueElapsedSeconds = Math.max(0, (now - st) / 1000);
    const diff = modifiedElapsedSeconds - trueElapsedSeconds;
    setHTML($("time"),
        `Time elapsed: ${formatSeconds(modifiedElapsedSeconds)} Virtual Elapsed ${timeStatusText}
        `);
    setHTML($("time_mode"), `${tt == 0 ? "Time remaining" : "Time reached"} (Press to change)`)
    
    document.title = `ω-Y LNGI: <${super_list.slice(0, 6).at(-1)[0]}`

    // Milestone timers do not need a full layout/render on every frame.
    if (page == 4 && (!update._lastMilestoneUpdate || now - update._lastMilestoneUpdate >= 250)) {
        update._lastMilestoneUpdate = now
        update_milestones(mpage)
    }

    if (tps>1) player_time = virtualElapsed
    if (player_time == NaN) {
        player_time = 0
    }

    if (page == 5) {
        document.getElementById("buddy_lngi1").innerHTML = `ω-Y LNGI: <${super_list.slice(0, 1).at(-1)[0]}`
        document.getElementById("buddy_lngi2").innerHTML = `ω-Y LNGI: <${super_list.slice(0, 2).at(-1)[0]}`
        document.getElementById("buddy_lngi3").innerHTML = `ω-Y LNGI: <${super_list.slice(0, 3).at(-1)[0]}`
        document.getElementById("buddy_lngi4").innerHTML = `ω-Y LNGI: <${super_list.slice(0, 4).at(-1)[0]}`
        document.getElementById("buddy_lngi5").innerHTML = `ω-Y LNGI: <${super_list.slice(0, 5).at(-1)[0]}`
        document.getElementById("buddy_lngi6").innerHTML = `ω-Y LNGI: <${super_list.slice(0, 6).at(-1)[0]}`
        document.getElementById("buddy_lngi7").innerHTML = `ω-Y LNGI: <${super_list.slice(0, 7).at(-1)[0]}`
        document.getElementById("buddy_lngi8").innerHTML = `ω-Y LNGI: <${super_list.slice(0, 8).at(-1)[0]}`
        document.getElementById("buddy_lngi9").innerHTML = `ω-Y LNGI: <${super_list.slice(0, 9).at(-1)[0]}`
        document.getElementById("buddy_lngi10").innerHTML = `ω-Y LNGI: <${super_list.slice(0, 10).at(-1)[0]}`
    }

    if (page == 6) {
        render_highest_terms()
    }

    saveMisc()
    requestAnimationFrame(update);
}
