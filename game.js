/**
 * ω-Y Sequence Typing Game
 *
 * Sequence growth: 1 → 1,1 → 1,2 → 1,2,4 → 1,2,4,7 →
 * 1,2,4,8 → 1,2,4,8,15 → 1,2,4,8,16 → ...
 * Once the configured length is reached, only the last term increases
 * to its power-of-two value; raising the cap allows another term.
 * These game progression rules do not call conv.js for validation.
 */

// ============ GAME STATE ============
let gameState = {
    maxLength: 4,
    currentSequence: [1],
    targetSequence: [1, 1],
    sequenceHistory: [],      // Completed sequences with step counts
    termSteps: {},            // term_N: [{from, to, steps, timestamp}]
    termStartValues: {},      // term_N: starting value when first appeared
    currentTermIndex: 0,
    stepsSinceLastIncrease: 0,
    totalAttempts: 0,
    gameStartTime: Date.now()
};

// ============ DOM ELEMENTS ============
const $ = (id) => document.getElementById(id);

const els = {
    maxLengthSelect: $('max-length'),
    targetSequence: $('targetSequence'),
    currentProgress: $('currentProgress'),
    sequenceInput: $('sequenceInput'),
    submitBtn: $('submitBtn'),
    feedback: $('feedback'),
    termsGrid: $('termsGrid'),
    stepHistory: $('stepHistory'),
    savedList: $('savedList'),
    gameContainer: document.querySelector('.sequence-display'),
    resetBtn: $('resetBtn')
};

// ============ UTILITIES ============
function seqEqual(a, b) {
    if (a.length !== b.length) return false;
    return a.every((v, i) => v === b[i]);
}

function formatSeq(seq) {
    return seq.join(', ');
}

function termKey(idx) {
    return `term_${idx + 1}`;
}

function saveState() {
    const toSave = {
        maxLength: gameState.maxLength,
        currentSequence: gameState.currentSequence,
        targetSequence: gameState.targetSequence,
        sequenceHistory: gameState.sequenceHistory,
        termSteps: gameState.termSteps,
        termStartValues: gameState.termStartValues,
        currentTermIndex: gameState.currentTermIndex,
        stepsSinceLastIncrease: gameState.stepsSinceLastIncrease,
        totalAttempts: gameState.totalAttempts,
        gameStartTime: gameState.gameStartTime
    };
    localStorage.setItem('wyGameState', JSON.stringify(toSave));
}

function loadState() {
    const saved = localStorage.getItem('wyGameState');
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            if (Number.isInteger(parsed.maxLength) && parsed.maxLength >= 1 && parsed.maxLength <= 10 &&
                isReachableSequence(parsed.currentSequence) && parsed.currentSequence.length <= parsed.maxLength) {
                Object.assign(gameState, parsed);
                els.maxLengthSelect.value = gameState.maxLength;
            }
        } catch (e) {
            console.error('Failed to load state:', e);
        }
    }
    // Ensure target is correct for loaded state
    gameState.targetSequence = getNextTarget();
}

// ============ CORE LOGIC ============

function getLimitSequence(length) {
    return Array.from({ length }, (_, index) => index === 0 ? 1 : 2 ** index);
}

function isAtLimit() {
    return seqEqual(gameState.currentSequence, getLimitSequence(gameState.maxLength));
}

function getNextTarget() {
    const current = gameState.currentSequence;
    if (isAtLimit()) return [...current];

    // Finish increasing the last term before introducing another term.
    if (!seqEqual(current, getLimitSequence(current.length))) {
        return [...current.slice(0, -1), current.at(-1) + 1];
    }

    const newLength = current.length + 1;
    // The first new term is 1, the third is already 4; from the fourth
    // onward the newly added term starts one below its final value.
    const newValue = newLength === 2 ? 1
        : newLength === 3 ? 4
        : 2 ** (newLength - 1) - 1;
    return [...current, newValue];
}

function isReachableSequence(seq) {
    if (!Array.isArray(seq) || seq.length < 1 || seq.length > 10 || seq[0] !== 1) return false;
    const final = getLimitSequence(seq.length);
    for (let i = 1; i < seq.length - 1; i++) {
        if (seq[i] !== final[i]) return false;
    }
    if (seq.length === 1) return true;
    const last = seq.at(-1);
    const initial = seq.length === 2 ? 1
        : seq.length === 3 ? 4
        : final.at(-1) - 1;
    return last === initial || last === final.at(-1);
}

