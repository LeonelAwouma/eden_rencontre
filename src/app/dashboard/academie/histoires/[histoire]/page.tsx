import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { StoryReader } from "@/components/formation/story-reader";
import { STORIES, findStory } from "@/lib/formation/stories";

export function generateStaticParams() {
  return STORIES.map((story) => ({ histoire: story.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ histoire: string }> }): Promise<Metadata> {
  const story = findStory((await params).histoire);
  if (!story) return {};
  return { title: `${story.title} · Histoires de l'Académie du mariage` };
}

export default async function StoryPage({ params }: { params: Promise<{ histoire: string }> }) {
  const story = findStory((await params).histoire);
  if (!story) notFound();
  return <StoryReader story={story} />;
}
