#!/usr/bin/env python3
"""
EventSnap Facial Recognition Service
Uses OpenCV's LBPH face recognizer + Haar Cascade face detection.

Usage (called by Node.js as a child process):
  python3 face_recognition_service.py <command> <args...>

Commands:
  extract_encoding <image_path>
      → prints JSON: {"success": true, "encoding": [...], "face_count": N}

  find_matches <selfie_encoding_json> <candidate_image_path1> <candidate_image_path2> ...
      → prints JSON: {"matches": [{"path": "...", "confidence": 0.82}, ...]}
"""

import sys
import json
import os
import cv2
import numpy as np

# Load Haar cascade for face detection
CASCADE_PATH = cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'
face_cascade = cv2.CascadeClassifier(CASCADE_PATH)


def detect_faces(img_gray):
    """Detect face bounding boxes in grayscale image."""
    faces = face_cascade.detectMultiScale(
        img_gray,
        scaleFactor=1.1,
        minNeighbors=5,
        minSize=(40, 40),
        flags=cv2.CASCADE_SCALE_IMAGE
    )
    return faces if len(faces) > 0 else []


def extract_face_encoding(image_path):
    """
    Detect face, extract a normalized histogram-based encoding.
    Returns a flat list of floats representing the face signature.
    """
    if not os.path.exists(image_path):
        return {"success": False, "error": f"File not found: {image_path}"}

    img = cv2.imread(image_path)
    if img is None:
        return {"success": False, "error": "Could not read image"}

    img_gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    faces = detect_faces(img_gray)

    if len(faces) == 0:
        return {"success": False, "error": "No face detected in image", "face_count": 0}

    # Use the largest detected face
    x, y, w, h = max(faces, key=lambda f: f[2] * f[3])

    # Add padding around face
    pad = int(min(w, h) * 0.2)
    x1 = max(0, x - pad)
    y1 = max(0, y - pad)
    x2 = min(img_gray.shape[1], x + w + pad)
    y2 = min(img_gray.shape[0], y + h + pad)

    face_roi = img_gray[y1:y2, x1:x2]

    # Resize to standard size
    face_resized = cv2.resize(face_roi, (128, 128))

    # Apply histogram equalization for lighting normalization
    face_eq = cv2.equalizeHist(face_resized)

    # Compute LBP (Local Binary Pattern) histogram — robust face descriptor
    encoding = compute_lbp_encoding(face_eq)

    return {
        "success": True,
        "encoding": encoding.tolist(),
        "face_count": len(faces),
        "face_bbox": [int(x), int(y), int(w), int(h)]
    }


def compute_lbp_encoding(face_img):
    """
    Compute LBP (Local Binary Pattern) histogram as face encoding.
    LBP is rotation-invariant and lighting-robust — good for face matching.
    """
    radius = 1
    n_points = 8 * radius
    height, width = face_img.shape

    # Manual LBP computation
    lbp = np.zeros_like(face_img, dtype=np.uint8)
    for i in range(radius, height - radius):
        for j in range(radius, width - radius):
            center = face_img[i, j]
            code = 0
            neighbors = [
                face_img[i - radius, j],
                face_img[i - radius, j + radius],
                face_img[i, j + radius],
                face_img[i + radius, j + radius],
                face_img[i + radius, j],
                face_img[i + radius, j - radius],
                face_img[i, j - radius],
                face_img[i - radius, j - radius],
            ]
            for k, neighbor in enumerate(neighbors):
                if neighbor >= center:
                    code |= (1 << k)
            lbp[i, j] = code

    # Divide face into 4x4 grid and compute histogram for each cell
    grid_size = 4
    cell_h = height // grid_size
    cell_w = width // grid_size
    histograms = []

    for row in range(grid_size):
        for col in range(grid_size):
            cell = lbp[row*cell_h:(row+1)*cell_h, col*cell_w:(col+1)*cell_w]
            hist, _ = np.histogram(cell.ravel(), bins=32, range=(0, 256))
            hist = hist.astype(float)
            norm = np.linalg.norm(hist)
            if norm > 0:
                hist /= norm
            histograms.append(hist)

    return np.concatenate(histograms)


def compare_encodings(enc1, enc2):
    """
    Compare two face encodings using Chi-squared distance.
    Returns similarity score 0.0-1.0 (1.0 = identical).
    """
    enc1 = np.array(enc1, dtype=float)
    enc2 = np.array(enc2, dtype=float)

    if len(enc1) != len(enc2):
        return 0.0

    # Chi-squared distance (lower = more similar)
    eps = 1e-10
    chi2 = 0.5 * np.sum((enc1 - enc2) ** 2 / (enc1 + enc2 + eps))

    # Convert to similarity score (tune threshold empirically)
    # chi2 ~ 0 means identical; chi2 > 5 means very different
    similarity = float(np.exp(-chi2 / 2.5))
    return round(similarity, 4)


def find_matches_in_images(selfie_encoding, image_paths, threshold=0.35):
    """
    Given a selfie encoding, scan a list of images for matching faces.
    Returns list of matches with confidence scores.
    """
    matches = []

    for img_path in image_paths:
        if not os.path.exists(img_path):
            continue

        img = cv2.imread(img_path)
        if img is None:
            continue

        img_gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        faces = detect_faces(img_gray)

        if len(faces) == 0:
            continue

        # Check each face in the photo
        best_match_score = 0.0
        for (x, y, w, h) in faces:
            pad = int(min(w, h) * 0.2)
            x1 = max(0, x - pad)
            y1 = max(0, y - pad)
            x2 = min(img_gray.shape[1], x + w + pad)
            y2 = min(img_gray.shape[0], y + h + pad)

            face_roi = img_gray[y1:y2, x1:x2]
            face_resized = cv2.resize(face_roi, (128, 128))
            face_eq = cv2.equalizeHist(face_resized)
            encoding = compute_lbp_encoding(face_eq)

            score = compare_encodings(selfie_encoding, encoding.tolist())
            if score > best_match_score:
                best_match_score = score

        if best_match_score >= threshold:
            matches.append({
                "path": img_path,
                "filename": os.path.basename(img_path),
                "confidence": best_match_score,
                "faces_detected": len(faces)
            })

    # Sort by confidence descending
    matches.sort(key=lambda x: x["confidence"], reverse=True)
    return matches


# ─── Main entry point ─────────────────────────────────────────────────────────

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print(json.dumps({"error": "Usage: face_recognition_service.py <command> <args...>"}))
        sys.exit(1)

    command = sys.argv[1]

    try:
        if command == "extract_encoding":
            image_path = sys.argv[2]
            result = extract_face_encoding(image_path)
            print(json.dumps(result))

        elif command == "find_matches":
            selfie_encoding_json = sys.argv[2]
            image_paths = sys.argv[3:]
            selfie_encoding = json.loads(selfie_encoding_json)
            matches = find_matches_in_images(selfie_encoding, image_paths)
            print(json.dumps({"matches": matches, "total": len(matches)}))

        else:
            print(json.dumps({"error": f"Unknown command: {command}"}))
            sys.exit(1)

    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)
