export type StaffRole = "moderator" | "admin";

export interface MfaStatus {
	username: string;
	role: StaffRole;
	enrolled: boolean;
	elevated: boolean;
	elevated_until: string | null;
	locked_until: string | null;
	recovery_codes_left: number;
}

export interface ModCard {
	id: number;
	username: string;
	display_name: string | null;
	role: string;
	suspended: boolean;
	suspended_until: string | null;
	suspension_reason: string | null;
}

export interface ReporterInfo {
	username: string;
	github_id: number | null;
	account_id: number | null;
	state: "active" | "deleted" | "re-registered" | "purged";
	filed: number | null;
	dismissed: number | null;
}

export interface QueueReport {
	id: number;
	category: string;
	details: string | null;
	reporter: ReporterInfo;
	created_at: string;
}

export interface QueueGroup { target: ModCard; reports: QueueReport[] }
export interface QueueResponse { groups: QueueGroup[]; suspended: ModCard[] }

export interface UserReport extends QueueReport { status: "open" | "actioned" | "dismissed" }

export interface LogEntry {
	id: number;
	at: string;
	actor: string;
	action: string;
	target: string | null;
	target_github_id: number | null;
	report_id: number | null;
	note: string | null;
}

export interface UserDetail {
	account: ModCard & { github_id: number; avatar_url: string | null; created_at: string };
	content: {
		bio: string | null;
		links: { label: string; url: string }[];
		posts: { title: string; url: string }[];
		games: { name: string; detail: string | null; url: string | null }[];
		gaming_handles: { platform: string; handle: string }[];
		stack: string[];
		interests: string[];
		leetcode_username: string | null;
	};
	reports_against: UserReport[];
	reports_filed: { total: number; dismissed: number };
	history: LogEntry[];
}

export interface PendingTag { id: number; name: string; category: string; submitted_by: string | null; created_at: string }
export interface LogPage { items: LogEntry[]; page: number; has_more: boolean }
export interface TeamMember extends ModCard { mfa_enrolled_at: string | null }

export const CATEGORY_LABEL: Record<string, string> = {
	inappropriate_image: "Inappropriate image/content",
	harassment: "Harassment/hate",
	spam: "Spam/scam",
	impersonation: "Impersonation",
	other: "Other",
};

export const LOG_ACTIONS = [
	"suspend", "unsuspend", "report_dismiss", "note", "tag_approve", "tag_reject", "tag_add",
	"role_grant", "role_revoke",
	"mfa_enroll", "mfa_verify", "mfa_recovery_used", "mfa_lockout", "mfa_lock", "mfa_reset", "mfa_recovery_regen", "elevation_end",
] as const;

// must match ADMIN_ONLY_ACTIONS in backend/app/moderation.py
export const ADMIN_ONLY_ACTIONS: readonly string[] = [
	"mfa_enroll", "mfa_verify", "mfa_recovery_used", "mfa_lockout", "mfa_lock", "mfa_reset", "mfa_recovery_regen",
	"elevation_end", "role_grant", "role_revoke",
];