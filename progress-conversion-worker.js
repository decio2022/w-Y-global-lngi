// The conversion library normally reads its options from DOM inputs. Provide
// worker-local equivalents so expensive OCF conversions never block animation.
const workerInputs = {
    Y_Terms: { valueAsNumber: 0 },
    BMS_Terms: { valueAsNumber: 0 }
};
const document = { getElementById: id => workerInputs[id] };
const window = self;
const compress_BMS = { checked: false };
const format_cOCF = { checked: false };
importScripts('conv.js');

self.onmessage = ({ data }) => {
    const { key, ord, mode, settings } = data;
    workerInputs.Y_Terms.valueAsNumber = settings.yTerms;
    workerInputs.BMS_Terms.valueAsNumber = settings.bmsTerms;
    compress_BMS.checked = settings.compress;
    format_cOCF.checked = settings.format;
    const trimmed = trimStringList(ord, settings.yTerms);
    // The conversion library has hard upper bounds for these notations.
    // Make its ω-Y fallback explicit instead of presenting it as OCF.
    const ocfLimits = {
        '2-shifted OCF': '1,2,4,8,13',
        cOCF: '1,2,4,8,16,26',
        EcOCF: '1,2,4,8,16,31',
        BcOCF: '1,2,4,8,16,32,64,128,256,512'
    };
    if (Object.hasOwn(ocfLimits, mode) && Y_Sequence.cmp(trimmed, ocfLimits[mode]) !== -1) {
        self.postMessage({ key, label: `ω-Y: ${trimmed} (outside ${mode} range)` });
        return;
    }
    self.postMessage({ key, label: convert_From_wY(ord, mode) });
};
