// Run with: node --test tests/progress.test.cjs
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const root = path.join(__dirname, '..');
const elements = new Map();
const listeners = new Map();
function element(id) {
    if (!elements.has(id)) elements.set(id, {
        value: '0', style: {}, hidden: false, textContent: '', innerHTML: '',
        parentElement: { setAttribute() {} },
        addEventListener(type, fn) {
            const key = `${id}:${type}`;
            if (!listeners.has(key)) listeners.set(key, []);
            listeners.get(key).push(fn);
        },
        appendChild() {},
    });
    return elements.get(id);
}
function trigger(id, type) {
    for (const fn of listeners.get(`${id}:${type}`) || []) fn();
}
const storage = new Map();
const context = vm.createContext({
    console: { log() {}, warn() {}, error() {} }, Date, Math, Number,
    document: { getElementById: element, createElement: () => element(Math.random()),
        querySelectorAll: () => [], getElementsByClassName: () => [] },
    window: { addEventListener() {} },
    localStorage: {
        getItem(k) { return storage.has(k) ? storage.get(k) : null; },
        setItem(k, v) { storage.set(k, String(v)); },
    },
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

test('+1 refreshes the same searched progress on both progress pages', () => {
    element('ordinal_walk_max_terms').value = '5';
    element('ordinal_walk_base').value = '10';
    search('1,1');
    run('ordinal_plus_one(); update_search_progress()');
    assert.equal(element('main_lngi_Content').textContent, '1,1,1');
    assert.equal(element('main_lngi_bar').style.width, '25%');
    run('ordinal_plus_one(); ordinal_plus_one(); page = 7; update_search_progress()');
    assert.equal(element('main_lngi_Content').textContent, '1,1,1,1,1');
    assert.equal(element('main_lngi_bar').style.width, '43.75%');
    element('MaxTerms').value = '2';
    run('update_search_progress()');
    assert.match(element('search_progress_source').textContent, /Max ω-Y Terms: 2/);
    for (let i = 0; i < 53; i++) {
        if (!element(`bar_${i}`).hidden) assert.ok(!element(`bar_${i}`).innerHTML.includes('1,1,1'));
    }
});

test('+1 takes successor and auto-maximizes on base limit or terms limit', () => {
    // Base limit reached before terms limit: base=3, max=10
    // Must reach ω+3, ω2+3, and ω3+3 (1,2,1,2,1,2,1,1,1) before maximizing to ω^2 (1,2,2)
    element('ordinal_walk_max_terms').value = '10';
    element('ordinal_walk_base').value = '3';
    search('1,1');
    const seenBase3 = [];
    for (let i = 0; i < 14; i++) {
        run('ordinal_plus_one()');
        seenBase3.push(element('search_input').value);
    }
    assert.deepEqual(seenBase3, [
        '1,1,1', '1,2',
        '1,2,1', '1,2,1,1', '1,2,1,1,1', '1,2,1,2',
        '1,2,1,2,1', '1,2,1,2,1,1', '1,2,1,2,1,1,1', '1,2,1,2,1,2',
        '1,2,1,2,1,2,1', '1,2,1,2,1,2,1,1', '1,2,1,2,1,2,1,1,1', '1,2,2',
    ]);

    // With enough terms (max=20), base=3 visits every a*ω^2 + b*ω + c (0 <= a,b,c <= 3)
    // reaching ω^2*3 + ω3 + 3 before maximizing to ω^3 (1,2,2,2) in 4^3 - 2 = 62 clicks
    element('ordinal_walk_max_terms').value = '20';
    element('ordinal_walk_base').value = '3';
    search('1,1');
    let prevBase3 = '1,1';
    for (let i = 0; i < 62; i++) {
        run('ordinal_plus_one()');
        if (i === 60) assert.equal(element('search_input').value, '1,2,2,1,2,2,1,2,2,1,2,1,2,1,2,1,1,1');
        prevBase3 = element('search_input').value;
    }
    assert.equal(prevBase3, '1,2,2,2');

    // Base=2 with max=10: 2 -> ω -> ω+1 -> ω+2 -> ω2 -> ω2+1 -> ω2+2 -> ω^2
    element('ordinal_walk_max_terms').value = '10';
    element('ordinal_walk_base').value = '2';
    search('1,1');
    const seenBase2 = [];
    for (let i = 0; i < 7; i++) {
        run('ordinal_plus_one()');
        seenBase2.push(element('search_input').value);
    }
    assert.deepEqual(seenBase2, [
        '1,2', '1,2,1', '1,2,1,1', '1,2,1,2', '1,2,1,2,1', '1,2,1,2,1,1', '1,2,2',
    ]);

    // Base=2 with max=5 walks cleanly to 1,3 and wraps back to 1,1
    element('ordinal_walk_max_terms').value = '5';
    element('ordinal_walk_base').value = '2';
    search('1,1');
    let steps = 0;
    let prev = '1,1';
    while (prev !== '1,3' && steps < 200) {
        run('ordinal_plus_one()');
        const cur = element('search_input').value;
        assert.equal(run(`Y_Sequence.cmp('${cur}', '${prev}') > 0`), true);
        assert.ok(cur.split(',').length <= 5, `exceeded max terms: ${cur}`);
        assert.equal(run(`ordinal_walk_standard([${cur}])`), true, `non-standard: ${cur}`);
        prev = cur;
        steps++;
    }
    assert.equal(prev, '1,3');
    assert.equal(steps, 21);
    run('ordinal_plus_one()');
    assert.equal(element('search_input').value, '1,1');

    // Reaching ω^4 (1,2,2,2,2) via +1 at base=3 automatically updates to ω^ω (1,2,3)
    element('ordinal_walk_max_terms').value = '10';
    element('ordinal_walk_base').value = '3';
    search('1,2,2,2,1,2,2,2,1,2');
    run('ordinal_plus_one()');
    assert.equal(element('search_input').value, '1,2,3');

    // Terms limit reached before base limit: base=10, max=5
    element('ordinal_walk_max_terms').value = '5';
    element('ordinal_walk_base').value = '10';
    search('1,1');
    const seenTerms5 = [];
    for (let i = 0; i < 10; i++) {
        run('ordinal_plus_one()');
        seenTerms5.push(element('search_input').value);
    }
    assert.deepEqual(seenTerms5, [
        '1,1,1', '1,1,1,1', '1,1,1,1,1', '1,2',
        '1,2,1', '1,2,1,1', '1,2,1,1,1', '1,2,1,2', '1,2,1,2,1', '1,2,2',
    ]);
});

test('maximizeordinal handles direct calls, base changes reset clicks, and UI has Base without Max', () => {
    assert.equal(run(`maximizeordinal('1,1,1', 3, 10)`), '1,1,1');
    assert.equal(run(`maximizeordinal('1,1,1,1', 3, 10)`), '1,2');
    assert.equal(run(`maximizeordinal('1,2,1,2,1,2,1,1,1', 3, 10)`), '1,2,1,2,1,2,1,1,1');
    assert.equal(run(`maximizeordinal('1,2,1,2,1,2,1,1,1,1', 3, 10)`), '1,2,2');
    // Higher limit ordinals at base=3: ω^4 -> ω^ω, ω^(ω4) -> ω^(ω^2), ω^(ω^4) -> ω^(ω^ω), ω^^4 -> ε_0
    assert.equal(run(`maximizeordinal('1,2,2,2', 3, 10)`), '1,2,2,2');
    assert.equal(run(`maximizeordinal('1,2,2,2,2', 3, 10)`), '1,2,3');
    assert.equal(run(`maximizeordinal('1,2,3,2,3,2,3,2,3', 3, 10)`), '1,2,3,3');
    assert.equal(run(`maximizeordinal('1,2,3,3,3,3', 3, 10)`), '1,2,3,4');
    assert.equal(run(`maximizeordinal('1,2,3,4', 3, 10)`), '1,2,3,4');
    assert.equal(run(`maximizeordinal('1,2,3,4,5', 3, 10)`), '1,2,4');
    assert.equal(run(`maximizeordinal('1,2,4,8', 3, 10)`), '1,3');
    // Base=2 and base=4 thresholds on ω^k -> ω^ω
    assert.equal(run(`maximizeordinal('1,2,2,2', 2, 10)`), '1,2,3');
    assert.equal(run(`maximizeordinal('1,2,3', 2, 10)`), '1,2,3');
    assert.equal(run(`maximizeordinal('1,2,2,2,2', 4, 10)`), '1,2,2,2,2');
    assert.equal(run(`maximizeordinal('1,2,2,2,2,2', 4, 10)`), '1,2,3');
    // Terms limit
    assert.equal(run(`maximizeordinal('1,2,1,1,1,1', 10, 5)`), '1,2,1,2');

    // Changing base resets clicks and restarts the walk at 1,1 on next +1
    element('ordinal_walk_max_terms').value = '10';
    element('ordinal_walk_base').value = '3';
    search('1,1');
    trigger('search_input', 'input');
    run('ordinal_plus_one(); ordinal_plus_one()');
    assert.equal(run('clicks'), 2);
    element('ordinal_walk_base').value = '4';
    trigger('ordinal_walk_base', 'input');
    assert.equal(run('clicks'), 0);
    run('ordinal_plus_one()');
    assert.equal(element('search_input').value, '1,1');
    assert.equal(run('clicks'), 1);

    // Check HTML and ui.js wiring
    const html = fs.readFileSync(path.join(root, 'main.html'), 'utf8');
    const uiJs = fs.readFileSync(path.join(root, 'ui.js'), 'utf8');
    assert.ok(html.includes('id="ordinal_walk_base"'));
    assert.ok(!html.includes('id="ordinal_max"'));
    assert.ok(uiJs.includes('ordinal_walk_base'));
});

test('invalid input falls back safely and later milestones cannot overfill the cap', () => {
    search('invalid');
    assert.equal(element('main_lngi_bar').style.width, '0%');
    assert.equal(element('main_lngi_Content').textContent, '1,1');
    search('1,4');
    assert.equal(element('main_lngi_bar').style.width, '100%');
    assert.ok(Array.from({ length: 53 }, (_, i) => element(`bar_${i}`).hidden).every(Boolean));
});
