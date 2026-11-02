"use client";

import { useEffect, useRef, useState } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useI18n } from "@/lib/i18n";
import { preparePhoto } from "@/lib/image-compress";

/**
 * Galerie des photos de profil (1 à 3) — ajout des 2 photos facultatives
 * laissées de côté à l'inscription simplifiée (une seule y est désormais
 * demandée). Nouvelle fonctionnalité : /api/profile/photos.
 */
export function ProfilePhotoGallery({ initialCount }: { initialCount: number }) {
  const { t } = useI18n();
  const [urls, setUrls] = useState<string[]>([]);
  const [count, setCount] = useState(initialCount);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const authHeader = async (): Promise<Record<string, string>> => {
    const { data } = (await supabase?.auth.getSession()) ?? { data: { session: null } };
    const token = data.session?.access_token;
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/profile/photos", { headers: await authHeader() });
      if (res.ok) {
        const data = await res.json();
        setUrls(data.urls || []);
        setCount(data.count ?? 0);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    setUploading(true);
    try {
      const prepared = await preparePhoto(file);
      if (!prepared.ok) {
        setError(t(prepared.reason === "heic" ? "camera.photoHeic" : "camera.photoUnsupported"));
        return;
      }
      const headers = await authHeader();
      const slotRes = await fetch("/api/profile/photos", { method: "POST", headers });
      const slot = await slotRes.json();
      if (!slotRes.ok) { setError(slot.error || t("dashboard.toastFailed")); return; }

      const blob = await (await fetch(prepared.dataUrl)).blob();
      const { error: upErr } = await (supabase!.storage.from("registration-media") as any).uploadToSignedUrl(slot.path, slot.token, blob, { contentType: "image/jpeg" });
      if (upErr) { setError(t("dashboard.toastFailed")); return; }

      const confirmRes = await fetch("/api/profile/photos", {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify({ path: slot.path }),
      });
      const confirmed = await confirmRes.json();
      if (!confirmRes.ok) { setError(confirmed.error || t("dashboard.toastFailed")); return; }
      await load();
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <h4 className="text-xs font-bold text-[#486B46] uppercase tracking-wider mb-3">{t("profilePage.photosGalleryTitle")}</h4>
      <p className="text-xs text-[#777777] mb-3">{t("profilePage.photosGalleryDesc")}</p>
      <div className="flex gap-3">
        {loading ? (
          <Loader2 className="w-5 h-5 animate-spin text-[#486B46]" />
        ) : (
          <>
            {urls.map((url) => (
              <img key={url} src={url} alt="" className="w-20 h-28 object-cover rounded-xl border border-[#E0DDD8]" />
            ))}
            {count < 3 && (
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                disabled={uploading}
                className="w-20 h-28 rounded-xl border-2 border-dashed border-[#E0DDD8] flex items-center justify-center text-[#777777] hover:border-[#486B46] hover:text-[#486B46] transition-colors disabled:opacity-50"
              >
                {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ImagePlus className="w-5 h-5" />}
              </button>
            )}
          </>
        )}
      </div>
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { void onFile(e.target.files?.[0]); e.target.value = ""; }} />
      {error && (
        <p role="alert" className="mt-2 text-xs text-red-600 flex items-center gap-1">
          <X size={12} /> {error}
        </p>
      )}
    </div>
  );
}
