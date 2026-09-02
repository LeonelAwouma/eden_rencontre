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
 */
import path from "path";
import sharp from "sharp";
import * as tf from "@tensorflow/tfjs";
import "@tensorflow/tfjs-backend-wasm";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore — no bundled types for the node-wasm build; the public API matches face-api.esm.js.
import * as faceapi from "@vladmandic/face-api/dist/face-api.node-wasm.js";

const MODEL_PATH = path.join(process.cwd(), "public", "models");
const MATCH_THRESHOLD = 0.6; // face-api.js / dlib convention: distance < 0.6 ⇒ same person

export interface ServerVerificationResult {
  score: number;
  verified: boolean;
  photoScores: number[];
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

async function detectFace(src: string) {
  const tensor = await loadImageTensor(src);
  try {
    // `tensor` is a valid tf.Tensor3D at runtime (verified against the bundled
    // tfjs backend), but face-api's types reference its own internal copy of
    // the tfjs type declarations, so TS sees it as a structurally distinct type.
    return await faceapi
      .detectSingleFace(tensor as any, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks()
      .withFaceDescriptor();
  } finally {
    tensor.dispose();
  }
}

function distanceToScore(distance: number): number {
  return Math.max(0, Math.min(100, Math.round((1 - distance / 1.2) * 100)));
}

export async function verifySelfieServer(
  selfieSrc: string,
  profilePhotoSrcs: string[]
): Promise<ServerVerificationResult> {
  try {
    await ensureReady();

    const selfieDetection = await detectFace(selfieSrc);
    if (!selfieDetection) {
      return { score: 0, verified: false, photoScores: [], reason: "Aucun visage détecté sur le selfie." };
    }

    const photoScores: number[] = [];
    let bestDistance = Infinity;
    let anyFaceFound = false;

    for (const photoSrc of profilePhotoSrcs) {
      if (!photoSrc) continue;
      try {
        const photoDetection = await detectFace(photoSrc);
        if (!photoDetection) {
          photoScores.push(0);
          continue;
        }
        anyFaceFound = true;
        const distance = faceapi.euclideanDistance(selfieDetection.descriptor, photoDetection.descriptor);
        bestDistance = Math.min(bestDistance, distance);
        photoScores.push(distanceToScore(distance));
      } catch {
        photoScores.push(0);
      }
    }

    if (photoScores.length === 0) {
      return { score: 0, verified: false, photoScores: [], reason: "Aucune photo de profil disponible pour la comparaison." };
    }
    if (!anyFaceFound) {
      return { score: 0, verified: false, photoScores, reason: "Aucun visage détecté sur les photos de profil." };
    }

    const verified = bestDistance <= MATCH_THRESHOLD;
    const score = distanceToScore(bestDistance);
    const reason = verified
      ? "Vérification réussie."
      : "Le visage du selfie ne correspond à aucune des photos de profil.";

    return { score, verified, photoScores, reason };
  } catch (error) {
    return {
      score: 0, verified: false, photoScores: [],
      reason: `Erreur lors de la vérification : ${error instanceof Error ? error.message : "erreur inconnue"}`,
    };
  }
}
