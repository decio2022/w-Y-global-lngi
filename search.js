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
//   1,1 → 1,1,1 → 1,2 → 1,2,1 → 1,2,1,1 → 1,2,1,1,1 → 1,2,1,2 → …
//   → 1,2,1,2,1,2,1,1,1 (ω3+3) → 1,2,2 (ω^2) → …
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

//Detect ω-Y limit sequences whose Y_Sequence.fs skips height 1 by decrementing
//straight into a height-2 tower (e.g. ε_1 = 1,2,4,4 has raw fs(0) = 1,2,4,3 =
//ω^ω^(ε_0+1), and generally every ε_{α+1} = 1,2,4,4 / 1,2,4,4,4 / 1,2,4,5,4 /
//1,2,4,6,4 / 1,2,4,5,7,7, as well as higher power-of-2 towers like 1,2,4,8,8).
//In the 1-Y difference mountain (< 1,3), these are precisely the limit
//sequences whose final column has a descending power-of-2 difference chain
//[2^k, ..., 2, 1] of height >= 3 (k >= 1), bad-part length >= 2, and a fresh
//ascent at the bad root b (a[b - 1] < a[b]).
function ordinal_walk_is_skipped_tower(seq) {
    const a = seq.split(",").map(Number)
    if (a.length < 4 || a[a.length - 1] < 4) return false

    let cur = a.map(v => ({ v, p: -1 }))
    const col = [a[a.length - 1]]
    let prevRow = null

    while (true) {
        const next = new Array(cur.length)
        let any = false
        for (let i = 0; i < cur.length; i++) {
            if (cur[i].v <= 1) {
                next[i] = { v: 0, p: -1 }
                continue
            }
            let p = -1
            for (let j = i - 1; j >= 0; j--) {
                if (cur[j].v > 0 && cur[j].v < cur[i].v) {
                    if (!prevRow) {
                        p = j
                        break
                    }
                    let anc = cur[i].p
                    while (anc !== -1 && anc > j) anc = prevRow[anc].p
                    if (anc === j) {
                        p = j
                        break
                    }
                }
            }
            if (p === -1) {
                next[i] = { v: 0, p: -1 }
            } else {
                next[i] = { v: cur[i].v - cur[p].v, p }
                any = true
            }
        }
        if (!any || next[next.length - 1].v === 0) break
        col.push(next[next.length - 1].v)
        prevRow = cur
        cur = next
    }

    if (col.length < 3 || col[col.length - 1] !== 1) return false
    for (let i = col.length - 2; i >= 1; i--) {
        if (col[i] !== col[i + 1] * 2) return false
    }

    const b = prevRow[prevRow.length - 1].p
    if (b <= 0 || a.length - 1 - b < 2) return false
    return a[b - 1] < a[b]
}

//Canonical fundamental-sequence term of a ω-Y sequence for base maximization.
//Y_Sequence.fs always leaves the decremented final column at the end of every
//limit expansion (e.g. fs("1,2", 2) = "1,1,1,1" = 4 instead of 3,
//fs("1,2,2", 2) = "1,2,1,2,1,2,1" = ω3+1 instead of ω3, and
//fs("1,2,3", 3) = "1,2,2,2,2,2" = ω^5 instead of ω^4). Dropping that extra
//final term on limit sequences yields the canonical FS terms:
//  ω[0..3] = 1, 2, 3, 4
//  ω^2[0..3] = ω, ω2, ω3, ω4
//  ω^ω[0..3] = ω, ω^2, ω^3, ω^4
//  ε_0[0..3] = ω, ω^ω, ω^(ω^ω), ω^^4
//For skipped-tower limits such as ε_1 (1,2,4,4), raw Y_Sequence.fs(seq, n - 1)
//already gives the canonical height-(n+1) tower (e.g. ε_1[1..3] = ω^ω^(ε_0+1),
//ω^ω^ω^(ε_0+1), ω^ω^ω^ω^(ε_0+1)), matching ε_0[n] = ω^^(n+1) so that
//ω^ω^ω^ω^(ε_0+1) maximizes directly to ε_1 at base 3.
function ordinal_walk_fs(seq, n) {
    if (!Y_Sequence.isSuccessor(seq)) {
        if (n <= 0) {
            const idx = seq.lastIndexOf(",")
            if (idx !== -1) return seq.slice(0, idx)
        } else if (ordinal_walk_is_skipped_tower(seq)) {
            return Y_Sequence.fs(seq, n - 1)
        }
        const raw = Y_Sequence.fs(seq, n)
        const idx = raw.lastIndexOf(",")
        return idx !== -1 ? raw.slice(0, idx) : raw
    }
    return Y_Sequence.fs(seq, n)
}

