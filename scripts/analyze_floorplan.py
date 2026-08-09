import cv2
import numpy as np
import sys

def analyze(img_path):
    img = cv2.imread(img_path, cv2.IMREAD_GRAYSCALE)
    if img is None:
        print("Could not read image")
        return
        
    H, W = img.shape
    print(f"Image size: {W}x{H}")
    
    # Invert so ink is white, background is black
    _, thresh = cv2.threshold(img, 240, 255, cv2.THRESH_BINARY_INV)
    
    # Find contours
    contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    print(f"Found {len(contours)} contours")
    
    # Sort by bounding box area, descending
    boxes = [cv2.boundingRect(c) for c in contours]
    boxes = sorted(boxes, key=lambda b: b[2]*b[3], reverse=True)
    
    for i, (x, y, w, h) in enumerate(boxes[:10]):
        area = w * h
        print(f"Box {i}: x={x}, y={y}, w={w}, h={h}, area={area}, right={x+w}, bottom={y+h}")

if __name__ == "__main__":
    analyze(sys.argv[1])
