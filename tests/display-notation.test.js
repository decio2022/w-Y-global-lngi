// Run with: node tests/display-notation.test.js
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ui = fs.readFileSync('ui.js', 'utf8');
const html = fs.readFileSync('main.html', 'utf8');
// The main card is only 60px high. Keep the selector outside it so the
// converted sequence remains visible instead of being clipped below the fold.
assert.ok(html.indexOf('id="main_lngi_display_mode"') < html.indexOf('id="main_lngi"'));
const snippet = ui.slice(ui.indexOf("let scratch_bar_display ="), ui.indexOf('let compress_BMS'));
function select() {
    return { value: 'wY', listeners: {}, addEventListener(event, fn) { this.listeners[event] = fn; } };
}
const main = select(), progress = select();
let refreshes = 0;
const context = { refresh_main_notation: () => { refreshes++; }, document: { getElementById: id => id === 'main_lngi_display_mode' ? main : progress } };
vm.createContext(context);
vm.runInContext(snippet, context);
main.value = 'cOCF'; main.listeners.input();
assert.equal(progress.value, 'cOCF');
assert.equal(refreshes, 1);
assert.equal(vm.runInContext('scratch_bar_display', context), 'cOCF');
progress.value = 'EcOCF'; progress.listeners.change();
assert.equal(main.value, 'EcOCF');
assert.equal(refreshes, 2);
assert.equal(vm.runInContext('scratch_bar_display', context), 'EcOCF');
vm.runInContext("setDisplayNotation('BMS')", context);
assert.equal(main.value, 'BMS'); assert.equal(progress.value, 'BMS');
console.log('Display notation tests passed');
