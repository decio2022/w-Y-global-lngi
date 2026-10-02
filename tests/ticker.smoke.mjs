/*
Smoke test for the ω-Y LNGI page scripts, focused on ticker.js.

Loads main.html in jsdom, evaluates every classic script in the same order the
page does (proxy.js is skipped: it is a Firebase ES module), then exercises the
ticker: rendering, milestone headlines, rewind pruning, click-to-tab, settings.
*/
import { JSDOM } from "jsdom";
import fs from "node:fs";

// tests/ sits next to the page files
const ROOT = new URL("..", import.meta.url).pathname.replace(/\/$/, "");
const rawHtml = fs.readFileSync(`${ROOT}/main.html`, "utf8");
// Strip every <script> tag: the app's scripts are injected by hand below so
// that proxy.js (a Firebase ES module) is skipped and nothing is fetched.
const html = rawHtml.replace(/<script[\s\S]*?<\/script>/gi, "");
const scriptsInOrder = [
    "ui.js", "highest.js", "conv.js", "search.js",
    "lngi.js", "milestone.js", "visualizer.js", "ticker.js", "final_load.js"
];

const dom = new JSDOM(html, {
    url: "http://localhost:8000/main.html",
    runScripts: "dangerously",
    pretendToBeVisual: false
});
const { window } = dom;
const { document } = window;

// ---- stubs jsdom does not provide -----------------------------------------
const noopProxy = new Proxy({}, {
    get: (t, k) => (k === "canvas" ? {} : () => noopProxy),
    set: () => true
});
window.HTMLCanvasElement.prototype.getContext = () => noopProxy;
window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
window.IntersectionObserver = class { constructor() {} observe() {} unobserve() {} disconnect() {} };
window.ResizeObserver = class { constructor() {} observe() {} unobserve() {} disconnect() {} };
window.scrollTo = () => {};
window.Element.prototype.scrollIntoView = () => {};
window.alert = () => {};
window.prompt = () => null;

// jsdom does no layout, so offsetWidth/scrollWidth/clientWidth are all 0 and
// the marquee would never learn how wide it is. Fake plausible boxes.
const fakeWidth = el => {
    if (el.id === "ticker_track") return (el.children.length || 0) * 90;
    if (el.id === "ticker_window") return 600;
    return 0;
};
for (const prop of ["offsetWidth", "scrollWidth", "clientWidth"]) {
    Object.defineProperty(window.HTMLElement.prototype, prop, {
        configurable: true,
        get() { return fakeWidth(this); }
    });
}

const pendingFrames = [];
window.requestAnimationFrame = cb => { pendingFrames.push(cb); return pendingFrames.length; };
window.cancelAnimationFrame = () => {};
window.__pumpFrame = ts => { pendingFrames.splice(0).forEach(cb => cb(ts)); };

const errors = [];
window.addEventListener("error", e => errors.push("window error: " + e.message));
const originalConsoleError = console.error;
console.error = (...args) => { errors.push("console.error: " + args.map(String).join(" ")); };

// ---- load the scripts ------------------------------------------------------
const failures = [];
const inject = (label, code) => {
    try {
        const script = document.createElement("script");
        script.textContent = code;
        document.body.appendChild(script);
        script.remove();
    } catch (e) {
        failures.push(`${label}: ${e.message}`);
    }
};
inject("_native* capture", `
    window._nativeSetInterval = window.setInterval;
    window._nativeClearInterval = window.clearInterval;
    window._nativeDateNow = Date.now;
`);
for (const file of scriptsInOrder) {
    inject(file, fs.readFileSync(`${ROOT}/${file}`, "utf8"));
}
// The page is already parsed by the time these scripts run in the test, so the
// real DOMContentLoaded has been and gone; fire one for the loaders that wait
// on it (ui.js restores settings, ticker.js then reads them).
document.dispatchEvent(new window.Event("DOMContentLoaded", { bubbles: true }));
console.error = originalConsoleError;

// ---- assertions ------------------------------------------------------------
const checks = [];
const check = (name, ok, extra = "") => checks.push({ name, ok, extra });

check("all scripts evaluated", failures.length === 0, failures.join(" | "));

const track = document.getElementById("ticker_track");
const bar = document.getElementById("news_ticker");
check("ticker bar exists in DOM", !!bar);
check("ticker rendered items", track && track.children.length > 0, `children=${track ? track.children.length : "n/a"}`);
check("ticker has clickable items", !!document.querySelector(".ticker-item[data-page]"));

// a live frame: update() and the ticker marquee both run
window.eval("virtualElapsed = 5000");
window.__pumpFrame(16);
window.__pumpFrame(32);
check("simulation update() ran", document.getElementById("main_lngi_Content").textContent.includes(","),
    document.getElementById("main_lngi_Content").textContent);
