export interface DirectoryCard {
	username: string;
	display_name: string | null;
	avatar_url: string | null;
	bio: string | null;
	stack_tags: string[];
	contributions: number | null;
	hint: { type: "game" | "interest"; name: string } | null;
}

export interface DirectoryResponse {
	results: DirectoryCard[];
	page: number;
	page_size: number;
	total: number;
	total_pages: number;
}
