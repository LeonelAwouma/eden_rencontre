/**
 * Server-side Face Verification — real face detection & recognition.
 *
 * Authoritative counterpart to `face-verification.ts`: runs the same
 * face-api.js models (TinyFaceDetector + 68-point landmarks + a 128-d face
 * descriptor) but in Node, via the WASM TensorFlow.js backend — no native
 * addon (`@tensorflow/tfjs-node`) or `node-canvas` dependency, so it stays
 * portable across hosting environments. Images are decoded with `sharp` into
 * raw pixel tensors instead of relying on DOM APIs.
 *
 * The client-side check exists for instant UX feedback during capture; this
 * is the version whose result actually gets persisted, so the stored
 * `selfie_verified` / `selfie_verification_score` can't be forged by editing
 * the request payload.
 *
 * Règles (src/lib/face-rules.ts) : chaque photo de profil doit correspondre au
 * selfie, et la rafale de capture doit prouver une vraie personne présente.
 */
import path from "path";
import sharp from "sharp";
import * as tf from "@tensorflow/tfjs";
import "@tensorflow/tfjs-backend-wasm";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore — no bundled types for the node-wasm build; the public API matches face-api.esm.js.
import * as faceapi from "@vladmandic/face-api/dist/face-api.node-wasm.js";

import {
  PHOTO_MATCH_THRESHOLD, LIVENESS_MIN_FRAMES, LIVENESS_MIN_YAW_RANGE,
  decide, distanceToScore, headYaw, type LivenessCheck, type PhotoCheck,
} from "./face-rules";

const MODEL_PATH = path.join(process.cwd(), "public", "models");

export interface ServerVerificationResult {
  score: number;
  verified: boolean;
  photoScores: number[];
  photos: PhotoCheck[];
  liveness: LivenessCheck | null;
  reason: string;
}

let readyPromise: Promise<void> | null = null;
function ensureReady(): Promise<void> {
  if (!readyPromise) {
    readyPromise = (async () => {
      await tf.setBackend("wasm");
      await tf.ready();
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromDisk(MODEL_PATH),
        faceapi.nets.faceLandmark68Net.loadFromDisk(MODEL_PATH),
        faceapi.nets.faceRecognitionNet.loadFromDisk(MODEL_PATH),
      ]);
    })();
  }
  return readyPromise;
}

async function loadImageBuffer(src: string): Promise<Buffer> {
  if (src.startsWith("data:")) {
    const base64 = src.split(",")[1] || "";
    return Buffer.from(base64, "base64");
  }
  const res = await fetch(src);
  if (!res.ok) throw new Error(`Failed to fetch image (${res.status})`);
  return Buffer.from(await res.arrayBuffer());
}

/** Decodes to a tf.Tensor3D, capped at 640px on the long side (preserves aspect ratio — squishing would distort the face). */
async function loadImageTensor(src: string) {
  const buf = await loadImageBuffer(src);
  const { data, info } = await sharp(buf)
    .rotate() // apply EXIF orientation
    .resize(640, 640, { fit: "inside", withoutEnlargement: true })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return tf.tensor3d(new Uint8Array(data), [info.height, info.width, 3], "int32");
}

const detectorOptions = () => new faceapi.TinyFaceDetectorOptions({ inputSize: 512, scoreThreshold: 0.5 });

/** Tous les visages de l'image (avec repères et descripteur), du plus grand au plus petit. */
async function detectFaces(src: string) {
  const tensor = await loadImageTensor(src);
  try {
    // `tensor` is a valid tf.Tensor3D at runtime, but face-api's types reference
    // its own internal copy of the tfjs declarations (structurally distinct for TS).
    const faces = await faceapi
      .detectAllFaces(tensor as any, detectorOptions())
      .withFaceLandmarks()
      .withFaceDescriptors();
    const area = (f: any) => f.detection.box.width * f.detection.box.height;
    return [...faces].sort((a: any, b: any) => area(b) - area(a));
  } finally {
    tensor.dispose();
  }
}

