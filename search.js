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





//the ω-Y sequence the analysis part shows: the one searched in the active input
//part of the Analyzer tab (it falls back to 1,1 when it's null)
var searched_ordinal = null
//its value, used by the search progress tab (the value of 1,1 is 2)
var searched_value = null

//The Analyzer tab has two input parts: the first one ("up", walked by +1 from
//1,1 to 1,3) and the inverse one below it ("down", walked by −1 from 1,3 to
//1,1). Each keeps the sequence that was last searched in it.
var search_parts = {
    up: { ordinal: null, value: null },
    down: { ordinal: null, value: null }
}

//which of the two parts the analysis and the progress pages follow: the one
//that was used last (typed in, clicked into, or walked with its buttons)
var search_active = "up"

//where the active part is kept between visits
const SEARCH_ACTIVE_SAVE_KEY = "lngi_active_input"

//the text of the search box that search_time() last looked at, so the app can
//notice when the browser restores a typed value after a reload
var last_search_input = null
//same, for the inverse input part
var last_inverse_input = null

//hand the active part's sequence to the analysis part and the progress pages
function search_apply_active() {
    const part = search_parts[search_active] || search_parts.up
    searched_ordinal = part.ordinal
    searched_value = part.value
}

//make one of the two input parts ("up" or "down") the one the analysis follows
function search_set_active(which) {
    search_active = which == "down" ? "down" : "up"
    search_apply_active()

    try {
        localStorage.setItem(SEARCH_ACTIVE_SAVE_KEY, search_active)
    } catch (e) {
        console.log("could not save the active input part", e)
    }

    //mark the active part, so it's clear which sequence is being analysed
    const marks = { up: "ordinal_part", down: "inverse_part" }
    for (const key in marks) {
        const el = document.getElementById(marks[key])
        if (el && el.classList) el.classList.toggle("active", key == search_active)
    }
}

