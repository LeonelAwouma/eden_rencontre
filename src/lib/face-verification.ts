/**
 * Local Face Verification — Canvas-based image comparison
 *
 * Compares a selfie image against profile photos using:
 * 1. Color histogram comparison (RGB distribution)
 * 2. Structural similarity via perceptual hashing (dHash)
 * 3. Skin-tone region analysis
 *
 * All processing happens locally in the browser using the Canvas API.
 */

export interface VerificationResult {
  score: number;
  verified: boolean;
  photoScores: number[];
  reason: string;
}

const VERIFICATION_THRESHOLD = 35;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = src;
  });
}

function getImagePixelData(img: HTMLImageElement, size: number = 64) {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not get 2D context");
  ctx.drawImage(img, 0, 0, size, size);
  const imageData = ctx.getImageData(0, 0, size, size);
  return { data: imageData.data, width: size, height: size };
}

// ── Color Histogram ──────────────────────────────────────────

function computeColorHistogram(data: Uint8ClampedArray, width: number, height: number): number[] {
  const bins = 8;
  const binSize = 256 / bins;
  const histogram = new Array(bins * 3).fill(0);
  const totalPixels = width * height;
  for (let i = 0; i < data.length; i += 4) {
    const rBin = Math.min(Math.floor(data[i] / binSize), bins - 1);
    const gBin = Math.min(Math.floor(data[i + 1] / binSize), bins - 1);
    const bBin = Math.min(Math.floor(data[i + 2] / binSize), bins - 1);
    histogram[rBin]++;
    histogram[bins + gBin]++;
    histogram[bins * 2 + bBin]++;
  }
  return histogram.map((v) => v / totalPixels);
}

function compareHistograms(h1: number[], h2: number[]): number {
  let intersection = 0;
  for (let i = 0; i < h1.length; i++) {
    intersection += Math.min(h1[i], h2[i]);
  }
  return intersection;
}

// ── Perceptual Hashing (dHash) ───────────────────────────────

function computeDHash(data: Uint8ClampedArray, width: number, height: number): bigint {
  const hashWidth = 9;
  const hashHeight = 8;
  const grayscale: number[] = [];
  for (let y = 0; y < hashHeight; y++) {
    for (let x = 0; x < hashWidth; x++) {
      const srcX = Math.floor((x / hashWidth) * width);
      const srcY = Math.floor((y / hashHeight) * height);
      const idx = (srcY * width + srcX) * 4;
      const gray = data[idx] * 0.299 + data[idx + 1] * 0.587 + data[idx + 2] * 0.114;
      grayscale.push(gray);
    }
  }
  let hash = BigInt(0);
  for (let y = 0; y < hashHeight; y++) {
    for (let x = 0; x < hashWidth - 1; x++) {
      const idx = y * hashWidth + x;
      if (grayscale[idx] < grayscale[idx + 1]) {
        hash |= BigInt(1) << BigInt(y * (hashWidth - 1) + x);
      }
    }
  }
  return hash;
}

function hammingDistance(hash1: bigint, hash2: bigint): number {
  let xor = hash1 ^ hash2;
  let count = 0;
  while (xor > BigInt(0)) {
    count += Number(xor & BigInt(1));
    xor >>= BigInt(1);
  }
  return count;
}

function compareDHash(hash1: bigint, hash2: bigint): number {
  const distance = hammingDistance(hash1, hash2);
  return 1 - distance / 64;
}

// ── Skin Tone Analysis ───────────────────────────────────────

function estimateSkinRatio(data: Uint8ClampedArray): number {
  let skinPixels = 0;
  const totalPixels = data.length / 4;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const y = 0.299 * r + 0.587 * g + 0.114 * b;
    const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
    const cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;
    if (y > 40 && cb > 75 && cb < 135 && cr > 130 && cr < 180 &&
        r > 60 && g > 40 && b > 20 && r > g && r > b && Math.abs(r - g) > 10) {
      skinPixels++;
    }
  }
  return skinPixels / totalPixels;
}