//Descend from the 1,3 ceiling via canonical ω-Y fundamental sequences and
//return `currentordinal` once `ord` reaches its `base`-th FS term
//(`ord >= ordinal_walk_fs(currentordinal, base)`).
//For example, at base 3:
//  ω[3] = 4 (1,1,1,1) → 3 stays 3; 4 maximizes to ω (1,2).
//  ω^2[3] = ω4 → ω3+1, ω3+2, ω3+3 stay; ω3+4 maximizes to ω^2 (1,2,2).
//  ω^ω[3] = ω^4 (1,2,2,2,2) → ω^3 stays; ω^4 maximizes to ω^ω (1,2,3).
//  ε_0[3] = ω^^4 (1,2,3,4,5) → ω^^3 stays; ω^^4 maximizes to ε_0 (1,2,4).
//Uses the exact properties that ordinal_walk_fs([pre, v], 0) === [pre] and
//ordinal_walk_fs([pre, v], 1) always starts with [pre, v - 1] to fast-skip
//exact n=0 and (for base >= 2) n=1 descent chains in O(1).
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

        //successor (v <= 1): predecessor is curArr[0..L-2]
        if (v <= 1) {
            currentordinal = curArr.slice(0, -1).join(",")
            continue
        }

        //check n=0: ordinal_walk_fs(currentordinal, 0) === curArr[0..L-2]
        let cmp0 = 0
        const minPre = Math.min(L - 1, ordArr.length)
        for (let i = 0; i < minPre; i++) {
            if (curArr[i] < ordArr[i]) { cmp0 = -1; break }
            if (curArr[i] > ordArr[i]) { cmp0 = 1; break }
        }
        if (cmp0 === 0) {
            if (L - 1 < ordArr.length) cmp0 = -1
            else if (L - 1 > ordArr.length) cmp0 = 1
        }

        //when curArr[0..L-2] >= ord, collapse consecutive n=0 pops
        if (cmp0 >= 0) {
            let popTo = L - 1
            while (popTo > 1) {
                let c = 0
                const ml = Math.min(popTo - 1, ordArr.length)
                for (let i = 0; i < ml; i++) {
                    if (curArr[i] < ordArr[i]) { c = -1; break }
                    if (curArr[i] > ordArr[i]) { c = 1; break }
                }
                if (c === 0) {
                    if (popTo - 1 < ordArr.length) c = -1
                    else if (popTo - 1 > ordArr.length) c = 1
                }
                if (c >= 0) popTo--
                else break
            }
            currentordinal = curArr.slice(0, popTo).join(",")
            continue
        }

        //now curArr[0..L-2] < ord < curArr[0..L-1], so ord shares prefix
        //curArr[0..L-2], has length >= L, and satisfies ordArr[L-1] < v.
        //For base >= 2, ordinal_walk_fs([pre, k], 1) always begins with
        //[pre, k - 1], so n=1 (< base) + n=0 pops collapse straight down:
        if (base >= 2) {
            if (ordArr.length === L) {
                currentordinal = ord
                continue
            }
            if (ordArr[L - 1] < v - 1) {
                curArr[L - 1] = ordArr[L - 1] + 1
                currentordinal = curArr.join(",")
                continue
            }
        }

        //ordinal_walk_fs(currentordinal, 0) < ord: search n = 1..base for first fs >= ord.
        //If ord >= ordinal_walk_fs(currentordinal, base), maximize straight to currentordinal.
        let nextOrd = null
        for (let n = 1; n <= base; n++) {
            const x = ordinal_walk_fs(currentordinal, n)
            const c = Y_Sequence.cmp(x, ord)
            if (c >= 0) {
                if (n === base && c === 0) {
                    return currentordinal
                }
                nextOrd = x
                break
            }
        }

        if (nextOrd === null) {
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

// --- Comparison mode: exact +1 step counter between two ω-Y sequences ---

function ordinal_walk_parse_sequence(raw) {
    const t = Array.isArray(raw) ? raw.join(",") : String(raw ?? "").trim()
    if (!t) return { ok: false, reason: "empty" }
    if (!/^\d+(\s*,\s*\d+)*$/.test(t)) return { ok: false, reason: "malformed" }
    const arr = t.split(",").map(p => Number(p.trim()))
    if (arr.length < 2 || !arr.every(n => Number.isSafeInteger(n) && n >= 1)) {
        return { ok: false, reason: "malformed" }
    }
    if (!ordinal_walk_le(arr, ORDINAL_WALK_CAP)) return { ok: false, reason: "above_cap" }
    if (!ordinal_walk_standard(arr)) return { ok: false, reason: "non_standard" }
    return { ok: true, seq: arr.join(","), arr }
}

function ordinal_compare_format_bigint(n) {
    return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ",")
}

