
import onnxruntime
import cv2
import numpy as np
import os

img_path = r"C:\Users\kumar\.gemini\antigravity\brain\09af69b7-2e0f-44bd-b519-497f09555f93\uploaded_image_1765339532772.png"
if not os.path.exists(img_path):
    print("Image not found")
    exit()

session = onnxruntime.InferenceSession("det_10g_int8.onnx", providers=['CPUExecutionProvider'])

img = cv2.imread(img_path)
img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
img = cv2.resize(img, (640, 640)) # Fix size for easy math

img_blob = img.transpose(2, 0, 1)
img_blob = np.expand_dims(img_blob, 0).astype(np.float32)
img_blob = (img_blob - 127.5) / 128.0

input_name = session.get_inputs()[0].name
outs = session.run(None, {input_name: img_blob})

with open("debug_shapes_out.txt", "w") as f:
    for i, out in enumerate(outs):
        f.write(f"Out {i}: {out.shape}\n")
        # Write stats
        f.write(f"  Min: {out.min()}, Max: {out.max()}, Mean: {out.mean()}\n")

print("Done writing shapes")
