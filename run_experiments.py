#!/usr/bin/env python3
"""
XAI-SolarGuard experiment runner
================================
Produces the results needed for the paper:
  1. Baselines   (RF vs LogReg / SVM / kNN / DecisionTree / MLP / XGBoost, same folds)
  2. Ablations   (feature drop-one, feature groups, physics regressor, trees, depth, class weights)
  3. TreeSHAP    (mean |phi| per class, beeswarms, per-sample top-3, faithfulness, stability)
  4. OOD         (threshold sweep, AUROC of scores, leave-one-class-out)
  5. Extras      (latency, model size, learning curve, calibration, PCA, confusion matrix)

Usage
-----
  python run_experiments.py --data your_dataset.csv --label-col fault_type
  python run_experiments.py --demo          # synthetic stand-in, ONLY to test the pipeline

Everything lands in ./results/ (or ./results_DEMO/). Send me results/results.json and
results/summary.md and I will fold them into the paper.

If your CSV uses different column names, edit COLMAP below.
"""
import argparse, json, pickle, platform, time, warnings
from pathlib import Path

import numpy as np
import pandas as pd
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from scipy import stats
from sklearn.decomposition import PCA
from sklearn.ensemble import IsolationForest, RandomForestClassifier, RandomForestRegressor
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (accuracy_score, confusion_matrix, precision_recall_fscore_support,
                             roc_auc_score)
from sklearn.model_selection import (RepeatedStratifiedKFold, StratifiedKFold, cross_val_predict,
                                     learning_curve)
from sklearn.neighbors import KNeighborsClassifier
from sklearn.neural_network import MLPClassifier
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.svm import SVC
from sklearn.tree import DecisionTreeClassifier

warnings.filterwarnings("ignore")

# ----------------------------------------------------------------------------- config
FEATURES = ["G", "Tc", "Vmp", "Imp", "Pmp", "Voc", "Isc"]
# map YOUR csv column names -> canonical names (left side = your name). Edit if needed.
COLMAP = {
    "irradiance": "G", "Irradiance": "G", "G": "G",
    "temperature": "Tc", "cell_temp": "Tc", "Tc": "Tc", "T": "Tc",
    "v_mp": "Vmp", "Vmp": "Vmp", "voltage_mp": "Vmp",
    "i_mp": "Imp", "Imp": "Imp", "current_mp": "Imp",
    "p_mp": "Pmp", "Pmp": "Pmp", "power": "Pmp",
    "v_oc": "Voc", "Voc": "Voc",
    "i_sc": "Isc", "Isc": "Isc",
}
LABEL_SYNONYMS = {
    "healthy": "Healthy", "normal": "Healthy",
    "shading": "Shading/Soiling", "soiling": "Shading/Soiling", "shading/soiling": "Shading/Soiling",
    "shading_soiling": "Shading/Soiling", "shading-soiling": "Shading/Soiling",
    "aging": "Aging", "ageing": "Aging",
    "open-circuit": "Open-Circuit", "open circuit": "Open-Circuit", "open_circuit": "Open-Circuit",
    "short-circuit": "Short-Circuit", "short circuit": "Short-Circuit", "short_circuit": "Short-Circuit",
    "overheating": "Overheating", "hotspot": "Overheating", "hot spot": "Overheating",
}
UNKNOWN_KEYS = {"unknown", "unrecognized", "unrecognised", "ood", "anomaly", "unrecognized anomaly"}
PAPER_COUNTS = {"Healthy": 350, "Shading/Soiling": 100, "Aging": 80, "Open-Circuit": 60,
                "Short-Circuit": 50, "Overheating": 45, "Unknown": 15}
IDX = {f: i for i, f in enumerate(FEATURES)}
SEED = 42
DEMO = False
DATA_SOURCE = None


# ----------------------------------------------------------------------------- helpers
def md(df, floatfmt=4):
    """Tiny markdown table writer (no tabulate dependency)."""
    df = df.copy()
    cols = [df.index.name or ""] + list(df.columns)
    lines = ["| " + " | ".join(map(str, cols)) + " |", "|" + "---|" * len(cols)]
    for idx, row in df.iterrows():
        cells = [f"{v:.{floatfmt}f}" if isinstance(v, (float, np.floating)) else str(v) for v in row]
        lines.append("| " + " | ".join([str(idx)] + cells) + " |")
    return "\n".join(lines)


def savefig(fig, path):
    if DEMO:
        fig.text(0.5, 0.5, "DEMO - SYNTHETIC DATA", fontsize=28, color="red", alpha=0.25,
                 ha="center", va="center", rotation=25)
    fig.tight_layout()
    fig.savefig(path, dpi=200)
    plt.close(fig)


def mean_sd(s):
    return f"{np.mean(s):.4f} ± {np.std(s, ddof=1):.4f}"


def prf(y, p, labels):
    pr, rc, f1, _ = precision_recall_fscore_support(y, p, labels=labels, average="macro", zero_division=0)
    return dict(acc=accuracy_score(y, p), prec=pr, rec=rc, f1=f1)


def new_rf(**kw):
    p = dict(n_estimators=100, random_state=SEED, n_jobs=-1)
    p.update(kw)
    return RandomForestClassifier(**p)