function recordTermIncreases(oldSeq, newSeq, steps) {
    const maxLen = Math.max(oldSeq.length, newSeq.length);
    for (let i = 0; i < maxLen; i++) {
        const oldVal = oldSeq[i] ?? 0;
        const newVal = newSeq[i] ?? 0;
        if (newVal > oldVal) {
            const key = termKey(i);
            if (!(key in gameState.termStartValues)) {
                gameState.termStartValues[key] = oldVal;
            }
            if (!(key in gameState.termSteps)) {
                gameState.termSteps[key] = [];
            }
            gameState.termSteps[key].push({
                from: oldVal,
                to: newVal,
                steps: steps,
                timestamp: Date.now()
            });
        }
    }
}

function saveSequenceReference(seq, steps) {
    const key = `wy_saved_${seq.join(',')}`;
    localStorage.setItem(key, JSON.stringify({
        sequence: seq,
        steps: steps,
        timestamp: Date.now()
    }));
}

function getSavedSequences() {
    const saved = [];
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('wy_saved_')) {
            try {
                const data = JSON.parse(localStorage.getItem(key));
                saved.push(data);
            } catch (e) {}
        }
    }
    // Sort by timestamp descending
    saved.sort((a, b) => b.timestamp - a.timestamp);
    return saved;
}

function renderSavedList() {
    const saved = getSavedSequences();
    if (saved.length === 0) {
        els.savedList.innerHTML = '<p class="no-saved">No sequences saved yet.</p>';
        return;
    }
    let html = '';
    for (const s of saved.slice(0, 10)) {
        const timeStr = new Date(s.timestamp).toLocaleTimeString();
        html += `<button class="saved-btn" onclick="fillInput('${formatSeq(s.sequence)}')" title="Saved ${timeStr}, ${s.steps} steps">${formatSeq(s.sequence)}</button>`;
    }
    els.savedList.innerHTML = html;
}

function fillInput(seqStr) {
    els.sequenceInput.value = seqStr;
    els.sequenceInput.focus();
}

// ============ UI RENDERING ============

function updateTargetDisplay() {
    els.targetSequence.textContent = `Target: ${formatSeq(gameState.targetSequence)}`;

    // Check if target has a saved reference
    const key = `wy_saved_${gameState.targetSequence.join(',')}`;
    const saved = localStorage.getItem(key);
    if (saved) {
        const data = JSON.parse(saved);
        els.sequenceInput.placeholder = `Saved: ${formatSeq(data.sequence)} (took ${data.steps} steps)`;
    } else {
        els.sequenceInput.placeholder = 'Type the sequence terms separated by commas (e.g., 1, 1)';
    }
}

function updateProgressDisplay() {
    const current = formatSeq(gameState.currentSequence);
    const target = formatSeq(gameState.targetSequence);

    if (isAtLimit()) {
        els.currentProgress.innerHTML =
            `<span class="at-limit">MAX REACHED: ${current}</span> | ` +
            `<span class="hint">Increase Max Terms to continue</span>`;
    } else {
        els.currentProgress.textContent = `Current: ${current} → Next: ${target}`;
    }
}

function showFeedback(msg, type = 'info') {
    els.feedback.textContent = msg;
    els.feedback.className = `feedback ${type}`;
}