function compareSkinTone(data1: Uint8ClampedArray, data2: Uint8ClampedArray): number {
  const ratio1 = estimateSkinRatio(data1);
  const ratio2 = estimateSkinRatio(data2);
  return Math.max(0, 1 - Math.abs(ratio1 - ratio2) * 3);
}

// ── Main Verification ────────────────────────────────────────

export async function verifySelfie(
  selfieDataUri: string,
  profilePhotoUrls: string[]
): Promise<VerificationResult> {
  try {
    const selfieImg = await loadImage(selfieDataUri);
    const selfiePx = getImagePixelData(selfieImg);
    const selfieHist = computeColorHistogram(selfiePx.data, selfiePx.width, selfiePx.height);
    const selfieHash = computeDHash(selfiePx.data, selfiePx.width, selfiePx.height);

    const photoScores: number[] = [];

    for (const photoUrl of profilePhotoUrls) {
      if (!photoUrl) continue;
      try {
        const profileImg = await loadImage(photoUrl);
        const profilePx = getImagePixelData(profileImg);
        const profileHist = computeColorHistogram(profilePx.data, profilePx.width, profilePx.height);
        const profileHash = computeDHash(profilePx.data, profilePx.width, profilePx.height);

        const histScore = compareHistograms(selfieHist, profileHist);
        const hashScore = compareDHash(selfieHash, profileHash);
        const skinScore = compareSkinTone(selfiePx.data, profilePx.data);

        // Weights: histogram 35%, hash 40%, skin 25%
        const combined = histScore * 0.35 + hashScore * 0.40 + skinScore * 0.25;
        photoScores.push(Math.round(combined * 100));
      } catch {
        photoScores.push(0);
      }
    }

    const bestScore = photoScores.length > 0 ? Math.max(...photoScores) : 0;
    const avgScore = photoScores.length > 0
      ? Math.round(photoScores.reduce((a, b) => a + b, 0) / photoScores.length)
      : 0;
    const finalScore = Math.round(bestScore * 0.6 + avgScore * 0.4);
    const verified = finalScore >= VERIFICATION_THRESHOLD;

    let reason: string;
    if (photoScores.length === 0) {
      reason = "Aucune photo de profil disponible pour la comparaison.";
    } else if (verified) {
      reason = "Vérification réussie.";
    } else {
      reason = "Les photos ne semblent pas correspondre. Veuillez utiliser des photos récentes et un selfie clair.";
    }

    return { score: finalScore, verified, photoScores, reason };
  } catch (error) {
    return {
      score: 0, verified: false, photoScores: [],
      reason: `Erreur lors de la vérification : ${error instanceof Error ? error.message : "erreur inconnue"}`,
    };
  }
}

export async function validateSelfieQuality(dataUri: string): Promise<{ valid: boolean; reason: string }> {
  try {
    const img = await loadImage(dataUri);
    const pixels = getImagePixelData(img, 128);
    const skinRatio = estimateSkinRatio(pixels.data);

    if (skinRatio < 0.05) {
      return { valid: false, reason: "Aucun visage détecté. Veuillez prendre un selfie clair." };
    }

    let totalBrightness = 0;
    const totalPixels = pixels.data.length / 4;
    for (let i = 0; i < pixels.data.length; i += 4) {
      totalBrightness += (pixels.data[i] + pixels.data[i + 1] + pixels.data[i + 2]) / 3;
    }
    const avgBrightness = totalBrightness / totalPixels;

    if (avgBrightness < 30) {
      return { valid: false, reason: "L'image est trop sombre. Veuillez prendre le selfie dans un endroit bien éclairé." };
    }
    if (avgBrightness > 240) {
      return { valid: false, reason: "L'image est surexposée. Veuillez ajuster l'éclairage." };
    }

    return { valid: true, reason: "Selfie valide." };
  } catch {
    return { valid: false, reason: "Impossible de lire l'image. Veuillez réessayer." };
  }
}


