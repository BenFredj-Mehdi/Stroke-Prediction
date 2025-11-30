"""
Example FastAPI server that loads scaler.pkl and a Keras .h5 model and exposes POST /predict

Place your scaler.pkl and stroke_best_dl_model.h5 in the project and update MODEL_PATH and SCALER_PATH if needed.
This server expects JSON with the same fields as the CSV row (id, gender, age, hypertension, heart_disease, ever_married,
work_type, Residence_type, avg_glucose_level, bmi, smoking_status).

The server performs a simple, deterministic preprocessing to convert categorical fields to one-hot / numeric
then applies the scaler (if available) and makes a prediction using the Keras model.

This is a demo example — double-check preprocessing steps match exactly how the model was trained.
"""
from fastapi import FastAPI, HTTPException, Request
from pydantic import BaseModel
from typing import Optional
import os
import numpy as np
import pandas as pd
from io import BytesIO, StringIO
import joblib

# Only import tensorflow if available - it can be heavy. If not present we'll return a helpful error.
try:
    from tensorflow.keras.models import load_model
except Exception:
    load_model = None

# Paths (adjust if your files are in a different location)
BASE = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
MODEL_PATH = os.environ.get('MODEL_PATH', os.path.join(BASE, '..', 'Machine Learning', 'stroke_best_dl_model.h5'))
SCALER_PATH = os.environ.get('SCALER_PATH', os.path.join(BASE, '..', 'Machine Learning', 'scaler.pkl'))

app = FastAPI(title='Stroke prediction demo API')

# Allow CORS for local testing. For production set restrictive origins.
from fastapi.middleware.cors import CORSMiddleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Try to load scaler/model
SCALER = None
KMODEL = None

if os.path.exists(SCALER_PATH):
    try:
        SCALER = joblib.load(SCALER_PATH)
        print('Loaded scaler from', SCALER_PATH)
    except Exception as e:
        print('Failed to load scaler:', e)

if load_model and os.path.exists(MODEL_PATH):
    try:
        KMODEL = load_model(MODEL_PATH)
        print('Loaded Keras model from', MODEL_PATH)
    except Exception as e:
        print('Failed to load Keras model:', e)
else:
    if not load_model:
        print('TensorFlow/Keras not available in the current Python environment.')

# Pydantic model for incoming request
class PredictRow(BaseModel):
    id: Optional[str]
    gender: str
    age: float
    hypertension: int
    heart_disease: int
    ever_married: str
    work_type: str
    Residence_type: str
    avg_glucose_level: float
    bmi: Optional[str] = None
    smoking_status: str


# helper: deterministic preprocessing (use same order in feature_vector as scaler expects)
GENDERS = ['Female', 'Male', 'Other']
WORK_TYPES = ['children', 'Govt_job', 'Never_worked', 'Private', 'Self-employed']
SMOKERS = ['formerly smoked', 'never smoked', 'smokes', 'Unknown']


def preprocess_dataframe(df: pd.DataFrame):
    """Apply the same preprocessing you used during training to a DataFrame.

    Steps implemented to mirror the script you shared:
      - Fill missing BMI values (use column median if available in batch, otherwise fallback to scaler mean if present)
      - Create age_bmi and age_hypertension features
      - One-hot encode categorical columns (pd.get_dummies(drop_first=True))
      - Align resulting columns to SCALER.feature_names_in_ (adds missing as 0, reorders, drops extras)

    Returns: np.ndarray shaped (n_rows, n_features) ready for model.predict
    """
    df = df.copy()

    # Make sure expected raw columns exist
    expected_cols = ['id','gender','age','hypertension','heart_disease','ever_married','work_type','Residence_type','avg_glucose_level','bmi','smoking_status']
    for c in expected_cols:
        if c not in df.columns:
            df[c] = np.nan

    # Fill missing BMI: prefer column median if multiple rows, otherwise use scaler mean if available
    if 'bmi' in df.columns:
        if df['bmi'].isna().any():
            if df['bmi'].notna().sum() > 0:
                median_val = df['bmi'].median()
                df['bmi'] = df['bmi'].fillna(median_val)
            elif SCALER is not None and hasattr(SCALER, 'mean_') and hasattr(SCALER, 'feature_names_in_'):
                try:
                    cols = list(SCALER.feature_names_in_)
                    idx = cols.index('bmi')
                    df['bmi'] = df['bmi'].fillna(float(SCALER.mean_[idx]))
                except Exception:
                    df['bmi'] = df['bmi'].fillna(0.0)
            else:
                df['bmi'] = df['bmi'].fillna(0.0)

    # Feature engineering
    df['age_bmi'] = df['age'] * df['bmi']
    df['age_hypertension'] = df['age'] * df['hypertension']

    # One-hot encode categorical features; drop_first to match training
    # We'll restrict to the typical categorical columns
    cat_cols = ['gender', 'ever_married', 'work_type', 'Residence_type', 'smoking_status']
    df = pd.get_dummies(df, columns=cat_cols, drop_first=True)

    # If scaler has feature_names_in_, use that to align and reorder columns
    if SCALER is not None and hasattr(SCALER, 'feature_names_in_'):
        train_columns = list(SCALER.feature_names_in_)

        # add any missing columns with zeros
        for col in train_columns:
            if col not in df.columns:
                df[col] = 0.0

        # drop columns that weren't in training
        extra = [c for c in df.columns if c not in train_columns]
        if extra:
            df = df.drop(columns=extra)

        # reorder
        df = df[train_columns]
        arr = SCALER.transform(df.values)
        return arr

    # Fallback: if scaler doesn't provide feature names, fall back to numeric vector from earlier method
    # Convert row-by-row using the old deterministic mapping
    out = []
    for _, r in df.iterrows():
        # gender mapping using GENDERS order
        gender = [1.0 if getattr(r, 'gender') == g else 0.0 for g in GENDERS]
        age = float(r['age']) if pd.notna(r['age']) else 0.0
        hypertension = float(r['hypertension']) if pd.notna(r['hypertension']) else 0.0
        heart_disease = float(r['heart_disease']) if pd.notna(r['heart_disease']) else 0.0
        ever_married = 1.0 if str(r.get('ever_married', '')).strip().lower() in ('yes', 'y', 'true', '1') else 0.0
        work = [1.0 if r.get('work_type') == w else 0.0 for w in WORK_TYPES]
        residence = 1.0 if str(r.get('Residence_type', '')).strip().lower() == 'urban' else 0.0
        avg_glucose_level = float(r['avg_glucose_level']) if pd.notna(r['avg_glucose_level']) else 0.0
        bmi = float(r['bmi']) if pd.notna(r['bmi']) else 0.0
        smoking = [1.0 if r.get('smoking_status') == s else 0.0 for s in SMOKERS]
        features = gender + [age, hypertension, heart_disease, ever_married] + work + [residence, avg_glucose_level, bmi] + smoking
        out.append(features)
    return np.array(out, dtype=float)