# ----------------------------------------------------------------------------- data
def make_demo(seed=SEED):
    """Synthetic stand-in with the same schema/class counts. NOT real results."""
    rng = np.random.default_rng(seed)
    counts = PAPER_COUNTS
    rows = []
    for cls, n in counts.items():
        G = rng.uniform(250, 1000, n)
        Tc = 20 + 0.03 * G + rng.normal(0, 3, n)
        Voc = 37.5 * (1 - 0.0035 * (Tc - 25)) * (1 + 0.04 * np.log(G / 1000)) + rng.normal(0, 0.3, n)
        Isc = 9.0 * G / 1000 * (1 + 0.0005 * (Tc - 25)) + rng.normal(0, 0.05, n)
        Vmp, Imp = 0.82 * Voc, 0.93 * Isc
        if cls == "Shading/Soiling":
            f = rng.uniform(0.55, 0.97, n); Isc, Imp = Isc * f, Imp * f
        elif cls == "Aging":
            Voc *= rng.uniform(0.88, 0.97, n); Vmp *= rng.uniform(0.75, 0.9, n)
        elif cls == "Open-Circuit":
            Imp = rng.uniform(0, 0.15, n)
        elif cls == "Short-Circuit":
            Vmp = rng.uniform(0, 3, n); Voc *= rng.uniform(0.1, 0.5, n)
        elif cls == "Overheating":
            Tc += rng.uniform(20, 35, n); Voc *= 1 - 0.0035 * (Tc - 25) * 0.5
        elif cls == "Unknown":
            Vmp *= rng.uniform(0.3, 1.4, n); Imp *= rng.uniform(0.2, 1.5, n); Voc *= rng.uniform(0.5, 1.2, n)
        Pmp = Vmp * Imp
        rows.append(pd.DataFrame(dict(G=G, Tc=Tc, Vmp=Vmp, Imp=Imp, Pmp=Pmp, Voc=Voc, Isc=Isc, label=cls)))
    return pd.concat(rows, ignore_index=True).sample(frac=1, random_state=seed).reset_index(drop=True)


def load_data(path, label_col):
    df = pd.read_csv(path)
    global DATA_SOURCE
    if "data_source" in df.columns:
        DATA_SOURCE = sorted(df["data_source"].astype(str).unique())
        print("data_source column:", DATA_SOURCE)
        if any("SYNTH" in d.upper() for d in DATA_SOURCE):
            print("[WARN] dataset is marked SYNTHETIC - describe it as synthetic in the paper.")
    df = df.rename(columns={c: COLMAP[c] for c in df.columns if c in COLMAP})
    missing = [f for f in FEATURES if f not in df.columns]
    if missing:
        raise SystemExit(f"Missing feature columns {missing}. Edit COLMAP. Columns found: {list(df.columns)}")
    if label_col not in df.columns:
        raise SystemExit(f"label column '{label_col}' not found. Columns: {list(df.columns)}")
    def norm(v):
        k = str(v).strip().lower()
        if k in UNKNOWN_KEYS: return "Unknown"
        return LABEL_SYNONYMS.get(k, str(v).strip())
    df["label"] = df[label_col].map(norm)
    return df[FEATURES + ["label"]]


# ----------------------------------------------------------------------------- 1. baselines
def model_zoo():
    zoo = {
        "Random Forest (100)": lambda: new_rf(),
        "Logistic Regression": lambda: make_pipeline(StandardScaler(), LogisticRegression(max_iter=3000)),
        "SVM (RBF)": lambda: make_pipeline(StandardScaler(), SVC(C=10, gamma="scale")),
        "k-NN (k=5)": lambda: make_pipeline(StandardScaler(), KNeighborsClassifier(5)),
        "Decision Tree": lambda: DecisionTreeClassifier(random_state=SEED),
        "MLP (64-32)": lambda: make_pipeline(StandardScaler(), MLPClassifier((64, 32), max_iter=1500, random_state=SEED)),
    }
    try:
        from xgboost import XGBClassifier
        zoo["XGBoost"] = lambda: XGBClassifier(n_estimators=200, max_depth=4, learning_rate=0.1,
                                               eval_metric="mlogloss", verbosity=0, random_state=SEED, n_jobs=-1)
    except Exception:
        print("[warn] xgboost not installed - skipping")
    return zoo


