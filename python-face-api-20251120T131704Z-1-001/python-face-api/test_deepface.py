from deepface import DeepFace
import cv2
import os
import time

print("Starting DeepFace Test...")

# Path to an existing image
# Try to find any jpg in faces folder
img_path = None
if os.path.exists("faces"):
    for root, dirs, files in os.walk("faces"):
        for file in files:
            if file.endswith(".jpg"):
                img_path = os.path.join(root, file)
                break
        if img_path:
            break

if not img_path:
    print("Error: No image found in faces folder to test with.")
    exit(1)

print(f"Testing with image: {img_path}")

try:
    # Test Recognition
    print("Testing Recognition (DeepFace.find)...")
    start_time = time.time()
    dfs = DeepFace.find(img_path=img_path, 
                      db_path="faces", 
                      model_name="VGG-Face", 
                      detector_backend="opencv", 
                      enforce_detection=False,
                      silent=True)
    end_time = time.time()
    
    print(f"DeepFace.find took {end_time - start_time:.4f} seconds")
    
    if len(dfs) > 0:
        print("DeepFace.find returned results.")
        print(dfs[0].head())
    else:
        print("DeepFace.find returned no results.")

except Exception as e:
    import traceback
    traceback.print_exc()
    print(f"An error occurred: {e}", flush=True)

print("Test Complete.", flush=True)
