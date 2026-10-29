import os
import numpy as np
import pandas as pd

def generate_synthetic_pv_data(output_path="data/raw/pv_fault_dataset.csv", num_samples=700, seed=42):
    """
    Generates a realistic synthetic PV module fault dataset matching IEEE DataPort schema.
    Explicitly labeled as a SYNTHETIC placeholder if real files are not placed in /data/raw/.
    """
    np.random.seed(seed)
    os.makedirs(os.path.dirname(output_path), exist_ok=True)

    # Class distribution matching realistic solar farm fault statistics (~700 samples total)
    classes = [
        ('healthy', 350),
        ('shading/soiling', 100),
        ('aging', 80),
        ('open-circuit', 60),
        ('short-circuit', 50),
        ('overheating', 45),
        ('unrecognized_anomaly', 15)
    ]

    records = []
    panel_id_counter = 101

    for label, count in classes:
        for _ in range(count):
            # Ambient conditions
            if label == 'overheating':
                temp = np.random.uniform(58.0, 85.0)  # Extreme cell temperature
            else:
                temp = np.random.uniform(15.0, 45.0)  # Normal ambient/cell temp range (°C)

            irradiance = np.random.uniform(250.0, 1050.0)  # Solar irradiance W/m^2

            # STC Nominal PV Panel parameters (e.g., 300W panel)
            v_mp_stc = 32.0
            i_mp_stc = 9.38
            v_oc_stc = 38.5
            i_sc_stc = 9.85

            # Temperature coefficients
            alpha_isc = 0.0005  # +0.05% / °C
            beta_voc = -0.0035  # -0.35% / °C

            # Standard environmental corrections
            temp_diff = temp - 25.0
            rad_ratio = irradiance / 1000.0

            # Base healthy readings
            v_oc = v_oc_stc * (1.0 + beta_voc * temp_diff) + np.random.normal(0, 0.3)
            i_sc = i_sc_stc * rad_ratio * (1.0 + alpha_isc * temp_diff) + np.random.normal(0, 0.1)
            v_mp = v_mp_stc * (1.0 + beta_voc * temp_diff) + np.random.normal(0, 0.3)
            i_mp = i_mp_stc * rad_ratio * (1.0 + alpha_isc * temp_diff) + np.random.normal(0, 0.1)

            # Apply specific fault distortions
            actual_label = label
            if label == 'healthy':
                pass # Baseline normal physics

            elif label == 'shading/soiling':
                # Dust/soiling/shading drops current drastically (25% to 55% loss), voltage stays mostly intact
                shade_factor = np.random.uniform(0.45, 0.75)
                i_mp *= shade_factor
                i_sc *= shade_factor
                v_mp *= np.random.uniform(0.92, 0.98)

            elif label == 'aging':
                # Aging increases internal series resistance -> drops Vmp and degrades Fill Factor
                age_factor = np.random.uniform(0.70, 0.85)
                v_mp *= age_factor
                i_mp *= np.random.uniform(0.88, 0.95)
                v_oc *= np.random.uniform(0.90, 0.96)

            elif label == 'open-circuit':
                # Connection open -> Zero or near-zero current output
                i_mp = max(0.0, np.random.normal(0.05, 0.03))
                i_sc = max(0.0, np.random.normal(0.08, 0.04))
                # Voc is still measurable across open terminals
                v_mp = max(0.0, np.random.normal(1.0, 0.5))

            elif label == 'short-circuit':
                # Electrical short -> Zero or near-zero voltage output
                v_mp = max(0.0, np.random.normal(0.5, 0.3))
                v_oc = max(0.0, np.random.normal(0.8, 0.4))
                # Current circulates at short circuit level

            elif label == 'overheating':
                # High temperature severely drops Vmp and Voc beyond normal specs
                thermal_drop = np.random.uniform(0.55, 0.72)
                v_mp *= thermal_drop
                v_oc *= thermal_drop
                i_mp *= np.random.uniform(0.85, 0.95)

            elif label == 'unrecognized_anomaly':
                # Wild out-of-range sensor failure or unclassified electrical pattern
                v_mp = np.random.uniform(120.0, 180.0) # Unrealistic voltage spike
                i_mp = np.random.uniform(-5.0, -1.0)   # Reverse current flow
                actual_label = 'unknown'

            # Calculate actual power
            p_mp = max(0.0, v_mp * i_mp)

            records.append({
                'panel_id': f'PANEL-{panel_id_counter:03d}',
                'irradiance': round(float(irradiance), 2),
                'temperature': round(float(temp), 2),
                'v_mp': round(float(v_mp), 2),
                'i_mp': round(float(i_mp), 2),
                'p_mp': round(float(p_mp), 2),
                'v_oc': round(float(v_oc), 2),
                'i_sc': round(float(i_sc), 2),
                'fault_label': actual_label,
                'data_source': 'SYNTHETIC_IEEE_DATAPORT_SCHEMA'
            })
            panel_id_counter += 1

    df = pd.DataFrame(records)
    # Shuffle dataset
    df = df.sample(frac=1.0, random_state=seed).reset_index(drop=True)
    df.to_csv(output_path, index=False)
    print(f"[Stage 1] Synthetic PV fault dataset generated successfully: {output_path} ({len(df)} samples)")
    return df

if __name__ == '__main__':
    generate_synthetic_pv_data()