def run_baselines(X, y, labels, splits, out):
    rows, oof = [], {}
    for name, mk in model_zoo().items():
        print("  baseline:", name)
        oof[name] = np.zeros(len(y), int)
        for i, (tr, te) in enumerate(splits):
            m = mk()
            t0 = time.perf_counter(); m.fit(X[tr], y[tr]); tt = time.perf_counter() - t0
            t0 = time.perf_counter(); p = m.predict(X[te]); ti = time.perf_counter() - t0
            r = prf(y[te], p, labels); r.update(model=name, fold=i, repeat=i // 5, train_s=tt,
                                                 pred_ms_per_sample=1000 * ti / len(te))
            rows.append(r)
            if i < 5: oof[name][te] = p
    df = pd.DataFrame(rows); df.to_csv(out / "baselines_per_fold.csv", index=False)
    prim = df[df.repeat == 0].groupby("model", sort=False)[["acc", "prec", "rec", "f1"]].agg(["mean", "std"])
    rep = df.groupby("model", sort=False)[["acc", "prec", "rec", "f1", "train_s", "pred_ms_per_sample"]].agg(["mean", "std"])
    table = pd.DataFrame(index=rep.index)
    table["Acc (5x3 CV)"] = [mean_sd(df[df.model == m].acc) for m in rep.index]
    table["Macro-P"] = [mean_sd(df[df.model == m].prec) for m in rep.index]
    table["Macro-R"] = [mean_sd(df[df.model == m].rec) for m in rep.index]
    table["Macro-F1"] = [mean_sd(df[df.model == m].f1) for m in rep.index]
    table["Acc (single 5-fold)"] = [f"{prim.loc[m, ('acc', 'mean')]:.4f}" for m in rep.index]
    table["Train s"] = [f"{rep.loc[m, ('train_s', 'mean')]:.3f}" for m in rep.index]
    table["Pred ms/sample"] = [f"{rep.loc[m, ('pred_ms_per_sample', 'mean')]:.4f}" for m in rep.index]
    table.to_csv(out / "baselines_table.csv")
    # significance of RF vs each baseline: paired Wilcoxon over the 15 folds + exact McNemar on OOF preds
    sig = []
    rf = "Random Forest (100)"
    for m in rep.index:
        if m == rf: continue
        a = df[df.model == rf].sort_values("fold").acc.values
        b = df[df.model == m].sort_values("fold").acc.values
        try: w = stats.wilcoxon(a, b).pvalue if np.any(a != b) else 1.0
        except Exception: w = np.nan
        ra, rb = oof[rf] == y, oof[m] == y
        n01, n10 = int(np.sum(ra & ~rb)), int(np.sum(~ra & rb))
        mc = stats.binomtest(min(n01, n10), n01 + n10, 0.5).pvalue if n01 + n10 > 0 else 1.0
        sig.append(dict(baseline=m, wilcoxon_p=w, mcnemar_p=mc, rf_only_correct=n01, baseline_only_correct=n10))
    sig = pd.DataFrame(sig).set_index("baseline"); sig.to_csv(out / "baselines_significance.csv")
    return table, sig, oof[rf]


# ----------------------------------------------------------------------------- physics regressor
def physics_features(Xtr, htr, Xte, seed=SEED):
    """Expected-power regressor Pexp=f(G,Tc), trained on healthy TRAIN rows only.
    Healthy train rows get out-of-fold predictions (no leakage)."""
    gi, ti, pi = IDX["G"], IDX["Tc"], IDX["Pmp"]
    mk = lambda: RandomForestRegressor(100, min_samples_leaf=3, random_state=seed, n_jobs=-1)
    Xh, yh = Xtr[htr][:, [gi, ti]], Xtr[htr, pi]
    full = mk().fit(Xh, yh)
    e_tr = full.predict(Xtr[:, [gi, ti]])
    e_tr[htr] = cross_val_predict(mk(), Xh, yh, cv=5)
    e_te = full.predict(Xte[:, [gi, ti]])
    def f(X, e):
        d = np.maximum(0, e - X[:, pi]); return np.c_[100 * d / np.maximum(e, 1e-6), d]
    return f(Xtr, e_tr), f(Xte, e_te), e_te


def run_physics(X, y, labels, classes, splits, out):
    healthy_id = list(classes).index("Healthy") if "Healthy" in classes else None
    if healthy_id is None:
        return None, None
    accs, f1s, reg_rows, loss_rows = [], [], [], []
    for i, (tr, te) in enumerate(splits):
        ftr, fte, e_te = physics_features(X[tr], y[tr] == healthy_id, X[te])
        m = new_rf().fit(np.c_[X[tr], ftr], y[tr]); p = m.predict(np.c_[X[te], fte])
        r = prf(y[te], p, labels); accs.append(r["acc"]); f1s.append(r["f1"])
        hm = y[te] == healthy_id
        if hm.sum() > 1:
            a, b = X[te][hm, IDX["Pmp"]], e_te[hm]
            reg_rows.append(dict(fold=i, MAE_W=np.mean(np.abs(a - b)),
                                 MAPE_pct=100 * np.mean(np.abs(a - b) / np.maximum(a, 1e-6)),
                                 R2=1 - np.sum((a - b) ** 2) / np.sum((a - a.mean()) ** 2)))
        if i < 5:
            for j, idx in enumerate(te): loss_rows.append(dict(cls=classes[y[idx]], loss_pct=fte[j, 0], dP_W=fte[j, 1]))
    reg = pd.DataFrame(reg_rows); reg.to_csv(out / "regressor_healthy_heldout.csv", index=False)
    loss = pd.DataFrame(loss_rows)
    loss["severity"] = pd.cut(loss.loss_pct, [-1e-9, 10, 30, np.inf], labels=["Low(<10%)", "Medium(10-30%)", "High(>30%)"])
    sev = pd.crosstab(loss.cls, loss.severity); sev.to_csv(out / "severity_by_class.csv")
    byc = loss.groupby("cls")[["loss_pct", "dP_W"]].agg(["mean", "std", "median"]); byc.columns = ["_".join(c) for c in byc.columns]; byc.to_csv(out / "loss_by_class.csv")
    fig, ax = plt.subplots(figsize=(7, 3.6))
    order = list(classes)
    ax.boxplot([loss[loss.cls == c].loss_pct.values for c in order], labels=order, showfliers=False)
    ax.axhline(10, ls="--", c="gray"); ax.axhline(30, ls="--", c="gray")
    ax.set_ylabel("Power loss (%)"); plt.setp(ax.get_xticklabels(), rotation=30, ha="right")
    savefig(fig, out / "fig_loss_by_class.png")
    return dict(acc=accs, f1=f1s), dict(reg=reg.mean().to_dict(), severity=sev, loss=byc)


