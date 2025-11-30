import pandas as pd
import joblib
from tensorflow.keras.models import load_model

# 1. Load test data
test_df = pd.read_csv("test.csv")
test_ids = test_df["id"]
X_test = test_df.drop(columns=["id"])

# 2. Fill missing BMI
X_test["bmi"] = X_test["bmi"].fillna(X_test["bmi"].median())

# 3. Feature engineering (same as training)
X_test['age_bmi'] = X_test['age'] * X_test['bmi']
X_test['age_hypertension'] = X_test['age'] * X_test['hypertension']

# 4. One-hot encode categorical features
X_test = pd.get_dummies(X_test, drop_first=True)

# 5. Align test columns with training columns stored in scaler
scaler = joblib.load("scaler.pkl")
train_columns = scaler.feature_names_in_

# Add missing columns
for col in train_columns:
    if col not in X_test.columns:
        X_test[col] = 0

# Drop extra columns
X_test = X_test[train_columns]  # reorder exactly as training

# 6. Scale features
X_test_scaled = scaler.transform(X_test)

# 7. Load model and predict
dl_model = load_model("stroke_best_dl_model.h5")
y_pred_proba = dl_model.predict(X_test_scaled).ravel()

# 8. Use the threshold from training
best_threshold = 0.5  # replace with your best threshold if saved
y_pred = (y_pred_proba >= best_threshold).astype(int)

# 9. Create submission
submission_df = pd.DataFrame({
    "id": test_ids,
    "stroke": y_pred
})
submission_df.to_csv("submission_f.csv", index=False)
print("Submission file saved as submission_f.csv")
