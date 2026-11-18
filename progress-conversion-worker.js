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
    self.postMessage({ key, label: convert_From_wY(ord, mode) });
};
