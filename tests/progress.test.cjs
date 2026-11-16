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

// ---- the inverse input part: −1 walks the +1 sequences backwards ----

// every sequence +1 visits under a term limit, from 1,1 up to 1,3
function walk_up(max) {
    return JSON.parse(run(`(() => {
        const chain = []
        let seq = [1, 1]
        do { chain.push(seq.join(",")); seq = ordinal_walk_next(seq, ${max}) } while (seq.join(",") != "1,1")
        return JSON.stringify(chain)
    })()`));
}

test('-1 is the exact reverse of +1 for every amount of terms', () => {
    for (const max of [2, 3, 4, 5, 6]) {
        const up = walk_up(max);
        assert.equal(up[0], '1,1');
        assert.equal(up.at(-1), '1,3');
        const down = JSON.parse(run(`(() => {
            const chain = []
            let seq = [1, 3]
            do { chain.push(seq.join(",")); seq = ordinal_walk_prev(seq, ${max}) } while (seq.join(",") != "1,3")
            return JSON.stringify(chain)
        })()`));
        assert.deepEqual(down, up.slice().reverse(), `term limit ${max}`);
    }
    assert.deepEqual(walk_up(3).reverse(), ['1,3', '1,2,4', '1,2,3', '1,2,2', '1,2,1', '1,2', '1,1,1', '1,1']);
});

test('-1 undoes +1 under bigger term limits too', () => {
    for (const max of [8, 10, 20, 40, 53]) {
        const result = JSON.parse(run(`(() => {
            let seq = [1, 3], undone = true, falling = true, full = true
            for (let i = 0; i < 12; i++) {
                const lower = ordinal_walk_prev(seq, ${max})
                undone = undone && ordinal_walk_next(lower, ${max}).join(",") == seq.join(",")
                falling = falling && Y_Sequence.cmp(lower.join(","), seq.join(",")) == -1
                full = full && lower.length == ${max} && ordinal_walk_standard(lower)
                seq = lower
            }
            return JSON.stringify({ undone, falling, full })
        })()`));
        assert.deepEqual(result, { undone: true, falling: true, full: true }, `term limit ${max}`);
    }
    // terms past JavaScript's exact integers are left out instead of breaking the walk
    const top = JSON.parse(run('JSON.stringify(ordinal_walk_prev([1, 3], 200))'));
    assert.ok(top.length >= 53 && top.every(Number.isSafeInteger));
    assert.equal(run('Y_Sequence.cmp(ordinal_walk_prev(ordinal_walk_prev([1, 3], 200), 200).join(","), ' + JSON.stringify(top.join(',')) + ')'), -1);
});

test('the inverse part walks its own input down from 1,3 to 1,1 and wraps', () => {
    element('ordinal_walk_max_terms').value = '4';
    element('inverse_walk_max_terms').value = '4';
    search('1,2');
    element('inverse_input').value = '';
    run('inverse_search_time(); inverse_clicks = 0; inverse_walk_restart = false');

    const up = walk_up(4);
    const seen = [];
    for (let i = 0; i < up.length + 2; i++) {
        run('inverse_minus_one()');
        seen.push(element('inverse_input').value);
    }
    assert.deepEqual(seen, up.slice().reverse().concat(['1,3', '1,2,4,8']));
    assert.equal(element('inverse_walk_clicks').textContent, `clicks: ${up.length + 2}`);
    assert.match(element('inverse_result').innerHTML, /Achievement day/);
    // the first input part is left alone
    assert.equal(element('search_input').value, '1,2');

    // the analysis and the progress pages follow the part that was used last
    run('update_search_progress()');
    assert.equal(element('main_lngi_Content').textContent, '1,2,4,8');
    assert.match(element('search_progress_source').textContent, /inverse input/);
    run('ordinal_plus_one(); update_search_progress()');
    assert.equal(element('main_lngi_Content').textContent, '1,2,1');
    assert.doesNotMatch(element('search_progress_source').textContent, /inverse input/);
    assert.equal(element('inverse_input').value, '1,2,4,8');
});

test('the inverse Max fills the term limit again and stops at 1,1', () => {
    element('inverse_walk_max_terms').value = '5';
    const press = (from) => {
        element('inverse_input').value = from;
        run('inverse_search_time(); inverse_clicks = 0; inverse_walk_restart = false; inverse_max()');
        return [element('inverse_input').value, element('inverse_walk_clicks').textContent];
    };
    assert.deepEqual(press('1,2,4,8,16'), ['1,2,4,8,15', 'clicks: 1']);
    assert.deepEqual(press('1,2,4,8,1'), ['1,2,4,7,11', 'clicks: 2']);
    // trailing 1s come off one press at a time, then the sequence is refilled
    assert.deepEqual(press('1,2,1,1,1'), ['1,1,1,1,1', 'clicks: 4']);
    assert.deepEqual(press('1,1,1,1'), ['1,1', 'clicks: 2']);
    assert.deepEqual(press('1,1'), ['1,2,4,8,16', 'clicks: 2']);
    // anything the walk can't continue from starts at the top
    assert.deepEqual(press('nonsense'), ['1,2,4,8,16', 'clicks: 2']);
    element('inverse_input').value = '1,2,1,3';
    run('inverse_search_time(); inverse_minus_one()');
    assert.equal(element('inverse_input').value, '1,3');
});
