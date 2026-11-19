// Run with: node tests/progress-bars.test.js
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync('lngi.js', 'utf8');
const code = source.slice(source.indexOf('var scratch_bar_elements = []'), source.indexOf('function scratch_bar_jump_target'));
const elements = [];
const limit = { checked: true };
const reverse = { checked: true };
let conversions = [];
let clicked;
function element() {
    return { style: {}, appendChild() {}, addEventListener(_, fn) { this.click = fn; } };
}
const context = {
    document: {
        getElementById(id) {
            if (id === 'scratch_content') return { appendChild(el) { elements.push(el); } };
            return id === 'reverse_scratch_bars' ? reverse : limit;
        },
        createElement: element, createTextNode: () => ({})
    },
    page: 1, scratch_bar_display: 'wY', tt: 0, paused: true,
    milestoneMulti: 1, lastTimeDirection: 1, st: 1700000000000,
    isPaused: () => context.paused,
    get_time_inv: x => x * 1000, formatSeconds: String,
    convert_From_wY: (s, mode) => { conversions.push([s, mode]); return s; },
    jump_to_scratch_bar: i => { clicked = i; }
};
vm.createContext(context);
vm.runInContext(code, context);
function chain(n) { context.super_list = Array.from({ length: n }, (_, i) => [`ord${i}`, i, 0.5]); }
chain(100);
context.update_scratch_bars(1, 0);
assert.equal(elements.length, 40);
assert.equal(conversions.length, 0);
assert.equal(elements[0]._label.innerHTML, 'ord60');
assert.equal(elements[39]._label.innerHTML, 'ord99,1');
elements[0].click(); assert.equal(clicked, 60);
context.milestoneMulti = -1;
context.update_scratch_bars(3.2, 3200, '1,2');
elements[0].click(); assert.equal(clicked, 60); // reverse still uses the sequence index
context.milestoneMulti = 1;
limit.checked = false; conversions = [];
context.update_scratch_bars(1, 0);
assert.equal(elements.length, 100); assert.equal(conversions.length, 0);
elements[0].click(); assert.equal(clicked, 0);
limit.checked = true; chain(10); conversions = [];
context.update_scratch_bars(1, 0);
assert.equal(conversions.length, 0); assert.equal(elements[10].style.display, 'none');
assert.equal(elements[9]._label.innerHTML, 'ord9,1');
context.page = 0; conversions = [];
context.update_scratch_bars(1, 0);
assert.equal(conversions.length, 0); assert.ok(context.lt >= 0);
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
context.page = 1; context.scratch_bar_display = 'cOCF'; chain(100);
conversions = [];
context.paused = false;
context.update_scratch_bars(1, 0);
assert.equal(worker, undefined);
assert.equal(elements[0]._label.innerHTML, 'ord60');
context.paused = true;
context.update_scratch_bars(1, 0);
context.update_scratch_bars(1, 0);
assert.equal(conversions.length, 0);
assert.equal(worker.requests.length, 1);
assert.equal(worker.requests[0].ord, 'ord60');
worker.onmessage({ data: { key: worker.requests[0].key, label: 'converted' } });
context.update_scratch_bars(1, 0);
assert.equal(elements[0]._label.innerHTML, 'converted');
context.paused = false;
context.update_scratch_bars(1, 0);
assert.equal(elements[0]._label.innerHTML, 'ord60');
context.paused = true;
assert.equal(worker.requests.length, 2);
assert.equal(worker.requests[1].ord, 'ord61');
// A late result for a previous chain is cached but never applied to a new bar.
chain(10);
worker.onmessage({ data: { key: worker.requests[1].key, label: 'stale' } });
context.update_scratch_bars(1, 0);
assert.equal(elements[1]._label.innerHTML, 'ord1');

// Reversed bars count toward the start of each current interval, rather than
// continuing to count toward its future endpoint. The root uses a full 0–100%.
limit.checked = false;
context.scratch_bar_display = 'wY';
context.super_list = [
    ['1,3', 0, 0.4], ['1,2,4', 2, 0.6], ['1,2,3', 3, 0.2],
    ['1,2,2,2,2', 6, 0.6], ['1,2,2,2', 7, 0.2]
];
context.milestoneMulti = -2; context.paused = true; context.tt = 0;
context.update_scratch_bars(3.2, 3200, '1,2,2,2');
assert.equal(elements[0]._label.innerHTML, '1,2');
assert.equal(elements[4]._label.innerHTML, '1,2,2,2');
assert.ok(Math.abs(parseFloat(elements[0].style.width) - 80) < 1e-9);
assert.ok(Math.abs(parseFloat(elements[4].style.width) - 20) < 1e-9);
assert.ok(Math.abs(context.lt - 0.0125) < 1e-9);
assert.match(elements[4].title, /rewind/);
context.tt = 1;
context.update_scratch_bars(3.2, 3200, '1,2,2,2');
assert.ok(elements[4]._meta.textContent.includes(new Date(context.st + 3187.5).toLocaleString()));

// Zero holds the previous direction; disabling the option restores the legacy
// forward targets even with a negative speed. Positive speed always uses them.
context.milestoneMulti = 0; context.tt = 0;
context.update_scratch_bars(3.2, 3200, '1,2,2,2');
assert.equal(elements[0]._label.innerHTML, '1,2');
reverse.checked = false; context.milestoneMulti = -2;
context.update_scratch_bars(3.2, 3200, '1,2,2,2');
assert.equal(elements[0]._label.innerHTML, '1,3');
assert.equal(elements[4]._label.innerHTML, '1,2,2,2,1');
assert.ok(Math.abs(parseFloat(elements[4].style.width) - 80) < 1e-9);
assert.ok(Math.abs(context.lt - 0.003125) < 1e-9);
reverse.checked = true; context.milestoneMulti = 1;
context.update_scratch_bars(3.2, 3200, '1,2,2,2');
assert.equal(elements[0]._label.innerHTML, '1,3');
context.page = 0; context.milestoneMulti = -1;
context.update_scratch_bars(3.2, 3200, '1,2,2,2');
assert.ok(Math.abs(context.lt - 0.0125) < 1e-9);

// Background notation conversion must use the new reverse label, not an
// in-flight forward label; a zero speed is stationary and can use the cache.
worker.onmessage({ data: { key: worker.requests[2].key, label: 'old forward label' } });
context.page = 1; context.scratch_bar_display = 'cOCF'; context.paused = true;
context.update_scratch_bars(3.2, 3200, '1,2,2,2');
const reverseRequest = worker.requests.at(-1);
assert.equal(reverseRequest.ord, '1,2');
worker.onmessage({ data: { key: reverseRequest.key, label: 'converted reverse label' } });
context.update_scratch_bars(3.2, 3200, '1,2,2,2');
assert.equal(elements[0]._label.innerHTML, 'converted reverse label');
context.paused = false;
context.update_scratch_bars(3.2, 3200, '1,2,2,2');
assert.equal(elements[0]._label.innerHTML, '1,2');
context.milestoneMulti = 0;
context.update_scratch_bars(3.2, 3200, '1,2,2,2');
assert.equal(elements[0]._label.innerHTML, 'converted reverse label');
worker.onmessage({ data: { key: worker.requests.at(-1).key, label: 'other converted label' } });
context.milestoneMulti = -1; context.paused = false;
context.super_list = [['1,2', 0, 0.5], ['1,1', 2, 1]];
context.update_scratch_bars(2, 0, '1,1');
assert.equal(worker.requests.at(-1).ord, '1,1'); // stopped at the timeline start
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