/** Visages « significatifs » : on ignore les visages minuscules à l'arrière-plan. */
function mainFaces(faces: any[]) {
  if (!faces.length) return faces;
  const biggest = faces[0].detection.box.width * faces[0].detection.box.height;
  return faces.filter((f) => f.detection.box.width * f.detection.box.height >= biggest * 0.2);
}

/**
 * @param livenessFrames images de la rafale prise pendant que la personne tourne la tête.
 *   `null` : pas de contrôle de présence (revérification d'un ancien inscrit par l'admin).
 */
export async function verifySelfieServer(
  selfieSrc: string,
  profilePhotoSrcs: string[],
  livenessFrames: string[] | null = null
): Promise<ServerVerificationResult> {
  const empty = (reason: string): ServerVerificationResult =>
    ({ score: 0, verified: false, photoScores: [], photos: [], liveness: null, reason });
  try {
    await ensureReady();

    const selfieFaces = mainFaces(await detectFaces(selfieSrc));
    if (selfieFaces.length === 0) return empty("Aucun visage détecté sur le selfie.");
    if (selfieFaces.length > 1) return empty("Plusieurs visages sur le selfie : il doit vous montrer seul(e).");
    const selfie = selfieFaces[0];

    // ── Chaque photo de profil doit correspondre ──
    const photos: PhotoCheck[] = [];
    for (const src of profilePhotoSrcs.filter(Boolean)) {
      try {
        const faces = mainFaces(await detectFaces(src));
        if (faces.length === 0) { photos.push({ score: 0, issue: "no_face" }); continue; }
        if (faces.length > 1) {
          // Photo de groupe : on note la meilleure ressemblance, mais elle ne prouve pas l'identité.
          const best = Math.min(...faces.map((f: any) => faceapi.euclideanDistance(selfie.descriptor, f.descriptor)));
          photos.push({ score: distanceToScore(best), issue: "several_faces" });
          continue;
        }
        const distance = faceapi.euclideanDistance(selfie.descriptor, faces[0].descriptor);
        photos.push({ score: distanceToScore(distance), issue: distance <= PHOTO_MATCH_THRESHOLD ? null : "mismatch" });
      } catch {
        photos.push({ score: 0, issue: "unreadable" });
      }
    }

    // ── Preuve de présence : même visage, tête qui pivote ──
    let liveness: LivenessCheck | null = null;
    if (livenessFrames) {
      const yaws: number[] = [livenessYaw(selfie)];
      let framesWithFace = 1;
      let sameFace = true;
      for (const frame of livenessFrames.slice(0, 10)) {
        try {
          const faces = mainFaces(await detectFaces(frame));
          if (faces.length !== 1) continue;
          framesWithFace++;
          if (faceapi.euclideanDistance(selfie.descriptor, faces[0].descriptor) > PHOTO_MATCH_THRESHOLD + 0.05) sameFace = false;
          yaws.push(livenessYaw(faces[0]));
        } catch { /* image illisible : ignorée */ }
      }
      const yawRange = Math.max(...yaws) - Math.min(...yaws);
      const passed = framesWithFace >= LIVENESS_MIN_FRAMES && sameFace && yawRange >= LIVENESS_MIN_YAW_RANGE;
      liveness = {
        checked: true,
        passed,
        framesWithFace,
        yawRange: Math.round(yawRange * 100) / 100,
        reason: passed ? "Présence confirmée."
          : framesWithFace < LIVENESS_MIN_FRAMES ? "visage pas assez visible pendant la capture, recommencez face à la caméra."
          : !sameFace ? "le visage a changé pendant la capture."
          : "la tête n'a pas tourné pendant la capture. Tournez lentement la tête de gauche à droite.",
      };
    }

    const verdict = decide(photos, liveness);
    return { ...verdict, photoScores: photos.map((p) => p.score), photos, liveness };
  } catch (error) {
    return empty(`Erreur lors de la vérification : ${error instanceof Error ? error.message : "erreur inconnue"}`);
  }
}

function livenessYaw(face: any): number {
  return headYaw(face.landmarks.positions as { x: number; y: number }[]);
}
