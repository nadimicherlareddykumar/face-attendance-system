
import onnx
from onnxruntime.quantization import quantize_dynamic, QuantType
import os

def quantize_model(input_path, output_path):
    print(f"Quantizing {input_path} -> {output_path}...")
    
    if not os.path.exists(input_path):
        print(f"Error: {input_path} not found.")
        return

    try:
        quantize_dynamic(
            model_input=input_path,
            model_output=output_path,
            weight_type=QuantType.QUInt8
        )
        print("Quantization successful.")
    except Exception as e:
        print(f"Quantization failed: {e}")

if __name__ == "__main__":
    # RetinaFace
    quantize_model("det_10g.onnx", "det_10g_int8.onnx")
    
    # ArcFace
    quantize_model("w600k_r50.onnx", "w600k_r50_int8.onnx")
