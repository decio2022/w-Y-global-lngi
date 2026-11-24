// Run with: node tests/progress-bars.test.js
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync('lngi.js', 'utf8');
const code = source.slice(source.indexOf('var scratch_bar_elements = []'), source.indexOf('function scratch_bar_jump_target'));
const elements = [];
const limit = { checked: true };
const exact = { checked: false };
const maxTerms = { valueAsNumber: 0 };
let conversions = [];
let clicked;
function element() {
    return { style: {}, appendChild() {}, addEventListener(_, fn) { this.click = fn; }, remove() { const i = elements.indexOf(this); if (i !== -1) elements.splice(i, 1); } };
}
const context = {
    document: {
        getElementById(id) { return id === 'scratch_content' ? { appendChild(el) { elements.push(el); } } : id === 'exact_scratch_terms' ? exact : id === 'Y_Terms' ? maxTerms : limit; },
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
assert.equal(elements[0]._label.innerHTML, 'ord60');
assert.equal(elements[39]._label.innerHTML, 'ord99,1');
elements[0].click(); assert.equal(clicked, 60);
limit.checked = false; conversions = [];
context.update_scratch_bars(1, 0);
assert.equal(elements.length, 100); assert.equal(conversions.length, 0);
elements[0].click(); assert.equal(clicked, 0);
limit.checked = true; chain(10); conversions = [];
context.update_scratch_bars(1, 0);
assert.equal(conversions.length, 0); assert.equal(elements.length, 10);
assert.equal(elements[9]._label.innerHTML, 'ord9,1');
context.page = 0; conversions = [];
context.update_scratch_bars(1, 0);
assert.equal(conversions.length, 0); assert.ok(context.lt >= 0);
// Truncate to the configured maximum, omit shorter sequences, and retain the
// newest countdown when different underlying bars have the same prefix.
context.page = 1; limit.checked = false; exact.checked = true; maxTerms.valueAsNumber = 2;
context.super_list = [['1', 0, 0.1], ['1,2,3', 1, 0.2], ['1,3', 2, 0.3], ['1,2,4', 3, 0.4]];
context.update_scratch_bars(1, 0);
assert.equal(context.scratch_bar_count, 2);
assert.equal(elements[0]._label.innerHTML, '1,3');
assert.equal(elements[1]._label.innerHTML, '1,2');
elements[1].click(); assert.equal(clicked, 3);
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
exact.checked = false; limit.checked = true;
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
assert.equal(worker.requests[0].ord, 'ord99,1');
worker.onmessage({ data: { key: worker.requests[0].key, label: 'converted' } });
context.update_scratch_bars(1, 0);
assert.equal(elements[39]._label.innerHTML, 'converted');
assert.equal(worker.requests.length, 2);
assert.equal(worker.requests[1].ord, 'ord98');
// A late result for a previous chain is cached but never applied to a new bar.
chain(10);
worker.onmessage({ data: { key: worker.requests[1].key, label: 'stale' } });
context.update_scratch_bars(1, 0);
assert.equal(elements[1]._label.innerHTML, 'ord1');
// Identical converted labels from different ω-Y sequences collapse too, for
// every notation, while running or paused. The newest countdown is retained.
worker.onmessage({ data: { key: worker.requests[2].key, label: 'irrelevant' } });
exact.checked = true; limit.checked = false; maxTerms.valueAsNumber = 2;
for (const mode of ['wY', 'DBMS', 'BMS', '2-shifted OCF', 'cOCF', 'EcOCF', 'BcOCF', 'PMS', 'AMS', '0Y', 'Vulcaniz']) {
    context.scratch_bar_display = mode;
    context.super_list = [['1,2,3', 0, 0.1], ['1,3,4', 1, 0.2], ['1,2,9', 2, 0.3]];
    if (mode !== 'wY') {
        cache.set(`${mode}:1,2`, 'same');
        cache.set(`${mode}:1,3`, 'same');
    }
    for (const paused of [false, true]) {
        context.paused = paused;
        context.update_scratch_bars(1, 0);
        assert.equal(context.scratch_bar_count, mode === 'wY' ? 2 : 1, mode);
        if (mode !== 'wY') assert.equal(elements[0]._label.innerHTML, 'same');
        elements[mode === 'wY' ? 1 : 0].click(); assert.equal(clicked, 2);
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
assert.equal(elements[0]._label.innerHTML, '1,2,4,8,16,25,36,51,67,85');
elements[0].click(); assert.equal(clicked, 99);
cache.set('2-shifted OCF:1,2,4,8,16,25,36,51,67,85', '1,2,4,8,16,25,36,51,67,85');
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
assert.equal(elements[0]._label.innerHTML, '1,2,4,8,16,25,36,51,67,85');
assert.equal(elements[1]._label.innerHTML, '1,2,4,8,16,25,36,51,67,86');
elements[0].click(); assert.equal(clicked, 1);
cache.set('2-shifted OCF:1,2,4,8,16,25,36,51,67,85', '1,2,4,8,16,25,36,51,67,85');
context.update_scratch_bars(1, 0);
assert.equal(elements.length, 2);
// With no term limit, matching labels with different term counts stay distinct.
maxTerms.valueAsNumber = 0; context.scratch_bar_display = 'BMS';
context.super_list = [['1,2', 0, 0.1], ['1,3,4', 1, 0.2]];
cache.set('BMS:1,2', 'same'); cache.set('BMS:1,3,4,1', 'same');
context.update_scratch_bars(1, 0);
assert.equal(context.scratch_bar_count, 2);
exact.checked = false;
// The main display follows the selected notation without changing the source.
const mainFunction = source.slice(source.indexOf('var current_main_sequence = null'), source.indexOf('function num_time('));
vm.runInContext(mainFunction, context);
context.convert_From_wY = (seq, mode) => `${mode}:${seq}`;
context.scratch_bar_display = 'wY';
assert.equal(context.main_sequence_label('1,2,3'), '<i>1,2,3</i>');
context.scratch_bar_display = 'cOCF';
assert.equal(context.main_sequence_label('1,2,3'), 'cOCF:1,2,3');
context.scratch_bar_display = '2-shifted OCF';
assert.equal(context.main_sequence_label('1,2,4,8,13,1'), '1,2,4,8,13,1');
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
