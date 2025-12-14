
import numpy as np

class FaceTracker:
    def __init__(self, max_misses=5, iou_threshold=0.3, history_len=7):
        self.tracks = [] # List of {'id': int, 'bbox': [x1,y1,x2,y2], 'misses': 0, 'history': [], 'final_name': 'Unknown'}
        self.next_id = 0
        self.max_misses = max_misses
        self.iou_threshold = iou_threshold
        self.history_len = history_len

    def compute_iou(self, boxA, boxB):
        xA = max(boxA[0], boxB[0])
        yA = max(boxA[1], boxB[1])
        xB = min(boxA[2], boxB[2])
        yB = min(boxA[3], boxB[3])

        interArea = max(0, xB - xA + 1) * max(0, yB - yA + 1)
        boxAArea = (boxA[2] - boxA[0] + 1) * (boxA[3] - boxA[1] + 1)
        boxBArea = (boxB[2] - boxB[0] + 1) * (boxB[3] - boxB[1] + 1)

        iou = interArea / float(boxAArea + boxBArea - interArea)
        return iou

    def update(self, detections):
        """
        detections: list of dict {'bbox': [x1,y1,x2,y2], 'usn': str, 'score': float}
        Returns: list of dicts with stabilized 'usn'
        """
        
        # 1. Prediction (skipped for simple IoU, could be Kalman)
        
        # 2. Association
        matched_indices = [] # indices of detections matched to tracks
        updated_tracks = []  # indices of tracks that found a match
        
        for t_idx, track in enumerate(self.tracks):
            best_iou = 0
            best_d_idx = -1
            
            for d_idx, det in enumerate(detections):
                if d_idx in matched_indices:
                    continue
                
                iou = self.compute_iou(track['bbox'], det['bbox'])
                if iou > best_iou:
                    best_iou = iou
                    best_d_idx = d_idx
            
            if best_iou > self.iou_threshold:
                # Match found
                matched_indices.append(best_d_idx)
                updated_tracks.append(t_idx)
                
                # Update track
                det = detections[best_d_idx]
                track['bbox'] = det['bbox']
                track['misses'] = 0
                
                # Add to history
                track['history'].append(det['usn'])
                if len(track['history']) > self.history_len:
                    track['history'].pop(0)
                    
                # Majority Vote
                counts = {}
                for name in track['history']:
                    counts[name] = counts.get(name, 0) + 1
                
                # Sort by frequency
                sorted_names = sorted(counts.items(), key=lambda x: x[1], reverse=True)
                majority_name = sorted_names[0][0]
                
                track['final_name'] = majority_name
                
                # Update detection with stabilized name
                # We return the detection object augmented with ID and stable name
                det['track_id'] = track['id']
                det['stable_usn'] = majority_name
            else:
                # Track lost this frame
                track['misses'] += 1
        
        # 3. Create new tracks for unmatched detections
        for d_idx, det in enumerate(detections):
            if d_idx not in matched_indices:
                new_track = {
                    'id': self.next_id,
                    'bbox': det['bbox'],
                    'misses': 0,
                    'history': [det['usn']],
                    'final_name': det['usn']
                }
                self.tracks.append(new_track)
                self.next_id += 1
                
                det['track_id'] = new_track['id']
                det['stable_usn'] = det['usn']
        
        # 4. cleanup dead tracks
        self.tracks = [t for t in self.tracks if t['misses'] < self.max_misses]
        
        return detections
