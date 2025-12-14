
import os
import cv2
import numpy as np
import onnxruntime
import time

class RetinaFace:
    def __init__(self, model_file, nms_threshold=0.4):
        self.session = onnxruntime.InferenceSession(model_file, providers=['CPUExecutionProvider'])
        self.nms_threshold = nms_threshold
        # SCRFD strides
        self.strides = [8, 16, 32]
        
    def detect_scrfd(self, img, threshold=0.5):
        # Implementation for SCRFD (buffalo_l det_10g.onnx)
        # Preprocessing
        img_input = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        input_height, input_width, _ = img_input.shape
        
        # Dynamic resize
        target_size = 640
        const_max_size = 1280
        
        ratio = target_size / max(input_height, input_width)
        if ratio < 1.0:
            new_height = int(input_height * ratio)
            new_width = int(input_width * ratio)
            img_input = cv2.resize(img_input, (new_width, new_height))
            scale = ratio
        else:
            scale = 1.0
            
        # Pad to multiple of 32
        h, w = img_input.shape[:2]
        pad_h = (32 - h % 32) % 32
        pad_w = (32 - w % 32) % 32
        if pad_h > 0 or pad_w > 0:
            img_input = cv2.copyMakeBorder(img_input, 0, pad_h, 0, pad_w, cv2.BORDER_CONSTANT, value=(0,0,0))
            
        final_h, final_w = img_input.shape[:2]
        
        img_blob = img_input.transpose(2, 0, 1)
        img_blob = np.expand_dims(img_blob, 0).astype(np.float32)
        img_blob = (img_blob - 127.5) / 128.0
        
        input_name = self.session.get_inputs()[0].name
        outs = self.session.run(None, {input_name: img_blob})
        
        # DEBUG: Print all output shapes
        print("DEBUG: ONNX Output Shapes:")
        for i, o in enumerate(outs):
            print(f"  Out {i}: {o.shape}")

        proposals = []
        
        # RetinaFace/SCRFD Anchor Config for det_10g
        _feat_stride_fpn = [8, 16, 32]
        _anchors_fpn = {
            8:  [16, 32],
            16: [64, 128],
            32: [256, 512]
        }
        
        # Output mapping (based on debug_shapes_out.txt)
        # Stride 8:  0 (score), 3 (bbox), 6 (kps)
        # Stride 16: 1 (score), 4 (bbox), 7 (kps)
        # Stride 32: 2 (score), 5 (bbox), 8 (kps)
        
        output_map = {
            8:  {'score': 0, 'bbox': 3, 'kps': 6},
            16: {'score': 1, 'bbox': 4, 'kps': 7},
            32: {'score': 2, 'bbox': 5, 'kps': 8}
        }

        for stride in _feat_stride_fpn:
            anchors_size = _anchors_fpn[stride] 
            
            idx_score = output_map[stride]['score']
            idx_bbox = output_map[stride]['bbox']
            idx_kps = output_map[stride]['kps']

            # Handle (N, C) or (1, N, C)
            score_blob = outs[idx_score]
            bbox_blob = outs[idx_bbox]
            kps_blob = outs[idx_kps]
            
            if len(score_blob.shape) == 3: score_blob = score_blob[0]
            if len(bbox_blob.shape) == 3: bbox_blob = bbox_blob[0]
            if len(kps_blob.shape) == 3: kps_blob = kps_blob[0]
            
            fh = final_h // stride
            fw = final_w // stride
            num_anchors = len(anchors_size) # 2
            
            # Sanity check
            if score_blob.shape[0] != fh * fw * num_anchors:
                continue
                
            scores = score_blob[:, 0]
            mask = scores > threshold
            if not np.any(mask):
                continue
                
            scores = scores[mask]
            bbox_blob = bbox_blob[mask]
            kps_blob = kps_blob[mask]
            
            # Grid
            grid_y, grid_x = np.meshgrid(np.arange(fh), np.arange(fw), indexing='ij')
            grid_x_tiled = np.repeat(grid_x.flatten(), num_anchors)
            grid_y_tiled = np.repeat(grid_y.flatten(), num_anchors)
            
            grid_x_masked = grid_x_tiled[mask]
            grid_y_masked = grid_y_tiled[mask]
            
            # Anchor sizes
            anchor_sizes_tiled = np.tile(anchors_size, fh * fw)
            proposals_anchor_sizes = anchor_sizes_tiled[mask]
            
            # Decode centers
            cx = grid_x_masked * stride + stride / 2
            cy = grid_y_masked * stride + stride / 2
            
            # Decode bbox
            tx = bbox_blob[:, 0]
            ty = bbox_blob[:, 1]
            tw = bbox_blob[:, 2]
            th = bbox_blob[:, 3]
            
            anchor_w = proposals_anchor_sizes
            anchor_h = proposals_anchor_sizes
            
            dx = tx * 0.1 * anchor_w
            dy = ty * 0.1 * anchor_h
            dw = np.exp(tw * 0.2) * anchor_w
            dh = np.exp(th * 0.2) * anchor_h
            
            pred_cx = dx + cx
            pred_cy = dy + cy
            pred_w = dw
            pred_h = dh
            
            x1 = pred_cx - pred_w / 2
            y1 = pred_cy - pred_h / 2
            x2 = pred_cx + pred_w / 2
            y2 = pred_cy + pred_h / 2
            
            # Decode KPS (5 points: x1,y1, x2,y2 ...)
            kps = np.zeros_like(kps_blob)
            for i in range(5):
                px = kps_blob[:, i*2] * stride + cx
                py = kps_blob[:, i*2+1] * stride + cy
                kps[:, i*2] = px
                kps[:, i*2+1] = py
            
            # Combine [x1, y1, x2, y2, score, kps(10)]
            dets = np.stack([x1, y1, x2, y2, scores], axis=1)
            dets = np.concatenate([dets, kps], axis=1)
            
            # Rescale
            dets[:, :15] /= scale
            proposals.append(dets)

            fh = final_h // stride
            fw = final_w // stride
            target_n = fh * fw
            
            # Find matching outputs
            
        if not proposals:
            return []
            
        proposals = np.concatenate(proposals, axis=0)
        
        # NMS
        keep = self.nms(proposals, self.nms_threshold)
        return proposals[keep]

    def nms(self, dets, thresh):
        x1 = dets[:, 0]
        y1 = dets[:, 1]
        x2 = dets[:, 2]
        y2 = dets[:, 3]
        scores = dets[:, 4]

        areas = (x2 - x1 + 1) * (y2 - y1 + 1)
        order = scores.argsort()[::-1]

        keep = []
        while order.size > 0:
            i = order[0]
            keep.append(i)
            xx1 = np.maximum(x1[i], x1[order[1:]])
            yy1 = np.maximum(y1[i], y1[order[1:]])
            xx2 = np.minimum(x2[i], x2[order[1:]])
            yy2 = np.minimum(y2[i], y2[order[1:]])

            w = np.maximum(0.0, xx2 - xx1 + 1)
            h = np.maximum(0.0, yy2 - yy1 + 1)
            inter = w * h
            ovr = inter / (areas[i] + areas[order[1:]] - inter)

            inds = np.where(ovr <= thresh)[0]
            order = order[inds + 1]

        return keep

