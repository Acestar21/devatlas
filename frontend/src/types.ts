export interface ContentLink {
  label: string;
  url: string;
}

export interface StackTag {
  id: number;
  name: string;
}

export interface GameEntry {
  tag_id: number;
  name: string;
  rank_or_hours: string | null;
  profile_url: string;
  platform: string;
}

export interface InterestTag {
  id: number;
  name: string;
}

export interface GithubStats {
  available: boolean;
  reason?: string;
  total_contributions?: number;
  top_languages?: string[];
  pinned_repos?: Array<{
    name: string;
    description: string | null;
    stars: number;
    url: string;
  }>;
}

export interface SectionVisibility {
  github: boolean;
  leetcode: boolean;
  games: boolean;
  interests: boolean;
}

export interface Profile {
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  theme: string;
  content_links: ContentLink[];
  stack_tags: StackTag[];
  stats: GithubStats | null;
  games: GameEntry[] | null;
  interests: InterestTag[] | null;
  is_owner: boolean;
  section_visibility: SectionVisibility | null;
}