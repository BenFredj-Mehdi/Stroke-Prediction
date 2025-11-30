// Example Node/Express server that demonstrates how to receive JSON and return a prediction
// This is a simple demo — replace the simulatePrediction() call with your real model invocation.

const express = require('express');
const app = express();
const port = process.env.PORT || 5000;

app.use(express.json());

function simulatePrediction(values) {
  let score = 0;
  score += Math.min(values.age / 100, 1) * 0.25;
  score += values.hypertension === 1 ? 0.18 : 0;
  score += values.heart_disease === 1 ? 0.16 : 0;
  score += Math.min(values.avg_glucose_level / 300, 1) * 0.18;
  if (values.bmi != null) score += Math.min(Math.max((values.bmi - 18.5) / 30, 0), 1) * 0.12;
  if (values.smoking_status === 'smokes') score += 0.06;
  if (values.smoking_status === 'formerly smoked') score += 0.03;
  score = Math.max(0, Math.min(1, score));
  return { probability: Math.round(score * 1000) / 1000, label: score >= 0.35 ? 1 : 0 };
}

app.post('/predict', (req, res) => {
  // In production you'd validate the input and call your trained model here.
  const values = req.body;
  if (!values) return res.status(400).json({ error: 'Missing JSON body' });

  // Convert strings to numbers if needed (this is a simple demo)
  const payload = {
    ...values,
    age: Number(values.age) || 0,
    hypertension: Number(values.hypertension) || 0,
    heart_disease: Number(values.heart_disease) || 0,
    avg_glucose_level: Number(values.avg_glucose_level) || 0,
    bmi: values.bmi == null || /^n\/?a$/i.test(values.bmi) ? null : Number(values.bmi),
  };

  // call your model substitute here
  const out = simulatePrediction(payload);

  // respond with a simple JSON object {label, probability}
  res.json(out);
});

app.listen(port, () => console.log(`Example prediction server listening at http://localhost:${port}/predict`));
