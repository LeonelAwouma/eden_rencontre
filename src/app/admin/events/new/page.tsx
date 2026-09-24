"use client";

import { PageHeader } from "@/components/admin/page-header";
import { EventForm } from "@/components/admin/event-form";

export default function NewEventPage() {
  return (
    <>
      <PageHeader
        title="Nouvel événement"
        subtitle="Veillée, atelier, rencontre en ligne ou en présentiel pour les membres."
        backHref="/admin/events"
        backLabel="Événements"
      />
      <EventForm mode="create" />
    </>
  );
}
