function getMostRemarkable(startTime, endTime) {

    if (endTime < st)
        return "Too early!";

    const ub = get_time(endTime - st);
    const lb = get_time(startTime - st);

    let int = 1;

    while (Math.floor(ub * int) / int == Math.floor(lb * int) / int)
        int *= 2;

    const x = Math.floor(ub * int) / int;
    const ord = num_to_lngi(x)[0];

    return {
        value: x,
        ordinal: ord,
        time: new Date(get_time_inv(x) + st)
    };
}

function updateDay() {

    const d = new Date(document.getElementById("mile_date").value);

    if (isNaN(d)) {
        document.getElementById("day_result").innerHTML = "...";
        return;
    }

    d.setHours(0, 0, 0, 0);

    const r = getMostRemarkable(
        d.getTime(),
        d.getTime() + 86400000
    );

    if (typeof r == "string") {
        document.getElementById("day_result").innerHTML = r;
        return;
    }

    document.getElementById("day_result").innerHTML =
        `The most remarkable ordinal in this day is
        <b>${r.ordinal}</b><br>
        at ${r.time.toLocaleTimeString()}`;
}

function updateMonth(){

    const s=document.getElementById("mile_month").value;

    if(!s){
        document.getElementById("month_result").innerHTML="...";
        return;
    }

    const [y,m]=s.split("-").map(Number);

    const start=new Date(y,m-1,1);
    const end=new Date(y,m,1);

    const r=getMostRemarkable(start.getTime(),end.getTime());

    if(typeof r=="string"){
        document.getElementById("month_result").innerHTML=r;
        return;
    }

    document.getElementById("month_result").innerHTML=
        `The most remarkable ordinal in this month is
        <b>${r.ordinal}</b><br>
        ${r.time.toLocaleString()}`;
}

function updateYear() {

    const y = Number(document.getElementById("mile_year").value);

    if (!y) {
        document.getElementById("year_result").innerHTML = "...";
        return;
    }

    const start = new Date(y, 0, 1);
    const end = new Date(y + 1, 0, 1);

    const r = getMostRemarkable(start.getTime(), end.getTime());

    if (typeof r == "string") {
        document.getElementById("year_result").innerHTML = r;
        return;
    }

    document.getElementById("year_result").innerHTML =
        `The most remarkable ordinal in ${y} is
        <b>${r.ordinal}</b><br>
        ${r.time.toLocaleString()}`;
}

function changeDay(n) {

    const e = document.getElementById("mile_date");

    const d = new Date(e.value);

    d.setDate(d.getDate() + n);

    e.valueAsDate = d;

    updateDay();
}

function changeMonth(n) {

    const e = document.getElementById("mile_month");

    const d = new Date(e.value + "-01");

    d.setMonth(d.getMonth() + n);

    e.value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

    updateMonth();
}

function changeYear(n) {

    const e = document.getElementById("mile_year");

    e.value = Number(e.value) + n;

    updateYear();
}

function enableHold(button, callback) {
    let timeout, interval;

    function start(e) {
        e.preventDefault();

        callback(); 

        timeout = setTimeout(() => {
            interval = setInterval(callback, 1);
        }, 400);
    }

    function stop() {
        clearTimeout(timeout);
        clearInterval(interval);
    }

    button.addEventListener("mousedown", start);
    button.addEventListener("touchstart", start, { passive: false });

    button.addEventListener("mouseup", stop);
    button.addEventListener("mouseleave", stop);
    button.addEventListener("touchend", stop);
    button.addEventListener("touchcancel", stop);
}

