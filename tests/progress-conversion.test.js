// Run with: node tests/progress-conversion.test.js
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const code = fs.readFileSync('conv.js', 'utf8');
const worker = { console, addEventListener() {} };
worker.self = worker;
vm.createContext(worker);
worker.importScripts = () => vm.runInContext(code, worker);
let reply;
worker.postMessage = value => { reply = value; };
vm.runInContext(fs.readFileSync('progress-conversion-worker.js', 'utf8'), worker);
const settings = { yTerms: 16, bmsTerms: 16, compress: false, format: true };
for (const mode of ['2-shifted OCF', 'cOCF', 'EcOCF', 'BcOCF', 'BMS', 'DBMS', 'PMS', 'AMS']) {
    worker.onmessage({ data: { key: mode, ord: '1,2,3', mode, settings } });
    assert.equal(reply.key, mode);
    assert.notEqual(reply.label, '1,2,3');
    const formatted = reply.label;
    worker.onmessage({ data: { key: mode, ord: '1,2,3', mode, settings: { ...settings, format: false } } });
    if (['cOCF', 'EcOCF', 'BcOCF'].includes(mode)) assert.notEqual(reply.label, formatted);
}
// Unsupported 2-shifted OCF sequences must not masquerade as converted OCF.
const outside = '1,2,4,8,16,25,36,51,67,85';
worker.onmessage({ data: { key: 'outside', ord: outside, mode: '2-shifted OCF', settings } });
assert.match(reply.label, /outside 2-shifted OCF range/);
assert.match(reply.label, /ω-Y: 1,2,4,8,16/);
for (const mode of ['cOCF', 'EcOCF', 'BcOCF']) {
    worker.onmessage({ data: { key: mode, ord: '1,3', mode, settings } });
    assert.match(reply.label, /outside .* range/);
}
console.log('Progress conversion worker tests passed');