function ordinal_compare_escape(s) {
    return String(s)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
}

//Create an incremental, exact BigInt step counter for the +1 walk from `start`
//to `target` under `maxTerms` and `base`. Because `maximizeordinal` is
//order-preserving, every +1 step moves to the exact next valid fixed point in
//ordinal order, so the step count equals the number of valid fixed points X in
//(start, maximizeordinal(target, base, maxTerms)] with length <= maxTerms.
//Uses an explicit stack with additive-prefix memoization and O(1) leaf rules
//so large queries can be time-sliced without blocking the UI.
function ordinal_walk_create_counter(start, target, maxTerms = ordinal_walk_limit(), base = ordinal_walk_base_limit()) {
    const parsedStart = ordinal_walk_parse_sequence(start)
    if (!parsedStart.ok) {
        return {
            step() {
                return { done: true, result: { status: "invalid_start", reason: parsedStart.reason }, work: 0 }
            },
        }
    }
    const parsedTarget = ordinal_walk_parse_sequence(target)
    if (!parsedTarget.ok) {
        return {
            step() {
                return { done: true, result: { status: "invalid_target", reason: parsedTarget.reason }, work: 0 }
            },
        }
    }

    const effMax = Math.floor(Number(maxTerms))
    if (!isFinite(effMax) || effMax < 2) {
        return {
            step() {
                return { done: true, result: { status: "invalid_max_terms" }, work: 0 }
            },
        }
    }
    const effBase = Math.floor(Number(base))
    if (!isFinite(effBase) || effBase < 2) {
        return {
            step() {
                return { done: true, result: { status: "invalid_base" }, work: 0 }
            },
        }
    }

    const startStr = parsedStart.seq
    const targetStr = parsedTarget.seq
    const cmpST = Y_Sequence.cmp(parsedStart.arr, parsedTarget.arr)
    if (cmpST === 0) {
        return {
            step() {
                return {
                    done: true,
                    result: {
                        status: "same",
                        steps: 0n,
                        start: startStr,
                        target: targetStr,
                        effectiveTarget: targetStr,
                        skippedTarget: false,
                        maxTerms: effMax,
                        base: effBase,
                    },
                    work: 0,
                }
            },
        }
    }
    if (cmpST > 0) {
        return {
            step() {
                return {
                    done: true,
                    result: {
                        status: "start_greater",
                        steps: null,
                        start: startStr,
                        target: targetStr,
                        maxTerms: effMax,
                        base: effBase,
                    },
                    work: 0,
                }
            },
        }
    }

    const effTargetStr = maximizeordinal(targetStr, effBase, effMax)
    const skippedTarget = effTargetStr !== targetStr
    const startArr = parsedStart.arr
    const targetArr = effTargetStr.split(",").map(Number)

    const memo = new Map()
    const fsCache = new Map()
    let work = 0

    function lcpLen(a, b) {
        const n = Math.min(a.length, b.length)
        let i = 0
        while (i < n && a[i] === b[i]) i++
        return i
    }

    function cachedFs(hiStr, k) {
        const ck = hiStr + "|" + k
        let res = fsCache.get(ck)
        if (res === undefined) {
            res = ordinal_walk_fs(hiStr, k).split(",").map(Number)
            fsCache.set(ck, res)
        }
        return res
    }

    function prepare(loArr, hiArr, inclHi, remMax) {
        while (true) {
            if (remMax <= 0) return 0n
            if (Y_Sequence.cmp(loArr, hiArr) >= 0) return 0n

            const lcp = lcpLen(loArr, hiArr)
            if (lcp >= remMax) return 0n

            //O(1) leaf count when lo and hi agree on the first remMax - 1 terms:
            //every standard [prefix, k] < hi is fixed under effBase >= 2.
            if (lcp === remMax - 1) {
                const loVal = loArr.length > lcp ? loArr[lcp] : 0
                const hiVal = hiArr[lcp]
                const upper = (hiArr.length === remMax && !inclHi) ? hiVal - 1 : hiVal
                return upper > loVal ? BigInt(upper - loVal) : 0n
            }

            //Additive prefix invariance: entries starting at 1 have no parent
            //in the prefix, so the prefix only reduces the remaining term budget.
            let stripP = -1
            for (let p = Math.min(lcp, hiArr.length - 1); p >= 1; p--) {
                if (hiArr[p] === 1 && (loArr.length === p || loArr[p] === 1)) {
                    stripP = p
                    break
                }
            }
            if (stripP !== -1) {
                loArr = loArr.slice(stripP)
                hiArr = hiArr.slice(stripP)
                remMax -= stripP
                continue
            }

            //O(1)-FS leaf shortcut at length remMax - 1 when lo starts with [pre, v - 1]:
            //only c_base = ordinal_walk_fs(hi, effBase) determines the upper bound at index remMax - 1.
            if (hiArr.length === remMax - 1 && hiArr[hiArr.length - 1] >= 2 && lcp === remMax - 2) {
                const v = hiArr[remMax - 2]
                const loTail = loArr.length >= remMax - 1 ? loArr[remMax - 2] : 0
                if (loTail === v - 1) {
                    const cBase = cachedFs(hiArr.join(","), effBase)
                    if (cBase.length >= remMax) {
                        const loVal = loArr.length >= remMax ? loArr[remMax - 1] : 0
                        const hiVal = cBase[remMax - 1]
                        const upper = (cBase.length === remMax) ? hiVal - 1 : hiVal
                        const sub = upper > loVal ? BigInt(upper - loVal) : 0n
                        return sub + (inclHi ? 1n : 0n)
                    }
                }
            }

            const hiStr = hiArr.join(",")
            const loStr = loArr.join(",")
            const key = loStr + "|" + hiStr + "|" + (inclHi ? "1" : "0") + "|" + remMax
            const cached = memo.get(key)
            if (cached !== undefined) return cached

            const pre = hiArr.slice(0, -1)
            if (pre.length > 0 && Y_Sequence.cmp(loArr, pre) < 0) {
                return {
                    key, acc: 0n, idx: 0,
                    children: [
                        [loArr, pre, true, remMax],
                        [pre, hiArr, inclHi, remMax],
                    ],
                }
            }

            const v = hiArr[hiArr.length - 1]
            if (v <= 1) {
                const val = (inclHi && hiArr.length <= remMax) ? 1n : 0n
                memo.set(key, val)
                return val
            }

            const stepDown = pre.concat([v - 1])
            if (Y_Sequence.cmp(loArr, stepDown) < 0) {
                return {
                    key, acc: 0n, idx: 0,
                    children: [
                        [loArr, stepDown, true, remMax],
                        [stepDown, hiArr, inclHi, remMax],
                    ],
                }
            }

            const children = []
            let prevChild = pre
            for (let k = 1; k <= effBase; k++) {
                const childArr = cachedFs(hiStr, k)
                if (Y_Sequence.cmp(loArr, childArr) < 0) {
                    const subLo = Y_Sequence.cmp(loArr, prevChild) > 0 ? loArr : prevChild
                    children.push([subLo, childArr, k < effBase, remMax])
                }
                prevChild = childArr
            }
            const baseAcc = (inclHi && hiArr.length <= remMax) ? 1n : 0n
            if (children.length === 0) {
                memo.set(key, baseAcc)
                return baseAcc
            }
            return { key, acc: baseAcc, idx: 0, children }
        }
    }

    const stack = []
    let finalSteps = null
    const init = prepare(startArr, targetArr, true, effMax)
    if (typeof init === "bigint") {
        finalSteps = init
    } else {
        stack.push(init)
    }

    return {
        step(budget = Infinity) {
            let used = 0
            while (stack.length > 0 && used < budget) {
                used++
                work++
                const top = stack[stack.length - 1]
                if (top.idx >= top.children.length) {
                    memo.set(top.key, top.acc)
                    stack.pop()
                    if (stack.length > 0) {
                        stack[stack.length - 1].acc += top.acc
                    } else {
                        finalSteps = top.acc
                    }
                    continue
                }
                const ch = top.children[top.idx++]
                const res = prepare(ch[0], ch[1], ch[2], ch[3])
                if (typeof res === "bigint") {
                    top.acc += res
                } else {
                    stack.push(res)
                }
            }
            if (stack.length === 0) {
                return {
                    done: true,
                    result: {
                        status: "ok",
                        steps: finalSteps,
                        start: startStr,
                        target: targetStr,
                        effectiveTarget: effTargetStr,
                        skippedTarget,
                        maxTerms: effMax,
                        base: effBase,
                    },
                    work,
                }
            }
            return { done: false, result: null, work }
        },
    }
}

