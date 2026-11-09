import { NextRequest, NextResponse } from "next/server";
import { withActiveCoach } from "@/lib/coach/api";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { findLesson } from "@/lib/formation/batir-sur-le-roc";
import { FORMATION_BUCKET } from "@/lib/formation/media";
import { isAcademieSlug, parseRange, storagePathOf } from "@/lib/coach/academie";

/**
 * GET /api/coach/academie/audio/[slug]?kind=audio|transcript — diffusion protégée de l'audio d'une leçon.
 *
 * - Coach ACTIF exigé (cookie de session HttpOnly, lisible par une balise <audio>) ; sinon 403, sans indice.
 * - Le fichier est cherché dans le bucket PRIVÉ `formation-media` avec la clé service côté serveur ; aucune URL
 *   permanente ni signée n'est jamais donnée au navigateur. Tant que le fichier n'y a pas été téléversé, repli
 *   sur l'ancien emplacement public, lu côté serveur (le coach n'en reçoit pas l'adresse).
 * - Prise en charge des requêtes partielles (Range → 206) pour la lecture et le déplacement dans l'audio.
 * - Jamais de cache partagé ; contenu servi « inline », sans nom de fichier de téléchargement.
 * Dissuasion, pas garantie : un audio diffusé à l'écran reste enregistrable par des moyens externes.
 */
const HEADERS = {
  "Cache-Control": "private, no-store",
  "X-Content-Type-Options": "nosniff",
  "Content-Disposition": "inline",
  "Accept-Ranges": "bytes",
} as const;

const plain = (status: number, message: string) =>
  new NextResponse(message, { status, headers: { "Cache-Control": "private, no-store", "Content-Type": "text/plain; charset=utf-8" } });

export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  return withActiveCoach(req, async () => {
    const { slug } = await params;
    if (!isAcademieSlug(slug)) return plain(404, "Introuvable");
    const kind = req.nextUrl.searchParams.get("kind") === "transcript" ? "transcript" : "audio";
    const lesson = findLesson(slug)?.lesson;
    const publicPath = kind === "transcript" ? lesson?.audio?.transcript : lesson?.audio?.src;
    const path = storagePathOf(publicPath);
    if (!path) return plain(404, "Audio indisponible");

    const contentType = kind === "transcript" ? "application/json; charset=utf-8" : "audio/mpeg";
    let bytes: Buffer | null = null;
    try {
      const { data, error } = await getSupabaseAdmin().storage.from(FORMATION_BUCKET).download(path);
      if (!error && data) bytes = Buffer.from(await data.arrayBuffer());
    } catch { /* repli ci-dessous */ }
    if (!bytes && publicPath) {
      try {
        const res = await fetch(new URL(publicPath, req.nextUrl.origin), { cache: "no-store" });
        if (res.ok) bytes = Buffer.from(await res.arrayBuffer());
      } catch { /* indisponible */ }
    }
    if (!bytes) return plain(404, "Audio indisponible");

    const range = parseRange(req.headers.get("range"), bytes.length);
    if (range === "invalid") {
      return new NextResponse(null, { status: 416, headers: { ...HEADERS, "Content-Range": `bytes */${bytes.length}` } });
    }
    if (range) {
      const chunk = bytes.subarray(range.start, range.end + 1);
      return new NextResponse(new Uint8Array(chunk), {
        status: 206,
        headers: { ...HEADERS, "Content-Type": contentType, "Content-Length": String(chunk.length), "Content-Range": `bytes ${range.start}-${range.end}/${bytes.length}` },
      });
    }
    return new NextResponse(new Uint8Array(bytes), {
      status: 200,
      headers: { ...HEADERS, "Content-Type": contentType, "Content-Length": String(bytes.length) },
    });
  });
}