function initializeMilestoneInputs() {
    if (!document.getElementById("mile_date")) return;

    const now = new Date();

    
    mile_date.valueAsDate = now;

    
    mile_month.value =
        `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    
    mile_year.value = now.getFullYear();

    
    updateDay();
    updateMonth();
    updateYear();
}

//as it turns out this is problematic
window.addEventListener("DOMContentLoaded", initializeMilestoneInputs);

document.querySelectorAll("[data-day]").forEach(btn => {
    const step = Number(btn.dataset.day);
    enableHold(btn, () => changeDay(step));
});

document.querySelectorAll("[data-month]").forEach(btn => {
    const step = Number(btn.dataset.month);
    enableHold(btn, () => changeMonth(step));
});

document.querySelectorAll("[data-year]").forEach(btn => {
    const step = Number(btn.dataset.year);
    enableHold(btn, () => changeYear(step));
});





//the ω-Y sequence that was last searched in the Search tab
//(the analysis part shows it, falling back to 1,1 when it's null)
var searched_ordinal = null
//its value, used by the search progress tab (the value of 1,1 is 2)
var searched_value = null

//the text of the search box that search_time() last looked at, so the app can
//notice when the browser restores a typed value after a reload
var last_search_input = null

function search_time(x = document.getElementById("search_input").value) {
    //only a call coming from the Search tab input itself (no argument passed)
    //updates the sequence shown in the analysis part
    var fromSearchTab = arguments.length == 0
    last_search_input = document.getElementById("search_input").value
    if (fromSearchTab) {
        searched_ordinal = null
        searched_value = null
    }

    var t = String(x ?? "").trim()
    var r = ""

    if (fromSearchTab) localStorage.setItem("lngi_searched_input", t)

    if (t == "") {
        //null sequence: the analysis part falls back to 1,1
        if (fromSearchTab) document.getElementById("search_result").innerHTML = "Please insert ordinal!"
        return [0, 0]
    }

    if (t[0] != 1) {
        r = "Please insert valid ordinal starting with 1!"
        document.getElementById("search_result").innerHTML = r
        return [0, 0]
    }

    //every term has to be a positive integer, otherwise the sequence is invalid
    var l = t.split(",").map(p => p.trim())

    if (l.some(p => !/^-?\d+$/.test(p))) {
        document.getElementById("search_result").innerHTML = "Please insert a valid ordinal!"
        return [0, 0]
    }

    l = l.map(Number)

    if (l.some(p => p <= 0)) {
        document.getElementById("search_result").innerHTML = `Don't put zero or negative values in!`
        return [0, 0]
    }

    if (l.length == 1) {
        document.getElementById("search_result").innerHTML = `This lngi starts at 1,1 :3`
        if (fromSearchTab) {
            searched_ordinal = "1,1"
            searched_value = 2
        }
        return [0, 0]
    }

    var seq = `1,${l[1] + 1}`
    var r = l[1] + 1
    var i = 1

    if (l.length == 2) {
        document.getElementById("search_result").innerHTML = `Achievement day:<br>${new Date(get_time_inv(r) + st).toLocaleString()}`
        if (fromSearchTab) {
            searched_ordinal = l.join(",")
            searched_value = r
        }
        return [r, 1]
    }

    console.log(x)
    var check = 2
    var safe = 1
    while (i > 1e-14) {
        //step one: expand
        var aseq = seq
        seq = Y_Sequence.fs(seq, safe+1).split(",") //the result is a string, need to convert into list for .at
        //step two: cut the term to match last term
        //like when insert 1,3,3; should check 1,4 first and expand into 1,3,10
        //1,3,10 is the same length as the 3rd term, just compare it
        //if not, then we don't
        seq = seq.slice(0, check + safe)
        //now we do the thing
        var d = Number(seq.at(-1)) - Number(l[check + safe - 1])
        console.log(aseq, seq, d, safe)
        if (d < 0) {
            //invalid (non standard) sequence: the analysis part falls back to 1,1
            document.getElementById("search_result").innerHTML = `Not standard.`
            return [0, 0]
        }
        i =  i / (2 ** (d + 1)); r += i

        //ready for next iteration
        if (d != 0) {
            seq[check + safe - 1] = Number(l[check + safe - 1]) + 1
            seq = seq.join(",")
            check += safe
            safe = 1
        } else {
            seq = aseq
            safe++
        }
        if (l.length == check + safe - 1) {
            break
        }

        //another case we have to care abt is
        //when fs is 0...
    }
    if (fromSearchTab) {
        searched_ordinal = l.join(",")
        searched_value = r
    }
    var t = get_time_inv(r) + st
    document.getElementById("search_result").innerHTML = `Achievement day:<br>${new Date(t).toLocaleString()} <small><i>${(t%1000).toFixed(3)}ms</i></small>`
    return [r,-Math.log2(i)]
}