class ArcFace:
    def __init__(self, model_file):
        self.session = onnxruntime.InferenceSession(model_file, providers=['CPUExecutionProvider'])
        
    def get_embedding(self, face_img):
        # Resize to 112x112 using linear interpolation for better quality than default nearest?
        # Actually cv2 default is linear.
        face_img = cv2.resize(face_img, (112, 112))
        face_img = cv2.cvtColor(face_img, cv2.COLOR_BGR2RGB)
        
        face_img = np.transpose(face_img, (2, 0, 1)).astype(np.float32)
        face_img = np.expand_dims(face_img, 0)
        face_img = (face_img - 127.5) / 128.0
        
        input_name = self.session.get_inputs()[0].name
        embedding = self.session.run(None, {input_name: face_img})[0]
        
        embedding = embedding / np.linalg.norm(embedding)
        return embedding.flatten()

class FaceEngine:
    def __init__(self, det_path, rec_path):
        self.detector = RetinaFace(det_path) 
        self.recognizer = ArcFace(rec_path)
        
        # Computed via skimage.transform.SimilarityTransform
        # for standard 112x112 ArcFace
        self.arcface_dst = np.array([
            [38.2946, 51.6963],
            [73.5318, 51.5014],
            [56.0252, 71.7366],
            [41.5493, 92.3655],
            [70.7299, 92.2041] ], dtype=np.float32)

    def estimate_norm(self, lmk):
        assert lmk.shape == (5, 2)
        dst = self.arcface_dst
        M, _ = cv2.estimateAffinePartial2D(lmk, dst, method=cv2.LMEDS)
        return M

    def analyze(self, frame):
        # 1. Detect
        faces = self.detector.detect_scrfd(frame, threshold=0.4)
        
        results = []
        for face in faces:
            # Face: [x1, y1, x2, y2, score, kps(10)]
            x1, y1, x2, y2, score = face[:5]
            kps = face[5:15].reshape(5, 2)
            
            # Align
            # Filter small faces
            if (x2 - x1) < 40 or (y2 - y1) < 40:
                continue

            try:
                M = self.estimate_norm(kps)
                if M is None:
                    raise ValueError("Transform failed")
                face_crop = cv2.warpAffine(frame, M, (112, 112), borderValue=0.0)
            except:
                # Fallback to simple crop
                h, w, _ = frame.shape
                x1 = max(0, int(x1))
                y1 = max(0, int(y1))
                x2 = min(w, int(x2))
                y2 = min(h, int(y2))
                face_crop = frame[y1:y2, x1:x2]
            
            # 2. Recognize
            embedding = self.recognizer.get_embedding(face_crop)
            
            results.append({
                "bbox": [x1, y1, x2, y2],
                "confidence": score,
                "embedding": embedding,
                "kps": kps.tolist()
            })
            
        return results
