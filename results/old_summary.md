# XAI-SolarGuard results (seed 42; 685 known, 15 unknown)

## 1. Baselines (same folds)

| model | Acc (5x3 CV) | Macro-P | Macro-R | Macro-F1 | Acc (single 5-fold) | Train s | Pred ms/sample |
|---|---|---|---|---|---|---|---|
| Random Forest (100) | 0.9844 ± 0.0126 | 0.9910 ± 0.0086 | 0.9862 ± 0.0115 | 0.9883 ± 0.0095 | 0.9839 | 0.346 | 0.3566 |
| Logistic Regression | 0.9985 ± 0.0030 | 0.9995 ± 0.0010 | 0.9983 ± 0.0035 | 0.9989 ± 0.0023 | 0.9985 | 0.032 | 0.0146 |
| SVM (RBF) | 0.9995 ± 0.0019 | 0.9998 ± 0.0006 | 0.9994 ± 0.0022 | 0.9996 ± 0.0014 | 1.0000 | 0.016 | 0.0515 |
| k-NN (k=5) | 0.9908 ± 0.0080 | 0.9971 ± 0.0025 | 0.9883 ± 0.0106 | 0.9924 ± 0.0069 | 0.9927 | 0.005 | 0.1479 |
| Decision Tree | 0.9684 ± 0.0190 | 0.9764 ± 0.0181 | 0.9737 ± 0.0138 | 0.9745 ± 0.0155 | 0.9723 | 0.011 | 0.0065 |
| MLP (64-32) | 1.0000 ± 0.0000 | 1.0000 ± 0.0000 | 1.0000 ± 0.0000 | 1.0000 ± 0.0000 | 1.0000 | 0.671 | 0.0112 |
| XGBoost | 0.9825 ± 0.0140 | 0.9849 ± 0.0115 | 0.9804 ± 0.0168 | 0.9821 ± 0.0137 | 0.9825 | 0.744 | 0.0437 |


RF vs baseline significance:

| baseline | wilcoxon_p | mcnemar_p | rf_only_correct | baseline_only_correct |
|---|---|---|---|---|
| Logistic Regression | 0.00396 | 0.00635 | 1.00000 | 11.00000 |
| SVM (RBF) | 0.00248 | 0.00098 | 0.00000 | 11.00000 |
| k-NN (k=5) | 0.05605 | 0.21011 | 5.00000 | 11.00000 |
| Decision Tree | 0.00139 | 0.03857 | 10.00000 | 2.00000 |
| MLP (64-32) | 0.00208 | 0.00098 | 0.00000 | 11.00000 |
| XGBoost | 0.35553 | 1.00000 | 7.00000 | 6.00000 |


## 2. Ablations (RF, 5x3 CV)

| variant | group | acc | macro_f1 |
|---|---|---|---|
| All 7 features | reference | 0.9844 ± 0.0126 | 0.9883 ± 0.0095 |
| - G | drop-one feature | 0.9659 ± 0.0176 | 0.9729 ± 0.0146 |
| - Tc | drop-one feature | 0.9864 ± 0.0148 | 0.9897 ± 0.0116 |
| - Vmp | drop-one feature | 0.9820 ± 0.0138 | 0.9830 ± 0.0127 |
| - Imp | drop-one feature | 0.9859 ± 0.0125 | 0.9894 ± 0.0096 |
| - Pmp | drop-one feature | 0.9869 ± 0.0127 | 0.9901 ± 0.0098 |
| - Voc | drop-one feature | 0.9917 ± 0.0099 | 0.9939 ± 0.0074 |
| - Isc | drop-one feature | 0.9864 ± 0.0129 | 0.9898 ± 0.0099 |
| Electrical only (Vmp,Imp,Pmp,Voc,Isc) | feature group | 0.9572 ± 0.0193 | 0.9656 ± 0.0165 |
| Environmental only (G,Tc) | feature group | 0.4944 ± 0.0363 | 0.3387 ± 0.0269 |
| No derived Pmp (=Vmp*Imp) | feature group | 0.9869 ± 0.0127 | 0.9901 ± 0.0098 |
| No environmental (G,Tc) | feature group | 0.9572 ± 0.0193 | 0.9656 ± 0.0165 |
| + FF, Vmp/Voc, Imp/Isc | engineered | 0.9752 ± 0.0153 | 0.9814 ± 0.0113 |
| + regressor loss% and dP (in-fold, no leakage) | physics regressor | 0.9976 ± 0.0053 | 0.9968 ± 0.0069 |
| 10 trees | n_estimators | 0.9786 ± 0.0075 | 0.9830 ± 0.0069 |
| 25 trees | n_estimators | 0.9835 ± 0.0101 | 0.9874 ± 0.0078 |
| 50 trees | n_estimators | 0.9864 ± 0.0099 | 0.9898 ± 0.0074 |
| 100 trees | n_estimators | 0.9844 ± 0.0126 | 0.9883 ± 0.0095 |
| 200 trees | n_estimators | 0.9859 ± 0.0125 | 0.9894 ± 0.0095 |
| 500 trees | n_estimators | 0.9869 ± 0.0127 | 0.9902 ± 0.0096 |
| depth=2 | max_depth | 0.8054 ± 0.0122 | 0.7620 ± 0.0147 |
| depth=3 | max_depth | 0.8745 ± 0.0130 | 0.8458 ± 0.0281 |
| depth=5 | max_depth | 0.9338 ± 0.0186 | 0.9421 ± 0.0188 |
| depth=10 | max_depth | 0.9835 ± 0.0136 | 0.9875 ± 0.0104 |
| depth=None | max_depth | 0.9844 ± 0.0126 | 0.9883 ± 0.0095 |
| None | class weights | 0.9844 ± 0.0126 | 0.9883 ± 0.0095 |
| balanced | class weights | 0.9937 ± 0.0091 | 0.9950 ± 0.0072 |


