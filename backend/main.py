import os
import json
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

app = FastAPI(title="XAI-SolarGuard API", version="1.0.0")

# Enable CORS for Vite frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

ARTIFACTS_DIR = os.path.join(os.path.dirname(__file__), "artifacts")

def read_artifact_json(filename: str):
    filepath = os.path.join(ARTIFACTS_DIR, filename)
    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail=f"Artifact {filename} not found. Run backend/trainer.py first.")
    with open(filepath, "r") as f:
        return json.load(f)

@app.get("/api/summary")
def get_summary():
    """Returns top-level station metrics and list of urgent panels."""
    return read_artifact_json("panels_summary.json")

@app.get("/api/diagnostics")
def get_diagnostics():
    """Returns list of all panel diagnostics including SHAP reasons, power expectations, and actions."""
    return read_artifact_json("panel_diagnostics.json")

@app.get("/api/panel/{panel_id}")
def get_panel_diagnostic(panel_id: str):
    """Returns detailed diagnostic data for a single solar panel."""
    panels = read_artifact_json("panel_diagnostics.json")
    for p in panels:
        if p["panel_id"].upper() == panel_id.upper():
            return p
    raise HTTPException(status_code=404, detail=f"Panel {panel_id} not found.")

@app.get("/api/model-metrics")
def get_model_metrics():
    """Returns classification metrics, cross-validation accuracy, and confusion matrix."""
    return read_artifact_json("model_metrics.json")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
