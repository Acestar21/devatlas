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

export interface CalendarDay {
  date: string;
  count: number;
}

export interface ExtraStats {
  commits: number;
  pull_requests: number;
  issues: number;
  reviews: number;
  current_streak: number;
  longest_streak: number;
  followers: number;
  public_repos: number;
  total_stars: number;
  prs_all_time: number;
  joined: string | null;
}

export interface ActivityItem {
  type: string;
  repo: string;
  text: string;
  at: string;
  url: string;
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
  calendar?: CalendarDay[][] | null;
  extra?: ExtraStats | null;
  activity?: ActivityItem[] | null;
}

export interface SectionVisibility {
  github: boolean;
  leetcode: boolean;
  games: boolean;
  interests: boolean;
}

export type CardVisibility = Record<string, Record<string, boolean>>;

export interface LeetcodeStats {
  username: string;
  url: string;
  easy: number;
  medium: number;
  hard: number;
  total: number;
}

export interface Post {
  title: string;
  url: string;
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
  leetcode: LeetcodeStats | null;
  posts: Post[] | null;
  is_owner: boolean;
  section_visibility: SectionVisibility | null;
  card_visibility: CardVisibility;
}