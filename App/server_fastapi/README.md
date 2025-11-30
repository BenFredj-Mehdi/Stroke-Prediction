# FastAPI prediction server (demo)

This example shows how to run a FastAPI server that loads a Keras model (.h5) and a scaler (.pkl) for generating predictions.

Important: This example assumes your scaler (scikit-learn StandardScaler / similar) and your model were trained with the same preprocessing order used in server.py. If your actual model pipeline used different encodings, update server.py's preprocess_row() to match exactly.

Where to place your files
- Put `scaler.pkl` and `stroke_best_dl_model.h5` in `d:/Sesame Hackathon/Machine Learning/` (this is the default path server.py looks for).
- Or set environment variables `SCALER_PATH` and `MODEL_PATH` to point to their locations.

How to run (Windows PowerShell)

```powershell
cd 'd:\Sesame Hackathon\App\server_fastapi'
# create a virtual env (recommended)
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
# then run the server
uvicorn server:app --reload --port 8000
```

API
- POST /predict
  - Accepts JSON (single object or list) OR CSV input (text/csv or file upload multipart/form-data). The server will accept either format and predict the first row.
  - CSV shape: header row containing these keys (in any order is OK): id, gender, age, hypertension, heart_disease, ever_married, work_type, Residence_type, avg_glucose_level, bmi, smoking_status
  - Response: { label: 0|1, probability: float }

  Health check endpoint
  ---------------------
  GET /health will return a small JSON payload indicating if the server is reachable and whether the model/scaler loaded:

  ```
  GET http://localhost:8000/health
  {
    "ok": true,
    "model_loaded": true,
    "scaler_loaded": true
  }
  ```

Examples using curl (CSV):

```bash
curl -X POST 'http://localhost:8000/predict' \
  -H 'Content-Type: text/csv' \
  --data-binary $'id,gender,age,hypertension,heart_disease,ever_married,work_type,Residence_type,avg_glucose_level,bmi,smoking_status\nTEST1,Male,72,0,0,Yes,Private,Urban,85.5,24.9,never smoked' 
```

Or POST JSON:

```bash
curl -X POST 'http://localhost:8000/predict' \
  -H 'Content-Type: application/json' \
  -d '{"id":"TEST1","gender":"Male","age":72,"hypertension":0,"heart_disease":0,"ever_married":"Yes","work_type":"Private","Residence_type":"Urban","avg_glucose_level":85.5,"bmi":24.9,"smoking_status":"never smoked"}'
```

NOTE: This is an example for local testing. In production you should add authentication, validation, logging, and secure hosting. Don't serve untrusted pickle files publicly.
