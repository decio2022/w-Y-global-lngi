// Run with: node tests/progress-bars.test.js
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const source = fs.readFileSync('lngi.js', 'utf8');
const html = fs.readFileSync('main.html', 'utf8');

// Verify HTML controls exist and old 40-bar limit checkbox is gone.
assert.ok(!html.includes('id="limit_scratch_bars"'));
assert.ok(html.includes('id="scratch_prev_page"'));
assert.ok(html.includes('id="scratch_next_page"'));
assert.ok(html.includes('id="scratch_page_info"'));
assert.ok(html.includes('id="scratch_page_input"'));
assert.ok(html.includes('id="auto_convert_running_bars"'));

const code = source.slice(
    source.indexOf('var scratch_bar_elements = []'),
    source.indexOf('function scratch_bar_jump_target')
);

const elements = [];
const prevBtn = { listeners: {}, addEventListener(ev, fn) { this.listeners[ev] = fn; } };
const nextBtn = { listeners: {}, addEventListener(ev, fn) { this.listeners[ev] = fn; } };
const pageInput = { value: '0', listeners: {}, addEventListener(ev, fn) { this.listeners[ev] = fn; } };
const autoConvertInput = { checked: false, listeners: {}, addEventListener(ev, fn) { this.listeners[ev] = fn; } };
const pageInfo = { textContent: '' };
const scratchContent = {
    scrollTop: 0,
    appendChild(el) { elements.push(el); }
};

let conversions = [];
let clicked;
function element() {
    return { style: {}, appendChild() {}, addEventListener(_, fn) { this.click = fn; } };
}

const byId = {
    scratch_content: scratchContent,
    scratch_prev_page: prevBtn,
    scratch_next_page: nextBtn,
    scratch_page_input: pageInput,
    scratch_page_info: pageInfo,
    auto_convert_running_bars: autoConvertInput
};

const context = {
    document: {
        getElementById(id) { return byId[id] || null; },
        createElement: element,
        createTextNode: () => ({})
    },
    page: 1,
    scratch_bar_display: 'wY',
    tt: 0,
    paused: true,
    isPaused: () => context.paused,
    get_time_inv: x => x * 1000,
    formatSeconds: String,
    convert_From_wY: (s, mode) => { conversions.push([s, mode]); return s; },
    jump_to_scratch_bar: i => { clicked = i; }
};

vm.createContext(context);
vm.runInContext(code, context);
context.scratch_pagination_init();

function chain(n) {
    context.super_list = Array.from({ length: n }, (_, i) => [`ord${i}`, i, 0.5]);
}

// 120 bars -> 3 pages (50 + 50 + 20). Starts on Page 1 with input = 0.
chain(120);
context.update_scratch_bars(1, 0);
assert.equal(elements.length, 50);
assert.equal(conversions.length, 0);
assert.equal(pageInfo.textContent, 'Page 1 / 3 (bars 1-50 of 120)');
assert.equal(elements[0]._label.innerHTML, 'ord0');
assert.equal(elements[49]._label.innerHTML, 'ord49');
elements[0].click();
assert.equal(clicked, 0);
elements[49].click();
assert.equal(clicked, 49);

// Advance button moves to Page 2 (bars 51-100).
scratchContent.scrollTop = 120;
nextBtn.listeners.click();
context.update_scratch_bars(1, 0);
assert.equal(scratchContent.scrollTop, 0);
assert.equal(elements.length, 50);
assert.equal(pageInfo.textContent, 'Page 2 / 3 (bars 51-100 of 120)');
assert.equal(elements[0]._label.innerHTML, 'ord50');
assert.equal(elements[49]._label.innerHTML, 'ord99');
elements[0].click();
assert.equal(clicked, 50);

// Advance again to Page 3 (partial page: 20 bars, slots 20..49 hidden).
nextBtn.listeners.click();
context.update_scratch_bars(1, 0);
assert.equal(elements.length, 50);
assert.equal(pageInfo.textContent, 'Page 3 / 3 (bars 101-120 of 120)');
assert.equal(elements[0]._label.innerHTML, 'ord100');
assert.equal(elements[19]._label.innerHTML, 'ord119,1');
assert.notEqual(elements[19].style.display, 'none');
assert.equal(elements[20].style.display, 'none');
elements[19].click();
assert.equal(clicked, 119);

