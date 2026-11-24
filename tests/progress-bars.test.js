// Run with: node tests/progress-bars.test.js
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync('lngi.js', 'utf8');
const code = source.slice(source.indexOf('var scratch_bar_elements = []'), source.indexOf('function scratch_bar_jump_target'));
const elements = [];
const limit = { valueAsNumber: 40 };
const exact = { checked: false };
const maxTerms = { valueAsNumber: 0 };
let conversions = [];
let clicked;
function element() {
    return { style: {}, appendChild() {}, addEventListener(_, fn) { this.click = fn; }, remove() { const i = elements.indexOf(this); if (i !== -1) elements.splice(i, 1); } };
}
const context = {
    document: {
        getElementById(id) { return id === 'scratch_content' ? { appendChild(el) { elements.push(el); } } : id === 'exact_scratch_terms' ? exact : id === 'Y_Terms' ? maxTerms : id === 'max_scratch_bars' ? limit : null; },
        createElement: element, createTextNode: () => ({})
    },
    page: 1, scratch_bar_display: 'wY', tt: 0, paused: true,
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
assert.equal(elements[0]._label.innerHTML, 'ord0');
assert.equal(elements[39]._label.innerHTML, 'ord39');
elements[0].click(); assert.equal(clicked, 0);
// Custom limits keep the first bars, without changing the chain.
limit.valueAsNumber = 3;
context.update_scratch_bars(1, 0);
assert.equal(elements.length, 3);
assert.equal(elements[0]._label.innerHTML, 'ord0');
elements[0].click(); assert.equal(clicked, 0);
limit.valueAsNumber = 200;
context.update_scratch_bars(1, 0);
assert.equal(elements.length, 100);
limit.valueAsNumber = NaN;
context.update_scratch_bars(1, 0);
assert.equal(elements.length, 100);
limit.valueAsNumber = 0; conversions = [];
context.update_scratch_bars(1, 0);
assert.equal(elements.length, 100); assert.equal(conversions.length, 0);
elements[0].click(); assert.equal(clicked, 0);
limit.valueAsNumber = 40; chain(10); conversions = [];
context.update_scratch_bars(1, 0);
assert.equal(conversions.length, 0); assert.equal(elements.length, 10);
assert.equal(elements[9]._label.innerHTML, 'ord9,1');
context.page = 0; conversions = [];
context.update_scratch_bars(1, 0);
assert.equal(conversions.length, 0); assert.ok(context.lt >= 0);
// Truncate to the configured maximum, retain shorter sequences, and retain the
// newest countdown when different underlying bars have the same prefix.
context.page = 1; limit.valueAsNumber = 0; exact.checked = true; maxTerms.valueAsNumber = 2;
context.super_list = [['1', 0, 0.1], ['1,2,3', 1, 0.2], ['1,3', 2, 0.3], ['1,2,4', 3, 0.4]];
context.update_scratch_bars(1, 0);
assert.equal(context.scratch_bar_count, 3);
assert.equal(elements[0]._label.innerHTML, '1');
assert.equal(elements[1]._label.innerHTML, '1,3');
assert.equal(elements[2]._label.innerHTML, '1,2');
elements[2].click(); assert.equal(clicked, 3);
// The reported case: remove just the second duplicate, never shorter or
// otherwise distinct sequences. The last bar automatically appends a 1,
// which is beyond this five-term limit.
maxTerms.valueAsNumber = 5;
context.super_list = [['1,2,4,8', 0, 0.1], ['1,2,4,8,1', 1, 0.2],
    ['1,2,4,8,2', 2, 0.3], ['1,2,4,8,2', 3, 0.4]];
context.update_scratch_bars(1, 0);
assert.equal(context.scratch_bar_count, 3);
assert.deepEqual(elements.map(el => el._label.innerHTML), ['1,2,4,8', '1,2,4,8,1', '1,2,4,8,2']);
elements[2].click(); assert.equal(clicked, 3);
// The limit is applied after deduplication, not to the underlying chain.
limit.valueAsNumber = 2;
context.update_scratch_bars(1, 0);
assert.deepEqual(elements.map(el => el._label.innerHTML), ['1,2,4,8', '1,2,4,8,1']);
elements[0].click(); assert.equal(clicked, 0);
elements[1].click(); assert.equal(clicked, 1);
limit.valueAsNumber = 0;
// The setting in the Settings dialog, not the mountain's MaxTerms input,
// controls the progress bars. A ten-term limit must truncate longer bars.
maxTerms.valueAsNumber = 10;
context.super_list = [['1,2,3,4,5,6,7,8,9,10,11,12', 0, 0.1], ['1,2,3,4,5,6,7,8,9,10,13', 1, 0.2]];
context.update_scratch_bars(1, 0);
assert.equal(context.scratch_bar_count, 1);
assert.equal(elements[0]._label.innerHTML, '1,2,3,4,5,6,7,8,9,10');
elements[0].click(); assert.equal(clicked, 1);
maxTerms.valueAsNumber = 0;
context.super_list = [['1,2', 0, 0.1], ['1,2', 1, 0.2], ['1,3', 2, 0.3]];
context.update_scratch_bars(1, 0);
assert.equal(context.scratch_bar_count, 2);
elements[0].click(); assert.equal(clicked, 1);
exact.checked = false; limit.valueAsNumber = 40;
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
context.Y_Terms = maxTerms;
maxTerms.valueAsNumber = 16;
context.BMS_Terms = { valueAsNumber: 16 };
context.compress_BMS = { checked: false };
context.format_cOCF = { checked: true };
context.page = 1; context.scratch_bar_display = 'cOCF'; chain(100);
conversions = [];
context.paused = false;
context.update_scratch_bars(1, 0);
context.update_scratch_bars(1, 0);
assert.equal(conversions.length, 0);
assert.equal(worker.requests.length, 1);
assert.equal(worker.requests[0].ord, 'ord0');
worker.onmessage({ data: { key: worker.requests[0].key, label: 'converted' } });
// Results render and the next request starts immediately, without a frame.
assert.equal(elements[0]._label.innerHTML, 'converted');
assert.equal(worker.requests.length, 2);
context.update_scratch_bars(1, 0);
assert.equal(worker.requests[1].ord, 'ord1');
// A late result for a previous chain is cached but never applied to a new bar.
context.super_list = Array.from({ length: 10 }, (_, i) => [`new${i}`, i, 0.5]);
worker.onmessage({ data: { key: worker.requests[1].key, label: 'stale' } });
context.update_scratch_bars(1, 0);
assert.equal(elements[1]._label.innerHTML, 'Converting…');
// Different ω-Y sequences remain distinct even if their converted labels match.
// Identical capped ω-Y sequences collapse in every notation, running or paused.
worker.onmessage({ data: { key: worker.requests[2].key, label: 'irrelevant' } });
exact.checked = true; limit.valueAsNumber = 0; maxTerms.valueAsNumber = 2;
for (const mode of ['wY', 'DBMS', 'BMS', '2-shifted OCF', 'cOCF', 'EcOCF', 'BcOCF', 'PMS', 'AMS', '0Y', 'Vulcaniz']) {
    context.scratch_bar_display = mode;
    context.super_list = [['1,2,3', 0, 0.1], ['1,3,4', 1, 0.2], ['1,2,9', 2, 0.3]];
    if (mode !== 'wY') {
        cache.set(`worker:${mode}:1,2`, 'same');
        cache.set(`worker:${mode}:1,3`, 'same');
    }
    for (const paused of [false, true]) {
        context.paused = paused;
        context.update_scratch_bars(1, 0);
        assert.equal(context.scratch_bar_count, 2, mode);
        if (mode !== 'wY') assert.equal(elements[0]._label.innerHTML, 'same');
        elements[1].click(); assert.equal(clicked, 2);
    }
}
// Reproduce the screenshot: many longer sequences share the same first ten
// terms in 2-shifted OCF. They must remain one bar before and after conversion.
maxTerms.valueAsNumber = 10; context.scratch_bar_display = '2-shifted OCF';
context.super_list = Array.from({ length: 100 }, (_, i) =>
    [`1,2,4,8,16,25,36,51,67,85,${100 + i}`, i, 0.5]);
context.paused = false;
context.update_scratch_bars(1, 0);
assert.equal(context.scratch_bar_count, 1);
assert.equal(elements.length, 1); // Other bars are actually removed, not just relabelled.
assert.equal(elements[0]._label.innerHTML, 'Converting…');
elements[0].click(); assert.equal(clicked, 99);
cache.set('worker:2-shifted OCF:1,2,4,8,16,25,36,51,67,85', '1,2,4,8,16,25,36,51,67,85');
context.update_scratch_bars(1, 0);
assert.equal(context.scratch_bar_count, 1);
// Changing Settings from all terms to 10 while running must immediately
// remove old rows, without waiting for notation conversion. Distinct prefixes
// remain visible and the removed rows must not reappear after conversion.
cache.clear(); maxTerms.valueAsNumber = 0;
context.super_list = [
    ['1,2,4,8,16,25,36,51,67,85,11', 0, 0.1],
    ['1,2,4,8,16,25,36,51,67,85,12', 1, 0.2],
    ['1,2,4,8,16,25,36,51,67,86,13', 2, 0.3]
];
context.update_scratch_bars(1, 0);
assert.equal(elements.length, 3);
maxTerms.valueAsNumber = 10;
context.update_scratch_bars(1, 0);
assert.equal(elements.length, 2);
assert.equal(elements[0]._label.innerHTML, 'Converting…');
assert.equal(elements[1]._label.innerHTML, 'Converting…');
elements[0].click(); assert.equal(clicked, 1);
cache.set('worker:2-shifted OCF:1,2,4,8,16,25,36,51,67,85', '1,2,4,8,16,25,36,51,67,85');
context.update_scratch_bars(1, 0);
assert.equal(elements.length, 2);
// With no term limit, matching labels with different term counts stay distinct.
maxTerms.valueAsNumber = 0; context.scratch_bar_display = 'BMS';
context.super_list = [['1,2', 0, 0.1], ['1,3,4', 1, 0.2]];
cache.set('worker:BMS:1,2', 'same'); cache.set('worker:BMS:1,3,4,1', 'same');
context.update_scratch_bars(1, 0);
assert.equal(context.scratch_bar_count, 2);
exact.checked = false;
// A busy main sequence must not consume the bar worker's request slot.
// This reproduces running 2-shifted OCF with a changing main sequence.
const barWorker = worker;
context.progress_conversion_lanes.bar.pending = false;
context.scratch_bar_display = '2-shifted OCF'; exact.checked = false;
limit.valueAsNumber = 0; context.super_list = [['1,2,3', 0, 0.1]];
context.progress_bar_label('1,2,4,8,12', '2-shifted OCF', 'main');
const mainWorker = worker;
assert.notEqual(mainWorker, barWorker);
assert.equal(mainWorker.requests.length, 1);
const barRequestsBefore = barWorker.requests.length;
context.update_scratch_bars(1, 0);
assert.equal(barWorker.requests.length, barRequestsBefore + 1);
assert.equal(elements[0]._label.innerHTML, 'Converting…');
const request = barWorker.requests.at(-1);
barWorker.onmessage({ data: { key: request.key, label: 'converted bar' } });
// The main worker is still busy, but the bar updates without another frame.
assert.equal(elements[0]._label.innerHTML, 'converted bar');
assert.equal(mainWorker.requests.length, 1);
// While running, ignored trailing terms must not repeatedly invalidate the
// requested OCF conversion. Both displays use the same capped cache key.
maxTerms.valueAsNumber = 2;
context.progress_conversion_lanes.main.pending = false;
const first = context.progress_bar_label('1,2,3,4', '2-shifted OCF', 'main');
assert.equal(first, 'Converting…');
const normalizedRequest = mainWorker.requests.at(-1);
assert.equal(normalizedRequest.ord, '1,2');
mainWorker.onmessage({ data: { key: normalizedRequest.key, label: 'OCF result' } });
const priorRequests = mainWorker.requests.length;
assert.equal(context.progress_bar_label('1,2,9,9', '2-shifted OCF', 'main'), 'OCF result');
assert.equal(context.progress_bar_label('1,2,5,8', '2-shifted OCF', 'bar'), 'OCF result');
assert.equal(mainWorker.requests.length, priorRequests);
maxTerms.valueAsNumber = 0;
// The main display follows the selected notation without changing the source.
const mainFunction = source.slice(source.indexOf('var current_main_sequence = null'), source.indexOf('function num_time('));
vm.runInContext(mainFunction, context);
context.convert_From_wY = (seq, mode) => `${mode}:${seq}`;
context.scratch_bar_display = 'wY';
assert.equal(context.main_sequence_label('1,2,3'), '<i>1,2,3</i>');
context.scratch_bar_display = 'cOCF';
assert.equal(context.main_sequence_label('1,2,3'), 'cOCF:1,2,3');
context.scratch_bar_display = '2-shifted OCF';
assert.equal(context.main_sequence_label('1,2,4,8,13,1'), 'Converting…');
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