//Synchronous helper returning the exact step count result object.
function ordinal_walk_count_steps(start, target, maxTerms = ordinal_walk_limit(), base = ordinal_walk_base_limit(), maxWork = 0) {
    const counter = ordinal_walk_create_counter(start, target, maxTerms, base)
    const tick = counter.step(maxWork > 0 ? maxWork : Infinity)
    if (!tick.done) {
        return { status: "limit_exceeded", work: tick.work }
    }
    return tick.result
}

let ordinal_compare_job_id = 0
let ordinal_compare_timer = null

function ordinal_compare_set_running(running) {
    const cancelBtn = document.getElementById("compare_cancel")
    if (cancelBtn) cancelBtn.hidden = !running
}

function ordinal_compare_render_result(res) {
    const resultEl = document.getElementById("compare_result")
    if (!resultEl) return

    if (res.status === "invalid_start" || res.status === "invalid_target") {
        const label = res.status === "invalid_start" ? "Start" : "Target"
        let msg
        if (res.reason === "empty") msg = `Please enter a ${label.toLowerCase()} ω-Y sequence (for example, 1,1).`
        else if (res.reason === "above_cap") msg = `${label} sequence exceeds the walk limit 1,3.`
        else if (res.reason === "non_standard") msg = `${label} sequence is not a standard ω-Y sequence.`
        else msg = `${label} sequence must be comma-separated positive integers with at least 2 terms (for example, 1,2).`
        resultEl.innerHTML = `<div class="compare-result-error">${ordinal_compare_escape(msg)}</div>`
        return
    }

    if (res.status === "invalid_max_terms") {
        resultEl.innerHTML = `<div class="compare-result-error">Maximum terms must be an integer of at least 2.</div>`
        return
    }

    if (res.status === "invalid_base") {
        resultEl.innerHTML = `<div class="compare-result-error">Base must be an integer of at least 2.</div>`
        return
    }

    if (res.status === "same") {
        resultEl.innerHTML =
            `<div class="compare-result-steps">0 steps</div>` +
            `<div class="compare-result-meta">Start and target are the same sequence (${ordinal_compare_escape(res.start)}).</div>`
        return
    }

    if (res.status === "start_greater") {
        resultEl.innerHTML =
            `<div class="compare-result-error">Start (${ordinal_compare_escape(res.start)}) is greater than target (${ordinal_compare_escape(res.target)}). Target must be at least start.</div>`
        return
    }

    if (res.status === "ok") {
        const stepsFmt = ordinal_compare_format_bigint(res.steps)
        const unit = res.steps === 1n ? "step" : "steps"
        let html =
            `<div class="compare-result-steps">${stepsFmt} ${unit}</div>` +
            `<div class="compare-result-meta">From ${ordinal_compare_escape(res.start)} to ${ordinal_compare_escape(res.target)} (Maximum terms: ${res.maxTerms}, Base: ${res.base})</div>`
        if (res.skippedTarget) {
            html += `<div class="compare-result-note">Note: ${ordinal_compare_escape(res.target)} is skipped under Maximum terms ${res.maxTerms}, Base ${res.base} (auto-maximizes to ${ordinal_compare_escape(res.effectiveTarget)}). This is the number of steps to reach &ge; ${ordinal_compare_escape(res.target)} (landing on ${ordinal_compare_escape(res.effectiveTarget)}).</div>`
        }
        resultEl.innerHTML = html
    }
}