## 3a. Mean |SHAP| per true class

|  | Aging | Healthy | Open-Circuit | Overheating | Shading/Soiling | Short-Circuit | ALL (pred-class) |
|---|---|---|---|---|---|---|---|
| G | 0.0117 | 0.0657 | 0.0007 | 0.0014 | 0.1399 | 0.0010 | 0.0556 |
| Tc | 0.0603 | 0.0401 | 0.0058 | 0.2733 | 0.0661 | 0.0265 | 0.0576 |
| Vmp | 0.4672 | 0.2064 | 0.1543 | 0.2467 | 0.2074 | 0.1981 | 0.2345 |
| Imp | 0.0334 | 0.0359 | 0.1661 | 0.0133 | 0.0767 | 0.0452 | 0.0522 |
| Pmp | 0.0945 | 0.0920 | 0.2346 | 0.0824 | 0.1275 | 0.3359 | 0.1272 |
| Voc | 0.1517 | 0.0697 | 0.0508 | 0.3027 | 0.0957 | 0.2725 | 0.1115 |
| Isc | 0.0426 | 0.0479 | 0.2993 | 0.0146 | 0.0873 | 0.0466 | 0.0728 |


## 3b. Per-sample top-3 explanations

| cls | sample | rank | feature | value | phi | share |
|---|---|---|---|---|---|---|
| Aging | 19 | 1 | Vmp | 22.7400 | 0.4479 | 0.5071 |
| Aging | 19 | 2 | Voc | 34.7700 | 0.2217 | 0.2509 |
| Aging | 19 | 3 | Pmp | 111.5200 | 0.0968 | 0.1096 |
| Healthy | 0 | 1 | Vmp | 32.4700 | 0.2337 | 0.3402 |
| Healthy | 0 | 2 | Pmp | 291.5700 | 0.1608 | 0.2340 |
| Healthy | 0 | 3 | G | 952.9000 | -0.0900 | 0.1309 |
| Open-Circuit | 15 | 1 | Isc | 0.1000 | 0.3009 | 0.3301 |
| Open-Circuit | 15 | 2 | Pmp | 0.0300 | 0.2344 | 0.2572 |
| Open-Circuit | 15 | 3 | Imp | 0.0500 | 0.1640 | 0.1799 |
| Overheating | 10 | 1 | Voc | 19.3300 | 0.2969 | 0.3177 |
| Overheating | 10 | 2 | Tc | 70.4000 | 0.2679 | 0.2865 |
| Overheating | 10 | 3 | Vmp | 16.2700 | 0.2508 | 0.2683 |
| Shading/Soiling | 35 | 1 | Vmp | 29.2100 | 0.3131 | 0.3659 |
| Shading/Soiling | 35 | 2 | G | 848.6800 | 0.1467 | 0.1714 |
| Shading/Soiling | 35 | 3 | Pmp | 116.7100 | 0.1062 | 0.1241 |
| Short-Circuit | 14 | 1 | Pmp | 7.3100 | 0.3366 | 0.3635 |
| Short-Circuit | 14 | 2 | Voc | 0.9000 | 0.2750 | 0.2969 |
| Short-Circuit | 14 | 3 | Vmp | 0.7900 | 0.1943 | 0.2098 |


## 3c. Top-3 feature frequency by predicted class

|  | Aging | Healthy | Open-Circuit | Overheating | Shading/Soiling | Short-Circuit |
|---|---|---|---|---|---|---|
| G | 0.0000 | 0.4514 | 0.0000 | 0.0000 | 0.6200 | 0.0000 |
| Tc | 0.2625 | 0.1886 | 0.0000 | 1.0000 | 0.1100 | 0.0000 |
| Vmp | 1.0000 | 0.9943 | 0.0000 | 1.0000 | 0.8100 | 1.0000 |
| Imp | 0.0000 | 0.0000 | 1.0000 | 0.0000 | 0.1100 | 0.0000 |
| Pmp | 0.9375 | 0.6000 | 1.0000 | 0.0000 | 0.6900 | 1.0000 |
| Voc | 0.6750 | 0.6229 | 0.0000 | 1.0000 | 0.4700 | 1.0000 |
| Isc | 0.1250 | 0.1429 | 1.0000 | 0.0000 | 0.1900 | 0.0000 |


