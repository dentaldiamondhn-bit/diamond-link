import io
import logging
import numpy as np
from PIL import Image
from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("dental-ai")

app = FastAPI(title="Dental AI Vision API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

MODEL_PATH = "dental_rtdetr_production.onnx"

session = None
try:
    import onnxruntime as ort
    session = ort.InferenceSession(MODEL_PATH, providers=["CPUExecutionProvider"])
    logger.info("ONNX model loaded successfully")
except Exception as e:
    logger.warning("Failed to load ONNX model: %s. Server will run in demo-only mode.", e)

CLASSES = [
    "1st Molar",
    "1st Premolar",
    "2nd Molar",
    "2nd Premolar",
    "Canine",
    "Central Incisor",
    "Lateral Incisor",
]


def map_tooth_number(cx: float, cy: float, class_name: str) -> str:
    """
    Dental Viewing Convention:
    - Image Left (cx < 0.5): Patient's Right (Upper Right = #01-#08, Lower Right = #25-#32)
    - Image Right (cx >= 0.5): Patient's Left (Upper Left = #09-#16, Lower Left = #17-#24)
    """
    is_upper = cy < 0.52

    if is_upper:
        if cx < 0.5:
            mapping = {
                "Central Incisor": "08",
                "Lateral Incisor": "07",
                "Canine": "06",
                "1st Premolar": "05",
                "2nd Premolar": "04",
                "1st Molar": "03",
                "2nd Molar": "02",
            }
        else:
            mapping = {
                "Central Incisor": "09",
                "Lateral Incisor": "10",
                "Canine": "11",
                "1st Premolar": "12",
                "2nd Premolar": "13",
                "1st Molar": "14",
                "2nd Molar": "15",
            }
    else:
        if cx < 0.5:
            mapping = {
                "Central Incisor": "25",
                "Lateral Incisor": "26",
                "Canine": "27",
                "1st Premolar": "28",
                "2nd Premolar": "29",
                "1st Molar": "30",
                "2nd Molar": "31",
            }
        else:
            mapping = {
                "Central Incisor": "24",
                "Lateral Incisor": "23",
                "Canine": "22",
                "1st Premolar": "21",
                "2nd Premolar": "20",
                "1st Molar": "19",
                "2nd Molar": "18",
            }

    if is_upper and cx < 0.5:
        if 0.30 <= cx < 0.38:
            tooth_num = "06"
            class_name = "Canine"
        elif 0.38 <= cx < 0.44:
            tooth_num = "07"
            class_name = "Lateral Incisor"
        elif 0.44 <= cx <= 0.50:
            tooth_num = "08"
            class_name = "Central Incisor"
        else:
            tooth_num = mapping.get(class_name, "06")
    else:
        tooth_num = mapping.get(class_name, "00")

    return f"{class_name} #{tooth_num}"

def apply_nms(boxes, scores, class_ids, iou_threshold=0.45):
    if len(boxes) == 0:
        return []

    boxes = np.array(boxes)
    scores = np.array(scores)
    class_ids = np.array(class_ids)

    x1 = boxes[:, 0]
    y1 = boxes[:, 1]
    x2 = boxes[:, 2]
    y2 = boxes[:, 3]

    areas = (x2 - x1) * (y2 - y1)
    order = scores.argsort()[::-1]

    keep = []
    while order.size > 0:
        i = order[0]
        keep.append(i)

        xx1 = np.maximum(x1[i], x1[order[1:]])
        yy1 = np.maximum(y1[i], y1[order[1:]])
        xx2 = np.minimum(x2[i], x2[order[1:]])
        yy2 = np.minimum(y2[i], y2[order[1:]])

        w = np.maximum(0.0, xx2 - xx1)
        h = np.maximum(0.0, yy2 - yy1)
        intersection = w * h

        iou = intersection / (areas[i] + areas[order[1:]] - intersection)

        inds = np.where(iou <= iou_threshold)[0]
        order = order[inds + 1]

    return [
        {
            "x": float(round(boxes[idx][0], 4)),
            "y": float(round(boxes[idx][1], 4)),
            "w": float(round(boxes[idx][2] - boxes[idx][0], 4)),
            "h": float(round(boxes[idx][3] - boxes[idx][1], 4)),
            "label": map_tooth_number(
                (boxes[idx][0] + boxes[idx][2]) / 2.0,
                (boxes[idx][1] + boxes[idx][3]) / 2.0,
                CLASSES[class_ids[idx]]
            ),
            "confidence": float(round(scores[idx], 2)),
        }
        for idx in keep
    ]


@app.post("/api/dental-ai-vision")
async def analyze_xray(image: UploadFile = File(...)):
    contents = await image.read()
    pil_image = Image.open(io.BytesIO(contents)).convert("RGB")
    orig_w, orig_h = pil_image.size

    if session is None:
        return {"success": False, "error": "Model session not loaded"}

    try:
        resized_img = pil_image.resize((640, 640))
        img_data = np.array(resized_img, dtype=np.float32) / 255.0
        img_data = np.transpose(img_data, (2, 0, 1))
        input_tensor = np.expand_dims(img_data, axis=0)

        input_name = session.get_inputs()[0].name
        outputs = session.run(None, {input_name: input_tensor})

        predictions = np.squeeze(outputs[0], axis=0).T

        candidate_boxes = []
        candidate_scores = []
        candidate_classes = []

        CONFIDENCE_THRESHOLD = 0.35

        for row in predictions:
            cx = float(row[0]) / 640.0
            cy = float(row[1]) / 640.0
            w = float(row[2]) / 640.0
            h = float(row[3]) / 640.0

            class_scores = row[4:]
            class_id = int(np.argmax(class_scores))
            confidence = float(class_scores[class_id])

            if confidence >= CONFIDENCE_THRESHOLD:
                x_min = max(0.0, min(1.0, cx - (w / 2.0)))
                y_min = max(0.0, min(1.0, cy - (h / 2.0)))
                x_max = max(0.0, min(1.0, cx + (w / 2.0)))
                y_max = max(0.0, min(1.0, cy + (h / 2.0)))

                candidate_boxes.append([x_min, y_min, x_max, y_max])
                candidate_scores.append(confidence)
                candidate_classes.append(class_id)

        final_boxes = apply_nms(
            candidate_boxes,
            candidate_scores,
            candidate_classes,
            iou_threshold=0.40,
        )

        return {
            "success": True,
            "_demo": False,
            "data": {
                "boxes": final_boxes,
                "image_width": orig_w,
                "image_height": orig_h,
            },
        }
    except Exception as e:
        logger.error("Inference failed: %s", e)
        return {"success": False, "error": str(e)}