// Advance past the last page wraps back to Page 1.
nextBtn.listeners.click();
context.update_scratch_bars(1, 0);
assert.equal(pageInfo.textContent, 'Page 1 / 3 (bars 1-50 of 120)');
assert.equal(elements[0]._label.innerHTML, 'ord0');
assert.equal(elements[20].style.display, '');

// Previous button from Page 1 wraps to the last page (Page 3).
prevBtn.listeners.click();
context.update_scratch_bars(1, 0);
assert.equal(pageInfo.textContent, 'Page 3 / 3 (bars 101-120 of 120)');

// Back to Page 2 via Previous button.
prevBtn.listeners.click();
context.update_scratch_bars(1, 0);
assert.equal(pageInfo.textContent, 'Page 2 / 3 (bars 51-100 of 120)');

// Page input: 1+ jumps to that page; 0 means didn't go to any page (returns to button-selected Page 2).
pageInput.value = '3';
pageInput.listeners.input();
context.update_scratch_bars(1, 0);
assert.equal(pageInfo.textContent, 'Page 3 / 3 (bars 101-120 of 120)');
assert.equal(elements[0]._label.innerHTML, 'ord100');

pageInput.value = '0';
pageInput.listeners.input();
context.update_scratch_bars(1, 0);
assert.equal(pageInfo.textContent, 'Page 2 / 3 (bars 51-100 of 120)');
assert.equal(elements[0]._label.innerHTML, 'ord50');

// Clicking Next while input has a positive page advances from that page and resets input to 0.
pageInput.value = '1';
context.update_scratch_bars(1, 0);
assert.equal(pageInfo.textContent, 'Page 1 / 3 (bars 1-50 of 120)');
nextBtn.listeners.click();
assert.equal(pageInput.value, '0');
context.update_scratch_bars(1, 0);
assert.equal(pageInfo.textContent, 'Page 2 / 3 (bars 51-100 of 120)');

// Very large ("infinite") bar counts still only ever create 50 DOM bar elements.
chain(2500);
pageInput.value = '50';
context.update_scratch_bars(1, 0);
assert.equal(elements.length, 50);
assert.equal(pageInfo.textContent, 'Page 50 / 50 (bars 2451-2500 of 2500)');
assert.equal(elements[0]._label.innerHTML, 'ord2450');
assert.equal(elements[49]._label.innerHTML, 'ord2499,1');

// Out-of-range page input clamps cleanly to the last available page.
pageInput.value = '999';
context.update_scratch_bars(1, 0);
assert.equal(pageInfo.textContent, 'Page 50 / 50 (bars 2451-2500 of 2500)');

// Reset to Page 1 for worker conversion tests.
pageInput.value = '1';
nextBtn.listeners.click(); // Page 2
prevBtn.listeners.click(); // Page 1

// Outside Progress tab, lt still updates without rendering conversions.
chain(10);
context.page = 0;
conversions = [];
context.update_scratch_bars(1, 0);
assert.equal(conversions.length, 0);
assert.ok(context.lt >= 0);

// OCF labels must not synchronously convert on the animation thread, and the
// worker must have at most one outstanding request even across many frames.
const cache = new Map();
let worker;
context.Worker = class {
    constructor() { worker = this; this.requests = []; }
    postMessage(message) { this.requests.push(message); }
    terminate() {}
};
context.convert_cache = cache;
context.convert_cache_key = (ord, mode) => `${mode}:${ord}`;
context.convert_cache_put = (key, value) => cache.set(key, value);
context.Y_Terms = { valueAsNumber: 16 };
context.BMS_Terms = { valueAsNumber: 16 };
context.compress_BMS = { checked: false };
context.format_cOCF = { checked: true };
context.page = 1;
context.scratch_bar_display = 'cOCF';
chain(120);
pageInput.value = '2'; // View Page 2 (ord50..ord99)
conversions = [];
context.paused = false;
context.update_scratch_bars(1, 0);
assert.equal(worker, undefined);
assert.equal(elements[0]._label.innerHTML, 'ord50');

