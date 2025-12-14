from flask import Flask, request, jsonify
from flask_cors import CORS
import cv2
import numpy as np
import os
import base64
import time
import shutil
import glob
from engine.face_engine import FaceEngine
from engine.tracker import FaceTracker

app = Flask(__name__)
CORS(app)

# Logging Setup
import logging
logging.basicConfig(filename='api_debug.log', level=logging.DEBUG, 
                    format='%(asctime)s %(levelname)s: %(message)s')

# Also log to console
console = logging.StreamHandler()
console.setLevel(logging.DEBUG)
logging.getLogger('').addHandler(console)


# --- Configuration ---
FACES_DIR = "faces"
# Use quantized models if available, otherwise original
DET_MODEL = "det_10g_int8.onnx" if os.path.exists("det_10g_int8.onnx") else "det_10g.onnx"
REC_MODEL = "w600k_r50_int8.onnx" if os.path.exists("w600k_r50_int8.onnx") else "w600k_r50.onnx"
SIMILARITY_THRESHOLD = 0.45 # Tuned to 0.45 as requested

print(f"Loading FaceEngine with {DET_MODEL} and {REC_MODEL}...")
engine = FaceEngine(DET_MODEL, REC_MODEL)
tracker = FaceTracker()
print("FaceEngine loaded.")

# Global cache for embeddings: {usn: [embedding_vector, ...]}
known_embeddings = {}

def load_known_faces():
    """Loads all faces from disk and computes embeddings."""
    global known_embeddings
    known_embeddings = {}
    
    print("Loading known faces...")
    if not os.path.exists(FACES_DIR):
        os.makedirs(FACES_DIR)
        
    student_folders = os.listdir(FACES_DIR)
    total_faces = 0
    
    for usn in student_folders:
        student_path = os.path.join(FACES_DIR, usn)
        if not os.path.isdir(student_path):
            continue
            
        imgs = glob.glob(os.path.join(student_path, "*.jpg"))
        student_embs = []
        
        for img_path in imgs:
            try:
                img = cv2.imread(img_path)
                if img is None:
                    continue
                
                faces = engine.detector.detect_scrfd(img, threshold=0.5)
                
                if len(faces) > 0:
                    # Take largest face
                    areas = (faces[:, 2] - faces[:, 0]) * (faces[:, 3] - faces[:, 1])
                    best_idx = np.argmax(areas)
                    face = faces[best_idx]
                    
                    # Unpack (15 elements: bbox(4)+score(1)+kps(10))
                    # x1, y1, x2, y2 = face[:4]
                    kps = face[5:15].reshape(5, 2)
                    
                    # Align
                    M = engine.estimate_norm(kps)
                    if M is not None:
                        align_face = cv2.warpAffine(img, M, (112, 112), borderValue=0.0)
                        emb = engine.recognizer.get_embedding(align_face)
                        student_embs.append(emb)
                    else:
                        # Fallback crop
                        x1, y1, x2, y2 = face[:4].astype(int)
                        crop = img[y1:y2, x1:x2]
                        if crop.size > 0:
                            emb = engine.recognizer.get_embedding(crop)
                            student_embs.append(emb)
                else:
                    # Fallback: assume image IS the face
                    emb = engine.recognizer.get_embedding(img)
                    student_embs.append(emb)
                    
            except Exception as e:
                print(f"Error loading {img_path}: {e}")
                
        if student_embs:
            known_embeddings[usn] = student_embs
            total_faces += len(student_embs)
            
    print(f"Loaded {len(known_embeddings)} students with {total_faces} faces.")

# Initial load
load_known_faces()

@app.route("/enroll", methods=["POST"])
def enroll():
    data = request.get_json()
    usn = data["usn"]
    
    images = []
    if "images" in data:
        images = data["images"]
    elif "image" in data:
        images = [data["image"]]

    student_folder = os.path.join(FACES_DIR, usn)
    os.makedirs(student_folder, exist_ok=True)

    saved_count = 0
    new_embeddings = []

    for i, image_data in enumerate(images):
        if "," in image_data:
            image_data = image_data.split(",")[1]
            
        image_bytes = base64.b64decode(image_data)
        np_arr = np.frombuffer(image_bytes, np.uint8)
        face_img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR) # Ensure COLOR

        # Save image
        img_count = len(os.listdir(student_folder))
        img_name = f"{img_count + 1 + i}.jpg" # avoid overwrite collision in loop
        img_path = os.path.join(student_folder, img_name)
        cv2.imwrite(img_path, face_img)
        saved_count += 1
        
        # Compute embedding and update cache immediately
        try:
             # Detection logic same as load
            faces = engine.detector.detect_scrfd(face_img, threshold=0.5)
            if len(faces) > 0:
                # Largest face
                logging.debug(f"Enrollment: Found {len(faces)} faces for image {i}")
                
                areas = (faces[:, 2] - faces[:, 0]) * (faces[:, 3] - faces[:, 1])
                best_idx = np.argmax(areas)
                face = faces[best_idx]
                
                kps = face[5:15].reshape(5, 2)
                M = engine.estimate_norm(kps)
                
                if M is not None:
                     crop = cv2.warpAffine(face_img, M, (112, 112), borderValue=0.0)
                else:
                     x1, y1, x2, y2 = face[:4].astype(int)
                     crop = face_img[y1:y2, x1:x2]
                
                emb = engine.recognizer.get_embedding(crop)
                new_embeddings.append(emb)
            else:
                 logging.warning(f"Enrollment: No face detected in image {i}, using full image fallback")
                 emb = engine.recognizer.get_embedding(face_img)
                 new_embeddings.append(emb)
        except Exception as e:
            logging.error(f"Error generating embedding for enrollment: {e}")
            print(f"Error generating embedding for enrollment: {e}")

    # Update global cache
    if usn not in known_embeddings:
        known_embeddings[usn] = []
    known_embeddings[usn].extend(new_embeddings)

    return jsonify({"message": f"Student {usn} enrolled successfully with {saved_count} images!"})

