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
    const now = new Date();

    
    mile_date.valueAsDate = now;

    
    mile_month.value =
        `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    
    mile_year.value = now.getFullYear();

    
    updateDay();
    updateMonth();
    updateYear();
}

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





function search_time(x = document.getElementById("search_input").value) {
    var t = x
    var r = ""
    if (t[0] != 1) {
        r = "Please insert valid ordinal starting with 1!"
        document.getElementById("search_result").innerHTML = r
        return
    }
    else {
        var l = t.split(",")
        var seq = `1,${Number(l[1]) + 1}`
        var r = Number(l[1])+1
        var i = 1

        if (l.length == 1) {
            document.getElementById("search_result").innerHTML = `This lngi starts at 1,1 :3`
            return [0,0]
        }

        if (l.length == 2) {
            document.getElementById("search_result").innerHTML = `Achievement day:<br>${new Date(get_time_inv(r) + st).toLocaleString()}`
            return [r,1]
        }

        if (Math.min(...l)<=0) {
            document.getElementById("search_result").innerHTML = `Don't put zero or negative values in!`
            return [0, 0]
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
                document.getElementById("search_result").innerHTML = `Not standard.`
                return [0,0]
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
        document.getElementById("search_result").innerHTML = `Achievement day:<br>${new Date(t).toLocaleString()} <small><i>${(t%1000).toFixed(3)}ms</i></small>`
        return [r,-Math.log2(i)]
    }
}

function specific_time() {
    var n = search_time(document.getElementById('sex').value)[0]
    virtualElapsed = (Date.now() - st) / 1;
    if (n != 0) timeOffset = -(Date.now() - st) + get_time_inv(n)
}