//the search box is restored and re-read here, because browsers bring back what was
//typed only after the page loaded, which used to leave the app showing 1,1
window.addEventListener("DOMContentLoaded", () => {
    const input = document.getElementById("search_input")
    const saved = localStorage.getItem("lngi_searched_input")
    if (input && saved) input.value = saved
    search_time()
    //pick the +1 walk back up where it was left (sequence and click count)
    ordinal_walk_restore()
})

// ---------------------------------------------------------------------------
// The "+1" button next to the input ordinal.
//
// Each press takes the successor (+1, i.e. appending ",1") of the current
// standard ω-Y sequence and automatically maximizes it whenever either:
//   · a fundamental-sequence step from 1,3 reaches the configured base, OR
//   · the sequence exceeds the configured maximum number of ω-Y terms.
//
// 1,3 is the ceiling: the press after 1,3 wraps back to 1,1.
//
// For example, with base 3 and 10 terms:
//   1,1 → 1,1,1 → 1,1,1,1 → 1,2 → 1,2,1 → … → 1,2,1,1,1,1 → 1,2,1,2 → …
// And with base 10 and 5 terms:
//   1,1 → 1,1,1 → 1,1,1,1 → 1,1,1,1,1 → 1,2 → … → 1,2,1,1,1 → 1,2,1,2 → …
//
// The sequence the button left behind (already saved as the searched input) and
// the number of clicks that got there are kept across reloads. Changing either
// the maximum number of terms or the base resets the click counter and starts
// the walk over at 1,1.
// ---------------------------------------------------------------------------

//the highest sequence the button ever reaches (also the Limit ceiling for maximization)
const ORDINAL_WALK_CAP = [1, 3]
const ORDINAL_WALK_CAP_STR = "1,3"

//the term limit and base the walk currently runs with, so a change restarts it at 1,1
var ordinal_walk_max = null
var ordinal_walk_base = null

//set when the maximum terms or base changed: the next press then starts over at 1,1
//instead of continuing the sequence that is already in the box
var ordinal_walk_restart = false

//How many times "+1" was pressed to reach the sequence that is saved: it counts
//from 0 whenever the walk (re)starts at 1,1, is kept when you leave and come
//back, and goes back to 0 when the maximum number of terms or base changes.
var clicks = 0

//where `clicks` and the sequence it belongs to are kept between visits
const ORDINAL_WALK_SAVE_KEY = "lngi_ordinal_walk"

//The +1 walk's own term limit (pathmaxlength). Values below 2 use a minimum of
//2 terms, since the walk starts at 1,1.
function ordinal_walk_limit() {
    const el = document.getElementById("ordinal_walk_max_terms")
    const n = el ? Number(el.value) : 2
    return isFinite(n) ? Math.max(2, Math.floor(n)) : 2
}

//The +1 walk's base for automatic maximization. Values below 2 clamp to 2;
//blank or missing defaults to 3.
function ordinal_walk_base_limit() {
    const el = document.getElementById("ordinal_walk_base")
    const raw = el ? String(el.value ?? "").trim() : ""
    const n = raw === "" ? 3 : Number(raw)
    return isFinite(n) ? Math.max(2, Math.floor(n)) : 3
}

