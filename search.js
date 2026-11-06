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
// It walks the standard ω-Y sequences in increasing order, always starting at
// 1,1 and never going past 1,3:
//   · while the sequence is shorter than the +1 maximum terms, append a 1
//   · once it hits that length, add 1 to the last term; if the result isn't a
//     standard sequence, drop that term and carry the +1 to the new last term,
//     repeating until some term change gives a standard sequence
//   · 1,3 is the ceiling: the press after it wraps back to 1,1
// So with a limit of 5 terms it goes
//   1,1 → 1,1,1 → 1,1,1,1 → 1,1,1,1,1 → 1,2
// (1,1,1,1,2 / 1,1,1,2 / 1,1,2 are all non-standard, 1,2 is the first hit).
//
// The "Max" button does the same presses, but keeps pressing by itself until the
// sequence has as many terms as the limit allows, so it lands on the next full
// sequence: with 5 terms 1,1,1,1,1 → 1,2,1,1,1 → 1,2,1,2,1 → 1,2,1,2,2 → …
//
// The sequence the button left behind (already saved as the searched input) and
// the number of clicks that got there are also kept, so after leaving the page
// and coming back the button carries on from where it was instead of jumping
// back to 1,1. Only a changed term limit starts the walk over.
// ---------------------------------------------------------------------------

//the highest sequence the button ever reaches
const ORDINAL_WALK_CAP = [1, 3]

//the term limit the walk currently runs with, so a change restarts it at 1,1
var ordinal_walk_max = null

//set when the maximum terms changed: the next press then starts over at 1,1
//instead of continuing the sequence that is already in the box
var ordinal_walk_restart = false

//How many times "+1" was pressed to reach the sequence that is saved: it counts
//from 0 whenever the walk (re)starts at 1,1, is kept when you leave and come
//back, and goes back to 0 when the maximum number of terms changes.
var clicks = 0

//where `clicks` and the sequence it belongs to are kept between visits
const ORDINAL_WALK_SAVE_KEY = "lngi_ordinal_walk"

//The +1 walk's own term limit. Values below 2 use a minimum of 2 terms,
//since the walk starts at 1,1.
function ordinal_walk_limit() {
    const el = document.getElementById("ordinal_walk_max_terms")
    const n = el ? Number(el.value) : 2
    return isFinite(n) ? Math.max(2, Math.floor(n)) : 2
}

//show the counter next to the term limit (it is only a readout of `clicks`)
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
            max: ordinal_walk_limit()
        }))
    } catch (e) {
        console.log("could not save the +1 walk state", e)
    }
}

//count `n` more clicks (Max counts every inner press), show it and save it
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

//the sequence after `seq`, following the +1 rules above
function ordinal_walk_next(seq, max) {
    //still room for another term: appending 1 always keeps a sequence standard
    if (seq.length < max) {
        const grown = seq.concat([1])
        return ordinal_walk_le(grown, ORDINAL_WALK_CAP) ? grown : [1, 1]
    }

    //no room left: try to raise the last term, carrying left while it's invalid
    var carry = seq.slice()
    while (carry.length >= 2) {
        const raised = carry.slice()
        raised[raised.length - 1]++
        if (raised.length <= max && ordinal_walk_le(raised, ORDINAL_WALK_CAP) && ordinal_walk_standard(raised)) return raised
        carry.pop()
    }

    //nothing below the cap is left (we were at 1,3): start over
    return [1, 1]
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

//One press of the walk, shared by "+1" and "Max".
//With `maximize` the press keeps going by itself until the sequence fills the
//term limit, walking up again after a step that drops terms (1,1,1,1,1 → 1,2).
//Every step it takes counts as a click, so Max counts exactly like pressing +1
//that many times.
function ordinal_walk_press(maximize) {
    const input = document.getElementById("search_input")
    const max = ordinal_walk_limit()
    //Continue from the sequence that is in the box (restored, typed or walked),
    //unless a changed term limit already asks for a fresh start.
    let current = ordinal_walk_restart ? null : ordinal_walk_current()
    //a sequence with more terms than the walk allows can't be continued either
    if (current && current.length > max) current = null

    //a changed term limit restarts the walk, and so does anything we can't continue from
    let next = current ? ordinal_walk_next(current, max) : [1, 1]
    let pressed = 1

    if (maximize) {
        //a short sequence grows one term per press, so this settles quickly; the
        //bound only guards against a step that restarts the walk at 1,1
        const guard = 2 * max + 8
        while (next.length < max && pressed < guard) {
            next = ordinal_walk_next(next, max)
            pressed++
        }
    }

    ordinal_walk_max = max
    ordinal_walk_restart = false
    input.value = next.join(",")
    //same path as typing it: refreshes the result, the analysis part and the saved input
    search_time()
    ordinal_walk_add_click(pressed)
}

//the "+1" button: one step of the walk
function ordinal_plus_one() {
    ordinal_walk_press(false)
}

//the "Max" button: as many steps as it takes to fill the term limit
function ordinal_max() {
    ordinal_walk_press(true)
}

//brought back after a reload: the saved sequence is continued instead of being
//thrown away, and the saved click count comes with it
function ordinal_walk_restore() {
    const input = document.getElementById("search_input")
    const saved_input = String(input ? input.value : "").trim()
    const max = ordinal_walk_limit()

    clicks = 0

    var saved = null
    try {
        saved = JSON.parse(localStorage.getItem(ORDINAL_WALK_SAVE_KEY) || "null")
    } catch (e) {
        saved = null
    }

    //the count only belongs to this sequence seen under this term limit
    if (saved && typeof saved.clicks == "number" && isFinite(saved.clicks) && saved.clicks >= 0 &&
        String(saved.input ?? "").trim() === saved_input && saved.max === max) {
        clicks = Math.floor(saved.clicks)
    }

    //nothing forces a restart: pressing +1 or Max continues the restored
    //sequence instead of starting over at 1,1
    ordinal_walk_max = max
    ordinal_walk_restart = false

    ordinal_walk_show_clicks()
}

//typing a sequence by hand drops the walk's progress: no click got there. The
//typed sequence is what the next press continues from.
const searchInputEl = document.getElementById("search_input")
if (searchInputEl) searchInputEl.addEventListener("input", () => {
    clicks = 0
    ordinal_walk_max = ordinal_walk_limit()
    ordinal_walk_restart = false
    ordinal_walk_show_clicks()
    ordinal_walk_save()
})

//a new maximum number of terms restarts the walk at 1,1, so the count starts over
const ordinalWalkLimitEl = document.getElementById("ordinal_walk_max_terms")
if (ordinalWalkLimitEl) ordinalWalkLimitEl.addEventListener("input", () => {
    const max = ordinal_walk_limit()
    //typing something the walk can't use (1, or nothing) isn't a real change
    ordinal_walk_restart = max !== ordinal_walk_max
    if (!ordinal_walk_restart) return
    clicks = 0
    ordinal_walk_max = max
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