## 3d. Faithfulness (held-out folds)

|  | top-1 | top-2 | top-3 |
|---|---|---|---|
| Prob. drop: remove SHAP top-k | 0.3362 ± 0.0328 | 0.5752 ± 0.0333 | 0.6320 ± 0.0208 |
| Prob. drop: remove random k | 0.1323 ± 0.0046 | 0.2472 ± 0.0102 | 0.3421 ± 0.0107 |


## 3e. Stability (bootstrap refits)

|  | mean Jaccard top-3 |
|---|---|
| Aging | 0.8984 |
| Healthy | 0.7655 |
| Open-Circuit | 0.8008 |
| Overheating | 1.0000 |
| Shading/Soiling | 0.7830 |
| Short-Circuit | 1.0000 |
| ALL | 0.8192 |


## 4a. OOD threshold sweep

| threshold | unknown_detected | known_rejected | accuracy_on_accepted |
|---|---|---|---|
| 0.3 | 0.2667 | 0.0000 | 0.9839 |
| 0.35 | 0.8667 | 0.0000 | 0.9839 |
| 0.4 | 1.0000 | 0.0000 | 0.9839 |
| 0.45 | 1.0000 | 0.0015 | 0.9839 |
| 0.5 | 1.0000 | 0.0044 | 0.9853 |
| 0.55 | 1.0000 | 0.0146 | 0.9896 |
| 0.6 | 1.0000 | 0.0219 | 0.9925 |
| 0.65 | 1.0000 | 0.0321 | 0.9940 |
| 0.7 | 1.0000 | 0.0380 | 0.9954 |
| 0.8 | 1.0000 | 0.0847 | 1.0000 |
| 0.9 | 1.0000 | 0.1810 | 1.0000 |


## 4b. OOD score AUROC

|  | AUROC (unknown = positive) |
|---|---|
| 1 - max prob | 1.0000 |
| entropy | 1.0000 |
| IsolationForest | 0.8494 |


## 4c. Leave-one-class-out OOD

| held_out_class | n_unknown | AUROC | detected_at_0_50 | known_rejected_at_0_50 |
|---|---|---|---|---|
| Aging | 80.0000 | 0.9782 | 0.0375 | 0.0000 |
| Healthy | 350.0000 | 0.8513 | 0.0000 | 0.0000 |
| Open-Circuit | 60.0000 | 1.0000 | 1.0000 | 0.0000 |
| Overheating | 45.0000 | 0.8687 | 0.0000 | 0.0000 |
| Shading/Soiling | 100.0000 | 0.9448 | 0.0000 | 0.0000 |
| Short-Circuit | 50.0000 | 1.0000 | 0.4200 | 0.0000 |


ECE of max-prob confidence: 0.0432


## 5. Per-class metrics, RF out-of-fold

|  | precision | recall | f1 | support |
|---|---|---|---|---|
| Aging | 1.0000 | 1.0000 | 1.0000 | 80.0000 |
| Healthy | 0.9775 | 0.9914 | 0.9844 | 350.0000 |
| Open-Circuit | 1.0000 | 1.0000 | 1.0000 | 60.0000 |
| Overheating | 1.0000 | 1.0000 | 1.0000 | 45.0000 |
| Shading/Soiling | 0.9684 | 0.9200 | 0.9436 | 100.0000 |
| Short-Circuit | 1.0000 | 1.0000 | 1.0000 | 50.0000 |


OOF accuracy 0.9839, Wilson 95% CI 0.9715-0.9910


Latency: {"median": 20.866300008492544, "p95": 28.66971999028465} ms predict; {"median": 2.6739000022644177, "p95": 3.8998950039967895} ms TreeSHAP; model 689 kB


PCA explained variance: [0.5275009701978802, 0.25905234054697035]


## Physics regressor

{"fold": 7.0, "MAE_W": 4.246769848088273, "MAPE_pct": 2.4289237117708287, "R2": 0.9939842709863701}


Severity by class:

| cls | Low(<10%) | Medium(10-30%) | High(>30%) |
|---|---|---|---|
| Aging | 0 | 40 | 40 |
| Healthy | 348 | 2 | 0 |
| Open-Circuit | 0 | 0 | 60 |
| Overheating | 0 | 0 | 45 |
| Shading/Soiling | 0 | 6 | 94 |
| Short-Circuit | 0 | 0 | 50 |