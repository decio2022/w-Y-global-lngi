var tt = 0
const analysisContainer = document.getElementById("analysis_container");
let st = (1782316800000 + 23 * 3600000) + 864 * 1000
var timeSpeed = 1.0;
var timeOffset = 0;       
var virtualElapsed = Date.now() - st; 
var lastRealTime = Date.now();

function loadMisc() {
    try {
        const savedMisc = localStorage.getItem("lngi_app_misc");
        if (savedMisc) {
            const misc = JSON.parse(savedMisc);
            if (typeof misc.time === "number" && !isNaN(misc.time)) {
                player_time = misc.time;
            }
        }
    } catch (e) {
        console.error("Failed to load saved time:", e);
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

// Both progress views share the searched sequence, never the running clock.
// MaxTerms controls milestone depth; zero retains the original unlimited depth.
function progress_term_limit() {
    const n = Number(document.getElementById("MaxTerms").value)
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0
}

function progress_model(value, maxTerms) {
    const clamped = Math.max(2, Math.min(4, value))
    if (clamped === 4) return { percent: 100, bars: [] }

    // Use the original LNGI decomposition and its local milestone percentages.
    const decomposition = num_to_lngi(clamped, maxTerms)
    const bars = super_list.map(([ordinal, depth, remaining], index) => ({
        ordinal: ordinal + (index === super_list.length - 1 && !decomposition[3] ? ",1" : ""),
        depth,
        percent: Math.max(0, Math.min(100, (1 - remaining) * 100))
    })).filter(bar => bar.ordinal !== "1,3" &&
        (!maxTerms || bar.ordinal.split(",").length <= maxTerms))
    return { percent: (clamped - 2) * 50, bars }
}

let progress_render_key = null
function update_search_progress() {
    const sequence = analysis_sequence()
    const value = analysis_value()
    const maxTerms = progress_term_limit()
    const notationSettings = ["Y_Terms", "BMS_Terms", "compress_bms", "format_cOCF"].map(id => {
        const el = document.getElementById(id)
        return [el.value, el.checked]
    })
    const key = JSON.stringify([sequence, value, maxTerms, scratch_bar_display, page, notationSettings])
    if (key === progress_render_key) return
    progress_render_key = key

    const model = progress_model(value, maxTerms)
    const mainBar = document.getElementById("main_lngi_bar")
    mainBar.style.width = `${model.percent}%`
    mainBar.style.backgroundColor = `hsl(${model.percent},90%,70%)`
    mainBar.textContent = `${model.percent.toFixed(3)}% to 1,3 (final milestone)`
    mainBar.parentElement.setAttribute("aria-label", mainBar.textContent)
    document.getElementById("main_lngi_Content").textContent = sequence
    document.getElementById("search_progress_source").textContent =
        `${sequence}${searched_ordinal ? "" : " (default: no valid search)"}; Max ω-Y Terms: ${maxTerms || "unlimited"}`

    for (let i = 0; i < 53; i++) {
        const el = document.getElementById(`bar_${i}`)
        const bar = model.bars[i]
        el.hidden = !bar
        if (!bar) continue
        el.innerHTML = `${safe_convert(bar.ordinal, scratch_bar_display)} <small>(${bar.percent.toFixed(2)}%)</small>`
        el.style.backgroundColor = `hsl(${bar.depth * 10},100%,90%)`
        el.style.width = `${bar.percent}%`
    }
    document.title = `ω-Y LNGI: ${sequence} → 1,3`
}

scratch_bar_init()

var super_list = []


function ntl(m, maxTerms = 0) {
    super_list = []
    var ord = `1,${Math.max(1, Math.floor(m))}`
    if (m > 20) {
        return [ord,m,0]
}
    var truncated = false
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
        const next = base.slice(0, ordl + exp - 1).join(",")
        if (maxTerms && next.split(",").length > maxTerms) {
            truncated = true
            break
        }
        ord = next
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
    return [ord, m, exp, truncated]
}

function num_to_lngi(m, maxTerms = 0) {
    var m = m - m % 1 + 0.5 + 0.5 * (m % 1)
    return ntl(m, maxTerms)
}

//1,3,4,2,5,6 => 4.007999420166016
//1,3,4,3 => 4.008056640625

const upg1 = 3.00000003846372
const upg2 = 3.00137462840000

const exp = 13.036562
const spd = 0.002001

function get_time(t) {
    var R = (Math.log10(1 + t / 864000) / 2 + 2)
    return R
}

function get_time_inv(n) {
    var S = (10 ** ((n - 2) * 2) - 1) * 864000
    return S
}

//converts a ω-Y sequence for display, never letting a notation's range stop the app
function safe_convert(ord, mode) {
    try {
        return convert_From_wY(ord, mode)
    } catch (e) {
        console.warn(`Can't convert ${ord} to ${mode}:`, e)
        return ord
    }
}

//The sequence the analysis part converts: the one searched in the Search tab,
//falling back to 1,1 when no (valid) sequence has been searched
function analysis_sequence() {
    return (typeof searched_ordinal == "string" && searched_ordinal != "") ? searched_ordinal : "1,1"
}

//The value of the searched ordinal (the value of 1,1 is 2)
function analysis_value() {
    return (typeof searched_value == "number" && isFinite(searched_value)) ? searched_value : 2
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


var tps = 0
var last_tick = Date.now()
let sync_mountain = document.getElementById("_UPDATEMODE")
let MaxYTerms = document.getElementById("MaxTerms")

function update() {
    var now = Date.now();
    tps = 1000 / (now - last_tick);
    last_tick = now;
    var deltaRealTime = now - lastRealTime;
    lastRealTime = now;
    virtualElapsed += deltaRealTime * timeSpeed;
    simulatedTime = st + virtualElapsed + timeOffset;


    if (get_time(simulatedTime - st) > 4) {
        const q = document.getElementsByClassName("SHO")
        for (var i in q) {
            q[i].hidden = false
        }
    }

    document.getElementById("tps").innerHTML = `${tps.toFixed(1)} tps`
    //if the browser restored a typed search after the page loaded, catch up with it
    const search_input_el = document.getElementById("search_input")
    if (search_input_el && typeof search_time == "function" && search_input_el.value != last_search_input) {
        search_time()
    }
    update_search_progress()
    if (page == 3 && sync_mountain.checked) { document.getElementById("input").value = trimStringList(num_to_lngi(get_time(Math.max(0, simulatedTime - st)))[0], MaxYTerms.valueAsNumber) }
    if (page == 2) {
        //the analysis part shows the sequence searched in the Search tab (1,1 if there's none)
        const analysis_seq = analysis_sequence();
        analysisPanels.forEach(panel => {
            let txt = "";
            switch (panel.notation) {
                case "wY":
                    txt = "<i>" + analysis_seq + "</i>";
                    break;
                default:
                    //a searched sequence can leave a notation's range, never let that stop the app
                    txt = safe_convert(analysis_seq, panel.notation);
                    break;
            }
            panel.element.innerHTML = txt;
        })
    };



    
    const modifiedElapsedSeconds = Math.max(0, (virtualElapsed + timeOffset) / 1000);
    let timeStatusText = "";
    const trueElapsedSeconds = Math.max(0, (now - st) / 1000);
    const diff = modifiedElapsedSeconds - trueElapsedSeconds;
    if (Math.abs(diff) > 0.1 || Math.abs(timeSpeed - 1.0) > 0.001) {
        if (diff > 0) {
            timeStatusText = ` <b style="color: red;">(forwarded ${formatSeconds(Math.abs(diff))})</b>`;
        } else if (diff < 0) {
            timeStatusText = ` <b style="color: blue;">(backwarded ${formatSeconds(Math.abs(diff))})</b>`;
        }
    }
    document.getElementById("time").innerHTML =
        `Time elapsed: ${formatSeconds(modifiedElapsedSeconds)}${timeStatusText}
        <br><small>You spent ${formatSeconds(player_time)} on this tab (${(player_time / (trueElapsedSeconds) * 100).toFixed(5)}% of the actual runtime)</small>`;



    // update_milestones(mpage) removed

    if (tps>1) player_time += 1 / tps
    if (player_time == NaN) {
        player_time = 0
    }

    

    saveMisc()
    requestAnimationFrame(update);
}
