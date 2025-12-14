
import os
import urllib.request
import zipfile
import shutil

MODEL_URL = "https://github.com/deepinsight/insightface/releases/download/v0.7/buffalo_l.zip"
ZIP_PATH = "buffalo_l.zip"
EXTRACT_PATH = "buffalo_l"
TARGET_DIR = "."

def download_and_extract():
    print(f"Downloading {MODEL_URL}...")
    try:
        urllib.request.urlretrieve(MODEL_URL, ZIP_PATH)
        print("Download complete.")
    except Exception as e:
        print(f"Failed to download: {e}")
        return

    print("Extracting...")
    with zipfile.ZipFile(ZIP_PATH, 'r') as zip_ref:
        zip_ref.extractall(EXTRACT_PATH)
    
    # Move specific files we need
    # We need det_10g.onnx (RetinaFace) and w600k_r50.onnx (ArcFace R50)
    files_to_move = {
        "det_10g.onnx": "det_10g.onnx",
        "w600k_r50.onnx": "w600k_r50.onnx"
    }

    for src_name, dst_name in files_to_move.items():
        src_path = os.path.join(EXTRACT_PATH, src_name)
        dst_path = os.path.join(TARGET_DIR, dst_name)
        if os.path.exists(src_path):
            shutil.move(src_path, dst_path)
            print(f"Moved {src_name} to {dst_path}")
        else:
            print(f"Warning: Could not find {src_name}")

    print("Cleaning up...")
    if os.path.exists(ZIP_PATH):
        os.remove(ZIP_PATH)
    if os.path.exists(EXTRACT_PATH):
        shutil.rmtree(EXTRACT_PATH)
    
    print("Done. Models ready in current directory.")

if __name__ == "__main__":
    download_and_extract()
