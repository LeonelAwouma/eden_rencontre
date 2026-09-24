"use client";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, CalendarClock, Loader2, Lock, RefreshCw, Video } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Monogram } from "@/components/ornaments";
import { MemberGate } from "@/components/member-gate";
import { JitsiRoom, type JitsiJoin } from "@/components/jitsi-room";

interface MeetInfo { id: string; title: string; description: string | null; start_time: string; duration: number }
type RoomState =
  | { kind: "loading" }
  | { kind: "ready"; meet: MeetInfo; join: JitsiJoin }
  | { kind: "blocked"; code: string; message: string; meet?: MeetInfo };

const formatWhen = (iso: string) =>
  new Date(iso).toLocaleString("fr-FR", { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });

/**
 * Page par laquelle un membre invité rejoint une visioconférence.
 * Le lien de l'e-mail d'invitation pointe ici ; la salle ne s'ouvre qu'aux
 * membres connectés et invités, dans le créneau de la réunion.
 */
function ReunionPageContent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [state, setState] = useState<RoomState>({ kind: "loading" });
  const [left, setLeft] = useState(false);

  const load = useCallback(async () => {
    setState({ kind: "loading" });
    const token = supabase ? (await supabase.auth.getSession()).data.session?.access_token : null;
    if (!token) {
      router.replace(`/login?next=${encodeURIComponent(`/reunion/${id}`)}`);
      return;
    }
    try {
      const res = await fetch(`/api/meets/${id}/salle`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (res.status === 401) { router.replace(`/login?next=${encodeURIComponent(`/reunion/${id}`)}`); return; }
      if (!res.ok) setState({ kind: "blocked", code: data.code || "error", message: data.error || "Impossible d'ouvrir la salle.", meet: data.meet });
      else setState({ kind: "ready", meet: data.meet, join: data });
    } catch {
      setState({ kind: "blocked", code: "error", message: "Connexion impossible. Vérifiez votre réseau puis réessayez." });
    }
  }, [id, router]);

  useEffect(() => { load(); }, [load]);

  const meet = state.kind === "ready" || state.kind === "blocked" ? state.meet : undefined;

  return (
    <div className="eden-public min-h-dvh flex flex-col bg-background text-foreground">
      <header className="h-14 shrink-0 flex items-center justify-between gap-3 px-4 sm:px-6 border-b border-border bg-background">
        <Link href="/dashboard" className="flex items-center gap-2 min-w-0 text-[14px] font-semibold hover:text-primary">
          <ArrowLeft className="w-4 h-4 shrink-0" />
          <Monogram className="w-7 h-6 text-primary shrink-0 hidden sm:block" />
          <span className="truncate">{meet?.title || "Visioconférence"}</span>
        </Link>
        {meet && <span className="hidden sm:block text-[13px] text-[#56615A] first-letter:uppercase">{formatWhen(meet.start_time)}</span>}
      </header>

      <main className="flex-1 flex">
        {state.kind === "loading" && (
          <div className="flex-1 flex items-center justify-center gap-2 text-[14px] text-[#56615A]">
            <Loader2 className="w-5 h-5 animate-spin text-primary" /> Préparation de la salle…
          </div>
        )}

        {state.kind === "ready" && !left && (
          <div className="flex-1 min-h-[calc(100dvh-3.5rem)]">
            <JitsiRoom join={state.join} subject={state.meet.title} onLeave={() => setLeft(true)} />
          </div>
        )}

        {state.kind === "ready" && left && (
          <Notice icon={<Video className="w-6 h-6" />} title="Vous avez quitté la réunion"
            text="Vous pouvez la rejoindre de nouveau tant qu'elle est en cours.">
            <button onClick={() => { setLeft(false); load(); }} className="h-10 px-5 rounded-full bg-primary text-white text-[14px] font-semibold hover:bg-primary/90">Rejoindre de nouveau</button>
            <Link href="/dashboard" className="h-10 px-5 inline-flex items-center rounded-full text-[14px] font-semibold text-primary hover:bg-primary/10">Retour à mon espace</Link>
          </Notice>
        )}

        {state.kind === "blocked" && (
          <Notice
            icon={state.code === "too_early" ? <CalendarClock className="w-6 h-6" /> : <Lock className="w-6 h-6" />}
            title={state.code === "too_early" ? "La réunion n'a pas encore commencé" : state.message}
            text={state.code === "too_early" && meet
              ? `Elle est prévue ${formatWhen(meet.start_time)}. ${state.message}`
              : state.code === "not_invited" ? "Si vous pensez qu'il s'agit d'une erreur, répondez à l'e-mail d'invitation." : ""}>
            {state.code === "too_early" && (
              <button onClick={load} className="h-10 px-5 inline-flex items-center gap-2 rounded-full border border-border text-[14px] font-semibold hover:bg-muted">
                <RefreshCw className="w-4 h-4" /> Vérifier de nouveau
              </button>
            )}
            <Link href="/dashboard" className="h-10 px-5 inline-flex items-center rounded-full text-[14px] font-semibold text-primary hover:bg-primary/10">Retour à mon espace</Link>
          </Notice>
        )}
      </main>
    </div>
  );
}

function Notice({ icon, title, text, children }: { icon: React.ReactNode; title: string; text?: string; children?: React.ReactNode }) {
  return (
    <div className="flex-1 flex items-center justify-center px-6 py-16">
      <div className="max-w-md text-center">
        <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-primary/10 text-primary flex items-center justify-center">{icon}</div>
        <h1 className="font-headline text-[24px] font-bold leading-tight">{title}</h1>
        {text && <p className="mt-2 text-[15px] text-[#56615A] first-letter:uppercase">{text}</p>}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">{children}</div>
      </div>
    </div>
  );
}

/** Réservé aux comptes approuvés par l'admin. */
export default function ReunionPage({ params }: { params: Promise<{ id: string }> }) {
  return <MemberGate><ReunionPageContent params={params} /></MemberGate>;
}
