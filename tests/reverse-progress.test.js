// Run with: node tests/reverse-progress.test.js
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const source = fs.readFileSync('lngi.js', 'utf8');
const between = (start, end) => source.slice(source.indexOf(start), source.indexOf(end));

function element() {
    const classes = new Set();
    return {
        style: {}, children: [], listeners: {}, title: '', innerHTML: '', textContent: '',
        classList: {
            add: name => classes.add(name), remove: name => classes.delete(name),
            contains: name => classes.has(name)
        },
        appendChild(child) { this.children.push(child); },
        addEventListener(type, callback) { this.listeners[type] = callback; },
        click() { this.listeners.click(); }
    };
}
const nodes = {
    scratch_content: element(), main_lngi_bar: element(), main_lngi_Content: element(),
    limit_scratch_bars: { checked: false }, reverse_scratch_bars: { checked: true },
    Y_Terms: { valueAsNumber: 17 }, BMS_Terms: { valueAsNumber: 17 }
};
const savedJumps = [];
const context = {
    console, document: {
        getElementById: id => nodes[id] || null,
        createElement: element, createTextNode: () => ({})
    },
    addEventListener() {}, setTimeout() {},
    page: 1, tt: 0, st: 1700000000000, scratch_bar_display: 'wY',
    milestoneMulti: 1, lastTimeDirection: 1, paused: true,
    virtualElapsed: 0, timeOffset: 0,
    compress_BMS: { checked: false }, format_cOCF: { checked: true },
    isPaused: () => context.paused, saveMisc: force => savedJumps.push(force)
};
context.window = context.self = context;
vm.createContext(context);
vm.runInContext(fs.readFileSync('conv.js', 'utf8'), context);
vm.runInContext(between('function formatSeconds(', '// Cached DOM lookups:'), context);
vm.runInContext(between('var _elCache = new Map()', '\nscratch_bar_init()'), context);
vm.runInContext(between('var super_list = []', 'function renderAnalysisPanels()'), context);
vm.runInContext(between('var current_main_sequence = null', 'var tps = 0'), context);
context.scratch_bar_init();
assert.equal(context.formatSeconds(0.001), '0 seconds');

