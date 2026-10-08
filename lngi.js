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

var lt = 0
function update_scratch_bars(x, currentSimulatedTime, list = super_list) {
    const draw = page == 1
    for (var i = 0; i < 53; i++) {
        if (i < list.length) {
            var u = x + list[i][2] / (2 ** list[i][1] / 2)
            if (i == 0) {
                //the top bar is the next integer milestone (an exact value steps one further)
                u = x % 1 == 0 ? x + 1 : Math.ceil(x)
            }
            
            var t = get_time_inv(u)
            const secondsLeft = Math.max(0, ((t + st) - currentSimulatedTime) / 1000);

            if (draw) {
                document.getElementById(`bar_${i}`).style.visibility = "visible"
                document.getElementById(`bar_${i}`).innerHTML =
                    `${safe_convert(list[i][0] + (i == list.length - 1 ? ",1" : ""), scratch_bar_display)} <small>(${((1 - list[i][2]) * 100).toFixed(2)}% / 
                ${tt == 0 ? `${formatSeconds(secondsLeft)} left` : `in ${new Date(secondsLeft * 1000 + currentSimulatedTime).toLocaleString()}`})</small>`

                document.getElementById(`bar_${i}`).style.backgroundColor = `hsl(${list[i][1] * 10},100%,90%)`
                document.getElementById(`bar_${i}`).style.width = `${(1 - list[i][2]) * 100}%`
            }
            if (i + 1 == list.length) {
                lt = secondsLeft
            }
        } else if (draw) {
            document.getElementById(`bar_${i}`).style.visibility = "hidden"
        }
    }
}

scratch_bar_init()

var super_list = []


