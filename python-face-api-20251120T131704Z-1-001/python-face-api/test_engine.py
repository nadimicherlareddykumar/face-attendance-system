
import cv2
import os
import time
import numpy as np
from engine.face_engine import FaceEngine

print("Initializing FaceEngine...")
start_init = time.time()
# Use INT8 if available
det_model = "det_10g_int8.onnx" if os.path.exists("det_10g_int8.onnx") else "det_10g.onnx"
rec_model = "w600k_r50_int8.onnx" if os.path.exists("w600k_r50_int8.onnx") else "w600k_r50.onnx"

try:
    engine = FaceEngine(det_model, rec_model)
    print(f"Engine initialized in {time.time() - start_init:.4f}s")
except Exception as e:
    print(f"Failed to init engine: {e}")
    exit(1)

# Test with specific known image
img_path = r"C:\Users\kumar\.gemini\antigravity\brain\09af69b7-2e0f-44bd-b519-497f09555f93\uploaded_image_1765339532772.png"

if not os.path.exists(img_path):
    print(f"Artifact image not found at {img_path}, searching faces dir...")
    if os.path.exists("faces"):
        for root, dirs, files in os.walk("faces"):
             for file in files:
                if file.endswith(".jpg") or file.endswith(".png"):
                    img_path = os.path.join(root, file)
                    break
             if img_path and "uploaded" not in img_path: # fallback found
                 break

print(f"Testing with {img_path}")
img = cv2.imread(img_path)

if img is None:
    print("Failed to load image.")
    exit(1)

print(f"Image shape: {img.shape}")

# Warmup
print("Warming up...")
engine.analyze(img)

# Test
print("Running inference...")
start_time = time.time()
results = engine.analyze(img)
end_time = time.time()

print(f"Inference took: {end_time - start_time:.4f}s")
print(f"Detected faces: {len(results)}")

for i, res in enumerate(results):
    print(f"Face {i+1}: bbox={res['bbox']}, conf={res['confidence']:.4f}")
    print(f"Face {i+1}: embedding shape={res['embedding'].shape}")

print("Verification passed if faces detected or at least no crash.")
