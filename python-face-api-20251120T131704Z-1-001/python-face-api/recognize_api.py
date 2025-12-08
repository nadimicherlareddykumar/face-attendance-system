from flask import Flask, request, jsonify
from flask_cors import CORS
import cv2
import numpy as np
import os
import base64
import time
from deepface import DeepFace

app = Flask(__name__)
CORS(app)



# Store student data (usn and image path only)
student_data = {}

# Enroll a new student (usn, face image)
@app.route("/enroll", methods=["POST"])
def enroll():
    data = request.get_json()
    usn = data["usn"]
    image_data = data["image"].split(",")[1]
    image_bytes = base64.b64decode(image_data)
    np_arr = np.frombuffer(image_bytes, np.uint8)
    face_img = cv2.imdecode(np_arr, cv2.IMREAD_GRAYSCALE)

    # Save face image in folder (name the folder by student usn)
    student_folder = os.path.join("faces", usn)
    os.makedirs(student_folder, exist_ok=True)

    # Save image as a file in the student's folder
    img_count = len(os.listdir(student_folder))
    img_name = f"{img_count + 1}.jpg"
    img_path = os.path.join(student_folder, img_name)
    cv2.imwrite(img_path, face_img)

    # Store student usn and image path in the student_data dictionary
    student_data[usn] = {
        "image_path": img_path
    }

    return jsonify({"message": f"Student {usn} enrolled successfully!"})

# Face recognition API using DeepFace (FaceNet)
@app.route("/recognize", methods=["POST"])
def recognize():
    print("DEBUG: Request received at /recognize")
    try:
        with open("api_debug.log", "a") as f:
            f.write("DEBUG: Request received\n")
    except:
        pass

    data = request.get_json()
    image_data = data["image"].split(",")[1]
    image_bytes = base64.b64decode(image_data)
    np_arr = np.frombuffer(image_bytes, np.uint8)
    frame = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

    recognized_students = []

    try:
        start_time = time.time()
        
        with open("api_debug.log", "a") as f:
            f.write(f"DEBUG: Starting recognition. CWD: {os.getcwd()}\n")
            
        # DeepFace.find performs face detection and recognition
        dfs = DeepFace.find(img_path=frame, 
                          db_path="faces", 
                          model_name="VGG-Face", 
                          detector_backend="ssd", 
                          enforce_detection=False,
                          silent=False)
        
        find_time = time.time()
        log_msg = f"DEBUG: DeepFace.find took {find_time - start_time:.4f} seconds. Found {len(dfs)} results.\n"
        print(log_msg)
        with open("api_debug.log", "a") as f:
            f.write(log_msg)

        if len(dfs) > 0:
            for df in dfs:
                if not df.empty:
                    # DeepFace returns matches sorted by distance, so iloc[0] is the best match for this face
                    best_match = df.iloc[0]
                    identity_path = best_match['identity']
                    
                    # Extract USN
                    normalized_path = identity_path.replace('\\', '/')
                    usn = normalized_path.split('/')[-2]
                    
                    distance = best_match['distance']
                    
                    # Add to results
                    recognized_students.append({
                        'usn': usn, 
                        'confidence': float(distance)
                    })
                    print(f"DEBUG: Recognized {usn} with distance {distance}")

    except Exception as e:
        with open("api_debug.log", "a") as f:
            f.write(f"DeepFace error: {e}\n")
        print(f"DeepFace error: {e}")

    return jsonify(recognized_students)

@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "message": "Python API is running"})

if __name__ == "__main__":
    app.run(port=5006)

