import os
import sys
import json
import numpy as np
import pandas as pd
from sklearn.model_selection import StratifiedKFold
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
from sklearn.metrics import accuracy_score, confusion_matrix
from sklearn.decomposition import PCA
import shap

# Add project root to sys.path
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from backend.data_loader import load_data

def train_and_export_artifacts(artifacts_dir="backend/artifacts"):
    """
    Train Random Forest classifier with Stratified K-Fold CV,
    Train Expected Power Regressor on healthy samples,
    Compute SHAP explanations and plain English translations,
    Enforce electrical safety recommendations,
    Compute 2D PCA embeddings, and export JSON artifacts for frontend.
    """
    os.makedirs(artifacts_dir, exist_ok=True)
    df, schema_report = load_data()

    # Feature columns for fault classification
    feature_cols = ['irradiance', 'temperature', 'v_mp', 'i_mp', 'p_mp', 'v_oc', 'i_sc']
    X = df[feature_cols].values
    y = df['fault_label'].values

    # Known class labels (excluding 'unknown')
    unique_labels = sorted(list(set(y)))
    known_classes = [lbl for lbl in unique_labels if lbl != 'unknown']

    print("[Trainer] Running Stratified 5-Fold Cross-Validation...")
    skf = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    cv_accuracies = []
    
    # Filter known classes for cross validation
    mask_known = (y != 'unknown')
    X_known = X[mask_known]
    y_known = y[mask_known]

    y_true_all = []
    y_pred_all = []

    for train_idx, test_idx in skf.split(X_known, y_known):
        X_tr, X_te = X_known[train_idx], X_known[test_idx]
        y_tr, y_te = y_known[train_idx], y_known[test_idx]
        clf_fold = RandomForestClassifier(n_estimators=100, random_state=42)
        clf_fold.fit(X_tr, y_tr)
        preds = clf_fold.predict(X_te)
        cv_accuracies.append(accuracy_score(y_te, preds))
        y_true_all.extend(y_te)
        y_pred_all.extend(preds)

    mean_cv_acc = round(float(np.mean(cv_accuracies)) * 100, 2)
    cm_classes = sorted(list(set(y_known)))
    cm = confusion_matrix(y_true_all, y_pred_all, labels=cm_classes)

    print(f"[Trainer] Stratified CV Mean Accuracy: {mean_cv_acc}%")

    # Fit final classifier on all known samples
    clf = RandomForestClassifier(n_estimators=100, random_state=42)
    clf.fit(X_known, y_known)

    # Fit Expected Power Regressor on healthy samples only
    df_healthy = df[df['fault_label'] == 'healthy']
    X_reg = df_healthy[['irradiance', 'temperature']].values
    y_reg = df_healthy['p_mp'].values
    
    reg = RandomForestRegressor(n_estimators=100, random_state=42)
    reg.fit(X_reg, y_reg)
    print("[Trainer] Expected Power model fit on healthy baseline samples.")

    # SHAP Explainer on final classifier
    explainer = shap.TreeExplainer(clf)
    shap_values = explainer.shap_values(X)

    # 2D PCA Projection for Patterns scatter map
    pca = PCA(n_components=2, random_state=42)
    X_pca = pca.fit_transform(X)
    # Scale PCA coordinates to reasonable visualization bounds [-10, 10]
    pca_min, pca_max = X_pca.min(axis=0), X_pca.max(axis=0)
    X_pca_scaled = ((X_pca - pca_min) / (pca_max - pca_min + 1e-6) * 20.0) - 10.0

    # Rule-Based Recommendation Table with strict Electrical Safety Rules
    recommendation_map = {
        'healthy': [
            {"text": "No repair needed. System is operating within expected energy parameters.", "type": "self_service"}
        ],
        'shading/soiling': [
            {"text": "Inspect panel surface for dust accumulation, bird droppings, or fallen leaves.", "type": "self_service"},
            {"text": "Clean the panel surface with water and a soft cloth or squeegee.", "type": "self_service"},
            {"text": "Check nearby trees or structures for new shading and re-test output in 30 minutes.", "type": "self_service"}
        ],
        'aging': [
            {"text": "Perform a visual check for panel yellowing, cell delamination, or glass micro-cracks.", "type": "self_service"},
            {"text": "Log panel performance degradation in station maintenance register.", "type": "self_service"},
            {"text": "Schedule a routine preventative replacement with station engineer during next scheduled outage.", "type": "engineer"}
        ],
        'open-circuit': [
            {"text": "CRITICAL SAFETY NOTICE: Switch off the string isolator and do NOT touch live connectors.", "type": "engineer"},
            {"text": "Call a qualified electrician immediately to safely test open-circuit wiring and junction box connectors.", "type": "engineer"}
        ],
        'short-circuit': [
            {"text": "CRITICAL SAFETY NOTICE: Immediately isolate string power to prevent overheating and fire hazard.", "type": "engineer"},
            {"text": "Call a qualified electrician to inspect bypass diodes, cabling, and internal panel shorts.", "type": "engineer"}
        ],
        'overheating': [
            {"text": "Visually verify that rear panel airflow and ventilation channels are unobstructed.", "type": "self_service"},
            {"text": "Check string inverter logs to verify thermal shutdown limits.", "type": "self_service"},
            {"text": "If high temperature persists, call an electrician to test for localized cell hot-spots.", "type": "engineer"}
        ],
        'unrecognized_pattern': [
            {"text": "Sensor reading or electrical pattern is outside expected training signatures.", "type": "engineer"},
            {"text": "Call a qualified engineer or solar technician to perform manual multimeter testing.", "type": "engineer"}
        ]
    }

    panel_diagnostics = []
    total_energy_lost_w = 0.0

    # Process individual panel samples
    for i, row in df.iterrows():
        x_sample = X[i].reshape(1, -1)
        raw_label = row['fault_label']

        # Model prediction & probabilities
        probs = clf.predict_proba(x_sample)[0]
        max_prob_idx = np.argmax(probs)
        pred_class = clf.classes_[max_prob_idx]
        confidence = float(probs[max_prob_idx])

        # Flag Unrecognized Pattern if confidence < 0.50 or raw label was anomaly
        is_unrecognized = False
        if confidence < 0.50 or raw_label == 'unknown':
            is_unrecognized = True
            predicted_status = "Unrecognized pattern"
        else:
            predicted_status = pred_class

        # Expected power & energy loss
        exp_power = max(0.0, float(reg.predict([[row['irradiance'], row['temperature']]])[0]))
        act_power = max(0.0, float(row['p_mp']))

        if exp_power > 0:
            loss_pct = max(0.0, float((exp_power - act_power) / exp_power * 100.0))
        else:
            loss_pct = 0.0

        energy_lost_w = max(0.0, exp_power - act_power)
        total_energy_lost_w += energy_lost_w

        # Determine Severity Level based strictly on % energy lost
        if loss_pct < 10.0:
            severity = "Low"
            status_color = "green" if predicted_status == "healthy" else "amber"
        elif loss_pct <= 30.0:
            severity = "Medium"
            status_color = "amber"
        else:
            severity = "High"
            status_color = "red"

        if is_unrecognized:
            status_color = "gray"

        # Extract SHAP top 3 features and translate to plain English
        # Handling list vs 3D matrix shape in SHAP for multi-class tree explainer
        if isinstance(shap_values, list):
            sample_shap = np.abs(shap_values[max_prob_idx][i])
        else:
            sample_shap = np.abs(shap_values[i, :, max_prob_idx])

        top_feat_indices = np.argsort(sample_shap)[::-1][:3]
        top_reasons = []

        feature_name_map = {
            'irradiance': 'Sunlight level',
            'temperature': 'Panel temperature',
            'v_mp': 'Operating voltage (Vmp)',
            'i_mp': 'Operating current (Imp)',
            'p_mp': 'Power output (Pmp)',
            'v_oc': 'Open circuit voltage (Voc)',
            'i_sc': 'Short circuit current (Isc)'
        }

        for idx in top_feat_indices:
            fname = feature_cols[idx]
            val = float(X[i][idx])
            shap_score = float(sample_shap[idx])
            readable_name = feature_name_map.get(fname, fname)

            # Plain language explanation synthesis
            explanation = generate_plain_explanation(fname, val, predicted_status, row)
            top_reasons.append({
                "feature": readable_name,
                "value": round(val, 2),
                "importance_score": round(shap_score, 3),
                "explanation": explanation
            })

        # Recommended actions
        lookup_key = 'unrecognized_pattern' if is_unrecognized else predicted_status
        actions = recommendation_map.get(lookup_key, recommendation_map['unrecognized_pattern'])

        panel_diagnostics.append({
            "panel_id": str(row['panel_id']),
            "status": predicted_status,
            "is_unrecognized": is_unrecognized,
            "confidence": round(confidence * 100, 1),
            "severity": severity,
            "status_color": status_color,
            "expected_power_w": round(exp_power, 1),
            "actual_power_w": round(act_power, 1),
            "energy_loss_pct": round(loss_pct, 1),
            "energy_lost_w": round(energy_lost_w, 1),
            "top_reasons": top_reasons,
            "recommended_actions": actions,
            "pca_x": round(float(X_pca_scaled[i, 0]), 3),
            "pca_y": round(float(X_pca_scaled[i, 1]), 3),
            "raw_metrics": {
                "irradiance_w_m2": round(float(row['irradiance']), 2),
                "temperature_c": round(float(row['temperature']), 2),
                "v_mp_v": round(float(row['v_mp']), 2),
                "i_mp_a": round(float(row['i_mp']), 2),
                "p_mp_w": round(float(row['p_mp']), 2),
                "v_oc_v": round(float(row['v_oc']), 2),
                "i_sc_a": round(float(row['i_sc']), 2)
            }
        })

    # Summary Statistics
    healthy_count = sum(1 for p in panel_diagnostics if p['status'] == 'healthy' and not p['is_unrecognized'])
    attention_count = len(panel_diagnostics) - healthy_count
    red_panels = [p for p in panel_diagnostics if p['status_color'] == 'red']

    summary_data = {
        "total_panels": len(panel_diagnostics),
        "panels_healthy": healthy_count,
        "panels_needing_attention": attention_count,
        "estimated_energy_lost_kwh": round(total_energy_lost_w / 1000.0, 2),
        "urgent_panels_count": len(red_panels),
        "urgent_panels_list": [
            {
                "panel_id": p["panel_id"],
                "status": p["status"],
                "reason": p["top_reasons"][0]["explanation"] if p["top_reasons"] else "High energy loss detected"
            }
            for p in red_panels
        ]
    }

    # Model Performance Metrics
    model_metrics_data = {
        "cv_mean_accuracy_pct": mean_cv_acc,
        "confusion_matrix": cm.tolist(),
        "confusion_matrix_labels": [c.capitalize() for c in cm_classes],
        "dataset_info": schema_report
    }

    # Save JSON Artifacts
    with open(os.path.join(artifacts_dir, "panels_summary.json"), "w") as f:
        json.dump(summary_data, f, indent=2)

    with open(os.path.join(artifacts_dir, "panel_diagnostics.json"), "w") as f:
        json.dump(panel_diagnostics, f, indent=2)

    with open(os.path.join(artifacts_dir, "model_metrics.json"), "w") as f:
        json.dump(model_metrics_data, f, indent=2)

    print(f"[Trainer] Exported all artifacts to {artifacts_dir} successfully!")