function renderTermsGrid() {
    const maxLen = gameState.maxLength;
    const current = gameState.currentSequence;
    const target = gameState.targetSequence;
    const atLimit = isAtLimit();
    let html = '';

    for (let i = 0; i < maxLen; i++) {
        const key = termKey(i);
        const curVal = current[i] ?? 0;
        const tgtVal = target[i] ?? 0;
        const startVal = gameState.termStartValues[key] ?? (i === 0 ? 1 : 0);
        const steps = gameState.termSteps[key] ?? [];
        const totalSteps = steps.reduce((sum, s) => sum + s.steps, 0);
        const lastInc = steps[steps.length - 1];

        // Progress calculation
        let progress = 0;
        if (tgtVal > startVal) {
            progress = Math.min(1, (curVal - startVal) / (tgtVal - startVal));
        } else if (curVal >= tgtVal && tgtVal > 0) {
            progress = 1;
        }

        // Card state
        let cardClass = 'term-card';
        const isCurrent = (i === gameState.currentTermIndex && curVal < tgtVal);
        const isDone = (curVal >= tgtVal && tgtVal > 0);

        if (atLimit && i === maxLen - 1 && isDone) {
            cardClass += ' completed at-limit';
        } else if (isCurrent) {
            cardClass += ' current';
        } else if (isDone) {
            cardClass += ' completed';
        }

        // Term label with ordinal meaning
        let termLabel = `Term ${i + 1}`;
        if (i === 0) termLabel += ' (1)';
        else if (i === 1) termLabel += ' (ω)';
        else termLabel += ` (ω^${i})`;

        // Steps info
        let stepsInfo = '';
        if (totalSteps > 0) {
            stepsInfo = `Total steps to reach ${curVal}: ${totalSteps}`;
            if (lastInc) {
                stepsInfo += ` | Last: ${lastInc.from}→${lastInc.to} in ${lastInc.steps} steps`;
            }
        } else if (curVal < tgtVal) {
            stepsInfo = `Waiting... (need ${tgtVal - curVal} more)`;
        } else {
            stepsInfo = 'Complete';
        }

        html += `
            <div class="${cardClass}">
                <div class="term-header">
                    <span class="term-index">${termLabel}</span>
                    <span class="term-value">${curVal} / ${tgtVal}</span>
                </div>
                <div class="term-progress">
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${progress * 100}%"></div>
                    </div>
                    <span class="steps-info">${stepsInfo}</span>
                </div>
            </div>
        `;
    }
    els.termsGrid.innerHTML = html;
}

function renderStepHistory() {
    const allEvents = [];
    for (const [key, steps] of Object.entries(gameState.termSteps)) {
        const termNum = key.replace('term_', '');
        for (const step of steps) {
            allEvents.push({
                term: termNum,
                from: step.from,
                to: step.to,
                steps: step.steps,
                timestamp: step.timestamp
            });
        }
    }
    allEvents.sort((a, b) => b.timestamp - a.timestamp);
    const recent = allEvents.slice(0, 20);

    let html = '<h4>Term Increase History (steps per increase)</h4><div class="history-list">';
    if (recent.length === 0) {
        html += '<div class="history-item"><span class="history-term">No term increases recorded yet</span></div>';
    } else {
        for (const e of recent) {
            const timeStr = new Date(e.timestamp).toLocaleTimeString();
            const dateStr = new Date(e.timestamp).toLocaleDateString();
            html += `
                <div class="history-item">
                    <span class="history-term">Term ${e.term}: ${e.from} → ${e.to}</span>
                    <div>
                        <span class="history-steps">${e.steps} steps</span>
                        <span class="history-time">${dateStr} ${timeStr}</span>
                    </div>
                </div>
            `;
        }
    }
    html += '</div>';
    els.stepHistory.innerHTML = html;
}

function updateAllUI() {
    updateTargetDisplay();
    updateProgressDisplay();
    renderTermsGrid();
    renderStepHistory();
    renderSavedList();
}

// ============ EVENT HANDLERS ============

function setMaxLength(value) {
    const newMax = Number(value);
    if (!Number.isInteger(newMax) || newMax < 1 || newMax > 10) return;
    const oldMax = gameState.maxLength;
    gameState.maxLength = newMax;

    // Truncate current sequence if needed
    if (gameState.currentSequence.length > newMax) {
        gameState.currentSequence = gameState.currentSequence.slice(0, newMax);
    }

    gameState.targetSequence = getNextTarget();
    saveState();
    updateAllUI();

    if (newMax > oldMax) {
        showFeedback(`Max length increased to ${newMax}. Continue typing!`, 'success');
    } else if (newMax < oldMax) {
        showFeedback(`Max length decreased to ${newMax}. Sequence truncated.`, 'warning');
    }
}

