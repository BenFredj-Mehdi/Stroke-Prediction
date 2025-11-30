# =============================================
# BEST STROKE PREDICTION PIPELINE
# =============================================

import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split, StratifiedKFold
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import roc_auc_score, average_precision_score, classification_report, confusion_matrix
from imblearn.over_sampling import SMOTE
from xgboost import XGBClassifier
import tensorflow as tf
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import Dense, Dropout
from tensorflow.keras.callbacks import EarlyStopping
import joblib

# ---------------------------------------------
# 1. LOAD DATA
# ---------------------------------------------
df = pd.read_csv("train.csv")
df = df.drop(columns=["id"])
df["bmi"] = df["bmi"].fillna(df["bmi"].median())

# Feature engineering: interaction features
df['age_bmi'] = df['age'] * df['bmi']
df['age_hypertension'] = df['age'] * df['hypertension']

# One-hot encode categorical features
df = pd.get_dummies(df, drop_first=True)

# ---------------------------------------------
# 2. SPLIT DATA
# ---------------------------------------------
X = df.drop("stroke", axis=1)
y = df["stroke"]

X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, stratify=y, random_state=42
)

# ---------------------------------------------
# 3. STANDARDIZE FEATURES
# ---------------------------------------------
scaler = StandardScaler()
X_train_scaled = scaler.fit_transform(X_train)
X_test_scaled = scaler.transform(X_test)

# ---------------------------------------------
# 4. HANDLE IMBALANCE WITH SMOTE
# ---------------------------------------------
smote = SMOTE(random_state=42)
X_res, y_res = smote.fit_resample(X_train_scaled, y_train)

# ---------------------------------------------
# 5. XGBOOST MODEL (Optional, for feature importance)
# ---------------------------------------------
xgb_model = XGBClassifier(
    n_estimators=1000,
    learning_rate=0.05,
    max_depth=4,
    scale_pos_weight=sum(y_train==0)/sum(y_train==1),  # handle imbalance
    random_state=42,
    use_label_encoder=False,
    eval_metric='auc'
)
xgb_model.fit(X_res, y_res)

# Feature importance can be used for neural network if desired
important_features = X.columns[np.argsort(xgb_model.feature_importances_)[-20:]]

# ---------------------------------------------
# 6. DEEP LEARNING MODEL
# ---------------------------------------------
dl_model = Sequential([
    Dense(128, activation='relu', input_shape=(X_res.shape[1],)),
    Dropout(0.3),
    Dense(64, activation='relu'),
    Dropout(0.2),
    Dense(32, activation='relu'),
    Dense(1, activation='sigmoid')
])

dl_model.compile(
    optimizer=tf.keras.optimizers.Adam(learning_rate=0.001),
    loss='binary_crossentropy',
    metrics=[tf.keras.metrics.AUC(name='auc')]
)

early_stop = EarlyStopping(
    monitor='val_auc',
    patience=15,
    mode='max',
    restore_best_weights=True,
    verbose=1
)

history = dl_model.fit(
    X_res, y_res,
    validation_split=0.2,
    epochs=200,
    batch_size=32,
    callbacks=[early_stop],
    verbose=1
)

# ---------------------------------------------
# 7. PREDICTIONS AND OPTIMIZE THRESHOLD
# ---------------------------------------------
y_pred_proba = dl_model.predict(X_test_scaled).ravel()

# Tune threshold for best F1/AUC
thresholds = np.linspace(0.1, 0.9, 81)
best_auc = 0
best_threshold = 0.5
for t in thresholds:
    y_pred_temp = (y_pred_proba >= t).astype(int)
    auc = roc_auc_score(y_test, y_pred_temp)
    if auc > best_auc:
        best_auc = auc
        best_threshold = t

y_pred = (y_pred_proba >= best_threshold).astype(int)

# ---------------------------------------------
# 8. METRICS
# ---------------------------------------------
print("\n=== FINAL VALIDATION REPORT ===\n")
print(classification_report(y_test, y_pred))
print("Confusion Matrix:\n", confusion_matrix(y_test, y_pred))
print("ROC-AUC:", roc_auc_score(y_test, y_pred_proba))
print("PR-AUC:", average_precision_score(y_test, y_pred_proba))
print("Best Threshold:", best_threshold)

# ---------------------------------------------
# 9. SAVE MODEL AND SCALER
# ---------------------------------------------
dl_model.save("stroke_best_dl_model.h5")
joblib.dump(scaler, "scaler.pkl")
print("Deep learning model saved as stroke_best_dl_model.h5 and scaler saved as scaler.pkl")
