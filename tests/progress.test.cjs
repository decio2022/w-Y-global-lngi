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
    if (!elements.has(id)) {
        const classes = new Set();
        elements.set(id, {
            value: '0', style: {}, hidden: false, textContent: '', innerHTML: '',
            classList: {
                add: c => classes.add(c),
                remove: c => classes.delete(c),
                toggle: (c, force) => force === undefined
                    ? (classes.has(c) ? (classes.delete(c), false) : (classes.add(c), true))
                    : (force ? (classes.add(c), true) : (classes.delete(c), false)),
                contains: c => classes.has(c),
            },
            parentElement: { setAttribute() {} },
            addEventListener(type, fn) {
                const key = `${id}:${type}`;
                if (!listeners.has(key)) listeners.set(key, []);
                listeners.get(key).push(fn);
            },
            appendChild() {},
        });
    }
    return elements.get(id);
}
function trigger(id, type, event) {
    for (const fn of listeners.get(`${id}:${type}`) || []) fn(event);
}
const storage = new Map();
const context = vm.createContext({
    console: { log() {}, warn() {}, error() {} }, Date, Math, Number, setTimeout, clearTimeout,
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

    // Reaching ω^ω^ω^ω^(ε_0+1) via +1 at base=3 automatically updates to ε_1 (1,2,4,4)
    element('ordinal_walk_max_terms').value = '10';
    element('ordinal_walk_base').value = '3';
    search('1,2,4,3,5,4,6,4,6,4');
    run('ordinal_plus_one()');
    assert.equal(element('search_input').value, '1,2,4,4');

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
    // ε_{α+1} and skipped-tower limits: at base=3, height-3 towers stay while
    // height-4 towers ω^ω^ω^ω^(α+1) maximize directly to ε_{α+1} (matching ω^^4 -> ε_0)
    assert.equal(run(`maximizeordinal('1,2,4,3,5,4', 3, 10)`), '1,2,4,3,5,4');
    assert.equal(run(`maximizeordinal('1,2,4,3,5,4,6', 3, 10)`), '1,2,4,3,5,4,6');
    assert.equal(run(`maximizeordinal('1,2,4,3,5,4,6,5', 3, 10)`), '1,2,4,4');
    assert.equal(run(`maximizeordinal('1,2,4,3,5,4,6,5,7', 3, 10)`), '1,2,4,4');
    assert.equal(run(`maximizeordinal('1,2,4,3,5,4,6,5', 4, 15)`), '1,2,4,3,5,4,6,5');
    assert.equal(run(`maximizeordinal('1,2,4,3,5,4,6,5,7,6', 4, 15)`), '1,2,4,4');
    assert.equal(run(`maximizeordinal('1,2,4,4,3,5,5,4,6,6,5', 3, 15)`), '1,2,4,4,4');
    assert.equal(run(`maximizeordinal('1,2,4,5,3,5,6,4,6,7,5', 3, 15)`), '1,2,4,5,4');
    assert.equal(run(`maximizeordinal('1,2,4,6,3,5,7,4,6,8,5', 3, 15)`), '1,2,4,6,4');
    assert.equal(run(`maximizeordinal('1,2,4,5,7,6,8,7,9,8', 3, 15)`), '1,2,4,5,7,7');
    assert.equal(run(`maximizeordinal('1,2,4,4,1,2,4,3,5,4,6,5', 3, 15)`), '1,2,4,4,1,2,4,4');
    // Higher power-of-2 skipped tower: ψ(Ω_ω + Ω_4) stays at base=4, ψ(Ω_ω + Ω_5) -> ψ(Ω_ω*2)
    assert.equal(run(`maximizeordinal('1,2,4,8,7,12,11,17,16', 4, 15)`), '1,2,4,8,7,12,11,17,16');
    assert.equal(run(`maximizeordinal('1,2,4,8,7,12,11,17,16,23,22', 4, 15)`), '1,2,4,8,8');
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

test('comparison mode computes exact +1 step counts, skipped targets, and edge cases', () => {
    // Exact step counts verified against +1 walk
    const exactCases = [
        ['1,1', '1,2', 10, 3, 2n, false, '1,2'],
        ['1,1', '1,2,2', 10, 3, 14n, false, '1,2,2'],
        ['1,1', '1,2,3', 10, 3, 61n, false, '1,2,3'],
        ['1,1', '1,2,4', 10, 3, 1254n, false, '1,2,4'],
        ['1,2,4', '1,2,4,4', 10, 3, 2971n, false, '1,2,4,4'],
        ['1,1', '1,2,4,4', 10, 3, 4225n, false, '1,2,4,4'],
        ['1,2,4', '1,2,4,1,2,4', 10, 3, 146n, false, '1,2,4,1,2,4'],
        ['1,1', '1,3', 5, 2, 21n, false, '1,3'],
        ['1,1', '1,3', 7, 3, 1634n, false, '1,3'],
        // Skipped targets: base limit, terms limit, skipped tower
        ['1,1', '1,1,1,1', 10, 3, 2n, true, '1,2'],
        ['1,2,4', '1,2,4,1,1', 4, 3, 2n, true, '1,2,4,2'],
        ['1,2,4', '1,2,4,3,5,4,6,5', 10, 3, 2971n, true, '1,2,4,4'],
        // Non-fixed starts (base-skipped and length > maxTerms)
        ['1,1,1,1', '1,2,2', 10, 3, 13n, false, '1,2,2'],
        ['1,1,1,1', '1,1,1,1,1', 10, 3, 1n, true, '1,2'],
        ['1,1,1,1,1', '1,2', 4, 10, 1n, false, '1,2'],
    ];
    for (const [start, target, maxTerms, base, steps, skipped, effTarget] of exactCases) {
        const res = run(`ordinal_walk_count_steps(${JSON.stringify(start)}, ${JSON.stringify(target)}, ${maxTerms}, ${base})`);
        assert.equal(res.status, 'ok', `${start} -> ${target}`);
        assert.equal(res.steps, steps, `${start} -> ${target}`);
        assert.equal(res.skippedTarget, skipped, `${start} -> ${target}`);
        assert.equal(res.effectiveTarget, effTarget, `${start} -> ${target}`);
    }

    // Brute-force agreement on a full walk
    const fullSeqs = run(`(() => {
        const out = ['1,1'];
        let cur = [1, 1];
        while (cur.join(',') !== '1,3') {
            cur = ordinal_walk_next(cur, 5, 3);
            out.push(cur.join(','));
        }
        return out;
    })()`);
    const lastIdx = fullSeqs.length - 1;
    for (const [i, j] of [[0, 1], [0, lastIdx], [3, 15], [7, 29], [12, lastIdx]]) {
        const res = run(`ordinal_walk_count_steps(${JSON.stringify(fullSeqs[i])}, ${JSON.stringify(fullSeqs[j])}, 5, 3)`);
        assert.equal(res.status, 'ok');
        assert.equal(res.steps, BigInt(j - i));
        assert.equal(res.skippedTarget, false);
    }

    // Chunked execution matches synchronous execution exactly
    const chunked = run(`(() => {
        const c = ordinal_walk_create_counter('1,1', '1,2,4', 10, 3);
        let ticks = 0;
        let t;
        do { t = c.step(25); ticks++; } while (!t.done);
        return { ticks, steps: t.result.steps, status: t.result.status };
    })()`);
    assert.equal(chunked.status, 'ok');
    assert.equal(chunked.steps, 1254n);
    assert.ok(chunked.ticks > 1, 'expected multi-chunk execution');

    // Same, start > target, and invalid inputs
    const same = run(`ordinal_walk_count_steps('1,2,2', '1,2,2', 10, 3)`);
    assert.equal(same.status, 'same');
    assert.equal(same.steps, 0n);

    const greater = run(`ordinal_walk_count_steps('1,2,3', '1,2,2', 10, 3)`);
    assert.equal(greater.status, 'start_greater');

    assert.equal(run(`ordinal_walk_count_steps('', '1,2', 10, 3)`).status, 'invalid_start');
    assert.equal(run(`ordinal_walk_count_steps('1,0', '1,2', 10, 3)`).status, 'invalid_start');
    assert.equal(run(`ordinal_walk_count_steps('1', '1,2', 10, 3)`).status, 'invalid_start');
    assert.equal(run(`ordinal_walk_count_steps('1,4', '1,3', 10, 3)`).reason, 'above_cap');
    assert.equal(run(`ordinal_walk_count_steps('1,1', '1,2,5', 10, 3)`).reason, 'non_standard');
    assert.equal(run(`ordinal_walk_count_steps('1,1', '1,2', 1, 3)`).status, 'invalid_max_terms');
    assert.equal(run(`ordinal_walk_count_steps('1,1', '1,2', 10, 1)`).status, 'invalid_base');
});

test('comparison mode UI renders step count & status, supports cancel, and wires Compare tab', async () => {
    // Normal run
    element('compare_start').value = '1,1';
    element('compare_target').value = '1,2,2';
    element('compare_max_terms').value = '10';
    element('compare_base').value = '3';
    run('ordinal_compare_run()');
    assert.match(element('compare_result').innerHTML, /14 steps/);
    assert.ok(!element('compare_result').innerHTML.includes('compare-result-note'));
    assert.equal(element('compare_cancel').hidden, true);

    // Singular "1 step" and Enter key trigger
    element('compare_start').value = '1,1';
    element('compare_target').value = '1,1,1';
    trigger('compare_target', 'keydown', { key: 'Enter' });
    assert.match(element('compare_result').innerHTML, /1 step<\/div>/);

    // Skipped target note
    element('compare_start').value = '1,1';
    element('compare_target').value = '1,1,1,1';
    run('ordinal_compare_run()');
    assert.match(element('compare_result').innerHTML, /2 steps/);
    assert.match(element('compare_result').innerHTML, /compare-result-note/);
    assert.match(element('compare_result').innerHTML, /1,2/);

    // Same sequence and start > target
    element('compare_start').value = '1,2';
    element('compare_target').value = '1,2';
    run('ordinal_compare_run()');
    assert.match(element('compare_result').innerHTML, /0 steps/);

    element('compare_start').value = '1,2,3';
    element('compare_target').value = '1,2';
    run('ordinal_compare_run()');
    assert.match(element('compare_result').innerHTML, /greater than target/);

    // Invalid input
    element('compare_start').value = '1,2,5';
    element('compare_target').value = '1,3';
    run('ordinal_compare_run()');
    assert.match(element('compare_result').innerHTML, /not a standard/);

    // Async chunked job + cancel button
    element('compare_start').value = '1,1';
    element('compare_target').value = '1,3';
    element('compare_max_terms').value = '9';
    element('compare_base').value = '3';
    const asyncRet = run('ordinal_compare_run()');
    assert.equal(asyncRet, null);
    assert.equal(element('compare_cancel').hidden, false);
    assert.match(element('compare_result').innerHTML, /Calculating steps/);
    run('ordinal_compare_cancel()');
    assert.equal(element('compare_cancel').hidden, true);
    assert.match(element('compare_result').innerHTML, /Comparison cancelled/);

    // Async chunked completion (small enough to finish quickly in test)
    element('compare_start').value = '1,1';
    element('compare_target').value = '1,3';
    element('compare_max_terms').value = '8';
    element('compare_base').value = '3';
    run('ordinal_compare_run()');
    await new Promise(resolve => {
        const check = () => {
            if (element('compare_cancel').hidden && /8,696 steps/.test(element('compare_result').innerHTML)) {
                resolve();
            } else {
                setTimeout(check, 5);
            }
        };
        setTimeout(check, 5);
    });
    assert.match(element('compare_result').innerHTML, /8,696 steps/);

    // Verify Compare tab wiring in main.html & ui.js
    const html = fs.readFileSync(path.join(root, 'main.html'), 'utf8');
    assert.ok(html.includes('id="btn_compare"'));
    assert.ok(html.includes('id="compare-mode"'));
    assert.ok(html.includes('id="compare_start"'));
    assert.ok(html.includes('id="compare_target"'));
    assert.ok(html.includes('id="compare_max_terms"'));
    assert.ok(html.includes('id="compare_base"'));
    assert.ok(html.includes('id="compare_run"'));
    assert.ok(html.includes('id="compare_cancel"'));
    assert.ok(html.includes('id="compare_result"'));

    // Execute ui.js in an isolated context to verify tab switching and settings save/load
    const uiEls = new Map();
    const uiListeners = new Map();
    const uiStorage = new Map();
    const uiEl = id => {
        if (id === 'mile_date' || id === 'mile_month' || id === 'mile_year') return null;
        if (!uiEls.has(id)) uiEls.set(id, {
            id, value: '', style: { display: '' }, checked: false, hidden: false,
            addEventListener(t, fn) { uiListeners.set(`${id}:${t}`, fn); },
        });
        return uiEls.get(id);
    };
    const uiCtx = vm.createContext({
        console: { log() {}, warn() {}, error() {} },
        Date, Math, Number, String, JSON, Object, Array,
        document: {
            getElementById: uiEl,
            querySelector: () => ({ style: {} }),
            querySelectorAll: () => [],
            addEventListener() {},
            body: { style: {} },
        },
        window: { addEventListener() {} },
        localStorage: {
            getItem: k => uiStorage.has(k) ? uiStorage.get(k) : null,
            setItem: (k, v) => uiStorage.set(k, String(v)),
        },
        update_search_progress() {},
        update_milestone_display() {},
        update_milestone_countdown() {},
        setInterval() {},
    });
    vm.runInContext(fs.readFileSync(path.join(root, 'ui.js'), 'utf8'), uiCtx);
    vm.runInContext('update_page()', uiCtx);
    assert.equal(uiEl('compare-mode').hidden, true);
    assert.equal(uiEl('compare-mode').style.display, 'none');
    assert.equal(uiEl('future-milestone').hidden, false);
    uiListeners.get('btn_compare:click')();
    assert.equal(vm.runInContext('page', uiCtx), 8);
    assert.equal(uiEl('compare-mode').hidden, false);
    assert.equal(uiEl('compare-mode').style.display, 'flex');
    assert.equal(uiEl('future-milestone').hidden, true);
    assert.equal(uiEl('future-milestone').style.display, 'none');

    // Settings round-trip for compare inputs (including compare_mode & compare_steps)
    uiEl('compare_start').value = '1,2';
    uiEl('compare_target').value = '1,2,4';
    uiEl('compare_steps').value = '2500';
    uiEl('compare_max_terms').value = '12';
    uiEl('compare_base').value = '4';
    uiCtx.ordinal_compare_mode = 'advance';
    let restoredMode = null;
    uiCtx.ordinal_compare_set_mode = m => { restoredMode = m; };
    vm.runInContext('saveAllSettings()', uiCtx);
    uiEl('compare_start').value = '';
    uiEl('compare_target').value = '';
    uiEl('compare_steps').value = '';
    uiEl('compare_max_terms').value = '';
    uiEl('compare_base').value = '';
    vm.runInContext('loadAllSettings()', uiCtx);
    assert.equal(uiEl('compare_start').value, '1,2');
    assert.equal(uiEl('compare_target').value, '1,2,4');
    assert.equal(uiEl('compare_steps').value, '2500');
    assert.equal(String(uiEl('compare_max_terms').value), '12');
    assert.equal(String(uiEl('compare_base').value), '4');
    assert.equal(restoredMode, 'advance');
});

test('step-forward (+N steps) lookup, fast batch FS, notation, progress %, and helpers', () => {
    // Fast pure-array 1D FS batch matches ordinal_walk_fs exactly on normal, skipped-tower, and 1,3 cases
    for (const seq of ['1,2', '1,2,2', '1,2,3', '1,2,4', '1,2,4,4', '1,2,4,6', '1,2,4,5,7,7', '1,2,4,8,8', '1,3']) {
        const batch = run(`ordinal_walk_fs_batch_arr([${seq}], 4, Infinity)`);
        assert.ok(Array.isArray(batch) && batch.length === 4, `batch failed for ${seq}`);
        for (let k = 1; k <= 4; k++) {
            const expected = run(`ordinal_walk_fs(${JSON.stringify(seq)}, ${k})`);
            assert.equal(batch[k - 1].join(','), expected, `FS mismatch for ${seq}[${k}]`);
        }
    }

    // Exact step-forward agreement with brute force on full (5, 3) walk from multiple starts
    const walk53 = run(`(() => {
        const out = ['1,1'];
        let cur = [1, 1];
        while (cur.join(',') !== '1,3') {
            cur = ordinal_walk_next(cur, 5, 3);
            out.push(cur.join(','));
        }
        return out;
    })()`);
    for (const startIdx of [0, 5, 19]) {
        for (const delta of [0, 1, 2, 7, 18, walk53.length - 1 - startIdx]) {
            const res = run(`ordinal_walk_advance_steps(${JSON.stringify(walk53[startIdx])}, ${delta}n, 5, 3)`);
            assert.equal(res.status, 'ok');
            assert.equal(res.result, walk53[startIdx + delta]);
        }
    }

    // Early-pruned step-forward stays fast even at huge maxTerms (25, 30) and matches brute force
    for (const [start, n, m, b] of [
        ['1,1', 50, 30, 3],
        ['1,1', 500, 25, 3],
        ['1,2,4', 200, 25, 3],
    ]) {
        const expected = run(`(() => {
            let cur = [${start}];
            for (let i = 0; i < ${n}; i++) cur = ordinal_walk_next(cur, ${m}, ${b});
            return cur.join(',');
        })()`);
        const adv = run(`ordinal_walk_advance_steps(${JSON.stringify(start)}, ${n}n, ${m}, ${b})`);
        assert.equal(adv.status, 'ok');
        assert.equal(adv.result, expected);
    }

    // Large step-forward round-trips cleanly back through count_steps
    const adv150k = run(`ordinal_walk_advance_steps('1,1', '150,000', 10, 3)`);
    assert.equal(adv150k.status, 'ok');
    assert.equal(adv150k.result, '1,2,4,7,10,8,10,8,5,7');
    const back150k = run(`ordinal_walk_count_steps('1,1', ${JSON.stringify(adv150k.result)}, 10, 3)`);
    assert.equal(back150k.status, 'ok');
    assert.equal(back150k.steps, 150000n);

    // Chunked advancer matches synchronous advancer
    const chunkedAdv = run(`(() => {
        const a = ordinal_walk_create_advancer('1,2,4', 2971n, 10, 3);
        let ticks = 0, t;
        do { t = a.step(20); ticks++; } while (!t.done);
        return { ticks, status: t.result.status, result: t.result.result };
    })()`);
    assert.equal(chunkedAdv.status, 'ok');
    assert.equal(chunkedAdv.result, '1,2,4,4');
    assert.ok(chunkedAdv.ticks > 1);

    // Cap boundary, non-fixed start, and invalid steps
    const hitCap = run(`ordinal_walk_advance_steps('1,1', 21n, 5, 2)`);
    assert.equal(hitCap.status, 'ok');
    assert.equal(hitCap.result, '1,3');

    const pastCap = run(`ordinal_walk_advance_steps('1,1', 22n, 5, 2)`);
    assert.equal(pastCap.status, 'exceeds_cap');
    assert.equal(pastCap.stepsToCap, 21n);

    const atCap = run(`ordinal_walk_advance_steps('1,3', 1n, 10, 3)`);
    assert.equal(atCap.status, 'exceeds_cap');
    assert.equal(atCap.stepsToCap, 0n);

    const nonFixedStart = run(`ordinal_walk_advance_steps('1,1,1,1', 1n, 10, 3)`);
    assert.equal(nonFixedStart.status, 'ok');
    assert.equal(nonFixedStart.result, '1,2');

    assert.equal(run(`ordinal_walk_advance_steps('1,1', '', 10, 3)`).status, 'invalid_steps');
    assert.equal(run(`ordinal_walk_advance_steps('1,1', '-3', 10, 3)`).status, 'invalid_steps');
    assert.equal(run(`ordinal_walk_advance_steps('1,1', '1.5', 10, 3)`).status, 'invalid_steps');

    // Pure LNGI progress % has zero side effects on Analyzer's #search_result
    element('search_result').innerHTML = 'sentinel';
    assert.equal(run(`ordinal_walk_lngi_percent('1,1')`), 0);
    assert.equal(run(`ordinal_walk_lngi_percent('1,2')`), 50);
    assert.equal(run(`ordinal_walk_lngi_percent('1,2,2')`), 56.25);
    assert.equal(run(`ordinal_walk_lngi_percent('1,2,4')`), 75);
    assert.equal(run(`ordinal_walk_lngi_percent('1,3')`), 100);
    assert.equal(element('search_result').innerHTML, 'sentinel');

    // Exact BigInt ratio percentage formatter
    assert.equal(run(`ordinal_compare_format_ratio_pct(0n, 100n)`), '0%');
    assert.equal(run(`ordinal_compare_format_ratio_pct(100n, 100n)`), '100%');
    assert.equal(run(`ordinal_compare_format_ratio_pct(1n, 10000000n)`), '< 0.0001%');
    assert.equal(run(`ordinal_compare_format_ratio_pct(150000n, 300702n)`), '49.88%');

    // Notation HTML works cleanly in a browser-like context with EcOCF / BMS globals
    const browCtx = vm.createContext({
        console: { log() {}, warn() {}, error() {} }, Date, Math, Number, setTimeout, clearTimeout,
        format_cOCF: { checked: true }, compress_BMS: { checked: false },
        Y_Terms: { valueAsNumber: 17 }, BMS_Terms: { valueAsNumber: 17 },
        document: { getElementById: () => ({ value: '', style: {}, hidden: false, addEventListener() {} }), querySelectorAll: () => [] },
        localStorage: { getItem: () => null, setItem() {} },
    });
    browCtx.window = browCtx;
    browCtx.addEventListener = () => {};
    vm.runInContext(fs.readFileSync(path.join(root, 'conv.js'), 'utf8'), browCtx);
    vm.runInContext(fs.readFileSync(path.join(root, 'search.js'), 'utf8'), browCtx);
    assert.match(vm.runInContext(`ordinal_compare_notation_html('1,2,2')`, browCtx), /ω.*<sup>2<\/sup>/);
    assert.match(vm.runInContext(`ordinal_compare_notation_html('1,2,4')`, browCtx), /ε<sub>0<\/sub>/);
    assert.equal(vm.runInContext(`ordinal_compare_notation_html('1,2,4,8,16')`, browCtx), '(0,0,0,0)(1,1,1,1)');
    assert.match(vm.runInContext(`ordinal_compare_notation_html('1,3')`, browCtx), /Lim\(BMS\)/);

    // UI mode switching, Step Forward rendering, helpers (Swap, Use Analyzer, Sync Analyzer, Open in Analyzer), & previews
    run(`ordinal_compare_set_mode('advance')`);
    assert.equal(element('compare_target_group').hidden, true);
    assert.equal(element('compare_steps_group').hidden, false);
    assert.equal(element('compare_mode_advance').classList.contains('active'), true);
    assert.equal(element('compare_mode_count').classList.contains('active'), false);

    element('compare_start').value = '1,1';
    element('compare_steps').value = '14';
    element('compare_max_terms').value = '10';
    element('compare_base').value = '3';
    run('ordinal_compare_run()');
    assert.match(element('compare_result').innerHTML, /1,2,2/);
    assert.match(element('compare_result').innerHTML, /After \+14 steps/);
    assert.match(element('compare_result').innerHTML, /Open 1,2,2 in Analyzer/);

    // Exceeds cap in Step Forward UI
    element('compare_start').value = '1,1';
    element('compare_steps').value = '25';
    element('compare_max_terms').value = '5';
    element('compare_base').value = '2';
    run('ordinal_compare_run()');
    assert.match(element('compare_result').innerHTML, /walk limit reached/);
    assert.match(element('compare_result').innerHTML, /after 21 steps/);

    // Switch back to count mode and test helpers
    run(`ordinal_compare_set_mode('count')`);
    assert.equal(element('compare_target_group').hidden, false);
    assert.equal(element('compare_steps_group').hidden, true);

    element('compare_start').value = '1,2';
    element('compare_target').value = '1,2,4';
    run('ordinal_compare_swap()');
    assert.equal(element('compare_start').value, '1,2,4');
    assert.equal(element('compare_target').value, '1,2');

    // Live previews reflect valid and invalid inputs
    assert.match(element('compare_start_preview').innerHTML, /75\.00% to 1,3/);
    element('compare_target').value = '1,4';
    trigger('compare_target', 'input');
    assert.match(element('compare_target_preview').innerHTML, /Exceeds walk limit 1,3/);

    // Use Analyzer, Sync Analyzer, and Open in Analyzer
    search('1,2,3');
    element('ordinal_walk_max_terms').value = '14';
    element('ordinal_walk_base').value = '5';
    run(`ordinal_compare_use_analyzer('start')`);
    assert.equal(element('compare_start').value, '1,2,3');
    run(`ordinal_compare_sync_analyzer()`);
    assert.equal(element('compare_max_terms').value, '14');
    assert.equal(element('compare_base').value, '5');

    run(`ordinal_compare_open_in_analyzer('1,2,4')`);
    assert.equal(element('search_input').value, '1,2,4');
    assert.equal(run('ordinal_walk_restart'), false);

    // Ensure no background timers remain open at test end
    run('ordinal_compare_cancel(false)');
});


