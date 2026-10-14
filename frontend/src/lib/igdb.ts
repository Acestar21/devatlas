/** IGDB image helpers. Image ids look like "co4jni" (cover), "ar1abc" (artwork), "sc6xyz" (screenshot). */

const IMAGE_ID = /^[A-Za-z0-9]{4,40}$/;

export function igdbImageUrl(imageId: string, size = "t_720p"): string {
	return `https://images.igdb.com/igdb/image/upload/${size}/${imageId}.jpg`;
}

/**
 * Accepts a bare id ("co4jni") OR anything copied from igdb.com such as
 * "//images.igdb.com/igdb/image/upload/t_thumb/co4jni.jpg", and returns just the id (or null).
 */
export function parseIgdbImageId(input: string): string | null {
	const last = input.trim().split("/").pop() ?? "";
	const id = last.replace(/\.(jpg|jpeg|png|webp)$/i, "");
	return IMAGE_ID.test(id) ? id : null;
}

/** Upgrade the small sizes stored in older saved games to sharper ones at display time. */
export function sharpenIgdb(url: string): string {
	return url
		.replace("/t_cover_big/", "/t_cover_big_2x/")
		.replace("/t_screenshot_big/", "/t_720p/");
}