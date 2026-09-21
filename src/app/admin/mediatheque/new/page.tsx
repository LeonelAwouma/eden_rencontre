"use client";

import { PageHeader } from "@/components/admin/page-header";
import { ResourceForm, EMPTY_RESOURCE } from "@/components/admin/mediatheque/resource-form";

export default function NewResourcePage() {
  return (
    <div className="max-w-6xl mx-auto">
      <PageHeader
        title="Nouvelle ressource"
        subtitle="Ajoutez une vidéo, un livre, un audio ou un guide, puis placez-le dans un parcours."
        backHref="/admin/mediatheque"
        backLabel="Médiathèque"
      />
      <ResourceForm initial={EMPTY_RESOURCE} />
    </div>
  );
}