def generate_plain_explanation(feature_name, value, status, row):
    """
    Translates feature SHAP contributions into plain English explanations for non-engineers.
    """
    if status == 'healthy':
        return f"{feature_name.capitalize()} is in optimal balance for current sunlight and temperature."

    if feature_name == 'i_mp' or feature_name == 'i_sc':
        if status == 'shading/soiling':
            return f"Current ({value}A) is much lower than normal for {row['irradiance']} W/m² sunlight, indicating dust or shade on the panel."
        elif status == 'open-circuit':
            return f"Current is near zero ({value}A) despite active sunlight, indicating a broken connection or unplugged wire."
        else:
            return f"Current output ({value}A) deviates significantly from healthy panel readings under current sunlight."

    elif feature_name == 'v_mp' or feature_name == 'v_oc':
        if status == 'aging':
            return f"Voltage ({value}V) is lower than normal specs, pointing to internal panel wear over time."
        elif status == 'short-circuit':
            return f"Voltage has collapsed to near zero ({value}V), indicating a dangerous electrical short circuit."
        elif status == 'overheating':
            return f"Voltage ({value}V) dropped sharply because cell temperature reached {row['temperature']}°C."
        else:
            return f"Operating voltage ({value}V) is lower than expected for standard healthy panel output."

    elif feature_name == 'temperature':
        return f"Cell temperature is high ({value}°C), which degrades solar efficiency and reduces power output."

    elif feature_name == 'irradiance':
        return f"Sunlight intensity is {value} W/m², but generated power is lower than expected for this irradiance."

    return f"Feature {feature_name} (value: {value}) contributed strongly to this fault diagnosis."

if __name__ == '__main__':
    train_and_export_artifacts()