function checkSequence() {
    const input = els.sequenceInput.value.trim();
    if (!input) {
        showFeedback('Please enter a sequence', 'error');
        return;
    }

    if (!/^\d+(?:\s*,\s*\d+)*$/.test(input)) {
        showFeedback('Invalid input: enter only numbers separated by commas', 'error');
        els.sequenceInput.classList.add('error');
        els.sequenceInput.classList.remove('correct');
        return;
    }
    const playerSeq = input.split(',').map(s => Number(s.trim()));
    if (playerSeq.some(n => !Number.isSafeInteger(n) || n < 1)) {
        showFeedback('Enter positive whole numbers only', 'error');
        return;
    }

    if (isAtLimit()) {
        showFeedback('Maximum sequence reached for this length. Increase Max Terms to continue.', 'warning');
        return;
    }

    gameState.totalAttempts++;
    gameState.stepsSinceLastIncrease++;

    if (seqEqual(playerSeq, gameState.targetSequence)) {
        handleCorrect(playerSeq);
    } else {
        handleIncorrect(playerSeq);
    }
}

function handleCorrect(seq) {
    const oldSeq = [...gameState.currentSequence];
    const stepsTaken = gameState.stepsSinceLastIncrease;

    recordTermIncreases(oldSeq, seq, stepsTaken);

    gameState.sequenceHistory.unshift({
        sequence: [...seq],
        steps: stepsTaken,
        timestamp: Date.now()
    });
    if (gameState.sequenceHistory.length > 20) {
        gameState.sequenceHistory = gameState.sequenceHistory.slice(0, 20);
    }

    saveSequenceReference(seq, stepsTaken);

    gameState.currentSequence = [...seq];
    gameState.stepsSinceLastIncrease = 0;
    gameState.currentTermIndex = 0;

    gameState.targetSequence = getNextTarget();

    showFeedback('Correct! Sequence saved.', 'success');
    els.sequenceInput.classList.add('correct');
    els.sequenceInput.classList.remove('error');
    els.sequenceInput.value = '';

    els.gameContainer.classList.add('success-animate');
    setTimeout(() => els.gameContainer.classList.remove('success-animate'), 400);

    if (isAtLimit()) {
        showFeedback(`Maximum sequence reached: ${formatSeq(seq)}. Increase Max Terms to continue!`, 'success');
    }

    saveState();
    updateAllUI();
}

function handleIncorrect(playerSeq) {
    const target = gameState.targetSequence;
    let diffIdx = -1;
    for (let i = 0; i < Math.max(playerSeq.length, target.length); i++) {
        if (playerSeq[i] !== target[i]) {
            diffIdx = i;
            break;
        }
    }

    let msg = `Not quite right. Target: ${formatSeq(target)}`;
    if (diffIdx >= 0) {
        msg += ` (Term ${diffIdx + 1} should be ${target[diffIdx]}, you entered ${playerSeq[diffIdx] ?? 'nothing'})`;
    }

    showFeedback(msg, 'error');
    els.sequenceInput.classList.add('error');
    els.sequenceInput.classList.remove('correct');

    if (diffIdx >= 0) {
        gameState.currentTermIndex = diffIdx;
    }

    saveState();
    updateAllUI();
}

function resetGame() {
    if (!confirm('Reset all progress? This clears saved sequences and history.')) return;
    localStorage.removeItem('wyGameState');
    for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (key?.startsWith('wy_saved_')) {
            localStorage.removeItem(key);
        }
    }
    location.reload();
}

// ============ INIT ============

function setupListeners() {
    els.maxLengthSelect.addEventListener('change', (e) => setMaxLength(e.target.value));
    els.resetBtn.addEventListener('click', resetGame);

    els.sequenceInput.addEventListener('input', (e) => {
        let v = e.target.value.replace(/[^0-9,\s]/g, '');
        v = v.replace(/\s*,\s*/g, ', ').replace(/,+/g, ',');
        e.target.value = v;
        e.target.classList.remove('error', 'correct');
    });

    els.sequenceInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            checkSequence();
        }
    });

    els.submitBtn.addEventListener('click', checkSequence);
    els.sequenceInput.focus();
}

function init() {
    loadState();
    setupListeners();
    updateAllUI();

    // Expose for debugging
    window.wyGame = {
        getState: () => ({ ...gameState }),
        reset: resetGame,
        setMaxLength
    };
}

document.addEventListener('DOMContentLoaded', init);