//show the counter next to the walk settings (it is only a readout of `clicks`)
function ordinal_walk_show_clicks() {
    const el = document.getElementById("ordinal_walk_clicks")
    if (el) el.textContent = `clicks: ${clicks}`
}

//keep `clicks` together with the sequence it counts to, so the pair survives a
//reload (the sequence itself is already saved as lngi_searched_input)
function ordinal_walk_save() {
    const input = document.getElementById("search_input")
    try {
        localStorage.setItem(ORDINAL_WALK_SAVE_KEY, JSON.stringify({
            input: String(input ? input.value : "").trim(),
            clicks: clicks,
            max: ordinal_walk_limit(),
            base: ordinal_walk_base_limit()
        }))
    } catch (e) {
        console.log("could not save the +1 walk state", e)
    }
}

//count `n` more clicks, show it and save it
function ordinal_walk_add_click(n = 1) {
    clicks += n
    ordinal_walk_show_clicks()
    ordinal_walk_save()
}

//true when a is at most b, in ω-Y order
function ordinal_walk_le(a, b) {
    return Y_Sequence.cmp(a.join(","), b.join(",")) <= 0
}

//Standardness of a ω-Y sequence, mirroring the check inside search_time() but
//without touching the page: expand `1,(second term + 1)` and compare term by
//term — a term bigger than the expansion allows means the sequence isn't standard.
function ordinal_walk_standard(l) {
    if (l.length < 2) return false
    if (l[0] != 1 || l.some(p => !Number.isInteger(p) || p <= 0)) return false
    if (l.length == 2) return true

    var seq = `1,${l[1] + 1}`
    var check = 2
    var safe = 1

    while (true) {
        var aseq = seq
        var expanded
        try {
            expanded = String(Y_Sequence.fs(seq, safe + 1)).split(",").slice(0, check + safe).map(Number)
        } catch (e) {
            return false
        }
        //the expansion has to be long enough to cover the term being checked
        if (expanded.length < check + safe) return false

        var d = expanded[check + safe - 1] - l[check + safe - 1]
        if (!isFinite(d) || d < 0) return false

        if (d != 0) {
            expanded[check + safe - 1] = l[check + safe - 1] + 1
            seq = expanded.join(",")
            check += safe
            safe = 1
        } else {
            seq = aseq
            safe++
        }

        if (check + safe - 1 >= l.length) return true
    }
}

//Descend from the 1,3 ceiling via Y_Sequence.fs and return `currentordinal`
//as soon as a fundamental-sequence step reaches `base`.
//Uses the exact property that Y_Sequence.fs(s, 0) decrements a >1 last term
//or pops a trailing 1, so consecutive step=0 moves collapse cleanly in O(1).
function maximizeordinal_base(ord, base) {
    if (base <= 0) return ORDINAL_WALK_CAP_STR
    if (Y_Sequence.cmp(ord, ORDINAL_WALK_CAP_STR) >= 0) return ORDINAL_WALK_CAP_STR

    const ordArr = ord.split(",").map(Number)
    let currentordinal = ORDINAL_WALK_CAP_STR
    let guard = 0

    while (Y_Sequence.cmp(ord, currentordinal) < 0 && guard < 10000) {
        guard++
        const curArr = currentordinal.split(",").map(Number)
        const L = curArr.length
        const v = curArr[L - 1]

        //step = 0 is always < base (since base >= 1): fast-skip consecutive step=0 moves
        if (v <= 1) {
            currentordinal = curArr.slice(0, -1).join(",")
            continue
        }

        let prefixCmp = 0
        const minPre = Math.min(ordArr.length, L - 1)
        for (let i = 0; i < minPre; i++) {
            if (ordArr[i] < curArr[i]) { prefixCmp = -1; break }
            if (ordArr[i] > curArr[i]) { prefixCmp = 1; break }
        }
        if (prefixCmp === 0 && ordArr.length < L - 1) prefixCmp = -1

        if (prefixCmp < 0) {
            currentordinal = curArr.slice(0, -1).join(",")
            continue
        }
        if (prefixCmp === 0) {
            if (ordArr.length === L - 1) {
                currentordinal = curArr.slice(0, -1).join(",")
                continue
            }
            if (ordArr.length === L && ordArr[L - 1] < v) {
                currentordinal = ord
                continue
            }
            if (ordArr.length > L && ordArr[L - 1] < v - 1) {
                curArr[L - 1] = ordArr[L - 1] + 1
                currentordinal = curArr.join(",")
                continue
            }
        }

        //fs(currentordinal, 0) < ord, so find the smallest 1 <= n < base with fs >= ord
        let step = base
        let nextOrd = null
        for (let n = 1; n < base; n++) {
            const x = Y_Sequence.fs(currentordinal, n)
            if (Y_Sequence.cmp(x, ord) >= 0) {
                step = n
                nextOrd = x
                break
            }
        }

        if (step >= base) {
            return currentordinal
        }

        currentordinal = nextOrd
    }

    return currentordinal
}

