"use client";

import { createContext, Fragment, useContext } from "react";

/**
 * Espaces insécables de la typographie française : « » : ; ? ! ne restent jamais seuls en début de ligne.
 * Écrits en échappements (\u00a0 : espace insécable, \u202f : espace fine insécable) : ces caractères
 * sont invisibles et se perdent à la moindre copie du fichier.
 */
export const frenchSpacing = (s: string) =>
  s.replace(/« /g, "«\u00a0").replace(/ »/g, "\u00a0»").replace(/ ([:;?!])/g, "\u202f$1");

/**
 * Surlignage de la lecture audio : quand il est actif (leçon avec version audio), chaque mot du
 * texte est enveloppé dans un <span class="speech-w">. Le lecteur audio retrouve ces mots dans
 * l'ordre du document, les met en correspondance avec la transcription et surligne le mot
 * prononcé (voir speech-player.tsx). Désactivé, le texte est rendu exactement comme avant.
 */
const SpeechWordsContext = createContext(false);
export const SpeechWordsProvider = SpeechWordsContext.Provider;
export const SPEECH_WORD_CLASS = "speech-w";

/** Un « mot » du surlignage contient au moins une lettre ou un chiffre : « — » ou « » » n'en sont pas. */
const HAS_WORD_CHAR = /[\p{L}\p{N}]/u;

/** Texte brut, mot par mot si le surlignage audio est actif. */
export function Words({ text }: { text: string }) {
  const speech = useContext(SpeechWordsContext);
  const spaced = frenchSpacing(text);
  if (!speech) return <>{spaced}</>;
  return (
    <>
      {spaced.split(/(\s+)/).map((piece, i) =>
        piece && !/^\s+$/.test(piece) && HAS_WORD_CHAR.test(piece)
          ? <span key={i} className={SPEECH_WORD_CLASS}>{piece}</span>
          : <Fragment key={i}>{piece}</Fragment>
      )}
    </>
  );
}

/** Rend les marques en ligne du contenu de formation : **gras** et *italique*. */
export function RichText({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g).filter(Boolean);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return <strong key={i} className="font-semibold text-foreground"><Words text={part.slice(2, -2)} /></strong>;
        }
        if (part.startsWith("*") && part.endsWith("*") && part.length > 2) {
          return <em key={i}><Words text={part.slice(1, -1)} /></em>;
        }
        return <Words key={i} text={part} />;
      })}
    </>
  );
}
