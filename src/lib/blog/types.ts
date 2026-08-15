export type BlogPostStatus = 'draft' | 'published' | 'archived';

export interface BlogCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  color: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface BlogTag {
  id: string;
  name: string;
  slug: string;
  created_at: string;
}

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string | null;
  cover_image_url: string | null;
  category_id: string | null;
  author: string;
  reading_time_minutes: number;
  status: BlogPostStatus;
  featured: boolean;
  view_count: number;
  published_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  category?: BlogCategory | null;
  tags?: BlogTag[];
}

export const BLOG_STATUS_CONFIG: Record<BlogPostStatus, { label: string; color: string }> = {
  draft: { label: 'Brouillon', color: 'bg-[#F3F4F6] text-[#6B7280]' },
  published: { label: 'Publié', color: 'bg-[#38C172]/10 text-[#38C172]' },
  archived: { label: 'Archivé', color: 'bg-[#F56565]/10 text-[#F56565]' },
};

export function generateBlogSlug(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 100);
}

export function estimateReadingTime(htmlContent: string): number {
  if (!htmlContent) return 1;
  const text = htmlContent.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  const wordCount = text.split(' ').length;
  return Math.max(1, Math.ceil(wordCount / 200));
}