context.paused = true;
context.update_scratch_bars(1, 0);
context.update_scratch_bars(1, 0);
assert.equal(conversions.length, 0);
assert.equal(worker.requests.length, 1);
assert.equal(worker.requests[0].ord, 'ord50');
worker.onmessage({ data: { key: worker.requests[0].key, label: 'converted' } });
context.update_scratch_bars(1, 0);
assert.equal(elements[0]._label.innerHTML, 'converted');

context.paused = false;
context.update_scratch_bars(1, 0);
assert.equal(elements[0]._label.innerHTML, 'ord50');

// Enabling auto-convert while running converts and shows converted labels even when unpaused.
autoConvertInput.checked = true;
context.update_scratch_bars(1, 0);
assert.equal(elements[0]._label.innerHTML, 'converted');
assert.equal(worker.requests.length, 2);
assert.equal(worker.requests[1].ord, 'ord51');

// Disabling auto-convert while running returns to raw ω-Y labels until paused.
autoConvertInput.checked = false;
context.update_scratch_bars(1, 0);
assert.equal(elements[0]._label.innerHTML, 'ord50');

// A late result for a previous chain is cached but never applied to a new bar.
context.paused = true;
pageInput.value = '0';
chain(10);
worker.onmessage({ data: { key: worker.requests[1].key, label: 'stale' } });
context.update_scratch_bars(1, 0);
assert.equal(elements[1]._label.innerHTML, 'ord1');

// Deep chains (> 1000 bars) are not truncated before reaching 1,3 (u < 4),
// and once 1,3 is reached (u >= 4) chains cap back to 100 bars.
const convSource = fs.readFileSync('conv.js', 'utf8');
const ntlSlice = source.slice(
    source.indexOf('var super_list = []'),
    source.indexOf('const LNGI_DAY_MS')
);
const ntlCtx = {
    console, Math, Number, String, Array, Object, Infinity,
    addEventListener() {},
    document: { getElementById: () => ({ value: '', checked: false }) }
};
ntlCtx.window = ntlCtx;
vm.createContext(ntlCtx);
vm.runInContext(convSource, ntlCtx);
vm.runInContext(ntlSlice, ntlCtx);
ntlCtx.num_to_lngi(3.998046875);
assert.ok(ntlCtx.super_list.length > 1000, `Expected >1000 bars before 1,3, got ${ntlCtx.super_list.length}`);
assert.equal(ntlCtx.num_to_lngi(4)[0], '1,3');
assert.ok(ntlCtx.super_list.length <= 100);
ntlCtx.num_to_lngi(4.1);
assert.equal(ntlCtx.super_list.length, 100);
ntlCtx.num_to_lngi(3.998046875);
assert.ok(ntlCtx.super_list.length > 1000);

// The main display follows the selected notation without changing the source.
const mainFunction = source.slice(source.indexOf('var current_main_sequence = null'), source.indexOf('function num_time('));
vm.runInContext(mainFunction, context);
context.convert_From_wY = (seq, mode) => `${mode}:${seq}`;
context.scratch_bar_display = 'wY';
assert.equal(context.main_sequence_label('1,2,3'), '<i>1,2,3</i>');
context.scratch_bar_display = 'cOCF';
assert.equal(context.main_sequence_label('1,2,3'), 'cOCF:1,2,3');
context.scratch_bar_display = 'BMS';
assert.equal(context.main_sequence_label('1,2,3'), 'BMS:1,2,3');
let rendered;
context.$ = () => ({});
context.setHTML = (_, label) => { rendered = label; };
context.current_main_sequence = '1,2,3';
context.refresh_main_notation();
assert.equal(rendered, 'BMS:1,2,3');
context.scratch_bar_display = 'cOCF';
context.refresh_main_notation();
assert.equal(rendered, 'cOCF:1,2,3');
assert.equal(context.current_main_sequence, '1,2,3');

console.log('Progress bar tests passed');