@app.route("/delete_student/<usn>", methods=["DELETE"])
def delete_student(usn):
    student_folder = os.path.join(FACES_DIR, usn)
    if os.path.exists(student_folder):
        try:
            shutil.rmtree(student_folder)
            # Remove from cache
            if usn in known_embeddings:
                del known_embeddings[usn]
            return jsonify({"message": f"Student {usn} deleted."})
        except Exception as e:
            return jsonify({"error": str(e)}), 500
    else:
        return jsonify({"message": "Student not found"}), 404

def cosine_similarity(emb1, emb2):
    return np.dot(emb1, emb2) / (np.linalg.norm(emb1) * np.linalg.norm(emb2))

@app.route("/recognize", methods=["POST"])
def recognize():
    try:
        data = request.get_json()
        image_data = data["image"].split(",")[1]
        image_bytes = base64.b64decode(image_data)
        np_arr = np.frombuffer(image_bytes, np.uint8)
        frame = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

        start_time = time.time()
        
        # 1. Detect and Get Embeddings
        # FaceEngine now returns aligned faces and filters small faces
        results = engine.analyze(frame) # returns list of {bbox, embedding, confidence}
        
        logging.debug(f"Recognition: Detected {len(results)} faces")

        detections_for_tracker = []
        
        # 2. Match against database (Preliminary)
        for res in results:
            query_emb = res["embedding"]
            
            # Compute scores against ALL known faces
            all_scores = [] # (score, usn)
            
            for usn, stored_embs in known_embeddings.items():
                for stored_emb in stored_embs:
                    score = np.dot(query_emb, stored_emb) # vectors are normalized
                    all_scores.append((float(score), usn))
            
            # Sort Top-5
            all_scores.sort(key=lambda x: x[0], reverse=True)
            top_5 = all_scores[:5]
            
            # Log Top-5
            logging.debug(f"Face Top-5: {top_5}")
            
            # Best Match Strategy
            best_score, best_match_usn = top_5[0] if top_5 else (-1.0, "Unknown")
            
            if best_score < SIMILARITY_THRESHOLD:
                best_match_usn = "Unknown"
                
            # Prepare for tracker
            # Tracker expects: {'bbox': [x1,y1,x2,y2], 'usn': str, 'score': float}
            detections_for_tracker.append({
                'bbox': res['bbox'],
                'usn': best_match_usn,
                'score': float(best_score),
                'embedding': query_emb # Pass through (optional, used if we wanted tracker to re-id)
            })

        # 3. Update Tracker (Temporal Smoothing)
        # Tracker will update 'stable_usn' based on history
        stabilized_detections = tracker.update(detections_for_tracker)
        
        recognized_students = []
        for det in stabilized_detections:
            final_usn = det.get('stable_usn', det['usn'])
            
            # If tracker says "Unknown" (majority vote was unknown)
            if final_usn == "Unknown":
                print(f"Unknown face detected ({det['score']:.4f})")
            else:
                 recognized_students.append({
                    "usn": final_usn,
                    "confidence": det['score'],
                    "bbox": det["bbox"],
                    "track_id": det.get('track_id', -1)
                })
                 print(f"Recognized {final_usn} ({det['score']:.4f}) [Track {det.get('track_id')}]")

        total_time = time.time() - start_time
        logging.info(f"Inference took {total_time:.4f}s")
        print(f"Inference took {total_time:.4f}s")
        
        return jsonify(recognized_students)

    except Exception as e:
        logging.error(f"Recognition Error: {e}")
        print(f"Recognition Error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify([])

@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "message": "Optimized Face Engine Running"})

if __name__ == "__main__":
    app.run(port=5006)
