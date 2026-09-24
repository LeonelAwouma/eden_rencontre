"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, AlertCircle, ShieldCheck } from "lucide-react";
import { JitsiRoom, type JitsiJoin } from "@/components/jitsi-room";

interface RoomResponse extends JitsiJoin {
  meet: { id: string; title: string; start_time: string; duration: number; status: string };
}

export default function AdminMeetRoomPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [room, setRoom] = useState<RoomResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/admin/meets/${id}/salle`)
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) setError(d.error || "Impossible d'ouvrir la salle.");
        else setRoom(d);
      })
      .catch(() => setError("Impossible d'ouvrir la salle."));
  }, [id]);

  const when = room ? new Date(room.meet.start_time).toLocaleString("fr-FR", {
    weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit",
  }) : "";

  return (
    <div className="flex flex-col h-[calc(100dvh-7.5rem)] min-h-[520px]">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="min-w-0">
          <Link href="/admin/meets" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary mb-1">
            <ArrowLeft className="w-4 h-4" /> Visioconférences
          </Link>
          <h1 className="text-xl font-bold text-foreground truncate">{room?.meet.title || "Salle de visioconférence"}</h1>
          {room && <p className="text-[13px] text-[#56615A] first-letter:uppercase">{when} · {room.meet.duration} min</p>}
        </div>
        <span className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full bg-[#EEF5EC] text-[12px] font-semibold text-[#2E4A36]">
          <ShieldCheck className="w-4 h-4" /> Vous êtes modérateur
        </span>
      </div>

      <div className="flex-1 rounded-2xl overflow-hidden border border-border">
        {error ? (
          <div className="h-full flex flex-col items-center justify-center gap-3 bg-white text-center px-6">
            <AlertCircle className="w-7 h-7 text-[#B42318]" />
            <p className="text-[15px] font-semibold text-foreground">{error}</p>
            <Link href="/admin/meets" className="text-[13px] font-semibold text-primary hover:underline">Retour aux visioconférences</Link>
          </div>
        ) : !room ? (
          <div className="h-full flex items-center justify-center gap-2 bg-white text-[13px] text-[#56615A]">
            <Loader2 className="w-5 h-5 animate-spin text-primary" /> Préparation de la salle…
          </div>
        ) : (
          <JitsiRoom join={room} subject={room.meet.title} displayName="Équipe Garden of Alliance"
            onLeave={() => router.push("/admin/meets")} />
        )}
      </div>
    </div>
  );
}
