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
    // The main progress bar only needs the last countdown value.  Do not
    // rebuild all 53 scratch rows when the user is watching the analysis
    // page; that work is only useful while the progress page is visible.
    if (page != 1) {
        var lastIndex = super_list.length - 1
        if (lastIndex < 0) {
            lt = 0
            return
        }
        var last = super_list[lastIndex]
        var lastU = x + last[2] / (2 ** last[1] / 2)
        if (lastIndex == 0) lastU = Math.ceil(x)
        var lastTime = get_time_inv(lastU)
        lt = Math.max(0, ((lastTime + st) - currentSimulatedTime) / 1000)
        return
    }

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

/*
 * w-Y results are discrete for long stretches of the clock, while the
 * animation calls num_to_lngi on every frame.  Keep the useful part of that
 * work in bounded, inspectable lists:
 *
 *   wYResultCache:       [get_time(), sequence]
 *   wYExpansionCache:    [source sequence, exponent, expanded sequence]
 *
 * For example, the first list can contain [2, "1,1"], [2.5, "1,1,1"].
 * The actual entries are discovered while the clock runs; the examples are
 * the shape of the data, not hard-coded progress.  An expansion entry lets
 * later frames start with the already expanded sequence instead of invoking
 * Y_Sequence.fs for the same source and exponent again.
 */
var wYResultCache = []
var wYResultCacheLimit = 2048
var wYResultCacheNext = 0
var wYLastCachedSequence = null
var wYExpansionCache = []
var wYExpansionCacheLookup = new Map()
var wYExpansionCacheLimit = 4096
var wYExpansionCacheNext = 0
var wYLastInput = NaN
var wYLastResult = null
var wYLastSuperList = null
var wYCheckpointCache = [] // [floor, qMin, qMax, ordinal, steps, scale, offset, path]
var wYCheckpointCacheLimit = 4096
var wYCheckpointCacheNext = 0
var wYLastCheckpointPath = []

function findCachedWYCheckpoint(floor, q) {
    var best = null

    // Most frames are close to the previous frame, so check that path first.
    for (var i = wYLastCheckpointPath.length - 1; i >= 0; i--) {
        var candidate = wYLastCheckpointPath[i]
        if (candidate[0] == floor && q > candidate[1] && q <= candidate[2]) {
            if (!best || candidate[4] > best[4]) best = candidate
        }
    }
    if (best) return best

    // A seek can move away from the previous path.  Reuse a checkpoint from
    // an earlier path in that case.
    for (var i = wYCheckpointCache.length - 1; i >= 0; i--) {
        var candidate = wYCheckpointCache[i]
        if (candidate[0] == floor && q > candidate[1] && q <= candidate[2]) {
            if (!best || candidate[4] > best[4]) best = candidate
        }
    }
    return best
}

function rememberWYCheckpoint(floor, qMin, qMax, ord, steps, scale, offset, path, runPath) {
    var entry = [floor, qMin, qMax, ord, steps, scale, offset, path]
    if (wYCheckpointCache.length < wYCheckpointCacheLimit) {
        wYCheckpointCache.push(entry)
    } else {
        wYCheckpointCache[wYCheckpointCacheNext] = entry
        wYCheckpointCacheNext = (wYCheckpointCacheNext + 1) % wYCheckpointCacheLimit
    }
    runPath.push(entry)
    return entry
}

function getCachedWYExpansion(ord, exp) {
    var key = ord + "\u001f" + exp
    if (wYExpansionCacheLookup.has(key)) {
        return wYExpansionCacheLookup.get(key)
    }

    // This is the only place ntl asks for a fresh fast-sequence expansion.
    var base = Y_Sequence.fs(ord, exp).split(",")
    var ordl = ord.split(",").length
    var expanded = base.slice(0, ordl + exp - 1).join(",")

    var entry = [ord, exp, expanded]
    if (wYExpansionCache.length < wYExpansionCacheLimit) {
        wYExpansionCache.push(entry)
    } else {
        var expired = wYExpansionCache[wYExpansionCacheNext]
        wYExpansionCacheLookup.delete(expired[0] + "\u001f" + expired[1])
        wYExpansionCache[wYExpansionCacheNext] = entry
        wYExpansionCacheNext = (wYExpansionCacheNext + 1) % wYExpansionCacheLimit
    }
    wYExpansionCacheLookup.set(key, expanded)
    return expanded
}

function rememberWYResult(timeValue, result) {
    if (!Number.isFinite(timeValue) || !result || typeof result[0] != "string") return

    // Store sequence transitions rather than 60 identical copies per second.
    if (wYLastCachedSequence == result[0]) return
    var entry = [timeValue, result[0]]
    if (wYResultCache.length < wYResultCacheLimit) {
        wYResultCache.push(entry)
    } else {
        wYResultCache[wYResultCacheNext] = entry
        wYResultCacheNext = (wYResultCacheNext + 1) % wYResultCacheLimit
    }
    wYLastCachedSequence = result[0]
}