const transform1 = track.style.transform;
window.__pumpFrame(116);
const transform2 = track.style.transform;
check("marquee wrote a transform", (transform1 || "").includes("translateX"), transform1);
check("marquee is actually moving", transform1 !== transform2, `${transform1} -> ${transform2}`);
check("track holds several copies of the stories",
    track.children.length >= 2 * (window.eval("tickerLog.length") + 1) - 1, `children=${track.children.length}`);

// ---- headlines: milestone ---------------------------------------------------
window.eval(`
    virtualElapsed = 200000000;
    tickerLastPushAt = 0;
    ticker_refresh();
`);
const log = () => window.eval("tickerLog.map(e => e.kind + ':' + e.text)");
const afterJump = log();
check("milestone headline written", afterJump.some(l => l.startsWith("milestone:")), afterJump.join(" || "));
check("headline persisted to localStorage",
    JSON.parse(window.localStorage.getItem("lngi_app_ticker_log") || "[]").length > 0);

// ---- headlines: records / terms --------------------------------------------
// Cross no milestone here, so the record story is the only one competing for
// the refresh's push budget.
window.eval("virtualElapsed = 400000");
window.__pumpFrame(200);              // let update() track the board
window.eval("ticker_refresh()");      // adopt it
window.eval("virtualElapsed = 120000000");
window.__pumpFrame(300);              // the sequence grows a lot
window.eval("ticker_refresh()");
const afterGrowth = log();
check("record or term headline written",
    afterGrowth.some(l => l.startsWith("record:") || l.startsWith("terms:")), afterGrowth.join(" || "));

// ---- rewind prunes the lost future -----------------------------------------
window.eval(`
    virtualElapsed = 1000;
    ticker_refresh();
`);
const afterRewind = log();
check("rewind headline written", afterRewind.some(l => l.startsWith("rewind:")), afterRewind.join(" || "));
const kept = window.eval("tickerLog.filter(e => e.at > get_virtual_elapsed() + 1500).length");
check("headlines from the lost future dropped", kept === 0, `kept=${kept}`);

// ---- click a story -> switches tab -----------------------------------------
window.eval("page = 4; update_page();");
const item = document.querySelector('.ticker-item[data-page="1"]');
item.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
check("clicking a story opens its tab", window.eval("page") === 1, `page=${window.eval("page")}`);
check("progress tab became visible", document.getElementById("scratch_bars").hidden === false);

// ---- headline: pause / resume ------------------------------------------------
window.eval("togglePause(); ticker_refresh();");
check("pause headline written", log().some(l => l.startsWith("pause:")), log().join(" || "));
window.eval("togglePause(); ticker_refresh();");

// ---- click-to-pause must ignore the ticker ---------------------------------
window.eval("pause = 0");            // running
bar.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
check("clicking the ticker does not pause the clock", window.eval("pause") === 0);

// ---- settings toggle --------------------------------------------------------
const enabled = document.getElementById("ticker_enabled");
enabled.checked = false;
enabled.dispatchEvent(new window.Event("input", { bubbles: true }));
check("turning the ticker off hides the bar", bar.hidden === true);

enabled.checked = true;
enabled.dispatchEvent(new window.Event("input", { bubbles: true }));
check("turning it back on shows the bar", bar.hidden === false);

const speed = document.getElementById("ticker_speed");
speed.value = "120";
speed.dispatchEvent(new window.Event("input", { bubbles: true }));
check("speed setting applied", window.eval("tickerSpeed") === 120, `speed=${window.eval("tickerSpeed")}`);

// ---- settings round-trip through ui.js -------------------------------------
const saved = JSON.parse(window.localStorage.getItem("lngi_app_settings") || "{}");
check("ui.js saved ticker settings", saved.ticker_speed === 120 && saved.ticker_enabled === true,
    JSON.stringify(saved).slice(0, 200));

// ---- reduced motion: static, hand-scrolled bar ------------------------------
window.matchMedia = () => ({ matches: true, addEventListener() {}, removeEventListener() {} });
window.eval("ticker_refresh()");
check("reduced motion makes the bar static",
    document.getElementById("ticker_window").classList.contains("ticker-static"));

// ---- report ----------------------------------------------------------------
let failed = 0;
for (const c of checks) {
    if (!c.ok) failed++;
    console.log(`${c.ok ? "PASS" : "FAIL"}  ${c.name}${c.ok ? "" : "  ->  " + c.extra}`);
}
if (errors.length && errors.some(e => /ticker|Failed to load ticker/.test(e))) {
    console.log("\nTicker-related errors:\n" + errors.join("\n"));
}
console.log(failed === 0 ? `\nAll ${checks.length} checks passed.` : `\n${failed}/${checks.length} checks FAILED.`);
process.exit(failed === 0 ? 0 : 1);
