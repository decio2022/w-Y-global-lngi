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
        click() { return this.listeners.click(); }
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
const compareSequences = vm.runInContext('Y_Sequence.cmp', context);

const near = (actual, expected, tolerance = 1e-8) =>
    assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} != ${expected}`);
const setPosition = (x, offset = 0) => {
    context.timeOffset = offset;
    context.virtualElapsed = context.get_time_inv(x) - offset;
    return context.num_time(context.virtualElapsed + offset);
};
const assertAdvancedPast = (target, previousTime) => {
    const time = context.virtualElapsed + context.timeOffset;
    const boundaryTime = context.get_time_inv(target.u);
    assert.ok(time < previousTime, 'reverse jump must not move forwards');
    if (boundaryTime === 0) {
        assert.equal(time, 0);
        assert.equal(nodes.main_lngi_bar.innerHTML, 'Start of timeline');
    } else {
        assert.ok(time < boundaryTime, `did not cross ${target.u}`);
        const u = context.get_time(time);
        assert.ok(u < target.u, 'mapped position did not cross the boundary');
        assert.equal(compareSequences(context.current_main_sequence, target.shown), -1, 'sequence did not move earlier');
        assert.ok(context.scratch_bar_count > 0);
        const nextIndex = context.scratch_bar_elements[context.scratch_bar_count - 1]._sequenceIndex;
        const nextBoundary = context.scratch_bar_boundary(nextIndex, u, true);
        assert.ok(nextBoundary < target.u);
        near(context.lt, (time - context.get_time_inv(nextBoundary)) / 1000, 1e-5);
        assert.ok(context.lt > 0, 'next reverse countdown must be positive');
        assert.doesNotMatch(nodes.main_lngi_bar.innerHTML, /\b0(?:\.0+)? seconds left\b/);
    }
};

// The real ω-Y chain and piecewise timeline should retain their forward view.
let result = setPosition(3.2);
assert.equal(result[0], '80.000%');
assert.equal(result[2], '1,2,2,2');
assert.equal(context.scratch_bar_elements[0]._label.innerHTML, '1,3');
assert.equal(context.scratch_bar_jump_target(0).u, 4);
const forwardSnapshot = Array.from(context.scratch_bar_elements.slice(0, context.scratch_bar_count), bar =>
    [bar._sequenceIndex, bar._label.innerHTML, bar.style.width, bar._meta.textContent]);
context.render_main_bar_text(result, context.virtualElapsed);
assert.match(nodes.main_lngi_bar.innerHTML, /next ordinal/);

// Reverse the same chain and check the real targets, labels, widths and timers.
context.milestoneMulti = -2;
result = setPosition(3.2);
assert.equal(result[0], '60.000%');
assert.equal(context.scratch_bar_count, 2);
assert.equal(context.scratch_bar_elements[0]._label.innerHTML, '1,2');
assert.equal(context.scratch_bar_elements[1]._label.innerHTML, '1,2,2,2');
assert.deepEqual([context.scratch_bar_elements[0]._sequenceIndex, context.scratch_bar_elements[1]._sequenceIndex], [0, 3]);
near(parseFloat(context.scratch_bar_elements[0].style.width), 80);
near(parseFloat(context.scratch_bar_elements[1].style.width), 60);
near(parseFloat(nodes.main_lngi_bar.style.width), 60);
assert.equal(context.scratch_bar_elements[2].style.display, 'none');
near(context.scratch_bar_boundary(3, 3.2, true), 3.1875);
near(context.lt, (context.get_time_inv(3.2) - context.get_time_inv(3.1875)) / 1000, 1e-5);
context.render_main_bar_text(result, context.virtualElapsed);
assert.match(nodes.main_lngi_bar.innerHTML, /previous boundary/);

const oldWidth = parseFloat(context.scratch_bar_elements[0].style.width);
const oldTimer = context.lt;
setPosition(3.195);
assert.ok(parseFloat(context.scratch_bar_elements[0].style.width) > oldWidth);
assert.ok(context.lt < oldTimer);
result = setPosition(3.1875);
assert.equal(result[2], '1,2,2,2');
assert.equal(context.scratch_bar_count, 1); // the just-reached target is no longer a jump
assert.equal(context.scratch_bar_elements[0]._label.innerHTML, '1,2');
assert.equal(result[0], '81.250%');
near(context.lt, (context.get_time_inv(3.1875) - context.get_time_inv(3)) / 1000);
result = setPosition(3.187499);
assert.notEqual(result[2], '1,2,2,2');
assert.ok(context.lt >= 0);

// Clicking a reverse bar crosses its labeled boundary and immediately shows
// the next earlier sequence/countdown, even while paused or with an offset.
setPosition(3.2, 60000);
const target = context.scratch_bar_jump_target(context.scratch_bar_elements[1]._sequenceIndex);
const before = context.virtualElapsed + context.timeOffset;
assert.equal(target.shown, '1,2,2,2');
assert.equal(target.reversed, true);
assert.equal(context.scratch_bar_elements[1].click(), true);
assert.equal(savedJumps.at(-1), true);
assertAdvancedPast(target, before);
near(context.virtualElapsed + context.timeOffset, context.get_time_inv(target.u), 0.1);
assert.match(context.current_main_sequence, /^1,2,2,1,/);

setPosition(3.2, -86400000);
const firstTarget = context.scratch_bar_jump_target(context.scratch_bar_elements[0]._sequenceIndex);
const firstStart = context.virtualElapsed + context.timeOffset;
assert.equal(firstTarget.shown, '1,2');
assert.equal(context.scratch_bar_elements[0].click(), true);
assertAdvancedPast(firstTarget, firstStart);
near(context.virtualElapsed + context.timeOffset, context.get_time_inv(3), 0.1);
// Near a limit, floating-point truncation must not produce the invalid "1".
assert.match(context.current_main_sequence, /^1,1,1,/);

// A successor ending in 1 really does rewind to its prefix. Repeated clicks
// must immediately show the next countdown, then stop at the timeline start.
setPosition(2.6);
const successor = context.scratch_bar_jump_target(context.scratch_bar_elements[1]._sequenceIndex);
const successorStart = context.virtualElapsed;
assert.equal(successor.shown, '1,1,1');
assert.equal(context.scratch_bar_elements[1].click(), true);
assertAdvancedPast(successor, successorStart);
assert.equal(context.current_main_sequence, '1,1');
assert.equal(context.scratch_bar_count, 1);
const toStart = context.scratch_bar_jump_target(context.scratch_bar_elements[0]._sequenceIndex);
const beforeStart = context.virtualElapsed;
assert.equal(context.scratch_bar_elements[0].click(), true);
assertAdvancedPast(toStart, beforeStart);
for (const offset of [-60000, 60000]) {
    setPosition(2.3, offset);
    const startTarget = context.scratch_bar_jump_target(context.scratch_bar_elements[0]._sequenceIndex);
    const oldTime = context.virtualElapsed + offset;
    assert.equal(context.scratch_bar_elements[0].click(), true);
    assertAdvancedPast(startTarget, oldTime);
    assert.equal(context.virtualElapsed, -offset);
}

// Near a limit with a last term greater than 1, the truncated prefix is not the
// next sequence. Move far enough past the boundary to obtain its real chain.
setPosition(3.6);
const limitBar = context.scratch_bar_elements.slice(0, context.scratch_bar_count)
    .find(bar => bar._label.innerHTML === '1,2,4');
assert.ok(limitBar);
const limitTarget = context.scratch_bar_jump_target(limitBar._sequenceIndex);
const limitStart = context.virtualElapsed;
assert.equal(limitBar.click(), true);
assertAdvancedPast(limitTarget, limitStart);
assert.match(context.current_main_sequence, /^1,2,3,4,/);
near(context.virtualElapsed, context.get_time_inv(limitTarget.u), 0.1);
setPosition(3.76);
const deepLimitBar = context.scratch_bar_elements.slice(0, context.scratch_bar_count)
    .find(bar => bar._label.innerHTML === '1,2,4,8');
assert.ok(deepLimitBar);
const deepLimitTarget = context.scratch_bar_jump_target(deepLimitBar._sequenceIndex);
const deepLimitStart = context.virtualElapsed;
assert.equal(deepLimitBar.click(), true);
assertAdvancedPast(deepLimitTarget, deepLimitStart);
assert.match(context.current_main_sequence, /^1,2,4,7,/);
assert.ok(context.scratch_bar_count < context.super_list.length);

// A zero speed retains reverse direction and clicking must not resume playback.
context.milestoneMulti = 0;
context.paused = false;
setPosition(2.6);
const stationaryTarget = context.scratch_bar_jump_target(context.scratch_bar_elements[1]._sequenceIndex);
const stationaryStart = context.virtualElapsed;
assert.equal(context.scratch_bar_elements[1].click(), true);
assertAdvancedPast(stationaryTarget, stationaryStart);
assert.equal(context.current_main_sequence, '1,1');
assert.equal(context.milestoneMulti, 0);
assert.equal(context.paused, false);
context.milestoneMulti = -2;
context.paused = true;

// The alternate date view is refreshed to the following earlier boundary too.
context.tt = 1;
setPosition(3.2);
const dateTarget = context.scratch_bar_jump_target(context.scratch_bar_elements[1]._sequenceIndex);
const dateStart = context.virtualElapsed;
assert.equal(context.scratch_bar_elements[1].click(), true);
assertAdvancedPast(dateTarget, dateStart);
const nextDateBar = context.scratch_bar_elements[context.scratch_bar_count - 1];
const nextDate = context.get_time_inv(context.scratch_bar_boundary(nextDateBar._sequenceIndex, context.get_time(context.virtualElapsed), true));
assert.ok(nextDateBar._meta.textContent.includes(new Date(context.st + nextDate).toLocaleString()));
context.tt = 0;

// If no earlier sequence can be represented, leave the clock unchanged and
// signal the blocked click rather than landing back on the same boundary.
setPosition(3.2);
const blockedIndex = context.scratch_bar_elements[1]._sequenceIndex;
const blockedTarget = context.scratch_bar_jump_target(blockedIndex);
const blockedTime = context.virtualElapsed;
const savedCount = savedJumps.length;
const originalNumToLngi = context.num_to_lngi;
context.num_to_lngi = () => [blockedTarget.shown, 1, 0];
assert.equal(context.jump_to_reverse_scratch_bar(blockedIndex, blockedTarget), false);
assert.equal(context.virtualElapsed, blockedTime);
assert.equal(savedJumps.length, savedCount);
assert.ok(context.scratch_bar_elements[1].classList.contains('scratch-bar-blocked'));
context.num_to_lngi = originalNumToLngi;
assert.equal(context.jump_to_reverse_scratch_bar(blockedIndex, { u: 4, shown: '1,3' }), false);
assert.equal(context.virtualElapsed, blockedTime); // a stale future target cannot move forward

// A precision-limited next countdown must remain visible in milliseconds,
// rather than rounding down to "0 seconds left" after the click.
setPosition(3.76);
const fineBar = context.scratch_bar_elements[context.scratch_bar_count - 1];
const fineTarget = context.scratch_bar_jump_target(fineBar._sequenceIndex);
const fineStart = context.virtualElapsed;
assert.equal(fineBar.click(), true);
assertAdvancedPast(fineTarget, fineStart);
assert.ok(context.lt < 0.005);
assert.match(nodes.main_lngi_bar.innerHTML, /ms left/);

// A precision-limited chain still maps its last displayed slot to the right
// earlier target when a clock offset is in effect.
for (const offset of [-86400000, 86400000]) {
    setPosition(3.76, offset);
    const start = context.virtualElapsed + context.timeOffset;
    const bar = context.scratch_bar_elements[context.scratch_bar_count - 1];
    const target = context.scratch_bar_jump_target(bar._sequenceIndex);
    assert.equal(bar.click(), true);
    assertAdvancedPast(target, start);
}

// Real timeline chains must render each earlier target only once. Precision-
// limited and already-reached entries at x do not become unusable zero rows.
// Every retained slot keeps its original index and jumps to its displayed target.
for (const x of [2.3, 2.5, 2.6, 3, 3.01, 3.3, 3.5, 3.6, 3.75, 3.76, 3.765, 3.7655, 4]) {
    const result = setPosition(x);
    const start = context.virtualElapsed;
    const u = context.get_time(start);
    const count = context.scratch_bar_count;
    assert.ok(count > 0, `no earlier target at ${x}`);
    const bars = Array.from(context.scratch_bar_elements.slice(0, count));
    const boundaries = bars.map(bar => context.scratch_bar_boundary(bar._sequenceIndex, u, true));
    const targetTimes = boundaries.map(boundary => context.get_time_inv(boundary));
    assert.equal(new Set(boundaries).size, count, `duplicate boundary at ${x}`);
    assert.equal(new Set(targetTimes).size, count, `duplicate clock target at ${x}`);
    assert.equal(new Set(bars.map(bar => bar._label.innerHTML)).size, count, `duplicate label at ${x}`);
    assert.ok(boundaries.every(boundary => boundary < u), `current-boundary row at ${x}`);
    assert.ok(targetTimes.every(time => time < start), `zero-distance row at ${x}`);
    near(parseFloat(result[0]), parseFloat(bars[count - 1].style.width), 0.001);
    near(context.lt, (start - targetTimes[count - 1]) / 1000, 1e-5);
    assert.ok(context.lt > 0, `zero main countdown at ${x}`);
    for (let slot = 0; slot < count; slot++) {
        setPosition(x);
        const bar = context.scratch_bar_elements[slot];
        const target = context.scratch_bar_jump_target(bar._sequenceIndex);
        assert.equal(bar._label.innerHTML, target.shown);
        assert.equal(bar.click(), true, `jump ${x}, slot ${slot}`);
        assertAdvancedPast(target, start);
    }
}

// Keep the broadest interval for a shared target. Its progress must keep
// increasing, not reset, as rewinding crosses a nested forward boundary.
setPosition(3.250001);
const rootBefore = parseFloat(context.scratch_bar_elements[0].style.width);
setPosition(3.249999);
const rootAfter = parseFloat(context.scratch_bar_elements[0].style.width);
assert.ok(rootAfter > rootBefore && rootAfter - rootBefore < 0.001);
setPosition(3.203126);
const nestedBefore = parseFloat(context.scratch_bar_elements[1].style.width);
setPosition(3.203124);
const nestedAfter = parseFloat(context.scratch_bar_elements[1].style.width);
assert.ok(nestedAfter > nestedBefore && nestedAfter - nestedBefore < 0.01);

// At an exact integer, the previous root is the preceding integer, rather
// than the current instant; the shown label and the jump agree.
result = setPosition(3);
assert.equal(context.scratch_bar_elements[0]._label.innerHTML, '1,1');
assert.equal(context.scratch_bar_jump_target(0).u, 2);
assert.equal(result[0], '0.000%');
assert.equal(context.scratch_bar_elements[0].click(), true);
assert.equal(context.virtualElapsed, 0);

// A positive sub-millisecond countdown must not be rendered as zero seconds.
result = setPosition(3.76);
assert.ok(context.lt > 0 && context.lt < 0.005);
assert.match(result[1], /ms$/);
assert.match(context.scratch_bar_elements[context.scratch_bar_count - 1]._meta.textContent, /ms left/);
context.render_main_bar_text(result, context.virtualElapsed);
assert.match(nodes.main_lngi_bar.innerHTML, /ms left/);
// The same earlier target also drives the main bar on another tab.
const mainTimer = context.lt;
const mainPercent = result[0];
context.page = 0;
result = setPosition(3.76);
assert.equal(context.lt, mainTimer);
assert.equal(result[0], mainPercent);
assert.match(result[1], /ms$/);
context.page = 1;

// Limiting happens after deduplication: a long run of identical raw entries
// must not crowd out distinct earlier targets. Flash the retained display slot.
nodes.limit_scratch_bars.checked = true;
setPosition(3.76);
assert.ok(context.super_list.length > 40);
const indices = Array.from(context.scratch_bar_reverse_indices(context.get_time(context.virtualElapsed)));
assert.ok(indices.length < 40);
assert.equal(context.scratch_bar_count, indices.length);
assert.deepEqual(Array.from(context.scratch_bar_elements.slice(0, indices.length), bar => bar._sequenceIndex), indices);
const firstVisible = indices[0];
context.scratch_bar_blocked(firstVisible);
assert.ok(context.scratch_bar_elements[0].classList.contains('scratch-bar-blocked'));

// Turning the option off restores forward targets; zero retains the last
// direction, even while paused. Returning to positive speed restores forward.
nodes.limit_scratch_bars.checked = false;
setPosition(3.2);
context.milestoneMulti = 0;
assert.equal(context.progress_bars_reversed(), true);
setPosition(3.2);
assert.equal(context.scratch_bar_count, 2);
nodes.reverse_scratch_bars.checked = false;
setPosition(3.2);
assert.equal(context.scratch_bar_count, context.super_list.length);
assert.deepEqual(Array.from(context.scratch_bar_elements.slice(0, context.scratch_bar_count), bar =>
    [bar._sequenceIndex, bar._label.innerHTML, bar.style.width, bar._meta.textContent]), forwardSnapshot);
assert.equal(context.scratch_bar_jump_target(0).u, 4);
assert.equal(context.scratch_bar_elements[0]._label.innerHTML, '1,3');
context.milestoneMulti = -2;
setPosition(3.2);
const forwardTarget = context.scratch_bar_jump_target(context.scratch_bar_elements[0]._sequenceIndex);
assert.equal(context.scratch_bar_elements[0].click(), true);
assert.equal(context.current_main_sequence, forwardTarget.shown);
near(context.virtualElapsed, context.get_time_inv(forwardTarget.u), 0.1);
nodes.reverse_scratch_bars.checked = true;
context.milestoneMulti = 1;
setPosition(3.2);
assert.equal(context.progress_bars_reversed(), false);
assert.equal(context.scratch_bar_elements[0].click(), true);
assert.equal(context.current_main_sequence, '1,3');

// The clock can have advanced slightly while its mapped value still rounds to
// the first timeline value. It must still be possible to rewind that time.
context.milestoneMulti = -1;
context.timeOffset = 0;
context.virtualElapsed = 1e-7;
result = context.num_time(context.virtualElapsed);
assert.equal(context.get_time(context.virtualElapsed), 2);
assert.equal(context.scratch_bar_count, 1);
assert.equal(context.scratch_bar_elements[0].click(), true);
assert.equal(context.virtualElapsed, 0);

// Rewinding to zero shows the first sequence, and a pre-start clock clears
// stale bars. Coming back to zero must rebuild the previously cached chain.
context.virtualElapsed = 0;
result = context.num_time(0);
assert.equal(result[2], '1,1');
assert.equal(context.scratch_bar_count, 1);
context.render_main_bar_text(result, 0);
assert.equal(nodes.main_lngi_bar.innerHTML, 'Start of timeline');
assert.match(context.scratch_bar_elements[0]._meta.textContent, /start of timeline/);
assert.equal(context.scratch_bar_elements[0].title, 'Start of timeline');
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
