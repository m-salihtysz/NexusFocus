import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";

const LEFT_EYE = [33, 160, 158, 133, 153, 144];
const RIGHT_EYE = [362, 385, 387, 263, 373, 380];
const LEFT_IRIS = [468, 469, 470, 471];
const RIGHT_IRIS = [473, 474, 475, 476];

const BLINK_THRESHOLD = 0.20;
const BLINK_WINDOW_MS = 30000;

let trackerInstance = null;
let creationPromise = null;
const blinkTimestamps = [];
let prevGaze = null;
let prevGazeAt = 0;
let blinkOpen = true;

async function createTracker() {
  const fileset = await FilesetResolver.forVisionTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm"
  );
  return FaceLandmarker.createFromOptions(fileset, {
    baseOptions: {
      modelAssetPath:
        "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/latest/face_landmarker.task",
      delegate: "GPU",
    },
    runningMode: "VIDEO",
    numFaces: 1,
    outputFaceBlendshapes: true,
    outputFacialTransformationMatrixes: false,
  });
}

async function ensureTracker() {
  if (trackerInstance) return trackerInstance;
  if (!creationPromise) creationPromise = createTracker();
  trackerInstance = await creationPromise;
  return trackerInstance;
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function eyeAspectRatio(landmarks, eye) {
  const p1 = landmarks[eye[0]];
  const p2 = landmarks[eye[1]];
  const p3 = landmarks[eye[2]];
  const p4 = landmarks[eye[3]];
  const p5 = landmarks[eye[4]];
  const p6 = landmarks[eye[5]];
  const vertical = distance(p2, p6) + distance(p3, p5);
  const horizontal = Math.max(distance(p1, p4), 1e-6);
  return vertical / (2 * horizontal);
}

function avgPoint(landmarks, indices) {
  let sx = 0;
  let sy = 0;
  indices.forEach((idx) => {
    sx += landmarks[idx].x;
    sy += landmarks[idx].y;
  });
  return { x: sx / indices.length, y: sy / indices.length };
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function headPoseFrom(landmarks) {
  const forehead = landmarks[10];
  const chin = landmarks[152];
  const nose = landmarks[1];
  const leftCheek = landmarks[234];
  const rightCheek = landmarks[454];
  const leftEyeOuter = landmarks[33];
  const rightEyeOuter = landmarks[263];

  const pitch = ((chin.y - forehead.y) - 0.34) * 140.0;
  const yaw = (nose.x - (leftCheek.x + rightCheek.x) / 2.0) * 260.0;
  const roll = (rightEyeOuter.y - leftEyeOuter.y) * 220.0;

  return {
    pitch: clamp(pitch, -45, 45),
    yaw: clamp(yaw, -45, 45),
    roll: clamp(roll, -45, 45),
  };
}

function pruneBlinkTimestamps(now) {
  while (blinkTimestamps.length > 0 && now - blinkTimestamps[0] > BLINK_WINDOW_MS) {
    blinkTimestamps.shift();
  }
}

function lookupBlendshape(blendshapes, name) {
  if (!blendshapes) return 0;
  const entry = blendshapes.find((item) => item.categoryName === name);
  return entry ? entry.score : 0;
}

function expressionsFromBlendshapes(blendshapes) {
  if (!blendshapes || blendshapes.length === 0) {
    return {
      fatigue: 0,
      stress: 0,
      distraction: 0,
      positivity: 0,
      surprise: 0,
      dominant: "neutral",
    };
  }

  const eyeBlinkL = lookupBlendshape(blendshapes, "eyeBlinkLeft");
  const eyeBlinkR = lookupBlendshape(blendshapes, "eyeBlinkRight");
  const eyeSquintL = lookupBlendshape(blendshapes, "eyeSquintLeft");
  const eyeSquintR = lookupBlendshape(blendshapes, "eyeSquintRight");
  const browDownL = lookupBlendshape(blendshapes, "browDownLeft");
  const browDownR = lookupBlendshape(blendshapes, "browDownRight");
  const browInnerUp = lookupBlendshape(blendshapes, "browInnerUp");
  const jawOpen = lookupBlendshape(blendshapes, "jawOpen");
  const mouthSmileL = lookupBlendshape(blendshapes, "mouthSmileLeft");
  const mouthSmileR = lookupBlendshape(blendshapes, "mouthSmileRight");
  const mouthFrownL = lookupBlendshape(blendshapes, "mouthFrownLeft");
  const mouthFrownR = lookupBlendshape(blendshapes, "mouthFrownRight");
  const mouthShrugUpper = lookupBlendshape(blendshapes, "mouthShrugUpper");
  const eyeLookDownL = lookupBlendshape(blendshapes, "eyeLookDownLeft");
  const eyeLookDownR = lookupBlendshape(blendshapes, "eyeLookDownRight");

  const fatigue = clamp(
    (eyeBlinkL + eyeBlinkR) * 0.4 + (eyeSquintL + eyeSquintR) * 0.6,
    0,
    1
  );
  const stress = clamp(
    (browDownL + browDownR) * 0.55 + (mouthFrownL + mouthFrownR) * 0.45,
    0,
    1
  );
  const distraction = clamp(
    (eyeLookDownL + eyeLookDownR) * 0.45 + mouthShrugUpper * 0.55,
    0,
    1
  );
  const positivity = clamp((mouthSmileL + mouthSmileR) * 0.55, 0, 1);
  const surprise = clamp(browInnerUp * 0.55 + jawOpen * 0.45, 0, 1);

  const candidates = { fatigue, stress, distraction, positivity, surprise };
  const dominant = Object.entries(candidates).reduce(
    (best, [key, value]) => (value > best.value ? { key, value } : best),
    { key: "neutral", value: 0.15 }
  );

  return { fatigue, stress, distraction, positivity, surprise, dominant: dominant.key };
}

export async function extractMetricsFromVideo(video, timestampMs) {
  if (!video || video.readyState < 2) return null;
  const tracker = await ensureTracker();
  const result = tracker.detectForVideo(video, timestampMs);
  if (!result.faceLandmarks || result.faceLandmarks.length === 0) {
    return null;
  }

  const landmarks = result.faceLandmarks[0];
  const earLeft = eyeAspectRatio(landmarks, LEFT_EYE);
  const earRight = eyeAspectRatio(landmarks, RIGHT_EYE);
  const ear = (earLeft + earRight) / 2;

  const now = Date.now();
  pruneBlinkTimestamps(now);
  if (ear < BLINK_THRESHOLD && blinkOpen) {
    blinkTimestamps.push(now);
    blinkOpen = false;
  } else if (ear >= BLINK_THRESHOLD + 0.02) {
    blinkOpen = true;
  }
  const blinkRatePerSec = blinkTimestamps.length / (BLINK_WINDOW_MS / 1000);

  const leftIris = avgPoint(landmarks, LEFT_IRIS);
  const rightIris = avgPoint(landmarks, RIGHT_IRIS);
  const gazeX = (leftIris.x + rightIris.x) / 2;
  const gazeY = (leftIris.y + rightIris.y) / 2;

  let gazeSpeed = 0;
  if (prevGaze) {
    const elapsed = Math.max(1, now - prevGazeAt) / 1000;
    const moved = Math.hypot(gazeX - prevGaze.x, gazeY - prevGaze.y);
    gazeSpeed = clamp((moved / elapsed) * 4, 0, 1);
  }
  prevGaze = { x: gazeX, y: gazeY };
  prevGazeAt = now;

  const head = headPoseFrom(landmarks);
  const blendshapes = result.faceBlendshapes?.[0]?.categories;
  const expressions = expressionsFromBlendshapes(blendshapes);

  return {
    blink_rate: clamp(blinkRatePerSec, 0, 1),
    gaze_speed: gazeSpeed,
    gaze_x: gazeX,
    gaze_y: gazeY,
    head_pitch: head.pitch,
    head_yaw: head.yaw,
    head_roll: head.roll,
    ear,
    expressions,
    landmarks,
    detected_at: Date.now(),
  };
}

export function getFaceLandmarkerStatic() {
  return {
    FACE_LANDMARKS_TESSELATION: FaceLandmarker.FACE_LANDMARKS_TESSELATION,
    FACE_LANDMARKS_FACE_OVAL: FaceLandmarker.FACE_LANDMARKS_FACE_OVAL,
    FACE_LANDMARKS_LEFT_EYE: FaceLandmarker.FACE_LANDMARKS_LEFT_EYE,
    FACE_LANDMARKS_RIGHT_EYE: FaceLandmarker.FACE_LANDMARKS_RIGHT_EYE,
    FACE_LANDMARKS_LEFT_IRIS: FaceLandmarker.FACE_LANDMARKS_LEFT_IRIS,
    FACE_LANDMARKS_RIGHT_IRIS: FaceLandmarker.FACE_LANDMARKS_RIGHT_IRIS,
    FACE_LANDMARKS_LIPS: FaceLandmarker.FACE_LANDMARKS_LIPS,
    FACE_LANDMARKS_LEFT_EYEBROW: FaceLandmarker.FACE_LANDMARKS_LEFT_EYEBROW,
    FACE_LANDMARKS_RIGHT_EYEBROW: FaceLandmarker.FACE_LANDMARKS_RIGHT_EYEBROW,
  };
}

export function disposeTracker() {
  if (trackerInstance && typeof trackerInstance.close === "function") {
    trackerInstance.close();
  }
  trackerInstance = null;
  creationPromise = null;
  blinkTimestamps.length = 0;
  prevGaze = null;
  prevGazeAt = 0;
  blinkOpen = true;
}