//Smallest standard ω-Y sequence >= `seq` (capped at 1,3) with at most `maxTerms` terms.
function maximizeordinal_terms(seq, maxTerms) {
    if (seq.length <= maxTerms) return seq
    var carry = seq.slice(0, maxTerms)
    while (carry.length >= 2) {
        const raised = carry.slice()
        raised[raised.length - 1]++
        if (ordinal_walk_le(raised, ORDINAL_WALK_CAP) && ordinal_walk_standard(raised)) {
            return raised
        }
        carry.pop()
    }
    return ORDINAL_WALK_CAP.slice()
}

//Maximize `ord` upward until it satisfies both the `base` limit and the
//`pathmaxlength` (maximum ω-Y terms) limit, staying at or below 1,3.
function maximizeordinal(ord, base = ordinal_walk_base_limit(), pathmaxlength = ordinal_walk_limit()) {
    let cur = Array.isArray(ord) ? ord.join(",") : String(ord).trim()
    if (!cur || Y_Sequence.cmp(cur, ORDINAL_WALK_CAP_STR) >= 0) return ORDINAL_WALK_CAP_STR

    const maxTerms = Math.max(2, Math.floor(Number(pathmaxlength) || 2))
    const effBase = Math.max(1, Math.floor(Number(base) || 2))

    for (let iter = 0; iter < 64; iter++) {
        let arr = cur.split(",").map(Number)
        let next = arr.length > maxTerms ? maximizeordinal_terms(arr, maxTerms).join(",") : cur
        next = maximizeordinal_base(next, effBase)
        let nextArr = next.split(",").map(Number)
        if (nextArr.length > maxTerms) {
            next = maximizeordinal_terms(nextArr, maxTerms).join(",")
        }
        if (next === cur) return cur
        cur = next
    }

    return cur
}

//the sequence after `seq`: take the successor (+1, appending 1) and
//automatically maximize if either the base limit or terms limit is reached.
//After 1,3, wrap back to 1,1.
function ordinal_walk_next(seq, max = ordinal_walk_limit(), base = ordinal_walk_base_limit()) {
    if (Y_Sequence.cmp(seq, ORDINAL_WALK_CAP) >= 0) {
        return [1, 1]
    }
    const succ = seq.concat([1])
    return maximizeordinal(succ, base, max).split(",").map(Number)
}

//what the input currently holds, or null when it isn't a sequence the walk can
//continue from (empty, malformed, non-standard or already past 1,3)
function ordinal_walk_current() {
    const t = String(document.getElementById("search_input").value ?? "").trim()
    if (!/^\d+(\s*,\s*\d+)*$/.test(t)) return null
    const l = t.split(",").map(p => Number(p.trim()))
    if (l.length < 2 || !ordinal_walk_le(l, ORDINAL_WALK_CAP)) return null
    return ordinal_walk_standard(l) ? l : null
}

