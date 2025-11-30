# Example prediction server (demo)

This folder contains a tiny Node/Express demo server that accepts POST /predict with JSON and returns a JSON prediction. It's intended to help you test your frontend form and to show how you would connect a real model.

How to run (Windows PowerShell):

1. Open a terminal at this folder (`App/server_example`).
2. Install dependencies:

```powershell
npm install
```

3. Start the server:

```powershell
npm start
```

By default it runs on port 5000 and exposes POST http://localhost:5000/predict

Expected request payload (JSON):
{
  "id": "PAT-1",
  "gender": "Male",
  "age": 45,
  "hypertension": 0,
  "heart_disease": 0,
  "ever_married": "Yes",
  "work_type": "Private",
  "Residence_type": "Urban",
  "avg_glucose_level": 85.5,
  "bmi": 24.9,
  "smoking_status": "formerly smoked"
}

Response format (JSON):
{
  "label": 0,
  "probability": 0.123
}

Notes
- Replace the simulatePrediction() implementation with code that calls your actual model.
- For security, never run a model server that accepts arbitrary unvalidated input publicly without auth or rate limiting.
