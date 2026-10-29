# XAI-SolarGuard ☀️🛡️
> **Solar Station Fault Monitoring, Explainable AI (XAI) Diagnosis & Action Guidance System**

XAI-SolarGuard is a minimalist, web-based explainable AI system designed specifically for non-technical solar station personnel (station in-charge, security guards, on-site operators). It monitors solar panel readings in real time, flags electrical and physical faults, explains **WHY** using plain-language SHAP feature attributions, and provides clear, step-by-step action guidance to resolve issues early before they cause costly downtime or damage.

---

## 🌟 Key Features

1. **Station Overview Screen**:
   - **3 Core Metrics**: Healthy panel count, panels needing attention, and total estimated energy lost today (kWh).
   - **Gentle Top Alert Banner**: Instantly highlights urgent panels with a quick-view listing modal.
   - **Panel Matrix Grid**: Color-coded 700-panel grid (Green = Healthy, Amber = Attention, Red = Urgent, Gray = Unrecognized).

2. **Diagnose Screen**:
   - **Plain-Language Status**: Plain words fault diagnosis, model confidence %, and severity badge (Low / Medium / High based on % energy lost).
   - **Expected vs. Actual Power Chart**: Single, clean chart comparing expected output for current irradiance/temperature against actual panel output, featuring a shaded energy loss gap (% energy lost).
   - **Why We Think This**: Top 3 SHAP feature contributions translated into readable English sentences with strength bars.
   - **What To Do (Safety-First Action Steps)**: Numbered steps tagged `[You can do this]` (e.g. cleaning dust, clearing shade) or `[Call an engineer]` / `[Qualified Electrician Required]`.
   - **Estimated Cost of Waiting**: Data-derived metrics showing ongoing energy loss.
   - **Details Drawer**: Closed-by-default raw telemetry drawer for technical inspection ($V_{mp}, I_{mp}, P_{mp}, Voc, Isc, Irradiance, Temp$).

3. **Patterns View**:
   - **2D Cluster Scatter Map**: Principal Component Analysis (PCA) 2D projection of all panel samples colored by fault state, with hollow circles representing unrecognized patterns.
   - **Confusion Matrix Toggle**: Interactive heat grid showing 5-Fold Stratified Cross-Validation model accuracy and class confusion metrics.

---

## ⚡ Strict Electrical Safety Rules

> **[IMPORTANT]**
> Anything involving wiring, connection breakdown, or electrical faults (**Open-Circuit**, **Short-Circuit**) MUST state:
> **"Switch off string isolator and call a qualified electrician immediately."**
> **No DIY repair steps** are given for high-voltage or live electrical work. DIY action steps are strictly restricted to safe physical tasks like cleaning panel surface dust or visual shade inspection.

---

## 📊 Dataset & Schema Analysis

- **Dataset Source**: *Photovoltaic Module Fault Data* (IEEE DataPort).
- **Data Location**: `/data/raw/`
- **Sample Nature**: **Single Spot Readings** (700 static panel operating samples, not time-series waveform data).
- **Real Columns**:
  - `panel_id`: Unique identifier
  - `irradiance`: Solar irradiance ($W/m^2$)
  - `temperature`: Module cell temperature ($^\circ C$)
  - `v_mp`: Maximum power point voltage ($V$)
  - `i_mp`: Maximum power point current ($A$)
  - `p_mp`: Maximum power output ($W$)
  - `v_oc`: Open circuit voltage ($V$)
  - `i_sc`: Short circuit current ($A$)
  - `fault_label`: `healthy`, `shading/soiling`, `aging`, `open-circuit`, `short-circuit`, `overheating`, `unknown`
- **Synthetic Placeholder**: If files are missing from `/data/raw/`, `data/synthetic_generator.py` automatically generates a 700-sample synthetic dataset matching the IEEE DataPort schema.

---

## 🚀 Quick Start Instructions

### Prerequisites
- Python 3.10+
- Node.js v18+ & npm

### Method 1: Automated Launch (Windows PowerShell)
Simply run the included `start.ps1` script:
```powershell
.\start.ps1
```

### Method 2: Manual Step-by-Step Launch

1. **Install Backend Dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

2. **Train Model & Export JSON Artifacts**:
   ```bash
   python backend/trainer.py
   ```

3. **Start FastAPI Backend Server**:
   ```bash
   python backend/main.py
   ```
   *Backend runs at `http://127.0.0.1:8000`*

4. **Install & Launch Frontend**:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
   *Frontend runs at `http://localhost:3000`*

---

## ⚠️ System Limitations & Disclaimers

1. **Small Dataset**: The model is trained on 700 samples (synthetic / IEEE DataPort baseline). Further field data collection is recommended for large utility-scale deployment.
2. **Rule-Based Recommendations**: Action steps are generated from an expert lookup table based on fault classifications and severity thresholds.
3. **Engineering Support Disclaimer**: XAI-SolarGuard is an assistive decision-support tool for station operators. It supports, but does **not** replace, a certified solar electrical engineer.
