import os
import sys
import glob
import pandas as pd

# Add project root to sys.path
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

def load_data(raw_dir="data/raw"):
    """
    Inspects /data/raw/ for dataset files.
    If absent, generates synthetic data placeholder with IEEE DataPort schema.
    Returns dataframe and schema report dict.
    """
    os.makedirs(raw_dir, exist_ok=True)

    csv_files = glob.glob(os.path.join(raw_dir, "*.csv"))
    excel_files = glob.glob(os.path.join(raw_dir, "*.xlsx")) + glob.glob(os.path.join(raw_dir, "*.xls"))

    all_files = csv_files + excel_files
    is_synthetic = False
    data_file = None

    if all_files:
        data_file = all_files[0]
        print(f"[DataLoader] Found dataset file: {data_file}")
        if data_file.endswith('.csv'):
            df = pd.read_csv(data_file)
        else:
            df = pd.read_excel(data_file)
    else:
        print(f"[DataLoader] No dataset found in {raw_dir}. Initializing SYNTHETIC placeholder dataset...")
        from data.synthetic_generator import generate_synthetic_pv_data
        synthetic_path = os.path.join(raw_dir, "pv_fault_dataset.csv")
        df = generate_synthetic_pv_data(output_path=synthetic_path, num_samples=700)
        is_synthetic = True
        data_file = synthetic_path

    # Analyze schema
    columns = list(df.columns)
    sample_count = len(df)

    # Check time-series vs single reading
    has_timestamp = any('time' in col.lower() or 'date' in col.lower() for col in columns)
    reading_type = "Time Series" if has_timestamp else "Single Spot Readings"

    schema_report = {
        "file_name": os.path.basename(data_file),
        "is_synthetic": is_synthetic,
        "sample_count": sample_count,
        "reading_type": reading_type,
        "columns": columns,
        "fault_class_distribution": df['fault_label'].value_counts().to_dict() if 'fault_label' in df.columns else {}
    }

    print("\n--- SCHEMA REPORT ---")
    print(f"Dataset File: {schema_report['file_name']} (Synthetic: {schema_report['is_synthetic']})")
    print(f"Total Samples: {schema_report['sample_count']}")
    print(f"Sample Nature: {schema_report['reading_type']}")
    print(f"Columns ({len(columns)}): {', '.join(columns)}")
    print(f"Fault Classes: {schema_report['fault_class_distribution']}\n")

    return df, schema_report

if __name__ == '__main__':
    load_data()
