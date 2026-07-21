import io
import numpy as np
import onnxruntime as ort
from PIL import Image
from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Dental AI Vision API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

MODEL_PATH = "dental_rtdetr_production.onnx"
session = ort.InferenceSession(MODEL_PATH, providers=["CPUExecutionProvider"])

CLASSES = [
    "bone_loss",
    "mesial_caries",
    "occlusal_caries",
    "radiolucency",
    "marginal_leakage",
]

def sigmoid(x):
    return 1 / (1 + np.exp(-x))

@app.post("/api/dental-ai-vision")
async def analyze_xray(image: UploadFile = File(...)):
    contents = await image.read()
    pil_image = Image.open(io.BytesIO(contents)).convert("RGB")
    orig_w, orig_h = pil_image.size

    resized_img = pil_image.resize((640, 640))
    img_data = np.array(resized_img, dtype=np.float32) / 255.0
    img_data = np.transpose(img_data, (2, 0, 1))
    input_tensor = np.expand_dims(img_data, axis=0)

    input_name = session.get_inputs()[0].name
    outputs = session.run(None, {input_name: input_tensor})

    logits, pred_boxes = outputs[0][0], outputs[1][0]

    boxes = []
    confidence_threshold = 0.40

    for i in range(len(logits)):
        scores = sigmoid(logits[i])
        class_id = int(np.argmax(scores))
        confidence = float(scores[class_id])

        if confidence > confidence_threshold:
            cx, cy, bw, bh = pred_boxes[i]
            x_min = max(0.0, cx - (bw / 2))
            y_min = max(0.0, cy - (bh / 2))

            label_name = CLASSES[class_id] if class_id < len(CLASSES) else f"finding_{class_id}"

            boxes.append({
                "x": float(x_min),
                "y": float(y_min),
                "w": float(bw),
                "h": float(bh),
                "label": f"{label_name.replace('_', ' ').title()} #{class_id + 1}",
                "confidence": round(confidence, 2),
            })

    return {
        "success": True,
        "_demo": False,
        "data": {
            "boxes": boxes,
            "image_width": orig_w,
            "image_height": orig_h,
        },
    }
