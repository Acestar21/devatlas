import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { Profile } from "@/types";
import SectionPlaceholder from "@/app/components/SectionPlaceholder";

export default async function InterestsPage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const cookie = (await cookies()).get("devcard_session");
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/profiles/${username}`, { cache: "no-store", headers: cookie ? { Cookie: `devcard_session=${cookie.value}` } : {} });
  if (response.status === 404) notFound();
  if (!response.ok) return null;
  const profile = await response.json() as Profile;
  if (profile.section_visibility?.interests === false && !profile.is_owner) notFound();
  return <SectionPlaceholder profile={profile} title="Interests" />;
}