function ntl(m) {
    super_list = []
    var ord = `1,${Math.max(1, Math.floor(m))}`
    if (m > 20) {
        return [ord,m,0]
}
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

//1,3,4,2,5,6 => 4.007999420166016
//1,3,4,3 => 4.008056640625

const upg1 = 3.00000003846372
const upg2 = 3.00137462840000

const exp = 13.036562
const spd = 0.002001

function get_time(t) {
    var R = (Math.log10(1 + t / 864000) / 2 + 2)
    if (R > upg1) {
        R = (((R - upg1) / (upg2 - upg1) * spd) ** exp) * (upg2 - upg1) + upg1
    }
    return R
}

function get_time_inv(n) {
    if (n > upg1) {
        n = (((n - upg1) / (upg2 - upg1)) ** (1/exp)) / spd * (upg2 - upg1) + upg1
    }
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

//The ladder of ordinals leading to the next milestone, for the searched ordinal
var searched_ladder = { value: null, list: [] }
function searched_progress() {
    const v = analysis_value()
    if (searched_ladder.value !== v) {
        const live_list = super_list
        num_to_lngi(v) //fills super_list with the ladder of that value
        searched_ladder = { value: v, list: super_list }
        super_list = live_list //the live ladder must stay untouched
    }
    return searched_ladder
}

//says which ordinal the search progress tab is showing right now
var search_progress_source_cache = null
function update_search_progress_source() {
    const el = document.getElementById("search_progress_source")
    if (!el) return

    const searched = typeof searched_ordinal == "string" && searched_ordinal != ""
    const sp = searched_progress()
    const milestone = sp.list.length && sp.list[0][0]
    const total = milestone ? sp.list[sp.list.length - 1][1] : 0
    const html = `<b>${searched ? searched_ordinal : "1,1"}</b>` +
        (searched ? "" : ` <small><i>(nothing valid searched, using 1,1)</i></small>`) +
        (milestone
            ? ` <small>— next milestone ${safe_convert(milestone, scratch_bar_display)} in ${total} step${total == 1 ? "" : "s"}</small>`
            : ` <small><i>— too large to walk</i></small>`)

    if (search_progress_source_cache !== html) {
        search_progress_source_cache = html
        el.innerHTML = html
    }
}

//"2nd", "3rd", ... for the search progress bars
function ordinal_suffix(n) {
    const s = ["th", "st", "nd", "rd"], v = n % 100
    return n + (s[(v - 20) % 10] || s[v] || s[0])
}

//For the searched ordinal: the number of steps until each of its terms is updated.
//The ladder is walked from the searched ordinal itself up to the next milestone,
//and the first stage where a term differs is the update of that term.
function term_updates(sp) {
    const ladder = sp.list
    if (!ladder.length) return []

    const base = analysis_sequence().split(",").map(Number) //the searched ordinal's own terms
    const total = ladder[ladder.length - 1][1]              //steps from it to the next milestone
    const updates = [], done = new Set()

    //the deepest stage is the searched ordinal's own position (its shape may differ by a
    //trailing term), so only the stages above it count as updates
    for (let i = ladder.length - 2; i >= 0; i--) {
        const stage = ladder[i][0].split(",").map(Number)
        const steps = total - ladder[i][1]
        for (let term = 2; term <= 50; term++) {
            if (done.has(term)) continue
            if (stage[term - 1] !== base[term - 1]) {
                done.add(term)
                updates.push({ term, steps, ord: ladder[i][0] })
            }
        }
    }

    return updates.sort((a, b) => a.term - b.term)
}

var searched_term_updates = { value: null, list: [] }
function searched_progress_terms() {
    const sp = searched_progress()
    if (searched_term_updates.value !== sp.value) {
        searched_term_updates = { value: sp.value, list: term_updates(sp) }
    }
    return searched_term_updates.list
}

//The search progress bars: one bar per term of the searched ordinal
//(the first bar is the 2nd term), each showing how many steps it takes to update it.
//Unlike the live bars these never change, so the drawing is only redone when
//the searched ordinal or the notation changes.
var search_progress_cache = { key: null, bars: [] }
function search_progress_bars() {
    const sp = searched_progress()
    const key = `${sp.value}|${scratch_bar_display}`
    if (search_progress_cache.key !== key) {
        const updates = searched_progress_terms()
        const max = updates.reduce((m, u) => Math.max(m, u.steps), 0)

        search_progress_cache = {
            key: key,
            bars: updates.map(u => ({
                html: `${safe_convert(u.ord, scratch_bar_display)} <small>(${ordinal_suffix(u.term)} term: ${u.steps} step${u.steps == 1 ? "" : "s"})</small>`,
                width: `${max > 0 ? (u.steps / max) * 100 : 100}%`,
                color: `hsl(${u.steps * 10},100%,90%)`
            }))
        }
    }
    return search_progress_cache.bars
}

function update_search_progress_bars() {
    const bars = search_progress_bars()

    for (var i = 0; i < 53; i++) {
        const bar = document.getElementById(`bar_${i}`)
        const b = bars[i]

        if (!b) {
            //terms that don't change before the next milestone have no bar
            bar.style.visibility = "hidden"
            bar.innerHTML = ""
            continue
        }

        bar.style.visibility = "visible"
        bar.style.width = b.width
        bar.style.backgroundColor = b.color
        bar.innerHTML = b.html
    }
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

function update() {
    var now = Date.now();
    tps = 1000 / (now - last_tick);
    last_tick = now;
    var deltaRealTime = now - lastRealTime;
    lastRealTime = now;
    virtualElapsed += deltaRealTime * timeSpeed;
    simulatedTime = st + virtualElapsed + timeOffset;
    var u = num_time(simulatedTime);

    if (get_time(simulatedTime - st) > 4) {
        const q = document.getElementsByClassName("SHO")
        for (var i in q) {
            q[i].hidden = true
        }
    }

    document.getElementById("main_lngi_Content").innerHTML = `<i>${u[2]}</i>`
    document.getElementById("main_lngi_bar").innerHTML = `${u[0]} to next ordinal (${u[1]} left)`
    document.getElementById("tps").innerHTML = `${tps.toFixed(1)} tps`
    if (page == 3 && sync_mountain.checked) { document.getElementById("input").value = trimStringList(u[2], MaxYTerms.valueAsNumber) }
    if (page == 0) {
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
    if (page == 7) {
        //search progress tab: one bar per term, always showing the amount of steps to update it
        update_search_progress_bars()
        update_search_progress_source()
    }
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
    document.getElementById("time_mode").innerHTML = `${tt == 0 ? "Time remaining" : "Time reached"} (Press to change)`

    document.title = `ω-Y LNGI: <${super_list.slice(0, 6).at(-1)[0]}`

    update_milestones(mpage)

    if (tps>1) player_time += 1 / tps
    if (player_time == NaN) {
        player_time = 0
    }

    if (page == 5) {
        var u2 = num_time(player_time * 1000 + st, false)
        document.getElementById("buddy_lngi").innerHTML = u2[2]
        document.getElementById("buddy_next").innerHTML = u2[0]
    }

    saveMisc()
    requestAnimationFrame(update);
}
