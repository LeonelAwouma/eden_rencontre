import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { StoryReader } from "@/components/formation/story-reader";
import { findStory } from "@/lib/formation/stories";

// Aperçu admin d'une histoire : même lecteur que les membres (/dashboard/academie/histoires/…),
// affiché en plein écran par le layout admin.

export async function generateMetadata({ params }: { params: Promise<{ histoire: string }> }): Promise<Metadata> {
  const story = findStory((await params).histoire);
  return {
    title: story ? `Aperçu · ${story.title}` : "Aperçu d'histoire",
    robots: { index: false, follow: false },
  };
}

export default async function AdminStoryPreviewPage({ params }: { params: Promise<{ histoire: string }> }) {
  const story = findStory((await params).histoire);
  if (!story) notFound();
  return <StoryReader story={story} preview />;
}