# ----------------------------------------------------------------------------- 2. ablations
def cv_rf(Xs, y, labels, splits, **kw):
    a, f = [], []
    for tr, te in splits:
        p = new_rf(**kw).fit(Xs[tr], y[tr]).predict(Xs[te]); r = prf(y[te], p, labels); a.append(r["acc"]); f.append(r["f1"])
    return a, f


def run_ablations(X, y, labels, classes, splits, out):
    rows = []
    def add(group, name, a, f): rows.append(dict(group=group, variant=name, acc=mean_sd(a), macro_f1=mean_sd(f),
                                                 acc_mean=np.mean(a)))
    a0, f0 = cv_rf(X, y, labels, splits); add("reference", "All 7 features", a0, f0)
    for fe in FEATURES:                                       # drop-one
        keep = [i for i, f in enumerate(FEATURES) if f != fe]
        a, f = cv_rf(X[:, keep], y, labels, splits); add("drop-one feature", f"- {fe}", a, f)
    groups = {"Electrical only (Vmp,Imp,Pmp,Voc,Isc)": ["Vmp", "Imp", "Pmp", "Voc", "Isc"],
              "Environmental only (G,Tc)": ["G", "Tc"],
              "No derived Pmp (=Vmp*Imp)": ["G", "Tc", "Vmp", "Imp", "Voc", "Isc"],
              "No environmental (G,Tc)": ["Vmp", "Imp", "Pmp", "Voc", "Isc"]}
    for n, fs in groups.items():
        a, f = cv_rf(X[:, [IDX[k] for k in fs]], y, labels, splits); add("feature group", n, a, f)
    # engineered ratios (FF-style)
    ff = (X[:, IDX["Vmp"]] * X[:, IDX["Imp"]]) / np.maximum(X[:, IDX["Voc"]] * X[:, IDX["Isc"]], 1e-9)
    ratios = np.c_[ff, X[:, IDX["Vmp"]] / np.maximum(X[:, IDX["Voc"]], 1e-9), X[:, IDX["Imp"]] / np.maximum(X[:, IDX["Isc"]], 1e-9)]
    a, f = cv_rf(np.c_[X, ratios], y, labels, splits); add("engineered", "+ FF, Vmp/Voc, Imp/Isc", a, f)
    # physics regressor as classifier input
    phys, physinfo = run_physics(X, y, labels, classes, splits, out)
    if phys: add("physics regressor", "+ regressor loss% and dP (in-fold, no leakage)", phys["acc"], phys["f1"])
    for n in [10, 25, 50, 100, 200, 500]:
        a, f = cv_rf(X, y, labels, splits, n_estimators=n); add("n_estimators", f"{n} trees", a, f)
    for d in [2, 3, 5, 10, None]:
        a, f = cv_rf(X, y, labels, splits, max_depth=d); add("max_depth", f"depth={d}", a, f)
    for cw in [None, "balanced"]:
        a, f = cv_rf(X, y, labels, splits, class_weight=cw); add("class weights", f"{cw}", a, f)
    df = pd.DataFrame(rows).drop(columns="acc_mean"); df.to_csv(out / "ablations.csv", index=False)
    # paired test: variant vs reference over folds
    return df, a0, physinfo



# ----------------------------------------------------------------------------- 2b. noise robustness
def run_noise(X, y, labels, splits, out):
    """Multiplicative Gaussian sensor noise on the 6 measured quantities (Pmp recomputed = Vmp*Imp).
    Noise is applied to train AND test data. Shows whether results survive overlap between classes."""
    rng = np.random.default_rng(SEED)
    levels = [0.0, 0.02, 0.05, 0.10, 0.20]
    zoo = model_zoo()
    names = [n for n in ["Random Forest (100)", "Logistic Regression", "SVM (RBF)", "MLP (64-32)"] if n in zoo]
    rows = []
    for sg in levels:
        Xn = X.copy()
        if sg > 0:
            for f in ["G", "Tc", "Vmp", "Imp", "Voc", "Isc"]:
                Xn[:, IDX[f]] = X[:, IDX[f]] * (1 + rng.normal(0, sg, len(X)))
            Xn[:, IDX["Pmp"]] = Xn[:, IDX["Vmp"]] * Xn[:, IDX["Imp"]]
        for nm in names:
            a, f1s = [], []
            for tr, te in splits[:5]:
                p = zoo[nm]().fit(Xn[tr], y[tr]).predict(Xn[te]); r = prf(y[te], p, labels); a.append(r["acc"]); f1s.append(r["f1"])
            rows.append(dict(noise_sigma=sg, model=nm, acc=np.mean(a), acc_sd=np.std(a, ddof=1), macro_f1=np.mean(f1s)))
    df = pd.DataFrame(rows); df.to_csv(out / "noise_robustness.csv", index=False)
    piv = df.pivot(index="noise_sigma", columns="model", values="acc")[names]
    fig, ax = plt.subplots(figsize=(5.4, 3.6))
    for nm in names: ax.plot(piv.index * 100, piv[nm], "o-", label=nm)
    ax.set_xlabel("relative sensor noise sigma (%)"); ax.set_ylabel("5-fold accuracy"); ax.legend(fontsize=7)
    savefig(fig, out / "fig_noise_robustness.png")
    return piv

