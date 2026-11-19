// Run with: node tests/time-direction.test.js
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const lngi = fs.readFileSync('lngi.js', 'utf8');
const ui = fs.readFileSync('ui.js', 'utf8');
const html = fs.readFileSync('main.html', 'utf8');
const between = (source, start, end) => source.slice(source.indexOf(start), source.indexOf(end));

function control(value = '') {
    return {
        value, checked: false, listeners: {}, style: {},
        get valueAsNumber() { return this.value === '' ? NaN : Number(this.value); },
        addEventListener(type, callback) { (this.listeners[type] ||= []).push(callback); },
        fire(type) { for (const callback of this.listeners[type] || []) callback(); }
    };
}
function storage(initial = {}) {
    const data = { ...initial };
    return {
        getItem: key => data[key] ?? null,
        setItem: (key, value) => { data[key] = String(value); }
    };
}

let now = 1000;
class ClockDate extends Date { static now() { return now; } }
function makeClock(saved) {
    const speed = control('1'), offset = control('0');
    const nodes = { input_timeSpeed: speed, input_timeOffset: offset, analysis_container: {} };
    const store = storage(saved ? { lngi_app_misc: JSON.stringify(saved) } : {});
    const saves = [];
    const context = {
        Date: ClockDate, console, player_time: 0, localStorage: store,
        document: { getElementById: id => nodes[id] || null },
        saveMisc: force => saves.push(force), updatePauseIndicator() {}
    };
    vm.createContext(context);
    vm.runInContext(
        between(lngi, 'var tt = 0', 'function formatSeconds(') +
        between(lngi, 'function isPaused()', 'function updatePauseIndicator()'), context
    );
    return { context, speed, offset, saves };
}

const clock = makeClock();
const c = clock.context;
assert.equal(clock.speed.value, '1');
c.pause = 3; c.virtualElapsed = 5000; c.lastRealTime = now;
now += 100;
c.setTimeSpeed(-2); // the previous +1 speed applies until this change
assert.equal(c.virtualElapsed, 5100);
assert.equal(c.milestoneMulti, -2);
assert.equal(clock.speed.value, '-2');
assert.equal(clock.saves.at(-1), true);
now += 50; c.advance_virtual_clock(now);
assert.equal(c.virtualElapsed, 5000);

// Editing the number field supports negative, fractional and zero speeds, and
// incomplete input must not silently reset the speed or the clock.
clock.speed.value = '-0.5'; clock.speed.fire('input');
assert.equal(c.milestoneMulti, -0.5);
assert.equal(c.lastTimeDirection, -1);
clock.speed.value = '-'; clock.speed.fire('input');
assert.equal(c.milestoneMulti, -0.5);
clock.speed.fire('change');
assert.equal(clock.speed.value, '-0.5');
clock.speed.value = '0'; clock.speed.fire('input');
assert.equal(c.milestoneMulti, 0);
assert.equal(c.lastTimeDirection, -1);
const stationary = c.virtualElapsed;
now += 500; c.advance_virtual_clock(now);
assert.equal(c.virtualElapsed, stationary);
c.setTimeSpeed(Infinity);
assert.equal(c.milestoneMulti, 0);

// Pausing and resuming applies the old state up to the instant of the toggle.
c.setTimeSpeed(2);
now += 20; c.togglePause();
const pausedAt = c.virtualElapsed;
now += 100; c.advance_virtual_clock(now);
assert.equal(c.virtualElapsed, pausedAt);
c.togglePause();
now += 20; c.advance_virtual_clock(now);
assert.equal(c.virtualElapsed, pausedAt + 40);

// Reverse playback stops exactly at elapsed zero, even with an offset, and can
// move forward immediately afterward. A pre-start save does not rewind forever.
c.virtualElapsed = 250; c.timeOffset = 100; c.lastRealTime = now;
c.setTimeSpeed(-2);
now += 200; c.advance_virtual_clock(now);
assert.equal(c.virtualElapsed + c.timeOffset, 0);
now += 1000; c.advance_virtual_clock(now);
assert.equal(c.virtualElapsed + c.timeOffset, 0);
c.setTimeSpeed(1);
now += 50; c.advance_virtual_clock(now);
assert.equal(c.virtualElapsed + c.timeOffset, 50);
c.virtualElapsed = -200; c.timeOffset = 100; c.lastRealTime = now;
c.setTimeSpeed(-1);
now += 100; c.advance_virtual_clock(now);
assert.equal(c.virtualElapsed + c.timeOffset, -100);
c.setTimeSpeed(1);
now += 100; c.advance_virtual_clock(now);
assert.equal(c.virtualElapsed + c.timeOffset, 0);

// Reload restores a zero speed's last direction and old saves infer direction
// from their signed multiplier without advancing the saved clock.
const restored = makeClock({ virtualElapsed: 123, timeOffset: 45, milestoneMulti: 0, lastTimeDirection: -1, pause: 2 });
assert.equal(restored.context.virtualElapsed, 123);
assert.equal(restored.context.timeOffset, 45);
assert.equal(restored.context.lastTimeDirection, -1);
assert.equal(restored.speed.value, '0');
const legacy = makeClock({ time: 321, milestoneMulti: -3, pause: 2 });
assert.equal(legacy.context.virtualElapsed, 321);
assert.equal(legacy.context.lastTimeDirection, -1);
assert.equal(legacy.speed.value, '-3');

// The direction option is autosaved and restored; an older settings record
// without it leaves the checked-by-default HTML value intact.
const settingsStore = storage();
const settingsNodes = new Map();
const getNode = id => {
    if (!settingsNodes.has(id)) settingsNodes.set(id, control('17'));
    return settingsNodes.get(id);
};
const settings = {
    Date: ClockDate, console, localStorage: settingsStore, scratch_bar_display: 'wY',
    virtualElapsed: 123, timeOffset: 45, milestoneMulti: -2, lastTimeDirection: -1,
    pause: 2, player_time: 123, setDisplayNotation() {},
    document: { getElementById: getNode, documentElement: { style: { setProperty() {} } } }
};
vm.createContext(settings);
vm.runInContext(between(ui, 'function saveAllSettings()', 'function flashButtonText('), settings);
settings.attachAutoSaveListeners();
getNode('reverse_scratch_bars').checked = false;
getNode('reverse_scratch_bars').fire('input');
assert.equal(JSON.parse(settingsStore.getItem('lngi_app_settings')).reverse_scratch_bars, false);
getNode('reverse_scratch_bars').checked = true;
settings.loadAllSettings();
assert.equal(getNode('reverse_scratch_bars').checked, false);
settingsStore.setItem('lngi_app_settings', JSON.stringify({ font_size: 16 }));
getNode('reverse_scratch_bars').checked = true;
settings.loadAllSettings();
assert.equal(getNode('reverse_scratch_bars').checked, true);

settings.saveMisc(true);
settings.milestoneMulti = 0;
settings.saveMisc(true); // forced changes must not be lost to the frame throttle
const persisted = JSON.parse(settingsStore.getItem('lngi_app_misc'));
assert.equal(persisted.milestoneMulti, 0);
assert.equal(persisted.lastTimeDirection, -1);

const speedMarkup = html.match(/<input[^>]+id="input_timeSpeed"[^>]*>/)[0];
assert.match(speedMarkup, /type="number"/);
assert.doesNotMatch(speedMarkup, /\bmin=/);
assert.match(html, /id="reverse_scratch_bars" checked/);
assert.match(html, /setTimeSpeed\(milestoneMulti \+ 1\)/);
assert.match(html, /setTimeSpeed\(milestoneMulti - 1\)/);
console.log('Time direction tests passed');