//the "+1" button: take the successor and auto-maximize under the current
//maximum terms and base settings.
function ordinal_plus_one() {
    const input = document.getElementById("search_input")
    const max = ordinal_walk_limit()
    const base = ordinal_walk_base_limit()
    //Continue from the sequence that is in the box (restored, typed or walked),
    //unless a changed term limit or base already asks for a fresh start.
    const current = ordinal_walk_restart ? null : ordinal_walk_current()
    const next = current ? ordinal_walk_next(current, max, base) : [1, 1]

    ordinal_walk_max = max
    ordinal_walk_base = base
    ordinal_walk_restart = false
    input.value = next.join(",")
    //same path as typing it: refreshes the result, the analysis part and the saved input
    search_time()
    ordinal_walk_add_click(1)
}

//brought back after a reload: the saved sequence is continued instead of being
//thrown away, and the saved click count comes with it
function ordinal_walk_restore() {
    const input = document.getElementById("search_input")
    const saved_input = String(input ? input.value : "").trim()
    const max = ordinal_walk_limit()
    const base = ordinal_walk_base_limit()

    clicks = 0

    var saved = null
    try {
        saved = JSON.parse(localStorage.getItem(ORDINAL_WALK_SAVE_KEY) || "null")
    } catch (e) {
        saved = null
    }

    //the count only belongs to this sequence seen under this term limit and base
    if (saved && typeof saved.clicks == "number" && isFinite(saved.clicks) && saved.clicks >= 0 &&
        String(saved.input ?? "").trim() === saved_input && saved.max === max && saved.base === base) {
        clicks = Math.floor(saved.clicks)
    }

    //nothing forces a restart: pressing +1 continues the restored sequence
    //instead of starting over at 1,1
    ordinal_walk_max = max
    ordinal_walk_base = base
    ordinal_walk_restart = false

    ordinal_walk_show_clicks()
}

//typing a sequence by hand drops the walk's progress: no click got there. The
//typed sequence is what the next press continues from.
const searchInputEl = document.getElementById("search_input")
if (searchInputEl) searchInputEl.addEventListener("input", () => {
    clicks = 0
    ordinal_walk_max = ordinal_walk_limit()
    ordinal_walk_base = ordinal_walk_base_limit()
    ordinal_walk_restart = false
    ordinal_walk_show_clicks()
    ordinal_walk_save()
})

//a new maximum number of terms restarts the walk at 1,1, so the count starts over
const ordinalWalkLimitEl = document.getElementById("ordinal_walk_max_terms")
if (ordinalWalkLimitEl) ordinalWalkLimitEl.addEventListener("input", () => {
    const max = ordinal_walk_limit()
    //typing something the walk can't use (1, or nothing) isn't a real change
    if (max === ordinal_walk_max) return
    ordinal_walk_restart = true
    clicks = 0
    ordinal_walk_max = max
    ordinal_walk_show_clicks()
    ordinal_walk_save()
})

//a new base restarts the walk at 1,1, so the count starts over
const ordinalWalkBaseEl = document.getElementById("ordinal_walk_base")
if (ordinalWalkBaseEl) ordinalWalkBaseEl.addEventListener("input", () => {
    const base = ordinal_walk_base_limit()
    if (base === ordinal_walk_base) return
    ordinal_walk_restart = true
    clicks = 0
    ordinal_walk_base = base
    ordinal_walk_show_clicks()
    ordinal_walk_save()
})

function go_2048() {
    document.getElementById('sex').value = '1,2,4,8,16,32,64,128,256,512,1024,2048'
    specific_time()
}

function specific_time() {
    var n = search_time(document.getElementById('sex').value)[0]
    virtualElapsed = (Date.now() - st) / timeSpeed; 
    if (n != 0) timeOffset = -(Date.now() - st) + get_time_inv(n)
}