# ----------------------------------------------------------------------------- 3. SHAP
def shap_values_3d(model, X):
    import shap
    sv = shap.TreeExplainer(model).shap_values(X)
    return np.stack(sv, axis=-1) if isinstance(sv, list) else np.asarray(sv)          # (n, f, K)


def run_shap(X, y, classes, labels, splits, out, n_boot):
    import shap
    K = len(classes)
    rf = new_rf().fit(X, y); sv = shap_values_3d(rf, X)
    proba = rf.predict_proba(X); pred = proba.argmax(1)
    # global: mean |phi| per true class
    g = pd.DataFrame({classes[k]: np.abs(sv[y == k][:, :, k]).mean(0) for k in range(K)}, index=FEATURES)
    g["ALL (pred-class)"] = np.abs(sv[np.arange(len(X)), :, pred]).mean(0)
    g.to_csv(out / "shap_mean_abs_per_class.csv")
    fig, ax = plt.subplots(figsize=(7, 3.8)); im = ax.imshow(g.values, aspect="auto", cmap="viridis")
    ax.set_xticks(range(g.shape[1])); ax.set_xticklabels(g.columns, rotation=35, ha="right")
    ax.set_yticks(range(len(FEATURES))); ax.set_yticklabels(FEATURES); fig.colorbar(im, label="mean |phi|")
    savefig(fig, out / "fig_shap_heatmap.png")
    # beeswarms per class
    for k in range(K):
        shap.summary_plot(sv[:, :, k], X, feature_names=FEATURES, show=False, plot_size=(6, 3.6))
        plt.title(f"TreeSHAP - class: {classes[k]}"); fig = plt.gcf()
        savefig(fig, out / f"fig_shap_beeswarm_{classes[k].replace('/', '_')}.png")
    # per-sample top-3 (most confident correctly classified sample per class)
    rows = []
    for k in range(K):
        cand = np.where((y == k) & (pred == k))[0]
        if len(cand) == 0: continue
        i = cand[np.argmax(proba[cand, k])]; phi = sv[i, :, k]; share = np.abs(phi) / np.abs(phi).sum()
        for rank, j in enumerate(np.argsort(-np.abs(phi))[:3], 1):
            rows.append(dict(cls=classes[k], sample=int(i), rank=rank, feature=FEATURES[j], value=float(X[i, j]),
                             phi=float(phi[j]), share=float(share[j])))
    ps = pd.DataFrame(rows); ps.to_csv(out / "shap_per_sample_top3.csv", index=False)
    # top-3 feature frequency per predicted class (how consistent is the rule-engine input?)
    top3 = np.argsort(-np.abs(sv[np.arange(len(X)), :, pred]), axis=1)[:, :3]
    freq = pd.DataFrame(0.0, index=FEATURES, columns=classes)
    for k in range(K):
        m = pred == k
        if m.sum():
            for j in range(len(FEATURES)): freq.loc[FEATURES[j], classes[k]] = np.mean((top3[m] == j).any(1))
    freq.to_csv(out / "shap_top3_frequency.csv")
    # faithfulness (held-out folds): replace top-k features with train median vs random k features
    rng = np.random.default_rng(SEED); faith = {k: {"shap": [], "random": []} for k in (1, 2, 3)}
    for tr, te in splits[:5]:
        m = new_rf().fit(X[tr], y[tr]); s = shap_values_3d(m, X[te]); pr = m.predict_proba(X[te]); pc = pr.argmax(1)
        base = pr[np.arange(len(te)), pc]; phi = s[np.arange(len(te)), :, pc]; med = np.median(X[tr], 0)
        for k in (1, 2, 3):
            order = np.argsort(-np.abs(phi), 1)[:, :k]; Xd = X[te].copy()
            for j in range(k): Xd[np.arange(len(te)), order[:, j]] = med[order[:, j]]
            faith[k]["shap"].append(np.mean(base - m.predict_proba(Xd)[np.arange(len(te)), pc]))
            rd = []
            for _ in range(20):
                Xr = X[te].copy()
                for r_i in range(len(te)):
                    cols = rng.choice(len(FEATURES), k, replace=False); Xr[r_i, cols] = med[cols]
                rd.append(np.mean(base - m.predict_proba(Xr)[np.arange(len(te)), pc]))
            faith[k]["random"].append(np.mean(rd))
    fa = pd.DataFrame({f"top-{k}": [mean_sd(faith[k]["shap"]), mean_sd(faith[k]["random"])] for k in (1, 2, 3)},
                      index=["Prob. drop: remove SHAP top-k", "Prob. drop: remove random k"])
    fa.to_csv(out / "shap_faithfulness.csv")
    # stability: Jaccard of top-3 sets across bootstrap-refit models
    ref_sets = [set(r) for r in top3]; jac = {c: [] for c in classes}
    for b in range(n_boot):
        rs = np.random.default_rng(1000 + b); idx = np.concatenate([rs.choice(np.where(y == k)[0], (y == k).sum()) for k in range(K)])
        m = new_rf(random_state=1000 + b).fit(X[idx], y[idx]); s = shap_values_3d(m, X)
        t3 = np.argsort(-np.abs(s[np.arange(len(X)), :, pred]), axis=1)[:, :3]
        for i in range(len(X)):
            a, c = ref_sets[i], set(t3[i]); jac[classes[pred[i]]].append(len(a & c) / len(a | c))
    st = pd.DataFrame({"mean Jaccard top-3": {c: np.mean(v) if v else np.nan for c, v in jac.items()}})
    st.loc["ALL"] = np.mean([x for v in jac.values() for x in v]); st.to_csv(out / "shap_stability.csv")
    return g, ps, freq, fa, st


