const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { test } = require("node:test");

// Load the real browser scripts with only their startup DOM dependencies stubbed.
const elements = new Map();
function getElement(id) {
    if (!elements.has(id)) {
        elements.set(id, {
            style: {},
            value: "",
            appendChild() {},
            addEventListener() {}
        });
    }
    return elements.get(id);
}

const runtime = vm.createContext({
    console: { log() {}, error: console.error },
    document: {
        getElementById: getElement,
        createElement: () => ({ style: {} }),
        querySelectorAll: () => []
    },
    window: { addEventListener() {} },
    localStorage: { getItem: () => null },
    analysisPanels: [],
    page: 0
});

for (const filename of ["conv.js", "search.js", "lngi.js"]) {
    const source = fs.readFileSync(path.join(__dirname, "..", filename), "utf8");
    vm.runInContext(source, runtime, { filename, timeout: 10000 });
}

const DAY_MS = 86400000;
const startTime = vm.runInContext("st", runtime);
const stages = [
    { ordinal: "1,2,4,8,12", days: 100 },
    { ordinal: "1,2,4,8,12,16", days: 300 },
    { ordinal: "1,2,4,8,12,16,20", days: 600 },
    { ordinal: "1,2,4,8,12,16,20,24", days: 1000 },
    { ordinal: "1,2,4,8,12,16,20,24,28", days: 1500 },
    { ordinal: "1,2,4,8,12,16,20,24,28,32", days: 2100 },
    { ordinal: "1,2,4,8,12,16,20,24,28,32,36", days: 2800 },
    { ordinal: "1,2,4,8,12,16,20,24,28,32,36,40", days: 3600 }
];

function assertClose(actual, expected, tolerance) {
    assert.ok(Math.abs(actual - expected) <= tolerance,
        `Expected ${actual} to be within ${tolerance} of ${expected}`);
}

test("starts at 1,1 and does not advance before the start", () => {
    assert.equal(runtime.get_time(0), 2);
    assert.equal(runtime.get_time(-DAY_MS), 2);
    assert.equal(runtime.num_to_lngi(runtime.get_time(0))[0], "1,1");
    assert.equal(runtime.get_time_inv(2), 0);
});

stages.forEach(({ ordinal, days }, index) => {
    test(`reaches ${ordinal} on day ${days} after a ${(index + 1) * 100}-day leg`, () => {
        // Search uses the actual Y-sequence implementation, independently of the timeline.
        const value = runtime.search_time(ordinal)[0];
        const elapsed = days * DAY_MS;
        assert.equal(runtime.get_time(elapsed), value);
        assert.equal(runtime.num_to_lngi(value)[0], ordinal);
        assert.equal(runtime.get_time_inv(value), elapsed);
        assert.equal(runtime.num_time(startTime + elapsed)[2], ordinal);
        assert.ok(Number.isFinite(runtime.lt) && runtime.lt >= 0);

        const previousValue = index === 0 ? 2 : runtime.search_time(stages[index - 1].ordinal)[0];
        assert.equal(runtime.get_time_inv(value) - runtime.get_time_inv(previousValue),
            (index + 1) * 100 * DAY_MS);
    });
});

test("interpolates continuously and monotonically through every leg", () => {
    let previousTime = 0;
    let previousValue = 2;
    for (const { ordinal, days } of stages) {
        const endTime = days * DAY_MS;
        const endValue = runtime.search_time(ordinal)[0];
        let lastValue = previousValue;
        for (let step = 1; step <= 16; step++) {
            const elapsed = previousTime + (endTime - previousTime) * step / 16;
            const value = runtime.get_time(elapsed);
            assert.ok(value > lastValue && value <= endValue);
            assertClose(value, previousValue + (endValue - previousValue) * step / 16, 1e-14);
            assertClose(runtime.get_time_inv(value), elapsed, 1);
            lastValue = value;
        }
        assert.ok(runtime.get_time(endTime - 1) < endValue);
        assert.ok(runtime.get_time(endTime + 1) > endValue);
        previousTime = endTime;
        previousValue = endValue;
    }
});

test("forward and inverse agree at intermediate times and ordinal values", () => {
    for (const days of [0.00001, 0.5, 50, 99.9, 101, 450, 999, 1499, 2000, 2799, 3599]) {
        const elapsed = days * DAY_MS;
        assertClose(runtime.get_time_inv(runtime.get_time(elapsed)), elapsed, 1);
    }
    for (const value of [2, 2.5, 3, 3.25, 3.5, 3.75, 3.76, 3.762, 3.764, 3.7655, 4]) {
        assertClose(runtime.get_time(runtime.get_time_inv(value)), value, 1e-14);
    }
});

test("continues at the final leg's rate after the sequence ending in 40", () => {
    const finalValue = runtime.search_time(stages.at(-1).ordinal)[0];
    const priorValue = runtime.search_time(stages.at(-2).ordinal)[0];
    const futureTime = (3600 + 800) * DAY_MS;
    const futureValue = finalValue + (finalValue - priorValue);
    assert.equal(runtime.get_time(futureTime), futureValue);
    assert.equal(runtime.get_time_inv(futureValue), futureTime);
});
