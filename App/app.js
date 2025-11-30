// Simple dynamic flow + demo prediction (client-side only)

(function () {
  const startBtn = document.getElementById('startBtn');
  const formPanel = document.getElementById('formPanel');
  const hero = document.querySelector('.hero');
  const backBtn = document.getElementById('backBtn');
  const predictForm = document.getElementById('predictForm');
  const predictBtn = document.getElementById('predictBtn');
  const resultEl = document.getElementById('predictionResult');

  function showForm() {
    hero.classList.add('hide');
    formPanel.setAttribute('aria-hidden', 'false');
    formPanel.classList.add('show');
  }

  function hideForm() {
    formPanel.classList.remove('show');
    formPanel.setAttribute('aria-hidden', 'true');
    hero.classList.remove('hide');
    resultEl.hidden = true;
  }

  startBtn?.addEventListener('click', function (e) {
    e.preventDefault();
    showForm();
  });
  backBtn?.addEventListener('click', function (e) {
    hideForm();
  });

  function parseBmi(value) {
    if (!value) return null;
    const v = ('' + value).trim();
    if (!v || /^n\/?a$/i.test(v)) return null;
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : null;
  }

  function simulatePrediction(values) {
    // Basic demo heuristic to produce a probability in [0,1].
    // This is NOT a medical model — demo only.
    let score = 0;

    // age contributions
    score += Math.min(values.age / 100, 1) * 0.25; // age up to 25%

    // conditions
    score += values.hypertension === 1 ? 0.18 : 0;
    score += values.heart_disease === 1 ? 0.16 : 0;

    // glucose & bmi
    score += Math.min(values.avg_glucose_level / 300, 1) * 0.18;
    if (values.bmi != null) {
      score += Math.min(Math.max((values.bmi - 18.5) / 30, 0), 1) * 0.12;
    }

    // smoker
    if (values.smoking_status === 'smokes') score += 0.06;
    if (values.smoking_status === 'formerly smoked') score += 0.03;

    // ensure in range
    score = Math.max(0, Math.min(1, score));

    return {
      probability: Math.round(score * 1000) / 1000,
      label: score >= 0.35 ? 1 : 0, // threshold arbitrary for demo
    };
  }

  predictForm?.addEventListener('submit', function (e) {
    e.preventDefault();
    predictBtn.disabled = true;
    const fd = new FormData(predictForm);

    // Build values
    const values = {
      id: fd.get('id'),
      gender: fd.get('gender'),
      age: Number(fd.get('age')) || 0,
      hypertension: Number(fd.get('hypertension')),
      heart_disease: Number(fd.get('heart_disease')),
      ever_married: fd.get('ever_married'),
      work_type: fd.get('work_type'),
      Residence_type: fd.get('Residence_type'),
      avg_glucose_level: Number(fd.get('avg_glucose_level')) || 0,
      bmi: parseBmi(fd.get('bmi')),
      smoking_status: fd.get('smoking_status'),
    };

    // Small delay to look dynamic
    resultEl.hidden = false;
    resultEl.innerHTML = '<div class="loading">Running demo prediction…</div>';

    setTimeout(() => {
      const out = simulatePrediction(values);

      resultEl.innerHTML = `
        <div class="result-inner">
          <div class="result-badge ${out.label ? 'bad' : 'good'}">Prediction: <strong>${out.label ? 'Stroke (1)' : 'No stroke (0)'}</strong></div>
          <div class="probability">Estimated probability: <strong>${Math.round(out.probability * 100)}%</strong></div>
          <div class="note">This is a demo-only prediction. Not a substitute for professional medical evaluation.</div>
          <div class="result-actions"><button id="againBtn">Predict another</button></div>
        </div>
      `;

      document.getElementById('againBtn')?.addEventListener('click', () => {
        predictForm.reset();
        resultEl.hidden = true;
      });

      predictBtn.disabled = false;
    }, 700);
  });
})();
