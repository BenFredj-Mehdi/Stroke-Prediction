// Form page: handle submit and slow return to index
(function () {
  const backBtn = document.getElementById('backBtn');
  const predictForm = document.getElementById('predictForm');
  const predictBtn = document.getElementById('predictBtn');
  const resultEl = document.getElementById('predictionResult');
  const panel = document.querySelector('.form-panel');
  const PREDICT_ENDPOINT = (window && window.PREDICT_ENDPOINT) || '';
  const serverStatusEl = document.getElementById('serverStatus');
  const serverDot = document.getElementById('serverDot');
  const checkServerBtn = document.getElementById('checkServerBtn');

  function parseBmi(value) {
    if (!value) return null;
    const v = ('' + value).trim();
    if (!v || /^n\/?a$/i.test(v)) return null;
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : null;
  }

  function simulatePrediction(values) {
    let score = 0;
    score += Math.min(values.age / 100, 1) * 0.25;
    score += values.hypertension === 1 ? 0.18 : 0;
    score += values.heart_disease === 1 ? 0.16 : 0;
    score += Math.min(values.avg_glucose_level / 300, 1) * 0.18;
    if (values.bmi != null) {
      score += Math.min(Math.max((values.bmi - 18.5) / 30, 0), 1) * 0.12;
    }
    if (values.smoking_status === 'smokes') score += 0.06;
    if (values.smoking_status === 'formerly smoked') score += 0.03;
    score = Math.max(0, Math.min(1, score));
    return {
      probability: Math.round(score * 1000) / 1000,
      label: score >= 0.35 ? 1 : 0,
    };
  }

  function slowNavigateBack() {
    // animate out and then go back
    document.documentElement.classList.add('page-leaving');
    panel.classList.add('leaving');
    setTimeout(() => (window.location.href = 'index.html'), 900);
  }

  backBtn?.addEventListener('click', slowNavigateBack);

  // POST the form data to a remote endpoint if configured.
  // This project supports sending CSV (text/csv) because your model accepts CSV files.
  // The server also accepts JSON; we will POST CSV by default so it matches your model input.
  async function sendToApi(values) {
    try {
      resultEl.innerHTML = '<div class="loading">Sending to your model…</div>';
      // build a single-row CSV with header columns in the expected order
      const cols = [
        'id','gender','age','hypertension','heart_disease','ever_married','work_type','Residence_type','avg_glucose_level','bmi','smoking_status'
      ];

      function escapeCsvCell(v){
        if (v === null || v === undefined) return '';
        const s = String(v);
        if (s.indexOf(',') >= 0 || s.indexOf('"') >= 0 || s.indexOf('\n') >= 0) {
          return '"' + s.replace(/"/g,'""') + '"';
        }
        return s;
      }

      const header = cols.join(',');
      const row = cols.map(c => escapeCsvCell(values[c] ?? '')).join(',');
      const csv = header + '\n' + row + '\n';

      const resp = await fetch(PREDICT_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'text/csv' },
        body: csv,
      });

      if (!resp.ok) throw new Error('Server responded with ' + resp.status);

      const json = await resp.json();
      const label = json.label ?? json.prediction ?? json.pred ?? null;
      const probability = json.probability ?? json.prob ?? null;

      if (label === null || label === undefined) {
        resultEl.innerHTML = `<div class="result-inner"><div class="note">Unexpected response from prediction server.</div><pre>${JSON.stringify(json)}</pre></div>`;
        return;
      }

      // Determine color and message based on probability
      let badgeClass = '';
      let badgeText = '';
      let probText = probability != null ? Math.round(probability * 100) + '%' : 'N/A';
      let bannerClass = '';
      let bannerMsg = '';
      let badgeExtra = '';
      let percent = probability != null ? probability * 100 : null;
      if (percent !== null) {
        if (percent < 40) {
          badgeClass = 'good';
          badgeText = `No stroke (0)`;
          bannerClass = 'green';
          bannerMsg = 'No stroke predicted — low risk';
        } else if (percent < 60) {
          badgeClass = 'maybe';
          badgeText = `Probably: ${label ? 'Stroke (1)' : 'No stroke (0)'}`;
          bannerClass = 'orange';
          bannerMsg = `Probability in middle range — result is uncertain`;
          badgeExtra = '<span class="maybe-text">(probable)</span>';
        } else {
          badgeClass = 'bad';
          badgeText = `Stroke (1)`;
          bannerClass = 'red';
          bannerMsg = 'Stroke predicted — seek urgent medical evaluation';
        }
      } else {
        badgeClass = label ? 'bad' : 'good';
        badgeText = label ? 'Stroke (1)' : 'No stroke (0)';
        bannerClass = label ? 'red' : 'green';
        bannerMsg = label ? 'Stroke predicted — seek urgent medical evaluation' : 'No stroke predicted — lower risk';
      }

      resultEl.innerHTML = `
        <div class="result-inner">
          <div class="result-badge ${badgeClass}">Prediction: <strong>${badgeText}</strong> ${badgeExtra}</div>
          <div class="probability">Estimated probability: <strong>${probText}</strong></div>
          <div class="note">Result returned from your prediction endpoint.</div>
          <div class="result-actions"><button id="againBtn">Predict another</button></div>
        </div>
      `;

      document.getElementById('againBtn')?.addEventListener('click', () => {
        predictForm.reset();
        resultEl.hidden = true;
        document.documentElement.classList.remove('predicted-true', 'predicted-false', 'predicted-orange', 'predicted-green');
        const banner = document.getElementById('predictionBanner');
        if (banner) { banner.hidden = true; banner.setAttribute('aria-hidden', 'true'); }
      });
      // apply a page-level class to change the interface color
      document.documentElement.classList.remove('predicted-true', 'predicted-false', 'predicted-orange', 'predicted-green');
      if (percent !== null) {
        if (percent < 40) {
          document.documentElement.classList.add('predicted-green');
        } else if (percent < 60) {
          document.documentElement.classList.add('predicted-orange');
        } else {
          document.documentElement.classList.add('predicted-true');
        }
      } else {
        document.documentElement.classList.add(label ? 'predicted-true' : 'predicted-false');
      }
      // show a large top banner with a short message
      const banner = document.getElementById('predictionBanner');
      if (banner) {
        banner.hidden = false;
        banner.setAttribute('aria-hidden', 'false');
        const msg = banner.querySelector('.message');
        msg.textContent = bannerMsg;
        banner.classList.remove('green', 'orange', 'red');
        banner.classList.add(bannerClass);
      }
    } catch (err) {
      // Provide more actionable diagnostics when a network error occurs
      const isNetwork = String(err.message || '').toLowerCase().includes('failed to fetch') || String(err.message || '').toLowerCase().includes('networkerror');
      if (isNetwork) {
        // Try a lightweight health-check to provide a better message
        try {
          const healthUrl = (new URL(PREDICT_ENDPOINT)).origin + '/health';
          const probe = await fetch(healthUrl, { method: 'GET' });
          if (probe.ok) {
            const status = await probe.json();
            resultEl.innerHTML = `<div class="result-inner"><div class="note">Network error contacting prediction endpoint. Health check at ${healthUrl} responded: ${JSON.stringify(status)}. Check server logs and CORS if health is OK.</div></div>`;
          } else {
            resultEl.innerHTML = `<div class="result-inner"><div class="note">Network error contacting prediction endpoint and health check returned HTTP ${probe.status}. Confirm the server is running and listening at ${PREDICT_ENDPOINT}.</div></div>`;
          }
        } catch (probeErr) {
          // give clear recommendations when probe also fails
          resultEl.innerHTML = `<div class="result-inner"><div class="note">Failed to reach ${PREDICT_ENDPOINT} (network error). Common causes:</div><ol><li>Server is not running — start the FastAPI server on port 8000 (see server_fastapi/README.md).</li><li>Wrong endpoint/port — ensure window.PREDICT_ENDPOINT in form.html points to the running server.</li><li>CORS or mixed-content issues — check the browser console for CORS errors or try opening http://localhost:8000/docs in the browser.</li></ol></div>`;
        }
      } else {
        resultEl.innerHTML = `<div class="result-inner"><div class="note">Request failed: ${err.message}</div></div>`;
      }
      // ensure button is re-enabled so the user can try again
      predictBtn.disabled = false;
    }
    // ensure button is enabled in success case as well
    predictBtn.disabled = false;
  }


  // Health check helper (runs at page load and when user clicks the 'Check' button)
  async function checkServerHealth() {
    if (!PREDICT_ENDPOINT) return;
    try {
      const origin = (new URL(PREDICT_ENDPOINT)).origin;
      const resp = await fetch(origin + '/health', { method: 'GET' });
      if (!resp.ok) throw new Error('HTTP ' + resp.status);
      const json = await resp.json();
      const ok = json?.ok === true;
      serverStatusEl.classList.remove('bad', 'ok');
      serverStatusEl.classList.add(ok ? 'ok' : 'bad');
      serverStatusEl.querySelector('.status-text').textContent = ok ? 'Server ready' : 'Server unreachable';
      return { ok, status: json };
    } catch (e) {
      serverStatusEl.classList.remove('bad', 'ok');
      serverStatusEl.classList.add('bad');
      serverStatusEl.querySelector('.status-text').textContent = 'No server connection';
      return { ok: false, error: String(e) };
    }
  }

  checkServerBtn?.addEventListener('click', async (e) => {
    e.preventDefault();
    checkServerBtn.disabled = true;
    await checkServerHealth();
    checkServerBtn.disabled = false;
  });

  // Run a health check on load
  window.addEventListener('load', () => {
    setTimeout(checkServerHealth, 220);
  });
  predictForm?.addEventListener('submit', async function (e) {
    e.preventDefault();
    // Start processing and disable submit until done
    predictBtn.disabled = true;
    const fd = new FormData(predictForm);

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

    resultEl.hidden = false;
    // If an external prediction endpoint is configured, send the values there
    if (PREDICT_ENDPOINT) {
      await sendToApi(values);
      predictBtn.disabled = false;
      return;
    }

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
        document.documentElement.classList.remove('predicted-true', 'predicted-false');
        const banner = document.getElementById('predictionBanner');
        if (banner) { banner.hidden = true; banner.setAttribute('aria-hidden', 'true'); }
      });
      // apply page-level color
      document.documentElement.classList.toggle('predicted-true', !!out.label);
      document.documentElement.classList.toggle('predicted-false', !out.label);
      const banner = document.getElementById('predictionBanner');
      if (banner) {
        banner.hidden = false;
        banner.setAttribute('aria-hidden', 'false');
        const msg = banner.querySelector('.message');
        msg.textContent = out.label ? 'Stroke predicted — seek urgent medical evaluation' : 'No stroke predicted — lower risk';
      }

      predictBtn.disabled = false;
    }, 700);
  });
})();
