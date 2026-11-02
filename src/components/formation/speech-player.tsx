"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { Headphones, LocateFixed, Pause, Play, RotateCcw, RotateCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { alignSpeech, wordAt, type SpeechTranscript } from "@/lib/formation/speech-align";
import { useFormationLocale } from "@/lib/formation/ui";
import { SPEECH_WORD_CLASS } from "./rich-text";

const ACTIVE_CLASS = "speech-on";
const RATES = [1, 1.25, 1.5, 0.75];
/** Bande de l'écran où le mot prononcé reste visible (sous l'en-tête et le lecteur, au-dessus du bas de page). */
const VISIBLE_TOP = 170;
const VISIBLE_BOTTOM = 110;
/**
 * Avance du surlignage (secondes). La reconnaissance vocale annonce le début d'un mot en moyenne 60 ms
 * après le début réel de la voix (mesuré sur la leçon 1.1) : on surligne un peu avant, pour que le mot
 * s'allume quand on commence à l'entendre.
 */
const LEAD = 0.08;

const clock = (s: number) => {
  if (!Number.isFinite(s) || s < 0) return "0:00";
  const m = Math.floor(s / 60);
  return `${m}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
};

/**
 * Lecteur de la version audio d'une leçon. Pendant la lecture, le mot prononcé est surligné dans le
 * texte (les mots sont des <span class="speech-w">, voir rich-text.tsx) et l'écran suit la voix ;
 * un clic sur un mot déplace la lecture à cet endroit.
 *
 * Les mots du texte sont mis en correspondance avec la transcription de l'audio (speech-align.ts) au
 * chargement, sur le texte réellement affiché.
 */
export function SpeechPlayer({ src, transcriptSrc, summary = false, rootRef, title }: {
  src: string;
  /** Transcription horodatée de l'audio (JSON, voir SpeechTranscript). Sans elle : simple lecteur, sans surlignage. */
  transcriptSrc?: string;
  /** L'audio est un résumé raconté et non la lecture du texte. */
  summary?: boolean;
  /** Conteneur du texte dont les mots sont surlignés. */
  rootRef: RefObject<HTMLElement | null>;
  title: string;
}) {
  const { ui } = useFormationLocale();
  const audioRef = useRef<HTMLAudioElement>(null);
  const spansRef = useRef<HTMLElement[]>([]);
  const startsRef = useRef<number[]>([]);
  const curRef = useRef(-1);
  const rafRef = useRef(0);
  const followRef = useRef(true);
  const startedRef = useRef(false);

  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [rate, setRate] = useState(1);
  const [follow, setFollowState] = useState(true);
  const [synced, setSynced] = useState<boolean | null>(null); // null = en préparation
  const [failed, setFailed] = useState(false);

  const setFollow = useCallback((v: boolean) => { followRef.current = v; setFollowState(v); }, []);

  /** Garde le mot prononcé dans la bande visible de l'écran. */
  const reveal = useCallback((el: HTMLElement) => {
    const r = el.getBoundingClientRect();
    if (r.top >= VISIBLE_TOP && r.bottom <= window.innerHeight - VISIBLE_BOTTOM) return;
    window.scrollTo({ top: window.scrollY + r.top - window.innerHeight * 0.36, behavior: "smooth" });
  }, []);

  /** Surligne le mot correspondant à l'instant de lecture. */
  const sync = useCallback((scroll: boolean) => {
    const audio = audioRef.current;
    const spans = spansRef.current;
    if (!audio || !spans.length) return;
    const idx = wordAt(startsRef.current, audio.currentTime + LEAD);
    if (idx === curRef.current) return;
    spans[curRef.current]?.classList.remove(ACTIVE_CLASS);
    curRef.current = idx;
    const el = spans[idx];
    if (el) {
      el.classList.add(ACTIVE_CLASS);
      if (scroll && followRef.current) reveal(el);
    }
  }, [reveal]);

  const clearHighlight = useCallback(() => {
    spansRef.current[curRef.current]?.classList.remove(ACTIVE_CLASS);
    curRef.current = -1;
  }, []);

  // Transcription + mots du texte → instant de chaque mot.
  useEffect(() => {
    let cancelled = false;
    if (!transcriptSrc) { setSynced(false); return; }
    setSynced(null);
    (async () => {
      try {
        const res = await fetch(transcriptSrc);
        if (!res.ok) throw new Error(`transcription ${res.status}`);
        const transcript: SpeechTranscript = await res.json();
        if (cancelled) return;
        const spans = Array.from(rootRef.current?.querySelectorAll<HTMLElement>(`.${SPEECH_WORD_CLASS}`) ?? []);
        if (!spans.length) throw new Error("aucun mot à surligner");
        const { starts, matched, total } = alignSpeech(spans.map((s) => s.textContent || ""), transcript);
        spansRef.current = spans;
        startsRef.current = starts;
        setSynced(matched / total >= 0.6);
        if (matched / total < 0.6) console.warn(`[audio] synchronisation approximative : ${matched}/${total} mots retrouvés`);
      } catch (err) {
        console.warn("[audio] surlignage indisponible :", err);
        if (!cancelled) setSynced(false);
      }
    })();
    return () => { cancelled = true; clearHighlight(); spansRef.current = []; startsRef.current = []; };
  }, [transcriptSrc, rootRef, clearHighlight]);

  // État de l'élément audio.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const loop = () => { sync(true); rafRef.current = requestAnimationFrame(loop); };
    const onPlay = () => { setPlaying(true); startedRef.current = true; cancelAnimationFrame(rafRef.current); rafRef.current = requestAnimationFrame(loop); };
    const onPause = () => { setPlaying(false); cancelAnimationFrame(rafRef.current); sync(false); };
    const onEnded = () => { setPlaying(false); cancelAnimationFrame(rafRef.current); clearHighlight(); };
    const onTime = () => setTime(audio.currentTime);
    const onMeta = () => setDuration(audio.duration);
    const onSeeked = () => { setTime(audio.currentTime); sync(true); };
    const onError = () => setFailed(true);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("loadedmetadata", onMeta);
    audio.addEventListener("durationchange", onMeta);
    audio.addEventListener("seeked", onSeeked);
    audio.addEventListener("error", onError);
    if (audio.readyState >= 1) onMeta();
    return () => {
      cancelAnimationFrame(rafRef.current);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("loadedmetadata", onMeta);
      audio.removeEventListener("durationchange", onMeta);
      audio.removeEventListener("seeked", onSeeked);
      audio.removeEventListener("error", onError);
    };
  }, [sync, clearHighlight]);

  // Faire défiler soi-même la page (molette, doigt) interrompt le suivi automatique du texte.
  useEffect(() => {
    const stop = () => { if (followRef.current && !audioRef.current?.paused) setFollow(false); };
    window.addEventListener("wheel", stop, { passive: true });
    window.addEventListener("touchmove", stop, { passive: true });
    return () => { window.removeEventListener("wheel", stop); window.removeEventListener("touchmove", stop); };
  }, [setFollow]);

  // Un clic sur un mot déplace la lecture à cet endroit (une fois la lecture commencée).
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const onClick = (e: MouseEvent) => {
      const audio = audioRef.current;
      const word = (e.target as HTMLElement).closest?.(`.${SPEECH_WORD_CLASS}`) as HTMLElement | null;
      if (!audio || !word || !startedRef.current) return;
      const i = spansRef.current.indexOf(word);
      if (i < 0) return;
      audio.currentTime = startsRef.current[i];
      setFollow(true);
      void audio.play();
    };
    root.addEventListener("click", onClick);
    return () => root.removeEventListener("click", onClick);
  }, [rootRef, setFollow]);

  // Le curseur sur les mots indique qu'ils sont cliquables dès que la lecture a commencé.
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    if (playing || time > 0) root.setAttribute("data-speech-active", "");
    return () => root.removeAttribute("data-speech-active");
  }, [rootRef, playing, time > 0]); // eslint-disable-line react-hooks/exhaustive-deps

  // Commandes du casque / de l'écran verrouillé.
  useEffect(() => {
    if (!("mediaSession" in navigator)) return;
    navigator.mediaSession.metadata = new MediaMetadata({ title, artist: "Garden of Alliance", album: "Bâtir sur le roc" });
    navigator.mediaSession.setActionHandler("play", () => void audioRef.current?.play());
    navigator.mediaSession.setActionHandler("pause", () => audioRef.current?.pause());
    return () => { navigator.mediaSession.setActionHandler("play", null); navigator.mediaSession.setActionHandler("pause", null); };
  }, [title]);

  const toggle = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) { setFollow(true); void audio.play(); } else audio.pause();
  };
  const skip = (delta: number) => {
    const audio = audioRef.current;
    if (audio) audio.currentTime = Math.min(Math.max(0, audio.currentTime + delta), audio.duration || Infinity);
  };
  const cycleRate = () => {
    const next = RATES[(RATES.indexOf(rate) + 1) % RATES.length];
    setRate(next);
    if (audioRef.current) audioRef.current.playbackRate = next;
  };
  const resumeFollow = () => {
    setFollow(true);
    const el = spansRef.current[curRef.current];
    if (el) window.scrollTo({ top: window.scrollY + el.getBoundingClientRect().top - window.innerHeight * 0.36, behavior: "smooth" });
  };

  const pct = duration ? (time / duration) * 100 : 0;
  const hasHighlight = synced !== false;

  return (
    <div className="sticky top-[76px] z-30 mt-6">
      <div className="rounded-2xl border border-border bg-card/95 backdrop-blur shadow-[0_6px_24px_rgba(38,70,52,0.10)] px-3 py-2.5 sm:px-4 flex items-center gap-2.5 sm:gap-3">
        <button type="button" onClick={toggle} disabled={failed} aria-label={playing ? ui.audioPause : ui.audioPlay}
          className="w-11 h-11 rounded-full bg-primary text-white flex items-center justify-center shrink-0 hover:bg-primary/90 transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2">
          {playing ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 translate-x-px" />}
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2 text-[12px]">
            <span className="inline-flex items-center gap-1.5 font-semibold text-foreground min-w-0">
              <Headphones className="w-3.5 h-3.5 text-primary shrink-0" />
              <span className="truncate">{failed ? ui.audioError : summary ? ui.summaryTitle : ui.listenTitle}</span>
            </span>
            <span className="tabular-nums text-[#56615A] shrink-0">{clock(time)}<span className="hidden sm:inline"> / {clock(duration)}</span></span>
          </div>
          <input type="range" min={0} max={duration || 0} step={0.1} value={Math.min(time, duration || 0)} disabled={!duration || failed}
            aria-label={ui.audioSeek}
            onChange={(e) => { const t = Number(e.target.value); setTime(t); if (audioRef.current) audioRef.current.currentTime = t; }}
            className="mt-1 w-full h-1.5 appearance-none rounded-full cursor-pointer disabled:cursor-default accent-primary"
            style={{ background: `linear-gradient(to right, hsl(var(--primary)) ${pct}%, hsl(var(--muted)) ${pct}%)` }} />
          {!playing && time === 0 && !failed && (summary || hasHighlight) && (
            <p className="mt-1 text-[11.5px] text-[#6B746E] leading-tight">{summary ? ui.summaryHint : ui.listenHint}</p>
          )}
        </div>

        <div className="hidden sm:flex items-center gap-0.5 shrink-0">
          <button type="button" onClick={() => skip(-10)} aria-label={ui.audioBack} title={ui.audioBack}
            className="w-9 h-9 rounded-full flex items-center justify-center text-[#56615A] hover:bg-muted hover:text-foreground transition-colors"><RotateCcw className="w-4 h-4" /></button>
          <button type="button" onClick={() => skip(10)} aria-label={ui.audioForward} title={ui.audioForward}
            className="w-9 h-9 rounded-full flex items-center justify-center text-[#56615A] hover:bg-muted hover:text-foreground transition-colors"><RotateCw className="w-4 h-4" /></button>
        </div>

        <button type="button" onClick={cycleRate} aria-label={`${ui.audioSpeed} : ${rate}×`} title={ui.audioSpeed}
          className="h-8 min-w-[3rem] px-2 rounded-full border border-border text-[12px] font-bold tabular-nums text-[#3F4A43] hover:bg-muted transition-colors shrink-0">{rate}×</button>

        {hasHighlight && (
          <button type="button" onClick={follow ? () => setFollow(false) : resumeFollow}
            aria-pressed={follow} aria-label={follow ? ui.audioFollowOn : ui.audioFollowOff} title={follow ? ui.audioFollowOn : ui.audioFollowOff}
            className={cn("w-9 h-9 rounded-full flex items-center justify-center transition-colors shrink-0",
              follow ? "bg-primary/10 text-primary" : "bg-[#FBF3E8] text-[#6E4A00] ring-1 ring-[#E2C9A6]")}>
            <LocateFixed className="w-4 h-4" />
          </button>
        )}
      </div>
      <audio ref={audioRef} src={src} preload="metadata" />
    </div>
  );
}