@app.post('/predict')
async def predict(request: Request):
    """Accept either JSON (single row) or CSV content (text/csv or file upload).

    CSV input should contain the same columns used by the model, either a header + single row
    or multiple rows (we only predict the first row in this demo).
    """
    # ensure model loaded
    if KMODEL is None:
        raise HTTPException(status_code=503, detail='Model not loaded on the server. Check MODEL_PATH and dependencies.')

    content_type = (request.headers.get('content-type') or '').lower()
    data_row = None

    # JSON body -> parse into DataFrame directly (accept object or list)
    if 'application/json' in content_type:
        try:
            payload = await request.json()
            # payload may be a list of rows or a single dict
            if isinstance(payload, list):
                df = pd.DataFrame(payload)
            else:
                df = pd.DataFrame([payload])
        except Exception as e:
            raise HTTPException(status_code=400, detail=f'Invalid JSON payload: {e}')

    # CSV payload (text/csv or file upload multipart) -> parse first row
    elif 'text/csv' in content_type or 'multipart/form-data' in content_type or 'application/octet-stream' in content_type:
        try:
            body = await request.body()
            if not body:
                raise Exception('Empty request body')

            # allow bytes or string
            is_bytes = isinstance(body, (bytes, bytearray))
            if is_bytes:
                bio = BytesIO(body)
            else:
                bio = StringIO(body)

            df = pd.read_csv(bio)
            if df.shape[0] < 1:
                raise Exception('CSV did not contain any rows')

            # keep the dataframe as-is — we'll predict the first row in preprocess_dataframe
            pass
        except Exception as e:
            raise HTTPException(status_code=400, detail=f'Invalid CSV payload: {e}')

    else:
        # unsupported content type
        raise HTTPException(status_code=415, detail=f'Unsupported content-type: {content_type} — send JSON or CSV')

    # df should be available for both JSON and CSV branches; ensure it exists
    try:
        if 'df' not in locals():
            raise Exception('No data parsed from request')
        # preprocess the entire dataframe (we'll predict the first row(s))
        x = preprocess_dataframe(df)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f'Error preprocessing input: {e}')
    if KMODEL is None:
        raise HTTPException(status_code=503, detail='Model not loaded on the server. Check MODEL_PATH and dependencies.')

    # ready to predict
    # Keras predict
    try:
        preds = KMODEL.predict(x)
        # Accept logits or probabilities — try to extract single value
        prob = None
        if hasattr(preds, '__len__') and preds is not None:
            # preds could be (1,1) or (1,2)
            try:
                # if shape (1,1)
                prob = float(preds.ravel()[0])
            except Exception:
                prob = float(np.max(preds, axis=-1).ravel()[0])
        else:
            prob = float(preds)

        label = 1 if prob >= 0.5 else 0
        return { 'label': int(label), 'probability': float(prob) }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f'Prediction failed: {e}')


@app.get('/health')
async def health():
    """Simple health check so frontends can verify server reachability and whether model/scaler loaded."""
    return {
        'ok': True,
        'model_loaded': bool(KMODEL is not None),
        'scaler_loaded': bool(SCALER is not None),
    }