function ntl(m) {
    var floor = Math.max(1, Math.floor(m))
    var ord = `1,${floor}`
    var steps = 0
    var q = 1 - (m % 1)
    var current = q
    var scale = 1
    var offset = 0
    var exp = 0
    var path = [[ord, 0, 1, 0]]
    var runPath = []
    var checkpoint = findCachedWYCheckpoint(floor, q)

    if (checkpoint) {
        // Every previous expansion is affine in the initial q.  Recalculate
        // only the residual for this q and resume with the cached ordinal.
        ord = checkpoint[3]
        steps = checkpoint[4]
        scale = checkpoint[5]
        offset = checkpoint[6]
        current = scale * q + offset
        path = checkpoint[7]
        runPath.push(checkpoint)
    }

    super_list = path.map(function (state) {
        return [state[0], state[1], state[2] * q + state[3]]
    })
    var stateIsListed = true

    while (ord.length < 100 && ord.split(",").at(-1) < 1e8 && steps < 53) {
        // A resumed path already contains this state.  For a fresh path it
        // was installed above as the root state.  States produced by the
        // previous iteration are added only after this loop's bounds check,
        // just like the original implementation.
        if (!stateIsListed) {
            super_list.push([ord, steps, current])
            stateIsListed = true
        }
        var beforeMin = checkpoint ? checkpoint[1] : 0
        var beforeMax = checkpoint ? checkpoint[2] : 1
        if (current <= 1e-14) {
            break
        }

        exp = 0
        while (current <= 1) {
            steps = steps + 1
            current = current * 2
            exp = exp + 1
        }

        var factor = 2 ** exp
        var previousScale = scale
        var previousOffset = offset
        // Keep an affine form of the residual so future frames can resume
        // from this point without replaying any earlier fs operations.
        scale = previousScale * factor
        offset = previousOffset * factor - 1
        ord = getCachedWYExpansion(ord, exp)
        current = current - 1

        if (ord.split(",").at(-1) == 1) {
            ord = ord.split(",");
            ord.pop();
            ord = ord.join(",");

            super_list.push([ord, steps, current]);

            steps = 69
            break;
        }

        // The exponent is selected by 2^-exp < current_before <=
        // 2^-(exp-1).  Convert that interval back to the initial q and keep
        // it with the resulting ordinal as a reusable expansion checkpoint.
        var qMin = Math.max(beforeMin, (1 / factor - previousOffset) / previousScale)
        var qMax = Math.min(beforeMax, (1 / (factor / 2) - previousOffset) / previousScale)
        stateIsListed = false

        // Do not retain a checkpoint for a state that the original loop would
        // never visit because one of its bounds has already been reached.
        if (ord.length < 100 && ord.split(",").at(-1) < 1e8 && steps < 53) {
            path = path.concat([[ord, steps, scale, offset]])
            checkpoint = rememberWYCheckpoint(floor, qMin, qMax, ord, steps, scale, offset, path, runPath)
        }
    }
    wYLastCheckpointPath = runPath

    if (steps == 53) {
        ord = ord.split(",");
        ord.pop();
        ord = ord.join(",");
    }
    return [ord, current, exp]
}

function num_to_lngi(m) {
    // When paused, get_time() is identical on every frame.  Restore the
    // matching super-list as well as the result so the progress bars remain
    // correct without even walking the expansion loop.
    if (m === wYLastInput && wYLastResult) {
        super_list = wYLastSuperList
        return wYLastResult
    }

    var transformed = m - m % 1 + 0.5 + 0.5 * (m % 1)
    var result = ntl(transformed)
    wYLastInput = m
    wYLastResult = result
    wYLastSuperList = super_list
    rememberWYResult(m, result)
    return result
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
// localStorage.setItem is synchronous. Saving on every animation frame makes
// the notation renderer compete with the browser for the main thread.
var lastMiscSave = 0
window.addEventListener("pagehide", function () {
    saveMisc()
})
let sync_mountain = document.getElementById("_UPDATEMODE")
let MaxYTerms = document.getElementById("MaxTerms")

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
    document.getElementById("main_lngi_bar").innerHTML = `${u[0]} to next ordinal (${u[1]} left)`
    document.getElementById("tps").innerHTML = `${tps.toFixed(1)} tps`
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
            // Conversions are cached, but parsing the same (often very large)
            // OCF string into innerHTML is still expensive.  Only touch the
            // DOM when the rendered notation actually changes.
            if (panel.lastRenderedText !== txt) {
                panel.element.innerHTML = txt;
                panel.lastRenderedText = txt;
            }
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

    // Persist often enough to survive a close, but never synchronously write
    // localStorage on every frame.
    if (now - lastMiscSave >= 1000) {
        saveMisc()
        lastMiscSave = now
    }
    requestAnimationFrame(update);
}
