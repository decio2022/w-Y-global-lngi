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

// --- Comparison mode: exact +1 step counter & step-forward lookup ---

function ordinal_walk_arr_cmp(a, b) {
    const n = a.length < b.length ? a.length : b.length
    for (let i = 0; i < n; i++) {
        if (a[i] !== b[i]) return a[i] < b[i] ? -1 : 1
    }
    return a.length === b.length ? 0 : (a.length < b.length ? -1 : 1)
}

function ordinal_walk_lcp_len(a, b) {
    const n = a.length < b.length ? a.length : b.length
    let i = 0
    while (i < n && a[i] === b[i]) i++
    return i
}

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

function ordinal_walk_parse_steps(raw) {
    if (typeof raw === "bigint") {
        return raw >= 0n ? { ok: true, steps: raw } : { ok: false, reason: "negative" }
    }
    const t = String(raw ?? "").trim().replace(/[\s,_]+/g, "")
    if (!t) return { ok: false, reason: "empty" }
    if (!/^\d+$/.test(t)) return { ok: false, reason: "malformed" }
    try {
        return { ok: true, steps: BigInt(t) }
    } catch (e) {
        return { ok: false, reason: "malformed" }
    }
}

function ordinal_compare_format_bigint(n) {
    return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ",")
}

function ordinal_compare_format_ratio_pct(num, den) {
    if (den <= 0n || num <= 0n) return "0%"
    if (num >= den) return "100%"
    const scaled = (num * 1000000n) / den
    if (scaled === 0n) return "< 0.0001%"
    if (scaled >= 10000n) return (Number(scaled / 100n) / 100).toFixed(2) + "%"
    if (scaled >= 100n) return (Number(scaled / 10n) / 1000).toFixed(3) + "%"
    return (Number(scaled) / 10000).toFixed(4) + "%"
}

function ordinal_compare_escape(s) {
    return String(s)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
}

//Fast pure-array 1D Y-sequence batch expander for sequences <= 1,3.
//Computes [ordinal_walk_fs(arr, 1), ..., ordinal_walk_fs(arr, maxK)] in a single
//mountain pass, stopping early once output length >= maxLen and capping column
//expansion at maxLen + 1. Returns null to fall back to ordinal_walk_fs if a
//higher-dimensional case is ever encountered.
function ordinal_walk_fs_batch_arr(arr, maxK, maxLen) {
    const L = arr.length
    if (L === 0 || arr[L - 1] <= 1) {
        return [arr.slice(0, -1)]
    }
    if (L === 2 && arr[0] === 1 && arr[1] === 3) {
        const out = []
        for (let k = 1; k <= maxK; k++) {
            const r = new Array(k + 1)
            let val = 1
            for (let i = 0; i <= k; i++) {
                r[i] = val
                val *= 2
            }
            out.push(r)
            if (r.length >= maxLen) break
        }
        return out
    }

    const v = new Array(L)
    const pc = new Array(L)
    const pr = new Array(L)
    for (let i = 0; i < L; i++) {
        const v0 = arr[i]
        let p0 = -1
        if (v0 > 1) {
            for (let j = i - 1; j >= 0; j--) {
                if (arr[j] < v0) { p0 = j; break }
            }
        }
        const vc = [v0], pcc = [p0], prc = [0]
        let r = 0
        while (vc[r] > 1) {
            const parentCol = pcc[r], parentRow = prc[r]
            if (parentCol < 0 || parentRow !== r) return null
            const diff = vc[r] - v[parentCol][parentRow]
            let curCol = parentCol, curRow = parentRow
            if (v[curCol].length > curRow + 1) curRow = curRow + 1
            while (curCol >= 0 && v[curCol][curRow] >= diff) {
                const nc = pc[curCol][curRow], nr = pr[curCol][curRow]
                curCol = nc
                curRow = nr
            }
            vc.push(diff)
            pcc.push(curCol)
            prc.push(curRow)
            r++
        }
        v[i] = vc
        pc[i] = pcc
        pr[i] = prc
    }

    const lastV = v[L - 1]
    let topR = lastV.length - 1
    if (lastV[topR] === 1) topR--
    const bCol = pc[L - 1][topR], bRow = pr[L - 1][topR]
    if (bCol < 0 || bRow !== topR || lastV[topR] - v[bCol][bRow] > 1) return null

    const badLen = (L - 1) - bCol
    let skippedTower = false
    if (lastV.length >= 3 && lastV[lastV.length - 1] === 1 && badLen >= 2) {
        let pow2 = true
        for (let i = lastV.length - 2; i >= 1; i--) {
            if (lastV[i] !== lastV[i + 1] * 2) { pow2 = false; break }
        }
        if (pow2) skippedTower = ordinal_walk_is_skipped_tower(arr.join(","))
    }

    const refC = new Array(L), refR = new Array(L), no = new Array(L), id = new Array(L)
    let nextId = 0
    for (let i = 0; i < L; i++) {
        const len = v[i].length
        const rc = new Array(len), rr = new Array(len), nc = new Array(len), ic = new Array(len)
        for (let r = 0; r < len; r++) {
            if (r === 0 && v[i][0] <= 1) {
                rc[r] = -1
                rr[r] = 0
            } else if (pc[i][r] >= 0 && pr[i][r] === r) {
                rc[r] = pc[i][r]
                rr[r] = r
            } else {
                const hpc = pc[i][r - 1], hpr = pr[i][r - 1]
                if (hpc >= 0 && v[hpc].length > hpr + 1 && hpr + 1 <= r) {
                    let tc = hpc, tr = hpr + 1
                    while (tr === r) {
                        const ntc = refC[tc][tr], ntr = refR[tc][tr]
                        tc = ntc
                        tr = ntr
                    }
                    rc[r] = tc
                    rr[r] = tr
                } else {
                    rc[r] = hpc
                    rr[r] = hpr
                }
            }
            if (i === bCol) nc[r] = r + 1
            else if (i < bCol || (v[i][0] <= 1 && r === 0)) nc[r] = 0
            else nc[r] = no[rc[r]][rr[r]]

            if (i > bCol) ic[r] = nextId++
            if (i === bCol || i === L - 1) ic[r] = nc[r]
        }
        refC[i] = rc
        refR[i] = rr
        no[i] = nc
        id[i] = ic
    }

    if (topR < v[L - 1].length - 1) {
        v[L - 1].pop()
        pc[L - 1].pop()
        pr[L - 1].pop()
        refC[L - 1].pop()
        refR[L - 1].pop()
        no[L - 1].pop()
        id[L - 1].pop()
        const oldPc = pc[L - 1][topR], oldPr = pr[L - 1][topR]
        pc[L - 1][topR] = pc[oldPc][oldPr]
        pr[L - 1][topR] = pr[oldPc][oldPr]
    }
    for (let r = 0; r < v[L - 1].length; r++) v[L - 1][r]--
    const bNo = no[bCol][bRow]
    for (let r = bNo; r < v[bCol].length; r++) {
        v[L - 1].push(v[bCol][r])
        pc[L - 1].push(pc[bCol][r])
        pr[L - 1].push(pr[bCol][r])
        refC[L - 1].push(bCol)
        refR[L - 1].push(r)
        no[L - 1].push(no[bCol][r])
        id[L - 1].push(no[bCol][r])
    }

    const out = []
    const mv = v.slice(), mid = id.slice()
    const row0 = new Array(L)
    for (let c = 0; c < L; c++) row0[c] = mv[c][0]

    if (skippedTower) {
        const r0 = row0.slice()
        out.push(r0)
        if (r0.length >= maxLen || maxK === 1) return out
    }

    const totalCopies = skippedTower ? maxK - 1 : maxK
    const colCap = maxLen + 1
    for (let copyIdx = 0; copyIdx < totalCopies; copyIdx++) {
        let hitCap = false
        for (let srcCol = bCol + 1; srcCol <= L - 1; srcCol++) {
            if (row0.length >= colCap + (skippedTower ? 0 : 1)) { hitCap = true; break }
            const newColIdx = mv.length
            const srcLen = v[srcCol].length
            const colV = [], colId = [], colPC = [], colPR = []
            for (let sr = 0; sr < srcLen; sr++) {
                let curPC = pc[srcCol][sr], curPR = pr[srcCol][sr]
                if (v[srcCol][sr] <= 1 && sr > 0) {
                    let tc = refC[srcCol][sr], tr = refR[srcCol][sr]
                    while (tc >= 0 && v[tc][tr] > 1) {
                        const ntc = refC[tc][tr], ntr = refR[tc][tr]
                        tc = ntc
                        tr = ntr
                    }
                    curPC = tc
                    curPR = tr
                }
                const minRow = colV.length
                let maxRow = sr
                if (no[srcCol][sr] > 0) {
                    const rc = refC[srcCol][sr] + badLen * (copyIdx + 1)
                    const refId = id[refC[srcCol][sr]][refR[srcCol][sr]]
                    let rIdx = 0
                    const targetIds = mid[rc]
                    while (rIdx + 1 < targetIds.length && targetIds[rIdx + 1] <= refId) rIdx++
                    maxRow = rIdx + (sr - refR[srcCol][sr])
                }
                const shiftedPC = curPC >= bCol ? newColIdx + curPC - srcCol : curPC
                for (let rr = minRow; rr <= maxRow; rr++) {
                    colV.push(v[srcCol][sr])
                    colId.push(id[srcCol][sr])
                    colPC.push(shiftedPC)
                    if (shiftedPC >= 0) {
                        const pLen = mv[shiftedPC].length
                        colPR.push(rr < pLen ? rr : pLen - 1)
                    } else {
                        colPR.push(0)
                    }
                }
            }
            for (let rr = colV.length - 2; rr >= 0; rr--) {
                colV[rr] = colV[rr + 1] + mv[colPC[rr]][colPR[rr]]
            }
            mv.push(colV)
            mid.push(colId)
            row0.push(colV[0])
        }
        const res = skippedTower ? row0.slice() : row0.slice(0, row0.length - 1)
        out.push(res)
        if (hitCap || res.length >= maxLen) break
    }
    return out
}

