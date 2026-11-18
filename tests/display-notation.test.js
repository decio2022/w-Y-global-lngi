// Run with: node tests/display-notation.test.js
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ui = fs.readFileSync('ui.js', 'utf8');
const html = fs.readFileSync('main.html', 'utf8');
// Keep the selector outside the auto-sized sequence card.
assert.ok(html.indexOf('id="main_lngi_display_mode"') < html.indexOf('id="main_lngi"'));
const snippet = ui.slice(ui.indexOf("let scratch_bar_display ="), ui.indexOf('let compress_BMS'));
function select() {
    return { value: 'wY', listeners: {}, addEventListener(event, fn) { this.listeners[event] = fn; } };
}
const main = select(), progress = select();
const mainCard = { style: { height: '120px' } };
const css = fs.readFileSync('style.css', 'utf8');
const cardRule = css.match(/#main_lngi\s*\{([^}]*)\}/)[1];
assert.match(cardRule, /height:\s*auto/);
assert.match(cardRule, /min-height:\s*60px/);
let refreshes = 0;
const context = { refresh_main_notation: () => { refreshes++; }, document: { getElementById: id => id === 'main_lngi_display_mode' ? main : id === 'main_lngi' ? mainCard : progress } };
vm.createContext(context);
vm.runInContext(snippet, context);
main.value = 'cOCF'; main.listeners.input();
assert.equal(progress.value, 'cOCF');
assert.equal(mainCard.style.height, '');
mainCard.style.height = '140px';
main.listeners.change();
assert.equal(mainCard.style.height, '140px');
assert.equal(refreshes, 2);
assert.equal(vm.runInContext('scratch_bar_display', context), 'cOCF');
progress.value = 'EcOCF'; progress.listeners.change();
assert.equal(main.value, 'EcOCF');
assert.equal(refreshes, 3);
assert.equal(mainCard.style.height, '');
assert.equal(vm.runInContext('scratch_bar_display', context), 'EcOCF');
vm.runInContext("setDisplayNotation('BMS')", context);
assert.equal(main.value, 'BMS'); assert.equal(progress.value, 'BMS');
console.log('Display notation tests passed');