const near = (actual, expected, tolerance = 1e-8) =>
    assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} != ${expected}`);
const setPosition = (x, offset = 0) => {
    context.timeOffset = offset;
    context.virtualElapsed = context.get_time_inv(x) - offset;
    return context.num_time(context.virtualElapsed + offset);
};

// The real ω-Y chain and piecewise timeline should retain their forward view.
let result = setPosition(3.2);
assert.equal(result[0], '80.000%');
assert.equal(result[2], '1,2,2,2');
assert.equal(context.scratch_bar_elements[0]._label.innerHTML, '1,3');
assert.equal(context.scratch_bar_jump_target(0).u, 4);
context.render_main_bar_text(result, context.virtualElapsed);
assert.match(nodes.main_lngi_bar.innerHTML, /next ordinal/);

// Reverse the same chain and check the real targets, labels, widths and timers.
context.milestoneMulti = -2;
result = setPosition(3.2);
assert.equal(result[0], '20.000%');
assert.equal(context.scratch_bar_elements[0]._label.innerHTML, '1,2');
assert.equal(context.scratch_bar_elements[4]._label.innerHTML, '1,2,2,2');
near(context.scratch_bar_boundary(4, 3.2, true), 3.1875);
near(context.lt, (context.get_time_inv(3.2) - context.get_time_inv(3.1875)) / 1000, 1e-5);
context.render_main_bar_text(result, context.virtualElapsed);
assert.match(nodes.main_lngi_bar.innerHTML, /previous boundary/);

const oldWidth = parseFloat(context.scratch_bar_elements[0].style.width);
const oldTimer = context.lt;
setPosition(3.195);
assert.ok(parseFloat(context.scratch_bar_elements[0].style.width) > oldWidth);
assert.ok(context.lt < oldTimer);
result = setPosition(3.1875);
assert.equal(result[0], '100.000%');
assert.equal(context.lt, 0);
result = setPosition(3.187499);
assert.notEqual(result[2], '1,2,2,2');
assert.ok(context.lt >= 0);

// Clicking a reverse bar lands at its earlier labeled boundary, including when
// the clock has an offset, and never jumps forward to the old target.
setPosition(3.2, 60000);
const target = context.scratch_bar_jump_target(4);
const before = context.virtualElapsed + context.timeOffset;
assert.equal(target.shown, '1,2,2,2');
assert.equal(target.reversed, true);
assert.equal(context.jump_to_scratch_bar(4), true);
assert.equal(savedJumps.at(-1), true);
assert.ok(context.virtualElapsed + context.timeOffset < before);
near(context.virtualElapsed + context.timeOffset, context.get_time_inv(target.u), 0.1);
assert.equal(context.current_main_sequence, target.shown);

setPosition(3.2, -86400000);
const firstTarget = context.scratch_bar_jump_target(0);
assert.equal(firstTarget.shown, '1,2');
assert.equal(context.jump_to_scratch_bar(0), true);
near(context.virtualElapsed + context.timeOffset, context.get_time_inv(3), 0.1);
assert.equal(context.current_main_sequence, '1,2');

// Nested intervals around several real timeline stages must also jump to the
// displayed prefix. Precision-limited zero-distance targets are skipped.
for (const x of [2.3, 2.6, 3.01, 3.3, 3.6, 3.76]) {
    setPosition(x);
    const length = context.super_list.length;
    for (let i = 0; i < Math.min(length, 10); i++) {
        setPosition(x);
        const start = context.virtualElapsed;
        const t = context.scratch_bar_jump_target(i);
        assert.equal(context.scratch_bar_elements[i]._label.innerHTML, t.shown);
        if (context.get_time_inv(t.u) >= start) continue;
        assert.equal(context.jump_to_scratch_bar(i), true, `jump ${x}, bar ${i}`);
        assert.ok(context.virtualElapsed < start);
        assert.equal(context.current_main_sequence, t.shown);
    }
}

// Limited mode reuses slots, including the flash for an unavailable target.
nodes.limit_scratch_bars.checked = true;
setPosition(3.76);
assert.ok(context.super_list.length > 40);
const firstVisible = context.super_list.length - 40;
assert.equal(context.scratch_bar_elements[0]._sequenceIndex, firstVisible);
context.scratch_bar_blocked(firstVisible);
assert.ok(context.scratch_bar_elements[0].classList.contains('scratch-bar-blocked'));

// Turning the option off restores forward targets; zero retains the last
// direction, even while paused. Returning to positive speed restores forward.
nodes.limit_scratch_bars.checked = false;
setPosition(3.2);
context.milestoneMulti = 0;
assert.equal(context.progress_bars_reversed(), true);
nodes.reverse_scratch_bars.checked = false;
setPosition(3.2);
assert.equal(context.scratch_bar_jump_target(0).u, 4);
assert.equal(context.scratch_bar_elements[0]._label.innerHTML, '1,3');
nodes.reverse_scratch_bars.checked = true;
context.milestoneMulti = 1;
setPosition(3.2);
assert.equal(context.progress_bars_reversed(), false);

// Rewinding to zero shows the first sequence, and a pre-start clock clears
// stale bars. Coming back to zero must rebuild the previously cached chain.
context.milestoneMulti = -1;
context.timeOffset = 0;
context.virtualElapsed = 0;
result = context.num_time(0);
assert.equal(result[2], '1,1');
context.render_main_bar_text(result, 0);
assert.equal(nodes.main_lngi_bar.innerHTML, 'Start of timeline');
assert.match(context.scratch_bar_elements[0]._meta.textContent, /start of timeline/);
assert.equal(context.jump_to_scratch_bar(0), false);
assert.equal(context.virtualElapsed, 0);
result = context.num_time(-500);
assert.equal(result[2], null);
assert.equal(context.super_list.length, 0);
assert.equal(context.scratch_bar_elements[0].style.display, 'none');
assert.match(nodes.main_lngi_Content.innerHTML, /Not started yet/);
assert.equal(context.num_time(0)[2], '1,1');
assert.ok(context.super_list.length > 0);
assert.equal(context.scratch_bar_elements[0].style.display, '');

console.log('Reverse progress tests passed');