function ordinal_walk_get_fs_batch(hiArr, effBase, maxLen) {
    const fast = ordinal_walk_fs_batch_arr(hiArr, effBase, maxLen)
    if (fast) return fast
    const s = hiArr.join(",")
    const out = []
    for (let k = 1; k <= effBase; k++) {
        const r = ordinal_walk_fs(s, k).split(",").map(Number)
        out.push(r)
        if (r.length >= maxLen) break
    }
    return out
}

//Bounded LRU cache of DP memos & full 1,1 -> 1,3 step totals per (maxTerms, base).
const ordinal_walk_engine_caches = new Map()
const ORDINAL_WALK_MAX_MEMO = 150000

function ordinal_walk_get_engine_cache(effMax, effBase) {
    const key = effMax + "|" + effBase
    let entry = ordinal_walk_engine_caches.get(key)
    if (entry) {
        ordinal_walk_engine_caches.delete(key)
        ordinal_walk_engine_caches.set(key, entry)
        return entry
    }
    if (ordinal_walk_engine_caches.size >= 4) {
        const oldest = ordinal_walk_engine_caches.keys().next().value
        ordinal_walk_engine_caches.delete(oldest)
    }
    entry = { memo: new Map(), fullWalkSteps: null, fullWalkSkipped: false }
    ordinal_walk_engine_caches.set(key, entry)
    return entry
}

