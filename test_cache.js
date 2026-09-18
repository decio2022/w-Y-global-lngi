// Small regression test for the playback caches. Run with: node test_cache.js
const fs = require('fs');
const vm = require('vm');
const source = fs.readFileSync('lngi.js', 'utf8');
const start = source.indexOf('const FS_CACHE_LIMIT');
const end = source.indexOf('function ntl', start);
if (start < 0 || end < 0) throw new Error('cache block was not found');
let expansions = 0;
let conversions = 0;
const context = {
  Y_Sequence: { fs: () => { expansions++; return '1,2,4'; } },
  convert_From_wY: () => { conversions++; return 'converted'; },
  document: { getElementById: () => ({ value: '16' }) },
  compress_BMS: { checked: false },
  format_cOCF: { checked: false }
};
vm.createContext(context);
vm.runInContext(source.slice(start, end) + `
  cachedFS('1,2', 1); cachedFS('1,2', 1);
  cachedNotation('1,2,4', 'cOCF'); cachedNotation('1,2,4', 'cOCF');
  if (fsCacheHits !== 1 || notationCacheHits !== 1) throw new Error('cache hit counters are wrong');
`, context);
if (expansions !== 1) throw new Error(`expected one fs expansion, got ${expansions}`);
if (conversions !== 1) throw new Error(`expected one conversion, got ${conversions}`);
console.log('cache test passed: repeated FS expansion and notation conversion were reused');
