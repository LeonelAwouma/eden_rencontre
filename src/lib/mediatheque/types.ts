export type ResourceType = 'video' | 'audio' | 'book' | 'pdf' | 'article' | 'testimony' | 'guide' | 'external';
export type ResourceLevel = 'beginner' | 'intermediate' | 'advanced';
export type ResourceStatus = 'draft' | 'published' | 'archived';
export type ProgressStatus = 'started' | 'in_progress' | 'completed';

export interface MediathequeCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  color: string;
  parent_id: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface MediathequeResource {
  id: string;
  title: string;
  slug: string;
  description: string;
  content: string | null;
  type: ResourceType;
  category_id: string | null;
  author: string | null;
  source: string | null;
  file_url: string | null;
  external_url: string | null;
  thumbnail_url: string | null;
  cover_url: string | null;
  duration: string | null;
  page_count: number | null;
  language: string;
  level: ResourceLevel;
  target_audience: string | null;
  status: ResourceStatus;
  featured: boolean;
  recommended: boolean;
  view_count: number;
  display_order: number;
  metadata: Record<string, unknown>;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  category?: MediathequeCategory | null;
  tags?: MediathequeTag[];
}

export interface MediathequeTag {
  id: string;
  name: string;
  slug: string;
  created_at: string;
}

export interface MediathequeLearningPath {
  id: string;
  title: string;
  slug: string;
  description: string;
  objective: string | null;
  cover_url: string | null;
  level: ResourceLevel;
  estimated_duration: string | null;
  sort_order: number;
  status: ResourceStatus;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  resources?: MediathequeLearningPathResource[];
  resource_count?: number;
}

export interface MediathequeLearningPathResource {
  id: string;
  learning_path_id: string;
  resource_id: string;
  sort_order: number;
  is_required: boolean;
  created_at: string;
  resource?: MediathequeResource;
}

export interface MediathequeUserProgress {
  id: string;
  user_id: string;
  resource_id: string;
  status: ProgressStatus;
  progress_percent: number;
  last_position: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  resource?: MediathequeResource;
}

export interface MediathequeUserFavorite {
  id: string;
  user_id: string;
  resource_id: string;
  created_at: string;
  resource?: MediathequeResource;
}

export const RESOURCE_TYPE_CONFIG: Record<ResourceType, { label: string; color: string; bgColor: string }> = {
  video: { label: 'Vidéo', color: 'text-[#4F7DF3]', bgColor: 'bg-[#4F7DF3]/10' },
  audio: { label: 'Audio', color: 'text-[#8B5CF6]', bgColor: 'bg-[#8B5CF6]/10' },
  book: { label: 'Livre', color: 'text-[#F59E0B]', bgColor: 'bg-[#F59E0B]/10' },
  pdf: { label: 'PDF', color: 'text-[#EF4444]', bgColor: 'bg-[#EF4444]/10' },
  article: { label: 'Article', color: 'text-[#10B981]', bgColor: 'bg-[#10B981]/10' },
  testimony: { label: 'Témoignage', color: 'text-[#EC4899]', bgColor: 'bg-[#EC4899]/10' },
  guide: { label: 'Guide', color: 'text-[#486B46]', bgColor: 'bg-[#486B46]/10' },
  external: { label: 'Lien externe', color: 'text-[#6B7280]', bgColor: 'bg-[#6B7280]/10' },
};

export const LEVEL_CONFIG: Record<ResourceLevel, { label: string; color: string }> = {
  beginner: { label: 'Débutant', color: 'bg-emerald-50 text-emerald-700' },
  intermediate: { label: 'Intermédiaire', color: 'bg-amber-50 text-amber-700' },
  advanced: { label: 'Avancé', color: 'bg-red-50 text-red-700' },
};

export const STATUS_CONFIG: Record<ResourceStatus, { label: string; color: string }> = {
  draft: { label: 'Brouillon', color: 'bg-[#F3F4F6] text-[#6B7280]' },
  published: { label: 'Publié', color: 'bg-[#38C172]/10 text-[#38C172]' },
  archived: { label: 'Archivé', color: 'bg-[#F56565]/10 text-[#F56565]' },
};

export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 100);
}

export function detectUrlType(url: string): ResourceType | null {
  if (/youtube\.com|youtu\.be/i.test(url)) return 'video';
  if (/vimeo\.com/i.test(url)) return 'video';
  if (/dailymotion\.com/i.test(url)) return 'video';
  if (/spotify\.com|soundcloud\.com|podcasts?\./i.test(url)) return 'audio';
  if (/\.pdf($|\?)/i.test(url)) return 'pdf';
  return null;
}