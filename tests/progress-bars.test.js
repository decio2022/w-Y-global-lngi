// Run with: node tests/progress-bars.test.js
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync('lngi.js', 'utf8');
const code = source.slice(source.indexOf('var scratch_bar_elements = []'), source.indexOf('function scratch_bar_jump_target'));
const elements = [];
const limit = { checked: true };
let conversions = [];
let clicked;
function element() {
    return { style: {}, appendChild() {}, addEventListener(_, fn) { this.click = fn; } };
}
const context = {
    document: {
        getElementById(id) { return id === 'scratch_content' ? { appendChild(el) { elements.push(el); } } : limit; },
        createElement: element, createTextNode: () => ({})
    },
    page: 1, scratch_bar_display: 'cOCF', tt: 0,
    get_time_inv: x => x * 1000, formatSeconds: String,
    convert_From_wY: (s, mode) => { conversions.push([s, mode]); return s; },
    jump_to_scratch_bar: i => { clicked = i; }
};
vm.createContext(context);
vm.runInContext(code, context);
function chain(n) { context.super_list = Array.from({ length: n }, (_, i) => [`ord${i}`, i, 0.5]); }
chain(100);
context.update_scratch_bars(1, 0);
assert.equal(elements.length, 53);
assert.equal(conversions.length, 53);
assert.equal(elements[0]._label.innerHTML, 'ord47');
assert.equal(elements[52]._label.innerHTML, 'ord99,1');
elements[0].click(); assert.equal(clicked, 47);
limit.checked = false; conversions = [];
context.update_scratch_bars(1, 0);
assert.equal(elements.length, 100); assert.equal(conversions.length, 100);
elements[0].click(); assert.equal(clicked, 0);
limit.checked = true; chain(10); conversions = [];
context.update_scratch_bars(1, 0);
assert.equal(conversions.length, 10); assert.equal(elements[10].style.display, 'none');
assert.equal(elements[9]._label.innerHTML, 'ord9,1');
context.page = 0; conversions = [];
context.update_scratch_bars(1, 0);
assert.equal(conversions.length, 0); assert.ok(context.lt >= 0);
console.log('Progress bar tests passed');
