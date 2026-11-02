#!/usr/bin/env python3
"""
Transcription horodatée de la version audio d'une leçon, pour le surlignage mot à mot.

    py -3.11 scripts/transcribe-lesson-audio.py public/formation/batir-sur-le-roc/audio/lecon-1-4-xxx.mp3

Écrit `lecon-1-4-xxx.json` à côté du fichier audio : { "d": durée, "w": [mots], "s": [débuts], "e": [fins] }
(secondes). Ce fichier est lu par le lecteur audio (src/components/formation/speech-player.tsx), qui
le met en correspondance avec le texte affiché (src/lib/formation/speech-align.ts) : il n'est donc pas
nécessaire de le régénérer quand on corrige une faute dans le texte, seulement si l'audio change.

Branchement : ajouter à la leçon, dans src/lib/formation/batir-sur-le-roc.ts,
    audio: { src: `${BASE}/audio/lecon-1-4-xxx.mp3`, transcript: `${BASE}/audio/lecon-1-4-xxx.json` },

Prérequis : Python 3.11 avec `faster-whisper` (pip install faster-whisper). Le modèle « medium »
(~1,5 Go) est téléchargé au premier lancement ; compter environ 2 s de calcul par seconde d'audio sur
processeur.
"""
import json
import sys
import time
from pathlib import Path

from faster_whisper import WhisperModel


def main() -> None:
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    audio = Path(sys.argv[1])
    out = audio.with_suffix(".json")
    started = time.time()

    model = WhisperModel("medium", device="cpu", compute_type="int8", cpu_threads=8)
    segments, info = model.transcribe(
        str(audio),
        language="fr",
        word_timestamps=True,
        beam_size=5,
        condition_on_previous_text=False,  # évite la dérive et les répétitions d'un segment à l'autre
        vad_filter=False,
    )

    words, starts, ends = [], [], []
    for segment in segments:
        for w in segment.words or []:
            token = w.word.strip()
            if not token:
                continue
            # La reconnaissance coupe « l'amour » en « l » + « 'amour » : un morceau qui commence par une
            # apostrophe ou un trait d'union est recollé au mot précédent (« l'amour », « lui-même »).
            if words and token[0] in "'’-":
                words[-1] += token
                ends[-1] = round(w.end, 2)
                continue
            words.append(token)
            starts.append(round(w.start, 2))
            ends.append(round(w.end, 2))
        print(f"  {segment.end:7.1f}s / {info.duration:.1f}s ({len(words)} mots)", flush=True)

    out.write_text(
        json.dumps({"d": round(info.duration, 2), "w": words, "s": starts, "e": ends}, ensure_ascii=False, separators=(",", ":")),
        encoding="utf-8",
    )
    print(f"OK {out} — {len(words)} mots, {time.time() - started:.0f} s de calcul")


if __name__ == "__main__":
    main()