# ----------------------------------------------------------------------------- 4. OOD
def entropy(P): return -(P * np.log(np.clip(P, 1e-12, 1))).sum(1)


def run_ood(X, y, Xu, classes, labels, splits, out):
    K = len(classes); res = {}
    oof = np.zeros((len(y), K)); pu = np.zeros((len(Xu), K)) if len(Xu) else None
    for tr, te in splits[:5]:
        m = new_rf().fit(X[tr], y[tr]); oof[te] = m.predict_proba(X[te])
        if pu is not None: pu += m.predict_proba(Xu) / 5
    pred = oof.argmax(1); conf = oof.max(1)
    # calibration
    bins = np.linspace(0, 1, 11); ece = 0
    for lo, hi in zip(bins[:-1], bins[1:]):
        m = (conf > lo) & (conf <= hi)
        if m.any(): ece += m.mean() * abs((pred[m] == y[m]).mean() - conf[m].mean())
    res["ECE_maxprob"] = float(ece)
    fig, ax = plt.subplots(figsize=(4, 4)); xs, ys = [], []
    for lo, hi in zip(bins[:-1], bins[1:]):
        m = (conf > lo) & (conf <= hi)
        if m.sum() > 3: xs.append(conf[m].mean()); ys.append((pred[m] == y[m]).mean())
    ax.plot([0, 1], [0, 1], "--", c="gray"); ax.plot(xs, ys, "o-"); ax.set_xlabel("Confidence"); ax.set_ylabel("Accuracy")
    savefig(fig, out / "fig_calibration.png")
    # threshold sweep (needs the labelled unknown samples)
    if pu is not None:
        rows = []
        for t in [0.30, 0.35, 0.40, 0.45, 0.50, 0.55, 0.60, 0.65, 0.70, 0.80, 0.90]:
            acc_mask = conf >= t
            rows.append(dict(threshold=t, unknown_detected=float(np.mean(pu.max(1) < t)),
                             known_rejected=float(np.mean(~acc_mask)),
                             accuracy_on_accepted=float(np.mean(pred[acc_mask] == y[acc_mask])) if acc_mask.any() else np.nan))
        sw = pd.DataFrame(rows).set_index("threshold"); sw.to_csv(out / "ood_threshold_sweep.csv"); res["sweep"] = sw
        # scores: higher = more OOD
        iso = IsolationForest(random_state=SEED, n_estimators=200).fit(X)
        scores = {"1 - max prob": (1 - conf, 1 - pu.max(1)), "entropy": (entropy(oof), entropy(pu)),
                  "IsolationForest": (-iso.score_samples(X), -iso.score_samples(Xu))}
        au = {n: roc_auc_score(np.r_[np.zeros(len(a)), np.ones(len(b))], np.r_[a, b]) for n, (a, b) in scores.items()}
        res["auroc"] = pd.Series(au, name="AUROC (unknown = positive)"); res["auroc"].to_csv(out / "ood_auroc.csv")
        rej = pd.Series({classes[k]: float(np.mean(conf[y == k] < 0.5)) for k in range(K)}, name="rejected @0.50")
        rej.to_csv(out / "ood_known_rejection_by_class.csv"); res["rej_by_class"] = rej
        fig, ax = plt.subplots(figsize=(5.2, 3.4)); ax.hist(conf, 30, alpha=.6, label="known (OOF)", density=True)
        ax.hist(pu.max(1), 15, alpha=.6, label="unknown", density=True); ax.axvline(.5, c="k", ls="--")
        ax.set_xlabel("max class probability"); ax.legend(); savefig(fig, out / "fig_ood_hist.png")
    # leave-one-class-out: stronger evidence than 15 samples
    rows = []
    for k in range(K):
        kn = np.where(y != k)[0]; un = np.where(y == k)[0]
        trk, tek = next(StratifiedKFold(5, shuffle=True, random_state=SEED).split(X[kn], y[kn]))
        m = new_rf().fit(X[kn][trk], y[kn][trk]); pk = m.predict_proba(X[kn][tek]).max(1); pu_k = m.predict_proba(X[un]).max(1)
        rows.append(dict(held_out_class=classes[k], n_unknown=len(un),
                         AUROC=roc_auc_score(np.r_[np.zeros(len(pk)), np.ones(len(pu_k))], np.r_[1 - pk, 1 - pu_k]),
                         detected_at_0_50=float(np.mean(pu_k < 0.5)), known_rejected_at_0_50=float(np.mean(pk < 0.5))))
    loco = pd.DataFrame(rows).set_index("held_out_class"); loco.to_csv(out / "ood_leave_one_class_out.csv"); res["loco"] = loco
    return res, oof