//Internal chunkable FS-tree interval counter shared by both step counting and
//reverse "+N steps" descent. When `stopAt` (BigInt) is provided, aborts early
//as soon as the lower bound `runningMin >= stopAt` without corrupting `memo`.
function ordinal_walk_make_interval_counter(loArr, hiArr, inclHi, remMax, effBase, memo, stopAt = null) {
    function memoSet(k, v) {
        if (k === null) return
        if (memo.size >= ORDINAL_WALK_MAX_MEMO) return
        memo.set(k, v)
    }

    function prepare(lo, hi, incl, rem) {
        while (true) {
            if (rem <= 0) return 0n
            if (ordinal_walk_arr_cmp(lo, hi) >= 0) return 0n

            const lcp = ordinal_walk_lcp_len(lo, hi)
            if (lcp >= rem) return 0n

            //O(1) leaf count when lo and hi agree on the first rem - 1 terms:
            //every standard [prefix, k] < hi is fixed under effBase >= 2.
            if (lcp === rem - 1) {
                const loVal = lo.length > lcp ? lo[lcp] : 0
                const hiVal = hi[lcp]
                const upper = (hi.length === rem && !incl) ? hiVal - 1 : hiVal
                return upper > loVal ? BigInt(upper - loVal) : 0n
            }

            //Additive prefix invariance: entries starting at 1 have no parent
            //in the prefix, so the prefix only reduces the remaining term budget.
            let stripP = -1
            for (let p = Math.min(lcp, hi.length - 1); p >= 1; p--) {
                if (hi[p] === 1 && (lo.length === p || lo[p] === 1)) {
                    stripP = p
                    break
                }
            }
            if (stripP !== -1) {
                lo = lo.slice(stripP)
                hi = hi.slice(stripP)
                rem -= stripP
                continue
            }

            //O(1)-FS leaf shortcut at length rem - 1 when lo starts with [pre, v - 1].
            if (hi.length === rem - 1 && hi[hi.length - 1] >= 2 && lcp === rem - 2) {
                const v = hi[rem - 2]
                const loTail = lo.length >= rem - 1 ? lo[rem - 2] : 0
                if (loTail === v - 1) {
                    const batch = ordinal_walk_get_fs_batch(hi, effBase, rem)
                    const cLast = batch[batch.length - 1]
                    if (cLast.length >= rem) {
                        const loVal = lo.length >= rem ? lo[rem - 1] : 0
                        const hiVal = cLast[rem - 1]
                        const isBaseExact = (batch.length === effBase && cLast.length === rem)
                        const upper = isBaseExact ? hiVal - 1 : hiVal
                        const sub = upper > loVal ? BigInt(upper - loVal) : 0n
                        return sub + (incl ? 1n : 0n)
                    }
                }
            }

            const canMemo = hi.length < rem - 1
            const key = canMemo ? (lo.join(",") + "|" + hi.join(",") + "|" + (incl ? "1" : "0") + "|" + rem) : null
            if (key !== null) {
                const cached = memo.get(key)
                if (cached !== undefined) return cached
            }

            const pre = hi.slice(0, -1)
            if (pre.length > 0 && ordinal_walk_arr_cmp(lo, pre) < 0) {
                return {
                    key, acc: 0n, idx: 0,
                    children: [
                        [lo, pre, true, rem],
                        [pre, hi, incl, rem],
                    ],
                }
            }

            const vLast = hi[hi.length - 1]
            if (vLast <= 1) {
                const val = (incl && hi.length <= rem) ? 1n : 0n
                memoSet(key, val)
                return val
            }

            const stepDown = pre.concat([vLast - 1])
            if (ordinal_walk_arr_cmp(lo, stepDown) < 0) {
                return {
                    key, acc: 0n, idx: 0,
                    children: [
                        [lo, stepDown, true, rem],
                        [stepDown, hi, incl, rem],
                    ],
                }
            }

            const batch = ordinal_walk_get_fs_batch(hi, effBase, rem)
            const children = []
            let prevChild = pre
            for (let i = 0; i < batch.length; i++) {
                const childArr = batch[i]
                const k = i + 1
                if (ordinal_walk_arr_cmp(lo, childArr) < 0) {
                    const subLo = ordinal_walk_arr_cmp(lo, prevChild) > 0 ? lo : prevChild
                    children.push([subLo, childArr, k < effBase, rem])
                }
                prevChild = childArr
            }
            const baseAcc = (incl && hi.length <= rem) ? 1n : 0n
            if (children.length === 0) {
                memoSet(key, baseAcc)
                return baseAcc
            }
            return { key, acc: baseAcc, idx: 0, children }
        }
    }

    const stack = []
    let finalVal = null
    let exceeded = false
    let runningMin = 0n
    const init = prepare(loArr, hiArr, inclHi, remMax)
    if (typeof init === "bigint") {
        finalVal = init
        if (stopAt !== null && init >= stopAt) exceeded = true
    } else {
        runningMin = init.acc
        if (stopAt !== null && runningMin >= stopAt) {
            exceeded = true
            finalVal = runningMin
        } else {
            stack.push(init)
        }
    }

    return {
        step(budget = Infinity) {
            let used = 0
            while (stack.length > 0 && used < budget) {
                used++
                const top = stack[stack.length - 1]
                if (top.idx >= top.children.length) {
                    memoSet(top.key, top.acc)
                    stack.pop()
                    if (stack.length > 0) {
                        stack[stack.length - 1].acc += top.acc
                    } else {
                        finalVal = top.acc
                        if (stopAt !== null && finalVal >= stopAt) exceeded = true
                    }
                    continue
                }
                const ch = top.children[top.idx++]
                const res = prepare(ch[0], ch[1], ch[2], ch[3])
                if (typeof res === "bigint") {
                    top.acc += res
                    runningMin += res
                    if (stopAt !== null && runningMin >= stopAt) {
                        exceeded = true
                        stack.length = 0
                        return { done: true, exceeded: true, val: runningMin, used }
                    }
                } else {
                    runningMin += res.acc
                    if (stopAt !== null && runningMin >= stopAt) {
                        exceeded = true
                        stack.length = 0
                        return { done: true, exceeded: true, val: runningMin, used }
                    }
                    stack.push(res)
                }
            }
            if (stack.length === 0) {
                return { done: true, exceeded, val: finalVal, used }
            }
            return { done: false, exceeded: false, val: null, used }
        },
    }
}

