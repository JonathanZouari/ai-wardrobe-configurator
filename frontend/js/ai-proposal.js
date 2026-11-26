(function initProposalReview() {
  const $ = (id) => document.getElementById(id);
  const actions = $('decision-actions');
  const result = $('proposal-result');
  const resultText = $('result-text');
  const undo = $('btn-undo');
  const diffBtn = $('btn-toggle-diff');
  const diffMarks = [$('diff-badge'), $('diff-pill')];

  // state: 'pending' | 'applied' | 'rejected'
  function show(state) {
    const pending = state === 'pending';
    actions.classList.toggle('hidden', !pending);
    result.classList.toggle('hidden', pending);
    undo.classList.toggle('hidden', state !== 'applied');
    resultText.textContent =
      state === 'applied' ? 'Proposal applied. You can undo this change.'
      : state === 'rejected' ? 'Proposal rejected. Your design was not changed.'
      : '';
  }

  $('btn-accept').addEventListener('click', () => show('applied'));
  $('btn-reject').addEventListener('click', () => show('rejected'));
  undo.addEventListener('click', () => show('pending'));

  diffBtn.addEventListener('click', () => {
    const on = diffBtn.getAttribute('aria-pressed') !== 'true';
    diffBtn.setAttribute('aria-pressed', String(on));
    diffBtn.classList.toggle('bg-primary', on);
    diffBtn.classList.toggle('text-on-primary', on);
    diffBtn.classList.toggle('text-primary', !on);
    diffMarks.forEach((el) => el.classList.toggle('hidden', !on));
  });
})();