//Reads a typed ω-Y sequence without touching the page. It gives back
//  ret:     what search_time() returns, [value, depth] ([0, 0] when there's none)
//  html:    the message for the result line (null when nothing was typed)
//  ordinal: the sequence for the analysis part (null when there's no valid one)
//  value:   its value (null together with ordinal)
function search_evaluate(x) {
    var t = String(x ?? "").trim()
    var r = ""

    //null sequence: the analysis part falls back to 1,1
    if (t == "") return { ret: [0, 0], html: null, ordinal: null, value: null }

    if (t[0] != 1) {
        return { ret: [0, 0], html: "Please insert valid ordinal starting with 1!", ordinal: null, value: null }
    }

    //every term has to be a positive integer, otherwise the sequence is invalid
    var l = t.split(",").map(p => p.trim())

    if (l.some(p => !/^-?\d+$/.test(p))) {
        return { ret: [0, 0], html: "Please insert a valid ordinal!", ordinal: null, value: null }
    }

    l = l.map(Number)

    if (l.some(p => p <= 0)) {
        return { ret: [0, 0], html: `Don't put zero or negative values in!`, ordinal: null, value: null }
    }

    if (l.length == 1) {
        return { ret: [0, 0], html: `This lngi starts at 1,1 :3`, ordinal: "1,1", value: 2 }
    }

    var seq = `1,${l[1] + 1}`
    var r = l[1] + 1
    var i = 1

    if (l.length == 2) {
        return {
            ret: [r, 1],
            html: `Achievement day:<br>${new Date(get_time_inv(r) + st).toLocaleString()}`,
            ordinal: l.join(","),
            value: r
        }
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
            return { ret: [0, 0], html: `Not standard.`, ordinal: null, value: null }
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
    var t = get_time_inv(r) + st
    return {
        ret: [r, -Math.log2(i)],
        html: `Achievement day:<br>${new Date(t).toLocaleString()} <small><i>${(t%1000).toFixed(3)}ms</i></small>`,
        ordinal: l.join(","),
        value: r
    }
}

function search_time(x = document.getElementById("search_input").value) {
    //only a call coming from the Search tab input itself (no argument passed)
    //updates the sequence of the first input part
    var fromSearchTab = arguments.length == 0
    last_search_input = document.getElementById("search_input").value
    if (fromSearchTab) {
        //forget the previous sequence first, so a failed search never leaves it behind
        search_parts.up.ordinal = null
        search_parts.up.value = null
        search_apply_active()
        localStorage.setItem("lngi_searched_input", String(x ?? "").trim())
    }

    var found = search_evaluate(x)

    if (fromSearchTab) {
        search_parts.up.ordinal = found.ordinal
        search_parts.up.value = found.value
        search_apply_active()
    }

    if (found.html != null) document.getElementById("search_result").innerHTML = found.html
    else if (fromSearchTab) document.getElementById("search_result").innerHTML = "Please insert ordinal!"

    return found.ret
}

//the same search, for the inverse input part below the first one: it reads its
//own box, fills its own result line and keeps its own sequence
function inverse_search_time() {
    const input = document.getElementById("inverse_input")
    const x = input ? input.value : ""
    last_inverse_input = x
    //forget the previous sequence first, so a failed search never leaves it behind
    search_parts.down.ordinal = null
    search_parts.down.value = null
    search_apply_active()
    localStorage.setItem("lngi_inverse_input", String(x ?? "").trim())

    var found = search_evaluate(x)

    search_parts.down.ordinal = found.ordinal
    search_parts.down.value = found.value
    search_apply_active()

    const result = document.getElementById("inverse_result")
    if (result) result.innerHTML = found.html != null ? found.html : "Please insert ordinal!"

    return found.ret
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

    //the inverse input part comes back the same way
    const inverse = document.getElementById("inverse_input")
    const inverse_saved = localStorage.getItem("lngi_inverse_input")
    if (inverse && inverse_saved) inverse.value = inverse_saved
    inverse_search_time()
    inverse_walk_restore()

    //and so does the part the analysis was following
    search_set_active(localStorage.getItem(SEARCH_ACTIVE_SAVE_KEY) == "down" ? "down" : "up")
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
//
//A standard sequence gives back where the check stopped: the sequence `seq`
//whose expansion bounds the terms that could follow, with the `check` / `safe`
//counters telling how far into that expansion the next term is. The −1 walk
//uses it to find the biggest terms a sequence can be continued with.
//A non-standard sequence gives back null.
function ordinal_walk_bound(l) {
    if (l.length < 2) return null
    if (l[0] != 1 || l.some(p => !Number.isInteger(p) || p <= 0)) return null

    var seq = `1,${l[1] + 1}`
    var check = 2
    var safe = 1

    //the term being checked is always the one at index check + safe - 1
    while (check + safe - 1 < l.length) {
        var aseq = seq
        var expanded
        try {
            expanded = String(Y_Sequence.fs(seq, safe + 1)).split(",").slice(0, check + safe).map(Number)
        } catch (e) {
            return null
        }
        //the expansion has to be long enough to cover the term being checked
        if (expanded.length < check + safe) return null

        var d = expanded[check + safe - 1] - l[check + safe - 1]
        if (!isFinite(d) || d < 0) return null

        if (d != 0) {
            expanded[check + safe - 1] = l[check + safe - 1] + 1
            seq = expanded.join(",")
            check += safe
            safe = 1
        } else {
            seq = aseq
            safe++
        }
    }

    return { seq: seq, check: check, safe: safe }
}

function ordinal_walk_standard(l) {
    return ordinal_walk_bound(l) != null
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
//continue from (empty, malformed, non-standard or already past 1,3).
//`id` picks the box: the first input part by default, or the inverse one.
function ordinal_walk_current(id = "search_input") {
    const t = String(document.getElementById(id).value ?? "").trim()
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
    //the analysis follows the part that was walked last
    search_set_active("up")
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
    //the analysis follows the part that was typed in last
    search_set_active("up")
})
//clicking into the box is enough to bring the analysis back to this part
if (searchInputEl) searchInputEl.addEventListener("focus", () => search_set_active("up"))

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

// ---------------------------------------------------------------------------
// The inverse input part, below the first one: its "−1" button.
//
// It is the exact reverse of the "+1" walk above. Where +1 starts at 1,1 and
// climbs to 1,3, −1 starts at 1,3 and comes down to 1,1, visiting the very same
// sequences in the opposite order — for any maximum number of terms:
//   · a sequence ending in 1 got that 1 from +1, so −1 takes it off again
//   · any other sequence was reached by +1 raising its last term (after dropping
//     the terms that couldn't be raised), so −1 lowers that term and then puts
//     back the biggest terms that still fit, up to the maximum number of terms
//   · 1,1 is the floor: the press after it wraps back up to 1,3
// So with a limit of 5 terms it goes
//   1,3 → 1,2,4,8,16 → 1,2,4,8,15 → … → 1,2,4,8,1 → 1,2,4,8 → 1,2,4,7,11 → …
//   … → 1,2 → 1,1,1,1,1 → 1,1,1,1 → 1,1,1 → 1,1
// and pressing +1 on any of them gives the one before it back.
//
// Its "Max" button does the same presses, but keeps pressing by itself until the
// sequence has as many terms as the limit allows (1,2,4,8 → 1,2,4,7,11) or until
// it reaches 1,1.
//
// Like the first part it has its own box, result line, term limit and click
// count, and all of them are kept between visits.
// ---------------------------------------------------------------------------

//how many terms one expansion is asked for at a time while refilling a sequence
const ORDINAL_WALK_FILL_CHUNK = 32

//`seq` (a standard sequence) continued with the biggest terms that keep it
//standard, until it has `max` terms: the biggest sequence with at most `max`
//terms that starts with `seq`.
//The terms that can follow are exactly the expansion ordinal_walk_bound() stopped
//at, so they are read from it instead of being searched one by one.
function ordinal_walk_fill(seq, max) {
    const out = seq.slice()
    const bound = ordinal_walk_bound(out)
    if (!bound) return out

    while (out.length < max) {
        const want = Math.min(max, out.length + ORDINAL_WALK_FILL_CHUNK)
        var expanded
        try {
            //the term at index i is checked with `safe` = i - check + 1, against
            //the expansion fs(seq, safe + 1) cut to i + 1 terms
            expanded = String(Y_Sequence.fs(bound.seq, want - bound.check + 1)).split(",").slice(0, want).map(Number)
        } catch (e) {
            break
        }
        //the expansion has to continue what is already there
        if (expanded.length <= out.length || out.some((term, i) => expanded[i] !== term)) break

        const before = out.length
        for (var i = before; i < expanded.length; i++) {
            //terms past JavaScript's exact integers can't be walked any further
            if (!Number.isSafeInteger(expanded[i]) || expanded[i] < 1) return out
            out.push(expanded[i])
        }
        if (expanded.length < want) break
    }

    return out
}

//the sequence before `seq`, following the −1 rules above: it undoes ordinal_walk_next()
function ordinal_walk_prev(seq, max) {
    //1,1 is the floor (we were at the bottom): start over from the top
    if (seq.length <= 2 && seq[seq.length - 1] == 1) return ORDINAL_WALK_CAP.slice()

    //a trailing 1 was appended by +1: take it off again
    if (seq[seq.length - 1] == 1) return seq.slice(0, -1)

    //+1 raised this term after dropping everything it couldn't raise: lower it,
    //then bring back the biggest terms that fit behind it
    const lowered = seq.slice()
    lowered[lowered.length - 1]--
    return ordinal_walk_fill(lowered, max)
}

//the term limit the −1 walk currently runs with, so a change restarts it at 1,3
var inverse_walk_max = null

//set when the maximum terms changed: the next press then starts over at 1,3
//instead of continuing the sequence that is already in the box
var inverse_walk_restart = false

//How many times "−1" was pressed to reach the sequence that is saved, counted
//and kept exactly like `clicks` is for the +1 walk.
var inverse_clicks = 0

//where `inverse_clicks` and the sequence it belongs to are kept between visits
const INVERSE_WALK_SAVE_KEY = "lngi_inverse_walk"

//The −1 walk's own term limit. Values below 2 use a minimum of 2 terms,
//since the walk ends at 1,1.
function inverse_walk_limit() {
    const el = document.getElementById("inverse_walk_max_terms")
    const n = el ? Number(el.value) : 2
    return isFinite(n) ? Math.max(2, Math.floor(n)) : 2
}

//show the counter next to the term limit (it is only a readout of `inverse_clicks`)
function inverse_walk_show_clicks() {
    const el = document.getElementById("inverse_walk_clicks")
    if (el) el.textContent = `clicks: ${inverse_clicks}`
}

//keep `inverse_clicks` together with the sequence it counts to, so the pair
//survives a reload (the sequence itself is already saved as lngi_inverse_input)
function inverse_walk_save() {
    const input = document.getElementById("inverse_input")
    try {
        localStorage.setItem(INVERSE_WALK_SAVE_KEY, JSON.stringify({
            input: String(input ? input.value : "").trim(),
            clicks: inverse_clicks,
            max: inverse_walk_limit()
        }))
    } catch (e) {
        console.log("could not save the −1 walk state", e)
    }
}

//count `n` more clicks (Max counts every inner press), show it and save it
function inverse_walk_add_click(n = 1) {
    inverse_clicks += n
    inverse_walk_show_clicks()
    inverse_walk_save()
}

//true for 1,1, the floor of the −1 walk
function inverse_walk_floor(seq) {
    return seq.length == 2 && seq[1] == 1
}

//true when −1 on `seq` lowers its last term and refills the sequence behind it
//(false when it only takes a trailing 1 off, or wraps from 1,1 to 1,3)
function inverse_walk_refills(seq) {
    return seq[seq.length - 1] != 1
}

//One press of the −1 walk, shared by "−1" and its "Max".
//With `maximize` the press keeps going by itself until the sequence fills the
//term limit again (after taking off trailing 1s) or lands on 1,1, the floor.
//Every step it takes counts as a click, so Max counts exactly like pressing −1
//that many times.
function inverse_walk_press(maximize) {
    const input = document.getElementById("inverse_input")
    const max = inverse_walk_limit()
    //Continue from the sequence that is in the box (restored, typed or walked),
    //unless a changed term limit already asks for a fresh start.
    let current = inverse_walk_restart ? null : ordinal_walk_current("inverse_input")
    //a sequence with more terms than the walk allows can't be continued either
    if (current && current.length > max) current = null

    //a changed term limit restarts the walk, and so does anything we can't
    //continue from: the −1 walk starts at the top, 1,3
    let next = current ? ordinal_walk_prev(current, max) : ORDINAL_WALK_CAP.slice()
    let pressed = 1

    if (maximize) {
        //Trailing 1s come off one per press and the press after them refills the
        //sequence, so this settles quickly. A refilled sequence is already as
        //long as it can get, so the walk stops there even in the rare case it
        //couldn't be filled all the way; the bound is only a last guard.
        let refilled = !!current && inverse_walk_refills(current)
        const guard = 2 * max + 8
        while (!refilled && next.length < max && !inverse_walk_floor(next) && pressed < guard) {
            refilled = inverse_walk_refills(next)
            next = ordinal_walk_prev(next, max)
            pressed++
        }
    }

    inverse_walk_max = max
    inverse_walk_restart = false
    input.value = next.join(",")
    //same path as typing it: refreshes the result, the analysis part and the saved input
    inverse_search_time()
    //the analysis follows the part that was walked last
    search_set_active("down")
    inverse_walk_add_click(pressed)
}

//the "−1" button: one step down
function inverse_minus_one() {
    inverse_walk_press(false)
}

//the inverse part's "Max" button: as many steps down as it takes to fill the term limit
function inverse_max() {
    inverse_walk_press(true)
}

//brought back after a reload: the saved sequence is continued instead of being
//thrown away, and the saved click count comes with it
function inverse_walk_restore() {
    const input = document.getElementById("inverse_input")
    const saved_input = String(input ? input.value : "").trim()
    const max = inverse_walk_limit()

    inverse_clicks = 0

    var saved = null
    try {
        saved = JSON.parse(localStorage.getItem(INVERSE_WALK_SAVE_KEY) || "null")
    } catch (e) {
        saved = null
    }

    //the count only belongs to this sequence seen under this term limit
    if (saved && typeof saved.clicks == "number" && isFinite(saved.clicks) && saved.clicks >= 0 &&
        String(saved.input ?? "").trim() === saved_input && saved.max === max) {
        inverse_clicks = Math.floor(saved.clicks)
    }

    //nothing forces a restart: pressing −1 or Max continues the restored
    //sequence instead of starting over at 1,3
    inverse_walk_max = max
    inverse_walk_restart = false

    inverse_walk_show_clicks()
}

//typing a sequence by hand drops the walk's progress: no click got there. The
//typed sequence is what the next press continues from.
const inverseInputEl = document.getElementById("inverse_input")
if (inverseInputEl) inverseInputEl.addEventListener("input", () => {
    inverse_search_time()
    inverse_clicks = 0
    inverse_walk_max = inverse_walk_limit()
    inverse_walk_restart = false
    inverse_walk_show_clicks()
    inverse_walk_save()
    //the analysis follows the part that was typed in last
    search_set_active("down")
})
//clicking into the box is enough to bring the analysis over to this part
if (inverseInputEl) inverseInputEl.addEventListener("focus", () => search_set_active("down"))

//a new maximum number of terms restarts the walk at 1,3, so the count starts over
const inverseWalkLimitEl = document.getElementById("inverse_walk_max_terms")
if (inverseWalkLimitEl) inverseWalkLimitEl.addEventListener("input", () => {
    const max = inverse_walk_limit()
    //typing something the walk can't use (1, or nothing) isn't a real change
    inverse_walk_restart = max !== inverse_walk_max
    if (!inverse_walk_restart) return
    inverse_clicks = 0
    inverse_walk_max = max
    inverse_walk_show_clicks()
    inverse_walk_save()
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