//Create an incremental, exact BigInt step counter for the +1 walk from `start`
//to `target` under `maxTerms` and `base`. Because `maximizeordinal` is
//order-preserving, every +1 step moves to the exact next valid fixed point in
//ordinal order, so the step count equals the number of valid fixed points X in
//(start, maximizeordinal(target, base, maxTerms)] with length <= maxTerms.
function ordinal_walk_create_counter(start, target, maxTerms = ordinal_walk_limit(), base = ordinal_walk_base_limit(), sharedMemo = null) {
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
    const cmpST = ordinal_walk_arr_cmp(parsedStart.arr, parsedTarget.arr)
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
    const memo = sharedMemo || new Map()
    const sub = ordinal_walk_make_interval_counter(startArr, targetArr, true, effMax, effBase, memo, null)
    let work = 0

    return {
        step(budget = Infinity) {
            const tick = sub.step(budget)
            work += tick.used
            if (tick.done) {
                return {
                    done: true,
                    result: {
                        status: "ok",
                        steps: tick.val,
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

//Create an incremental, exact "+N steps" advancer: starting from `start`, find
//the exact sequence reached after `steps` presses of `+1` under `maxTerms` and
//`base` (without walking step-by-step). Uses left-to-right FS-tree descent with
//`runningMin >= remK` early pruning so small/medium N finish in milliseconds
//even when the full 1,1 -> 1,3 walk has astronomically many steps.
function ordinal_walk_create_advancer(start, steps, maxTerms = ordinal_walk_limit(), base = ordinal_walk_base_limit(), sharedMemo = null) {
    const parsedStart = ordinal_walk_parse_sequence(start)
    if (!parsedStart.ok) {
        return {
            step() {
                return { done: true, result: { status: "invalid_start", reason: parsedStart.reason }, work: 0 }
            },
        }
    }
    const parsedSteps = ordinal_walk_parse_steps(steps)
    if (!parsedSteps.ok) {
        return {
            step() {
                return { done: true, result: { status: "invalid_steps", reason: parsedSteps.reason }, work: 0 }
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
    const targetSteps = parsedSteps.steps
    if (targetSteps === 0n) {
        return {
            step() {
                return {
                    done: true,
                    result: {
                        status: "ok",
                        start: startStr,
                        result: startStr,
                        steps: 0n,
                        maxTerms: effMax,
                        base: effBase,
                    },
                    work: 0,
                }
            },
        }
    }

    const memo = sharedMemo || new Map()
    let totalWork = 0
    let prefix = []
    let loArr = parsedStart.arr
    let hiArr = ORDINAL_WALK_CAP.slice()
    let inclHi = true
    let remMax = effMax
    let remK = targetSteps
    let consumed = 0n
    let pendingChildren = null
    let pendingIdx = 0
    let pendingHasSelf = false
    let activeSub = null
    let doneResult = null

    function finishOk(seqArr) {
        doneResult = {
            status: "ok",
            start: startStr,
            result: seqArr.join(","),
            steps: targetSteps,
            maxTerms: effMax,
            base: effBase,
        }
    }

    function finishCap(stepsToCap) {
        doneResult = {
            status: "exceeds_cap",
            start: startStr,
            result: "1,3",
            steps: targetSteps,
            stepsToCap,
            maxTerms: effMax,
            base: effBase,
        }
    }

    function advanceDescent() {
        while (true) {
            if (remMax <= 0 || ordinal_walk_arr_cmp(loArr, hiArr) >= 0) {
                finishCap(consumed)
                return
            }
            const lcp = ordinal_walk_lcp_len(loArr, hiArr)
            if (lcp >= remMax) {
                finishCap(consumed)
                return
            }
            if (lcp === remMax - 1) {
                const loVal = loArr.length > lcp ? loArr[lcp] : 0
                const hiVal = hiArr[lcp]
                const upper = (hiArr.length === remMax && !inclHi) ? hiVal - 1 : hiVal
                const cnt = upper > loVal ? BigInt(upper - loVal) : 0n
                if (remK <= cnt) {
                    finishOk(prefix.concat(hiArr.slice(0, lcp), [loVal + Number(remK)]))
                } else {
                    finishCap(consumed + cnt)
                }
                return
            }
            let stripP = -1
            for (let p = Math.min(lcp, hiArr.length - 1); p >= 1; p--) {
                if (hiArr[p] === 1 && (loArr.length === p || loArr[p] === 1)) {
                    stripP = p
                    break
                }
            }
            if (stripP !== -1) {
                prefix = prefix.concat(hiArr.slice(0, stripP))
                loArr = loArr.slice(stripP)
                hiArr = hiArr.slice(stripP)
                remMax -= stripP
                continue
            }
            if (hiArr.length === remMax - 1 && hiArr[hiArr.length - 1] >= 2 && lcp === remMax - 2) {
                const v = hiArr[remMax - 2]
                const loTail = loArr.length >= remMax - 1 ? loArr[remMax - 2] : 0
                if (loTail === v - 1) {
                    const batch = ordinal_walk_get_fs_batch(hiArr, effBase, remMax)
                    const cLast = batch[batch.length - 1]
                    if (cLast.length >= remMax) {
                        const loVal = loArr.length >= remMax ? loArr[remMax - 1] : 0
                        const hiVal = cLast[remMax - 1]
                        const isBaseExact = (batch.length === effBase && cLast.length === remMax)
                        const upper = isBaseExact ? hiVal - 1 : hiVal
                        const sub = upper > loVal ? BigInt(upper - loVal) : 0n
                        const totalHere = sub + (inclHi ? 1n : 0n)
                        if (remK <= sub) {
                            finishOk(prefix.concat(hiArr.slice(0, remMax - 2), [v - 1, loVal + Number(remK)]))
                        } else if (remK <= totalHere) {
                            finishOk(prefix.concat(hiArr))
                        } else {
                            finishCap(consumed + totalHere)
                        }
                        return
                    }
                }
            }

            const pre = hiArr.slice(0, -1)
            if (pre.length > 0 && ordinal_walk_arr_cmp(loArr, pre) < 0) {
                pendingChildren = [[loArr, pre, true, remMax], [pre, hiArr, inclHi, remMax]]
                pendingIdx = 0
                pendingHasSelf = false
                activeSub = ordinal_walk_make_interval_counter(loArr, pre, true, remMax, effBase, memo, remK)
                return
            }
            const vLast = hiArr[hiArr.length - 1]
            if (vLast <= 1) {
                const cnt = (inclHi && hiArr.length <= remMax) ? 1n : 0n
                if (remK <= cnt) finishOk(prefix.concat(hiArr))
                else finishCap(consumed + cnt)
                return
            }
            const stepDown = pre.concat([vLast - 1])
            if (ordinal_walk_arr_cmp(loArr, stepDown) < 0) {
                pendingChildren = [[loArr, stepDown, true, remMax], [stepDown, hiArr, inclHi, remMax]]
                pendingIdx = 0
                pendingHasSelf = false
                activeSub = ordinal_walk_make_interval_counter(loArr, stepDown, true, remMax, effBase, memo, remK)
                return
            }
            const batch = ordinal_walk_get_fs_batch(hiArr, effBase, remMax)
            const children = []
            let prevChild = pre
            for (let i = 0; i < batch.length; i++) {
                const childArr = batch[i]
                const k = i + 1
                if (ordinal_walk_arr_cmp(loArr, childArr) < 0) {
                    const subLo = ordinal_walk_arr_cmp(loArr, prevChild) > 0 ? loArr : prevChild
                    children.push([subLo, childArr, k < effBase, remMax])
                }
                prevChild = childArr
            }
            pendingHasSelf = (inclHi && hiArr.length <= remMax)
            if (children.length === 0) {
                if (pendingHasSelf && remK === 1n) finishOk(prefix.concat(hiArr))
                else finishCap(consumed + (pendingHasSelf ? 1n : 0n))
                return
            }
            pendingChildren = children
            pendingIdx = 0
            const c0 = children[0]
            activeSub = ordinal_walk_make_interval_counter(c0[0], c0[1], c0[2], c0[3], effBase, memo, remK)
            return
        }
    }

    return {
        step(budget = Infinity) {
            let remBudget = budget
            while (doneResult === null && remBudget > 0) {
                if (!activeSub) {
                    advanceDescent()
                    if (doneResult !== null) break
                }
                const tick = activeSub.step(remBudget)
                totalWork += tick.used
                remBudget -= Math.max(1, tick.used)
                if (!tick.done) break

                const ch = pendingChildren[pendingIdx]
                if (tick.exceeded || remK <= tick.val) {
                    loArr = ch[0]
                    hiArr = ch[1]
                    inclHi = ch[2]
                    remMax = ch[3]
                    pendingChildren = null
                    activeSub = null
                } else {
                    remK -= tick.val
                    consumed += tick.val
                    pendingIdx++
                    if (pendingIdx < pendingChildren.length) {
                        const nxt = pendingChildren[pendingIdx]
                        if (!pendingHasSelf && pendingIdx === pendingChildren.length - 1) {
                            loArr = nxt[0]
                            hiArr = nxt[1]
                            inclHi = nxt[2]
                            remMax = nxt[3]
                            pendingChildren = null
                            activeSub = null
                        } else {
                            activeSub = ordinal_walk_make_interval_counter(nxt[0], nxt[1], nxt[2], nxt[3], effBase, memo, remK)
                        }
                    } else {
                        if (pendingHasSelf && remK === 1n) finishOk(prefix.concat(hiArr))
                        else finishCap(consumed + (pendingHasSelf ? 1n : 0n))
                    }
                }
            }
            return doneResult !== null
                ? { done: true, result: doneResult, work: totalWork }
                : { done: false, result: null, work: totalWork }
        },
    }
}

//Synchronous helper returning the exact "+N steps" result object.
function ordinal_walk_advance_steps(start, steps, maxTerms = ordinal_walk_limit(), base = ordinal_walk_base_limit(), maxWork = 0) {
    const advancer = ordinal_walk_create_advancer(start, steps, maxTerms, base)
    const tick = advancer.step(maxWork > 0 ? maxWork : Infinity)
    if (!tick.done) {
        return { status: "limit_exceeded", work: tick.work }
    }
    return tick.result
}

//Pure, side-effect-free LNGI numeric value in [2, 4] for a standard ω-Y
//sequence <= 1,3 (matches search_time() without mutating Analyzer DOM).
function ordinal_walk_lngi_value(seqOrArr) {
    const l = Array.isArray(seqOrArr) ? seqOrArr : String(seqOrArr).split(",").map(Number)
    if (l.length < 2) return 2
    let r = l[1] + 1
    if (l.length === 2) return Math.max(2, Math.min(4, r))
    let seq = `1,${l[1] + 1}`
    let i = 1
    let check = 2
    let safe = 1
    while (i > 1e-14) {
        const aseq = seq
        const expanded = Y_Sequence.fs(seq, safe + 1).split(",").slice(0, check + safe)
        const d = Number(expanded[expanded.length - 1]) - l[check + safe - 1]
        if (d < 0) return null
        i = i / (2 ** (d + 1))
        r += i
        if (d !== 0) {
            expanded[check + safe - 1] = l[check + safe - 1] + 1
            seq = expanded.join(",")
            check += safe
            safe = 1
        } else {
            seq = aseq
            safe++
        }
        if (l.length === check + safe - 1) break
    }
    return Math.max(2, Math.min(4, r))
}

function ordinal_walk_lngi_percent(seqOrArr) {
    const val = ordinal_walk_lngi_value(seqOrArr)
    if (val === null || !isFinite(val)) return null
    return Math.max(0, Math.min(100, (val - 2) * 50))
}

function ordinal_compare_format_pct(pct) {
    if (pct === null || !isFinite(pct)) return ""
    if (pct === 0) return "0%"
    if (pct === 100) return "100%"
    if (pct < 0.01) return pct.toFixed(4) + "%"
    return pct.toFixed(2) + "%"
}

//Safely convert a validated ω-Y sequence to ordinal notation HTML (EcOCF when
//supported, falling back to BMS for 4+-row sequences and Lim(BMS) for 1,3).
function ordinal_compare_notation_html(seq) {
    if (seq === "1,3") return `Lim(BMS) <small>(Small Hydra Ordinal)</small>`
    if (typeof convert_From_wY === "function") {
        try {
            const ec = String(convert_From_wY(seq, "EcOCF"))
            if (ec && ec !== seq && ec !== "c") return ec
        } catch (e) {}
        try {
            const bms = String(convert_From_wY(seq, "BMS"))
            if (bms && bms !== seq) return ordinal_compare_escape(bms)
        } catch (e) {}
    }
    return ""
}

let ordinal_compare_mode = "count"
let ordinal_compare_job_id = 0
let ordinal_compare_timer = null
let ordinal_compare_share_timer = null

function ordinal_compare_set_running(running) {
    const cancelBtn = document.getElementById("compare_cancel")
    if (cancelBtn) cancelBtn.hidden = !running
}

function ordinal_compare_set_mode(mode, save = true) {
    const nextMode = mode === "advance" ? "advance" : "count"
    ordinal_compare_mode = nextMode
    const countBtn = document.getElementById("compare_mode_count")
    const advBtn = document.getElementById("compare_mode_advance")
    const targetGroup = document.getElementById("compare_target_group")
    const stepsGroup = document.getElementById("compare_steps_group")
    const runBtn = document.getElementById("compare_run")
    if (countBtn && countBtn.classList) countBtn.classList.toggle("active", nextMode === "count")
    if (advBtn && advBtn.classList) advBtn.classList.toggle("active", nextMode === "advance")
    if (targetGroup) targetGroup.hidden = nextMode !== "count"
    if (stepsGroup) stepsGroup.hidden = nextMode !== "advance"
    if (runBtn) runBtn.textContent = nextMode === "advance" ? "Step Forward" : "Compare"
    ordinal_compare_cancel(false)
    ordinal_compare_update_previews()
    if (save && typeof saveAllSettings === "function") saveAllSettings()
}

function ordinal_compare_preview_one(inputId, previewId) {
    const inputEl = document.getElementById(inputId)
    const previewEl = document.getElementById(previewId)
    if (!inputEl || !previewEl) return
    const raw = String(inputEl.value ?? "").trim()
    if (!raw) {
        previewEl.innerHTML = ""
        return
    }
    const parsed = ordinal_walk_parse_sequence(raw)
    if (!parsed.ok) {
        let msg = "Invalid sequence"
        if (parsed.reason === "above_cap") msg = "Exceeds walk limit 1,3"
        else if (parsed.reason === "non_standard") msg = "Not a standard ω-Y sequence"
        previewEl.innerHTML = `<span class="compare-preview-invalid">${ordinal_compare_escape(msg)}</span>`
        return
    }
    const notation = ordinal_compare_notation_html(parsed.seq)
    const pct = ordinal_walk_lngi_percent(parsed.arr)
    const parts = []
    if (notation) parts.push(`<span class="compare-result-notation">${notation}</span>`)
    if (pct !== null) parts.push(`<span class="compare-result-pct">(${ordinal_compare_format_pct(pct)} to 1,3)</span>`)
    previewEl.innerHTML = parts.join(" ")
}

function ordinal_compare_update_previews() {
    ordinal_compare_preview_one("compare_start", "compare_start_preview")
    ordinal_compare_preview_one("compare_target", "compare_target_preview")
}

function ordinal_compare_swap() {
    const startEl = document.getElementById("compare_start")
    const targetEl = document.getElementById("compare_target")
    if (!startEl || !targetEl) return
    const tmp = startEl.value
    startEl.value = targetEl.value
    targetEl.value = tmp
    ordinal_compare_cancel(false)
    ordinal_compare_update_previews()
    if (typeof saveAllSettings === "function") saveAllSettings()
}

function ordinal_compare_use_analyzer(which) {
    const targetId = which === "target" ? "compare_target" : "compare_start"
    const destEl = document.getElementById(targetId)
    if (!destEl) return
    const searchEl = document.getElementById("search_input")
    const seq = (typeof searched_ordinal === "string" && searched_ordinal)
        ? searched_ordinal
        : (searchEl && String(searchEl.value ?? "").trim() ? String(searchEl.value).trim() : "1,1")
    destEl.value = seq
    ordinal_compare_cancel(false)
    ordinal_compare_update_previews()
    if (typeof saveAllSettings === "function") saveAllSettings()
}

function ordinal_compare_sync_analyzer() {
    const maxDest = document.getElementById("compare_max_terms")
    const baseDest = document.getElementById("compare_base")
    if (maxDest) maxDest.value = String(ordinal_walk_limit())
    if (baseDest) baseDest.value = String(ordinal_walk_base_limit())
    ordinal_compare_cancel(false)
    if (typeof saveAllSettings === "function") saveAllSettings()
}

function ordinal_compare_open_in_analyzer(seq) {
    const parsed = ordinal_walk_parse_sequence(seq)
    if (!parsed.ok) return
    const input = document.getElementById("search_input")
    if (input) input.value = parsed.seq
    ordinal_walk_restart = false
    clicks = 0
    ordinal_walk_show_clicks()
    ordinal_walk_save()
    if (typeof search_time === "function") search_time()
    if (typeof update_page === "function") {
        page = 2
        update_page()
    }
}

function ordinal_compare_seq_row_html(label, seq, pct) {
    const notation = ordinal_compare_notation_html(seq)
    const pctStr = pct !== null ? ` <span class="compare-result-pct">(${ordinal_compare_format_pct(pct)} to 1,3)</span>` : ""
    const notationStr = notation ? ` <span class="compare-result-notation">= ${notation}</span>` : ""
    return `<div class="compare-result-row"><span class="compare-result-row-label">${ordinal_compare_escape(label)}:</span><span class="compare-result-seq">${ordinal_compare_escape(seq)}</span>${notationStr}${pctStr}</div>`
}

function ordinal_compare_progress_bar_html(startPct, endPct, shareText) {
    const left = startPct !== null ? Math.max(0, Math.min(100, startPct)) : 0
    const right = endPct !== null ? Math.max(left, Math.min(100, endPct)) : left
    const width = Math.max(0, right - left)
    const delta = endPct !== null && startPct !== null ? Math.max(0, endPct - startPct) : null
    const lngiLabel = (startPct !== null && endPct !== null)
        ? `Ordinal progress (1,1 → 1,3): ${ordinal_compare_format_pct(startPct)} → ${ordinal_compare_format_pct(endPct)} (+${ordinal_compare_format_pct(delta)})`
        : ""
    return (
        `<div class="compare-progress-wrap">` +
        `<div class="compare-progress-track">` +
        `<div class="compare-progress-base" style="width: ${left.toFixed(4)}%;"></div>` +
        `<div class="compare-progress-span" style="left: ${left.toFixed(4)}%; width: ${width.toFixed(4)}%;"></div>` +
        `</div>` +
        `<div class="compare-progress-labels">` +
        `<span>${ordinal_compare_escape(lngiLabel)}</span>` +
        `<span id="compare_share_slot">${shareText ? ordinal_compare_escape(shareText) : ""}</span>` +
        `</div>` +
        `</div>`
    )
}

function ordinal_compare_share_text(steps, fullWalkSteps, prefixLabel = "Walk share") {
    if (fullWalkSteps === null || fullWalkSteps === undefined) return ""
    const pct = ordinal_compare_format_ratio_pct(steps, fullWalkSteps)
    return `${prefixLabel}: ${pct} of ${ordinal_compare_format_bigint(fullWalkSteps)} total steps (1,1 → 1,3)`
}

function ordinal_compare_render_validation_error(res) {
    const resultEl = document.getElementById("compare_result")
    if (!resultEl) return false

    if (res.status === "invalid_start" || res.status === "invalid_target") {
        const label = res.status === "invalid_start" ? "Start" : "Target"
        let msg
        if (res.reason === "empty") msg = `Please enter a ${label.toLowerCase()} ω-Y sequence (for example, 1,1).`
        else if (res.reason === "above_cap") msg = `${label} sequence exceeds the walk limit 1,3.`
        else if (res.reason === "non_standard") msg = `${label} sequence is not a standard ω-Y sequence.`
        else msg = `${label} sequence must be comma-separated positive integers with at least 2 terms (for example, 1,2).`
        resultEl.innerHTML = `<div class="compare-result-error">${ordinal_compare_escape(msg)}</div>`
        return true
    }
    if (res.status === "invalid_steps") {
        const msg = res.reason === "empty"
            ? "Please enter the number of +1 steps (a non-negative integer, for example 100)."
            : "Steps must be a non-negative whole number (for example, 100 or 1,000,000)."
        resultEl.innerHTML = `<div class="compare-result-error">${ordinal_compare_escape(msg)}</div>`
        return true
    }
    if (res.status === "invalid_max_terms") {
        resultEl.innerHTML = `<div class="compare-result-error">Maximum terms must be an integer of at least 2.</div>`
        return true
    }
    if (res.status === "invalid_base") {
        resultEl.innerHTML = `<div class="compare-result-error">Base must be an integer of at least 2.</div>`
        return true
    }
    return false
}

function ordinal_compare_render_result(res, fullWalkSteps = null) {
    const resultEl = document.getElementById("compare_result")
    if (!resultEl) return
    if (ordinal_compare_render_validation_error(res)) return

    if (res.status === "same") {
        const pct = ordinal_walk_lngi_percent(res.start)
        resultEl.innerHTML =
            `<div class="compare-result-steps">0 steps</div>` +
            `<div class="compare-result-meta">Start and target are the same sequence (${ordinal_compare_escape(res.start)}).</div>` +
            `<div class="compare-result-grid">${ordinal_compare_seq_row_html("Sequence", res.start, pct)}</div>`
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
        const startPct = ordinal_walk_lngi_percent(res.start)
        const targetPct = ordinal_walk_lngi_percent(res.target)
        const landedPct = res.skippedTarget ? ordinal_walk_lngi_percent(res.effectiveTarget) : targetPct
        const shareText = ordinal_compare_share_text(res.steps, fullWalkSteps)
        let rowsHtml =
            ordinal_compare_seq_row_html("Start", res.start, startPct) +
            ordinal_compare_seq_row_html("Target", res.target, targetPct)
        if (res.skippedTarget) {
            rowsHtml += ordinal_compare_seq_row_html("Lands on", res.effectiveTarget, landedPct)
        }
        let html =
            `<div class="compare-result-header">` +
            `<div class="compare-result-steps">${stepsFmt} ${unit}</div>` +
            `<div class="compare-result-meta">Maximum terms: ${res.maxTerms}, Base: ${res.base}</div>` +
            `</div>` +
            `<div class="compare-result-grid">${rowsHtml}</div>` +
            ordinal_compare_progress_bar_html(startPct, landedPct, shareText)
        if (res.skippedTarget) {
            html += `<div class="compare-result-note">Note: ${ordinal_compare_escape(res.target)} is skipped under Maximum terms ${res.maxTerms}, Base ${res.base} (auto-maximizes to ${ordinal_compare_escape(res.effectiveTarget)}). This is the number of steps to reach &ge; ${ordinal_compare_escape(res.target)} (landing on ${ordinal_compare_escape(res.effectiveTarget)}).</div>`
        }
        html +=
            `<div class="compare-result-actions">` +
            `<button type="button" class="compare-helper-btn" onclick="ordinal_compare_open_in_analyzer('${res.effectiveTarget}')">Open ${ordinal_compare_escape(res.effectiveTarget)} in Analyzer</button>` +
            `</div>`
        resultEl.innerHTML = html
    }
}

function ordinal_compare_render_advance_result(res, fullWalkSteps = null) {
    const resultEl = document.getElementById("compare_result")
    if (!resultEl) return
    if (ordinal_compare_render_validation_error(res)) return

    const startPct = ordinal_walk_lngi_percent(res.start)
    const endPct = ordinal_walk_lngi_percent(res.result)

    if (res.status === "ok") {
        const stepsFmt = ordinal_compare_format_bigint(res.steps)
        const unit = res.steps === 1n ? "step" : "steps"
        const sharePrefix = res.start === "1,1" ? "Position on 1,1 → 1,3" : "Step span"
        const shareText = res.steps > 0n ? ordinal_compare_share_text(res.steps, fullWalkSteps, sharePrefix) : ""
        const html =
            `<div class="compare-result-header">` +
            `<div class="compare-result-steps">${ordinal_compare_escape(res.result)}</div>` +
            `<div class="compare-result-meta">After +${stepsFmt} ${unit} (Maximum terms: ${res.maxTerms}, Base: ${res.base})</div>` +
            `</div>` +
            `<div class="compare-result-grid">` +
            ordinal_compare_seq_row_html("Start", res.start, startPct) +
            ordinal_compare_seq_row_html("Result", res.result, endPct) +
            `</div>` +
            ordinal_compare_progress_bar_html(startPct, endPct, shareText) +
            `<div class="compare-result-actions">` +
            `<button type="button" class="compare-helper-btn" onclick="ordinal_compare_open_in_analyzer('${res.result}')">Open ${ordinal_compare_escape(res.result)} in Analyzer</button>` +
            `</div>`
        resultEl.innerHTML = html
        return
    }

    if (res.status === "exceeds_cap") {
        const capFmt = ordinal_compare_format_bigint(res.stepsToCap)
        const reqFmt = ordinal_compare_format_bigint(res.steps)
        const overFmt = ordinal_compare_format_bigint(res.steps - res.stepsToCap)
        const unit = res.stepsToCap === 1n ? "step" : "steps"
        const shareText = res.stepsToCap > 0n ? ordinal_compare_share_text(res.stepsToCap, fullWalkSteps) : ""
        const html =
            `<div class="compare-result-header">` +
            `<div class="compare-result-steps">1,3 (walk limit reached)</div>` +
            `<div class="compare-result-meta">Maximum terms: ${res.maxTerms}, Base: ${res.base}</div>` +
            `</div>` +
            `<div class="compare-result-grid">` +
            ordinal_compare_seq_row_html("Start", res.start, startPct) +
            ordinal_compare_seq_row_html("Cap", "1,3", 100) +
            `</div>` +
            ordinal_compare_progress_bar_html(startPct, 100, shareText) +
            `<div class="compare-result-note">Walk reaches the limit 1,3 after ${capFmt} ${unit} (+${reqFmt} requested exceeds 1,3 by ${overFmt} ${res.steps - res.stepsToCap === 1n ? "step" : "steps"}).</div>` +
            `<div class="compare-result-actions">` +
            `<button type="button" class="compare-helper-btn" onclick="ordinal_compare_open_in_analyzer('1,3')">Open 1,3 in Analyzer</button>` +
            `</div>`
        resultEl.innerHTML = html
    }
}

//Non-blocking background computation of the full 1,1 -> 1,3 step count so the
//result can show exact walk share without slowing down the main answer.
function ordinal_compare_fill_full_share(res, mode, jobId) {
    if (!res || (res.status !== "ok" && res.status !== "exceeds_cap")) return
    const cache = ordinal_walk_get_engine_cache(res.maxTerms, res.base)
    const stepsNum = res.status === "exceeds_cap" ? res.stepsToCap : res.steps
    const prefixLabel = (mode === "advance" && res.status === "ok" && res.start === "1,1")
        ? "Position on 1,1 → 1,3"
        : (mode === "advance" ? "Step span" : "Walk share")

    //If the query itself already computed 1,1 -> 1,3, record it directly.
    if (res.start === "1,1" && (res.effectiveTarget === "1,3" || res.result === "1,3")) {
        cache.fullWalkSteps = stepsNum
        const slot = document.getElementById("compare_share_slot")
        if (slot && stepsNum > 0n) slot.textContent = ordinal_compare_share_text(stepsNum, cache.fullWalkSteps, prefixLabel)
        return
    }
    if (stepsNum === 0n) return

    if (cache.fullWalkSteps !== null) {
        const slot = document.getElementById("compare_share_slot")
        if (slot) slot.textContent = ordinal_compare_share_text(stepsNum, cache.fullWalkSteps, prefixLabel)
        return
    }
    if (cache.fullWalkSkipped) return

    const fullCounter = ordinal_walk_create_counter("1,1", "1,3", res.maxTerms, res.base, cache.memo)
    const AUTO_SHARE_BUDGET = 250000
    const first = fullCounter.step(2000)
    if (first.done && first.result && first.result.status === "ok") {
        cache.fullWalkSteps = first.result.steps
        const slot = document.getElementById("compare_share_slot")
        if (slot) slot.textContent = ordinal_compare_share_text(stepsNum, cache.fullWalkSteps, prefixLabel)
        return
    }
    if (typeof setTimeout !== "function") return

    const initSlot = document.getElementById("compare_share_slot")
    if (initSlot) initSlot.textContent = `${prefixLabel}: calculating...`

    function pumpShare() {
        if (jobId !== ordinal_compare_job_id) return
        const tick = fullCounter.step(8000)
        if (tick.done && tick.result && tick.result.status === "ok") {
            ordinal_compare_share_timer = null
            cache.fullWalkSteps = tick.result.steps
            const slot = document.getElementById("compare_share_slot")
            if (slot) slot.textContent = ordinal_compare_share_text(stepsNum, cache.fullWalkSteps, prefixLabel)
            return
        }
        if (tick.work >= AUTO_SHARE_BUDGET) {
            ordinal_compare_share_timer = null
            cache.fullWalkSkipped = true
            const slot = document.getElementById("compare_share_slot")
            if (slot) slot.textContent = ""
            return
        }
        ordinal_compare_share_timer = setTimeout(pumpShare, 0)
    }

    ordinal_compare_share_timer = setTimeout(pumpShare, 0)
}

function ordinal_compare_cancel(showMessage = true) {
    ordinal_compare_job_id++
    if (ordinal_compare_timer !== null && typeof clearTimeout === "function") {
        clearTimeout(ordinal_compare_timer)
        ordinal_compare_timer = null
    }
    if (ordinal_compare_share_timer !== null && typeof clearTimeout === "function") {
        clearTimeout(ordinal_compare_share_timer)
        ordinal_compare_share_timer = null
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
    const mode = ordinal_compare_mode

    const startEl = document.getElementById("compare_start")
    const targetEl = document.getElementById("compare_target")
    const stepsEl = document.getElementById("compare_steps")
    const maxEl = document.getElementById("compare_max_terms")
    const baseEl = document.getElementById("compare_base")
    const resultEl = document.getElementById("compare_result")

    const startVal = startEl ? startEl.value : ""
    const targetVal = targetEl ? targetEl.value : ""
    const stepsVal = stepsEl ? stepsEl.value : ""
    const maxVal = maxEl ? maxEl.value : ""
    const baseVal = baseEl ? baseEl.value : ""

    const effMax = Math.floor(Number(maxVal))
    const effBase = Math.floor(Number(baseVal))
    const cache = (isFinite(effMax) && effMax >= 2 && isFinite(effBase) && effBase >= 2)
        ? ordinal_walk_get_engine_cache(effMax, effBase)
        : null
    const sharedMemo = cache ? cache.memo : null

    const worker = mode === "advance"
        ? ordinal_walk_create_advancer(startVal, stepsVal, maxVal, baseVal, sharedMemo)
        : ordinal_walk_create_counter(startVal, targetVal, maxVal, baseVal, sharedMemo)

    function finish(res) {
        const fullSteps = cache ? cache.fullWalkSteps : null
        if (mode === "advance") {
            ordinal_compare_render_advance_result(res, fullSteps)
        } else {
            ordinal_compare_render_result(res, fullSteps)
        }
        ordinal_compare_fill_full_share(res, mode, jobId)
    }

    const first = worker.step(2500)
    if (first.done) {
        finish(first.result)
        return first.result
    }

    if (typeof setTimeout !== "function") {
        const rest = worker.step(Infinity)
        finish(rest.result)
        return rest.result
    }

    const startedAt = Date.now()
    ordinal_compare_set_running(true)

    function renderProgress(work) {
        if (!resultEl) return
        const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1)
        const workFmt = ordinal_compare_format_bigint(work)
        const desc = mode === "advance"
            ? `Advancing +${ordinal_compare_escape(String(stepsVal).trim())} steps from ${ordinal_compare_escape(String(startVal).trim())}...`
            : `Calculating steps from ${ordinal_compare_escape(String(startVal).trim())} to ${ordinal_compare_escape(String(targetVal).trim())}...`
        resultEl.innerHTML = `<div class="compare-result-meta">${desc} (${workFmt} subproblems, ${elapsed}s)</div>`
    }

    renderProgress(first.work)

    function pump() {
        if (jobId !== ordinal_compare_job_id) return
        const tick = worker.step(8000)
        if (tick.done) {
            ordinal_compare_timer = null
            ordinal_compare_set_running(false)
            finish(tick.result)
            return
        }
        renderProgress(tick.work)
        ordinal_compare_timer = setTimeout(pump, 0)
    }

    ordinal_compare_timer = setTimeout(pump, 0)
    return null
}

for (const compareInputId of ["compare_start", "compare_target", "compare_steps", "compare_max_terms", "compare_base"]) {
    const el = document.getElementById(compareInputId)
    if (!el) continue
    el.addEventListener("keydown", e => {
        if (e && e.key === "Enter") ordinal_compare_run()
    })
    el.addEventListener("input", () => {
        if (ordinal_compare_timer !== null || ordinal_compare_share_timer !== null) {
            ordinal_compare_cancel(false)
        }
        if (compareInputId === "compare_start" || compareInputId === "compare_target") {
            ordinal_compare_update_previews()
        }
    })
}

window.addEventListener("DOMContentLoaded", () => {
    ordinal_compare_update_previews()
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