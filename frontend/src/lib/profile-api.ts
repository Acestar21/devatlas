import { notFound } from "next/navigation";
import { cache } from "react";
import { backendFetch } from "@/lib/backend";
import { Profile } from "@/types";

/**
 * Load a profile in a server component. Only a real 404 becomes the not-found page. Anything else
 * (backend asleep or restarting, 5xx) THROWS, so app/error.tsx shows "couldn't reach the server"
 * instead of a blank page or a misleading 404.
 */
export const loadProfile = cache(async (username: string): Promise<Profile> => {
  const response = await backendFetch(`profiles/${encodeURIComponent(username)}`);
  if (response.status === 404) notFound();
  if (!response.ok) throw new Error(`Profile API returned ${response.status}`);
  return response.json() as Promise<Profile>;
});