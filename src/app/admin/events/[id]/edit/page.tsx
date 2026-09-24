"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { CalendarX2 } from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { EventForm, type EventFormInitial, type EventMember } from "@/components/admin/event-form";

export default function EditEventPage() {
  const params = useParams();
  const eventId = params.id as string;
  const [initial, setInitial] = useState<EventFormInitial | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/admin/events/${eventId}`)
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (!res.ok || !data.event) { setError(data.error || "Événement introuvable."); return; }
        const ev = data.event;
        const participants: EventMember[] = (ev.event_participants || [])
          .map((p: { user: EventMember | null }) => p.user)
          .filter(Boolean);
        setInitial({ ...ev, participants });
      })
      .catch(() => { if (!cancelled) setError("Impossible de charger l'événement."); });
    return () => { cancelled = true; };
  }, [eventId]);

  if (error) {
    return (
      <>
        <PageHeader title="Événement" backHref="/admin/events" backLabel="Événements" />
        <div className="max-w-xl mx-auto text-center bg-card border border-border rounded-2xl p-10">
          <CalendarX2 className="w-8 h-8 mx-auto text-muted-foreground mb-3" />
          <p className="font-semibold text-foreground">{error}</p>
          <Link href="/admin/events" className="inline-block mt-4 text-sm font-semibold text-primary hover:underline">Revenir aux événements</Link>
        </div>
      </>
    );
  }

  if (!initial) {
    return (
      <div className="max-w-3xl space-y-4">
        <div className="h-8 w-64 bg-muted rounded-lg animate-pulse" />
        {[1, 2, 3].map((i) => <div key={i} className="h-44 bg-muted rounded-2xl animate-pulse" />)}
      </div>
    );
  }

  return (
    <>
      <PageHeader title="Modifier l'événement" subtitle={initial.title} backHref="/admin/events" backLabel="Événements" />
      <EventForm mode="edit" initial={initial} />
    </>
  );
}
