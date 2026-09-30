(() => {
  const $ = id => document.getElementById(id);
  const STORE = 'wy-sequence-trainer-v1';
  let maxLength = 8, values = [], steps = 0;
  try { const saved = JSON.parse(localStorage.getItem(STORE)); if (saved && Array.isArray(saved.values)) { values = saved.values; maxLength = saved.maxLength || 8; steps = saved.steps || 0; } } catch (_) {}
  const targetAt = n => n === 0 ? 1 : targetAt(n - 1) + n;
  function save(){ localStorage.setItem(STORE, JSON.stringify({values,maxLength,steps})); }
  function render(message,kind=''){
    const done = values.length >= maxLength;
    $('maxLength').value=maxLength; $('target').textContent=done?'✓':targetAt(values.length);
    $('position').textContent=done?maxLength:values.length+1; $('of').textContent=`of ${maxLength}`;
    $('progressFill').style.width=`${Math.min(values.length,53)/53*100}%`;
    $('progressText').textContent=`${values.length} / 53 terms`; $('state').textContent=done?'Limit reached':'In progress';
    $('answer').placeholder=done?'Increase the limit to continue':`Enter ${targetAt(values.length)}`;
    $('answer').disabled=done; $('answerForm').querySelector('button').disabled=done;
    $('feedback').textContent=message || (done?'You reached the selected maximum. Raise the limit to keep going.':'Type the next term in the sequence.'); $('feedback').className=kind;
    $('sequence').innerHTML=Array.from({length:maxLength},(_,i)=>`<span class="term ${i===values.length-1?'current':''} ${i>=values.length?'pending':''}">${i<values.length?values[i]:'·'}</span>`).join('');
    $('growth').innerHTML=values.map((v,i)=>`<span class="growth-chip">term ${i+1}: ${i===0?'start':`+${v-values[i-1]} step${v-values[i-1]===1?'':'s'}`}</span>`).join('');
  }
  $('answerForm').addEventListener('submit',e=>{e.preventDefault(); if(values.length>=maxLength)return; const raw=$('answer').value.trim(); const typed=Number(raw); const expected=targetAt(values.length);
    if(raw==='' || !Number.isSafeInteger(typed) || typed<0){render('Enter a valid whole-number term.','bad');return;}
    if(typed!==expected){render(`Not quite — term ${values.length+1} should be ${expected}. Try again.`,'bad');$('answer').select();return;}
    values.push(typed); steps++; save(); $('answer').value=''; render(`Correct. ${typed} is saved — the next term is ready.`,'good'); $('answer').focus();
  });
  $('apply').addEventListener('click',()=>{const n=Number($('maxLength').value); if(!Number.isInteger(n)||n<1||n>53){render('Choose a maximum length from 1 to 53.','bad');return;} maxLength=n; if(values.length>n)values=values.slice(0,n);save();render(`Maximum length set to ${n}.`,'good');});
  $('reset').addEventListener('click',()=>{values=[];steps=0;save();render('Restarted. Begin with the first term.');$('answer').value='';$('answer').focus();});
  render();
})();
