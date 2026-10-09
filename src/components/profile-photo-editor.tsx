"use client";

import { useRef, useState } from "react";
import { Camera, Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AvatarPicker } from "@/components/avatar-picker";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/lib/i18n";
import { updateProfile } from "@/lib/auth";
import { uploadAvatar } from "@/lib/chat";

/**
 * Photo de profil modifiable : téléverser une image ou choisir un avatar illustré.
 * Utilisé sur la page « Mon profil » (/dashboard/profile), où le lien « Profil »
 * de la barre latérale mène — elle n'offrait jusque-là aucun moyen de changer la photo.
 */
export function ProfilePhotoEditor({ userId, name, gender, avatarUrl, onUpdated }: {
  userId: string;
  name?: string | null;
  gender?: string | null;
  avatarUrl?: string | null;
  onUpdated: (url: string) => void;
}) {
  const { t } = useI18n();
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [picked, setPicked] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const save = async (url: string) => {
    const res = await updateProfile({ avatar_url: url });
    if (!res.ok) { toast({ title: t("dashboard.toastFailed"), description: res.error, variant: "destructive" }); return false; }
    onUpdated(url);
    toast({ title: t("dashboard.toastPhotoUpdated") });
    return true;
  };

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast({ title: t("dashboard.toastUnsupportedFormat"), variant: "destructive" }); return; }
    if (file.size > 5 * 1024 * 1024) { toast({ title: t("dashboard.toastImageTooLarge"), variant: "destructive" }); return; }
    setUploading(true);
    try {
      const up = await uploadAvatar(file, userId);
      if (up.error || !up.url) { toast({ title: t("dashboard.toastFailed"), description: up.error || t("dashboard.toastPleaseRetry"), variant: "destructive" }); return; }
      await save(up.url);
    } finally { setUploading(false); }
  };

  const confirmAvatar = async () => {
    if (!picked) return;
    setSaving(true);
    try { if (await save(picked)) setShowPicker(false); } finally { setSaving(false); }
  };

  const initial = (name || "?").trim().charAt(0).toUpperCase();

  return (
    <div className="flex flex-col items-center gap-3 shrink-0">
      <div className="w-24 h-24 rounded-full overflow-hidden border-[3px] border-[#E8E5E0] bg-[#EEF5EC] flex items-center justify-center shadow-md">
        {avatarUrl
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={avatarUrl} alt={name || ""} className="w-full h-full object-cover" />
          : <span className="text-3xl font-bold text-[#486B46]">{initial}</span>}
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        <button type="button" onClick={() => inputRef.current?.click()} disabled={uploading}
          className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-semibold text-white bg-[#486B46] hover:bg-[#3A5A38] disabled:opacity-60">
          {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
          {t("profilePhoto.changePhoto")}
        </button>
        <button type="button" onClick={() => { setPicked(avatarUrl || null); setShowPicker(true); }}
          className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-semibold text-[#486B46] bg-[#EEF5EC] border border-[#C6D4C0] hover:bg-[#E0EEDC]">
          <Sparkles className="w-3.5 h-3.5" /> {t("profilePhoto.chooseAvatar")}
        </button>
      </div>
      <input ref={inputRef} type="file" accept="image/*" className="hidden"
        onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = ""; }} />

      {showPicker && (
        <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-5" role="dialog" aria-modal="true">
          <div className="w-full max-w-lg bg-white rounded-2xl p-6 sm:p-8 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div>
              <h2 className="text-xl font-bold text-[#2F2F2F]">{t("dashboard.chooseAvatarTitle")}</h2>
              <p className="text-sm text-[#777777] mt-1">{t("dashboard.chooseAvatarDesc")}</p>
            </div>
            <AvatarPicker gender={gender} value={picked} onChange={setPicked} />
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setShowPicker(false)} disabled={saving} className="flex-1 h-12 rounded-xl">
                {t("dashboard.avatarPickerCancel")}
              </Button>
              <Button onClick={confirmAvatar} disabled={saving || !picked} className="flex-1 h-12 bg-primary text-primary-foreground font-bold rounded-xl">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : t("dashboard.avatarPickerConfirm")}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
