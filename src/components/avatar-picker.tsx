"use client";

import { useMemo, useState } from "react";
import { RefreshCw, Check } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { AVATAR_STYLES, generateAvatarDataUri, randomAvatarSeed, type AvatarStyle } from "@/lib/avatar";

const GRID_SIZE = 6;

interface AvatarPickerProps {
  photos?: (string | null)[];
  value: string | null;
  onChange: (value: string) => void;
  seedBase?: string;
}

export function AvatarPicker({ photos, value, onChange, seedBase }: AvatarPickerProps) {
  const { t } = useI18n();
  const [style, setStyle] = useState<AvatarStyle>("personas");
  const [seeds, setSeeds] = useState<string[]>(() =>
    Array.from({ length: GRID_SIZE }, (_, i) => (seedBase ? `${seedBase}-${i}` : randomAvatarSeed()))
  );

  const avatars = useMemo(
    () => seeds.map((seed) => ({ seed, uri: generateAvatarDataUri(style, seed) })),
    [seeds, style]
  );

  const regenerate = () => setSeeds(Array.from({ length: GRID_SIZE }, () => randomAvatarSeed()));

  const myPhotos = (photos || []).filter((p): p is string => !!p);

  return (
    <div className="space-y-5">
      {myPhotos.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "#486B46" }}>{t("avatarPicker.myPhotosLabel")}</p>
          <div className="flex gap-3 flex-wrap">
            {myPhotos.map((photo, i) => (
              <button key={i} type="button" onClick={() => onChange(photo)}
                className="relative w-16 h-16 rounded-xl overflow-hidden transition-all"
                style={{ border: value === photo ? "3px solid #486B46" : "1px solid #E8E5E0" }}>
                <img src={photo} alt="" className="w-full h-full object-cover" />
                {value === photo && (
                  <span className="absolute inset-0 flex items-center justify-center" style={{ background: "rgba(72,107,70,0.35)" }}>
                    <Check className="w-6 h-6 text-white" />
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "#486B46" }}>{t("avatarPicker.generatedLabel")}</p>
          <button type="button" onClick={regenerate}
            className="flex items-center gap-1.5 text-xs font-bold" style={{ color: "#486B46" }}>
            <RefreshCw className="w-3.5 h-3.5" /> {t("avatarPicker.regenerate")}
          </button>
        </div>

        <div className="flex gap-2">
          {AVATAR_STYLES.map((s) => (
            <button key={s.id} type="button" onClick={() => setStyle(s.id)}
              className="h-8 px-3 rounded-lg text-xs font-bold transition-colors"
              style={style === s.id
                ? { background: "#486B46", color: "#FFFFFF" }
                : { background: "#EEF5EC", color: "#486B46" }}>
              {s.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
          {avatars.map(({ seed, uri }) => (
            <button key={seed} type="button" onClick={() => onChange(uri)}
              className="relative aspect-square rounded-xl overflow-hidden transition-all"
              style={{ border: value === uri ? "3px solid #486B46" : "1px solid #E8E5E0", background: "#FAF9F6" }}>
              <img src={uri} alt="" className="w-full h-full object-cover" />
              {value === uri && (
                <span className="absolute inset-0 flex items-center justify-center" style={{ background: "rgba(72,107,70,0.35)" }}>
                  <Check className="w-6 h-6 text-white" />
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
