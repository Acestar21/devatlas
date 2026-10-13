export interface ContentLink {
  label: string;
  url: string;
}

export interface StackTag {
  id: number;
  name: string;
}

export interface GameStats {
  rank?: string | null;
  hours?: number | null;
  completion?: number | null; // 0-100
  platform?: string | null;
  note?: string | null;
}

export interface GameEntry {
  name: string;
  detail: string | null;
  url: string | null;
  igdb_id?: number | null;
  cover_url?: string | null; // https://images.igdb.com/... only
  stats?: GameStats | null;
}

export interface GamingHandle {
  platform: string;
  handle: string;
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
  external?: ExternalContribution[]; // contributions to repos the user does NOT own
}

export interface SectionVisibility {
  github: boolean;
  leetcode: boolean;
  games: boolean;
  interests: boolean;
}

export type CardVisibility = Record<string, Record<string, boolean>>;

export type CurrentlyKind = "tech" | "project" | "game" | "hobby" | "other";

export interface CurrentlyItem {
  text: string;
  kind?: CurrentlyKind | null;
}

/** An ACTIVE temporary-journal entry (the backend never returns expired/ended ones). */
export interface JournalEntry {
  id: number;
  body: string;
  genre: string | null;
  created_at: string; // ISO UTC
  expires_at: string; // ISO UTC
}

export interface ExternalContribution {
  repo: string; // "owner/name"
  url: string;
  owner: string;
  is_org: boolean;
  stars: number;
  commits: number;
  pull_requests: number;
  issues: number;
  reviews: number;
}

/** Owner-chosen order of the cards on the main profile view. */
export interface ProfileLayout {
  main?: string[];
  games_orientation?: "wide" | "tall";
}

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
  description?: string | null;
  date?: string | null;
  read_minutes?: number | null;
  tags?: string[];
  image_url?: string | null; // reserved, not used yet
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
  gaming_handles: GamingHandle[] | null;
  interests: InterestTag[] | null;
  leetcode: LeetcodeStats | null;
  posts: Post[] | null;
  is_owner: boolean;
  section_visibility: SectionVisibility | null;
  card_visibility: CardVisibility;
  layout?: ProfileLayout | null;
  currently?: CurrentlyItem[];
  journal?: JournalEntry[]; // active entries only
  moderation: { suspended: boolean; reason: string | null; until: string | null } | null;
  viewer_role: "anonymous" | "user" | "moderator" | "admin";
}