# ----------------------------------------------------------------------------- 5. extras
def run_extras(X, y, classes, labels, oof_pred, out):
    ex = {}
    cm = confusion_matrix(y, oof_pred, labels=labels); pd.DataFrame(cm, index=classes, columns=classes).to_csv(out / "confusion_matrix_rf.csv")
    p, r, f, s = precision_recall_fscore_support(y, oof_pred, labels=labels, zero_division=0)
    pc = pd.DataFrame(dict(precision=p, recall=r, f1=f, support=s), index=classes); pc.to_csv(out / "per_class_metrics_rf.csv"); ex["per_class"] = pc
    acc = accuracy_score(y, oof_pred); n = len(y); z = 1.96; ph = acc
    ci = ((ph + z * z / (2 * n) - z * np.sqrt(ph * (1 - ph) / n + z * z / (4 * n * n))) / (1 + z * z / n),
          (ph + z * z / (2 * n) + z * np.sqrt(ph * (1 - ph) / n + z * z / (4 * n * n))) / (1 + z * z / n))
    ex["rf_oof_accuracy"] = float(acc); ex["wilson95"] = [float(ci[0]), float(ci[1])]
    fig, ax = plt.subplots(figsize=(5.2, 4.4)); ax.imshow(cm, cmap="Blues")
    for (i, j), v in np.ndenumerate(cm): ax.text(j, i, v, ha="center", va="center", fontsize=8, color="white" if v > cm.max() / 2 else "black")
    ax.set_xticks(range(len(classes))); ax.set_xticklabels(classes, rotation=40, ha="right"); ax.set_yticks(range(len(classes))); ax.set_yticklabels(classes)
    ax.set_xlabel("Predicted"); ax.set_ylabel("Actual"); savefig(fig, out / "fig_confusion_matrix.png")
    # latency / size
    m = new_rf(n_jobs=1).fit(X, y); x1 = X[:1]; t = []
    for _ in range(300): t0 = time.perf_counter(); m.predict(x1); t.append((time.perf_counter() - t0) * 1000)
    ex["predict_latency_ms_single_sample_1thread"] = dict(median=float(np.median(t)), p95=float(np.percentile(t, 95)))
    import shap
    expl = shap.TreeExplainer(m); t = []
    for i in range(100): t0 = time.perf_counter(); expl.shap_values(X[i:i + 1]); t.append((time.perf_counter() - t0) * 1000)
    ex["treeshap_latency_ms_single_sample"] = dict(median=float(np.median(t)), p95=float(np.percentile(t, 95)))
    ex["model_size_kB_pickle"] = len(pickle.dumps(m)) / 1024
    # learning curve
    sizes, trs, tes = learning_curve(new_rf(), X, y, train_sizes=np.linspace(0.1, 1, 8), cv=StratifiedKFold(5, shuffle=True, random_state=SEED))
    lc = pd.DataFrame(dict(train_size=sizes, train_acc=trs.mean(1), val_acc=tes.mean(1), val_std=tes.std(1))); lc.to_csv(out / "learning_curve.csv", index=False)
    fig, ax = plt.subplots(figsize=(5, 3.4)); ax.plot(sizes, trs.mean(1), "o-", label="train")
    ax.errorbar(sizes, tes.mean(1), tes.std(1), fmt="s-", label="validation"); ax.set_xlabel("training samples"); ax.set_ylabel("accuracy"); ax.legend()
    savefig(fig, out / "fig_learning_curve.png")
    # PCA
    Z = PCA(2, random_state=SEED).fit(StandardScaler().fit_transform(X)); Zt = Z.transform(StandardScaler().fit_transform(X))
    ex["pca_explained_variance_ratio"] = Z.explained_variance_ratio_.tolist()
    fig, ax = plt.subplots(figsize=(5.4, 4))
    for k, c in enumerate(classes): ax.scatter(*Zt[y == k].T, s=8, label=c)
    ax.legend(fontsize=6); ax.set_xlabel("PC1"); ax.set_ylabel("PC2"); savefig(fig, out / "fig_pca.png")
    return ex


