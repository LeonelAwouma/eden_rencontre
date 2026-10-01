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
 *
 * Règles communes avec le serveur : src/lib/face-rules.ts (chaque photo doit
 * correspondre au selfie). La preuve de présence (rafale tête qui tourne) est
 * jugée par le serveur, qui seul fait foi.
 */
import { PHOTO_MATCH_THRESHOLD, decide, distanceToScore, type PhotoCheck } from "./face-rules";
type FaceApi = typeof import("@vladmandic/face-api/dist/face-api.esm.js");

const MODEL_URL = "/models";

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

const detectorOptions = (faceapi: FaceApi) => new faceapi.TinyFaceDetectorOptions({ inputSize: 512, scoreThreshold: 0.5 });

async function detectFace(faceapi: FaceApi, src: string) {
  const img = await loadImage(src);
  return faceapi
    .detectSingleFace(img, detectorOptions(faceapi))
    .withFaceLandmarks()
    .withFaceDescriptor();
}

/** Visages significatifs de l'image (les visages minuscules à l'arrière-plan sont ignorés). */
async function detectMainFaces(faceapi: FaceApi, src: string) {
  const img = await loadImage(src);
  const faces = await faceapi.detectAllFaces(img, detectorOptions(faceapi)).withFaceLandmarks().withFaceDescriptors();
  const area = (f: (typeof faces)[number]) => f.detection.box.width * f.detection.box.height;
  const sorted = [...faces].sort((a, b) => area(b) - area(a));
  if (!sorted.length) return sorted;
  const biggest = area(sorted[0]);
  return sorted.filter((f) => area(f) >= biggest * 0.2);
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

    const selfieFaces = await detectMainFaces(faceapi, selfieDataUri);
    if (selfieFaces.length === 0) {
      return { score: 0, verified: false, photoScores: [], reason: "Aucun visage détecté sur le selfie." };
    }
    if (selfieFaces.length > 1) {
      return { score: 0, verified: false, photoScores: [], reason: "Plusieurs visages sur le selfie : il doit vous montrer seul(e)." };
    }
    const selfie = selfieFaces[0];

    // Chaque photo de profil doit vous montrer, seul(e), et correspondre au selfie.
    const photos: PhotoCheck[] = [];
    for (const photoUrl of profilePhotoUrls.filter(Boolean)) {
      try {
        const faces = await detectMainFaces(faceapi, photoUrl);
        if (faces.length === 0) { photos.push({ score: 0, issue: "no_face" }); continue; }
        if (faces.length > 1) {
          const best = Math.min(...faces.map((f) => faceapi.euclideanDistance(selfie.descriptor, f.descriptor)));
          photos.push({ score: distanceToScore(best), issue: "several_faces" });
          continue;
        }
        const distance = faceapi.euclideanDistance(selfie.descriptor, faces[0].descriptor);
        photos.push({ score: distanceToScore(distance), issue: distance <= PHOTO_MATCH_THRESHOLD ? null : "mismatch" });
      } catch {
        photos.push({ score: 0, issue: "unreadable" });
      }
    }

    const verdict = decide(photos, null);
    return { ...verdict, photoScores: photos.map((p) => p.score) };
  } catch (error) {
    return {
      score: 0, verified: false, photoScores: [],
      reason: `Erreur lors de la vérification : ${error instanceof Error ? error.message : "erreur inconnue"}`,
    };
  }
}