function ordinal_compare_cancel(showMessage = true) {
    ordinal_compare_job_id++
    if (ordinal_compare_timer !== null && typeof clearTimeout === "function") {
        clearTimeout(ordinal_compare_timer)
        ordinal_compare_timer = null
    }
    ordinal_compare_set_running(false)
    if (showMessage) {
        const resultEl = document.getElementById("compare_result")
        if (resultEl) {
            resultEl.innerHTML = `<div class="compare-result-meta">Comparison cancelled.</div>`
        }
    }
}

function ordinal_compare_run() {
    ordinal_compare_cancel(false)
    const jobId = ordinal_compare_job_id

    const startEl = document.getElementById("compare_start")
    const targetEl = document.getElementById("compare_target")
    const maxEl = document.getElementById("compare_max_terms")
    const baseEl = document.getElementById("compare_base")
    const resultEl = document.getElementById("compare_result")

    const startVal = startEl ? startEl.value : ""
    const targetVal = targetEl ? targetEl.value : ""
    const maxVal = maxEl ? maxEl.value : ""
    const baseVal = baseEl ? baseEl.value : ""

    const counter = ordinal_walk_create_counter(startVal, targetVal, maxVal, baseVal)
    const first = counter.step(2500)
    if (first.done) {
        ordinal_compare_render_result(first.result)
        return first.result
    }

    if (typeof setTimeout !== "function") {
        const rest = counter.step(Infinity)
        ordinal_compare_render_result(rest.result)
        return rest.result
    }

    ordinal_compare_set_running(true)
    if (resultEl) {
        resultEl.innerHTML = `<div class="compare-result-meta">Calculating steps from ${ordinal_compare_escape(String(startVal).trim())} to ${ordinal_compare_escape(String(targetVal).trim())}...</div>`
    }

    function pump() {
        if (jobId !== ordinal_compare_job_id) return
        const tick = counter.step(4000)
        if (tick.done) {
            ordinal_compare_timer = null
            ordinal_compare_set_running(false)
            ordinal_compare_render_result(tick.result)
            return
        }
        ordinal_compare_timer = setTimeout(pump, 0)
    }

    ordinal_compare_timer = setTimeout(pump, 0)
    return null
}

for (const compareInputId of ["compare_start", "compare_target", "compare_max_terms", "compare_base"]) {
    const el = document.getElementById(compareInputId)
    if (!el) continue
    el.addEventListener("keydown", e => {
        if (e && e.key === "Enter") ordinal_compare_run()
    })
    el.addEventListener("input", () => {
        if (ordinal_compare_timer !== null) ordinal_compare_cancel(false)
    })
}

function go_2048() {
    document.getElementById('sex').value = '1,2,4,8,16,32,64,128,256,512,1024,2048'
    specific_time()
}

function specific_time() {
    var n = search_time(document.getElementById('sex').value)[0]
    virtualElapsed = (Date.now() - st) / timeSpeed; 
    if (n != 0) timeOffset = -(Date.now() - st) + get_time_inv(n)
}