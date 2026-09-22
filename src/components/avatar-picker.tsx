"use client";

import { useMemo, useState } from "react";
import { RefreshCw, Check } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { buildAvatarUrl, randomAvatarSeed } from "@/lib/avatar";

const GRID_SIZE = 6;

interface AvatarPickerProps {
  photos?: (string | null)[];
  value: string | null;
  onChange: (value: string) => void;
}

export function AvatarPicker({ photos, value, onChange }: AvatarPickerProps) {
  const { t } = useI18n();
  // Graines toujours aléatoires : la graine part chez DiceBear et reste inscrite
  // dans l'URL de l'avatar public. Elle ne doit jamais dériver du pseudo, du nom
  // ou de l'e-mail du membre.
  const [seeds, setSeeds] = useState<string[]>(() =>
    Array.from({ length: GRID_SIZE }, () => randomAvatarSeed())
  );

  const avatars = useMemo(
    () => seeds.map((seed) => ({ seed, uri: buildAvatarUrl(seed) })),
    [seeds]
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
