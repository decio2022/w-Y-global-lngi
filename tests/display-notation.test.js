// Run with: node tests/display-notation.test.js
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ui = fs.readFileSync('ui.js', 'utf8');
const snippet = ui.slice(ui.indexOf("let scratch_bar_display ="), ui.indexOf('let compress_BMS'));
function select() {
    return { value: 'wY', listeners: {}, addEventListener(event, fn) { this.listeners[event] = fn; } };
}
const main = select(), progress = select();
const context = { document: { getElementById: id => id === 'main_lngi_display_mode' ? main : progress } };
vm.createContext(context);
vm.runInContext(snippet, context);
main.value = 'cOCF'; main.listeners.input();
assert.equal(progress.value, 'cOCF');
assert.equal(vm.runInContext('scratch_bar_display', context), 'cOCF');
progress.value = 'EcOCF'; progress.listeners.change();
assert.equal(main.value, 'EcOCF');
assert.equal(vm.runInContext('scratch_bar_display', context), 'EcOCF');
vm.runInContext("setDisplayNotation('BMS')", context);
assert.equal(main.value, 'BMS'); assert.equal(progress.value, 'BMS');
console.log('Display notation tests passed');
