# Stroke Prediction — Demo

🎯 **What this project is**

This small demo shows a static frontend (HTML/CSS/JS) that submits patient data to a local FastAPI prediction server. The backend loads a Keras model (.h5) and a pre-fitted scaler (.pkl) and returns a probability and predicted label. The UI includes helpful diagnostics, a server health check, and a fun intro audio player.

> IMPORTANT: This repository is a demo / hackathon project. It is **not** medical software and must not be used for real clinical decisions.

---

## Contents

- `App/` — Frontend static site (open `App/index.html` in a browser). Contains the form UI, styles, and scripts.
  - `index.html`, `form.html`, `index.js`, `form.js`, `intro.js`, `style.css`
  - `Songs/` — place your song/audio files here (used by `intro.js`).
- `App/server_fastapi/` — FastAPI prediction server example.
  - `server.py` — server and preprocessing logic
  - `requirements.txt` — Python dependencies for the server
  - `README.md` — focused notes for the server (see there for quick server-specific examples)

---

## Quick demo goals

- Load a local Keras model and scaler and serve predictions.
- Submit single-row CSV or JSON from the form or curl and get back { label, probability }.
- Small UI with color-coded prediction feedback and a health check pill.
- Play a local audio file on the index page (browsers may block autoplay — see Troubleshooting).

---

## Prerequisites

- Python 3.8+ (3.11 recommended) for the backend
- Node / NPM is NOT required; frontend is pure static HTML/JS
- A Keras `.h5` model file and a `scaler.pkl` (joblib dump) trained with the preprocessing matching `server_fastapi/server.py`

---

## Run the backend (FastAPI)

Open a PowerShell terminal and run:

```powershell
cd 'd:\Sesame Hackathon\App\server_fastapi'
# (recommended) create and activate a virtual environment
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt

# Start server on port 8000
uvicorn server:app --reload --port 8000
```

Endpoints:
- `POST /predict` — Accepts CSV (`text/csv`) or JSON. Returns `{ label: 0|1, probability: float }` (predicts first row).
- `GET /health` — Returns server/model/scaler status useful for frontend diagnostics.

Tips:
- Place your model and scaler in a location the server expects. By default the example server tries to load `scaler.pkl` and `stroke_best_dl_model.h5` from `d:/Sesame Hackathon/Machine Learning/` unless you set `SCALER_PATH` and `MODEL_PATH` environment variables. See `App/server_fastapi/README.md` for details.

---

## Run the frontend

The frontend is static HTML/JS and can be opened directly:

- Open `d:\Sesame Hackathon\App\index.html` in a modern browser.

OR, serve the `App/` folder with a simple server to avoid cross-file restrictions (recommended):

```powershell
# Python 3: lightweight HTTP server (runs on port 8001)
cd 'd:\Sesame Hackathon\App'
python -m http.server 8001

# then open http://localhost:8001/index.html
```

The frontend will POST CSV to the default prediction endpoint at `http://localhost:8000/predict` (this is set in `App/form.html` as `window.PREDICT_ENDPOINT`). Update `form.html` if your server runs at a different host/port.

### Audio / intro

- Intro audio is handled by `App/intro.js`. Place your audio at `App/Songs/`.
- This repo uses a filename: `SUPER MARIO BROS. - Main Theme By Koji Kondo  Nintendo.mp3` — update the file or the path in `intro.js` if needed.
- Note: Most modern browsers block autoplay with sound unless the user interacts with the page. If autoplay is blocked the page will show after a short delay or after user input — consider adding a visible "Play" button for better UX.

---

## Example requests

CSV example (curl):

```bash
curl -X POST 'http://localhost:8000/predict' \
  -H 'Content-Type: text/csv' \
  --data-binary $'id,gender,age,hypertension,heart_disease,ever_married,work_type,Residence_type,avg_glucose_level,bmi,smoking_status\nTEST1,Male,72,0,0,Yes,Private,Urban,85.5,24.9,never smoked'
```

PowerShell example (tests the health endpoint):

```powershell
Invoke-RestMethod -Method Get -Uri http://localhost:8000/health
```

---

## Troubleshooting

- "Failed to fetch" from browser: check the backend is running, confirm `window.PREDICT_ENDPOINT` is set correctly, and check the browser console for CORS errors. If the backend is remote, ensure CORS is enabled on the server.
- Autoplay blocked: browsers restrict autoplaying audio with sound. Add a visible play button or detect autoplay failure in `intro.js` and show a prompt.
- CSV parsing errors: ensure header names and types match the server preprocessing in `server_fastapi/server.py`.

---

## Security & production notes

- This repo uses example code suitable for local development. For production you should:
  - Add proper validation and authentication to the API
  - Serve models from a secure, immutable source (avoid untrusted pickle files)
  - Add logging, monitoring, and rate-limiting
  - Harden CORS and HTTPS configuration

---

If you'd like, I can also add a short troubleshooting script that tests the backend and frontend connectivity automatically. Want me to add that here? ✅