/**
 * Client-side Face Verification — real face detection & recognition.
 *
 * Runs entirely in the browser via face-api.js (TinyFaceDetector for
 * detection, a 68-point landmark net for alignment, and a 128-d face
 * descriptor net — the same dlib-derived recognition model used by most
 * open-source face-recognition tooling). Two photos are considered the same
 * person when the Euclidean distance between their descriptors is below the
 * standard threshold (~0.6).
 *
 * This replaces an earlier color-histogram/perceptual-hash heuristic, which
 * only compared lighting and composition — not faces — and could accept two
 * different people photographed in similar conditions.
 *
 * face-api.js is loaded via a dynamic import (not a static top-level import):
 * its bundled tfjs runtime touches browser-only globals that break Next.js's
 * server-side render pass if evaluated eagerly, and deferring the load also
 * keeps its ~1.3MB bundle out of the initial page load.
 */
type FaceApi = typeof import("@vladmandic/face-api/dist/face-api.esm.js");

const MODEL_URL = "/models";
const MATCH_THRESHOLD = 0.6; // face-api.js / dlib convention: distance < 0.6 ⇒ same person

let loadPromise: Promise<FaceApi> | null = null;

function ensureLoaded(): Promise<FaceApi> {
  if (!loadPromise) {
    loadPromise = (async () => {
      const faceapi = await import("@vladmandic/face-api/dist/face-api.esm.js");
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
      ]);
      return faceapi;
    })();
  }
  return loadPromise;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = src;
  });
}

async function detectFace(faceapi: FaceApi, src: string) {
  const img = await loadImage(src);
  return faceapi
    .detectSingleFace(img, new faceapi.TinyFaceDetectorOptions())
    .withFaceLandmarks()
    .withFaceDescriptor();
}

function distanceToScore(distance: number): number {
  return Math.max(0, Math.min(100, Math.round((1 - distance / 1.2) * 100)));
}

export interface VerificationResult {
  score: number;
  verified: boolean;
  photoScores: number[];
  reason: string;
}

export async function validateSelfieQuality(dataUri: string): Promise<{ valid: boolean; reason: string }> {
  try {
    const faceapi = await ensureLoaded();
    const detection = await detectFace(faceapi, dataUri);
    if (!detection) {
      return { valid: false, reason: "Aucun visage détecté. Veuillez prendre un selfie clair, visage bien visible et centré." };
    }
    return { valid: true, reason: "Selfie valide." };
  } catch {
    return { valid: false, reason: "Impossible d'analyser l'image. Veuillez réessayer." };
  }
}

export async function verifySelfie(
  selfieDataUri: string,
  profilePhotoUrls: string[]
): Promise<VerificationResult> {
  try {
    const faceapi = await ensureLoaded();

    const selfieDetection = await detectFace(faceapi, selfieDataUri);
    if (!selfieDetection) {
      return { score: 0, verified: false, photoScores: [], reason: "Aucun visage détecté sur le selfie." };
    }

    const photoScores: number[] = [];
    let bestDistance = Infinity;
    let anyFaceFound = false;

    for (const photoUrl of profilePhotoUrls) {
      if (!photoUrl) continue;
      try {
        const photoDetection = await detectFace(faceapi, photoUrl);
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