# ----------------------------------------------------------------------------- main
def main():
    global SEED, DEMO
    ap = argparse.ArgumentParser()
    ap.add_argument("--data"); ap.add_argument("--label-col", default="label")
    ap.add_argument("--demo", action="store_true"); ap.add_argument("--seed", type=int, default=42)
    ap.add_argument("--boot", type=int, default=10, help="bootstrap refits for SHAP stability")
    a = ap.parse_args(); SEED = a.seed; DEMO = a.demo
    out = Path("results_DEMO" if DEMO else "results"); out.mkdir(exist_ok=True)
    df = make_demo(SEED) if DEMO else load_data(a.data, a.label_col)
    if not DEMO and not a.data: raise SystemExit("give --data or --demo")
    counts = df.label.value_counts().to_dict(); print("class counts:", counts)
    if not DEMO and any(counts.get(k, 0) != v for k, v in PAPER_COUNTS.items()):
        print("[warn] class counts differ from the paper's table:", PAPER_COUNTS)
    known, unk = df[df.label != "Unknown"], df[df.label == "Unknown"]
    classes = sorted(known.label.unique()); le = LabelEncoder().fit(classes)
    X = known[FEATURES].values.astype(float); y = le.transform(known.label); Xu = unk[FEATURES].values.astype(float)
    labels = list(range(len(classes)))
    # repeat 0 = StratifiedKFold(5, shuffle=True, random_state=42): identical to backend/trainer.py
    splits = []
    for sd in (SEED, SEED + 1, SEED + 2):
        splits += list(StratifiedKFold(5, shuffle=True, random_state=sd).split(X, y))
    R = {"demo": DEMO, "seed": SEED, "data_source": DATA_SOURCE, "n_known": int(len(X)), "n_unknown": int(len(Xu)), "class_counts": counts,
         "versions": {"python": platform.python_version(), "numpy": np.__version__, "pandas": pd.__version__}}
    try:
        import sklearn, shap; R["versions"].update(sklearn=sklearn.__version__, shap=shap.__version__)
    except Exception: pass

    print("[1/5] baselines"); base, sig, rf_oof = run_baselines(X, y, labels, splits, out)
    print("[check] RF single 5-fold accuracy:", base.loc["Random Forest (100)", "Acc (single 5-fold)"], "(backend/trainer.py reported 0.9839)")
    print("[2/5] ablations"); abl, a0, physinfo = run_ablations(X, y, labels, classes, splits, out)
    print("[2b/5] noise robustness"); noise_tbl = run_noise(X, y, labels, splits, out)
    print("[3/5] TreeSHAP"); g, ps, freq, fa, st = run_shap(X, y, classes, labels, splits, out, a.boot)
    print("[4/5] OOD"); ood, _ = run_ood(X, y, Xu, classes, labels, splits, out)
    print("[5/5] extras"); ex = run_extras(X, y, classes, labels, rf_oof, out)

    R.update(baselines=base.to_dict("index"), significance=sig.to_dict("index"), ablations=abl.to_dict("records"),
             shap_mean_abs=g.to_dict(), shap_per_sample=ps.to_dict("records"), shap_top3_frequency=freq.to_dict(),
             shap_faithfulness=fa.to_dict(), shap_stability=st.to_dict(),
             ood={k: (v.to_dict() if hasattr(v, "to_dict") else v) for k, v in ood.items()},
             extras={k: (v.to_dict() if hasattr(v, "to_dict") else v) for k, v in ex.items()})
    if physinfo:
        R["physics"] = dict(regressor_heldout_healthy=physinfo["reg"], severity_by_class={str(k): v for k, v in physinfo["severity"].astype(int).to_dict("index").items()},
                            loss_by_class=physinfo["loss"].to_dict())
    (out / "results.json").write_text(json.dumps(R, indent=2, default=str))

    S = []
    if DEMO: S.append("# DEMO RUN - SYNTHETIC DATA - NOT RESULTS FOR THE PAPER\n")
    if DATA_SOURCE: S.append(f"data_source: {DATA_SOURCE}\n")
    S += [f"# XAI-SolarGuard results (seed {SEED}; {len(X)} known, {len(Xu)} unknown)\n",
          "## 1. Baselines (same folds)\n", md(base), "\n\nRF vs baseline significance:\n", md(sig, 5),
          "\n\n## 2. Ablations (RF, 5x3 CV)\n", md(abl.set_index("variant")),
          "\n\n## 2b. Noise robustness (accuracy vs sensor noise)\n", md(noise_tbl), "\n\n## 3a. Mean |SHAP| per true class\n", md(g), "\n\n## 3b. Per-sample top-3 explanations\n", md(ps.set_index("cls")),
          "\n\n## 3c. Top-3 feature frequency by predicted class\n", md(freq),
          "\n\n## 3d. Faithfulness (held-out folds)\n", md(fa), "\n\n## 3e. Stability (bootstrap refits)\n", md(st),
          "\n\n## 4a. OOD threshold sweep\n", md(ood["sweep"]) if "sweep" in ood else "(no labelled unknown samples found)",
          "\n\n## 4b. OOD score AUROC\n", md(ood["auroc"].to_frame()) if "auroc" in ood else "",
          "\n\n## 4c. Leave-one-class-out OOD\n", md(ood["loco"]),
          f"\n\nECE of max-prob confidence: {ood['ECE_maxprob']:.4f}",
          "\n\n## 5. Per-class metrics, RF out-of-fold\n", md(ex["per_class"]),
          f"\n\nOOF accuracy {ex['rf_oof_accuracy']:.4f}, Wilson 95% CI {ex['wilson95'][0]:.4f}-{ex['wilson95'][1]:.4f}",
          f"\n\nLatency: {json.dumps(ex['predict_latency_ms_single_sample_1thread'])} ms predict; "
          f"{json.dumps(ex['treeshap_latency_ms_single_sample'])} ms TreeSHAP; model {ex['model_size_kB_pickle']:.0f} kB",
          f"\n\nPCA explained variance: {ex['pca_explained_variance_ratio']}"]
    if physinfo:
        S += ["\n\n## Physics regressor\n", json.dumps(physinfo["reg"]), "\n\nSeverity by class:\n", md(physinfo["severity"])]
    (out / "summary.md").write_text("\n".join(S)); print("done ->", out.resolve())


if __name__ == "__main__":
    main()
