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
function scratch_bar_init() {
    for (var i = 0; i < 53; i++) {
        const p = document.createElement("div")
        p.style.height = "6.25%";
        p.style.position = "absolute";
        p.style.top = `${i * 6.25}%`
        p.id = `bar_${i}`
        p.style.textWrap = `nowrap`
        document.getElementById("scratch_content").appendChild(p)
    }
}

var lt = 0
function update_scratch_bars(x, currentSimulatedTime) {
    for (var i = 0; i < 53; i++) {
        if (i < super_list.length) {
            var u = x + super_list[i][2] / (2 ** super_list[i][1] / 2)
            if (i == 0) {
                u = Math.ceil(x)
            }
            
            var t = get_time_inv(u)
            const secondsLeft = Math.max(0, ((t + st) - currentSimulatedTime) / 1000);

            if (page == 1) {
                document.getElementById(`bar_${i}`).style.visibility = "visible"
                document.getElementById(`bar_${i}`).innerHTML =
                    `${convert_From_wY(super_list[i][0] + (i == super_list.length - 1 ? ",1" : ""), scratch_bar_display)} <small>(${((1 - super_list[i][2]) * 100).toFixed(2)}% / 
                ${tt == 0 ? `${formatSeconds(secondsLeft)} left / ${(secondsLeft*1000)}` : `in ${new Date(secondsLeft * 1000 + currentSimulatedTime).toLocaleString()}`})</small>`

                document.getElementById(`bar_${i}`).style.backgroundColor = `hsl(${super_list[i][1] * 10},100%,90%)`
                document.getElementById(`bar_${i}`).style.width = `${(1 - super_list[i][2]) * 100}%`
            }
            if (i + 1 == super_list.length) {
                lt = secondsLeft
            }
        } else {
            document.getElementById(`bar_${i}`).style.visibility = "hidden"
        }
    }
}

scratch_bar_init()

var super_list = []


function ntl(m) {
    super_list = []
    var ord = `1,${Math.max(1, Math.floor(m))}`
    var steps = 0
    var m = 1 - (m % 1)
    while (ord.length < 100 && ord.split(",").at(-1) < 1e8 && steps < 53) {
        super_list = super_list.concat([[ord, steps, m]])
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
        if (ord.split(",").at(-1) == 1) {
            ord = ord.split(",");
            ord.pop();
            ord = ord.join(",");

            super_list.push([ord, steps, m]);

            steps = 69
            break;
        }
    }
    if (steps == 53) {
        ord = ord.split(",");
        ord.pop();
        ord = ord.join(",");
    }
    return [ord, m, exp]
}

function num_to_lngi(m) {
    var m = m - m % 1 + 0.5 + 0.5 * (m % 1)
    return ntl(m)
}

function get_time(t) {
    return (Math.log10(1 + t / 864000) / 2 + 2)
}

function get_time_inv(n) {
    return (10 ** ((n - 2) * 2) - 1) * 864000
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
                    <option value="BMS">BMS</option>
                    <option value="DBMS">DBMS</option>
                    <option value="2-shifted OCF">2-shifted OCF</option>
                    <option value="cOCF">cOCF</option>
                    <option value="EcOCF">Extended cOCF</option>
                    <option value="BcOCF">Bufed cOCF</option>
                    <option value="PMS">PMS</option>
                    <option value="AMS">AMS</option>
                    <option value="0Y">0-Y</option>
                    <option value="Vulcaniz">Vulcaniz</option>
                </select>
            </div>
            <div class="analysis-content"></div>
            <div class="resize-handle"></div>
        `;

        card.querySelector(".width").value = panel.width;
        card.querySelector(".notation").value = panel.notation;

        panel.element = card.querySelector(".analysis-content");

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

function num_time(t,update_main_bar=true) {
    var t_elapsed = Math.max(0, t - st)
    if (t_elapsed == 0) {
        return `Not started yet. Wait for the clock to hit.<br>Time left: <span style="font-size: 150%">${((st - t) / 1000).toFixed(3)}s</span>`
    } else {
        var u = get_time(t_elapsed)
        var j = num_to_lngi(u)
        if (update_main_bar) {

            document.getElementById("main_lngi_bar").style.width = `${(1 - j[1]) * 100}%`
            update_scratch_bars(u, t)

            document.getElementById("main_lngi_bar").style.backgroundColor = lt / j[1] < 1 ? `hsl(100,90%,70%)` : `hsl(${(1 - j[1]) * 100},90%,70%)`
        }
        return [`${((1 - j[1]) * 100).toFixed(3)}%`, formatSeconds(lt), j[0]]
    }
}

var tps = 0
var last_tick = Date.now()
let sync_mountain = document.getElementById("_UPDATEMODE")
let MaxYTerms = document.getElementById("MaxTerms")

// --- Click-to-pause (improved) ---
// Clicking pauses/resumes the clock, EXCEPT on interactive UI (tabs, buttons,
// inputs, panels, dialogs, ...). Tab-page content is excluded too: the main
// display (sequence card, progress bar, top cards) and empty background stay
// clickable for pause, so using any control never pauses by accident.
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
    // Tab-page contents: controls and selectable text live here.
    "#future-milestone",
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
    tps = 1000 / (now - last_tick);
    last_tick = now;
    var deltaRealTime = now - lastRealTime;
    virtualElapsed += deltaRealTime*(pause%2)
    lastRealTime = now;
    var simulatedTime = st + virtualElapsed + timeOffset;
    var u = num_time(simulatedTime);
    //player_time = simulatedTime

    document.getElementById("main_lngi_Content").innerHTML = `<i>${u[2]}</i>`
    // Feed the displayed sequence to the Highest terms tracker (runs on every
    // tab, so records are kept even while the tab is closed). The rewind check
    // has to run first: it drops records from a future the player jumped back
    // out of before the current sequence is tracked again.
    highest_terms_check_rewind(virtualElapsed + timeOffset)
    track_highest_terms(Array.isArray(u) ? u[2] : null)
    document.getElementById("main_lngi_bar").innerHTML = `${u[0]} to next ordinal (${u[1]} left)`
    updatePauseIndicator();
    document.getElementById("tps").innerHTML = isPaused() ? `⏸ Paused — click the sequence to resume` : `${tps.toFixed(1)} tps`
    document.getElementById("milestoneMulti").innerHTML = `Time speed: ${milestoneMulti}`
    if (page == 3 && sync_mountain.checked) { document.getElementById("input").value = trimStringList(u[2], MaxYTerms.valueAsNumber) }
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
            panel.element.innerHTML = txt;
        })
    };
    const modifiedElapsedSeconds = Math.max(0, (virtualElapsed + timeOffset) / 1000);
    let timeStatusText = modifiedElapsedSeconds * 1000;
    const trueElapsedSeconds = Math.max(0, (now - st) / 1000);
    const diff = modifiedElapsedSeconds - trueElapsedSeconds;
    document.getElementById("time").innerHTML =
        `Time elapsed: ${formatSeconds(modifiedElapsedSeconds)} Virtual Elapsed ${timeStatusText}
        `;
    document.getElementById("time_mode").innerHTML = `${tt == 0 ? "Time remaining" : "Time reached"} (Press to change)`

    document.title = `ω-Y LNGI: <${super_list.slice(0, 6).at(-1)[0]}`

    update_milestones(mpage)

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
