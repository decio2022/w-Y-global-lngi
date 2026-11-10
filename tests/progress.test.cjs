// Run with: node --test tests/progress.test.cjs
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const root = path.join(__dirname, '..');
const elements = new Map();
function element(id) {
    if (!elements.has(id)) elements.set(id, {
        value: '0', style: {}, hidden: false, textContent: '', innerHTML: '',
        parentElement: { setAttribute() {} },
        addEventListener() {}, appendChild() {},
    });
    return elements.get(id);
}
const context = vm.createContext({
    console: { log() {}, warn() {}, error() {} }, Date, Math, Number,
    document: { getElementById: element, createElement: () => element(Math.random()),
        querySelectorAll: () => [], getElementsByClassName: () => [] },
    window: { addEventListener() {} },
    localStorage: { getItem() { return null; }, setItem() {} },
    analysisPanels: [], page: 1, scratch_bar_display: 'wY', player_time: 0,
});
for (const file of ['conv.js', 'search.js', 'lngi.js']) {
    vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), context);
}
function run(code) { return vm.runInContext(code, context); }
function search(sequence) {
    element('search_input').value = sequence;
    run('search_time(); update_search_progress()');
}

test('top milestone is fixed at 1,3 and follows search, not time', () => {
    for (const [sequence, percent] of [['1,1', 0], ['1,2', 50], ['1,2,2', 56.25], ['1,3', 100]]) {
        search(sequence);
        assert.equal(element('main_lngi_bar').style.width, `${percent}%`);
        assert.match(element('main_lngi_bar').textContent, /1,3 \(final milestone\)/);
        assert.equal(element('main_lngi_Content').textContent, sequence);
    }
    run('virtualElapsed += 1e12; timeOffset += 1e12; update_search_progress()');
    assert.equal(element('main_lngi_bar').style.width, '100%');
});

test('lower bars retain original local milestone percentages and obey MaxTerms', () => {
    const original = run(`num_to_lngi(3.125); JSON.stringify(super_list)`);
    const expected = JSON.parse(original).map(([ord, depth, remaining], i, all) => ({
        ordinal: ord + (i === all.length - 1 ? ',1' : ''),
        depth, percent: (1 - remaining) * 100,
    })).filter(bar => bar.ordinal !== '1,3');
    assert.deepEqual(JSON.parse(run('JSON.stringify(progress_model(3.125, 0).bars)')), expected);
    for (const limit of [1, 2, 3, 4, 5, 10]) {
        const bars = JSON.parse(run(`JSON.stringify(progress_model(3.125, ${limit}).bars)`));
        assert.ok(bars.every(bar => bar.ordinal.split(',').length <= limit));
        assert.ok(bars.every(bar => bar.percent >= 0 && bar.percent <= 100));
    }
    assert.equal(run('progress_model(4, 0).bars.length'), 0);
});

test('+1 and Max refresh the same searched progress on both progress pages', () => {
    element('ordinal_walk_max_terms').value = '5';
    search('1,1');
    run('ordinal_plus_one(); update_search_progress()');
    assert.equal(element('main_lngi_Content').textContent, '1,1,1');
    assert.equal(element('main_lngi_bar').style.width, '25%');
    run('ordinal_max(); page = 7; update_search_progress()');
    assert.equal(element('main_lngi_Content').textContent, '1,1,1,1,1');
    assert.equal(element('main_lngi_bar').style.width, '43.75%');
    element('MaxTerms').value = '2';
    run('update_search_progress()');
    assert.match(element('search_progress_source').textContent, /Max ω-Y Terms: 2/);
    for (let i = 0; i < 53; i++) {
        if (!element(`bar_${i}`).hidden) assert.ok(!element(`bar_${i}`).innerHTML.includes('1,1,1'));
    }
});

test('invalid input falls back safely and later milestones cannot overfill the cap', () => {
    search('invalid');
    assert.equal(element('main_lngi_bar').style.width, '0%');
    assert.equal(element('main_lngi_Content').textContent, '1,1');
    search('1,4');
    assert.equal(element('main_lngi_bar').style.width, '100%');
    assert.ok(Array.from({ length: 53 }, (_, i) => element(`bar_${i}`).hidden).every(Boolean));
});
